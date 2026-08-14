/**
 * Diagnóstico e recomendação.
 *
 * A diretriz de negócio é explícita:
 *   - Clientes voltados ao consumidor final (B2C) devem, majoritariamente, permanecer
 *     no modelo Tradicional — crédito não tem valor para quem compra sem CNPJ.
 *   - Clientes que vendem ou prestam serviço a outras empresas (B2B) precisam migrar
 *     para o modelo Híbrido se não quiserem perder contratos, mesmo quando o
 *     Tradicional é mais barato em caixa.
 *
 * O motor traduz essa diretriz em número: o ganho de crédito repassado ao cliente PJ
 * é comparado com o custo adicional em caixa. Quando o ganho supera o custo, o Híbrido
 * é recomendado ainda que a guia fique maior.
 */

import { avaliarEvento, CALENDARIO, type StatusEvento } from './calendario';
import { brl, pct } from './formatoBR';
import type { ResultadoSimulacao } from './motorSimulacao';
import { avaliarLimite, type AvaliacaoLimite } from './receitaBruta';

export type Severidade = 'bloqueio' | 'risco' | 'atencao' | 'informacao';

export interface Alerta {
  severidade: Severidade;
  titulo: string;
  detalhe: string;
  /** Regra de origem, para rastreabilidade na matriz de regras. */
  origem: string;
}

export interface SituacaoCadastral {
  /** Débitos fiscais em aberto impedem a confirmação/alteração de regime na janela. */
  possuiDebitosEmAberto: boolean;
  valorDebitos?: number;
  /** Pendências cadastrais (endereço, CNAE, quadro societário) também travam a opção. */
  possuiPendenciasCadastrais?: boolean;
  /** CNPJs do mesmo grupo econômico, para o cruzamento de faturamento global. */
  cnpjsInterligados?: { cnpj: string; nome: string; rbt12: number }[];
}

export interface Diagnostico {
  recomendacao: 'Tradicional' | 'Híbrido';
  /** Confiança da recomendação: quanto maior a margem, maior a confiança. */
  confianca: 'alta' | 'media' | 'baixa';
  justificativa: string;
  /**
   * Quanto de custo adicional em caixa o modelo Híbrido pode absorver e ainda assim
   * compensar comercialmente. Zero para B2C puro.
   */
  pontoDeEquilibrioComercial: number;
  alertas: Alerta[];
  limite: AvaliacaoLimite;
  /** Eventos de calendário que exigem ação na data de referência. */
  agenda: StatusEvento[];
  /** True quando existe algo que impede formalizar a opção na janela. */
  possuiBloqueio: boolean;
}

export interface EntradaDiagnostico {
  simulacao: ResultadoSimulacao;
  cadastro: SituacaoCadastral;
  referencia: Date;
  /** IBS acumulado em 12 meses, que passa a integrar a conta do sublimite. */
  ibsAcumulado12Meses?: number;
}

const LIMITE_SIMPLES = 4_800_000;

export function diagnosticar({
  simulacao,
  cadastro,
  referencia,
  ibsAcumulado12Meses = 0,
}: EntradaDiagnostico): Diagnostico {
  const { entrada, comparativo, hibrido, parametrosAno } = simulacao;
  const alertas: Alerta[] = [];

  const fracaoB2B =
    entrada.percentualReceitaB2B ?? (entrada.perfil === 'B2B' ? 1 : entrada.perfil === 'B2C' ? 0 : 0.5);

  // ---------- Decisão ----------
  const pontoDeEquilibrioComercial = comparativo.ganhoDeCreditoNoHibrido * fracaoB2B;
  const recomendacao = comparativo.vantagemPonderada > 0 ? 'Híbrido' : 'Tradicional';

  const referenciaMargem = Math.max(1, simulacao.tradicional.custoTotal);
  const margemRelativa = Math.abs(comparativo.vantagemPonderada) / referenciaMargem;
  const confianca = margemRelativa >= 0.15 ? 'alta' : margemRelativa >= 0.05 ? 'media' : 'baixa';

  let justificativa: string;
  if (recomendacao === 'Híbrido' && comparativo.economiaCaixaNoHibrido > 0) {
    justificativa =
      `O modelo Híbrido é mais barato em caixa (economia de ${brl(comparativo.economiaCaixaNoHibrido)} no mês) ` +
      `e ainda amplia o crédito repassado ao cliente PJ em ${brl(comparativo.ganhoDeCreditoNoHibrido)}. ` +
      'Decisão sem trade-off.';
  } else if (recomendacao === 'Híbrido') {
    justificativa =
      `O modelo Tradicional é ${brl(Math.abs(comparativo.economiaCaixaNoHibrido))} mais barato em caixa, ` +
      `mas o Híbrido transfere ${brl(comparativo.ganhoDeCreditoNoHibrido)} a mais de crédito. ` +
      `Com ${pct(fracaoB2B, 0)} da receita vendida a PJ, o ganho comercial supera o custo adicional.`;
  } else if (fracaoB2B >= 0.5) {
    justificativa =
      `Mesmo com ${pct(fracaoB2B, 0)} da receita em B2B, o custo adicional do Híbrido ` +
      `(${brl(Math.abs(comparativo.economiaCaixaNoHibrido))}) supera o ganho de crédito ponderado ` +
      `(${brl(pontoDeEquilibrioComercial)}). Manter o Tradicional e renegociar preço com os clientes PJ.`;
  } else {
    justificativa =
      `Perfil predominantemente B2C: o crédito repassado tem pouco valor econômico para o comprador final. ` +
      `Prevalece o menor custo em caixa — o Tradicional economiza ${brl(Math.abs(comparativo.economiaCaixaNoHibrido))} no mês.`;
  }

  // ---------- Alerta de risco comercial (diretriz B2B) ----------
  if (fracaoB2B >= 0.5 && recomendacao === 'Tradicional') {
    alertas.push({
      severidade: 'risco',
      titulo: 'Risco comercial na cadeia B2B',
      detalhe:
        'O Cenário Tradicional é mais barato, mas o cliente é B2B: ele repassará crédito limitado ao IBS/CBS ' +
        'embutido no DAS. Avaliar o impacto junto a clientes industriais e varejistas antes de fechar a decisão — ' +
        `o preço líquido para o comprador PJ fica ${brl((
          comparativo.precoLiquidoParaClientePJ.tradicional - comparativo.precoLiquidoParaClientePJ.hibrido
        ))} mais caro que no Híbrido.`,
      origem: 'Diretriz comercial B2B x B2C',
    });
  }

  if (fracaoB2B < 0.5 && recomendacao === 'Híbrido') {
    alertas.push({
      severidade: 'atencao',
      titulo: 'Híbrido recomendado em base B2C',
      detalhe:
        'A recomendação decorre de vantagem de caixa, não de crédito. Confirme a projeção de insumos: ' +
        'o modelo Híbrido depende do volume de compras com crédito para se sustentar.',
      origem: 'Diretriz comercial B2B x B2C',
    });
  }

  // ---------- Bloqueios cadastrais ----------
  if (cadastro.possuiDebitosEmAberto) {
    alertas.push({
      severidade: 'bloqueio',
      titulo: 'Débitos em aberto impedem a opção',
      detalhe:
        'A presença de débitos barra a confirmação ou alteração do regime na janela de setembro' +
        (cadastro.valorDebitos ? ` (${brl(cadastro.valorDebitos)} em aberto)` : '') +
        '. Regularizar ou parcelar até 30/06/2026 para não perder a janela.',
      origem: 'Auditoria cadastral — plano de ação do escritório',
    });
  }

  if (cadastro.possuiPendenciasCadastrais) {
    alertas.push({
      severidade: 'bloqueio',
      titulo: 'Pendências cadastrais em aberto',
      detalhe:
        'Divergências de endereço, CNAE ou quadro societário impedem o processamento da opção. ' +
        'Corrigir antes da abertura da janela.',
      origem: 'Auditoria cadastral — plano de ação do escritório',
    });
  }

  // ---------- Malha fina sistêmica: grupo econômico ----------
  const interligados = cadastro.cnpjsInterligados ?? [];
  if (interligados.length > 0) {
    const somaGrupo = interligados.reduce((acc, c) => acc + c.rbt12, 0) + entrada.rbt12;
    const severidade: Severidade = somaGrupo > LIMITE_SIMPLES ? 'risco' : 'atencao';
    alertas.push({
      severidade,
      titulo: 'Cruzamento de faturamento global do grupo',
      detalhe:
        `Somando ${interligados.length + 1} CNPJs com sócios em comum, o faturamento global chega a ` +
        `${brl(somaGrupo)}. ` +
        (somaGrupo > LIMITE_SIMPLES
          ? 'Acima do limite de R$ 4.800.000,00 — com a integração dos sistemas de União, Estados e Municípios, ' +
            'esse cruzamento roda automaticamente e pode gerar exclusão de ofício.'
          : 'Abaixo do limite, mas o cruzamento automático já está ativo: manter a documentação da independência ' +
            'operacional entre as empresas.'),
      origem: 'Malha fina sistêmica — cruzamento entre CNPJs interligados',
    });
  }

  // ---------- Limite e sublimite (com IBS na conta) ----------
  const limite = avaliarLimite(entrada.rbt12, ibsAcumulado12Meses);
  if (limite.situacao !== 'normal') {
    alertas.push({
      severidade: limite.situacao === 'limite-excedido' ? 'bloqueio' : 'risco',
      titulo: 'Limite/sublimite de faturamento',
      detalhe: limite.mensagem,
      origem: 'Composição de receitas — IBS integra a conta do sublimite',
    });
  }

  // ---------- Disponibilidade da opção no ano simulado ----------
  if (!parametrosAno.opcaoHibridaDisponivel) {
    alertas.push({
      severidade: 'informacao',
      titulo: `Modelo Híbrido ainda não vigente em ${parametrosAno.ano}`,
      detalhe:
        `${parametrosAno.observacao} O cenário Híbrido exibido é projeção para efeito de decisão, ` +
        'não valor a recolher no ano corrente.',
      origem: 'Cronograma de transição',
    });
  }

  if (hibrido.saldoCredorAcumulado > 0) {
    alertas.push({
      severidade: 'atencao',
      titulo: 'Saldo credor de IBS/CBS',
      detalhe:
        `Os créditos de insumos superam os débitos do mês em ${brl(hibrido.saldoCredorAcumulado)}. ` +
        'O saldo é transportado para a competência seguinte — considere o efeito no fluxo de caixa antes de ' +
        'tratar o Híbrido como economia imediata.',
      origem: 'Regime não cumulativo',
    });
  }

  // ---------- Agenda ----------
  const agenda = CALENDARIO.map((e) => avaliarEvento(e, referencia))
    .filter((s) => s.situacao === 'aberto' || (s.situacao === 'futuro' && s.diasRestantes <= 120))
    .sort((a, b) => a.evento.fim.localeCompare(b.evento.fim));

  const janelaAberta = agenda.find((s) => s.evento.categoria === 'janela-opcao' && s.situacao === 'aberto');
  if (janelaAberta) {
    alertas.push({
      severidade: 'risco',
      titulo: `Janela aberta — ${janelaAberta.diasRestantes} dia(s) restantes`,
      detalhe: `${janelaAberta.evento.titulo}. ${janelaAberta.evento.consequencia}`,
      origem: 'Calendário de janelas de opção',
    });
  }

  const ordem: Record<Severidade, number> = { bloqueio: 0, risco: 1, atencao: 2, informacao: 3 };
  alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);

  return {
    recomendacao,
    confianca,
    justificativa,
    pontoDeEquilibrioComercial,
    alertas,
    limite,
    agenda,
    possuiBloqueio: alertas.some((a) => a.severidade === 'bloqueio'),
  };
}
