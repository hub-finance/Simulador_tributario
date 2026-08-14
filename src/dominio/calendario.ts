/**
 * Calendário da transição: janelas de opção, prazos irretratáveis e marcos operacionais.
 *
 * A tese central do módulo — e do sistema — é que "setembro de 2026 é o novo janeiro":
 * a decisão tributária que antes se tomava no início do ano passa a ser tomada em
 * setembro do ano anterior, com apenas 30 dias de janela.
 */

export type CategoriaEvento =
  | 'janela-opcao'
  | 'prazo-irretratavel'
  | 'obrigacao-acessoria'
  | 'marco-operacional'
  | 'preparacao-escritorio';

export type Criticidade = 'critica' | 'alta' | 'media';

export interface EventoCalendario {
  id: string;
  titulo: string;
  categoria: CategoriaEvento;
  criticidade: Criticidade;
  /** Data de abertura (ISO yyyy-mm-dd). Para eventos pontuais, igual a `fim`. */
  inicio: string;
  /** Data-limite (ISO yyyy-mm-dd), inclusive. */
  fim: string;
  descricao: string;
  /** O que acontece se o prazo passar em branco. */
  consequencia: string;
  /** A quem cabe a ação. */
  responsavel: 'Escritório' | 'Cliente' | 'Escritório + Cliente';
  /** Período de vigência do efeito da decisão, quando aplicável. */
  efeitoSobre?: string;
  baseLegal?: string;
}

export const CALENDARIO: EventoCalendario[] = [
  {
    id: 'preparacao-simulacoes',
    titulo: 'Rodar simulações em toda a base de clientes',
    categoria: 'preparacao-escritorio',
    criticidade: 'alta',
    inicio: '2026-01-01',
    fim: '2026-08-31',
    descricao:
      'A janela de decisão tem 30 dias corridos. As simulações Tradicional x Híbrido precisam estar prontas ' +
      'e apresentadas ANTES de 1º de setembro, não durante.',
    consequencia:
      'Sem simulação prévia, o escritório decide no escuro em setembro ou perde a janela e trava o cliente ' +
      'no modelo Tradicional durante todo o 1º semestre de 2027.',
    responsavel: 'Escritório',
  },
  {
    id: 'defis-2025',
    titulo: 'Entrega da DEFIS ano-calendário 2025',
    categoria: 'obrigacao-acessoria',
    criticidade: 'alta',
    inicio: '2026-01-01',
    fim: '2026-03-31',
    descricao:
      'Declaração de Informações Socioeconômicas e Fiscais referente a 2025. Primeira DEFIS com multa por atraso.',
    consequencia: 'Multa de 2% ao mês sobre os tributos informados, com piso de R$ 200,00.',
    responsavel: 'Escritório',
  },
  {
    id: 'auditoria-cadastral',
    titulo: 'Auditoria cadastral e regularização de débitos',
    categoria: 'preparacao-escritorio',
    criticidade: 'critica',
    inicio: '2026-01-01',
    fim: '2026-06-30',
    descricao:
      'Levantamento de pendências fiscais e cadastrais de toda a carteira, com prazo de folga para parcelamento ' +
      'e baixa de débitos antes da janela de setembro.',
    consequencia:
      'A existência de débitos impede a confirmação da opção e o ingresso no Simples Nacional em setembro. ' +
      'Cliente com pendência perde a janela inteira, independentemente do resultado da simulação.',
    responsavel: 'Escritório + Cliente',
  },
  {
    id: 'apresentacao-cenarios',
    titulo: 'Apresentação dos cenários e colheita da decisão do cliente',
    categoria: 'preparacao-escritorio',
    criticidade: 'alta',
    inicio: '2026-07-01',
    fim: '2026-08-31',
    descricao:
      'Reuniões de diagnóstico com os clientes, com o comparativo financeiro e o alerta de risco comercial B2B ' +
      'na mesa. Decisão formalizada por escrito antes da abertura da janela.',
    consequencia: 'Decisões tomadas em cima da hora, sem registro formal de quem escolheu o quê.',
    responsavel: 'Escritório + Cliente',
  },
  {
    id: 'janela-setembro-2026',
    titulo: 'JANELA DE OPÇÃO — IBS/CBS por fora do DAS (1º semestre de 2027)',
    categoria: 'janela-opcao',
    criticidade: 'critica',
    inicio: '2026-09-01',
    fim: '2026-09-30',
    descricao:
      'Empresas já optantes pelo Simples Nacional podem escolher recolher IBS (estado/município) e CBS (União) ' +
      '"por fora" do DAS, pelas regras do regime regular. Na mesma janela, empresas de fora do regime que ' +
      'desejam ingressar no Simples Nacional em 2027 devem fazer a solicitação.',
    consequencia:
      'Sem manifestação, a empresa permanece no modelo Tradicional (tudo dentro do DAS) durante todo o ' +
      '1º semestre de 2027, com crédito limitado para clientes PJ.',
    responsavel: 'Escritório + Cliente',
    efeitoSobre: '1º semestre de 2027',
  },
  {
    id: 'cancelamento-novembro-2026',
    titulo: 'Prazo final para cancelar a opção de setembro',
    categoria: 'prazo-irretratavel',
    criticidade: 'critica',
    inicio: '2026-10-01',
    fim: '2026-11-30',
    descricao:
      'Última oportunidade de desfazer a opção feita em setembro, caso as simulações mudem de perspectiva. ' +
      'Depois desta data a escolha se torna irretratável para o período.',
    consequencia:
      'Após 30/11/2026 a opção não pode mais ser revertida. Erro de enquadramento fica travado no ' +
      '1º semestre de 2027 inteiro.',
    responsavel: 'Escritório',
    efeitoSobre: '1º semestre de 2027',
  },
  {
    id: 'vigencia-2027',
    titulo: 'Início da vigência: CBS substitui PIS/Cofins',
    categoria: 'marco-operacional',
    criticidade: 'alta',
    inicio: '2027-01-01',
    fim: '2027-01-01',
    descricao:
      'PIS e Cofins extintos, CBS integral em vigor, IPI zerado (exceto ZFM). O IBS permanece em 0,1%. ' +
      'Quem optou pelo modelo híbrido começa a apurar IBS/CBS pelo regime não cumulativo.',
    consequencia: 'Parametrização de notas e obrigações precisa estar concluída em 31/12/2026.',
    responsavel: 'Escritório',
  },
  {
    id: 'janela-marco-2027',
    titulo: 'JANELA DE OPÇÃO — IBS/CBS por fora do DAS (2º semestre de 2027)',
    categoria: 'janela-opcao',
    criticidade: 'critica',
    inicio: '2027-03-01',
    fim: '2027-03-31',
    descricao:
      'Segunda janela, para as empresas que não entraram no primeiro lote e desejam aderir ao recolhimento ' +
      'de IBS/CBS "por fora", com efeitos a partir do 2º semestre de 2027.',
    consequencia: 'Perder esta janela significa aguardar o próximo ciclo de opção.',
    responsavel: 'Escritório + Cliente',
    efeitoSobre: '2º semestre de 2027',
  },
];

/** Obrigação mensal recorrente do PGDAS-D. */
export const VENCIMENTO_PGDAS_D_DIA = 20;

export interface StatusEvento {
  evento: EventoCalendario;
  situacao: 'futuro' | 'aberto' | 'encerrado';
  /** Dias até a abertura (futuro) ou até o fechamento (aberto). Negativo se encerrado. */
  diasRestantes: number;
}

const MS_POR_DIA = 86_400_000;

function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function inicioDoDiaUTC(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

export function diferencaEmDias(de: Date, ate: Date): number {
  return Math.round((inicioDoDiaUTC(ate).getTime() - inicioDoDiaUTC(de).getTime()) / MS_POR_DIA);
}

export function avaliarEvento(evento: EventoCalendario, referencia: Date): StatusEvento {
  const inicio = paraData(evento.inicio);
  const fim = paraData(evento.fim);
  const hoje = inicioDoDiaUTC(referencia);

  if (hoje < inicio) {
    return { evento, situacao: 'futuro', diasRestantes: diferencaEmDias(hoje, inicio) };
  }
  if (hoje > fim) {
    return { evento, situacao: 'encerrado', diasRestantes: diferencaEmDias(hoje, fim) };
  }
  return { evento, situacao: 'aberto', diasRestantes: diferencaEmDias(hoje, fim) };
}

/** Linha do tempo completa, ordenada por data-limite. */
export function linhaDoTempo(referencia: Date): StatusEvento[] {
  return CALENDARIO.map((e) => avaliarEvento(e, referencia)).sort((a, b) =>
    a.evento.fim.localeCompare(b.evento.fim),
  );
}

/** Eventos abertos ou que abrem nos próximos `horizonteDias` dias. */
export function agendaAtiva(referencia: Date, horizonteDias = 120): StatusEvento[] {
  return linhaDoTempo(referencia).filter(
    (s) => s.situacao === 'aberto' || (s.situacao === 'futuro' && s.diasRestantes <= horizonteDias),
  );
}

/**
 * A janela decisiva vigente na data de referência, se houver. É o que a interface
 * destaca no topo: quanto tempo resta para decidir.
 */
export function janelaVigente(referencia: Date): StatusEvento | null {
  return (
    linhaDoTempo(referencia).find((s) => s.evento.categoria === 'janela-opcao' && s.situacao === 'aberto') ?? null
  );
}

/** A próxima janela de opção que ainda vai abrir, para contagem regressiva. */
export function proximaJanela(referencia: Date): StatusEvento | null {
  return (
    linhaDoTempo(referencia).find((s) => s.evento.categoria === 'janela-opcao' && s.situacao === 'futuro') ?? null
  );
}

/** Vencimento do PGDAS-D da competência informada (dia 20 do mês seguinte). */
export function vencimentoPgdasD(anoCompetencia: number, mesCompetencia: number): Date {
  return new Date(Date.UTC(anoCompetencia, mesCompetencia, VENCIMENTO_PGDAS_D_DIA));
}
