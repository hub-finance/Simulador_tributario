import type { PerfilCliente } from '../dominio/motorSimulacao';
import type { NumeroAnexo } from '../dominio/tabelasSimples';

export interface CnpjInterligado {
  cnpj: string;
  nome: string;
  rbt12: number;
}

export interface DecisaoRegistrada {
  cenario: 'Tradicional' | 'Híbrido';
  /** Janela em que a decisão foi formalizada. */
  janela: 'Setembro/2026' | 'Março/2027';
  registradaEm: string;
  responsavel: string;
  observacao: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  cnae: string;
  anexo: NumeroAnexo;
  perfil: PerfilCliente;
  /** 0 a 1. Fração da receita vendida a pessoas jurídicas. */
  percentualReceitaB2B: number;

  rbt12: number;
  faturamentoMensal: number;
  insumosTributaveis: number;
  folha12Meses: number;
  sujeitoAoFatorR: boolean;
  saldoCredorAnterior: number;
  ibsAcumulado12Meses: number;

  possuiDebitosEmAberto: boolean;
  valorDebitos: number;
  possuiPendenciasCadastrais: boolean;
  cnpjsInterligados: CnpjInterligado[];

  decisao: DecisaoRegistrada | null;
  atualizadoEm: string;
}

export type StatusAnalise = 'pendente' | 'concluida';

export function statusDoCliente(cliente: Cliente): StatusAnalise {
  return cliente.decisao ? 'concluida' : 'pendente';
}

export function clienteVazio(id: string): Cliente {
  return {
    id,
    nome: 'Novo cliente',
    cnpj: '',
    cnae: '',
    anexo: 1,
    perfil: 'B2C',
    percentualReceitaB2B: 0,
    rbt12: 0,
    faturamentoMensal: 0,
    insumosTributaveis: 0,
    folha12Meses: 0,
    sujeitoAoFatorR: false,
    saldoCredorAnterior: 0,
    ibsAcumulado12Meses: 0,
    possuiDebitosEmAberto: false,
    valorDebitos: 0,
    possuiPendenciasCadastrais: false,
    cnpjsInterligados: [],
    decisao: null,
    atualizadoEm: new Date().toISOString(),
  };
}

export function fracaoB2BDoPerfil(perfil: PerfilCliente): number {
  return perfil === 'B2B' ? 1 : perfil === 'B2C' ? 0 : 0.5;
}
