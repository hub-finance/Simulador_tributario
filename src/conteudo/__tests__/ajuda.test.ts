import { describe, expect, it } from 'vitest';
import { SECOES_AJUDA } from '../ajuda';
import { CALENDARIO } from '../../dominio/calendario';
import { PISO_FATOR_R } from '../../dominio/fatorR';
import { LIMITE_SIMPLES_NACIONAL, SUBLIMITE_ICMS_ISS } from '../../dominio/tabelasSimples';
import { ALIQUOTA_REFERENCIA_CBS, ALIQUOTA_REFERENCIA_IBS, ALIQUOTA_REFERENCIA_TOTAL } from '../../dominio/transicao';

const todoTexto = JSON.stringify(SECOES_AJUDA);

describe('estrutura da ajuda', () => {
  it('cobre as seções obrigatórias da convenção do projeto', () => {
    const ids = SECOES_AJUDA.map((s) => s.id);
    // Assunto do zero, glossário, exemplo numérico, leitura da tela,
    // como explicar ao cliente e limites declarados.
    expect(ids).toContain('o-que-mudou');
    expect(ids).toContain('glossario');
    expect(ids).toContain('credito');
    expect(ids).toContain('ler-a-tela');
    expect(ids).toContain('explicar-ao-cliente');
    expect(ids).toContain('limites');
  });

  it('cada seção tem id único, título e resumo', () => {
    const ids = SECOES_AJUDA.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SECOES_AJUDA) {
      expect(s.titulo.length).toBeGreaterThan(3);
      expect(s.resumo.length).toBeGreaterThan(10);
      expect(s.blocos.length).toBeGreaterThan(0);
    }
  });

  it('o comparativo dos dois cenários é calculado pelo motor, não escrito à mão', () => {
    const secaoCredito = SECOES_AJUDA.find((s) => s.id === 'credito')!;
    expect(secaoCredito.blocos.some((b) => b.tipo === 'exemplo-cadeia')).toBe(true);
  });

  it('a ilustração conceitual de crédito acompanha a alíquota de referência', () => {
    // O texto usa "R$ 1.000 com R$ 265 de imposto". Se a alíquota de referência
    // mudar, esse número precisa mudar junto — senão o material passa a mentir.
    const impostoIlustrado = Math.round(1_000 * ALIQUOTA_REFERENCIA_TOTAL);
    expect(todoTexto).toContain(`R$ ${impostoIlustrado} viram crédito`);
  });
});

describe('o glossário cobre os termos da tela', () => {
  const glossario = SECOES_AJUDA.flatMap((s) => s.blocos).find((b) => b.tipo === 'glossario');

  it('existe e traz definição e tradução para cliente em cada termo', () => {
    expect(glossario).toBeDefined();
    if (glossario?.tipo !== 'glossario') throw new Error('bloco inesperado');
    for (const t of glossario.termos) {
      expect(t.definicao.length, t.termo).toBeGreaterThan(20);
      expect(t.comoExplicar.length, t.termo).toBeGreaterThan(20);
    }
  });

  it('inclui todo termo técnico que aparece na interface', () => {
    if (glossario?.tipo !== 'glossario') throw new Error('bloco inesperado');
    const termos = glossario.termos.map((t) => t.termo);
    for (const esperado of [
      'DAS',
      'RBT12',
      'Anexo',
      'Alíquota efetiva',
      'CPP',
      'Não cumulatividade',
      'Crédito',
      'Saldo credor',
      'Fator R',
      'Sublimite',
      'B2B e B2C',
      'Ponto de equilíbrio comercial',
    ]) {
      expect(termos, `faltou o termo "${esperado}"`).toContain(esperado);
    }
  });
});

describe('o conteúdo está de acordo com os parâmetros do domínio', () => {
  it('o piso do Fator R citado bate com a constante', () => {
    expect(todoTexto).toContain(`${(PISO_FATOR_R * 100).toFixed(0)}%`);
  });

  it('sublimite e limite citados batem com as constantes', () => {
    expect(SUBLIMITE_ICMS_ISS).toBe(3_600_000);
    expect(LIMITE_SIMPLES_NACIONAL).toBe(4_800_000);
    expect(todoTexto).toContain('3.600.000');
    expect(todoTexto).toContain('4.800.000');
    expect(todoTexto).toContain('3,6 milhões');
    expect(todoTexto).toContain('4,8 milhões');
  });

  it('as alíquotas de referência citadas batem com o cronograma', () => {
    expect(todoTexto).toContain(`${(ALIQUOTA_REFERENCIA_TOTAL * 100).toFixed(1).replace('.', ',')}%`);
    expect(todoTexto).toContain(`${(ALIQUOTA_REFERENCIA_CBS * 100).toFixed(1).replace('.', ',')}%`);
    expect(todoTexto).toContain(`${(ALIQUOTA_REFERENCIA_IBS * 100).toFixed(1).replace('.', ',')}%`);
  });

  it('as datas das janelas batem com o calendário', () => {
    const setembro = CALENDARIO.find((e) => e.id === 'janela-setembro-2026')!;
    const cancelamento = CALENDARIO.find((e) => e.id === 'cancelamento-novembro-2026')!;
    const marco = CALENDARIO.find((e) => e.id === 'janela-marco-2027')!;

    expect(setembro.inicio).toBe('2026-09-01');
    expect(todoTexto).toContain('1º a 30 de setembro de 2026');
    expect(cancelamento.fim).toBe('2026-11-30');
    expect(todoTexto).toContain('30 de novembro de 2026');
    expect(marco.fim).toBe('2027-03-31');
    expect(todoTexto).toContain('1 a 31 de março de 2027');
  });

  it('os pisos de multa citados batem com as regras', () => {
    expect(todoTexto).toContain('piso de R$ 50');
    expect(todoTexto).toContain('piso de R$ 200');
  });
});

describe('linguagem voltada à reunião com cliente', () => {
  it('a seção de objeções responde as perguntas que aparecem na mesa', () => {
    const secao = SECOES_AJUDA.find((s) => s.id === 'explicar-ao-cliente')!;
    const objecoes = secao.blocos.find((b) => b.tipo === 'objecoes');
    if (objecoes?.tipo !== 'objecoes') throw new Error('sem bloco de objeções');

    expect(objecoes.itens.length).toBeGreaterThanOrEqual(6);
    const perguntas = objecoes.itens.map((o) => o.pergunta.toLowerCase()).join(' ');
    expect(perguntas).toContain('mais imposto');
    expect(perguntas).toContain('sair do simples');
    expect(perguntas).toContain('concorrente');
    expect(perguntas).toContain('errado');

    for (const o of objecoes.itens) {
      expect(o.resposta.length, o.pergunta).toBeGreaterThan(80);
    }
  });

  it('a seção de limites declara o que a ferramenta não faz', () => {
    const secao = SECOES_AJUDA.find((s) => s.id === 'limites')!;
    const lista = secao.blocos.find((b) => b.tipo === 'lista');
    if (lista?.tipo !== 'lista') throw new Error('sem lista de limites');
    expect(lista.itens.length).toBeGreaterThanOrEqual(5);

    const texto = JSON.stringify(secao).toLowerCase();
    expect(texto).toContain('estimativa');
    expect(texto).toContain('não substitui');
  });

  it('todo campo da tela documentado diz onde achar o dado', () => {
    const secao = SECOES_AJUDA.find((s) => s.id === 'ler-a-tela')!;
    const blocosCampos = secao.blocos.filter((b) => b.tipo === 'campos');
    expect(blocosCampos.length).toBeGreaterThanOrEqual(2);
    for (const bloco of blocosCampos) {
      if (bloco.tipo !== 'campos') continue;
      for (const c of bloco.itens) {
        expect(c.oQueE.length, c.campo).toBeGreaterThan(20);
        expect(c.ondeAcha.length, c.campo).toBeGreaterThan(0);
      }
    }
  });
});
