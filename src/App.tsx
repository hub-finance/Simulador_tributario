import { useEffect, useMemo, useRef, useState } from 'react';
import { carregarCarteira, criarId, exportarCsv, importarCsv, salvarCarteira } from './app/armazenamento';
import { clienteVazio, type Cliente, type DecisaoRegistrada } from './app/tipos';
import { janelaVigente, proximaJanela } from './dominio/calendario';
import { diagnosticar } from './dominio/diagnostico';
import { calcularFatorR } from './dominio/fatorR';
import type { EntradaSimulacao } from './dominio/motorSimulacao';
import { simular } from './dominio/motorSimulacao';
import { CRONOGRAMA_TRANSICAO } from './dominio/transicao';
import { BarraLateral } from './ui/BarraLateral';
import { Comparativo } from './ui/Comparativo';
import { PainelCalendario } from './ui/PainelCalendario';
import { PainelDiagnostico } from './ui/PainelDiagnostico';
import { PainelPerfil } from './ui/PainelPerfil';
import { Projecao } from './ui/Projecao';
import { exportarRelatorio } from './ui/relatorio';
import { periodoBR, reais } from './ui/formatacao';

type Aba = 'simulador' | 'cronograma' | 'projecao';

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
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    salvarCarteira(clientes);
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
    const { clientes: novos, importados, erros } = importarCsv(texto);
    if (importados > 0) {
      setClientes((atual) => [...atual, ...novos]);
      setSelecionadoId(novos[0].id);
    }
    setAviso(
      `${importados} cliente(s) importado(s).` + (erros.length > 0 ? ` ${erros.length} aviso(s): ${erros[0]}` : ''),
    );
  }

  function baixarModeloCsv() {
    const conteudo = exportarCsv(clientes);
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'carteira-simulador.csv';
    link.click();
    URL.revokeObjectURL(url);
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
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void importarArquivo(arquivo);
              e.target.value = '';
            }}
          />
          <button type="button" className="botao" onClick={() => inputArquivo.current?.click()}>
            Importar CSV
          </button>
          <button type="button" className="botao botao--secundario" onClick={baixarModeloCsv}>
            Exportar carteira
          </button>
        </div>
      </header>

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
                ['cronograma', 'Cronograma e prazos'],
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

          {aba !== 'cronograma' && !cliente && (
            <p className="vazio">Selecione ou cadastre um cliente para iniciar a simulação.</p>
          )}

          {aba === 'simulador' && cliente && resultado && diagnostico && (
            <>
              <PainelPerfil
                cliente={cliente}
                onAlterar={alterarCliente}
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
                onExportar={() => exportarRelatorio(cliente, resultado, diagnostico)}
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
      </footer>
    </div>
  );
}
