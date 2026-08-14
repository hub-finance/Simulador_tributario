import { simularHorizonte, type EntradaSimulacao } from '../dominio/motorSimulacao';
import { CRONOGRAMA_TRANSICAO } from '../dominio/transicao';
import { percentual, reais } from './formatacao';

interface Props {
  entrada: EntradaSimulacao;
}

/**
 * Projeção ano a ano. É o gráfico que muda a conversa com o cliente: a decisão de
 * setembro vale para um semestre, mas o desenho de preço precisa olhar até 2033.
 */
export function Projecao({ entrada }: Props) {
  const anos = CRONOGRAMA_TRANSICAO.map((a) => a.ano);
  const serie = simularHorizonte(entrada, anos);
  const maximo = Math.max(...serie.flatMap((r) => [r.tradicional.custoTotal, r.hibrido.custoTotal]), 1);

  return (
    <section className="secao-projecao">
      <header className="secao__cabecalho">
        <h2>Projeção ao longo da transição (2026–2033)</h2>
        <p className="texto-secundario">
          Mesmos dados do mês, aplicados às alíquotas de cada ano do cronograma.
        </p>
      </header>

      <div className="cartao">
        <div className="grafico" role="img" aria-label="Comparativo de custo por ano entre os cenários Tradicional e Híbrido">
          {serie.map((r) => (
            <div key={r.parametrosAno.ano} className="grafico__coluna">
              <div className="grafico__barras">
                <div
                  className="grafico__barra grafico__barra--tradicional"
                  style={{ height: `${(r.tradicional.custoTotal / maximo) * 100}%` }}
                  title={`Tradicional ${r.parametrosAno.ano}: ${reais(r.tradicional.custoTotal)}`}
                />
                <div
                  className="grafico__barra grafico__barra--hibrido"
                  style={{ height: `${(r.hibrido.custoTotal / maximo) * 100}%` }}
                  title={`Híbrido ${r.parametrosAno.ano}: ${reais(r.hibrido.custoTotal)}`}
                />
              </div>
              <span className="grafico__rotulo">{r.parametrosAno.ano}</span>
            </div>
          ))}
        </div>

        <div className="legenda">
          <span className="legenda__item">
            <i className="amostra amostra--tradicional" /> Tradicional
          </span>
          <span className="legenda__item">
            <i className="amostra amostra--hibrido" /> Híbrido
          </span>
        </div>

        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Ano</th>
                <th>IBS+CBS</th>
                <th>Tradicional</th>
                <th>Híbrido</th>
                <th>Diferença</th>
                <th>Crédito ao cliente PJ</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((r) => (
                <tr key={r.parametrosAno.ano}>
                  <td>{r.parametrosAno.ano}</td>
                  <td>{percentual(r.aliquotaIbsCbs)}</td>
                  <td>{reais(r.tradicional.custoTotal)}</td>
                  <td>{reais(r.hibrido.custoTotal)}</td>
                  <td className={r.comparativo.economiaCaixaNoHibrido >= 0 ? 'positivo' : 'negativo'}>
                    {reais(r.comparativo.economiaCaixaNoHibrido)}
                  </td>
                  <td>
                    {reais(r.tradicional.creditoTransferido)} → {reais(r.hibrido.creditoTransferido)}
                  </td>
                  <td className="celula-observacao">
                    {r.parametrosAno.opcaoHibridaDisponivel ? 'Opção vigente' : 'Projeção (opção não vigente)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
