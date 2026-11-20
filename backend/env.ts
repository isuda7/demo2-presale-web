/** 환경변수 접근. 값 자체는 로그·응답에 절대 남기지 않는다. */

export const isVercel = Boolean(process.env.VERCEL);
export const isProduction = process.env.NODE_ENV === 'production' || isVercel;

export function readEnv(name: 'ADMIN_PASSWORD' | 'TOKEN_SECRET' | 'TURSO_DATABASE_URL' | 'TURSO_AUTH_TOKEN'): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : undefined;
}
