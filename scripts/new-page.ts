/**
 * 콘텐츠 도구: 새 페이지 HTML 골격 만들기
 *   npm run new-page -- <key>
 * 1) frontend/<key>/index.html 을 표준 골격으로 만든다(이미 있으면 건드리지 않음).
 * 2) 메뉴·구획은 shared/site.ts 의 pages 에 직접 추가해야 빌드 대상이 된다.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function pageHtml(key: string): string {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!--@head-->
    <script type="module" src="/src/common.ts"></script>
  </head>
  <body data-page="${key}">
    <a class="skip-link" href="#main">본문 바로가기</a>
    <!--@header-->
    <main id="main" class="page page--${key}">
      <div class="page-head">
        <div class="container">
          <p class="page-head__label"><!--@label--></p>
          <h1 class="page-head__title"><!--@title--></h1>
        </div>
      </div>
      <!--@subnav-->
      <!--@sections-->
    </main>
    <!--@footer-->
  </body>
</html>
`;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isMain) {
  const key = process.argv[2];
  if (!key || !/^[a-z][a-z0-9-]*$/.test(key)) {
    console.error('사용법: npm run new-page -- <key>   (영문 소문자·숫자·하이픈)');
    process.exit(1);
  }
  const file = key === 'home' ? 'frontend/index.html' : `frontend/${key}/index.html`;
  if (existsSync(file)) {
    console.log(`이미 있음: ${file}`);
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, pageHtml(key));
    console.log(`생성: ${file}`);
  }
  console.log(`다음 단계: shared/site.ts 의 pages 에 { key: '${key}', path: '/${key === 'home' ? '' : key + '/'}', ... } 를 추가하세요.`);
}
