import { describe, expect, it } from 'vitest';
import {
  calcularAliquotaEfetiva,
  fatorPermanenteDAS,
  fracaoIbsCbsEmbutidaNoDAS,
  fatorGuiaTradicional,
  simular,
  simularHorizonte,
  type EntradaSimulacao,
} from '../motorSimulacao';
import { ANEXOS, encontrarFaixa } from '../tabelasSimples';
import { parametrosDoAno } from '../transicao';

describe('tabelas do Simples Nacional', () => {
  it('a repartição de cada faixa soma 100%', () => {
    for (const anexo of Object.values(ANEXOS)) {
      for (const faixa of anexo.faixas) {
        const soma = Object.values(faixa.reparticao).reduce((a, b) => a + b, 0);
        expect(soma, `${anexo.nome} faixa ${faixa.faixa}`).toBeCloseTo(1, 4);
      }
    }
  });

  it('o Anexo IV não tem CPP no DAS', () => {
    for (const faixa of ANEXOS[4].faixas) {
      expect(faixa.reparticao.cpp).toBe(0);
    }
  });

  it('localiza a faixa pelo RBT12', () => {
    expect(encontrarFaixa(3, 180_000).faixa).toBe(1);
    expect(encontrarFaixa(3, 180_000.01).faixa).toBe(2);
    expect(encontrarFaixa(3, 720_000).faixa).toBe(3);
    expect(encontrarFaixa(3, 4_800_000).faixa).toBe(6);
    // Acima do limite continua na 6ª faixa; a exclusão é tratada em avaliarLimite.
    expect(encontrarFaixa(3, 9_000_000).faixa).toBe(6);
  });
});

describe('alíquota efetiva', () => {
  it('aplica ((RBT12 x nominal) - PD) / RBT12', () => {
    const faixa = encontrarFaixa(3, 700_000);
    // Anexo III, 3ª faixa: 13,5% com dedução de R$ 17.640.
    const esperado = (700_000 * 0.135 - 17_640) / 700_000;
    expect(calcularAliquotaEfetiva(700_000, faixa)).toBeCloseTo(esperado, 10);
    expect(calcularAliquotaEfetiva(700_000, faixa)).toBeCloseTo(0.1098, 4);
  });

  it('a efetiva nunca supera a nominal dentro da faixa', () => {
    for (const anexo of Object.values(ANEXOS)) {
      for (const faixa of anexo.faixas) {
        const ae = calcularAliquotaEfetiva(faixa.receitaAte, faixa);
        expect(ae).toBeLessThanOrEqual(faixa.aliquotaNominal + 1e-9);
        expect(ae).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('sem RBT12 devolve a nominal e nunca valor negativo', () => {
    const faixa = encontrarFaixa(1, 100_000);
    expect(calcularAliquotaEfetiva(0, faixa)).toBe(faixa.aliquotaNominal);
    expect(calcularAliquotaEfetiva(-5, faixa)).toBe(faixa.aliquotaNominal);
  });
});

describe('fator permanente do DAS no modelo híbrido', () => {
  it('em 2027 retém IRPJ, CSLL, CPP e ICMS/ISS ainda não substituídos', () => {
    const faixa = encontrarFaixa(1, 700_000); // Anexo I, 3ª faixa
    const p = parametrosDoAno(2027);
    const r = faixa.reparticao;
    expect(fatorPermanenteDAS(faixa, p)).toBeCloseTo(r.irpj + r.csll + r.cpp + r.icms, 10);
  });

  it('em 2033 retém apenas IRPJ, CSLL e CPP', () => {
    const faixa = encontrarFaixa(3, 700_000);
    const p = parametrosDoAno(2033);
    const r = faixa.reparticao;
    expect(fatorPermanenteDAS(faixa, p)).toBeCloseTo(r.irpj + r.csll + r.cpp, 10);
  });

  it('em 2026 nada saiu do DAS: o fator permanente é 100%', () => {
    const faixa = encontrarFaixa(2, 700_000);
    expect(fatorPermanenteDAS(faixa, parametrosDoAno(2026))).toBeCloseTo(1, 10);
  });

  it('o fator permanente decresce ao longo da transição', () => {
    const faixa = encontrarFaixa(1, 700_000);
    const serie = [2027, 2029, 2030, 2031, 2032, 2033].map((ano) =>
      fatorPermanenteDAS(faixa, parametrosDoAno(ano)),
    );
    for (let i = 1; i < serie.length; i++) {
      expect(serie[i]).toBeLessThan(serie[i - 1]);
    }
  });
});

describe('IPI zerado a partir de 2027', () => {
  it('a guia Tradicional do Anexo II perde a parcela de IPI', () => {
    const faixa = encontrarFaixa(2, 700_000); // Anexo II, 3ª faixa: IPI = 7,5%
    expect(fatorGuiaTradicional(faixa, parametrosDoAno(2026))).toBeCloseTo(1, 10);
    expect(fatorGuiaTradicional(faixa, parametrosDoAno(2027))).toBeCloseTo(1 - 0.075, 10);
  });

  it('anexos sem IPI não sofrem ajuste na guia', () => {
    for (const anexo of [1, 3, 4, 5] as const) {
      const faixa = encontrarFaixa(anexo, 700_000);
      expect(fatorGuiaTradicional(faixa, parametrosDoAno(2027))).toBeCloseTo(1, 10);
    }
  });

  it('a decomposição do Anexo II fecha com a guia nos dois cenários', () => {
    const r = simular({ ...baseB2B, anexo: 2, ano: 2027 });
    const somaTradicional = Object.values(r.tradicional.decomposicao).reduce((a, b) => a + b, 0);
    expect(somaTradicional).toBeCloseTo(r.tradicional.das, 6);
    expect(r.tradicional.decomposicao.ipi).toBe(0);

    const somaHibrido = Object.values(r.hibrido.decomposicao).reduce((a, b) => a + b, 0);
    expect(somaHibrido).toBeCloseTo(r.hibrido.dasReduzido, 6);
  });

  it('em 2026 o IPI continua compondo a guia do Anexo II', () => {
    const r = simular({ ...baseB2B, anexo: 2, ano: 2026 });
    expect(r.tradicional.decomposicao.ipi).toBeGreaterThan(0);
    expect(r.tradicional.das).toBeCloseTo(r.entrada.faturamentoMensal * r.aliquotaEfetivaSimples, 6);
  });
});

describe('crédito embutido no DAS (modelo Tradicional)', () => {
  it('é zero em 2026, quando nada foi substituído', () => {
    const faixa = encontrarFaixa(1, 700_000);
    expect(fracaoIbsCbsEmbutidaNoDAS(faixa, parametrosDoAno(2026))).toBeCloseTo(0, 10);
  });

  it('em 2027 corresponde à parcela de PIS/Cofins virada em CBS', () => {
    const faixa = encontrarFaixa(1, 700_000);
    const r = faixa.reparticao;
    expect(fracaoIbsCbsEmbutidaNoDAS(faixa, parametrosDoAno(2027))).toBeCloseTo(r.pis + r.cofins, 10);
  });

  it('em 2033 a totalidade de PIS/Cofins/ICMS/ISS virou IBS/CBS', () => {
    const faixa = encontrarFaixa(1, 700_000);
    const r = faixa.reparticao;
    expect(fracaoIbsCbsEmbutidaNoDAS(faixa, parametrosDoAno(2033))).toBeCloseTo(
      r.pis + r.cofins + r.icms + r.iss,
      10,
    );
  });
});

const baseB2B: EntradaSimulacao = {
  faturamentoMensal: 100_000,
  rbt12: 1_200_000,
  anexo: 1,
  perfil: 'B2B',
  insumosTributaveis: 50_000,
  ano: 2027,
};

describe('simulação dos dois cenários', () => {
  it('o cenário Tradicional é o faturamento pela alíquota efetiva', () => {
    const r = simular(baseB2B);
    expect(r.tradicional.das).toBeCloseTo(100_000 * r.aliquotaEfetivaSimples, 6);
    expect(r.tradicional.custoTotal).toBe(r.tradicional.das);
  });

  it('o DAS do Híbrido é sempre menor que o DAS integral', () => {
    const r = simular(baseB2B);
    expect(r.hibrido.dasReduzido).toBeLessThan(r.tradicional.das);
  });

  it('a guia de IBS/CBS é débito menos crédito, com piso em zero', () => {
    const r = simular(baseB2B);
    expect(r.hibrido.debitoIbsCbs).toBeCloseTo(100_000 * r.aliquotaIbsCbs, 6);
    expect(r.hibrido.creditoIbsCbs).toBeCloseTo(50_000 * r.aliquotaIbsCbs, 6);
    expect(r.hibrido.guiaIbsCbs).toBeCloseTo(50_000 * r.aliquotaIbsCbs, 6);
    expect(r.hibrido.saldoCredorAcumulado).toBe(0);
  });

  it('crédito maior que débito gera saldo credor e guia zerada', () => {
    const r = simular({ ...baseB2B, insumosTributaveis: 180_000 });
    expect(r.hibrido.guiaIbsCbs).toBe(0);
    expect(r.hibrido.saldoCredorAcumulado).toBeCloseTo(80_000 * r.aliquotaIbsCbs, 6);
  });

  it('o saldo credor anterior é aproveitado na competência seguinte', () => {
    const semSaldo = simular(baseB2B);
    const comSaldo = simular({ ...baseB2B, saldoCredorAnterior: 1_000 });
    expect(comSaldo.hibrido.guiaIbsCbs).toBeCloseTo(semSaldo.hibrido.guiaIbsCbs - 1_000, 6);
  });

  it('o crédito transferido no Híbrido é o débito integral da operação', () => {
    const r = simular({ ...baseB2B, insumosTributaveis: 180_000 });
    // Mesmo com a guia zerada por saldo credor, o destaque na nota é integral.
    expect(r.hibrido.guiaIbsCbs).toBe(0);
    expect(r.hibrido.creditoTransferido).toBeCloseTo(100_000 * r.aliquotaIbsCbs, 6);
  });

  it('o Híbrido transfere mais crédito que o Tradicional em 2027', () => {
    const r = simular(baseB2B);
    expect(r.comparativo.ganhoDeCreditoNoHibrido).toBeGreaterThan(0);
    expect(r.comparativo.precoLiquidoParaClientePJ.hibrido).toBeLessThan(
      r.comparativo.precoLiquidoParaClientePJ.tradicional,
    );
  });

  it('a decomposição do DAS reconstitui o valor da guia', () => {
    const r = simular(baseB2B);
    const somaTradicional = Object.values(r.tradicional.decomposicao).reduce((a, b) => a + b, 0);
    expect(somaTradicional).toBeCloseTo(r.tradicional.das, 6);

    const somaHibrido = Object.values(r.hibrido.decomposicao).reduce((a, b) => a + b, 0);
    expect(somaHibrido).toBeCloseTo(r.hibrido.dasReduzido, 6);
  });

  it('sem insumos, o Híbrido paga IBS/CBS cheio sobre a receita', () => {
    const r = simular({ ...baseB2B, insumosTributaveis: 0 });
    expect(r.hibrido.guiaIbsCbs).toBeCloseTo(100_000 * r.aliquotaIbsCbs, 6);
    expect(r.comparativo.economiaCaixaNoHibrido).toBeLessThan(0);
  });

  it('em 2026 o cenário Híbrido é marcado como indisponível', () => {
    const r = simular({ ...baseB2B, ano: 2026 });
    expect(r.hibrido.disponivelNoAno).toBe(false);
    expect(r.tradicional.creditoTransferido).toBeCloseTo(0, 6);
  });

  it('a ponderação B2B/B2C altera a vantagem, não o custo', () => {
    const b2b = simular({ ...baseB2B, perfil: 'B2B' });
    const b2c = simular({ ...baseB2B, perfil: 'B2C' });
    expect(b2b.hibrido.custoTotal).toBeCloseTo(b2c.hibrido.custoTotal, 10);
    expect(b2b.comparativo.vantagemPonderada).toBeGreaterThan(b2c.comparativo.vantagemPonderada);
    expect(b2c.comparativo.vantagemPonderada).toBeCloseTo(b2c.comparativo.economiaCaixaNoHibrido, 10);
  });

  it('percentualReceitaB2B prevalece sobre o perfil declarado', () => {
    const r = simular({ ...baseB2B, perfil: 'MISTO', percentualReceitaB2B: 0.3 });
    const esperado =
      r.comparativo.economiaCaixaNoHibrido + r.comparativo.ganhoDeCreditoNoHibrido * 0.3;
    expect(r.comparativo.vantagemPonderada).toBeCloseTo(esperado, 10);
  });

  it('valores negativos de entrada são tratados como zero', () => {
    const r = simular({ ...baseB2B, faturamentoMensal: -1, insumosTributaveis: -1, saldoCredorAnterior: -5 });
    expect(r.tradicional.das).toBe(0);
    expect(r.hibrido.custoTotal).toBe(0);
  });
});

describe('projeção ao longo da transição', () => {
  it('gera um resultado por ano com alíquotas crescentes de IBS', () => {
    const anos = [2026, 2027, 2029, 2031, 2033];
    const serie = simularHorizonte(baseB2B, anos);
    expect(serie).toHaveLength(anos.length);
    for (let i = 1; i < serie.length; i++) {
      expect(serie[i].parametrosAno.aliquotaIBS).toBeGreaterThanOrEqual(serie[i - 1].parametrosAno.aliquotaIBS);
    }
    expect(serie[serie.length - 1].aliquotaIbsCbs).toBeCloseTo(0.265, 6);
  });
});
