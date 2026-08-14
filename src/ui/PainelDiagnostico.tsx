import { useState } from 'react';
import type { Cliente, DecisaoRegistrada } from '../app/tipos';
import type { Diagnostico } from '../dominio/diagnostico';
import { reais } from './formatacao';

interface Props {
  cliente: Cliente;
  diagnostico: Diagnostico;
  onRegistrarDecisao: (decisao: DecisaoRegistrada) => void;
  onLimparDecisao: () => void;
  onExportar: () => void;
}

const ICONE: Record<string, string> = {
  bloqueio: '⛔',
  risco: '⚠️',
  atencao: '●',
  informacao: 'ℹ️',
};

export function PainelDiagnostico({
  cliente,
  diagnostico,
  onRegistrarDecisao,
  onLimparDecisao,
  onExportar,
}: Props) {
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [janela, setJanela] = useState<DecisaoRegistrada['janela']>('Setembro/2026');
  const [cenario, setCenario] = useState<DecisaoRegistrada['cenario']>(diagnostico.recomendacao);

  const tomDaCaixa = diagnostico.possuiBloqueio
    ? 'diagnostico--bloqueio'
    : diagnostico.alertas.some((a) => a.severidade === 'risco')
      ? 'diagnostico--risco'
      : 'diagnostico--ok';

  return (
    <section className="secao-diagnostico">
      <header className="secao__cabecalho">
        <h2>Painel de decisão</h2>
      </header>

      <div className={`cartao caixa-diagnostico ${tomDaCaixa}`}>
        <div className="caixa-diagnostico__topo">
          <div>
            <span className="texto-secundario">Recomendação do motor</span>
            <p className="recomendacao">{diagnostico.recomendacao}</p>
          </div>
          <span className={`selo-confianca selo-confianca--${diagnostico.confianca}`}>
            Confiança {diagnostico.confianca}
          </span>
        </div>

        <p className="justificativa">{diagnostico.justificativa}</p>

        {diagnostico.pontoDeEquilibrioComercial > 0 && (
          <p className="ponto-equilibrio">
            <strong>Ponto de equilíbrio comercial:</strong> o modelo Híbrido pode custar até{' '}
            {reais(diagnostico.pontoDeEquilibrioComercial)} a mais por mês e ainda assim compensar, pelo crédito
            adicional que o cliente PJ passa a aproveitar.
          </p>
        )}
      </div>

      {diagnostico.alertas.length > 0 && (
        <ul className="lista-alertas">
          {diagnostico.alertas.map((alerta, i) => (
            <li key={`${alerta.titulo}-${i}`} className={`alerta alerta--${alerta.severidade}`}>
              <span className="alerta__icone" aria-hidden="true">
                {ICONE[alerta.severidade]}
              </span>
              <div>
                <strong>{alerta.titulo}</strong>
                <p>{alerta.detalhe}</p>
                <small className="texto-secundario">Regra: {alerta.origem}</small>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="cartao registro-decisao">
        <h3>Registrar decisão</h3>
        {cliente.decisao ? (
          <div className="decisao-registrada">
            <p>
              <strong>{cliente.decisao.cenario}</strong> — janela de {cliente.decisao.janela}, registrada em{' '}
              {new Date(cliente.decisao.registradaEm).toLocaleString('pt-BR')} por{' '}
              {cliente.decisao.responsavel || 'não informado'}.
            </p>
            {cliente.decisao.observacao && <p className="texto-secundario">{cliente.decisao.observacao}</p>}
            {cliente.decisao.janela === 'Setembro/2026' && (
              <p className="nota nota--limitado">
                Cancelamento possível até 30/11/2026. Após essa data a opção é irretratável.
              </p>
            )}
            <button type="button" className="botao botao--secundario" onClick={onLimparDecisao}>
              Reabrir análise
            </button>
          </div>
        ) : (
          <form
            className="formulario-decisao"
            onSubmit={(e) => {
              e.preventDefault();
              onRegistrarDecisao({
                cenario,
                janela,
                registradaEm: new Date().toISOString(),
                responsavel,
                observacao,
              });
            }}
          >
            <div className="formulario-decisao__linha">
              <label className="campo">
                <span className="campo__rotulo">Cenário escolhido</span>
                <span className="campo__entrada">
                  <select value={cenario} onChange={(e) => setCenario(e.target.value as DecisaoRegistrada['cenario'])}>
                    <option value="Tradicional">Tradicional</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </span>
              </label>
              <label className="campo">
                <span className="campo__rotulo">Janela</span>
                <span className="campo__entrada">
                  <select value={janela} onChange={(e) => setJanela(e.target.value as DecisaoRegistrada['janela'])}>
                    <option value="Setembro/2026">Setembro/2026 — 1º semestre de 2027</option>
                    <option value="Março/2027">Março/2027 — 2º semestre de 2027</option>
                  </select>
                </span>
              </label>
              <label className="campo">
                <span className="campo__rotulo">Responsável</span>
                <span className="campo__entrada">
                  <input
                    type="text"
                    value={responsavel}
                    placeholder="Quem conduziu a análise"
                    onChange={(e) => setResponsavel(e.target.value)}
                  />
                </span>
              </label>
            </div>
            <label className="campo campo--largo">
              <span className="campo__rotulo">Observação</span>
              <span className="campo__entrada">
                <textarea
                  rows={2}
                  value={observacao}
                  placeholder="Contexto da decisão, contratos B2B em risco, compromissos assumidos com o cliente…"
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </span>
            </label>
            <div className="acoes">
              <button type="submit" className="botao" disabled={diagnostico.possuiBloqueio}>
                Salvar decisão
              </button>
              <button type="button" className="botao botao--secundario" onClick={onExportar}>
                Exportar relatório
              </button>
            </div>
            {diagnostico.possuiBloqueio && (
              <p className="nota nota--limitado">
                Há bloqueio cadastral em aberto. Regularize antes de formalizar a opção — a decisão não pode ser
                registrada como definitiva.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
