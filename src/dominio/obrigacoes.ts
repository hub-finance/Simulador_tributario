/**
 * Obrigações acessórias do Simples Nacional e o novo regime de multas.
 *
 * A mudança de postura da fiscalização é tão relevante quanto a mudança de alíquotas:
 * a tolerância de prazo acabou. A multa do PGDAS-D incide a partir do primeiro dia
 * de atraso, e a DEFIS passou a ter piso próprio.
 */

export type TipoObrigacao = 'PGDAS-D' | 'DEFIS';

export interface RegraMulta {
  obrigacao: TipoObrigacao;
  /** Percentual por mês-calendário ou fração de atraso, sobre a base. */
  percentualPorMes: number;
  /** Valor mínimo da multa, em reais. */
  pisoReais: number;
  /** Teto percentual acumulado sobre a base. */
  tetoPercentual: number;
  /** Redução aplicável quando a declaração é entregue antes de procedimento de ofício. */
  reducaoEspontanea: number;
  baseDeCalculo: string;
  observacao: string;
}

export const REGRAS_MULTA: Record<TipoObrigacao, RegraMulta> = {
  'PGDAS-D': {
    obrigacao: 'PGDAS-D',
    percentualPorMes: 0.02,
    pisoReais: 50,
    tetoPercentual: 0.2,
    reducaoEspontanea: 0.5,
    baseDeCalculo: 'Montante dos tributos declarados na competência',
    observacao:
      'Vencimento no dia 20 do mês seguinte à competência. A multa incide a partir do 1º dia após o ' +
      'vencimento — não há mais tolerância.',
  },
  DEFIS: {
    obrigacao: 'DEFIS',
    percentualPorMes: 0.02,
    pisoReais: 200,
    tetoPercentual: 0.2,
    reducaoEspontanea: 0.5,
    baseDeCalculo: 'Montante dos tributos informados na declaração do ano-calendário',
    observacao:
      'Multa inédita a partir da DEFIS do ano-calendário 2025 (entrega até 31/03/2026). ' +
      'O CGSN definiu a extinção futura da DEFIS como obrigação autônoma: os dados passarão a ser ' +
      'prestados anualmente dentro do próprio PGDAS-D.',
  },
};

export interface ResultadoMulta {
  obrigacao: TipoObrigacao;
  diasAtraso: number;
  /** Meses-calendário ou fração considerados no cálculo. */
  mesesConsiderados: number;
  /** Multa antes de piso, teto e redução. */
  multaProporcional: number;
  /** Se o piso mínimo prevaleceu sobre o cálculo proporcional. */
  aplicouPiso: boolean;
  /** Se o teto de 20% limitou o valor. */
  aplicouTeto: boolean;
  valorFinal: number;
  memoria: string;
}

/**
 * Calcula a multa por atraso na entrega de uma obrigação acessória.
 *
 * @param baseTributos montante de tributos declarados (base de cálculo da multa)
 * @param diasAtraso dias corridos após o vencimento
 * @param espontanea true quando a entrega ocorre antes de procedimento de ofício (redução de 50%)
 */
export function calcularMultaAtraso(
  obrigacao: TipoObrigacao,
  baseTributos: number,
  diasAtraso: number,
  espontanea = true,
): ResultadoMulta {
  const regra = REGRAS_MULTA[obrigacao];

  if (diasAtraso <= 0) {
    return {
      obrigacao,
      diasAtraso: 0,
      mesesConsiderados: 0,
      multaProporcional: 0,
      aplicouPiso: false,
      aplicouTeto: false,
      valorFinal: 0,
      memoria: 'Entrega dentro do prazo — sem multa.',
    };
  }

  // Mês-calendário ou fração: 1 dia de atraso já conta um mês inteiro.
  const mesesConsiderados = Math.ceil(diasAtraso / 30);
  const percentualBruto = regra.percentualPorMes * mesesConsiderados;
  const percentualAplicado = Math.min(percentualBruto, regra.tetoPercentual);
  const aplicouTeto = percentualBruto > regra.tetoPercentual;

  const multaProporcional = Math.max(0, baseTributos) * percentualAplicado;
  const comPiso = Math.max(multaProporcional, regra.pisoReais);
  const aplicouPiso = comPiso > multaProporcional;

  // A redução por espontaneidade não pode derrubar a multa abaixo do piso legal.
  const valorFinal = espontanea ? Math.max(comPiso * (1 - regra.reducaoEspontanea), regra.pisoReais) : comPiso;

  const memoria =
    `${obrigacao}: ${diasAtraso} dia(s) de atraso = ${mesesConsiderados} mês(es)/fração x ` +
    `${(regra.percentualPorMes * 100).toFixed(0)}% = ${(percentualAplicado * 100).toFixed(1)}%` +
    (aplicouTeto ? ' (teto de 20% aplicado)' : '') +
    `. Proporcional: R$ ${multaProporcional.toFixed(2)}` +
    (aplicouPiso ? `; piso de R$ ${regra.pisoReais.toFixed(2)} prevaleceu` : '') +
    (espontanea ? '; redução de 50% por espontaneidade, limitada ao piso' : '') +
    `. Valor final: R$ ${valorFinal.toFixed(2)}.`;

  return {
    obrigacao,
    diasAtraso,
    mesesConsiderados,
    multaProporcional,
    aplicouPiso,
    aplicouTeto,
    valorFinal,
    memoria,
  };
}
