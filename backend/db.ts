import { createClient, type Client } from '@libsql/client';
import { isVercel, readEnv } from './env.js';

/**
 * DB 연결
 * - TURSO_DATABASE_URL 이 있으면 Turso
 * - 없으면 로컬 파일 ./local.db (배포 환경에서는 허용하지 않음 — 서버리스 파일은 보존되지 않음)
 */
let client: Client | null = null;
let ready: Promise<void> | null = null;

export function dbKind(): 'turso' | 'local' {
  return readEnv('TURSO_DATABASE_URL') ? 'turso' : 'local';
}

function connect(): Client {
  const url = readEnv('TURSO_DATABASE_URL');
  if (url) return createClient({ url, authToken: readEnv('TURSO_AUTH_TOKEN') });
  if (isVercel) throw new Error('TURSO_DATABASE_URL 이 설정되지 않았습니다(배포 환경).');
  return createClient({ url: 'file:local.db' });
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    privacy_agreed INTEGER NOT NULL,
    privacy_version TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)`,
];

export async function migrate(c: Client): Promise<void> {
  await c.batch(SCHEMA, 'write');
}

/** 연결 + 최초 1회 테이블 생성 */
export async function getDb(): Promise<Client> {
  client ??= connect();
  ready ??= migrate(client).catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return client;
}
