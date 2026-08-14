/**
 * Registro do aplicativo instalável e controle de atualização.
 *
 * O registro só faz sentido quando o simulador está publicado em um servidor.
 * Aberto como arquivo solto (`file://`), o navegador não permite instalar nem
 * guardar versão — nesse caso a função não faz nada e o simulador segue normal.
 */

export interface EstadoAtualizacao {
  /** Uma versão nova foi publicada e está pronta para ser aplicada. */
  temAtualizacao: boolean;
  /** Aplica a atualização e recarrega a página. */
  atualizar: () => void;
  /** O app está pronto para funcionar sem internet. */
  prontoParaOffline: boolean;
}

type AoMudar = (estado: Omit<EstadoAtualizacao, 'atualizar'> & { atualizar: () => void }) => void;

/** True quando o ambiente permite instalar e guardar o app. */
export function suportaInstalacao(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof location !== 'undefined' &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  );
}

/**
 * Registra o app e avisa quando houver versão nova.
 *
 * A importação do registrador é dinâmica para que o simulador continue montando
 * mesmo em ambiente onde o módulo não exista — o arquivo único gerado para uso
 * offline, por exemplo.
 */
export async function registrarAplicativo(aoMudar: AoMudar): Promise<void> {
  if (!suportaInstalacao()) return;

  try {
    const { registerSW } = await import('virtual:pwa-register');

    const pedirTroca = registerSW({
      immediate: true,
      onNeedRefresh() {
        aoMudar({
          temAtualizacao: true,
          prontoParaOffline: true,
          atualizar: () => aplicarAtualizacao(() => pedirTroca(true)),
        });
      },
      onOfflineReady() {
        aoMudar({
          temAtualizacao: false,
          prontoParaOffline: true,
          atualizar: () => aplicarAtualizacao(() => pedirTroca(true)),
        });
      },
    });
  } catch {
    // Sem registrador disponível: o simulador funciona igual, só não instala.
  }
}

/**
 * Aplica a versão nova e recarrega a página.
 *
 * O recarregamento é feito aqui, e não delegado ao registrador, porque sem ele a
 * troca acontece só na camada de armazenamento: a versão nova fica ativa, mas a
 * página continua rodando o código antigo que já está na memória — e o clique em
 * "Atualizar agora" pareceria não ter feito nada.
 *
 * Duas rotas levam ao recarregamento, a primeira que chegar vence: o aviso de que a
 * versão nova assumiu o controle, e um limite de tempo para o caso de esse aviso não
 * vir. Nunca recarrega duas vezes.
 */
function aplicarAtualizacao(pedirTroca: () => Promise<void>): void {
  let jaRecarregou = false;
  const recarregar = () => {
    if (jaRecarregou) return;
    jaRecarregou = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', recarregar, { once: true });
  void Promise.resolve(pedirTroca()).finally(() => window.setTimeout(recarregar, 1_500));
}
