import type { InValue } from '@libsql/client';
import { getDb } from './db.js';
import { kstDayEndExclusiveIso, kstDayStartIso, nowIso } from './time.js';
import type { ApplyInput } from '../shared/form.js';

export interface ApplicationRow {
  id: number;
  name: string;
  phone: string;
  message: string;
  privacy_agreed: number;
  privacy_version: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListFilter {
  q?: string;
  status?: string;
  from?: string; // YYYY-MM-DD (KST)
  to?: string; // YYYY-MM-DD (KST)
}

export async function insertApplication(v: ApplyInput, status: string, privacyVersion: string): Promise<number> {
  const db = await getDb();
  const now = nowIso();
  const r = await db.execute({
    sql: `INSERT INTO applications (name, phone, message, privacy_agreed, privacy_version, status, created_at, updated_at)
          VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
    args: [v.name, v.phone, v.message, privacyVersion, status, now, now],
  });
  return Number(r.lastInsertRowid);
}

function buildWhere(f: ListFilter): { where: string; args: InValue[] } {
  const parts: string[] = [];
  const args: InValue[] = [];
  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    parts.push(`(name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\')`);
    args.push(like, like, like);
  }
  if (f.status) {
    parts.push('status = ?');
    args.push(f.status);
  }
  const from = f.from ? kstDayStartIso(f.from) : null;
  if (from) {
    parts.push('created_at >= ?');
    args.push(from);
  }
  const to = f.to ? kstDayEndExclusiveIso(f.to) : null;
  if (to) {
    parts.push('created_at < ?');
    args.push(to);
  }
  return { where: parts.length ? `WHERE ${parts.join(' AND ')}` : '', args };
}

export async function listApplications(f: ListFilter, page: number, size: number) {
  const db = await getDb();
  const { where, args } = buildWhere(f);
  const total = await db.execute({ sql: `SELECT COUNT(*) AS n FROM applications ${where}`, args });
  const rows = await db.execute({
    sql: `SELECT * FROM applications ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    args: [...args, size, (page - 1) * size],
  });
  return { total: Number(total.rows[0]?.n ?? 0), rows: rows.rows as unknown as ApplicationRow[] };
}

export async function allApplications(f: ListFilter): Promise<ApplicationRow[]> {
  const db = await getDb();
  const { where, args } = buildWhere(f);
  const rows = await db.execute({ sql: `SELECT * FROM applications ${where} ORDER BY id DESC`, args });
  return rows.rows as unknown as ApplicationRow[];
}

export async function updateStatus(id: number, status: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: 'UPDATE applications SET status = ?, updated_at = ? WHERE id = ?', args: [status, nowIso(), id] });
  return r.rowsAffected > 0;
}

export async function deleteApplication(id: number): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: 'DELETE FROM applications WHERE id = ?', args: [id] });
  return r.rowsAffected > 0;
}
