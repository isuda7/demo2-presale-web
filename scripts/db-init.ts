/**
 * DB 테이블 생성(이미 있으면 그대로 둠).
 *   npm run db:init
 * .env.local 에 TURSO_DATABASE_URL 이 있으면 Turso, 없으면 ./local.db 에 만든다.
 * (API 는 첫 요청 때도 자동으로 테이블을 만든다. 이 스크립트는 배포 전 미리 만들어 두거나 점검할 때 쓴다.)
 */
try {
  process.loadEnvFile('.env.local');
} catch {
  /* 없으면 로컬 DB */
}
const { getDb, dbKind } = await import('../backend/db.js');
const db = await getDb();
const r = await db.execute('SELECT COUNT(*) AS n FROM applications');
console.log(`DB 준비 완료 (${dbKind()}) — applications ${r.rows[0]?.n}건`);
