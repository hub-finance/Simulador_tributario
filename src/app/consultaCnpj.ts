/**
 * Consulta de CNPJ na base pública da Receita Federal.
 *
 * A consulta usa a BrasilAPI, que espelha a base do CNPJ da Receita Federal e não
 * exige cadastro nem chave. O que vem de lá preenche o cadastro e, mais importante,
 * alimenta duas decisões do sistema:
 *
 *   - Situação cadastral diferente de ATIVA vira pendência cadastral, que bloqueia
 *     a opção na janela de setembro.
 *   - O quadro societário permite cruzar sócios entre os clientes da carteira e
 *     detectar grupo econômico sem depender de digitação manual.
 *
 * A rede pode não estar disponível: a função nunca lança, sempre devolve um estado
 * que a interface sabe exibir. O preenchimento manual continua funcionando.
 */

import type { NumeroAnexo } from '../dominio/tabelasSimples';
import type { Cliente } from './tipos';

/**
 * Fontes consultadas, em ordem. As duas espelham a base pública do CNPJ da Receita
 * Federal, aceitam requisição do navegador e não exigem cadastro. Ter mais de uma
 * importa porque rede corporativa costuma bloquear domínio por lista, e o que está
 * bloqueado em um escritório costuma estar liberado em outro.
 */
export const FONTES = [
  { nome: 'BrasilAPI', url: (d: string) => `https://brasilapi.com.br/api/cnpj/v1/${d}` },
  { nome: 'CNPJ.ws', url: (d: string) => `https://publica.cnpj.ws/cnpj/${d}` },
] as const;

/**
 * Detecta o ambiente da página publicada no Claude, que roda sob uma política de
 * segurança que bloqueia qualquer requisição a outro servidor. Vale checar antes de
 * tentar: evita uma espera inútil e permite explicar o motivo de verdade.
 */
export function consultaBloqueadaPeloAmbiente(): boolean {
  const c = (globalThis as { claude?: { use?: unknown } }).claude;
  return typeof c?.use === 'function';
}

export const MOTIVO_AMBIENTE_BLOQUEADO =
  'a versão publicada como página no Claude não pode consultar serviços externos. ' +
  'Use o arquivo do simulador ou a versão publicada no servidor do escritório';

// ---------------------------------------------------------------------------
// Validação e formatação
// ---------------------------------------------------------------------------

/** Deixa só os dígitos. */
export function normalizarCnpj(texto: string): string {
  return (texto ?? '').replace(/\D/g, '');
}

/** Formata 14 dígitos como 00.000.000/0000-00. Entradas parciais saem formatadas até onde dá. */
export function formatarCnpj(texto: string): string {
  const d = normalizarCnpj(texto).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Valida os dois dígitos verificadores. Vale a pena checar antes de ir à rede:
 * erro de digitação é a causa mais comum de "CNPJ não encontrado".
 */
export function validarCnpj(texto: string): boolean {
  const d = normalizarCnpj(texto);
  if (d.length !== 14) return false;
  // Sequências repetidas passam no cálculo mas não são CNPJ válido.
  if (/^(\d)\1{13}$/.test(d)) return false;

  const digito = (base: string, pesos: number[]): number => {
    const soma = pesos.reduce((acc, peso, i) => acc + Number(base[i]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = digito(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (primeiro !== Number(d[12])) return false;

  const segundo = digito(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return segundo === Number(d[13]);
}

// ---------------------------------------------------------------------------
// Dados retornados
// ---------------------------------------------------------------------------

export interface SocioCnpj {
  nome: string;
  qualificacao: string;
}

export interface DadosCnpj {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  descricaoCnae: string;
  situacaoCadastral: string;
  /** True quando a situação é diferente de ATIVA. */
  cadastroIrregular: boolean;
  porte: string;
  municipio: string;
  uf: string;
  optantePeloSimples: boolean | null;
  optantePeloMei: boolean | null;
  dataOpcaoPeloSimples: string | null;
  socios: SocioCnpj[];
}

export type ResultadoConsulta =
  | { estado: 'ok'; dados: DadosCnpj }
  | { estado: 'invalido'; motivo: string }
  | { estado: 'nao-encontrado' }
  | { estado: 'indisponivel'; motivo: string };

/**
 * Extrai os campos de interesse do payload da BrasilAPI.
 *
 * Escrito para tolerar variação: cada campo tem alternativas de nome e valor padrão.
 * Uma API pública pode renomear campo sem aviso, e a consulta é conveniência — não
 * pode derrubar o cadastro do cliente.
 */
/** Lê uma chave de um valor que pode vir como objeto aninhado. */
function objetoTexto(valor: unknown, ...chaves: string[]): string {
  if (typeof valor !== 'object' || valor === null) return '';
  const o = valor as Record<string, unknown>;
  for (const chave of chaves) {
    const v = o[chave];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

export function extrairDados(payload: unknown): DadosCnpj | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const bruto = payload as Record<string, unknown>;
  // O CNPJ.ws aninha os dados do estabelecimento; a BrasilAPI devolve tudo no topo.
  // Achatamos os dois em um único objeto antes de ler, com o topo tendo precedência.
  const estabelecimento =
    typeof bruto.estabelecimento === 'object' && bruto.estabelecimento !== null
      ? (bruto.estabelecimento as Record<string, unknown>)
      : {};
  const p: Record<string, unknown> = { ...estabelecimento, ...bruto };

  const texto = (...chaves: string[]): string => {
    for (const chave of chaves) {
      const v = p[chave];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'number') return String(v);
    }
    return '';
  };

  const cnpj = normalizarCnpj(
    typeof p.cnpj === 'string' ? p.cnpj : typeof estabelecimento.cnpj === 'string' ? estabelecimento.cnpj : '',
  );
  const razaoSocial = texto('razao_social', 'nome', 'razaoSocial');
  if (!cnpj && !razaoSocial) return null;

  const situacao = texto('descricao_situacao_cadastral', 'situacao_cadastral', 'situacao').toUpperCase();

  const booleanoOuNulo = (...chaves: string[]): boolean | null => {
    for (const chave of chaves) {
      const v = p[chave];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        if (/^(sim|true)$/i.test(v)) return true;
        if (/^(nao|não|false)$/i.test(v)) return false;
      }
    }
    return null;
  };

  const listaSocios = Array.isArray(p.qsa) ? p.qsa : Array.isArray(bruto.socios) ? bruto.socios : [];
  const socios: SocioCnpj[] = listaSocios
    .map((s) => {
      if (typeof s !== 'object' || s === null) return null;
      const r = s as Record<string, unknown>;
      const nome = [r.nome_socio, r.nome, r.nome_do_socio].find((v) => typeof v === 'string' && v.trim());
      if (typeof nome !== 'string') return null;
      const qual = [r.qualificacao_socio, r.qual, r.codigo_qualificacao_socio].find(
        (v) => typeof v === 'string' && v.trim(),
      );
      return { nome: nome.trim(), qualificacao: typeof qual === 'string' ? qual.trim() : '' };
    })
    .filter((s): s is SocioCnpj => s !== null);

  return {
    cnpj,
    razaoSocial,
    nomeFantasia: texto('nome_fantasia', 'fantasia'),
    cnaePrincipal:
      texto('cnae_fiscal', 'cnae_fiscal_principal', 'cnae_principal') ||
      objetoTexto(p.atividade_principal, 'id', 'codigo'),
    descricaoCnae:
      texto('cnae_fiscal_descricao', 'atividade_principal_descricao') ||
      objetoTexto(p.atividade_principal, 'descricao'),
    situacaoCadastral: situacao || 'DESCONHECIDA',
    // Só marcamos irregular quando a situação é conhecida e diferente de ATIVA.
    cadastroIrregular: situacao !== '' && situacao !== 'ATIVA',
    porte: texto('porte', 'descricao_porte'),
    municipio: texto('municipio', 'descricao_municipio'),
    uf: texto('uf'),
    optantePeloSimples: booleanoOuNulo('opcao_pelo_simples', 'opcao_pelo_simples_nacional'),
    optantePeloMei: booleanoOuNulo('opcao_pelo_mei'),
    dataOpcaoPeloSimples: texto('data_opcao_pelo_simples') || null,
    socios,
  };
}

/**
 * Consulta o CNPJ, tentando cada fonte em ordem até uma responder.
 *
 * Recebe o `fetch` por parâmetro para permitir teste sem rede. Nunca lança: erro de
 * rede, bloqueio de CORS ou resposta inesperada viram o estado `indisponivel`, com o
 * motivo de cada fonte, e o cadastro manual segue disponível.
 */
export async function consultarCnpj(
  cnpj: string,
  buscar: typeof fetch = globalThis.fetch,
  tempoLimiteMs = 12_000,
): Promise<ResultadoConsulta> {
  const digitos = normalizarCnpj(cnpj);

  if (digitos.length !== 14) {
    return { estado: 'invalido', motivo: 'O CNPJ precisa ter 14 dígitos.' };
  }
  if (!validarCnpj(digitos)) {
    return { estado: 'invalido', motivo: 'Dígitos verificadores não conferem — confira a digitação.' };
  }
  if (consultaBloqueadaPeloAmbiente()) {
    return { estado: 'indisponivel', motivo: MOTIVO_AMBIENTE_BLOQUEADO };
  }
  if (typeof buscar !== 'function') {
    return { estado: 'indisponivel', motivo: 'consulta automática não disponível neste ambiente' };
  }

  const motivos: string[] = [];

  for (const fonte of FONTES) {
    const controlador = new AbortController();
    const relogio = setTimeout(() => controlador.abort(), tempoLimiteMs);

    try {
      const resposta = await buscar(fonte.url(digitos), {
        signal: controlador.signal,
        headers: { Accept: 'application/json' },
      });

      // CNPJ inexistente é resposta definitiva: não adianta tentar a próxima fonte.
      if (resposta.status === 404) return { estado: 'nao-encontrado' };

      if (resposta.status === 429) {
        motivos.push(`${fonte.nome}: limite de consultas atingido`);
        continue;
      }
      if (!resposta.ok) {
        motivos.push(`${fonte.nome}: respondeu ${resposta.status}`);
        continue;
      }

      const dados = extrairDados(await resposta.json());
      if (!dados) {
        motivos.push(`${fonte.nome}: resposta em formato inesperado`);
        continue;
      }

      return { estado: 'ok', dados: { ...dados, cnpj: dados.cnpj || digitos } };
    } catch (erro) {
      const abortado = erro instanceof Error && erro.name === 'AbortError';
      motivos.push(`${fonte.nome}: ${abortado ? 'demorou demais' : 'não respondeu'}`);
    } finally {
      clearTimeout(relogio);
    }
  }

  return {
    estado: 'indisponivel',
    motivo: `nenhuma fonte respondeu (${motivos.join('; ')})`,
  };
}

// ---------------------------------------------------------------------------
// Do CNAE para o anexo
// ---------------------------------------------------------------------------

export interface AnexoSugerido {
  anexo: NumeroAnexo;
  /** True quando a atividade depende do Fator R para escolher entre III e V. */
  sujeitoAoFatorR: boolean;
  justificativa: string;
}

/**
 * Sugere o anexo a partir da divisão do CNAE (os dois primeiros dígitos).
 *
 * É sugestão, não enquadramento: casos de fronteira e atividades mistas exigem
 * conferência. A interface deixa isso explícito e o campo continua editável.
 */
export function anexoSugeridoPorCnae(cnae: string): AnexoSugerido | null {
  const digitos = normalizarCnpj(cnae);
  if (digitos.length < 2) return null;

  const divisao = Number(digitos.slice(0, 2));
  const grupo = digitos.length >= 3 ? Number(digitos.slice(0, 3)) : divisao * 10;

  // Anexo IV: sem CPP no DAS. Construção civil, advocacia, vigilância e limpeza.
  if (divisao >= 41 && divisao <= 43) {
    return { anexo: 4, sujeitoAoFatorR: false, justificativa: 'Construção civil — Anexo IV, com INSS patronal fora do DAS.' };
  }
  if (grupo === 691) {
    return { anexo: 4, sujeitoAoFatorR: false, justificativa: 'Advocacia — Anexo IV, com INSS patronal fora do DAS.' };
  }
  if (divisao === 80 || divisao === 81) {
    return {
      anexo: 4,
      sujeitoAoFatorR: false,
      justificativa: 'Vigilância, limpeza ou conservação — Anexo IV, com INSS patronal fora do DAS.',
    };
  }

  // Anexo II: indústria e extração.
  if (divisao >= 5 && divisao <= 33) {
    return { anexo: 2, sujeitoAoFatorR: false, justificativa: 'Atividade industrial — Anexo II.' };
  }

  // Anexo I: comércio.
  if (divisao >= 45 && divisao <= 47) {
    return { anexo: 1, sujeitoAoFatorR: false, justificativa: 'Comércio — Anexo I.' };
  }

  // Serviços sujeitos ao Fator R: alternam entre Anexo III e V conforme a folha.
  const divisoesFatorR = [62, 63, 70, 71, 72, 73, 74, 85, 86, 90, 93];
  if (divisoesFatorR.includes(divisao) || grupo === 692) {
    return {
      anexo: 3,
      sujeitoAoFatorR: true,
      justificativa: 'Serviço sujeito ao Fator R — Anexo III se a folha atingir 28% da receita, Anexo V abaixo disso.',
    };
  }

  // Demais serviços: Anexo III.
  return { anexo: 3, sujeitoAoFatorR: false, justificativa: 'Prestação de serviços — Anexo III.' };
}

// ---------------------------------------------------------------------------
// Da consulta para o cadastro
// ---------------------------------------------------------------------------

export interface Preenchimento {
  alteracoes: Partial<Cliente>;
  /** O que foi preenchido, para mostrar ao operador o que mudou. */
  avisos: string[];
}

/**
 * Converte os dados da consulta em alterações do cadastro.
 *
 * Nunca sobrescreve números informados pelo operador (RBT12, faturamento, insumos,
 * folha): esses não vêm da Receita e são o coração da simulação.
 */
export function preencherComDadosDaReceita(dados: DadosCnpj): Preenchimento {
  const avisos: string[] = [];
  const alteracoes: Partial<Cliente> = {
    nome: dados.razaoSocial || dados.nomeFantasia,
    cnpj: formatarCnpj(dados.cnpj),
    cnae: dados.cnaePrincipal,
    socios: dados.socios.map((s) => s.nome),
  };

  avisos.push(`Razão social, CNAE e quadro societário preenchidos a partir da base da Receita Federal.`);

  const sugestao = anexoSugeridoPorCnae(dados.cnaePrincipal);
  if (sugestao) {
    alteracoes.anexo = sugestao.anexo;
    alteracoes.sujeitoAoFatorR = sugestao.sujeitoAoFatorR;
    avisos.push(`${sugestao.justificativa} Confira antes de simular.`);
  }

  if (dados.cadastroIrregular) {
    alteracoes.possuiPendenciasCadastrais = true;
    avisos.push(
      `Situação cadastral "${dados.situacaoCadastral}" — marcado como pendência cadastral, que impede a opção na janela.`,
    );
  }

  if (dados.optantePeloMei) {
    avisos.push('Empresa consta como MEI. O comparativo deste sistema pressupõe optante do Simples fora do MEI.');
  } else if (dados.optantePeloSimples === false) {
    avisos.push(
      'A empresa não consta como optante do Simples Nacional. Para 2027, o ingresso também é solicitado na janela de setembro de 2026.',
    );
  }

  if (dados.socios.length > 1) {
    avisos.push(
      `${dados.socios.length} sócios registrados. O sistema cruza esses nomes com o resto da carteira para apontar grupo econômico.`,
    );
  }

  return { alteracoes, avisos };
}
