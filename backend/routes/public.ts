import { Hono } from 'hono';
import { config } from '../../shared/config/index.js';
import { honeypotField, validateApply } from '../../shared/form.js';
import { dbKind } from '../db.js';
import { insertApplication } from '../repo.js';
import { getAsset, getOverrides, isValidPage } from '../content.js';

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

/**
 * 화면 편집 수정본 — 방문자 화면의 경량 스크립트가 읽어서 구획을 바꿔 끼운다.
 * fresh=1(관리자)은 캐시 없이, 그 외에는 CDN 에 잠깐(30초) 캐시한다.
 */
publicRoutes.get('/content', async (c) => {
  const page = c.req.query('page') ?? '';
  if (!isValidPage(page)) return c.json({ error: '없는 페이지입니다.' }, 400);
  const overrides = await getOverrides(page);
  if (c.req.query('fresh')) {
    c.header('Cache-Control', 'no-store');
  } else {
    // 브라우저는 매번 확인(no-cache), Vercel CDN 만 30초 캐시 — 저장 후 방문자 반영은 최대 30초 지연
    c.header('Cache-Control', 'no-cache');
    c.header('Vercel-CDN-Cache-Control', 'max-age=30, stale-while-revalidate=300');
  }
  return c.json({ overrides });
});

/** 화면 편집에서 올린 이미지 */
publicRoutes.get('/assets/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return c.json({ error: 'Not Found' }, 404);
  const asset = await getAsset(id);
  if (!asset) return c.json({ error: 'Not Found' }, 404);
  c.header('Content-Type', asset.mime);
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  c.header('X-Content-Type-Options', 'nosniff');
  return c.body(asset.data);
});
