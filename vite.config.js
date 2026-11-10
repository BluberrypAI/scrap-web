import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'SCRAP_');
  // Local integration only. Browser code always calls the same-origin server API.
  const target = env.SCRAP_SERVER_URL || 'http://127.0.0.1:8017';
  // 회원·기업 API(/api/v1)는 항상 server로 보낸다. 쿠키 로그인이라 같은 출처로 호출해야 한다.
  const apiTarget = env.SCRAP_SERVER_URL || 'http://127.0.0.1:8000';
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1': { target: apiTarget, changeOrigin: true },
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
