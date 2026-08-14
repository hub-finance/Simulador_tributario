import { useMemo, useState } from 'react';
import { SECOES_AJUDA, type Bloco } from '../conteudo/ajuda';
import { simular, type EntradaSimulacao } from '../dominio/motorSimulacao';
import { percentual, reais } from './formatacao';

/**
 * Entrada do exemplo didático. Fica aqui, e não no texto, porque o exemplo é
 * calculado pelo próprio motor: se uma alíquota mudar, o número da Ajuda muda junto.
 * Número escrito à mão em material didático envelhece e passa a mentir.
 */
const EXEMPLO: EntradaSimulacao = {
  faturamentoMensal: 100_000,
  rbt12: 1_200_000,
  anexo: 1,
  perfil: 'B2B',
  percentualReceitaB2B: 1,
  insumosTributaveis: 40_000,
  ano: 2027,
};

function ExemploCadeia() {
  const r = useMemo(() => simular(EXEMPLO), []);
  const { tradicional, hibrido, comparativo } = r;
  const diferencaPreco =
    comparativo.precoLiquidoParaClientePJ.tradicional - comparativo.precoLiquidoParaClientePJ.hibrido;

  return (
    <div className="exemplo">
      <p className="exemplo__intro">
        Um comércio optante pelo Simples Nacional (Anexo I), com {reais(EXEMPLO.rbt12)} de receita nos últimos
        12 meses, fatura {reais(EXEMPLO.faturamentoMensal)} no mês e comprou {reais(EXEMPLO.insumosTributaveis)} em
        mercadorias que geram crédito. Ele vende para outra empresa. Veja o que acontece em {EXEMPLO.ano}:
      </p>

      <div className="exemplo__colunas">
        <div className="exemplo__coluna">
          <h4>No modelo Tradicional</h4>
          <dl>
            <div>
              <dt>Ele paga de imposto</dt>
              <dd>{reais(tradicional.custoTotal)}</dd>
            </div>
            <div>
              <dt>O comprador aproveita de crédito</dt>
              <dd>{reais(tradicional.creditoTransferido)}</dd>
            </div>
            <div className="exemplo__resultado">
              <dt>Custo real para o comprador</dt>
              <dd>{reais(comparativo.precoLiquidoParaClientePJ.tradicional)}</dd>
            </div>
          </dl>
        </div>

        <div className="exemplo__coluna">
          <h4>No modelo Híbrido</h4>
          <dl>
            <div>
              <dt>Ele paga de imposto</dt>
              <dd>{reais(hibrido.custoTotal)}</dd>
            </div>
            <div>
              <dt>O comprador aproveita de crédito</dt>
              <dd>{reais(hibrido.creditoTransferido)}</dd>
            </div>
            <div className="exemplo__resultado">
              <dt>Custo real para o comprador</dt>
              <dd>{reais(comparativo.precoLiquidoParaClientePJ.hibrido)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <p className="exemplo__conclusao">
        O preço na nota é {reais(EXEMPLO.faturamentoMensal)} nos dois casos. Mas para quem compra, o mesmo
        produto custa <strong>{reais(diferencaPreco)} a mais</strong> quando o fornecedor está no modelo
        Tradicional — porque o crédito que ele consegue aproveitar é menor. O fornecedor pagou{' '}
        {reais(Math.abs(comparativo.economiaCaixaNoHibrido))}{' '}
        {comparativo.economiaCaixaNoHibrido < 0 ? 'a menos' : 'a mais'} de imposto e, mesmo assim, ficou mais
        caro para o cliente dele.
      </p>

      <p className="exemplo__nota">
        Números calculados pelo mesmo motor que roda as simulações da carteira. Se uma alíquota mudar, este
        exemplo muda junto.
      </p>
    </div>
  );
}

function BlocoAjuda({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case 'paragrafo':
      return <p className="ajuda__p">{bloco.texto}</p>;

    case 'destaque':
      return (
        <div className={`ajuda__destaque ajuda__destaque--${bloco.tom}`}>
          {bloco.titulo && <strong>{bloco.titulo}</strong>}
          <p>{bloco.texto}</p>
        </div>
      );

    case 'lista':
      return (
        <ul className="ajuda__lista">
          {bloco.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case 'passos':
      return (
        <ol className="ajuda__passos">
          {bloco.itens.map((item) => (
            <li key={item.titulo}>
              <strong>{item.titulo}</strong>
              <p>{item.texto}</p>
            </li>
          ))}
        </ol>
      );

    case 'tabela':
      return (
        <div className="tabela-rolagem">
          <table className="tabela tabela--ajuda">
            <thead>
              <tr>
                {bloco.colunas.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloco.linhas.map((linha) => (
                <tr key={linha.join('|')}>
                  {linha.map((celula, i) => (
                    <td key={i}>{celula}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'glossario':
      return (
        <dl className="ajuda__glossario">
          {bloco.termos.map((t) => (
            <div key={t.termo} className="termo">
              <dt>{t.termo}</dt>
              <dd>
                <p className="termo__definicao">{t.definicao}</p>
                <p className="termo__explicar">
                  <span>Para o cliente:</span> “{t.comoExplicar}”
                </p>
              </dd>
            </div>
          ))}
        </dl>
      );

    case 'objecoes':
      return (
        <div className="ajuda__objecoes">
          {bloco.itens.map((o) => (
            <details key={o.pergunta}>
              <summary>{o.pergunta}</summary>
              <p>{o.resposta}</p>
            </details>
          ))}
        </div>
      );

    case 'campos':
      return (
        <div className="tabela-rolagem">
          <table className="tabela tabela--ajuda">
            <thead>
              <tr>
                <th>Campo</th>
                <th>O que é</th>
                <th>Onde encontrar o dado</th>
              </tr>
            </thead>
            <tbody>
              {bloco.itens.map((c) => (
                <tr key={c.campo}>
                  <td>
                    <strong>{c.campo}</strong>
                  </td>
                  <td>{c.oQueE}</td>
                  <td>{c.ondeAcha === '—' ? <span className="texto-secundario">calculado pelo sistema</span> : c.ondeAcha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'exemplo-cadeia':
      return <ExemploCadeia />;
  }
}

export function PainelAjuda() {
  const [ativa, setAtiva] = useState(SECOES_AJUDA[0].id);
  const secao = SECOES_AJUDA.find((s) => s.id === ativa) ?? SECOES_AJUDA[0];

  return (
    <section className="secao-ajuda">
      <header className="secao__cabecalho">
        <div>
          <h2>Ajuda</h2>
          <p className="texto-secundario">
            Para entender o assunto e conseguir explicar ao cliente — atual ou futuro.
          </p>
        </div>
      </header>

      <div className="ajuda">
        <nav className="ajuda__indice" aria-label="Seções da ajuda">
          {SECOES_AJUDA.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`ajuda__link ${s.id === ativa ? 'ajuda__link--ativo' : ''}`}
              onClick={() => setAtiva(s.id)}
              aria-current={s.id === ativa ? 'true' : undefined}
            >
              <strong>{s.titulo}</strong>
              <small>{s.resumo}</small>
            </button>
          ))}
        </nav>

        <article className="cartao ajuda__conteudo">
          <h3 className="ajuda__titulo">{secao.titulo}</h3>
          <p className="ajuda__resumo">{secao.resumo}</p>
          {secao.blocos.map((bloco, i) => (
            <BlocoAjuda key={i} bloco={bloco} />
          ))}
        </article>
      </div>
    </section>
  );
}

/** Percentual reexportado para os testes de conteúdo verificarem a formatação. */
export const _formatadores = { reais, percentual };
