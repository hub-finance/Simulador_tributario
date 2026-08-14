/**
 * Composição da receita bruta mensal e apuração de limite/sublimite.
 *
 * A Receita Federal definiu oficialmente quais valores compõem a receita bruta mensal
 * do Simples Nacional. A lista abaixo é o checklist que evita a subdeclaração — a causa
 * mais comum de autuação depois do cruzamento sistêmico.
 */

import { LIMITE_SIMPLES_NACIONAL, SUBLIMITE_ICMS_ISS } from './tabelasSimples';

export interface ComponenteReceita {
  chave: keyof ComposicaoReceita;
  rotulo: string;
  integra: boolean;
  fundamento: string;
}

export interface ComposicaoReceita {
  /** Receita de venda de bens e de prestação de serviços. */
  vendasEServicos: number;
  /** Gorjetas — integram a receita bruta, compulsórias ou não. */
  gorjetas: number;
  /** Juros recebidos de clientes por atraso. */
  jurosRecebidos: number;
  /** Multas de mora recebidas de clientes. */
  multasDeMoraRecebidas: number;
  /** Vendas para entrega futura: a receita é reconhecida na operação, não na entrega. */
  operacoesEntregaFutura: number;
  /** Vendas canceladas — NÃO integram. Informar em positivo; o motor subtrai. */
  vendasCanceladas: number;
  /** Descontos incondicionais concedidos — NÃO integram. Informar em positivo. */
  descontosIncondicionais: number;
  /** IPI destacado — NÃO integra a receita bruta. Informar em positivo. */
  ipiDestacado: number;
  /** ICMS-ST recolhido na condição de substituto — NÃO integra. Informar em positivo. */
  icmsSubstituicaoTributaria: number;
}

export const COMPOSICAO_ZERADA: ComposicaoReceita = {
  vendasEServicos: 0,
  gorjetas: 0,
  jurosRecebidos: 0,
  multasDeMoraRecebidas: 0,
  operacoesEntregaFutura: 0,
  vendasCanceladas: 0,
  descontosIncondicionais: 0,
  ipiDestacado: 0,
  icmsSubstituicaoTributaria: 0,
};

export const COMPONENTES_RECEITA: ComponenteReceita[] = [
  {
    chave: 'vendasEServicos',
    rotulo: 'Venda de bens e prestação de serviços',
    integra: true,
    fundamento: 'Produto da venda de bens e serviços nas operações de conta própria (art. 3º, §1º, LC 123/2006).',
  },
  {
    chave: 'gorjetas',
    rotulo: 'Gorjetas',
    integra: true,
    fundamento: 'Definição oficial da RFB: gorjetas compõem a receita bruta mensal do optante.',
  },
  {
    chave: 'jurosRecebidos',
    rotulo: 'Juros recebidos de clientes',
    integra: true,
    fundamento: 'Definição oficial da RFB: juros vinculados à operação compõem a receita bruta mensal.',
  },
  {
    chave: 'multasDeMoraRecebidas',
    rotulo: 'Multas de mora recebidas',
    integra: true,
    fundamento: 'Definição oficial da RFB: multas de mora compõem a receita bruta mensal.',
  },
  {
    chave: 'operacoesEntregaFutura',
    rotulo: 'Operações para entrega futura',
    integra: true,
    fundamento:
      'Definição oficial da RFB: a receita é reconhecida no mês da operação, ainda que a entrega ocorra depois.',
  },
  {
    chave: 'vendasCanceladas',
    rotulo: 'Vendas canceladas (dedução)',
    integra: false,
    fundamento: 'Excluídas da receita bruta (art. 3º, §1º, LC 123/2006).',
  },
  {
    chave: 'descontosIncondicionais',
    rotulo: 'Descontos incondicionais concedidos (dedução)',
    integra: false,
    fundamento: 'Excluídos da receita bruta (art. 3º, §1º, LC 123/2006).',
  },
  {
    chave: 'ipiDestacado',
    rotulo: 'IPI destacado (dedução)',
    integra: false,
    fundamento: 'Não integra a receita bruta do Simples Nacional.',
  },
  {
    chave: 'icmsSubstituicaoTributaria',
    rotulo: 'ICMS-ST na condição de substituto (dedução)',
    integra: false,
    fundamento: 'Não integra a receita bruta do Simples Nacional.',
  },
];

export interface ReceitaConsolidada {
  /** Soma das parcelas que integram a receita bruta. */
  totalIntegra: number;
  /** Soma das deduções informadas. */
  totalDeduz: number;
  receitaBrutaMensal: number;
  /** Parcelas atípicas informadas — o que a maioria dos escritórios esquece de somar. */
  alertas: string[];
}

export function consolidarReceitaBruta(c: ComposicaoReceita): ReceitaConsolidada {
  const totalIntegra =
    c.vendasEServicos + c.gorjetas + c.jurosRecebidos + c.multasDeMoraRecebidas + c.operacoesEntregaFutura;
  const totalDeduz =
    c.vendasCanceladas + c.descontosIncondicionais + c.ipiDestacado + c.icmsSubstituicaoTributaria;

  const alertas: string[] = [];
  const atipicas = c.gorjetas + c.jurosRecebidos + c.multasDeMoraRecebidas + c.operacoesEntregaFutura;
  if (atipicas > 0) {
    alertas.push(
      `R$ ${atipicas.toFixed(2)} em parcelas atípicas (gorjetas, juros, multas de mora e entrega futura) ` +
        'estão sendo somados à receita bruta conforme definição oficial da RFB. Confira se o sistema de ' +
        'origem já os inclui, para não duplicar.',
    );
  }

  return {
    totalIntegra,
    totalDeduz,
    receitaBrutaMensal: Math.max(0, totalIntegra - totalDeduz),
    alertas,
  };
}

export type SituacaoLimite = 'normal' | 'atencao' | 'sublimite-excedido' | 'limite-excedido';

export interface AvaliacaoLimite {
  situacao: SituacaoLimite;
  /** RBT12 considerado, já incluído o IBS quando aplicável. */
  baseConsiderada: number;
  percentualDoLimite: number;
  percentualDoSublimite: number;
  mensagem: string;
}

/**
 * Avalia limite e sublimite.
 *
 * Regra nova: o IBS passa a integrar a conta do sublimite de faturamento. Por isso a
 * função recebe o IBS acumulado em 12 meses separadamente — ele soma à base.
 */
export function avaliarLimite(rbt12: number, ibsAcumulado12Meses = 0): AvaliacaoLimite {
  const baseConsiderada = rbt12 + ibsAcumulado12Meses;
  const percentualDoLimite = baseConsiderada / LIMITE_SIMPLES_NACIONAL;
  const percentualDoSublimite = baseConsiderada / SUBLIMITE_ICMS_ISS;

  let situacao: SituacaoLimite = 'normal';
  let mensagem = 'Dentro do limite e do sublimite.';

  if (baseConsiderada > LIMITE_SIMPLES_NACIONAL) {
    situacao = 'limite-excedido';
    mensagem =
      `Base de R$ ${baseConsiderada.toFixed(2)} excede o limite de R$ ${LIMITE_SIMPLES_NACIONAL.toLocaleString('pt-BR')}. ` +
      'Avaliar exclusão do Simples Nacional e migração para Lucro Presumido/Real.';
  } else if (baseConsiderada > SUBLIMITE_ICMS_ISS) {
    situacao = 'sublimite-excedido';
    mensagem =
      `Base de R$ ${baseConsiderada.toFixed(2)} excede o sublimite de R$ ${SUBLIMITE_ICMS_ISS.toLocaleString('pt-BR')}. ` +
      'ICMS e ISS saem do DAS e passam ao regime normal — o comparativo Tradicional x Híbrido muda de premissa.';
  } else if (percentualDoSublimite >= 0.8) {
    situacao = 'atencao';
    mensagem =
      `Base em ${(percentualDoSublimite * 100).toFixed(1)}% do sublimite. Com o IBS integrando a conta, ` +
      'o estouro pode chegar antes do previsto pelo faturamento nominal.';
  }

  return { situacao, baseConsiderada, percentualDoLimite, percentualDoSublimite, mensagem };
}
