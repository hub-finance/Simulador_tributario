/**
 * Persistência local e importação de carteira.
 *
 * A versão atual guarda tudo no navegador (localStorage). O schema relacional de
 * destino está em `db/schema.sql` — quando houver backend, este módulo vira o
 * cliente HTTP e o resto da aplicação não muda.
 */

import { clienteVazio, type Cliente } from './tipos';
import type { NumeroAnexo } from '../dominio/tabelasSimples';
import type { PerfilCliente } from '../dominio/motorSimulacao';

const CHAVE = 'simulador-tributario:carteira:v1';

export function carregarCarteira(): Cliente[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return CARTEIRA_EXEMPLO;
    const dados = JSON.parse(bruto) as Cliente[];
    return Array.isArray(dados) && dados.length > 0 ? dados.map(normalizar) : CARTEIRA_EXEMPLO;
  } catch {
    return CARTEIRA_EXEMPLO;
  }
}

export function salvarCarteira(clientes: Cliente[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(clientes));
  } catch {
    // Cota estourada ou modo privativo: a sessão segue em memória.
  }
}

/** Preenche campos ausentes ao ler dados gravados por versões anteriores. */
function normalizar(c: Partial<Cliente>): Cliente {
  return { ...clienteVazio(c.id ?? criarId()), ...c } as Cliente;
}

export function criarId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Cópia de segurança completa
// ---------------------------------------------------------------------------

/**
 * A carteira inteira, com tudo: decisões registradas, débitos, pendências
 * cadastrais, sócios e vínculos de grupo econômico.
 *
 * O CSV existe para conversar com o sistema contábil e carrega só os números da
 * simulação. Ele não serve como cópia de segurança — reimportar um CSV traz os
 * clientes de volta sem as decisões, que é justamente o registro que prova o que
 * foi orientado, por quem e quando. Para levar a carteira de uma máquina a outra,
 * ou para guardar cópia, use este formato.
 */
export interface Backup {
  formato: 'simulador-tributario/carteira';
  versao: 1;
  geradoEm: string;
  clientes: Cliente[];
}

export function exportarBackup(clientes: Cliente[]): string {
  const backup: Backup = {
    formato: 'simulador-tributario/carteira',
    versao: 1,
    geradoEm: new Date().toISOString(),
    clientes,
  };
  return JSON.stringify(backup, null, 2);
}

export function importarBackup(conteudo: string): ResultadoImportacao {
  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    return { clientes: [], importados: 0, erros: ['Arquivo de cópia de segurança ilegível.'] };
  }

  if (typeof dados !== 'object' || dados === null) {
    return { clientes: [], importados: 0, erros: ['Arquivo não é uma cópia de segurança da carteira.'] };
  }

  const b = dados as Partial<Backup>;
  if (b.formato !== 'simulador-tributario/carteira' || !Array.isArray(b.clientes)) {
    return { clientes: [], importados: 0, erros: ['Arquivo não é uma cópia de segurança da carteira.'] };
  }

  const erros: string[] = [];
  // Ids novos evitam colidir com clientes já presentes na máquina de destino.
  const clientes = b.clientes.map((c) => normalizar({ ...c, id: criarId() }));

  const decisoes = clientes.filter((c) => c.decisao !== null).length;
  if (decisoes > 0) erros.push(`${decisoes} decisão(ões) registrada(s) vieram junto.`);

  return { clientes, importados: clientes.length, erros };
}

/** Reconhece o formato pelo conteúdo, para o usuário não precisar escolher. */
export function importarArquivo(conteudo: string): ResultadoImportacao & { formato: 'backup' | 'csv' } {
  const inicio = conteudo.trimStart();
  return inicio.startsWith('{')
    ? { ...importarBackup(conteudo), formato: 'backup' }
    : { ...importarCsv(conteudo), formato: 'csv' };
}

// ---------------------------------------------------------------------------
// Importação CSV (layout de exportação do sistema contábil)
// ---------------------------------------------------------------------------

export interface ResultadoImportacao {
  clientes: Cliente[];
  importados: number;
  erros: string[];
}

export const CABECALHO_CSV =
  'nome;cnpj;cnae;anexo;perfil;percentual_b2b;rbt12;faturamento_mensal;insumos;folha_12m';

function numero(valor: string | undefined): number {
  if (!valor) return 0;
  // Aceita tanto 1.234,56 (pt-BR) quanto 1234.56.
  const limpo = valor.trim().replace(/\s/g, '');
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

function perfilValido(valor: string | undefined): PerfilCliente {
  const v = (valor ?? '').trim().toUpperCase();
  return v === 'B2B' || v === 'B2C' || v === 'MISTO' ? v : 'B2C';
}

function anexoValido(valor: string | undefined): NumeroAnexo {
  const n = Math.trunc(numero(valor));
  return (n >= 1 && n <= 5 ? n : 1) as NumeroAnexo;
}

/**
 * Lê um CSV separado por ponto e vírgula. A primeira linha é tratada como cabeçalho
 * quando começa por "nome".
 */
export function importarCsv(conteudo: string): ResultadoImportacao {
  const erros: string[] = [];
  const clientes: Cliente[] = [];

  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (linhas.length === 0) {
    return { clientes, importados: 0, erros: ['Arquivo vazio.'] };
  }

  const inicio = linhas[0].toLowerCase().startsWith('nome') ? 1 : 0;

  for (let i = inicio; i < linhas.length; i++) {
    const campos = linhas[i].split(';');
    const nome = campos[0]?.trim();
    if (!nome) {
      erros.push(`Linha ${i + 1}: nome ausente — registro ignorado.`);
      continue;
    }

    const base = clienteVazio(criarId());
    const perfil = perfilValido(campos[4]);
    const percentualInformado = campos[5]?.trim();

    const cliente: Cliente = {
      ...base,
      nome,
      cnpj: campos[1]?.trim() ?? '',
      cnae: campos[2]?.trim() ?? '',
      anexo: anexoValido(campos[3]),
      perfil,
      percentualReceitaB2B: percentualInformado
        ? Math.min(1, Math.max(0, numero(percentualInformado) > 1 ? numero(percentualInformado) / 100 : numero(percentualInformado)))
        : perfil === 'B2B'
          ? 1
          : perfil === 'MISTO'
            ? 0.5
            : 0,
      rbt12: numero(campos[6]),
      faturamentoMensal: numero(campos[7]),
      insumosTributaveis: numero(campos[8]),
      folha12Meses: numero(campos[9]),
    };

    if (cliente.rbt12 <= 0) {
      erros.push(`Linha ${i + 1} (${nome}): RBT12 zerado — a simulação usará a alíquota nominal da 1ª faixa.`);
    }

    clientes.push(cliente);
  }

  return { clientes, importados: clientes.length, erros };
}

/**
 * Layout de troca com o sistema contábil. Leva só os campos que alimentam a
 * simulação — para cópia de segurança use `exportarBackup`.
 */
export function exportarCsv(clientes: Cliente[]): string {
  const linhas = clientes.map((c) =>
    [
      c.nome,
      c.cnpj,
      c.cnae,
      c.anexo,
      c.perfil,
      (c.percentualReceitaB2B * 100).toFixed(0),
      c.rbt12.toFixed(2),
      c.faturamentoMensal.toFixed(2),
      c.insumosTributaveis.toFixed(2),
      c.folha12Meses.toFixed(2),
    ].join(';'),
  );
  return [CABECALHO_CSV, ...linhas].join('\n');
}

// ---------------------------------------------------------------------------
// Carteira de demonstração — três perfis que cobrem as decisões típicas
// ---------------------------------------------------------------------------

export const CARTEIRA_EXEMPLO: Cliente[] = [
  {
    ...clienteVazio('exemplo-industria-b2b'),
    nome: 'Metalúrgica Aurora Ltda',
    cnpj: '12.345.678/0001-90',
    cnae: '2599-3/99',
    anexo: 2,
    perfil: 'B2B',
    percentualReceitaB2B: 1,
    rbt12: 2_400_000,
    faturamentoMensal: 210_000,
    insumosTributaveis: 96_000,
    folha12Meses: 420_000,
  },
  {
    ...clienteVazio('exemplo-varejo-b2c'),
    nome: 'Mercado Bom Preço ME',
    cnpj: '98.765.432/0001-10',
    cnae: '4711-3/02',
    anexo: 1,
    perfil: 'B2C',
    percentualReceitaB2B: 0,
    rbt12: 1_150_000,
    faturamentoMensal: 98_000,
    insumosTributaveis: 61_000,
    folha12Meses: 180_000,
  },
  {
    ...clienteVazio('exemplo-servicos-misto'),
    nome: 'Consultoria Vertice SS',
    cnpj: '45.678.912/0001-33',
    cnae: '7020-4/00',
    anexo: 5,
    perfil: 'MISTO',
    percentualReceitaB2B: 0.7,
    rbt12: 860_000,
    faturamentoMensal: 74_000,
    insumosTributaveis: 8_500,
    folha12Meses: 196_000,
    sujeitoAoFatorR: true,
    possuiDebitosEmAberto: true,
    valorDebitos: 18_400,
  },
];
