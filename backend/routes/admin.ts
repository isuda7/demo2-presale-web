import { Hono, type Context } from 'hono';
import { config } from '../../shared/config/index.js';
import { authConfigured, checkPassword, clearToken, isAuthed, issueToken, requireAdmin } from '../auth.js';
import { toCsv } from '../csv.js';
import { allApplications, deleteApplication, listApplications, updateStatus, type ListFilter } from '../repo.js';

export const adminRoutes = new Hono();

function readFilter(c: Context): ListFilter {
  const q = c.req.query();
  return {
    q: q.q?.trim().slice(0, 100) || undefined,
    status: q.status && config.apply.statuses.includes(q.status) ? q.status : undefined,
    from: q.from || undefined,
    to: q.to || undefined,
  };
}

function readId(c: Context): number | null {
  const id = Number(c.req.param('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

adminRoutes.post('/login', async (c) => {
  if (!authConfigured()) return c.json({ error: '관리자 환경변수가 설정되지 않았습니다.' }, 503);
  const body = (await c.req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !checkPassword(password)) return c.json({ error: '비밀번호가 올바르지 않습니다.' }, 401);
  await issueToken(c);
  return c.json({ ok: true });
});

adminRoutes.post('/logout', (c) => {
  clearToken(c);
  return c.json({ ok: true });
});

adminRoutes.get('/me', async (c) => c.json({ authed: await isAuthed(c), configured: authConfigured() }));

// ── 이하 로그인 필요 ──
adminRoutes.use('/applications', requireAdmin);
adminRoutes.use('/applications/*', requireAdmin);
adminRoutes.use('/export.csv', requireAdmin);

adminRoutes.get('/applications', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const size = config.admin.pageSize;
  const { total, rows } = await listApplications(readFilter(c), page, size);
  return c.json({ total, page, size, statuses: config.apply.statuses, rows });
});

adminRoutes.patch('/applications/:id', async (c) => {
  const id = readId(c);
  if (!id) return c.json({ error: '잘못된 번호입니다.' }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { status?: unknown };
  if (typeof body.status !== 'string' || !config.apply.statuses.includes(body.status)) {
    return c.json({ error: '허용되지 않은 상태값입니다.' }, 400);
  }
  return (await updateStatus(id, body.status)) ? c.json({ ok: true }) : c.json({ error: '없는 신청입니다.' }, 404);
});

adminRoutes.delete('/applications/:id', async (c) => {
  const id = readId(c);
  if (!id) return c.json({ error: '잘못된 번호입니다.' }, 400);
  return (await deleteApplication(id)) ? c.json({ ok: true }) : c.json({ error: '없는 신청입니다.' }, 404);
});

adminRoutes.get('/export.csv', async (c) => {
  const rows = await allApplications(readFilter(c));
  const stamp = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="applications-${stamp}.csv"`);
  c.header('Cache-Control', 'no-store');
  return c.body(toCsv(rows));
});
