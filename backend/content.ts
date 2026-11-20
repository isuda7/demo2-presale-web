import sanitizeHtml from 'sanitize-html';
import { getDb } from './db.js';
import { nowIso } from './time.js';
import { config } from '../shared/config/index.js';

/**
 * 화면 편집 저장소
 * - 구획 키(slot) = "<페이지 key>.<구획 id>" — 설정(shared/config)에 있는 구획만 허용
 * - 저장 전에 허용 태그·속성만 남긴다(스크립트·이벤트 속성 등 제거)
 */

export const MAX_HTML_BYTES = 200_000;
export const MAX_ASSET_BYTES = 3 * 1024 * 1024;
export const ASSET_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export function isValidSlot(slot: string): boolean {
  const [pageKey, sectionId, ...rest] = slot.split('.');
  if (!pageKey || !sectionId || rest.length) return false;
  return Boolean(config.pages.find((p) => p.key === pageKey)?.sections.some((s) => s.id === sectionId));
}

export function isValidPage(key: string): boolean {
  return config.pages.some((p) => p.key === key);
}

// 이미지 주소: 사이트 안 경로(/images/…, /api/assets/…)만 허용
const LOCAL_IMG = /^\/(images\/[\w.\-/]+|api\/assets\/\d+)$/;
const BG_VALUE = /^url\('\/(images\/[\w.\-/]+|api\/assets\/\d+)'\)$/;

export function sanitizeSection(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'div', 'p', 'h1', 'h2', 'h3', 'h4', 'span', 'strong', 'b', 'em', 'i', 'br', 'hr', 'small',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'a', 'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      th: ['scope'],
      div: ['style'],
    },
    allowedSchemes: ['http', 'https', 'tel', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    allowedStyles: {
      div: { '--hero-image': [BG_VALUE], '--band-image': [BG_VALUE] },
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !LOCAL_IMG.test(frame.attribs.src ?? ''),
    transformTags: {
      a: (tagName, attribs) => {
        const out: Record<string, string> = { ...attribs };
        if (out.target === '_blank') out.rel = 'noopener noreferrer';
        else delete out.target;
        return { tagName, attribs: out };
      },
    },
  }).trim();
}

export async function getOverrides(pageKey: string): Promise<Record<string, string>> {
  const db = await getDb();
  const r = await db.execute({ sql: `SELECT slot, html FROM content_overrides WHERE slot LIKE ? ESCAPE '\\'`, args: [`${pageKey.replace(/[\\%_]/g, (m) => `\\${m}`)}.%`] });
  const out: Record<string, string> = {};
  for (const row of r.rows) out[String(row.slot)] = String(row.html);
  return out;
}

export async function allOverrides(): Promise<Array<{ slot: string; html: string; updated_at: string }>> {
  const db = await getDb();
  const r = await db.execute('SELECT slot, html, updated_at FROM content_overrides ORDER BY slot');
  return r.rows.map((row) => ({ slot: String(row.slot), html: String(row.html), updated_at: String(row.updated_at) }));
}

export async function saveOverride(slot: string, html: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO content_overrides (slot, html, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(slot) DO UPDATE SET html = excluded.html, updated_at = excluded.updated_at`,
    args: [slot, html, nowIso()],
  });
}

export async function deleteOverride(slot: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: 'DELETE FROM content_overrides WHERE slot = ?', args: [slot] });
  return r.rowsAffected > 0;
}

export async function saveAsset(mime: string, data: Uint8Array): Promise<number> {
  const db = await getDb();
  const r = await db.execute({
    sql: 'INSERT INTO assets (mime, data, size, created_at) VALUES (?, ?, ?, ?)',
    args: [mime, data, data.byteLength, nowIso()],
  });
  return Number(r.lastInsertRowid);
}

export async function getAsset(id: number): Promise<{ mime: string; data: ArrayBuffer } | null> {
  const db = await getDb();
  const r = await db.execute({ sql: 'SELECT mime, data FROM assets WHERE id = ?', args: [id] });
  const row = r.rows[0];
  if (!row) return null;
  return { mime: String(row.mime), data: row.data as ArrayBuffer };
}
