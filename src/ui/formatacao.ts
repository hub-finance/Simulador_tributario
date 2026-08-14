const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACTO = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function reais(valor: number): string {
  return MOEDA.format(Number.isFinite(valor) ? valor : 0);
}

export function reaisCompacto(valor: number): string {
  return COMPACTO.format(Number.isFinite(valor) ? valor : 0);
}

export function percentual(fracao: number, casas = 2): string {
  return `${(fracao * 100).toFixed(casas).replace('.', ',')}%`;
}

export function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function periodoBR(inicio: string, fim: string): string {
  return inicio === fim ? dataBR(fim) : `${dataBR(inicio)} a ${dataBR(fim)}`;
}

export function isoDeHoje(referencia = new Date()): string {
  return referencia.toISOString().slice(0, 10);
}
