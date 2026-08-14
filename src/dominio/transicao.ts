/**
 * Cronograma de transição da Reforma Tributária do Consumo (EC 132/2023 e LC 214/2025)
 * aplicado ao Simples Nacional.
 *
 * Este módulo é a única fonte de verdade sobre "quanto se paga de IBS/CBS em cada ano"
 * e "quanto de ICMS/ISS/PIS/Cofins ainda vive dentro do DAS". O motor de simulação
 * não conhece alíquotas — ele pergunta ao cronograma.
 */

/** Alíquota de referência total estimada do IBS + CBS no regime pleno. */
export const ALIQUOTA_REFERENCIA_TOTAL = 0.265;
/** Parcela federal da alíquota de referência (CBS). */
export const ALIQUOTA_REFERENCIA_CBS = 0.088;
/** Parcela estadual + municipal da alíquota de referência (IBS). */
export const ALIQUOTA_REFERENCIA_IBS = 0.177;

export interface AnoTransicao {
  ano: number;
  /** Alíquota de CBS efetivamente devida no regime regular naquele ano. */
  aliquotaCBS: number;
  /** Alíquota de IBS efetivamente devida no regime regular naquele ano. */
  aliquotaIBS: number;
  /**
   * Fração do PIS/Cofins que ainda compõe o DAS (1 = integral, 0 = extinto).
   * A partir de 2027 o PIS/Cofins é extinto e substituído pela CBS.
   */
  fracaoPisCofins: number;
  /**
   * Fração do ICMS/ISS que ainda compõe o DAS. Reduz 10 p.p. ao ano de 2029 a 2032
   * e zera em 2033, quando o IBS passa a vigorar integralmente.
   */
  fracaoIcmsIss: number;
  /** Fração do IPI ainda devida. Zerado a partir de 2027 (ressalvada a Zona Franca de Manaus). */
  fracaoIpi: number;
  /**
   * Em 2026 os optantes pelo Simples Nacional estão DISPENSADOS de recolher a
   * alíquota-teste de IBS/CBS, e o preenchimento dos campos na nota é opcional.
   */
  simplesDispensadoDoRecolhimento: boolean;
  /** Se a opção pelo recolhimento de IBS/CBS "por fora" do DAS já produz efeitos. */
  opcaoHibridaDisponivel: boolean;
  observacao: string;
}

export const CRONOGRAMA_TRANSICAO: AnoTransicao[] = [
  {
    ano: 2026,
    aliquotaCBS: 0.009,
    aliquotaIBS: 0.001,
    fracaoPisCofins: 1,
    fracaoIcmsIss: 1,
    fracaoIpi: 1,
    simplesDispensadoDoRecolhimento: true,
    opcaoHibridaDisponivel: false,
    observacao:
      'Ano-teste. Empresas do Simples dispensadas de recolher a alíquota-teste (CBS 0,9% + IBS 0,1%); ' +
      'preenchimento dos campos de IBS/CBS na nota fiscal é opcional. Ano da DECISÃO (janela de setembro).',
  },
  {
    ano: 2027,
    aliquotaCBS: ALIQUOTA_REFERENCIA_CBS,
    aliquotaIBS: 0.001,
    fracaoPisCofins: 0,
    fracaoIcmsIss: 1,
    fracaoIpi: 0,
    simplesDispensadoDoRecolhimento: false,
    opcaoHibridaDisponivel: true,
    observacao:
      'PIS/Cofins extintos e substituídos pela CBS integral. IPI zerado (exceto ZFM). ' +
      'IBS ainda em 0,1%. Primeiro ano em que a opção híbrida produz efeitos.',
  },
  {
    ano: 2028,
    aliquotaCBS: ALIQUOTA_REFERENCIA_CBS,
    aliquotaIBS: 0.001,
    fracaoPisCofins: 0,
    fracaoIcmsIss: 1,
    fracaoIpi: 0,
    simplesDispensadoDoRecolhimento: false,
    opcaoHibridaDisponivel: true,
    observacao: 'Mesma configuração de 2027.',
  },
  {
    ano: 2029,
    aliquotaCBS: ALIQUOTA_REFERENCIA_CBS,
    aliquotaIBS: ALIQUOTA_REFERENCIA_IBS * 0.1,
    fracaoPisCofins: 0,
    fracaoIcmsIss: 0.9,
    fracaoIpi: 0,
    simplesDispensadoDoRecolhimento: false,
    opcaoHibridaDisponivel: true,
    observacao: 'Início da substituição gradual do ICMS/ISS pelo IBS: ICMS/ISS a 90%, IBS a 10%.',
  },
  {
    ano: 2030,
    aliquotaCBS: ALIQUOTA_REFERENCIA_CBS,
    aliquotaIBS: ALIQUOTA_REFERENCIA_IBS * 0.2,
    fracaoPisCofins: 0,
    fracaoIcmsIss: 0.8,
    fracaoIpi: 0,
    simplesDispensadoDoRecolhimento: false,
    opcaoHibridaDisponivel: true,
    observacao: 'ICMS/ISS a 80%, IBS a 20%.',
  },
  {
    ano: 2031,
    aliquotaCBS: ALIQUOTA_REFERENCIA_CBS,
    aliquotaIBS: ALIQUOTA_REFERENCIA_IBS * 0.3,
    fracaoPisCofins: 0,
    fracaoIcmsIss: 0.7,
    fracaoIpi: 0,
    simplesDispensadoDoRecolhimento: false,
    opcaoHibridaDisponivel: true,
    observacao: 'ICMS/ISS a 70%, IBS a 30%.',
  },
  {
    ano: 2032,
    aliquotaCBS: ALIQUOTA_REFERENCIA_CBS,
    aliquotaIBS: ALIQUOTA_REFERENCIA_IBS * 0.4,
    fracaoPisCofins: 0,
    fracaoIcmsIss: 0.6,
    fracaoIpi: 0,
    simplesDispensadoDoRecolhimento: false,
    opcaoHibridaDisponivel: true,
    observacao: 'ICMS/ISS a 60%, IBS a 40%. Último ano do regime dual.',
  },
  {
    ano: 2033,
    aliquotaCBS: ALIQUOTA_REFERENCIA_CBS,
    aliquotaIBS: ALIQUOTA_REFERENCIA_IBS,
    fracaoPisCofins: 0,
    fracaoIcmsIss: 0,
    fracaoIpi: 0,
    simplesDispensadoDoRecolhimento: false,
    opcaoHibridaDisponivel: true,
    observacao: 'Regime pleno. ICMS, ISS, PIS, Cofins e IPI extintos. IBS e CBS integrais.',
  },
];

export function parametrosDoAno(ano: number): AnoTransicao {
  const encontrado = CRONOGRAMA_TRANSICAO.find((a) => a.ano === ano);
  if (encontrado) return encontrado;
  // Anos anteriores a 2026: regime pré-reforma. Anos posteriores a 2033: regime pleno.
  return ano < 2026 ? { ...CRONOGRAMA_TRANSICAO[0], ano } : { ...CRONOGRAMA_TRANSICAO[CRONOGRAMA_TRANSICAO.length - 1], ano };
}

/** Alíquota combinada IBS + CBS devida no regime regular, no ano informado. */
export function aliquotaIbsCbsDoAno(ano: number): number {
  const p = parametrosDoAno(ano);
  return p.aliquotaCBS + p.aliquotaIBS;
}
