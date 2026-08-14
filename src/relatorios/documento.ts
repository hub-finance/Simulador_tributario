/**
 * Esqueleto comum dos relatórios.
 *
 * Os documentos saem prontos para duas saídas: impressão (o navegador salva em PDF)
 * e arquivo HTML autocontido, que pode ser anexado a e-mail ou aberto do WhatsApp.
 * Por isso o estilo é embutido e não há dependência externa — o arquivo abre em
 * qualquer máquina, offline.
 */

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ESTILO = `
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #16202c; line-height: 1.55; max-width: 760px;
    margin: 0 auto; padding: 24px; background: #fff;
  }
  .marca {
    font-family: Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase; color: #2f5fd0; margin-bottom: 6px;
  }
  h1 { font-size: 23px; margin: 0 0 4px; line-height: 1.2; }
  h2 {
    font-family: Helvetica, Arial, sans-serif; font-size: 13px; text-transform: uppercase;
    letter-spacing: .06em; color: #2f5fd0; margin: 30px 0 10px;
    border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;
  }
  h3 { font-size: 15px; margin: 18px 0 6px; }
  .sub { color: #5b6876; font-size: 13px; margin: 0 0 4px; }
  p { margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
  th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th {
    background: #f4f6f9; font-family: Helvetica, Arial, sans-serif; font-size: 10.5px;
    text-transform: uppercase; letter-spacing: .05em; color: #5b6876;
  }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .destaque { font-size: 18px; font-weight: bold; }
  .painel {
    background: #eef3ff; border-left: 4px solid #2f5fd0;
    padding: 14px 16px; margin: 14px 0; border-radius: 0 6px 6px 0;
  }
  .painel--alerta { background: #fdf5e3; border-left-color: #b07208; }
  .painel--perigo { background: #fdeceb; border-left-color: #b3261e; }
  .painel--ok { background: #e8f6ee; border-left-color: #1a7f4b; }
  .cartoes { display: flex; gap: 14px; margin: 12px 0; }
  .cartao-num {
    flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;
  }
  .cartao-num span {
    display: block; font-family: Helvetica, Arial, sans-serif; font-size: 10.5px;
    text-transform: uppercase; letter-spacing: .05em; color: #5b6876; margin-bottom: 4px;
  }
  .cartao-num strong { font-size: 19px; font-variant-numeric: tabular-nums; }
  ul.limpa { list-style: none; padding: 0; font-size: 13px; margin: 10px 0; }
  ul.limpa li {
    border-left: 3px solid #c9d2dc; padding: 8px 11px; margin-bottom: 7px; background: #fafbfc;
  }
  ul.limpa li.bloqueio { border-left-color: #b3261e; background: #fdeceb; }
  ul.limpa li.risco { border-left-color: #b07208; background: #fdf5e3; }
  .etiqueta {
    display: inline-block; font-family: Helvetica, Arial, sans-serif; font-size: 10px;
    font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    padding: 2px 7px; border-radius: 99px; background: #eef3ff; color: #2f5fd0;
  }
  .rodape {
    margin-top: 32px; font-size: 10.5px; color: #6b7785;
    border-top: 1px solid #ccd4dd; padding-top: 10px;
  }
  @media print { body { padding: 0; } h2 { break-after: avoid; } table { break-inside: auto; } tr { break-inside: avoid; } }
`;

export interface Documento {
  /** Nome sugerido do arquivo, sem extensão. */
  nomeArquivo: string;
  titulo: string;
  html: string;
}

export function montarDocumento(titulo: string, nomeArquivo: string, corpo: string): Documento {
  return {
    nomeArquivo,
    titulo,
    html: `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<style>${ESTILO}</style>
</head>
<body>
${corpo}
</body>
</html>`,
  };
}

export function rodape(complemento = ''): string {
  return `<div class="rodape">
    Documento gerado em ${new Date().toLocaleString('pt-BR')} pelo Simulador de Transição Tributária.
    ${complemento}
    Os valores são estimativas baseadas nos parâmetros informados e nas alíquotas de referência do cronograma
    de transição, sujeitas a alteração por regulamentação superveniente. Este material apoia a decisão e não
    substitui a análise do responsável técnico.
  </div>`;
}

/** Sanitiza um texto livre para uso em nome de arquivo. */
export function comoNomeDeArquivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
}
