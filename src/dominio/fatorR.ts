/**
 * Fator R — define se determinadas atividades de serviço são tributadas pelo
 * Anexo III (mais barato) ou pelo Anexo V (mais caro).
 *
 * Fator R = folha de salários dos últimos 12 meses / receita bruta dos últimos 12 meses.
 * Atingindo 28%, a atividade migra do Anexo V para o Anexo III.
 *
 * No modelo híbrido o Fator R ganha um peso novo: como IRPJ, CSLL e CPP permanecem no
 * DAS, a diferença entre Anexo III e V passa a incidir sobre uma base menor — mas não
 * desaparece. O sistema recalcula os dois cenários no anexo correto.
 */

import { brl, pct } from './formatoBR';
import type { NumeroAnexo } from './tabelasSimples';

export const PISO_FATOR_R = 0.28;

export interface EntradaFatorR {
  /** Folha de salários dos últimos 12 meses, incluindo pró-labore e encargos (FGTS/INSS). */
  folha12Meses: number;
  /** Receita bruta dos últimos 12 meses. */
  rbt12: number;
}

export interface ResultadoFatorR {
  fatorR: number;
  atingePiso: boolean;
  anexoAplicavel: Extract<NumeroAnexo, 3 | 5>;
  /**
   * Quanto de folha anual faltaria para atingir 28%. Zero quando já atinge.
   * É o número que sustenta a conversa sobre pró-labore com o cliente.
   */
  folhaFaltante: number;
  mensagem: string;
}

export function calcularFatorR({ folha12Meses, rbt12 }: EntradaFatorR): ResultadoFatorR {
  if (rbt12 <= 0) {
    return {
      fatorR: 0,
      atingePiso: false,
      anexoAplicavel: 5,
      folhaFaltante: 0,
      mensagem: 'RBT12 zerado — Fator R não calculável. Empresa em início de atividade exige regra própria.',
    };
  }

  const fatorR = folha12Meses / rbt12;
  const atingePiso = fatorR >= PISO_FATOR_R;
  const folhaFaltante = atingePiso ? 0 : PISO_FATOR_R * rbt12 - folha12Meses;

  return {
    fatorR,
    atingePiso,
    anexoAplicavel: atingePiso ? 3 : 5,
    folhaFaltante,
    mensagem: atingePiso
      ? `Fator R de ${pct(fatorR)} — tributação pelo Anexo III.`
      : `Fator R de ${pct(fatorR)} — tributação pelo Anexo V. ` +
        `Faltam ${brl(folhaFaltante)} de folha em 12 meses para migrar ao Anexo III.`,
  };
}

/** Atividades cuja tributação depende do Fator R (art. 18, §5º-M, da LC 123/2006). */
export const ATIVIDADES_SUJEITAS_AO_FATOR_R = [
  'Fisioterapia',
  'Arquitetura e urbanismo',
  'Medicina, inclusive laboratorial, e enfermagem',
  'Odontologia e prótese dentária',
  'Psicologia, psicanálise, terapia ocupacional, acupuntura, podologia, fonoaudiologia e nutrição',
  'Administração e locação de imóveis de terceiros',
  'Academias de dança, capoeira, ioga, artes marciais, natação e ginástica',
  'Elaboração de programas de computador, licenciamento e cessão de software',
  'Planejamento, confecção, manutenção e atualização de páginas eletrônicas',
  'Empresas montadoras de estandes para feiras',
  'Laboratórios de análises clínicas ou de patologia clínica',
  'Serviços de tomografia, diagnósticos médicos por imagem, registros gráficos e métodos óticos',
  'Serviços de prótese em geral',
  'Auditoria, economia, consultoria, gestão, organização, controle e administração',
  'Jornalismo e publicidade',
  'Engenharia (demais atividades do setor de serviços não vedadas)',
];
