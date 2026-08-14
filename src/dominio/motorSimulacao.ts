/**
 * Motor de simulação: Simples Tradicional x Simples Híbrido.
 *
 * Cenário A — TRADICIONAL: tudo dentro do DAS. Guia única, mas o cliente PJ do seu
 * cliente só toma crédito de IBS/CBS no limite do que foi efetivamente pago embutido
 * na guia.
 *
 * Cenário B — HÍBRIDO: a empresa permanece no Simples Nacional (IRPJ, CSLL e CPP
 * seguem no DAS, que fica mais barato), mas apura IBS e CBS pelo regime não cumulativo,
 * podendo transferir o crédito integral na nota.
 *
 * O motor não decide sozinho: ele entrega os dois números e o diferencial de crédito,
 * que é o dado que o diagnóstico usa para pesar risco comercial contra custo.
 */

import { encontrarFaixa, type FaixaAnexo, type NumeroAnexo } from './tabelasSimples';
import { parametrosDoAno, type AnoTransicao } from './transicao';

export type PerfilCliente = 'B2B' | 'B2C' | 'MISTO';

export interface EntradaSimulacao {
  faturamentoMensal: number;
  rbt12: number;
  anexo: NumeroAnexo;
  perfil: PerfilCliente;
  /**
   * Fração da receita destinada a pessoas jurídicas (0 a 1). Para B2B puro use 1,
   * para B2C puro use 0. Em perfil MISTO é o parâmetro que pondera a decisão.
   */
  percentualReceitaB2B?: number;
  /** Compras e insumos do mês que geram crédito de IBS/CBS no regime regular. */
  insumosTributaveis: number;
  /** Ano-calendário simulado. Define as alíquotas via cronograma de transição. */
  ano: number;
  /** Saldo credor de IBS/CBS acumulado de meses anteriores, se houver. */
  saldoCredorAnterior?: number;
}

export interface DecomposicaoDAS {
  irpj: number;
  csll: number;
  cpp: number;
  /** Parcela de PIS/Cofins — já rotulada como CBS a partir de 2027. */
  pisCofinsOuCBS: number;
  /** Parcela de ICMS/ISS — substituída progressivamente pelo IBS a partir de 2029. */
  icmsIssOuIBS: number;
  ipi: number;
}

export interface CenarioTradicional {
  nome: 'Tradicional';
  /** Valor total da guia DAS. */
  das: number;
  decomposicao: DecomposicaoDAS;
  /**
   * Crédito de IBS/CBS que o cliente PJ consegue aproveitar: limitado ao montante
   * de IBS/CBS efetivamente embutido no DAS.
   */
  creditoTransferido: number;
  custoTotal: number;
}

export interface CenarioHibrido {
  nome: 'Híbrido';
  /** DAS reduzido: apenas os tributos que permanecem no regime do Simples. */
  dasReduzido: number;
  decomposicao: DecomposicaoDAS;
  /** Débito de IBS/CBS sobre as vendas do mês. */
  debitoIbsCbs: number;
  /** Crédito de IBS/CBS sobre insumos e compras do mês, somado ao saldo anterior. */
  creditoIbsCbs: number;
  /** Guia de IBS/CBS a recolher (nunca negativa). */
  guiaIbsCbs: number;
  /** Saldo credor a transportar para o mês seguinte. */
  saldoCredorAcumulado: number;
  /** Crédito transferido ao cliente PJ: integral (100% do débito destacado). */
  creditoTransferido: number;
  custoTotal: number;
  /** Disponível apenas a partir de 2027; antes disso é projeção. */
  disponivelNoAno: boolean;
}

export interface ResultadoSimulacao {
  entrada: EntradaSimulacao;
  parametrosAno: AnoTransicao;
  faixa: FaixaAnexo;
  aliquotaEfetivaSimples: number;
  aliquotaIbsCbs: number;
  tradicional: CenarioTradicional;
  hibrido: CenarioHibrido;
  comparativo: Comparativo;
}

export interface Comparativo {
  /** Positivo = o Híbrido custa menos em caixa. */
  economiaCaixaNoHibrido: number;
  /** Diferença de crédito repassado ao cliente PJ (Híbrido - Tradicional). */
  ganhoDeCreditoNoHibrido: number;
  /**
   * Custo efetivo do produto para o cliente PJ em cada cenário: preço menos o crédito
   * que ele consegue tomar. É a métrica que decide contrato, não a guia de imposto.
   */
  precoLiquidoParaClientePJ: { tradicional: number; hibrido: number };
  /** Resultado líquido considerando quanto da receita é B2B. */
  vantagemPonderada: number;
}

/** Alíquota efetiva do Simples Nacional: ((RBT12 x nominal) - PD) / RBT12. */
export function calcularAliquotaEfetiva(rbt12: number, faixa: FaixaAnexo): number {
  if (rbt12 <= 0) return faixa.aliquotaNominal;
  const efetiva = (rbt12 * faixa.aliquotaNominal - faixa.parcelaDeduzir) / rbt12;
  return Math.max(0, efetiva);
}

/**
 * Fração do DAS que PERMANECE no Simples quando a empresa opta pelo modelo híbrido.
 * Sai do DAS exatamente o que já foi substituído por IBS/CBS naquele ano.
 */
export function fatorPermanenteDAS(faixa: FaixaAnexo, p: AnoTransicao): number {
  const r = faixa.reparticao;
  return (
    r.irpj +
    r.csll +
    r.cpp +
    (r.pis + r.cofins) * p.fracaoPisCofins +
    (r.icms + r.iss) * p.fracaoIcmsIss +
    r.ipi * p.fracaoIpi
  );
}

/**
 * Fração do DAS INTEGRAL que permanece na guia do modelo Tradicional.
 *
 * Premissa declarada: com o IPI zerado a partir de 2027, a parcela de IPI deixa de ser
 * cobrada também dentro do DAS — as demais parcelas seguem inalteradas. É a premissa
 * mais conservadora entre as possíveis e está registrada em `docs/MATRIZ_DE_REGRAS.md`.
 */
export function fatorGuiaTradicional(faixa: FaixaAnexo, p: AnoTransicao): number {
  return 1 - faixa.reparticao.ipi * (1 - p.fracaoIpi);
}

/**
 * Fração do DAS que corresponde a IBS/CBS já embutidos na guia (modelo Tradicional).
 * É o teto do crédito que o cliente PJ consegue aproveitar.
 */
export function fracaoIbsCbsEmbutidaNoDAS(faixa: FaixaAnexo, p: AnoTransicao): number {
  const r = faixa.reparticao;
  const parcelaCBS = (r.pis + r.cofins) * (1 - p.fracaoPisCofins);
  const parcelaIBS = (r.icms + r.iss) * (1 - p.fracaoIcmsIss);
  return parcelaCBS + parcelaIBS;
}

/**
 * Decompõe o DAS por tributo. A base é sempre o DAS INTEGRAL — no modelo híbrido as
 * parcelas já substituídas por IBS/CBS simplesmente não aparecem, e a soma dos
 * componentes resulta no DAS reduzido.
 */
function decompor(
  dasIntegral: number,
  faixa: FaixaAnexo,
  p: AnoTransicao,
  modo: 'tradicional' | 'hibrido',
): DecomposicaoDAS {
  const r = faixa.reparticao;
  // No tradicional, PIS/Cofins e ICMS/ISS permanecem na guia sob novo rótulo (CBS/IBS).
  // O IPI, ao ser zerado, sai da guia nos dois cenários.
  const retencaoPisCofins = modo === 'hibrido' ? p.fracaoPisCofins : 1;
  const retencaoIcmsIss = modo === 'hibrido' ? p.fracaoIcmsIss : 1;

  return {
    irpj: dasIntegral * r.irpj,
    csll: dasIntegral * r.csll,
    cpp: dasIntegral * r.cpp,
    pisCofinsOuCBS: dasIntegral * (r.pis + r.cofins) * retencaoPisCofins,
    icmsIssOuIBS: dasIntegral * (r.icms + r.iss) * retencaoIcmsIss,
    ipi: dasIntegral * r.ipi * p.fracaoIpi,
  };
}

export function simular(entrada: EntradaSimulacao): ResultadoSimulacao {
  const p = parametrosDoAno(entrada.ano);
  const faixa = encontrarFaixa(entrada.anexo, entrada.rbt12);
  const aliquotaEfetiva = calcularAliquotaEfetiva(entrada.rbt12, faixa);
  const aliquotaIbsCbs = p.aliquotaCBS + p.aliquotaIBS;

  const faturamento = Math.max(0, entrada.faturamentoMensal);
  const insumos = Math.max(0, entrada.insumosTributaveis);
  const saldoAnterior = Math.max(0, entrada.saldoCredorAnterior ?? 0);

  // ---------- Cenário A: Tradicional ----------
  // DAS integral pela tabela do anexo; a guia efetiva desconta o IPI já extinto.
  const dasIntegral = faturamento * aliquotaEfetiva;
  const das = dasIntegral * fatorGuiaTradicional(faixa, p);
  const creditoTradicional = dasIntegral * fracaoIbsCbsEmbutidaNoDAS(faixa, p);

  const tradicional: CenarioTradicional = {
    nome: 'Tradicional',
    das,
    decomposicao: decompor(dasIntegral, faixa, p, 'tradicional'),
    creditoTransferido: creditoTradicional,
    custoTotal: das,
  };

  // ---------- Cenário B: Híbrido ----------
  const dasReduzido = dasIntegral * fatorPermanenteDAS(faixa, p);
  const debitoIbsCbs = faturamento * aliquotaIbsCbs;
  const creditoIbsCbs = insumos * aliquotaIbsCbs + saldoAnterior;
  const liquido = debitoIbsCbs - creditoIbsCbs;
  const guiaIbsCbs = Math.max(0, liquido);
  const saldoCredorAcumulado = Math.max(0, -liquido);

  const hibrido: CenarioHibrido = {
    nome: 'Híbrido',
    dasReduzido,
    decomposicao: decompor(dasIntegral, faixa, p, 'hibrido'),
    debitoIbsCbs,
    creditoIbsCbs,
    guiaIbsCbs,
    saldoCredorAcumulado,
    // No regime regular o crédito destacado na nota é o débito integral da operação,
    // independentemente do saldo credor usado para quitar a guia.
    creditoTransferido: debitoIbsCbs,
    custoTotal: dasReduzido + guiaIbsCbs,
    disponivelNoAno: p.opcaoHibridaDisponivel,
  };

  // ---------- Comparativo ----------
  const fracaoB2B =
    entrada.percentualReceitaB2B ?? (entrada.perfil === 'B2B' ? 1 : entrada.perfil === 'B2C' ? 0 : 0.5);

  const economiaCaixaNoHibrido = tradicional.custoTotal - hibrido.custoTotal;
  const ganhoDeCreditoNoHibrido = hibrido.creditoTransferido - tradicional.creditoTransferido;

  const comparativo: Comparativo = {
    economiaCaixaNoHibrido,
    ganhoDeCreditoNoHibrido,
    precoLiquidoParaClientePJ: {
      tradicional: faturamento - tradicional.creditoTransferido,
      hibrido: faturamento - hibrido.creditoTransferido,
    },
    // O ganho de crédito só tem valor econômico na parcela da receita vendida a PJ.
    vantagemPonderada: economiaCaixaNoHibrido + ganhoDeCreditoNoHibrido * fracaoB2B,
  };

  return {
    entrada,
    parametrosAno: p,
    faixa,
    aliquotaEfetivaSimples: aliquotaEfetiva,
    aliquotaIbsCbs,
    tradicional,
    hibrido,
    comparativo,
  };
}

/** Projeta a simulação ano a ano ao longo da transição. */
export function simularHorizonte(entrada: EntradaSimulacao, anos: number[]): ResultadoSimulacao[] {
  return anos.map((ano) => simular({ ...entrada, ano }));
}
