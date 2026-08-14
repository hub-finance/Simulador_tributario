import type { ResultadoSimulacao } from '../dominio/motorSimulacao';
import { percentual, reais } from './formatacao';

interface Props {
  resultado: ResultadoSimulacao;
  recomendacao: 'Tradicional' | 'Híbrido';
}

function LinhaDetalhe({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={`detalhe ${forte ? 'detalhe--forte' : ''}`}>
      <span>{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}

export function Comparativo({ resultado, recomendacao }: Props) {
  const { tradicional, hibrido, comparativo, aliquotaEfetivaSimples, aliquotaIbsCbs, faixa, parametrosAno } =
    resultado;

  return (
    <section className="secao-comparativo">
      <header className="secao__cabecalho">
        <h2>Comparativo financeiro — {parametrosAno.ano}</h2>
        <p className="texto-secundario">
          Faixa {faixa.faixa} · alíquota efetiva do Simples {percentual(aliquotaEfetivaSimples)} · IBS+CBS no regime
          regular {percentual(aliquotaIbsCbs)}
        </p>
      </header>

      <div className="cartoes-cenarios">
        <article className={`cartao cartao--cenario ${recomendacao === 'Tradicional' ? 'cartao--recomendado' : ''}`}>
          <div className="cartao__topo">
            <h3>Cenário Tradicional</h3>
            {recomendacao === 'Tradicional' && <span className="selo">Recomendado</span>}
          </div>
          <p className="texto-secundario">Manter tudo dentro do DAS — guia única.</p>

          <p className="valor-destaque">{reais(tradicional.custoTotal)}</p>
          <p className="texto-secundario">Guia DAS do mês</p>

          <div className="detalhes">
            <LinhaDetalhe rotulo="IRPJ" valor={reais(tradicional.decomposicao.irpj)} />
            <LinhaDetalhe rotulo="CSLL" valor={reais(tradicional.decomposicao.csll)} />
            <LinhaDetalhe rotulo="CPP (INSS patronal)" valor={reais(tradicional.decomposicao.cpp)} />
            <LinhaDetalhe
              rotulo={parametrosAno.fracaoPisCofins > 0 ? 'PIS/Cofins' : 'CBS embutida'}
              valor={reais(tradicional.decomposicao.pisCofinsOuCBS)}
            />
            <LinhaDetalhe
              rotulo={parametrosAno.fracaoIcmsIss === 1 ? 'ICMS/ISS' : 'ICMS/ISS + IBS embutido'}
              valor={reais(tradicional.decomposicao.icmsIssOuIBS)}
            />
            {tradicional.decomposicao.ipi > 0 && (
              <LinhaDetalhe rotulo="IPI" valor={reais(tradicional.decomposicao.ipi)} />
            )}
          </div>

          <footer className="cartao__rodape">
            <LinhaDetalhe
              rotulo="Crédito repassado ao cliente PJ"
              valor={reais(tradicional.creditoTransferido)}
              forte
            />
            <p className="nota nota--limitado">
              Limitado ao IBS/CBS efetivamente pago dentro da guia.
            </p>
          </footer>
        </article>

        <article className={`cartao cartao--cenario ${recomendacao === 'Híbrido' ? 'cartao--recomendado' : ''}`}>
          <div className="cartao__topo">
            <h3>Cenário Híbrido</h3>
            {recomendacao === 'Híbrido' && <span className="selo">Recomendado</span>}
          </div>
          <p className="texto-secundario">IBS e CBS por fora, pelo regime não cumulativo.</p>

          <p className="valor-destaque">{reais(hibrido.custoTotal)}</p>
          <p className="texto-secundario">DAS reduzido + guia de IBS/CBS</p>

          <div className="detalhes">
            <LinhaDetalhe rotulo="DAS reduzido" valor={reais(hibrido.dasReduzido)} forte />
            <LinhaDetalhe rotulo="— IRPJ" valor={reais(hibrido.decomposicao.irpj)} />
            <LinhaDetalhe rotulo="— CSLL" valor={reais(hibrido.decomposicao.csll)} />
            <LinhaDetalhe rotulo="— CPP (INSS patronal)" valor={reais(hibrido.decomposicao.cpp)} />
            {hibrido.decomposicao.icmsIssOuIBS > 0 && (
              <LinhaDetalhe rotulo="— ICMS/ISS ainda no DAS" valor={reais(hibrido.decomposicao.icmsIssOuIBS)} />
            )}
            <LinhaDetalhe rotulo="Débito IBS/CBS" valor={reais(hibrido.debitoIbsCbs)} />
            <LinhaDetalhe rotulo="Crédito sobre insumos" valor={`− ${reais(hibrido.creditoIbsCbs)}`} />
            <LinhaDetalhe rotulo="Guia IBS/CBS" valor={reais(hibrido.guiaIbsCbs)} forte />
            {hibrido.saldoCredorAcumulado > 0 && (
              <LinhaDetalhe rotulo="Saldo credor a transportar" valor={reais(hibrido.saldoCredorAcumulado)} />
            )}
          </div>

          <footer className="cartao__rodape">
            <LinhaDetalhe rotulo="Crédito repassado ao cliente PJ" valor={reais(hibrido.creditoTransferido)} forte />
            <p className="nota nota--integral">Integral (100% do destaque na nota).</p>
          </footer>
        </article>
      </div>

      <div className="cartao faixa-comparativo">
        <div>
          <span className="texto-secundario">Diferença em caixa</span>
          <strong className={comparativo.economiaCaixaNoHibrido >= 0 ? 'positivo' : 'negativo'}>
            {comparativo.economiaCaixaNoHibrido >= 0 ? 'Híbrido economiza ' : 'Híbrido custa mais '}
            {reais(Math.abs(comparativo.economiaCaixaNoHibrido))}
          </strong>
        </div>
        <div>
          <span className="texto-secundario">Ganho de crédito ao cliente PJ</span>
          <strong className={comparativo.ganhoDeCreditoNoHibrido >= 0 ? 'positivo' : 'negativo'}>
            {reais(comparativo.ganhoDeCreditoNoHibrido)}
          </strong>
        </div>
        <div>
          <span className="texto-secundario">Preço líquido p/ comprador PJ</span>
          <strong>
            {reais(comparativo.precoLiquidoParaClientePJ.hibrido)} vs{' '}
            {reais(comparativo.precoLiquidoParaClientePJ.tradicional)}
          </strong>
        </div>
        <div>
          <span className="texto-secundario">Vantagem ponderada pelo mix</span>
          <strong className={comparativo.vantagemPonderada >= 0 ? 'positivo' : 'negativo'}>
            {reais(comparativo.vantagemPonderada)}
          </strong>
        </div>
      </div>
    </section>
  );
}
