import type { Documento } from '../relatorios/documento';
import { baixar, descreverEntrega, imprimir, visualizar } from '../relatorios/entrega';
import type { ResumoCarteira } from '../dominio/segmentacao';
import { reais } from './formatacao';

interface DocumentoDisponivel {
  chave: string;
  titulo: string;
  publico: string;
  quandoUsar: string;
  conteudo: string[];
  gerar: () => Documento;
  /** Motivo pelo qual o documento não pode ser gerado agora, se houver. */
  indisponivel?: string;
}

interface Props {
  documentos: DocumentoDisponivel[];
  resumo: ResumoCarteira | null;
  onResultado: (mensagem: string) => void;
}

export type { DocumentoDisponivel };

export function PainelRelatorios({ documentos, resumo, onResultado }: Props) {
  async function executar(acao: 'visualizar' | 'imprimir' | 'baixar', doc: DocumentoDisponivel) {
    try {
      const documento = doc.gerar();
      const resultado =
        acao === 'baixar' ? await baixar(documento) : acao === 'imprimir' ? imprimir(documento) : visualizar(documento);
      onResultado(descreverEntrega(resultado));
    } catch (erro) {
      onResultado(`Erro ao gerar o relatório: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  return (
    <section className="secao-relatorios">
      <header className="secao__cabecalho">
        <h2>Relatórios</h2>
        <p className="texto-secundario">
          Documentos prontos para reunião. Baixe o arquivo para anexar em e-mail ou imprima em PDF.
        </p>
      </header>

      {resumo && (
        <div className="cartao faixa-comparativo">
          <div>
            <span className="texto-secundario">Clientes na carteira</span>
            <strong>{resumo.total}</strong>
          </div>
          <div>
            <span className="texto-secundario">Com cenário definido</span>
            <strong className={resumo.decididos === resumo.total ? 'positivo' : undefined}>
              {resumo.decididos} de {resumo.total}
            </strong>
          </div>
          <div>
            <span className="texto-secundario">Bloqueados por pendência</span>
            <strong className={resumo.comBloqueio > 0 ? 'negativo' : 'positivo'}>{resumo.comBloqueio}</strong>
          </div>
          <div>
            <span className="texto-secundario">Crédito adicional em jogo</span>
            <strong>{reais(resumo.totalGanhoDeCredito)}</strong>
          </div>
        </div>
      )}

      <div className="grade-relatorios">
        {documentos.map((doc) => (
          <article key={doc.chave} className={`cartao cartao-relatorio ${doc.indisponivel ? 'cartao-relatorio--off' : ''}`}>
            <h3>{doc.titulo}</h3>
            <p className="etiqueta-publico">{doc.publico}</p>
            <p className="texto-secundario">{doc.quandoUsar}</p>

            <ul className="lista-conteudo">
              {doc.conteudo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {doc.indisponivel ? (
              <p className="nota nota--limitado">{doc.indisponivel}</p>
            ) : (
              <div className="acoes">
                <button type="button" className="botao" onClick={() => void executar('baixar', doc)}>
                  Baixar arquivo
                </button>
                <button type="button" className="botao botao--secundario" onClick={() => void executar('imprimir', doc)}>
                  Imprimir / PDF
                </button>
                <button
                  type="button"
                  className="botao botao--secundario"
                  onClick={() => void executar('visualizar', doc)}
                >
                  Visualizar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
