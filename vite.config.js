import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'SCRAP_');
  // Local integration only. Browser code always calls the same-origin server API.
  const server = env.SCRAP_SERVER_URL || 'http://127.0.0.1:8000';
  const devLogin = command === 'serve' && env.SCRAP_TRANSPORT_DEV_LOGIN === '1';
  return {
    plugins: [react()],
    define: { __SCRAP_TRANSPORT_DEV_LOGIN__: JSON.stringify(devLogin) },
    server: {
      proxy: {
        '/api/v1/transport': { target: server, changeOrigin: true },
        ...(devLogin && { '/api/v1/auth/dev-login': { target: server, changeOrigin: true } }),
        '/api/classification': { target: server, changeOrigin: true },
        '/api/treatment': { target: server, changeOrigin: true },
      },
    },
  };
});
