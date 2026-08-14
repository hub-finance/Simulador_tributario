import { linhaDoTempo, type StatusEvento } from '../dominio/calendario';
import { periodoBR } from './formatacao';

interface Props {
  referencia: Date;
  onAlterarReferencia: (data: Date) => void;
}

const ROTULO_CATEGORIA: Record<string, string> = {
  'janela-opcao': 'Janela de opção',
  'prazo-irretratavel': 'Prazo irretratável',
  'obrigacao-acessoria': 'Obrigação acessória',
  'marco-operacional': 'Marco operacional',
  'preparacao-escritorio': 'Preparação do escritório',
};

function textoSituacao(s: StatusEvento): string {
  if (s.situacao === 'aberto') {
    return s.diasRestantes === 0 ? 'Encerra hoje' : `Aberto — ${s.diasRestantes} dia(s) restantes`;
  }
  if (s.situacao === 'futuro') {
    return `Abre em ${s.diasRestantes} dia(s)`;
  }
  return `Encerrado há ${Math.abs(s.diasRestantes)} dia(s)`;
}

export function PainelCalendario({ referencia, onAlterarReferencia }: Props) {
  const eventos = linhaDoTempo(referencia);

  return (
    <section className="secao-calendario">
      <header className="secao__cabecalho">
        <h2>Cronograma da transição</h2>
        <label className="seletor-ano">
          Data de referência
          <input
            type="date"
            value={referencia.toISOString().slice(0, 10)}
            onChange={(e) => {
              const [ano, mes, dia] = e.target.value.split('-').map(Number);
              if (ano && mes && dia) onAlterarReferencia(new Date(Date.UTC(ano, mes - 1, dia)));
            }}
          />
        </label>
      </header>

      <ol className="linha-tempo">
        {eventos.map(({ evento, situacao, diasRestantes }) => (
          <li
            key={evento.id}
            className={`evento evento--${situacao} evento--${evento.criticidade}`}
          >
            <div className="evento__marcador" aria-hidden="true" />
            <div className="evento__conteudo">
              <div className="evento__cabecalho">
                <span className="evento__categoria">{ROTULO_CATEGORIA[evento.categoria]}</span>
                <span className={`evento__situacao evento__situacao--${situacao}`}>
                  {textoSituacao({ evento, situacao, diasRestantes })}
                </span>
              </div>
              <h3>{evento.titulo}</h3>
              <p className="evento__periodo">{periodoBR(evento.inicio, evento.fim)}</p>
              <p>{evento.descricao}</p>
              <p className="evento__consequencia">
                <strong>Se perder o prazo:</strong> {evento.consequencia}
              </p>
              <div className="evento__meta">
                <span>Responsável: {evento.responsavel}</span>
                {evento.efeitoSobre && <span>Efeito: {evento.efeitoSobre}</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
