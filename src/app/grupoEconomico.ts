/**
 * Detecção de grupo econômico por sócio em comum.
 *
 * A malha fina passou a cruzar automaticamente o faturamento global entre CNPJs
 * com sócios em comum. Como a consulta ao CNPJ traz o quadro societário, dá para
 * fazer esse mesmo cruzamento dentro da carteira antes que a fiscalização faça —
 * usando só dados já carregados, sem consulta adicional.
 */

import type { Cliente, CnpjInterligado } from './tipos';

/**
 * Normaliza nome de sócio para comparação: sem acento, sem pontuação, caixa única
 * e espaços colapsados. "JOSÉ DA SILVA" e "Jose da  Silva" viram a mesma chave.
 */
export function chaveDoSocio(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export interface Vinculo {
  cliente: CnpjInterligado;
  /** Nomes dos sócios em comum, como estão cadastrados. */
  sociosEmComum: string[];
}

/**
 * Para o cliente informado, encontra os demais da carteira que compartilham ao
 * menos um sócio. Retorna vazio quando o cliente não tem sócios cadastrados.
 */
export function vinculosDoCliente(alvo: Cliente, carteira: Cliente[]): Vinculo[] {
  const chavesDoAlvo = new Map<string, string>();
  for (const nome of alvo.socios ?? []) {
    const chave = chaveDoSocio(nome);
    if (chave) chavesDoAlvo.set(chave, nome);
  }
  if (chavesDoAlvo.size === 0) return [];

  const vinculos: Vinculo[] = [];

  for (const outro of carteira) {
    if (outro.id === alvo.id) continue;

    const emComum: string[] = [];
    for (const nome of outro.socios ?? []) {
      const chave = chaveDoSocio(nome);
      if (chave && chavesDoAlvo.has(chave)) emComum.push(chavesDoAlvo.get(chave)!);
    }

    if (emComum.length > 0) {
      vinculos.push({
        cliente: { cnpj: outro.cnpj, nome: outro.nome, rbt12: outro.rbt12 },
        sociosEmComum: [...new Set(emComum)],
      });
    }
  }

  return vinculos;
}

/**
 * Recalcula `cnpjsInterligados` de toda a carteira a partir dos sócios.
 *
 * Só substitui a lista de quem tem sócios cadastrados: um cliente cujo grupo foi
 * informado manualmente, sem quadro societário, mantém o que o operador digitou.
 */
export function sincronizarGruposEconomicos(carteira: Cliente[]): Cliente[] {
  return carteira.map((cliente) => {
    if ((cliente.socios ?? []).length === 0) return cliente;

    const interligados = vinculosDoCliente(cliente, carteira).map((v) => v.cliente);
    const iguais =
      interligados.length === cliente.cnpjsInterligados.length &&
      interligados.every((novo, i) => {
        const atual = cliente.cnpjsInterligados[i];
        return atual && atual.cnpj === novo.cnpj && atual.nome === novo.nome && atual.rbt12 === novo.rbt12;
      });

    return iguais ? cliente : { ...cliente, cnpjsInterligados: interligados };
  });
}
