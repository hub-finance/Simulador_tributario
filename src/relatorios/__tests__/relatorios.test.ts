import { describe, expect, it } from 'vitest';
import { comoNomeDeArquivo, escapar, montarDocumento } from '../documento';
import { relatorioCarteira } from '../relatorioCarteira';
import { relatorioCliente } from '../relatorioCliente';
import { relatorioProspeccao } from '../relatorioProspeccao';
import { agendaAtiva, proximaJanela } from '../../dominio/calendario';
import { diagnosticar } from '../../dominio/diagnostico';
import { simular, type EntradaSimulacao } from '../../dominio/motorSimulacao';
import { classificar, GRUPOS, resumirCarteira, type LinhaCarteira } from '../../dominio/segmentacao';

const referencia = new Date('2026-08-14T00:00:00Z');

const base: EntradaSimulacao = {
  faturamentoMensal: 210_000,
  rbt12: 2_400_000,
  anexo: 2,
  perfil: 'B2B',
  percentualReceitaB2B: 1,
  insumosTributaveis: 96_000,
  ano: 2027,
};

function montar(entrada: Partial<EntradaSimulacao> = {}, cadastro = { possuiDebitosEmAberto: false }) {
  const simulacao = simular({ ...base, ...entrada });
  const diagnostico = diagnosticar({ simulacao, cadastro, referencia });
  return { simulacao, diagnostico };
}

function linha(nome: string, entrada: Partial<EntradaSimulacao> = {}, cadastro = { possuiDebitosEmAberto: false }): LinhaCarteira {
  const { simulacao, diagnostico } = montar(entrada, cadastro);
  return {
    nome,
    cnpj: '11.222.333/0001-44',
    grupo: classificar({ simulacao, diagnostico }),
    simulacao,
    diagnostico,
    decidido: false,
  };
}

describe('esqueleto do documento', () => {
  it('escapa HTML vindo de campo livre', () => {
    expect(escapar('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('o nome do cliente é escapado no documento gerado', () => {
    const { simulacao, diagnostico } = montar();
    const doc = relatorioCliente({ nome: '<b>Loja</b> & Cia', cnpj: '', simulacao, diagnostico });
    expect(doc.html).toContain('&lt;b&gt;Loja&lt;/b&gt; &amp; Cia');
    expect(doc.html).not.toContain('<b>Loja</b>');
  });

  it('gera nome de arquivo sem acento nem espaço', () => {
    expect(comoNomeDeArquivo('Metalúrgica Aurora Ltda')).toBe('metalurgica-aurora-ltda');
    expect(comoNomeDeArquivo('  Ação & Cia.  ')).toBe('acao-cia');
  });

  it('o documento sai como HTML completo e autocontido', () => {
    const doc = montarDocumento('Título', 'arquivo', '<p>corpo</p>');
    expect(doc.html.startsWith('<!doctype html>')).toBe(true);
    expect(doc.html).toContain('<style>');
    expect(doc.html).toContain('<p>corpo</p>');
    // Nenhuma referência externa: o arquivo precisa abrir offline.
    expect(doc.html).not.toMatch(/<(link|script)[^>]*(href|src)=/);
  });
});

describe('relatório do cliente', () => {
  it('traz os dois cenários, a recomendação e os prazos', () => {
    const { simulacao, diagnostico } = montar();
    const doc = relatorioCliente({ nome: 'Metalúrgica Aurora', cnpj: '12.345.678/0001-90', simulacao, diagnostico });

    expect(doc.html).toContain('Metalúrgica Aurora');
    expect(doc.html).toContain('12.345.678/0001-90');
    expect(doc.html).toContain(`modelo ${diagnostico.recomendacao}`);
    expect(doc.html).toContain('Prazos que não podem passar');
    expect(doc.html).toContain('irretratável');
    expect(doc.nomeArquivo).toBe('diagnostico-metalurgica-aurora-2027');
  });

  it('valores monetários saem no padrão brasileiro', () => {
    const { simulacao, diagnostico } = montar();
    const doc = relatorioCliente({ nome: 'Loja', cnpj: '', simulacao, diagnostico });
    expect(doc.html.replace(/\u00a0/g, ' ')).toMatch(/R\$ [\d.]+,\d{2}/);
  });

  it('não exibe alertas meramente informativos', () => {
    const { simulacao, diagnostico } = montar({ ano: 2026 });
    const doc = relatorioCliente({ nome: 'Loja', cnpj: '', simulacao, diagnostico });
    expect(diagnostico.alertas.some((a) => a.severidade === 'informacao')).toBe(true);
    expect(doc.html).not.toContain('ainda não vigente');
  });
});

describe('relatório de prospecção', () => {
  it('usa o argumento de crédito para perfil B2B', () => {
    const { simulacao, diagnostico } = montar({ perfil: 'B2B', percentualReceitaB2B: 1 });
    const doc = relatorioProspeccao({
      nome: 'Indústria X',
      cnpj: '',
      simulacao,
      diagnostico,
      janela: proximaJanela(referencia),
    });
    expect(doc.html).toContain('crédito que o seu cliente aproveita');
    expect(doc.html).toContain('mais caro por mês para quem compra de você');
  });

  it('usa o argumento de custo para perfil B2C', () => {
    const { simulacao, diagnostico } = montar({ perfil: 'B2C', percentualReceitaB2B: 0 });
    const doc = relatorioProspeccao({
      nome: 'Padaria Y',
      cnpj: '',
      simulacao,
      diagnostico,
      janela: proximaJanela(referencia),
    });
    expect(doc.html).toContain('voltado ao consumidor final');
    expect(doc.html).toContain('decisão é de custo puro');
  });

  it('mostra a contagem regressiva da próxima janela', () => {
    const { simulacao, diagnostico } = montar();
    const doc = relatorioProspeccao({
      nome: 'Empresa',
      cnpj: '',
      simulacao,
      diagnostico,
      janela: proximaJanela(referencia),
    });
    // 14/08/2026 → janela abre em 01/09/2026, 18 dias depois.
    expect(doc.html).toContain('01/09/2026');
    expect(doc.html).toContain('faltam 18 dia(s)');
  });

  it('não quebra quando não há janela no horizonte', () => {
    const { simulacao, diagnostico } = montar();
    const doc = relatorioProspeccao({ nome: 'Empresa', cnpj: '', simulacao, diagnostico, janela: null });
    expect(doc.html).toContain('próxima janela de decisão será divulgada');
  });

  it('declara que a leitura é preliminar', () => {
    const { simulacao, diagnostico } = montar();
    const doc = relatorioProspeccao({ nome: 'Empresa', cnpj: '', simulacao, diagnostico, janela: null });
    expect(doc.html).toContain('leitura preliminar');
    expect(doc.html).toContain('dados preliminares fornecidos pela empresa');
  });
});

describe('segmentação da carteira', () => {
  it('B2B com Tradicional mais barato cai em decisão comercial', () => {
    const { simulacao, diagnostico } = montar({ perfil: 'MISTO', percentualReceitaB2B: 0.6, insumosTributaveis: 0 });
    expect(simulacao.comparativo.economiaCaixaNoHibrido).toBeLessThan(0);
    expect(classificar({ simulacao, diagnostico }).chave).toBe('decisao-comercial');
  });

  it('B2B puro sem insumos é empate técnico e vai para fronteira', () => {
    // Identidade do modelo: sem crédito de insumos, o custo extra do Híbrido é
    // exatamente o crédito extra transferido. A vantagem ponderada zera.
    const { simulacao, diagnostico } = montar({ anexo: 1, perfil: 'B2B', percentualReceitaB2B: 1, insumosTributaveis: 0 });
    expect(simulacao.comparativo.vantagemPonderada).toBeCloseTo(0, 6);
    expect(diagnostico.confianca).toBe('baixa');
    expect(classificar({ simulacao, diagnostico }).chave).toBe('fronteira');
  });

  it('bloqueio cadastral tem precedência e joga em fronteira', () => {
    const { simulacao, diagnostico } = montar(
      { perfil: 'MISTO', percentualReceitaB2B: 0.6, insumosTributaveis: 0 },
      { possuiDebitosEmAberto: true },
    );
    expect(classificar({ simulacao, diagnostico }).chave).toBe('fronteira');
  });

  it('sublimite estourado também cai em fronteira', () => {
    const simulacao = simular({ ...base, rbt12: 4_000_000 });
    const diagnostico = diagnosticar({ simulacao, cadastro: { possuiDebitosEmAberto: false }, referencia });
    expect(classificar({ simulacao, diagnostico }).chave).toBe('fronteira');
  });

  it('Híbrido mais barato e com mais crédito é evidente', () => {
    const { simulacao, diagnostico } = montar({ insumosTributaveis: 200_000 });
    expect(simulacao.comparativo.economiaCaixaNoHibrido).toBeGreaterThan(0);
    expect(classificar({ simulacao, diagnostico }).chave).toBe('hibrido-evidente');
  });

  it('B2C sem particularidade fica no tradicional tranquilo', () => {
    const { simulacao, diagnostico } = montar({ perfil: 'B2C', percentualReceitaB2B: 0, insumosTributaveis: 0 });
    expect(classificar({ simulacao, diagnostico }).chave).toBe('tradicional-tranquilo');
  });

  it('as prioridades são únicas e cobrem de 1 a 4', () => {
    const prioridades = Object.values(GRUPOS).map((g) => g.prioridade).sort();
    expect(prioridades).toEqual([1, 2, 3, 4]);
  });

  it('o resumo soma custos e conta bloqueios', () => {
    const linhas = [
      linha('A'),
      linha('B', { insumosTributaveis: 200_000 }),
      linha('C', {}, { possuiDebitosEmAberto: true }),
    ];
    const resumo = resumirCarteira(linhas);
    expect(resumo.total).toBe(3);
    expect(resumo.comBloqueio).toBe(1);
    expect(resumo.decididos).toBe(0);
    expect(resumo.totalTradicional).toBeCloseTo(
      linhas.reduce((a, l) => a + l.simulacao.tradicional.custoTotal, 0),
      6,
    );
    // Os grupos saem na ordem de prioridade.
    expect(resumo.porGrupo.map((g) => g.grupo.prioridade)).toEqual([1, 2, 3, 4]);
  });
});

describe('relatório da carteira', () => {
  it('lista os clientes, os bloqueios e os totais', () => {
    const linhas = [linha('Aurora'), linha('Bom Preço', { perfil: 'B2C', percentualReceitaB2B: 0 }), linha('Vertice', {}, { possuiDebitosEmAberto: true })];
    const doc = relatorioCarteira(linhas, 2027, agendaAtiva(referencia));

    expect(doc.html).toContain('Aurora');
    expect(doc.html).toContain('Bom Preço');
    expect(doc.html).toContain('Bloqueios a resolver antes da janela');
    expect(doc.html).toContain('Vertice');
    expect(doc.html).toContain('Segmentação e ordem de ataque');
    expect(doc.html).toContain('circulação interna');
  });

  it('sem bloqueios, informa que a carteira está limpa', () => {
    const doc = relatorioCarteira([linha('Aurora')], 2027, agendaAtiva(referencia));
    expect(doc.html).toContain('Nenhum cliente da carteira está travado');
  });

  it('carteira vazia não quebra o documento', () => {
    const doc = relatorioCarteira([], 2027, agendaAtiva(referencia));
    expect(doc.html).toContain('Nenhum cliente na carteira');
  });

  it('não exibe grupo sem cliente', () => {
    const doc = relatorioCarteira([linha('Aurora', { insumosTributaveis: 200_000 })], 2027, agendaAtiva(referencia));
    expect(doc.html).toContain('Híbrido evidente');
    expect(doc.html).not.toContain('Tradicional tranquilo —');
  });
});
