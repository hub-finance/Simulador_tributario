/**
 * Tabelas dos Anexos I a V do Simples Nacional (LC 123/2006, com redação da LC 155/2016).
 *
 * Cada faixa traz, além da alíquota nominal e da parcela a deduzir, os percentuais
 * de REPARTIÇÃO dos tributos. A repartição é o que permite separar, dentro do DAS:
 *
 *   - Tributos que PERMANECEM no DAS no modelo híbrido: IRPJ, CSLL e CPP.
 *   - Tributos SUBSTITUÍDOS pela CBS (PIS e Cofins) e pelo IBS (ICMS e ISS).
 *   - IPI, que é extinto/zerado na reforma (exceto ZFM).
 *
 * ATENÇÃO: os percentuais abaixo reproduzem os anexos vigentes. Antes de cada ciclo
 * anual de simulação, confira em `docs/MATRIZ_DE_REGRAS.md` o procedimento de
 * revalidação das tabelas — elas são parâmetro de sistema, não regra imutável.
 */

export type NumeroAnexo = 1 | 2 | 3 | 4 | 5;

/** Percentuais de repartição de uma faixa. A soma sempre fecha em 100%. */
export interface Reparticao {
  irpj: number;
  csll: number;
  cofins: number;
  pis: number;
  /** Contribuição Patronal Previdenciária. Ausente no Anexo IV (INSS recolhido à parte). */
  cpp: number;
  ipi: number;
  icms: number;
  iss: number;
}

export interface FaixaAnexo {
  faixa: 1 | 2 | 3 | 4 | 5 | 6;
  /** Limite superior de RBT12 da faixa, em reais. */
  receitaAte: number;
  /** Alíquota nominal da faixa (fração: 0.135 = 13,5%). */
  aliquotaNominal: number;
  /** Parcela a deduzir, em reais. */
  parcelaDeduzir: number;
  reparticao: Reparticao;
}

export interface Anexo {
  numero: NumeroAnexo;
  nome: string;
  descricao: string;
  faixas: FaixaAnexo[];
}

/** Helper para declarar repartição preenchendo com zero o que não se aplica ao anexo. */
function rep(p: Partial<Reparticao>): Reparticao {
  return {
    irpj: 0,
    csll: 0,
    cofins: 0,
    pis: 0,
    cpp: 0,
    ipi: 0,
    icms: 0,
    iss: 0,
    ...p,
  };
}

const LIMITES_FAIXA = [180_000, 360_000, 720_000, 1_800_000, 3_600_000, 4_800_000] as const;

export const ANEXO_I: Anexo = {
  numero: 1,
  nome: 'Anexo I — Comércio',
  descricao: 'Revenda de mercadorias. Tributo estadual no DAS: ICMS.',
  faixas: [
    {
      faixa: 1,
      receitaAte: LIMITES_FAIXA[0],
      aliquotaNominal: 0.04,
      parcelaDeduzir: 0,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.415, icms: 0.34 }),
    },
    {
      faixa: 2,
      receitaAte: LIMITES_FAIXA[1],
      aliquotaNominal: 0.073,
      parcelaDeduzir: 5_940,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.415, icms: 0.34 }),
    },
    {
      faixa: 3,
      receitaAte: LIMITES_FAIXA[2],
      aliquotaNominal: 0.095,
      parcelaDeduzir: 13_860,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.42, icms: 0.335 }),
    },
    {
      faixa: 4,
      receitaAte: LIMITES_FAIXA[3],
      aliquotaNominal: 0.107,
      parcelaDeduzir: 22_500,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.42, icms: 0.335 }),
    },
    {
      faixa: 5,
      receitaAte: LIMITES_FAIXA[4],
      aliquotaNominal: 0.143,
      parcelaDeduzir: 87_300,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.42, icms: 0.335 }),
    },
    {
      faixa: 6,
      receitaAte: LIMITES_FAIXA[5],
      aliquotaNominal: 0.19,
      parcelaDeduzir: 378_000,
      reparticao: rep({ irpj: 0.135, csll: 0.1, cofins: 0.2827, pis: 0.0613, cpp: 0.421 }),
    },
  ],
};

export const ANEXO_II: Anexo = {
  numero: 2,
  nome: 'Anexo II — Indústria',
  descricao: 'Atividade industrial. Tributos no DAS incluem IPI e ICMS.',
  faixas: [
    {
      faixa: 1,
      receitaAte: LIMITES_FAIXA[0],
      aliquotaNominal: 0.045,
      parcelaDeduzir: 0,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, ipi: 0.075, icms: 0.32 }),
    },
    {
      faixa: 2,
      receitaAte: LIMITES_FAIXA[1],
      aliquotaNominal: 0.078,
      parcelaDeduzir: 5_940,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, ipi: 0.075, icms: 0.32 }),
    },
    {
      faixa: 3,
      receitaAte: LIMITES_FAIXA[2],
      aliquotaNominal: 0.1,
      parcelaDeduzir: 13_860,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, ipi: 0.075, icms: 0.32 }),
    },
    {
      faixa: 4,
      receitaAte: LIMITES_FAIXA[3],
      aliquotaNominal: 0.112,
      parcelaDeduzir: 22_500,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, ipi: 0.075, icms: 0.32 }),
    },
    {
      faixa: 5,
      receitaAte: LIMITES_FAIXA[4],
      aliquotaNominal: 0.147,
      parcelaDeduzir: 85_500,
      reparticao: rep({ irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, ipi: 0.075, icms: 0.32 }),
    },
    {
      faixa: 6,
      receitaAte: LIMITES_FAIXA[5],
      aliquotaNominal: 0.3,
      parcelaDeduzir: 720_000,
      reparticao: rep({ irpj: 0.085, csll: 0.075, cofins: 0.2096, pis: 0.0454, cpp: 0.235, ipi: 0.35 }),
    },
  ],
};

export const ANEXO_III: Anexo = {
  numero: 3,
  nome: 'Anexo III — Serviços (com CPP no DAS)',
  descricao:
    'Serviços do §5º-B do art. 18 e atividades do Anexo V com Fator R >= 28%. Tributo municipal no DAS: ISS.',
  faixas: [
    {
      faixa: 1,
      receitaAte: LIMITES_FAIXA[0],
      aliquotaNominal: 0.06,
      parcelaDeduzir: 0,
      reparticao: rep({ irpj: 0.04, csll: 0.035, cofins: 0.1282, pis: 0.0278, cpp: 0.434, iss: 0.335 }),
    },
    {
      faixa: 2,
      receitaAte: LIMITES_FAIXA[1],
      aliquotaNominal: 0.112,
      parcelaDeduzir: 9_360,
      reparticao: rep({ irpj: 0.04, csll: 0.035, cofins: 0.1405, pis: 0.0305, cpp: 0.434, iss: 0.32 }),
    },
    {
      faixa: 3,
      receitaAte: LIMITES_FAIXA[2],
      aliquotaNominal: 0.135,
      parcelaDeduzir: 17_640,
      reparticao: rep({ irpj: 0.04, csll: 0.035, cofins: 0.1364, pis: 0.0296, cpp: 0.434, iss: 0.325 }),
    },
    {
      faixa: 4,
      receitaAte: LIMITES_FAIXA[3],
      aliquotaNominal: 0.16,
      parcelaDeduzir: 35_640,
      reparticao: rep({ irpj: 0.04, csll: 0.035, cofins: 0.1364, pis: 0.0296, cpp: 0.434, iss: 0.325 }),
    },
    {
      faixa: 5,
      receitaAte: LIMITES_FAIXA[4],
      aliquotaNominal: 0.21,
      parcelaDeduzir: 125_640,
      reparticao: rep({ irpj: 0.04, csll: 0.035, cofins: 0.1282, pis: 0.0278, cpp: 0.434, iss: 0.335 }),
    },
    {
      faixa: 6,
      receitaAte: LIMITES_FAIXA[5],
      aliquotaNominal: 0.33,
      parcelaDeduzir: 648_000,
      reparticao: rep({ irpj: 0.35, csll: 0.15, cofins: 0.1603, pis: 0.0347, cpp: 0.305 }),
    },
  ],
};

export const ANEXO_IV: Anexo = {
  numero: 4,
  nome: 'Anexo IV — Serviços (CPP fora do DAS)',
  descricao:
    'Construção civil, advocacia, vigilância, limpeza. A CPP NÃO integra o DAS: o INSS patronal é recolhido à parte (DCTFWeb/GPS).',
  faixas: [
    {
      faixa: 1,
      receitaAte: LIMITES_FAIXA[0],
      aliquotaNominal: 0.045,
      parcelaDeduzir: 0,
      reparticao: rep({ irpj: 0.188, csll: 0.152, cofins: 0.1767, pis: 0.0383, iss: 0.445 }),
    },
    {
      faixa: 2,
      receitaAte: LIMITES_FAIXA[1],
      aliquotaNominal: 0.09,
      parcelaDeduzir: 8_100,
      reparticao: rep({ irpj: 0.198, csll: 0.152, cofins: 0.2055, pis: 0.0445, iss: 0.4 }),
    },
    {
      faixa: 3,
      receitaAte: LIMITES_FAIXA[2],
      aliquotaNominal: 0.102,
      parcelaDeduzir: 12_420,
      reparticao: rep({ irpj: 0.208, csll: 0.152, cofins: 0.1973, pis: 0.0427, iss: 0.4 }),
    },
    {
      faixa: 4,
      receitaAte: LIMITES_FAIXA[3],
      aliquotaNominal: 0.14,
      parcelaDeduzir: 39_780,
      reparticao: rep({ irpj: 0.178, csll: 0.192, cofins: 0.189, pis: 0.041, iss: 0.4 }),
    },
    {
      faixa: 5,
      receitaAte: LIMITES_FAIXA[4],
      aliquotaNominal: 0.22,
      parcelaDeduzir: 183_780,
      reparticao: rep({ irpj: 0.188, csll: 0.192, cofins: 0.1808, pis: 0.0392, iss: 0.4 }),
    },
    {
      faixa: 6,
      receitaAte: LIMITES_FAIXA[5],
      aliquotaNominal: 0.33,
      parcelaDeduzir: 828_000,
      reparticao: rep({ irpj: 0.535, csll: 0.215, cofins: 0.2055, pis: 0.0445 }),
    },
  ],
};

export const ANEXO_V: Anexo = {
  numero: 5,
  nome: 'Anexo V — Serviços (Fator R < 28%)',
  descricao: 'Serviços com baixa relação folha/receita. Migram para o Anexo III quando o Fator R atinge 28%.',
  faixas: [
    {
      faixa: 1,
      receitaAte: LIMITES_FAIXA[0],
      aliquotaNominal: 0.155,
      parcelaDeduzir: 0,
      reparticao: rep({ irpj: 0.25, csll: 0.15, cofins: 0.141, pis: 0.0305, cpp: 0.2885, iss: 0.14 }),
    },
    {
      faixa: 2,
      receitaAte: LIMITES_FAIXA[1],
      aliquotaNominal: 0.18,
      parcelaDeduzir: 4_500,
      reparticao: rep({ irpj: 0.23, csll: 0.15, cofins: 0.141, pis: 0.0305, cpp: 0.2785, iss: 0.17 }),
    },
    {
      faixa: 3,
      receitaAte: LIMITES_FAIXA[2],
      aliquotaNominal: 0.195,
      parcelaDeduzir: 9_900,
      reparticao: rep({ irpj: 0.24, csll: 0.15, cofins: 0.1492, pis: 0.0323, cpp: 0.2385, iss: 0.19 }),
    },
    {
      faixa: 4,
      receitaAte: LIMITES_FAIXA[3],
      aliquotaNominal: 0.205,
      parcelaDeduzir: 17_100,
      reparticao: rep({ irpj: 0.21, csll: 0.15, cofins: 0.1574, pis: 0.0341, cpp: 0.2385, iss: 0.21 }),
    },
    {
      faixa: 5,
      receitaAte: LIMITES_FAIXA[4],
      aliquotaNominal: 0.23,
      parcelaDeduzir: 62_100,
      reparticao: rep({ irpj: 0.23, csll: 0.125, cofins: 0.141, pis: 0.0305, cpp: 0.2385, iss: 0.235 }),
    },
    {
      faixa: 6,
      receitaAte: LIMITES_FAIXA[5],
      aliquotaNominal: 0.305,
      parcelaDeduzir: 540_000,
      reparticao: rep({ irpj: 0.35, csll: 0.155, cofins: 0.1644, pis: 0.0356, cpp: 0.295 }),
    },
  ],
};

export const ANEXOS: Record<NumeroAnexo, Anexo> = {
  1: ANEXO_I,
  2: ANEXO_II,
  3: ANEXO_III,
  4: ANEXO_IV,
  5: ANEXO_V,
};

/** Limite geral de receita bruta do Simples Nacional (art. 3º, II, da LC 123/2006). */
export const LIMITE_SIMPLES_NACIONAL = 4_800_000;

/**
 * Sublimite de ICMS/ISS. Acima dele, ICMS e ISS saem do DAS e passam ao regime
 * normal do estado/município — mesmo antes de qualquer opção pela reforma.
 */
export const SUBLIMITE_ICMS_ISS = 3_600_000;

/** Limite de enquadramento como EPP para efeito de faixas. */
export const LIMITE_MEI = 81_000;

/**
 * Localiza a faixa aplicável a um RBT12. Valores acima do limite retornam a 6ª faixa
 * (a exclusão do regime é tratada separadamente em `validarEnquadramento`).
 */
export function encontrarFaixa(anexo: NumeroAnexo, rbt12: number): FaixaAnexo {
  const tabela = ANEXOS[anexo];
  const faixa = tabela.faixas.find((f) => rbt12 <= f.receitaAte);
  return faixa ?? tabela.faixas[tabela.faixas.length - 1];
}
