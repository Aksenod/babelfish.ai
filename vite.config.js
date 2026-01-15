import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // В режиме разработки используем корневой путь, в продакшене - /babelfish.ai/
  const base = command === 'serve' ? '/' : '/babelfish.ai/';
  
  return {
    base,
    plugins: [react()],
    resolve: {
      // Remove alias - use actual package from node_modules
      // This allows subpaths like 'onnxruntime-web/wasm' to work correctly
    },
    server: {
      cors: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      fs: {
        // Allow serving files from the project root
        allow: ['..'],
      },
      proxy: {
        '/api/yandex-translate': {
          target: 'https://translate.api.cloud.yandex.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/yandex-translate/, '/translate/v2/translate'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Передаём Authorization заголовок из оригинального запроса
              const authHeader = req.headers['authorization'];
              if (authHeader) {
                proxyReq.setHeader('Authorization', authHeader);
              }
            });
          },
        },
        '/hf': {
          target: 'https://huggingface.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/hf/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ['@xenova/transformers', 'onnxruntime-web'],
    },
    worker: {
      format: 'es',
      plugins: () => [react()],
      rollupOptions: {
        output: {
          // Ensure WASM files are handled correctly in workers
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
              return 'assets/[name][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Ensure WASM files are handled correctly
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
              return 'assets/[name][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
  };
});
