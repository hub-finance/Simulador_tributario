/**
 * Diagnóstico de prospecção — documento comercial para empresa que ainda não é
 * cliente do escritório.
 *
 * Diferença de tom em relação ao relatório do cliente: aqui não se assume que o
 * interlocutor sabe o que é DAS, anexo ou não cumulatividade. O documento parte do
 * número dele, mostra a data-limite e termina em uma proposta de conversa — sem
 * promessa de economia que a simulação não sustente.
 */

import type { StatusEvento } from '../dominio/calendario';
import type { Diagnostico } from '../dominio/diagnostico';
import { brl, pct } from '../dominio/formatoBR';
import type { ResultadoSimulacao } from '../dominio/motorSimulacao';
import { comoNomeDeArquivo, escapar, montarDocumento, rodape, type Documento } from './documento';

export interface DadosProspeccao {
  nome: string;
  cnpj: string;
  simulacao: ResultadoSimulacao;
  diagnostico: Diagnostico;
  /** Janela de opção mais próxima, para a contagem regressiva. */
  janela: StatusEvento | null;
}

function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function relatorioProspeccao({ nome, cnpj, simulacao, diagnostico, janela }: DadosProspeccao): Documento {
  const { tradicional, hibrido, comparativo, entrada, parametrosAno } = simulacao;

  const fracaoB2B = entrada.percentualReceitaB2B ?? 0;
  const perdeCreditoAoAno = comparativo.ganhoDeCreditoNoHibrido * 12;
  const diferencaCaixaAoAno = comparativo.economiaCaixaNoHibrido * 12;

  const chamadaJanela = janela
    ? janela.situacao === 'aberto'
      ? `A janela de decisão está <strong>aberta agora</strong> e fecha em ${dataBR(janela.evento.fim)} — restam ${janela.diasRestantes} dia(s).`
      : `A janela de decisão abre em ${dataBR(janela.evento.inicio)} e fecha em ${dataBR(janela.evento.fim)} — faltam ${janela.diasRestantes} dia(s).`
    : 'A próxima janela de decisão será divulgada conforme o cronograma da reforma.';

  // O argumento comercial muda conforme o perfil: crédito para quem vende a PJ,
  // custo para quem vende ao consumidor final.
  const argumentoCentral =
    fracaoB2B >= 0.5
      ? `<div class="painel painel--alerta">
           <strong style="font-size:16px">O que está em jogo no seu caso</strong>
           <p style="margin:8px 0 0">
             Com ${pct(fracaoB2B, 0)} do seu faturamento indo para outras empresas, a escolha do modelo de
             recolhimento define quanto crédito os seus compradores conseguem aproveitar. Pelos números
             informados, a diferença é de <strong>${brl(comparativo.ganhoDeCreditoNoHibrido)} por mês</strong>
             — cerca de ${brl(perdeCreditoAoAno)} ao ano — em crédito que o seu cliente aproveita em um modelo
             e não aproveita no outro.
           </p>
           <p style="margin:8px 0 0">
             Na prática, o mesmo produto sai
             ${brl(comparativo.precoLiquidoParaClientePJ.tradicional - comparativo.precoLiquidoParaClientePJ.hibrido)}
             mais caro por mês para quem compra de você, sem que você receba um centavo a mais por isso.
           </p>
         </div>`
      : `<div class="painel">
           <strong style="font-size:16px">O que está em jogo no seu caso</strong>
           <p style="margin:8px 0 0">
             Seu faturamento é majoritariamente voltado ao consumidor final, então o crédito repassado pesa
             pouco. Aqui a decisão é de custo puro: a diferença entre os dois modelos é de
             <strong>${brl(Math.abs(comparativo.economiaCaixaNoHibrido))} por mês</strong>
             — cerca de ${brl(Math.abs(diferencaCaixaAoAno))} ao ano.
           </p>
         </div>`;

  const corpo = `
  <div class="marca">Hub de Gestão · Diagnóstico sem compromisso</div>
  <h1>Sua empresa tem uma decisão tributária com prazo para acontecer</h1>
  <p class="sub">${escapar(nome)}${cnpj ? ` — CNPJ ${escapar(cnpj)}` : ''}</p>
  <p class="sub">Simulação para o ano-calendário ${parametrosAno.ano}, a partir dos dados que você nos passou</p>

  <h2>O que mudou</h2>
  <p>
    Com a reforma tributária, empresas do Simples Nacional passam a ter duas formas de recolher os novos
    tributos sobre consumo (IBS e CBS):
  </p>
  <p>
    <strong>1. Dentro da guia única (DAS).</strong> Mantém a simplicidade de sempre. Em contrapartida, quem
    compra da sua empresa só consegue aproveitar crédito até o limite do que estiver embutido nessa guia.
  </p>
  <p>
    <strong>2. Por fora da guia.</strong> A empresa continua no Simples Nacional, mas apura IBS e CBS pelas
    regras do regime regular e destaca o crédito integral na nota fiscal. A guia do Simples fica mais barata,
    e entra uma segunda guia.
  </p>
  <p>
    Não existe resposta certa para todo mundo. Existe a resposta certa para o seu perfil de cliente e para
    o seu volume de compras — e ela precisa ser calculada.
  </p>

  ${argumentoCentral}

  <h2>Seus números nos dois cenários</h2>
  <table>
    <thead>
      <tr><th></th><th class="num">Tudo na guia única</th><th class="num">IBS/CBS por fora</th></tr>
    </thead>
    <tbody>
      <tr><td>Quanto você paga por mês</td>
          <td class="num destaque">${brl(tradicional.custoTotal)}</td>
          <td class="num destaque">${brl(hibrido.custoTotal)}</td></tr>
      <tr><td>Crédito que seu cliente empresa aproveita</td>
          <td class="num">${brl(tradicional.creditoTransferido)}</td>
          <td class="num">${brl(hibrido.creditoTransferido)}</td></tr>
      <tr><td>Custo real do seu produto para quem compra</td>
          <td class="num">${brl(comparativo.precoLiquidoParaClientePJ.tradicional)}</td>
          <td class="num">${brl(comparativo.precoLiquidoParaClientePJ.hibrido)}</td></tr>
    </tbody>
  </table>
  <p class="sub">
    Base: faturamento mensal de ${brl(entrada.faturamentoMensal)}, ${brl(entrada.insumosTributaveis)} em compras
    com direito a crédito e ${pct(fracaoB2B, 0)} da receita vendida a outras empresas.
  </p>

  <h2>Nossa leitura</h2>
  <div class="painel ${diagnostico.recomendacao === 'Híbrido' ? 'painel--ok' : 'painel'}">
    <strong>Pelos dados informados, o caminho indicado é o modelo ${escapar(diagnostico.recomendacao)}.</strong>
    <p style="margin:8px 0 0">${escapar(diagnostico.justificativa)}</p>
  </div>
  <p>
    Esta é uma leitura preliminar, feita com os números que você nos passou. Uma análise definitiva considera
    o histórico de 12 meses, a composição real das suas compras, a folha de pagamento e a situação cadastral
    da empresa — que, se tiver pendência, impede a opção independentemente do resultado da conta.
  </p>

  <h2>O prazo</h2>
  <div class="painel painel--alerta">
    ${chamadaJanela}
    <p style="margin:8px 0 0">
      Quem não se manifesta permanece automaticamente no modelo de guia única durante todo o período. A opção
      feita em setembro de 2026 pode ser cancelada até 30 de novembro de 2026; depois disso, fica travada para
      o primeiro semestre de 2027.
    </p>
  </div>

  <h2>Como podemos ajudar</h2>
  <p>
    Fazemos o diagnóstico completo da sua empresa — os dois cenários calculados com o seu histórico real,
    a checagem da situação cadastral que pode travar a opção, e o acompanhamento da formalização dentro da
    janela. Se a conclusão for que o modelo atual já é o melhor para você, dizemos isso com o número na mesa.
  </p>
  <p><strong>Próximo passo:</strong> uma conversa de 30 minutos para levantar os dados reais e fechar o diagnóstico.</p>

  ${rodape('Documento elaborado a partir de dados preliminares fornecidos pela empresa. ')}`;

  return montarDocumento(
    `Diagnóstico preliminar — ${nome}`,
    `prospeccao-${comoNomeDeArquivo(nome)}`,
    corpo,
  );
}
