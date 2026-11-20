/**
 * 콘텐츠 도구: 화면 편집 수정본(DB)을 소스 파일로 굳히기
 *   npm run content:pull            수정본 → frontend/content/<페이지>/<구획>.html, 올린 이미지 → frontend/public/images/uploads/
 *   npm run content:pull -- --clear  위 작업 후 DB 의 수정본을 지운다(다음 배포부터 원본 HTML 에 포함)
 *
 * .env.local 에 TURSO_DATABASE_URL 이 있으면 Turso(운영) 수정본을, 없으면 local.db 를 읽는다.
 * 굳힌 뒤 커밋·배포하면 방문자 화면에서 수정본을 바꿔 끼우는 지연(깜빡임)이 없어진다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* 로컬 DB */
}
const { allOverrides, getAsset, deleteOverride, isValidSlot } = await import('../backend/content.js');
const { dbKind } = await import('../backend/db.js');

const clear = process.argv.includes('--clear');
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const rows = await allOverrides();
console.log(`DB: ${dbKind()} — 수정본 ${rows.length}개`);

for (const { slot, html } of rows) {
  if (!isValidSlot(slot)) {
    console.log(`  건너뜀(설정에 없는 구획): ${slot}`);
    continue;
  }
  let out = html;
  for (const m of new Set(Array.from(html.matchAll(/\/api\/assets\/(\d+)/g), (x) => x[1]))) {
    const asset = await getAsset(Number(m));
    if (!asset) continue;
    const rel = `images/uploads/asset-${m}.${EXT[asset.mime] ?? 'bin'}`;
    const file = join('frontend', 'public', rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, new Uint8Array(asset.data));
    out = out.replaceAll(`/api/assets/${m}`, `/${rel}`);
    console.log(`  이미지: /api/assets/${m} → /${rel}`);
  }
  const [page, section] = slot.split('.');
  const file = join('frontend', 'content', page, `${section}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out + '\n');
  console.log(`  저장: ${file}`);
  if (clear) await deleteOverride(slot);
}
if (clear) console.log('DB 수정본을 지웠습니다. 변경 파일을 커밋·배포하세요.');
