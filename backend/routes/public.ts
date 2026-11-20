import { Hono } from 'hono';
import { config } from '../../shared/config/index.js';
import { honeypotField, validateApply } from '../../shared/form.js';
import { dbKind } from '../db.js';
import { insertApplication } from '../repo.js';

export const publicRoutes = new Hono();

publicRoutes.get('/health', (c) => c.json({ ok: true, db: dbKind() }));

/** 신청 가능 여부 — 화면은 이 값으로 폼/마감 안내를 결정한다. */
publicRoutes.get('/apply/status', (c) =>
  c.json({ closed: config.apply.closed, message: config.apply.closed ? config.apply.closedMessage : '' }),
);

publicRoutes.post('/apply', async (c) => {
  if (config.apply.closed) return c.json({ error: config.apply.closedMessage }, 403);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
  }

  // 숨김 칸이 채워져 있으면 자동 등록으로 보고 조용히 성공처럼 응답(저장하지 않음)
  const hp = (body as Record<string, unknown> | null)?.[honeypotField];
  if (typeof hp === 'string' && hp.trim() !== '') return c.json({ ok: true, message: config.apply.doneMessage });

  const result = validateApply(body);
  if (!result.ok) return c.json({ error: '입력값을 확인해 주세요.', fields: result.errors }, 422);

  await insertApplication(result.value, config.apply.statuses[0], config.privacy.version);
  return c.json({ ok: true, message: config.apply.doneMessage }, 201);
});
