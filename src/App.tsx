import { useEffect, useMemo, useRef, useState } from 'react';
import {
  carregarCarteira,
  criarId,
  exportarBackup,
  exportarCsv,
  importarArquivo as lerArquivoDaCarteira,
  salvarCarteira,
} from './app/armazenamento';
import { registrarAplicativo, suportaInstalacao } from './app/atualizacao';
import { entregarArquivo } from './app/download';
import { sincronizarGruposEconomicos } from './app/grupoEconomico';
import { clienteVazio, type Cliente, type DecisaoRegistrada } from './app/tipos';
import { agendaAtiva, janelaVigente, proximaJanela } from './dominio/calendario';
import { diagnosticar } from './dominio/diagnostico';
import { calcularFatorR } from './dominio/fatorR';
import type { EntradaSimulacao } from './dominio/motorSimulacao';
import { simular } from './dominio/motorSimulacao';
import { classificar, resumirCarteira, type LinhaCarteira } from './dominio/segmentacao';
import { CRONOGRAMA_TRANSICAO } from './dominio/transicao';
import { relatorioCarteira } from './relatorios/relatorioCarteira';
import { relatorioCliente } from './relatorios/relatorioCliente';
import { relatorioProspeccao } from './relatorios/relatorioProspeccao';
import { PainelAjuda } from './ui/PainelAjuda';
import { PainelRelatorios, type DocumentoDisponivel } from './ui/PainelRelatorios';
import { BarraLateral } from './ui/BarraLateral';
import { Comparativo } from './ui/Comparativo';
import { PainelCalendario } from './ui/PainelCalendario';
import { PainelDiagnostico } from './ui/PainelDiagnostico';
import { PainelPerfil } from './ui/PainelPerfil';
import { Projecao } from './ui/Projecao';
import { periodoBR, reais } from './ui/formatacao';

type Aba = 'simulador' | 'cronograma' | 'projecao' | 'relatorios' | 'ajuda';

const ANOS = CRONOGRAMA_TRANSICAO.map((a) => a.ano);

export default function App() {
  const carteiraInicial = useRef<Cliente[]>(null as unknown as Cliente[]);
  if (carteiraInicial.current === null) carteiraInicial.current = carregarCarteira();

  const [clientes, setClientes] = useState<Cliente[]>(carteiraInicial.current);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(carteiraInicial.current[0]?.id ?? null);
  const [ano, setAno] = useState(2027);
  const [referencia, setReferencia] = useState(() => new Date());
  const [aba, setAba] = useState<Aba>('simulador');
  const [aviso, setAviso] = useState<string | null>(null);
  const [atualizacao, setAtualizacao] = useState<{ disponivel: boolean; aplicar: () => void } | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  // Registra o app instalável e fica ouvindo por versão nova publicada.
  useEffect(() => {
    void registrarAplicativo(({ temAtualizacao, atualizar }) => {
      if (temAtualizacao) setAtualizacao({ disponivel: true, aplicar: atualizar });
    });
  }, []);

  useEffect(() => {
    salvarCarteira(clientes);
  }, [clientes]);

  // O cruzamento de sócios roda sobre a carteira inteira: mexer em um cliente pode
  // criar ou desfazer vínculo de grupo econômico em outro.
  useEffect(() => {
    setClientes((atual) => {
      const sincronizada = sincronizarGruposEconomicos(atual);
      return sincronizada.every((c, i) => c === atual[i]) ? atual : sincronizada;
    });
  }, [clientes]);

  const cliente = clientes.find((c) => c.id === selecionadoId) ?? null;

  const entrada: EntradaSimulacao | null = useMemo(() => {
    if (!cliente) return null;
    const fatorR = calcularFatorR({ folha12Meses: cliente.folha12Meses, rbt12: cliente.rbt12 });
    return {
      faturamentoMensal: cliente.faturamentoMensal,
      rbt12: cliente.rbt12,
      anexo: cliente.sujeitoAoFatorR ? fatorR.anexoAplicavel : cliente.anexo,
      perfil: cliente.perfil,
      percentualReceitaB2B: cliente.percentualReceitaB2B,
      insumosTributaveis: cliente.insumosTributaveis,
      ano,
      saldoCredorAnterior: cliente.saldoCredorAnterior,
    };
  }, [cliente, ano]);

  const resultado = useMemo(() => (entrada ? simular(entrada) : null), [entrada]);

  const diagnostico = useMemo(() => {
    if (!resultado || !cliente) return null;
    return diagnosticar({
      simulacao: resultado,
      cadastro: {
        possuiDebitosEmAberto: cliente.possuiDebitosEmAberto,
        valorDebitos: cliente.valorDebitos,
        possuiPendenciasCadastrais: cliente.possuiPendenciasCadastrais,
        cnpjsInterligados: cliente.cnpjsInterligados,
      },
      referencia,
      ibsAcumulado12Meses: cliente.ibsAcumulado12Meses,
    });
  }, [resultado, cliente, referencia]);

  const janela = janelaVigente(referencia);
  const aCaminho = proximaJanela(referencia);

  /**
   * Carteira inteira simulada e classificada, para os relatórios consolidados.
   * É o mesmo motor da tela, rodado uma vez por cliente.
   */
  const carteiraAnalisada: LinhaCarteira[] = useMemo(
    () =>
      clientes.map((c) => {
        const fr = calcularFatorR({ folha12Meses: c.folha12Meses, rbt12: c.rbt12 });
        const sim = simular({
          faturamentoMensal: c.faturamentoMensal,
          rbt12: c.rbt12,
          anexo: c.sujeitoAoFatorR ? fr.anexoAplicavel : c.anexo,
          perfil: c.perfil,
          percentualReceitaB2B: c.percentualReceitaB2B,
          insumosTributaveis: c.insumosTributaveis,
          ano,
          saldoCredorAnterior: c.saldoCredorAnterior,
        });
        const diag = diagnosticar({
          simulacao: sim,
          cadastro: {
            possuiDebitosEmAberto: c.possuiDebitosEmAberto,
            valorDebitos: c.valorDebitos,
            possuiPendenciasCadastrais: c.possuiPendenciasCadastrais,
            cnpjsInterligados: c.cnpjsInterligados,
          },
          referencia,
          ibsAcumulado12Meses: c.ibsAcumulado12Meses,
        });
        return {
          nome: c.nome,
          cnpj: c.cnpj,
          grupo: classificar({ simulacao: sim, diagnostico: diag }),
          simulacao: sim,
          diagnostico: diag,
          decidido: c.decisao !== null,
        };
      }),
    [clientes, ano, referencia],
  );

  const resumo = useMemo(
    () => (carteiraAnalisada.length > 0 ? resumirCarteira(carteiraAnalisada) : null),
    [carteiraAnalisada],
  );

  const documentos: DocumentoDisponivel[] = useMemo(() => {
    const agenda = agendaAtiva(referencia);
    const semCliente = 'Selecione um cliente na carteira para gerar este documento.';

    return [
      {
        chave: 'cliente',
        titulo: 'Diagnóstico do cliente',
        publico: 'Para a reunião com o cliente da casa',
        quandoUsar: 'Leva a recomendação, a conta dos dois cenários e os prazos que ele precisa cumprir.',
        conteudo: [
          'Recomendação com a justificativa em linguagem de negócio',
          'Comparativo de custo e de crédito repassado ao comprador PJ',
          'Pontos de atenção e bloqueios cadastrais',
          'Calendário com os prazos do cliente',
        ],
        gerar: () => relatorioCliente({ nome: cliente!.nome, cnpj: cliente!.cnpj, simulacao: resultado!, diagnostico: diagnostico! }),
        indisponivel: cliente && resultado && diagnostico ? undefined : semCliente,
      },
      {
        chave: 'prospeccao',
        titulo: 'Diagnóstico de prospecção',
        publico: 'Para prospectar empresa que ainda não é cliente',
        quandoUsar:
          'Parte dos números que o prospect informou, mostra o que está em jogo e termina em proposta de conversa.',
        conteudo: [
          'Explicação dos dois modelos sem jargão técnico',
          'O valor exato em jogo no caso dele, por mês e por ano',
          'Contagem regressiva até a janela de decisão',
          'O que o escritório faz e qual o próximo passo',
        ],
        gerar: () =>
          relatorioProspeccao({
            nome: cliente!.nome,
            cnpj: cliente!.cnpj,
            simulacao: resultado!,
            diagnostico: diagnostico!,
            janela: janela ?? aCaminho,
          }),
        indisponivel: cliente && resultado && diagnostico ? undefined : semCliente,
      },
      {
        chave: 'carteira',
        titulo: 'Consolidado da carteira',
        publico: 'Para a reunião interna de supervisão',
        quandoUsar: 'Mostra onde a operação está e qual a ordem de ataque nos dias que restam.',
        conteudo: [
          'Quantos clientes já decidiram e quantos estão travados',
          'Segmentação em grupos de tratamento, por prioridade',
          'Lista nominal dos bloqueios a resolver antes da janela',
          'Total de imposto e de crédito em jogo na carteira',
        ],
        gerar: () => relatorioCarteira(carteiraAnalisada, ano, agenda),
        indisponivel: carteiraAnalisada.length > 0 ? undefined : 'Nenhum cliente na carteira.',
      },
    ];
  }, [cliente, resultado, diagnostico, carteiraAnalisada, ano, referencia, janela, aCaminho]);

  function alterarCliente(alteracoes: Partial<Cliente>) {
    if (!cliente) return;
    setClientes((atual) =>
      atual.map((c) => (c.id === cliente.id ? { ...c, ...alteracoes, atualizadoEm: new Date().toISOString() } : c)),
    );
  }

  function adicionarCliente() {
    const novo = clienteVazio(criarId());
    setClientes((atual) => [...atual, novo]);
    setSelecionadoId(novo.id);
    setAba('simulador');
  }

  function removerCliente(id: string) {
    setClientes((atual) => {
      const restantes = atual.filter((c) => c.id !== id);
      if (id === selecionadoId) setSelecionadoId(restantes[0]?.id ?? null);
      return restantes;
    });
  }

  function registrarDecisao(decisao: DecisaoRegistrada) {
    alterarCliente({ decisao });
    setAviso(`Decisão registrada: ${decisao.cenario} (janela de ${decisao.janela}).`);
  }

  async function importarArquivo(arquivo: File) {
    const texto = await arquivo.text();
    const { clientes: novos, importados, erros, formato } = lerArquivoDaCarteira(texto);
    if (importados > 0) {
      setClientes((atual) => [...atual, ...novos]);
      setSelecionadoId(novos[0].id);
    }
    const origem = formato === 'backup' ? 'cópia de segurança' : 'planilha';
    setAviso(
      `${importados} cliente(s) importado(s) da ${origem}.` +
        (erros.length > 0 ? ` ${erros.join(' ')}` : ''),
    );
  }

  /** Cópia de segurança completa: leva decisões, pendências, sócios e vínculos. */
  async function baixarCarteira() {
    const data = new Date().toISOString().slice(0, 10);
    const resultado = await entregarArquivo(
      `carteira-${data}.json`,
      exportarBackup(clientes),
      'application/json',
    );
    if (resultado.estado === 'salvo') {
      setAviso(
        `Carteira salva em ${resultado.nomeArquivo}, com as decisões registradas. ` +
          'Guarde este arquivo: é a única cópia dos dados fora desta máquina.',
      );
    } else if (resultado.estado === 'recusado') {
      setAviso('Download cancelado.');
    } else {
      setAviso(`Não foi possível exportar: ${resultado.motivo}.`);
    }
  }

  /** Layout de troca com o sistema contábil — só os números da simulação. */
  async function baixarPlanilha() {
    const resultado = await entregarArquivo('carteira-simulador.csv', exportarCsv(clientes), 'text/csv');
    setAviso(
      resultado.estado === 'salvo'
        ? `Planilha exportada em ${resultado.nomeArquivo}. Ela não inclui as decisões — para cópia de segurança use "Salvar carteira".`
        : resultado.estado === 'recusado'
          ? 'Download cancelado.'
          : `Não foi possível exportar: ${resultado.motivo}.`,
    );
  }

  return (
    <div className="aplicacao">
      <header className="cabecalho">
        <div className="cabecalho__identidade">
          <span className="marca">Hub de Gestão</span>
          <h1>Simulador de Transição Tributária</h1>
          <p className="texto-secundario">Simples Nacional 2026–2027 · Tradicional x Híbrido (IBS/CBS por fora)</p>
        </div>

        <div className="cabecalho__acoes">
          {janela ? (
            <div className="contador contador--aberto">
              <strong>Faltam {janela.diasRestantes} dia(s)</strong>
              <span>Janela aberta — {periodoBR(janela.evento.inicio, janela.evento.fim)}</span>
            </div>
          ) : aCaminho ? (
            <div className="contador contador--proximo">
              <strong>Abre em {aCaminho.diasRestantes} dia(s)</strong>
              <span>{periodoBR(aCaminho.evento.inicio, aCaminho.evento.fim)}</span>
            </div>
          ) : (
            <div className="contador">
              <strong>Sem janela no horizonte</strong>
              <span>Aguardando novo ciclo de opção</span>
            </div>
          )}
          <input
            ref={inputArquivo}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            hidden
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void importarArquivo(arquivo);
              e.target.value = '';
            }}
          />
          <button type="button" className="botao" onClick={() => inputArquivo.current?.click()}>
            Importar
          </button>
          <button
            type="button"
            className="botao botao--secundario"
            onClick={() => void baixarCarteira()}
            title="Cópia de segurança completa, com as decisões registradas"
          >
            Salvar carteira
          </button>
          <button
            type="button"
            className="botao botao--secundario"
            onClick={() => void baixarPlanilha()}
            title="Layout de troca com o sistema contábil, só com os números"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {atualizacao?.disponivel && (
        <div className="aviso aviso--atualizacao" role="status">
          <span>
            <strong>Nova versão disponível.</strong> Atualize para receber as últimas correções e tabelas.
          </span>
          <span className="aviso__acoes">
            <button type="button" className="botao botao--pequeno" onClick={atualizacao.aplicar}>
              Atualizar agora
            </button>
            <button
              type="button"
              onClick={() => setAtualizacao(null)}
              aria-label="Adiar atualização"
              title="Adiar"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {aviso && (
        <div className="aviso" role="status">
          {aviso}
          <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}

      <div className="corpo">
        <BarraLateral
          clientes={clientes}
          selecionadoId={selecionadoId}
          onSelecionar={(id) => {
            setSelecionadoId(id);
            setAba('simulador');
          }}
          onNovo={adicionarCliente}
          onRemover={removerCliente}
        />

        <main className="conteudo">
          <nav className="abas">
            {(
              [
                ['simulador', 'Simulador'],
                ['projecao', 'Projeção 2026–2033'],
                ['relatorios', 'Relatórios'],
                ['cronograma', 'Cronograma e prazos'],
                ['ajuda', 'Ajuda'],
              ] as [Aba, string][]
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                className={`aba ${aba === chave ? 'aba--ativa' : ''}`}
                onClick={() => setAba(chave)}
              >
                {rotulo}
              </button>
            ))}
          </nav>

          {aba === 'cronograma' && (
            <PainelCalendario referencia={referencia} onAlterarReferencia={setReferencia} />
          )}

          {aba === 'ajuda' && <PainelAjuda />}

          {aba === 'relatorios' && (
            <PainelRelatorios documentos={documentos} resumo={resumo} onResultado={setAviso} />
          )}

          {aba !== 'cronograma' && aba !== 'relatorios' && aba !== 'ajuda' && !cliente && (
            <p className="vazio">Selecione ou cadastre um cliente para iniciar a simulação.</p>
          )}

          {aba === 'simulador' && cliente && resultado && diagnostico && (
            <>
              <PainelPerfil
                cliente={cliente}
                onAlterar={alterarCliente}
                onAvisar={setAviso}
                ano={ano}
                onAlterarAno={setAno}
                anosDisponiveis={ANOS}
              />
              <Comparativo resultado={resultado} recomendacao={diagnostico.recomendacao} />
              <PainelDiagnostico
                cliente={cliente}
                diagnostico={diagnostico}
                onRegistrarDecisao={registrarDecisao}
                onLimparDecisao={() => alterarCliente({ decisao: null })}
                onExportar={() => setAba('relatorios')}
              />
            </>
          )}

          {aba === 'projecao' && entrada && resultado && (
            <>
              <Projecao entrada={entrada} />
              <p className="texto-secundario nota-rodape">
                Custo do mês em {ano}: Tradicional {reais(resultado.tradicional.custoTotal)} · Híbrido{' '}
                {reais(resultado.hibrido.custoTotal)}.
              </p>
            </>
          )}
        </main>
      </div>

      <footer className="rodape-app">
        Parâmetros de alíquota e repartição são configuráveis em <code>src/dominio/</code>. Revalide as tabelas a
        cada ciclo anual — ver <code>docs/MATRIZ_DE_REGRAS.md</code>.
        {suportaInstalacao() && (
          <>
            {' '}
            Este simulador pode ser instalado como aplicativo pelo menu do navegador e funciona sem internet.
          </>
        )}
      </footer>
    </div>
  );
}
