import { createHash, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { isProduction, readEnv } from './env.js';
import { config } from '../shared/config/index.js';

/**
 * 관리자 인증
 * - 비밀번호: 환경변수 ADMIN_PASSWORD 와 비교(시간차 공격 방지 비교)
 * - 토큰: TOKEN_SECRET 으로 서명한 JWT(HS256), HttpOnly 쿠키로만 전달
 */
const COOKIE = 'admin_token';
const COOKIE_PATH = '/api/admin';
/**
 * 화면 편집기 표시용 힌트 쿠키(비밀값 아님, JS 에서 읽음). 이 쿠키가 있을 때만 화면이 편집기 코드를 불러온다.
 * 실제 권한은 편집기가 /api/admin/me 로 다시 확인하고, 저장 API 는 admin_token 으로만 허용한다.
 */
const UI_COOKIE = 'admin_ui';

export function authConfigured(): boolean {
  return Boolean(readEnv('ADMIN_PASSWORD') && readEnv('TOKEN_SECRET'));
}

function digest(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest();
}

export function checkPassword(input: string): boolean {
  const expected = readEnv('ADMIN_PASSWORD');
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

export async function issueToken(c: Context): Promise<void> {
  const secret = readEnv('TOKEN_SECRET');
  if (!secret) throw new Error('TOKEN_SECRET 미설정');
  const ttl = config.admin.sessionHours * 3600;
  const token = await sign({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + ttl }, secret, 'HS256');
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Strict',
    path: COOKIE_PATH,
    maxAge: ttl,
  });
  setUiHint(c, ttl);
}

/** 편집기 표시용 힌트 쿠키 설정(로그인 시, 그리고 로그인 상태 확인 시 다시 맞춤) */
export function setUiHint(c: Context, ttl = config.admin.sessionHours * 3600): void {
  setCookie(c, UI_COOKIE, '1', { secure: isProduction, sameSite: 'Strict', path: '/', maxAge: ttl });
}

export function clearToken(c: Context): void {
  deleteCookie(c, COOKIE, { path: COOKIE_PATH, secure: isProduction });
  deleteCookie(c, UI_COOKIE, { path: '/', secure: isProduction });
}

export async function isAuthed(c: Context): Promise<boolean> {
  const secret = readEnv('TOKEN_SECRET');
  const token = getCookie(c, COOKIE);
  if (!secret || !token) return false;
  try {
    const payload = await verify(token, secret, 'HS256');
    return payload.sub === 'admin';
  } catch {
    return false;
  }
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  if (!(await isAuthed(c))) return c.json({ error: '로그인이 필요합니다.' }, 401);
  await next();
};
