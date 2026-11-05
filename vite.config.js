import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'SCRAP_');
  // Local integration only. Browser code always calls the same-origin server API.
  const target = env.SCRAP_SERVER_URL || 'http://127.0.0.1:8017';
  return {
    server: {
      proxy: {
        '^/api/treatment/next-step$': {
          target,
          changeOrigin: true,
          rewrite: env.SCRAP_SERVER_URL ? undefined : () => '/kg/next-step',
        },
        '^/api/treatment/facility-candidates$': {
          target,
          changeOrigin: true,
          rewrite: env.SCRAP_SERVER_URL ? undefined : () => '/kg/facility-candidates',
        },
      },
    },
  };
});
