/**
 * Geração do relatório do cliente.
 *
 * Abre uma janela com o layout de impressão e dispara o diálogo do navegador —
 * o usuário escolhe "Salvar como PDF". Sem dependência externa e sem enviar
 * dado de cliente para fora da máquina.
 */

import type { Cliente } from '../app/tipos';
import type { Diagnostico } from '../dominio/diagnostico';
import type { ResultadoSimulacao } from '../dominio/motorSimulacao';
import { percentual, periodoBR, reais } from './formatacao';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function montarRelatorio(
  cliente: Cliente,
  resultado: ResultadoSimulacao,
  diagnostico: Diagnostico,
): string {
  const { tradicional, hibrido, comparativo, parametrosAno } = resultado;

  const alertas = diagnostico.alertas
    .map(
      (a) =>
        `<li class="alerta ${a.severidade}"><strong>${escapar(a.titulo)}</strong><br>${escapar(a.detalhe)}</li>`,
    )
    .join('');

  const agenda = diagnostico.agenda
    .map(
      (s) =>
        `<tr><td>${escapar(s.evento.titulo)}</td><td>${periodoBR(s.evento.inicio, s.evento.fim)}</td>` +
        `<td>${s.situacao === 'aberto' ? `Aberto — ${s.diasRestantes} dia(s)` : `Abre em ${s.diasRestantes} dia(s)`}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Diagnóstico tributário — ${escapar(cliente.nome)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #16202c; line-height: 1.55; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin-top: 26px; border-bottom: 1px solid #ccd4dd; padding-bottom: 5px; }
  .sub { color: #5b6876; font-size: 13px; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f4f6f9; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  .destaque { font-size: 19px; font-weight: bold; }
  .recomendacao { background: #eef4ff; border-left: 4px solid #2f5fd0; padding: 12px 14px; margin: 12px 0; }
  ul.alertas { list-style: none; padding: 0; font-size: 13px; }
  ul.alertas li { border-left: 3px solid #c9d2dc; padding: 7px 10px; margin-bottom: 7px; background: #fafbfc; }
  ul.alertas li.bloqueio { border-left-color: #b3261e; }
  ul.alertas li.risco { border-left-color: #c2810a; }
  .rodape { margin-top: 28px; font-size: 11px; color: #6b7785; border-top: 1px solid #ccd4dd; padding-top: 10px; }
</style>
</head>
<body>
  <h1>Diagnóstico de transição tributária</h1>
  <p class="sub">${escapar(cliente.nome)}${cliente.cnpj ? ` — CNPJ ${escapar(cliente.cnpj)}` : ''} · Ano-base da simulação: ${parametrosAno.ano}</p>

  <h2>1. Dados considerados</h2>
  <table>
    <tr><th>Anexo</th><td>${resultado.entrada.anexo}</td><th>Faixa</th><td>${resultado.faixa.faixa}</td></tr>
    <tr><th>RBT12</th><td>${reais(resultado.entrada.rbt12)}</td><th>Faturamento do mês</th><td>${reais(resultado.entrada.faturamentoMensal)}</td></tr>
    <tr><th>Insumos com crédito</th><td>${reais(resultado.entrada.insumosTributaveis)}</td><th>Perfil</th><td>${escapar(resultado.entrada.perfil)} (${percentual(resultado.entrada.percentualReceitaB2B ?? 0, 0)} a PJ)</td></tr>
    <tr><th>Alíquota efetiva do Simples</th><td>${percentual(resultado.aliquotaEfetivaSimples)}</td><th>IBS+CBS no regime regular</th><td>${percentual(resultado.aliquotaIbsCbs)}</td></tr>
  </table>

  <h2>2. Comparativo dos cenários</h2>
  <table>
    <thead><tr><th></th><th>Tradicional</th><th>Híbrido</th></tr></thead>
    <tbody>
      <tr><td>DAS</td><td>${reais(tradicional.das)}</td><td>${reais(hibrido.dasReduzido)}</td></tr>
      <tr><td>Guia de IBS/CBS</td><td>—</td><td>${reais(hibrido.guiaIbsCbs)}</td></tr>
      <tr><td><strong>Custo total do mês</strong></td><td class="destaque">${reais(tradicional.custoTotal)}</td><td class="destaque">${reais(hibrido.custoTotal)}</td></tr>
      <tr><td>Crédito repassado ao cliente PJ</td><td>${reais(tradicional.creditoTransferido)}<br><small>Limitado ao embutido no DAS</small></td><td>${reais(hibrido.creditoTransferido)}<br><small>Integral</small></td></tr>
      <tr><td>Preço líquido para o comprador PJ</td><td>${reais(comparativo.precoLiquidoParaClientePJ.tradicional)}</td><td>${reais(comparativo.precoLiquidoParaClientePJ.hibrido)}</td></tr>
    </tbody>
  </table>

  <h2>3. Recomendação</h2>
  <div class="recomendacao">
    <strong>Cenário recomendado: ${diagnostico.recomendacao}</strong> (confiança ${diagnostico.confianca})<br>
    ${escapar(diagnostico.justificativa)}
    ${
      diagnostico.pontoDeEquilibrioComercial > 0
        ? `<br><br><strong>Ponto de equilíbrio comercial:</strong> o modelo Híbrido comporta até ${reais(diagnostico.pontoDeEquilibrioComercial)} de custo adicional mensal e ainda compensa pelo crédito gerado ao comprador PJ.`
        : ''
    }
  </div>

  ${alertas ? `<h2>4. Pontos de atenção</h2><ul class="alertas">${alertas}</ul>` : ''}

  <h2>${alertas ? '5' : '4'}. Prazos a cumprir</h2>
  <table>
    <thead><tr><th>Evento</th><th>Período</th><th>Situação</th></tr></thead>
    <tbody>${agenda || '<tr><td colspan="3">Nenhum prazo no horizonte imediato.</td></tr>'}</tbody>
  </table>

  <div class="rodape">
    Documento gerado em ${new Date().toLocaleString('pt-BR')} pelo Simulador de Transição Tributária.
    Os valores são estimativas baseadas nos parâmetros informados e nas alíquotas de referência do cronograma
    de transição, sujeitas a alteração por regulamentação superveniente. Este material apoia a decisão e não
    substitui a análise do responsável técnico.
  </div>
</body>
</html>`;
}

export function exportarRelatorio(
  cliente: Cliente,
  resultado: ResultadoSimulacao,
  diagnostico: Diagnostico,
): void {
  const html = montarRelatorio(cliente, resultado, diagnostico);
  const janela = window.open('', '_blank');
  if (!janela) {
    alert('O navegador bloqueou a abertura da janela. Libere os pop-ups para gerar o relatório.');
    return;
  }
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  setTimeout(() => janela.print(), 300);
}
