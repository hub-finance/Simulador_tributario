/**
 * Relatório consolidado da carteira — documento de reunião interna.
 *
 * Responde as perguntas que a supervisão faz: quantos clientes já decidiram, onde
 * está o risco de perder contrato, quem está travado por pendência cadastral e
 * quanto imposto está em jogo no total.
 */

import { brl } from '../dominio/formatoBR';
import { resumirCarteira, type LinhaCarteira } from '../dominio/segmentacao';
import type { StatusEvento } from '../dominio/calendario';
import { comoNomeDeArquivo, escapar, montarDocumento, rodape, type Documento } from './documento';

function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function relatorioCarteira(
  linhas: LinhaCarteira[],
  ano: number,
  agenda: StatusEvento[],
): Documento {
  const resumo = resumirCarteira(linhas);
  const pendentes = resumo.total - resumo.decididos;

  const blocosPorGrupo = resumo.porGrupo
    .filter((g) => g.quantidade > 0)
    .map((g) => {
      const linhasTabela = g.linhas
        .map(
          (l) =>
            `<tr>
              <td>${escapar(l.nome)}${l.decidido ? ' <span class="etiqueta">decidido</span>' : ''}</td>
              <td>${escapar(l.diagnostico.recomendacao)}</td>
              <td class="num">${brl(l.simulacao.tradicional.custoTotal)}</td>
              <td class="num">${brl(l.simulacao.hibrido.custoTotal)}</td>
              <td class="num">${brl(l.simulacao.comparativo.ganhoDeCreditoNoHibrido)}</td>
            </tr>`,
        )
        .join('');

      return `
      <h3>${g.grupo.prioridade}. ${escapar(g.grupo.rotulo)} — ${g.quantidade} cliente(s)</h3>
      <p class="sub">${escapar(g.grupo.descricao)}</p>
      <div class="painel">${escapar(g.grupo.encaminhamento)}</div>
      <table>
        <thead>
          <tr>
            <th>Cliente</th><th>Recomendação</th>
            <th class="num">Tradicional</th><th class="num">Híbrido</th><th class="num">Ganho de crédito</th>
          </tr>
        </thead>
        <tbody>${linhasTabela}</tbody>
      </table>`;
    })
    .join('');

  const bloqueados = linhas.filter((l) => l.diagnostico.possuiBloqueio);
  const listaBloqueios = bloqueados
    .map((l) => {
      const motivos = l.diagnostico.alertas
        .filter((a) => a.severidade === 'bloqueio')
        .map((a) => escapar(a.titulo))
        .join('; ');
      return `<li class="bloqueio"><strong>${escapar(l.nome)}</strong><br>${motivos}</li>`;
    })
    .join('');

  const proximosPrazos = agenda
    .map(
      (s) =>
        `<tr><td>${escapar(s.evento.titulo)}</td>` +
        `<td>${dataBR(s.evento.inicio)} a ${dataBR(s.evento.fim)}</td>` +
        `<td>${s.situacao === 'aberto' ? `Aberto — ${s.diasRestantes} dia(s)` : `Abre em ${s.diasRestantes} dia(s)`}</td>` +
        `<td>${escapar(s.evento.responsavel)}</td></tr>`,
    )
    .join('');

  const corpo = `
  <div class="marca">Hub de Gestão · Reunião de supervisão</div>
  <h1>Carteira na transição tributária: onde estamos</h1>
  <p class="sub">Posição em ${new Date().toLocaleDateString('pt-BR')} · simulações no ano-calendário ${ano}</p>

  <h2>Números da carteira</h2>
  <div class="cartoes">
    <div class="cartao-num"><span>Clientes</span><strong>${resumo.total}</strong></div>
    <div class="cartao-num"><span>Cenário definido</span><strong>${resumo.decididos}</strong></div>
    <div class="cartao-num"><span>Pendentes</span><strong>${pendentes}</strong></div>
    <div class="cartao-num"><span>Com bloqueio</span><strong>${resumo.comBloqueio}</strong></div>
  </div>
  <div class="cartoes">
    <div class="cartao-num"><span>Total mensal — Tradicional</span><strong>${brl(resumo.totalTradicional)}</strong></div>
    <div class="cartao-num"><span>Total mensal — Híbrido</span><strong>${brl(resumo.totalHibrido)}</strong></div>
    <div class="cartao-num"><span>Crédito adicional em jogo</span><strong>${brl(resumo.totalGanhoDeCredito)}</strong></div>
  </div>
  <p>
    O "crédito adicional em jogo" é quanto a carteira deixaria de repassar aos compradores pessoa jurídica
    se todos permanecessem no modelo Tradicional. É a medida do risco comercial agregado.
  </p>

  ${
    bloqueados.length > 0
      ? `<h2>Bloqueios a resolver antes da janela</h2>
         <p>Débito ou pendência cadastral impede a confirmação da opção. Estes clientes perdem a janela
         inteira se não forem regularizados.</p>
         <ul class="limpa">${listaBloqueios}</ul>`
      : `<h2>Bloqueios</h2>
         <div class="painel painel--ok">Nenhum cliente da carteira está travado por débito ou pendência cadastral.</div>`
  }

  <h2>Segmentação e ordem de ataque</h2>
  <p>
    Os grupos estão em ordem de prioridade. O grupo 1 concentra o risco de perder cliente e é onde o
    escritório agrega mais valor — deve ser atacado primeiro. O grupo 4 resolve-se por comunicado.
  </p>
  ${blocosPorGrupo || '<p>Nenhum cliente na carteira.</p>'}

  <h2>Calendário imediato</h2>
  <table>
    <thead><tr><th>Etapa</th><th>Período</th><th>Situação</th><th>Responsável</th></tr></thead>
    <tbody>${proximosPrazos || '<tr><td colspan="4">Nenhum prazo no horizonte imediato.</td></tr>'}</tbody>
  </table>

  ${rodape('Documento de circulação interna. ')}`;

  return montarDocumento(
    'Carteira na transição tributária',
    `carteira-${comoNomeDeArquivo(String(ano))}-${new Date().toISOString().slice(0, 10)}`,
    corpo,
  );
}
