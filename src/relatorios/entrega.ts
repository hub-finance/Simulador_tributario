/**
 * Saída dos relatórios: imprimir (o navegador salva em PDF) ou baixar o arquivo.
 *
 * O arquivo baixado é HTML autocontido — abre em qualquer navegador, offline, e pode
 * ser anexado a e-mail ou enviado por mensagem. Quem receber consegue gerar o PDF
 * pelo próprio navegador, sem precisar de nada instalado.
 */

import { entregarArquivo, type ResultadoDownload } from '../app/download';
import type { Documento } from './documento';

export type ResultadoEntrega =
  | { estado: 'aberto' }
  | { estado: 'salvo'; nomeArquivo: string }
  | { estado: 'recusado' }
  | { estado: 'falhou'; motivo: string };

/** Abre o documento em uma nova aba e dispara o diálogo de impressão. */
export function imprimir(documento: Documento): ResultadoEntrega {
  const janela = window.open('', '_blank');
  if (!janela) {
    return {
      estado: 'falhou',
      motivo: 'o navegador bloqueou a abertura da janela — libere os pop-ups para este endereço',
    };
  }
  janela.document.write(documento.html);
  janela.document.close();
  janela.focus();
  // Pequena espera para o layout assentar antes de o diálogo capturar a página.
  setTimeout(() => janela.print(), 300);
  return { estado: 'aberto' };
}

/** Abre o documento em uma nova aba, sem imprimir — para conferir antes de enviar. */
export function visualizar(documento: Documento): ResultadoEntrega {
  const janela = window.open('', '_blank');
  if (!janela) {
    return {
      estado: 'falhou',
      motivo: 'o navegador bloqueou a abertura da janela — libere os pop-ups para este endereço',
    };
  }
  janela.document.write(documento.html);
  janela.document.close();
  janela.focus();
  return { estado: 'aberto' };
}

/** Baixa o documento como arquivo HTML autocontido. */
export async function baixar(documento: Documento): Promise<ResultadoEntrega> {
  const resultado: ResultadoDownload = await entregarArquivo(
    `${documento.nomeArquivo}.html`,
    documento.html,
    'text/html',
  );
  return resultado.estado === 'salvo'
    ? { estado: 'salvo', nomeArquivo: resultado.nomeArquivo }
    : resultado.estado === 'recusado'
      ? { estado: 'recusado' }
      : { estado: 'falhou', motivo: resultado.motivo };
}

export function descreverEntrega(resultado: ResultadoEntrega): string {
  switch (resultado.estado) {
    case 'aberto':
      return 'Relatório aberto em nova aba.';
    case 'salvo':
      return `Relatório salvo em ${resultado.nomeArquivo}.`;
    case 'recusado':
      return 'Download cancelado.';
    case 'falhou':
      return `Não foi possível gerar o relatório: ${resultado.motivo}.`;
  }
}
