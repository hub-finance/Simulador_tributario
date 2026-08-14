import { describe, expect, it } from 'vitest';
import {
  agendaAtiva,
  avaliarEvento,
  CALENDARIO,
  janelaVigente,
  linhaDoTempo,
  vencimentoPgdasD,
} from '../calendario';
import { calcularMultaAtraso, REGRAS_MULTA } from '../obrigacoes';
import { avaliarLimite, consolidarReceitaBruta, COMPOSICAO_ZERADA } from '../receitaBruta';
import { calcularFatorR, PISO_FATOR_R } from '../fatorR';
import { diagnosticar } from '../diagnostico';
import { simular, type EntradaSimulacao } from '../motorSimulacao';
import { aliquotaIbsCbsDoAno, CRONOGRAMA_TRANSICAO, parametrosDoAno } from '../transicao';

const evento = (id: string) => CALENDARIO.find((e) => e.id === id)!;

describe('calendário da transição', () => {
  it('a janela de setembro/2026 vai de 01/09 a 30/09', () => {
    const janela = evento('janela-setembro-2026');
    expect(janela.inicio).toBe('2026-09-01');
    expect(janela.fim).toBe('2026-09-30');
    expect(janela.efeitoSobre).toBe('1º semestre de 2027');
  });

  it('o cancelamento da opção encerra em 30/11/2026 e é irretratável', () => {
    const cancelamento = evento('cancelamento-novembro-2026');
    expect(cancelamento.fim).toBe('2026-11-30');
    expect(cancelamento.categoria).toBe('prazo-irretratavel');
  });

  it('a segunda janela vai de 01/03 a 31/03/2027 e vale para o 2º semestre', () => {
    const segunda = evento('janela-marco-2027');
    expect(segunda.inicio).toBe('2027-03-01');
    expect(segunda.fim).toBe('2027-03-31');
    expect(segunda.efeitoSobre).toBe('2º semestre de 2027');
  });

  it('a DEFIS 2025 vence em 31/03/2026', () => {
    expect(evento('defis-2025').fim).toBe('2026-03-31');
  });

  it('classifica futuro, aberto e encerrado corretamente', () => {
    const janela = evento('janela-setembro-2026');
    expect(avaliarEvento(janela, new Date('2026-08-15T12:00:00Z')).situacao).toBe('futuro');
    expect(avaliarEvento(janela, new Date('2026-09-01T00:00:00Z')).situacao).toBe('aberto');
    expect(avaliarEvento(janela, new Date('2026-09-30T23:00:00Z')).situacao).toBe('aberto');
    expect(avaliarEvento(janela, new Date('2026-10-01T00:00:00Z')).situacao).toBe('encerrado');
  });

  it('conta os dias restantes da janela', () => {
    const janela = evento('janela-setembro-2026');
    expect(avaliarEvento(janela, new Date('2026-09-01T00:00:00Z')).diasRestantes).toBe(29);
    expect(avaliarEvento(janela, new Date('2026-09-30T00:00:00Z')).diasRestantes).toBe(0);
    expect(avaliarEvento(janela, new Date('2026-08-01T00:00:00Z')).diasRestantes).toBe(31);
  });

  it('identifica a janela vigente apenas dentro do período', () => {
    expect(janelaVigente(new Date('2026-09-10T00:00:00Z'))?.evento.id).toBe('janela-setembro-2026');
    expect(janelaVigente(new Date('2027-03-15T00:00:00Z'))?.evento.id).toBe('janela-marco-2027');
    expect(janelaVigente(new Date('2026-12-15T00:00:00Z'))).toBeNull();
  });

  it('a linha do tempo sai ordenada por data-limite', () => {
    const datas = linhaDoTempo(new Date('2026-01-01T00:00:00Z')).map((s) => s.evento.fim);
    expect([...datas].sort()).toEqual(datas);
  });

  it('a agenda ativa traz o que está aberto ou abre no horizonte', () => {
    const agenda = agendaAtiva(new Date('2026-08-20T00:00:00Z'), 60).map((s) => s.evento.id);
    expect(agenda).toContain('janela-setembro-2026');
    expect(agenda).not.toContain('janela-marco-2027');
  });

  it('o PGDAS-D vence no dia 20 do mês seguinte à competência', () => {
    // Competência janeiro/2026 (mês 0) vence em 20/02/2026.
    const v = vencimentoPgdasD(2026, 1);
    expect(v.toISOString().slice(0, 10)).toBe('2026-02-20');
  });
});

describe('multas por atraso', () => {
  it('não há multa dentro do prazo', () => {
    expect(calcularMultaAtraso('PGDAS-D', 10_000, 0).valorFinal).toBe(0);
  });

  it('o PGDAS-D tem piso de R$ 50 e multa desde o primeiro dia', () => {
    expect(REGRAS_MULTA['PGDAS-D'].pisoReais).toBe(50);
    const r = calcularMultaAtraso('PGDAS-D', 500, 1);
    expect(r.mesesConsiderados).toBe(1);
    expect(r.valorFinal).toBe(50);
    expect(r.aplicouPiso).toBe(true);
  });

  it('a DEFIS tem piso de R$ 200', () => {
    expect(REGRAS_MULTA.DEFIS.pisoReais).toBe(200);
    expect(calcularMultaAtraso('DEFIS', 1_000, 5).valorFinal).toBe(200);
  });

  it('aplica 2% ao mês sobre a base quando supera o piso', () => {
    // 100.000 x 2% x 3 meses = 6.000; com 50% de espontaneidade = 3.000.
    const r = calcularMultaAtraso('DEFIS', 100_000, 61, false);
    expect(r.mesesConsiderados).toBe(3);
    expect(r.valorFinal).toBeCloseTo(6_000, 6);
    expect(calcularMultaAtraso('DEFIS', 100_000, 61, true).valorFinal).toBeCloseTo(3_000, 6);
  });

  it('respeita o teto de 20% da base', () => {
    const r = calcularMultaAtraso('PGDAS-D', 100_000, 400, false);
    expect(r.aplicouTeto).toBe(true);
    expect(r.valorFinal).toBeCloseTo(20_000, 6);
  });

  it('a redução por espontaneidade nunca derruba a multa abaixo do piso', () => {
    const r = calcularMultaAtraso('PGDAS-D', 1_000, 30, true);
    expect(r.valorFinal).toBeGreaterThanOrEqual(REGRAS_MULTA['PGDAS-D'].pisoReais);
  });
});

describe('composição da receita bruta', () => {
  it('gorjetas, juros, multas de mora e entrega futura integram a receita', () => {
    const r = consolidarReceitaBruta({
      ...COMPOSICAO_ZERADA,
      vendasEServicos: 100_000,
      gorjetas: 3_000,
      jurosRecebidos: 500,
      multasDeMoraRecebidas: 200,
      operacoesEntregaFutura: 6_300,
    });
    expect(r.receitaBrutaMensal).toBe(110_000);
    expect(r.alertas).toHaveLength(1);
  });

  it('vendas canceladas, descontos incondicionais, IPI e ICMS-ST são deduzidos', () => {
    const r = consolidarReceitaBruta({
      ...COMPOSICAO_ZERADA,
      vendasEServicos: 100_000,
      vendasCanceladas: 5_000,
      descontosIncondicionais: 2_000,
      ipiDestacado: 1_000,
      icmsSubstituicaoTributaria: 500,
    });
    expect(r.totalDeduz).toBe(8_500);
    expect(r.receitaBrutaMensal).toBe(91_500);
    expect(r.alertas).toHaveLength(0);
  });

  it('a receita nunca fica negativa', () => {
    const r = consolidarReceitaBruta({ ...COMPOSICAO_ZERADA, vendasEServicos: 100, vendasCanceladas: 900 });
    expect(r.receitaBrutaMensal).toBe(0);
  });
});

describe('limite e sublimite com IBS na conta', () => {
  it('base dentro dos limites', () => {
    expect(avaliarLimite(1_000_000).situacao).toBe('normal');
  });

  it('o IBS acumulado soma à base do sublimite', () => {
    // Sem IBS ficaria abaixo do sublimite; com IBS ultrapassa.
    expect(avaliarLimite(3_550_000).situacao).toBe('atencao');
    const comIbs = avaliarLimite(3_550_000, 100_000);
    expect(comIbs.situacao).toBe('sublimite-excedido');
    expect(comIbs.baseConsiderada).toBe(3_650_000);
  });

  it('acima de 4,8 milhões o limite do regime é excedido', () => {
    expect(avaliarLimite(4_900_000).situacao).toBe('limite-excedido');
  });

  it('sinaliza atenção a partir de 80% do sublimite', () => {
    expect(avaliarLimite(2_880_000).situacao).toBe('atencao');
    expect(avaliarLimite(2_800_000).situacao).toBe('normal');
  });
});

describe('Fator R', () => {
  it('28% é o piso de migração para o Anexo III', () => {
    expect(PISO_FATOR_R).toBe(0.28);
    expect(calcularFatorR({ folha12Meses: 280_000, rbt12: 1_000_000 }).anexoAplicavel).toBe(3);
    expect(calcularFatorR({ folha12Meses: 279_999, rbt12: 1_000_000 }).anexoAplicavel).toBe(5);
  });

  it('calcula a folha faltante para virar de anexo', () => {
    const r = calcularFatorR({ folha12Meses: 200_000, rbt12: 1_000_000 });
    expect(r.fatorR).toBeCloseTo(0.2, 10);
    expect(r.folhaFaltante).toBeCloseTo(80_000, 6);
  });

  it('quem já atinge o piso não tem folha faltante', () => {
    expect(calcularFatorR({ folha12Meses: 400_000, rbt12: 1_000_000 }).folhaFaltante).toBe(0);
  });

  it('RBT12 zerado não quebra o cálculo', () => {
    const r = calcularFatorR({ folha12Meses: 50_000, rbt12: 0 });
    expect(r.fatorR).toBe(0);
    expect(r.anexoAplicavel).toBe(5);
  });
});

describe('cronograma de transição', () => {
  it('cobre de 2026 a 2033 sem lacuna', () => {
    const anos = CRONOGRAMA_TRANSICAO.map((a) => a.ano);
    expect(anos).toEqual([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
  });

  it('em 2026 o Simples está dispensado da alíquota-teste', () => {
    const p = parametrosDoAno(2026);
    expect(p.simplesDispensadoDoRecolhimento).toBe(true);
    expect(p.opcaoHibridaDisponivel).toBe(false);
    expect(aliquotaIbsCbsDoAno(2026)).toBeCloseTo(0.01, 6);
  });

  it('em 2027 o PIS/Cofins é extinto e a opção híbrida passa a valer', () => {
    const p = parametrosDoAno(2027);
    expect(p.fracaoPisCofins).toBe(0);
    expect(p.fracaoIpi).toBe(0);
    expect(p.opcaoHibridaDisponivel).toBe(true);
  });

  it('o ICMS/ISS cai 10 pontos ao ano entre 2029 e 2032 e zera em 2033', () => {
    expect(parametrosDoAno(2028).fracaoIcmsIss).toBe(1);
    expect(parametrosDoAno(2029).fracaoIcmsIss).toBeCloseTo(0.9, 6);
    expect(parametrosDoAno(2030).fracaoIcmsIss).toBeCloseTo(0.8, 6);
    expect(parametrosDoAno(2031).fracaoIcmsIss).toBeCloseTo(0.7, 6);
    expect(parametrosDoAno(2032).fracaoIcmsIss).toBeCloseTo(0.6, 6);
    expect(parametrosDoAno(2033).fracaoIcmsIss).toBe(0);
  });

  it('em 2033 a alíquota combinada chega à referência de 26,5%', () => {
    expect(aliquotaIbsCbsDoAno(2033)).toBeCloseTo(0.265, 6);
  });

  it('anos fora da tabela caem no extremo mais próximo', () => {
    expect(parametrosDoAno(2024).opcaoHibridaDisponivel).toBe(false);
    expect(parametrosDoAno(2040).fracaoIcmsIss).toBe(0);
  });
});

const entradaBase: EntradaSimulacao = {
  faturamentoMensal: 100_000,
  rbt12: 1_200_000,
  anexo: 1,
  perfil: 'B2B',
  insumosTributaveis: 20_000,
  ano: 2027,
};

const cadastroLimpo = { possuiDebitosEmAberto: false };
const refJanela = new Date('2026-09-10T00:00:00Z');

describe('diagnóstico', () => {
  it('B2C decide pelo menor custo em caixa', () => {
    const simulacao = simular({ ...entradaBase, perfil: 'B2C', insumosTributaveis: 0 });
    const d = diagnosticar({ simulacao, cadastro: cadastroLimpo, referencia: refJanela });
    expect(simulacao.comparativo.economiaCaixaNoHibrido).toBeLessThan(0);
    expect(d.recomendacao).toBe('Tradicional');
    expect(d.pontoDeEquilibrioComercial).toBe(0);
  });

  it('B2B com Tradicional mais barato dispara o alerta de risco comercial', () => {
    const simulacao = simular({ ...entradaBase, perfil: 'B2B', insumosTributaveis: 0 });
    const d = diagnosticar({ simulacao, cadastro: cadastroLimpo, referencia: refJanela });
    const alerta = d.alertas.find((a) => a.titulo.includes('Risco comercial'));
    if (d.recomendacao === 'Tradicional') {
      expect(alerta).toBeDefined();
      expect(alerta?.severidade).toBe('risco');
    } else {
      // Quando o ganho de crédito supera o custo, a recomendação vira Híbrido.
      expect(d.pontoDeEquilibrioComercial).toBeGreaterThan(0);
    }
  });

  it('muito insumo torna o Híbrido vantajoso também em caixa', () => {
    const simulacao = simular({ ...entradaBase, insumosTributaveis: 90_000 });
    const d = diagnosticar({ simulacao, cadastro: cadastroLimpo, referencia: refJanela });
    expect(simulacao.comparativo.economiaCaixaNoHibrido).toBeGreaterThan(0);
    expect(d.recomendacao).toBe('Híbrido');
  });

  it('débitos em aberto geram bloqueio', () => {
    const simulacao = simular(entradaBase);
    const d = diagnosticar({
      simulacao,
      cadastro: { possuiDebitosEmAberto: true, valorDebitos: 12_500 },
      referencia: refJanela,
    });
    expect(d.possuiBloqueio).toBe(true);
    expect(d.alertas[0].severidade).toBe('bloqueio');
    expect(d.alertas[0].detalhe).toContain('30/06/2026');
  });

  it('pendências cadastrais também bloqueiam', () => {
    const d = diagnosticar({
      simulacao: simular(entradaBase),
      cadastro: { possuiDebitosEmAberto: false, possuiPendenciasCadastrais: true },
      referencia: refJanela,
    });
    expect(d.possuiBloqueio).toBe(true);
  });

  it('cruza o faturamento global de CNPJs interligados', () => {
    const d = diagnosticar({
      simulacao: simular(entradaBase),
      cadastro: {
        possuiDebitosEmAberto: false,
        cnpjsInterligados: [
          { cnpj: '11.111.111/0001-11', nome: 'Coligada A', rbt12: 2_000_000 },
          { cnpj: '22.222.222/0001-22', nome: 'Coligada B', rbt12: 2_000_000 },
        ],
      },
      referencia: refJanela,
    });
    const alerta = d.alertas.find((a) => a.titulo.includes('faturamento global'));
    expect(alerta?.severidade).toBe('risco');
    expect(alerta?.detalhe).toContain('exclusão de ofício');
  });

  it('avisa quando a janela está aberta e quantos dias restam', () => {
    const d = diagnosticar({ simulacao: simular(entradaBase), cadastro: cadastroLimpo, referencia: refJanela });
    const alerta = d.alertas.find((a) => a.titulo.includes('Janela aberta'));
    expect(alerta?.titulo).toContain('20 dia(s) restantes');
  });

  it('marca o Híbrido como projeção em 2026', () => {
    const d = diagnosticar({
      simulacao: simular({ ...entradaBase, ano: 2026 }),
      cadastro: cadastroLimpo,
      referencia: refJanela,
    });
    expect(d.alertas.some((a) => a.titulo.includes('ainda não vigente'))).toBe(true);
  });

  it('sinaliza saldo credor acumulado', () => {
    const d = diagnosticar({
      simulacao: simular({ ...entradaBase, insumosTributaveis: 500_000 }),
      cadastro: cadastroLimpo,
      referencia: refJanela,
    });
    expect(d.alertas.some((a) => a.titulo.includes('Saldo credor'))).toBe(true);
  });

  it('os valores nas mensagens saem no padrão brasileiro', () => {
    const d = diagnosticar({
      simulacao: simular({ ...entradaBase, faturamentoMensal: 1_234_567.89 }),
      cadastro: { possuiDebitosEmAberto: true, valorDebitos: 18_400 },
      referencia: refJanela,
    });
    // O Intl separa "R$" do valor com espaço não-quebrável (U+00A0); normalizamos para comparar.
    const normalizar = (s: string) => s.replace(/ /g, ' ');
    const textos = normalizar(
      [d.justificativa, ...d.alertas.map((a) => a.detalhe), d.limite.mensagem].join(' '),
    );
    // Nenhum número deve sair como "1234.56" — sempre "1.234,56".
    expect(textos).not.toMatch(/R\$ \d+\.\d{2}(?!\d)/);
    expect(textos).toMatch(/R\$ [\d.]+,\d{2}/);
    expect(normalizar(d.alertas.find((a) => a.titulo.includes('Débitos'))?.detalhe ?? '')).toContain(
      'R$ 18.400,00',
    );
  });

  it('alertas saem ordenados por severidade', () => {
    const d = diagnosticar({
      simulacao: simular({ ...entradaBase, ano: 2026 }),
      cadastro: { possuiDebitosEmAberto: true },
      referencia: refJanela,
    });
    const peso = { bloqueio: 0, risco: 1, atencao: 2, informacao: 3 } as const;
    const pesos = d.alertas.map((a) => peso[a.severidade]);
    expect([...pesos].sort()).toEqual(pesos);
  });
});
