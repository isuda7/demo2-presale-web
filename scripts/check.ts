/**
 * 점검 도구
 *   npm run check
 * 1. 상대 import 에 .js 확장자가 붙었는지(서버리스 크래시 방지)
 * 2. 설정(shared/config)의 페이지 ↔ frontend HTML 파일 짝
 * 3. 저장소 파일에 비밀값이 적혀 있지 않은지
 * 4. 환경변수 설정 여부(값은 출력하지 않음)
 * 5. 미확정 문구·콘텐츠 작성 현황·콘텐츠 이미지 경로
 * 6. (빌드 결과가 있으면) 방문자 HTML 에 편집기 코드가 들어가지 않았는지
 * 오류가 있으면 종료 코드 1.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* 선택 */
}
const { config } = await import('../shared/config/index.js');

const errors: string[] = [];
const warns: string[] = [];
const infos: string[] = [];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 1. 상대 import 확장자
const tsFiles = ['api', 'backend', 'shared', 'scripts', 'frontend'].flatMap((d) => walk(d)).filter((f) => !f.includes('/public/')).filter((f) => /\.(ts|mts)$/.test(f) && !f.endsWith('.d.ts'));
const importRe = /(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)|import\s+['"](\.{1,2}\/[^'"]+)['"]/g;
for (const f of tsFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(importRe)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!/\.(js|css|json|svg|png|jpe?g|webp)$/.test(spec)) errors.push(`[import] ${f}: "${spec}" — .js 확장자 필요`);
  }
}
infos.push(`상대 import 검사: ${tsFiles.length}개 파일`);

// 2. 페이지 ↔ HTML
const htmlFiles = walk('frontend').filter((f) => f.endsWith('index.html'));
const expected = new Set<string>();
for (const p of config.pages) {
  const file = join('frontend', p.path, 'index.html');
  expected.add(file);
  if (!existsSync(file)) errors.push(`[page] 설정에 있는 "${p.key}" 의 HTML 없음: ${file}  → npm run new-page -- ${p.key}`);
}
for (const f of htmlFiles) {
  if (!expected.has(f)) warns.push(`[page] 설정에 없는 HTML(빌드 제외됨): ${f}`);
}
infos.push(`페이지: ${config.pages.map((p) => p.key).join(', ')}`);

// 3. 비밀값 유출
let tracked: string[] = [];
try {
  tracked = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch {
  warns.push('[secret] git 목록을 읽지 못해 비밀값 검사를 건너뜀');
}
for (const f of tracked) {
  if (/^\.env(\.|$)/.test(f) && f !== '.env.example') errors.push(`[secret] 저장소에 포함될 환경파일: ${f}`);
  if (f === 'local.db') errors.push('[secret] local.db 가 저장소에 포함됨');
}
const secretRe = /^(ADMIN_PASSWORD|TOKEN_SECRET|TURSO_AUTH_TOKEN|TURSO_DATABASE_URL)[ \t]*=[ \t]*\S/m;
for (const f of tracked.filter((f) => existsSync(f) && !/\.(png|jpe?g|webp|pdf|db)$/i.test(f) && !f.startsWith('node_modules'))) {
  if (secretRe.test(readFileSync(f, 'utf8'))) errors.push(`[secret] 비밀값으로 보이는 줄: ${f}`);
}
const gi = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : '';
if (!gi.includes('.env.*') || !gi.includes('local.db')) errors.push('[secret] .gitignore 에 .env.* / local.db 제외 규칙 필요');

// 4. 환경변수
for (const k of ['ADMIN_PASSWORD', 'TOKEN_SECRET'] as const) {
  if (!process.env[k]) warns.push(`[env] ${k} 미설정 — 관리자 로그인 불가`);
}
if ((process.env.TOKEN_SECRET ?? '').length > 0 && (process.env.TOKEN_SECRET ?? '').length < 32) warns.push('[env] TOKEN_SECRET 이 32자 미만');
infos.push(`DB: ${process.env.TURSO_DATABASE_URL ? 'Turso' : '로컬 local.db'}`);

// 5. 미확정·콘텐츠 현황
for (const [k, v] of Object.entries(config.privacy)) {
  if (String(v).includes('[미확정]')) warns.push(`[privacy] 개인정보 문구 미확정: privacy.${k}`);
}
if (!config.contact.phone) warns.push('[content] 대표번호(contact.phone) 비어 있음');
const slotFiles = new Set<string>();
const empty: string[] = [];
for (const p of config.pages) {
  for (const s of p.sections) {
    const f = join('frontend', 'content', p.key, `${s.id}.html`);
    slotFiles.add(f);
    if (!existsSync(f)) empty.push(`${p.key}.${s.id}`);
  }
}
infos.push(`콘텐츠: 구획 ${slotFiles.size}개 중 ${slotFiles.size - empty.length}개 작성${empty.length ? ` — 준비중: ${empty.join(', ')}` : ''}`);
for (const f of walk(join('frontend', 'content')).filter((f) => f.endsWith('.html'))) {
  if (!slotFiles.has(f)) warns.push(`[content] 설정 구획과 연결되지 않은 콘텐츠 파일: ${f}`);
}
// 콘텐츠의 이미지 경로가 실제로 있는지
for (const f of slotFiles) {
  if (!existsSync(f)) continue;
  for (const m of readFileSync(f, 'utf8').matchAll(/(?:src="|url\(')(\/images\/[^"')]+)/g)) {
    if (!existsSync(join('frontend', 'public', m[1]))) errors.push(`[content] 없는 이미지: ${m[1]} (${f})`);
  }
}
infos.push(`신청 마감 스위치: ${config.apply.closed ? '마감' : '접수중'}`);

// 6. 방문자 화면에 편집기가 섞이지 않았는지 — 편집기는 동적 import 로만 불러와야 한다
if (existsSync(join('frontend', 'dist'))) {
  for (const f of walk(join('frontend', 'dist')).filter((f) => f.endsWith('.html'))) {
    if (/editor/i.test(readFileSync(f, 'utf8'))) errors.push(`[editor] 방문자 HTML 이 편집기 파일을 직접 불러옴: ${f}`);
  }
  infos.push('편집기 분리: 빌드 HTML 에서 편집기 직접 로드 없음 확인');
}

const rel = (s: string) => s.replace(process.cwd() + '/', '');
for (const i of infos) console.log(`  · ${i}`);
for (const w of warns) console.log(`  ⚠ ${rel(w)}`);
for (const e of errors) console.log(`  ✖ ${rel(e)}`);
console.log(errors.length ? `\n점검 실패: 오류 ${errors.length}건, 경고 ${warns.length}건` : `\n점검 통과 (경고 ${warns.length}건)`);
process.exit(errors.length ? 1 : 0);
