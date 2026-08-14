import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * O simulador é publicado como aplicativo instalável (PWA).
 *
 * Na prática isso significa três coisas para quem usa:
 *   - Instala pelo navegador e vira um ícone na área de trabalho ou no celular.
 *   - Abre e funciona sem internet, porque os arquivos ficam guardados na máquina.
 *   - Se atualiza sozinho: quando uma versão nova é publicada, o app avisa e
 *     aplica a atualização com um clique, sem ninguém baixar arquivo de novo.
 *
 * A atualização é por aviso (`prompt`) e não automática de propósito: quem está
 * no meio de uma simulação decide a hora de recarregar.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icone.svg', 'favicon.svg'],
      manifest: {
        name: 'Simulador de Transição Tributária',
        short_name: 'Simulador',
        description:
          'Comparativo entre o modelo Tradicional e o Híbrido do Simples Nacional para a janela de opção de setembro de 2026.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4f6f9',
        theme_color: '#2f5fd0',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        /*
         * Depois que o usuário aceita a atualização, a versão nova precisa assumir a
         * página que já está aberta — sem `clientsClaim` ela só valeria na próxima vez
         * que o app fosse aberto do zero, e o clique em "Atualizar agora" pareceria
         * não ter feito nada. O `skipWaiting` continua desligado de propósito: quem
         * decide a hora de trocar de versão é quem está usando.
         */
        clientsClaim: true,
        skipWaiting: false,
        // A consulta de CNPJ vai à rede e nunca é servida de cache: dado cadastral
        // desatualizado levaria a decisão errada sobre pendência e grupo econômico.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});
