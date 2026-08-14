import { statusDoCliente, type Cliente } from '../app/tipos';
import { reaisCompacto } from './formatacao';

interface Props {
  clientes: Cliente[];
  selecionadoId: string | null;
  onSelecionar: (id: string) => void;
  onNovo: () => void;
  onRemover: (id: string) => void;
}

export function BarraLateral({ clientes, selecionadoId, onSelecionar, onNovo, onRemover }: Props) {
  const concluidas = clientes.filter((c) => statusDoCliente(c) === 'concluida').length;
  const progresso = clientes.length > 0 ? concluidas / clientes.length : 0;

  return (
    <aside className="barra-lateral">
      <div className="barra-lateral__topo">
        <div>
          <h2>Carteira</h2>
          <p className="texto-secundario">
            {concluidas} de {clientes.length} com cenário definido
          </p>
        </div>
        <button type="button" className="botao botao--pequeno" onClick={onNovo}>
          + Cliente
        </button>
      </div>

      <div className="progresso" role="progressbar" aria-valuenow={Math.round(progresso * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progresso__barra" style={{ width: `${progresso * 100}%` }} />
      </div>

      <ul className="lista-clientes">
        {clientes.map((cliente) => {
          const status = statusDoCliente(cliente);
          const ativo = cliente.id === selecionadoId;
          return (
            <li key={cliente.id}>
              <button
                type="button"
                className={`item-cliente ${ativo ? 'item-cliente--ativo' : ''}`}
                onClick={() => onSelecionar(cliente.id)}
                aria-current={ativo ? 'true' : undefined}
              >
                <span
                  className={`ponto ponto--${status}`}
                  aria-label={status === 'concluida' ? 'Análise concluída' : 'Pendente de análise'}
                />
                <span className="item-cliente__texto">
                  <strong>{cliente.nome}</strong>
                  <small>
                    Anexo {cliente.anexo} · {cliente.perfil} · RBT12 {reaisCompacto(cliente.rbt12)}
                  </small>
                  {cliente.decisao && <small className="etiqueta-decisao">Decisão: {cliente.decisao.cenario}</small>}
                  {cliente.possuiDebitosEmAberto && <small className="etiqueta-bloqueio">Débitos em aberto</small>}
                </span>
              </button>
              <button
                type="button"
                className="botao-remover"
                onClick={() => onRemover(cliente.id)}
                aria-label={`Remover ${cliente.nome}`}
                title="Remover cliente"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {clientes.length === 0 && (
        <p className="vazio">Nenhum cliente na carteira. Importe o CSV do sistema contábil ou cadastre manualmente.</p>
      )}
    </aside>
  );
}
