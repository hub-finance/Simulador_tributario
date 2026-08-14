/**
 * Relatório individual — o documento que vai para a reunião com o cliente já
 * atendido pelo escritório. Mostra a conta, a recomendação e os prazos.
 */

import type { Diagnostico } from '../dominio/diagnostico';
import { brl, pct } from '../dominio/formatoBR';
import type { ResultadoSimulacao } from '../dominio/motorSimulacao';
import { comoNomeDeArquivo, escapar, montarDocumento, rodape, type Documento } from './documento';

export interface DadosRelatorioCliente {
  nome: string;
  cnpj: string;
  simulacao: ResultadoSimulacao;
  diagnostico: Diagnostico;
}

function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function relatorioCliente({ nome, cnpj, simulacao, diagnostico }: DadosRelatorioCliente): Documento {
  const { tradicional, hibrido, comparativo, parametrosAno, entrada, faixa } = simulacao;

  const alertas = diagnostico.alertas
    .filter((a) => a.severidade !== 'informacao')
    .map((a) => `<li class="${a.severidade}"><strong>${escapar(a.titulo)}</strong><br>${escapar(a.detalhe)}</li>`)
    .join('');

  const agenda = diagnostico.agenda
    .map(
      (s) =>
        `<tr><td>${escapar(s.evento.titulo)}</td>` +
        `<td>${dataBR(s.evento.inicio)} a ${dataBR(s.evento.fim)}</td>` +
        `<td>${s.situacao === 'aberto' ? `Aberto — ${s.diasRestantes} dia(s)` : `Abre em ${s.diasRestantes} dia(s)`}</td></tr>`,
    )
    .join('');

  const tomPainel =
    diagnostico.possuiBloqueio ? 'painel--perigo' : diagnostico.confianca === 'alta' ? 'painel--ok' : 'painel--alerta';

  const corpo = `
  <div class="marca">Hub de Gestão · Diagnóstico tributário</div>
  <h1>Transição para o novo modelo: qual caminho seguir</h1>
  <p class="sub">${escapar(nome)}${cnpj ? ` — CNPJ ${escapar(cnpj)}` : ''}</p>
  <p class="sub">Simulação para o ano-calendário ${parametrosAno.ano} · Anexo ${entrada.anexo}, faixa ${faixa.faixa}</p>

  <h2>A decisão em uma frase</h2>
  <div class="painel ${tomPainel}">
    <strong style="font-size:17px">Recomendação: modelo ${escapar(diagnostico.recomendacao)}</strong>
    <p style="margin:8px 0 0">${escapar(diagnostico.justificativa)}</p>
    ${
      diagnostico.pontoDeEquilibrioComercial > 0
        ? `<p style="margin:8px 0 0"><strong>Margem de manobra:</strong> o modelo Híbrido comporta até
           ${brl(diagnostico.pontoDeEquilibrioComercial)} de custo adicional por mês e ainda compensa, pelo
           crédito a mais que seus clientes pessoa jurídica passam a aproveitar.</p>`
        : ''
    }
  </div>

  <h2>Os dois cenários, lado a lado</h2>
  <table>
    <thead>
      <tr>
        <th></th>
        <th class="num">Tradicional<br><span style="font-weight:normal;text-transform:none">tudo no DAS</span></th>
        <th class="num">Híbrido<br><span style="font-weight:normal;text-transform:none">IBS/CBS por fora</span></th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Guia do Simples (DAS)</td><td class="num">${brl(tradicional.das)}</td><td class="num">${brl(hibrido.dasReduzido)}</td></tr>
      <tr><td>Guia de IBS/CBS</td><td class="num">—</td><td class="num">${brl(hibrido.guiaIbsCbs)}</td></tr>
      <tr><td><strong>Custo total no mês</strong></td>
          <td class="num destaque">${brl(tradicional.custoTotal)}</td>
          <td class="num destaque">${brl(hibrido.custoTotal)}</td></tr>
      <tr><td>Crédito que seu cliente PJ aproveita</td>
          <td class="num">${brl(tradicional.creditoTransferido)}<br><small>limitado</small></td>
          <td class="num">${brl(hibrido.creditoTransferido)}<br><small>integral</small></td></tr>
      <tr><td>Preço final efetivo para o comprador PJ</td>
          <td class="num">${brl(comparativo.precoLiquidoParaClientePJ.tradicional)}</td>
          <td class="num">${brl(comparativo.precoLiquidoParaClientePJ.hibrido)}</td></tr>
    </tbody>
  </table>

  <p>
    Considerando um faturamento mensal de ${brl(entrada.faturamentoMensal)} e
    ${brl(entrada.insumosTributaveis)} em compras e insumos que geram crédito, com
    ${pct(entrada.percentualReceitaB2B ?? 0, 0)} da receita vendida a outras empresas.
    A alíquota efetiva do Simples é de ${pct(simulacao.aliquotaEfetivaSimples)} e a de IBS+CBS no regime
    regular, de ${pct(simulacao.aliquotaIbsCbs)}.
  </p>

  <h2>Por que o crédito muda o jogo</h2>
  <p>
    No modelo Tradicional a guia é única e mais simples, mas quem compra de você só consegue aproveitar
    o crédito de IBS e CBS até o limite do que estiver embutido nessa guia. No modelo Híbrido a empresa
    permanece no Simples Nacional — IRPJ, CSLL e INSS patronal continuam no DAS, que fica mais barato —
    e o IBS e a CBS passam a ser apurados pelo regime regular, o que permite destacar o crédito integral
    na nota fiscal.
  </p>
  <p>
    Para quem vende ao consumidor final isso é indiferente: o comprador não aproveita crédito. Para quem
    vende ou presta serviço a outras empresas, é o que decide se você continua competitivo diante de
    indústrias e grandes varejistas.
  </p>

  ${alertas ? `<h2>Pontos de atenção</h2><ul class="limpa">${alertas}</ul>` : ''}

  <h2>Prazos que não podem passar</h2>
  <table>
    <thead><tr><th>Etapa</th><th>Período</th><th>Situação</th></tr></thead>
    <tbody>${agenda || '<tr><td colspan="3">Nenhum prazo no horizonte imediato.</td></tr>'}</tbody>
  </table>
  <p>
    A opção feita na janela de setembro de 2026 vale para o primeiro semestre de 2027 e pode ser cancelada
    até 30 de novembro de 2026. Depois dessa data ela se torna irretratável para o período.
  </p>

  ${rodape()}`;

  return montarDocumento(
    `Diagnóstico tributário — ${nome}`,
    `diagnostico-${comoNomeDeArquivo(nome)}-${parametrosAno.ano}`,
    corpo,
  );
}
