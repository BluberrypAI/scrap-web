import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'SCRAP_');
  // 브라우저는 항상 같은 출처로 호출하고, 개발 서버가 server로 넘긴다 (운영은 nginx).
  // 회원·기업·문진(/api/v1)과 처리 경로(/api/treatment)는 모두 server가 제공한다.
  const target = env.SCRAP_SERVER_URL || 'http://127.0.0.1:8000';
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1': { target, changeOrigin: true },
        '/api/treatment': { target, changeOrigin: true },
      },
    },
  };
});
