/**
 * Entrega de arquivo ao usuário, funcionando nos dois ambientes de execução.
 *
 * Hospedado normalmente (Netlify, servidor de arquivos, `file://`), o download é
 * feito por âncora com blob. Publicado como página no visualizador da claude.ai,
 * âncoras de download são inertes: lá a entrega passa pela capacidade `downloads`,
 * que mostra uma confirmação ao usuário e pode ser recusada.
 */

interface NamespaceDownloads {
  save(req: { filename: string; data: string | Blob | ArrayBuffer }): Promise<{ status: 'saved' }>;
}

interface RuntimeClaude {
  use(nome: 'downloads'): Promise<NamespaceDownloads | null>;
}

function runtime(): RuntimeClaude | null {
  const c = (globalThis as { claude?: RuntimeClaude }).claude;
  return c && typeof c.use === 'function' ? c : null;
}

export type ResultadoDownload =
  | { estado: 'salvo'; nomeArquivo: string }
  | { estado: 'recusado' }
  | { estado: 'falhou'; motivo: string };

function baixarPorAncora(nomeArquivo: string, conteudo: string, mime: string): ResultadoDownload {
  try {
    const url = URL.createObjectURL(new Blob([conteudo], { type: `${mime};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { estado: 'salvo', nomeArquivo };
  } catch (erro) {
    return { estado: 'falhou', motivo: erro instanceof Error ? erro.message : String(erro) };
  }
}

function codigoDoErro(erro: unknown): string {
  return typeof erro === 'object' && erro !== null && 'code' in erro ? String((erro as { code: unknown }).code) : '';
}

/**
 * Entrega um arquivo de texto. Quando a capacidade `downloads` está disponível mas
 * recusa a extensão (o CSV está no conjunto estendido, nem sempre habilitado), refaz
 * a oferta com a mesma carga em `.txt` — o conteúdo é idêntico e abre no Excel.
 */
export async function entregarArquivo(
  nomeArquivo: string,
  conteudo: string,
  mime = 'text/plain',
): Promise<ResultadoDownload> {
  const c = runtime();
  if (!c) return baixarPorAncora(nomeArquivo, conteudo, mime);

  const downloads = await c.use('downloads').catch(() => null);
  if (!downloads) return baixarPorAncora(nomeArquivo, conteudo, mime);

  try {
    await downloads.save({ filename: nomeArquivo, data: conteudo });
    return { estado: 'salvo', nomeArquivo };
  } catch (erro) {
    const codigo = codigoDoErro(erro);

    if (codigo === 'declined') return { estado: 'recusado' };

    if (codigo === 'extension_not_enabled' || codigo === 'rejected_extension') {
      const alternativo = nomeArquivo.replace(/\.[^.]+$/, '') + '.txt';
      try {
        await downloads.save({ filename: alternativo, data: conteudo });
        return { estado: 'salvo', nomeArquivo: alternativo };
      } catch (erroAlternativo) {
        if (codigoDoErro(erroAlternativo) === 'declined') return { estado: 'recusado' };
        return { estado: 'falhou', motivo: codigoDoErro(erroAlternativo) || 'não foi possível salvar' };
      }
    }

    if (codigo === 'rate_limited') {
      return { estado: 'falhou', motivo: 'já existe uma confirmação de download aberta; tente de novo em instantes' };
    }

    return { estado: 'falhou', motivo: codigo || 'não foi possível salvar' };
  }
}
