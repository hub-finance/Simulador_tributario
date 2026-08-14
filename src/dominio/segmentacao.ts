/**
 * Segmentação da carteira em grupos de tratamento.
 *
 * A janela tem 30 dias e a carteira inteira não cabe nela. A segmentação define a
 * ordem de ataque: onde há risco de perder cliente e onde o escritório agrega mais
 * valor vem primeiro; o que é decisão óbvia vira comunicado em massa.
 *
 * Os grupos são os mesmos de `docs/PLANEJAMENTO.md`, seção "Fase 2".
 */

import type { Diagnostico } from './diagnostico';
import type { ResultadoSimulacao } from './motorSimulacao';

export type ChaveGrupo =
  | 'decisao-comercial'
  | 'fronteira'
  | 'hibrido-evidente'
  | 'tradicional-tranquilo';

export interface Grupo {
  chave: ChaveGrupo;
  rotulo: string;
  /** 1 = atacar primeiro. */
  prioridade: 1 | 2 | 3 | 4;
  descricao: string;
  encaminhamento: string;
}

export const GRUPOS: Record<ChaveGrupo, Grupo> = {
  'decisao-comercial': {
    chave: 'decisao-comercial',
    rotulo: 'Decisão comercial',
    prioridade: 1,
    descricao:
      'Cliente B2B em que o modelo Tradicional é mais barato em caixa, mas repassa crédito limitado ao comprador PJ.',
    encaminhamento:
      'Reunião obrigatória. A pauta é única: aceitar pagar mais imposto para preservar competitividade, ' +
      'ou manter o custo e renegociar preço com os compradores PJ.',
  },
  fronteira: {
    chave: 'fronteira',
    rotulo: 'Fronteira',
    prioridade: 2,
    descricao:
      'Situação de limite: sublimite próximo ou estourado, bloqueio cadastral, grupo econômico ou empate técnico entre os cenários.',
    encaminhamento: 'Análise individual antes de qualquer recomendação. Não entra em comunicado padronizado.',
  },
  'hibrido-evidente': {
    chave: 'hibrido-evidente',
    rotulo: 'Híbrido evidente',
    prioridade: 3,
    descricao: 'O modelo Híbrido é mais barato em caixa e ainda amplia o crédito repassado. Decisão sem trade-off.',
    encaminhamento: 'Comunicar a recomendação e formalizar a opção. Esforço baixo.',
  },
  'tradicional-tranquilo': {
    chave: 'tradicional-tranquilo',
    rotulo: 'Tradicional tranquilo',
    prioridade: 4,
    descricao: 'Cliente voltado ao consumidor final, em que o crédito repassado tem pouco valor econômico.',
    encaminhamento: 'Comunicado em massa confirmando a permanência no modelo Tradicional. Esforço mínimo.',
  },
};

export interface EntradaClassificacao {
  simulacao: ResultadoSimulacao;
  diagnostico: Diagnostico;
}

/**
 * A ordem de avaliação importa: "fronteira" tem precedência porque uma pendência
 * cadastral ou um sublimite estourado invalida a conversa sobre qual cenário é melhor.
 */
export function classificar({ simulacao, diagnostico }: EntradaClassificacao): Grupo {
  const { comparativo, entrada } = simulacao;

  const fracaoB2B =
    entrada.percentualReceitaB2B ?? (entrada.perfil === 'B2B' ? 1 : entrada.perfil === 'B2C' ? 0 : 0.5);

  const temGrupoEconomico = diagnostico.alertas.some((a) => a.titulo.includes('faturamento global'));
  const empateTecnico = diagnostico.confianca === 'baixa';

  if (diagnostico.possuiBloqueio || diagnostico.limite.situacao !== 'normal' || temGrupoEconomico || empateTecnico) {
    return GRUPOS.fronteira;
  }

  if (fracaoB2B >= 0.5 && comparativo.economiaCaixaNoHibrido < 0) {
    return GRUPOS['decisao-comercial'];
  }

  if (comparativo.economiaCaixaNoHibrido > 0 && comparativo.ganhoDeCreditoNoHibrido > 0) {
    return GRUPOS['hibrido-evidente'];
  }

  return GRUPOS['tradicional-tranquilo'];
}

export interface LinhaCarteira {
  nome: string;
  cnpj: string;
  grupo: Grupo;
  simulacao: ResultadoSimulacao;
  diagnostico: Diagnostico;
  decidido: boolean;
}

export interface ResumoCarteira {
  total: number;
  decididos: number;
  comBloqueio: number;
  /** Contagem por grupo, já na ordem de prioridade. */
  porGrupo: { grupo: Grupo; quantidade: number; linhas: LinhaCarteira[] }[];
  /** Soma mensal em jogo nos dois cenários, para dimensionar a conversa. */
  totalTradicional: number;
  totalHibrido: number;
  /** Diferença agregada de crédito repassado aos compradores PJ da carteira. */
  totalGanhoDeCredito: number;
}

export function resumirCarteira(linhas: LinhaCarteira[]): ResumoCarteira {
  const chaves: ChaveGrupo[] = ['decisao-comercial', 'fronteira', 'hibrido-evidente', 'tradicional-tranquilo'];

  return {
    total: linhas.length,
    decididos: linhas.filter((l) => l.decidido).length,
    comBloqueio: linhas.filter((l) => l.diagnostico.possuiBloqueio).length,
    porGrupo: chaves.map((chave) => {
      const doGrupo = linhas.filter((l) => l.grupo.chave === chave);
      return { grupo: GRUPOS[chave], quantidade: doGrupo.length, linhas: doGrupo };
    }),
    totalTradicional: linhas.reduce((a, l) => a + l.simulacao.tradicional.custoTotal, 0),
    totalHibrido: linhas.reduce((a, l) => a + l.simulacao.hibrido.custoTotal, 0),
    totalGanhoDeCredito: linhas.reduce((a, l) => a + l.simulacao.comparativo.ganhoDeCreditoNoHibrido, 0),
  };
}
