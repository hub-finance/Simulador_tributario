import { useState } from 'react';
import {
  consultaBloqueadaPeloAmbiente,
  consultarCnpj,
  formatarCnpj,
  preencherComDadosDaReceita,
  validarCnpj,
} from '../app/consultaCnpj';
import type { Cliente } from '../app/tipos';
import { fracaoB2BDoPerfil } from '../app/tipos';
import { calcularFatorR } from '../dominio/fatorR';
import type { PerfilCliente } from '../dominio/motorSimulacao';
import { ANEXOS, type NumeroAnexo } from '../dominio/tabelasSimples';
import { percentual, reais } from './formatacao';

interface Props {
  cliente: Cliente;
  onAlterar: (alteracoes: Partial<Cliente>) => void;
  /** Mensagens da consulta ao CNPJ, exibidas na barra de avisos da aplicação. */
  onAvisar: (mensagem: string) => void;
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

export function PainelPerfil({ cliente, onAlterar, onAvisar, ano, onAlterarAno, anosDisponiveis }: Props) {
  const [consultando, setConsultando] = useState(false);
  const cnpjCompleto = validarCnpj(cliente.cnpj);
  // Na página publicada no Claude a consulta externa é bloqueada por política de
  // segurança. Melhor avisar antes do clique do que deixar descobrir pelo erro.
  const consultaBloqueada = consultaBloqueadaPeloAmbiente();

  async function buscarNaReceita() {
    setConsultando(true);
    try {
      const resultado = await consultarCnpj(cliente.cnpj);
      if (resultado.estado === 'ok') {
        const { alteracoes, avisos } = preencherComDadosDaReceita(resultado.dados);
        onAlterar(alteracoes);
        onAvisar(avisos.join(' '));
      } else if (resultado.estado === 'invalido') {
        onAvisar(resultado.motivo);
      } else if (resultado.estado === 'nao-encontrado') {
        onAvisar('CNPJ não encontrado na base da Receita Federal.');
      } else {
        onAvisar(
          `Consulta indisponível: ${resultado.motivo}. Preencha os dados manualmente — o cálculo não depende da consulta.`,
        );
      }
    } finally {
      setConsultando(false);
    }
  }

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
          <span className="campo__entrada campo__entrada--com-acao">
            <input
              type="text"
              inputMode="numeric"
              value={cliente.cnpj}
              placeholder="00.000.000/0001-00"
              onChange={(e) => onAlterar({ cnpj: formatarCnpj(e.target.value) })}
            />
            <button
              type="button"
              className="botao botao--pequeno"
              onClick={() => void buscarNaReceita()}
              disabled={!cnpjCompleto || consultando || consultaBloqueada}
              title={
                consultaBloqueada
                  ? 'Consulta indisponível nesta versão publicada'
                  : cnpjCompleto
                    ? 'Buscar dados na base da Receita Federal'
                    : 'Informe um CNPJ válido'
              }
            >
              {consultando ? 'Buscando…' : 'Buscar'}
            </button>
          </span>
          <small className="campo__ajuda">
            {consultaBloqueada
              ? 'Busca automática indisponível nesta versão publicada — preencha os campos à mão.'
              : cliente.cnpj && !cnpjCompleto
                ? 'CNPJ incompleto ou com dígito verificador incorreto.'
                : 'Preenche razão social, CNAE, anexo sugerido, situação cadastral e sócios.'}
          </small>
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

      {cliente.socios.length > 0 && (
        <p className="faixa-info">
          <strong>Quadro societário:</strong> {cliente.socios.join(', ')}.
        </p>
      )}

      {cliente.cnpjsInterligados.length > 0 && (
        <p className="faixa-info faixa-info--alerta">
          <strong>Grupo econômico detectado por sócio em comum:</strong>{' '}
          {cliente.cnpjsInterligados.map((c) => c.nome).join(', ')} — somando{' '}
          {reais(cliente.cnpjsInterligados.reduce((a, c) => a + c.rbt12, 0))} de RBT12 além deste cliente.
        </p>
      )}
    </section>
  );
}
