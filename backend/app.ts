import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';

/** API 앱 — 로컬(backend/dev.ts)과 Vercel(api/index.ts)이 같은 앱을 사용한다. */
export const app = new Hono().basePath('/api');

app.use('*', secureHeaders());
app.use('*', async (c, next) => {
  await next();
  // 라우트가 따로 정하지 않았으면 캐시하지 않음
  if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'no-store');
});

app.route('/', publicRoutes);
app.route('/admin', adminRoutes);

app.notFound((c) => c.json({ error: 'Not Found' }, 404));
app.onError((err, c) => {
  console.error('[api]', err);
  return c.json({ error: '서버 오류가 발생했습니다.' }, 500);
});
