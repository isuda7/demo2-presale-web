import { serve } from '@hono/node-server';

// 로컬 전용: .env.local 을 읽는다(없으면 무시). 앱을 불러오기 전에 실행해야 한다.
try {
  process.loadEnvFile('.env.local');
} catch {
  console.warn('[dev] .env.local 이 없습니다 — 관리자 로그인은 비활성 상태로 실행합니다.');
}

const { app } = await import('./app.js');
const { dbKind } = await import('./db.js');

const port = Number(process.env.API_PORT) || 8797;
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`[dev] API http://localhost:${port}/api  (DB: ${dbKind()})`);
});
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[dev] ${port} 포트를 다른 프로그램이 쓰고 있습니다. API_PORT=다른번호 npm run dev 로 실행하세요.`);
    process.exit(1);
  }
  throw err;
});
