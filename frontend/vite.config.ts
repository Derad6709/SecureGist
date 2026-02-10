import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        devOptions: {
          enabled: false
        },
        manifest: {
          name: 'SecureGist',
          short_name: 'SecureGist',
          description: 'Secure, encrypted, local-first gist sharing.',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'vite.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'vite.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  };
})
