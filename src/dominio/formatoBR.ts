/**
 * Formatação monetária para as mensagens geradas pelo domínio.
 *
 * O domínio produz texto que vai direto para a tela e para o relatório do cliente
 * (justificativas, alertas, memórias de cálculo). Esses valores precisam sair no
 * padrão brasileiro, então a formatação mora aqui — sem depender da camada de UI.
 */

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Ex.: 15415.58 → "R$ 15.415,58" */
export function brl(valor: number): string {
  return MOEDA.format(Number.isFinite(valor) ? valor : 0);
}

/** Ex.: 0.2812 → "28,12%" */
export function pct(fracao: number, casas = 2): string {
  return `${(fracao * 100).toFixed(casas).replace('.', ',')}%`;
}
