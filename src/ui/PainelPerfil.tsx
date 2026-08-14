import type { Cliente } from '../app/tipos';
import { fracaoB2BDoPerfil } from '../app/tipos';
import { calcularFatorR } from '../dominio/fatorR';
import type { PerfilCliente } from '../dominio/motorSimulacao';
import { ANEXOS, type NumeroAnexo } from '../dominio/tabelasSimples';
import { percentual, reais } from './formatacao';

interface Props {
  cliente: Cliente;
  onAlterar: (alteracoes: Partial<Cliente>) => void;
  ano: number;
  onAlterarAno: (ano: number) => void;
  anosDisponiveis: number[];
}

function CampoNumero({
  rotulo,
  valor,
  onChange,
  ajuda,
  sufixo,
}: {
  rotulo: string;
  valor: number;
  onChange: (v: number) => void;
  ajuda?: string;
  sufixo?: string;
}) {
  return (
    <label className="campo">
      <span className="campo__rotulo">{rotulo}</span>
      <span className="campo__entrada">
        {sufixo !== '%' && <span className="campo__prefixo">R$</span>}
        <input
          type="number"
          min={0}
          step="0.01"
          value={Number.isFinite(valor) ? valor : 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {sufixo === '%' && <span className="campo__prefixo">%</span>}
      </span>
      {ajuda && <small className="campo__ajuda">{ajuda}</small>}
    </label>
  );
}

export function PainelPerfil({ cliente, onAlterar, ano, onAlterarAno, anosDisponiveis }: Props) {
  const fatorR = calcularFatorR({ folha12Meses: cliente.folha12Meses, rbt12: cliente.rbt12 });
  const anexoEfetivo: NumeroAnexo = cliente.sujeitoAoFatorR ? fatorR.anexoAplicavel : cliente.anexo;

  const alterarPerfil = (perfil: PerfilCliente) =>
    onAlterar({ perfil, percentualReceitaB2B: fracaoB2BDoPerfil(perfil) });

  return (
    <section className="cartao secao-perfil">
      <header className="secao__cabecalho">
        <h2>Perfil do cliente</h2>
        <label className="seletor-ano">
          Ano simulado
          <select value={ano} onChange={(e) => onAlterarAno(Number(e.target.value))}>
            {anosDisponiveis.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="grade-campos">
        <label className="campo campo--largo">
          <span className="campo__rotulo">Razão social</span>
          <span className="campo__entrada">
            <input type="text" value={cliente.nome} onChange={(e) => onAlterar({ nome: e.target.value })} />
          </span>
        </label>

        <label className="campo">
          <span className="campo__rotulo">CNPJ</span>
          <span className="campo__entrada">
            <input
              type="text"
              value={cliente.cnpj}
              placeholder="00.000.000/0001-00"
              onChange={(e) => onAlterar({ cnpj: e.target.value })}
            />
          </span>
        </label>

        <label className="campo">
          <span className="campo__rotulo">CNAE</span>
          <span className="campo__entrada">
            <input type="text" value={cliente.cnae} onChange={(e) => onAlterar({ cnae: e.target.value })} />
          </span>
        </label>

        <label className="campo">
          <span className="campo__rotulo">Anexo</span>
          <span className="campo__entrada">
            <select
              value={cliente.anexo}
              disabled={cliente.sujeitoAoFatorR}
              onChange={(e) => onAlterar({ anexo: Number(e.target.value) as NumeroAnexo })}
            >
              {Object.values(ANEXOS).map((a) => (
                <option key={a.numero} value={a.numero}>
                  {a.nome}
                </option>
              ))}
            </select>
          </span>
          {cliente.sujeitoAoFatorR && <small className="campo__ajuda">Definido pelo Fator R.</small>}
        </label>

        <CampoNumero
          rotulo="RBT12 (receita bruta 12 meses)"
          valor={cliente.rbt12}
          onChange={(rbt12) => onAlterar({ rbt12 })}
        />
        <CampoNumero
          rotulo="Faturamento do mês"
          valor={cliente.faturamentoMensal}
          onChange={(faturamentoMensal) => onAlterar({ faturamentoMensal })}
        />
        <CampoNumero
          rotulo="Insumos e compras com crédito"
          valor={cliente.insumosTributaveis}
          onChange={(insumosTributaveis) => onAlterar({ insumosTributaveis })}
          ajuda="Base do crédito de IBS/CBS no regime não cumulativo."
        />
        <CampoNumero
          rotulo="Folha de pagamento 12 meses"
          valor={cliente.folha12Meses}
          onChange={(folha12Meses) => onAlterar({ folha12Meses })}
          ajuda="Inclui pró-labore e encargos. Base do Fator R."
        />
        <CampoNumero
          rotulo="Saldo credor de IBS/CBS anterior"
          valor={cliente.saldoCredorAnterior}
          onChange={(saldoCredorAnterior) => onAlterar({ saldoCredorAnterior })}
        />
        <CampoNumero
          rotulo="IBS acumulado em 12 meses"
          valor={cliente.ibsAcumulado12Meses}
          onChange={(ibsAcumulado12Meses) => onAlterar({ ibsAcumulado12Meses })}
          ajuda="O IBS integra a conta do sublimite de faturamento."
        />
      </div>

      <div className="linha-controles">
        <fieldset className="seletor-perfil">
          <legend>Perfil comercial</legend>
          {(['B2C', 'MISTO', 'B2B'] as PerfilCliente[]).map((p) => (
            <label key={p} className={`chip ${cliente.perfil === p ? 'chip--ativo' : ''}`}>
              <input
                type="radio"
                name="perfil"
                checked={cliente.perfil === p}
                onChange={() => alterarPerfil(p)}
              />
              {p === 'B2C' ? 'B2C — Consumidor' : p === 'B2B' ? 'B2B — Corporativo' : 'Misto'}
            </label>
          ))}
        </fieldset>

        <label className="campo campo--deslizante">
          <span className="campo__rotulo">
            Receita vendida a PJ: <strong>{percentual(cliente.percentualReceitaB2B, 0)}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(cliente.percentualReceitaB2B * 100)}
            onChange={(e) => onAlterar({ percentualReceitaB2B: Number(e.target.value) / 100 })}
          />
          <small className="campo__ajuda">
            É esta fração que dá valor econômico ao crédito transferido — o eixo da decisão.
          </small>
        </label>
      </div>

      <div className="linha-controles">
        <label className="alternador">
          <input
            type="checkbox"
            checked={cliente.sujeitoAoFatorR}
            onChange={(e) => onAlterar({ sujeitoAoFatorR: e.target.checked })}
          />
          Atividade sujeita ao Fator R
        </label>
        <label className="alternador">
          <input
            type="checkbox"
            checked={cliente.possuiDebitosEmAberto}
            onChange={(e) => onAlterar({ possuiDebitosEmAberto: e.target.checked })}
          />
          Débitos fiscais em aberto
        </label>
        <label className="alternador">
          <input
            type="checkbox"
            checked={cliente.possuiPendenciasCadastrais}
            onChange={(e) => onAlterar({ possuiPendenciasCadastrais: e.target.checked })}
          />
          Pendências cadastrais
        </label>
        {cliente.possuiDebitosEmAberto && (
          <CampoNumero
            rotulo="Valor dos débitos"
            valor={cliente.valorDebitos}
            onChange={(valorDebitos) => onAlterar({ valorDebitos })}
          />
        )}
      </div>

      {cliente.sujeitoAoFatorR && (
        <p className={`faixa-info ${fatorR.atingePiso ? 'faixa-info--ok' : 'faixa-info--alerta'}`}>
          <strong>Fator R:</strong> {fatorR.mensagem}
          {!fatorR.atingePiso && cliente.rbt12 > 0 && (
            <> Simulação rodando no <strong>{ANEXOS[anexoEfetivo].nome}</strong>.</>
          )}
        </p>
      )}

      {cliente.cnpjsInterligados.length > 0 && (
        <p className="faixa-info">
          <strong>Grupo econômico:</strong> {cliente.cnpjsInterligados.length} CNPJ(s) interligado(s), somando{' '}
          {reais(cliente.cnpjsInterligados.reduce((a, c) => a + c.rbt12, 0))} de RBT12.
        </p>
      )}
    </section>
  );
}
