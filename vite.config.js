import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/babelfish.ai/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/yandex-translate': {
        target: 'https://translate.api.cloud.yandex.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yandex-translate/, '/translate/v2/translate'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Передаём Authorization заголовок из оригинального запроса
            const authHeader = req.headers['authorization'];
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader);
            }
          });
        },
      },
    },
  },
});
