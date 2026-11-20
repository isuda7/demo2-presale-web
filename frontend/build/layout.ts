import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { config, findPageByPath, type PageDef } from '../../shared/config/index.js';

/**
 * 빌드 시 공통 레이아웃 주입(Vite 플러그인).
 * 각 페이지 HTML 의 표식을 설정(shared/config)값으로 바꾼다 → JS 없이도 머리말·메뉴·꼬리말·본문이 HTML 에 들어간다.
 *   <!--@head-->      제목·설명·robots
 *   <!--@header-->    사이트명 + 메뉴
 *   <!--@title-->     페이지 제목(h1)
 *   <!--@label-->     페이지 영문 표기
 *   <!--@subnav-->    페이지 안 구획 바로가기(구획 2개 이상일 때)
 *   <!--@sections-->  페이지 구획 — frontend/content/<페이지>/<구획>.html 이 있으면 그 내용, 없으면 "콘텐츠 준비중"
 *   <!--@footer-->    꼬리말
 *   <!--@privacy-->   개인정보 처리 안내(설정값)
 */

const CONTENT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../content');

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export function contentFile(pageKey: string, sectionId: string): string {
  return resolve(CONTENT_DIR, pageKey, `${sectionId}.html`);
}

function head(page: PageDef): string {
  const title = page.key === 'home' ? config.site.name : `${page.title} | ${config.site.name}`;
  return [
    `<title>${esc(title)}</title>`,
    config.site.description ? `<meta name="description" content="${esc(config.site.description)}" />` : '',
    page.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '',
    // 웹폰트: 카탈로그 글꼴(윤고딕·DIN·Trajan)은 웹 라이선스 미확인 → 무료 유사 글꼴로 대체
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;600&family=Cinzel:wght@400&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" />',
  ]
    .filter(Boolean)
    .join('\n    ');
}

function phone(): string {
  const { label, phone } = config.contact;
  if (!phone) return '';
  const digits = phone.replace(/[^\d+]/g, '');
  const inner = `<span class="site-header__tel-label">${esc(label)}</span> <strong>${esc(phone)}</strong>`;
  // 지역번호 없는 번호는 전화 걸기 링크를 만들지 않는다(잘못 연결 방지)
  return /^(0|\+)/.test(digits)
    ? `<a class="site-header__tel" href="tel:${esc(digits)}">${inner}</a>`
    : `<span class="site-header__tel">${inner}</span>`;
}

function logo(): string {
  return config.site.logo
    ? `<img src="${esc(config.site.logo)}" alt="${esc(config.site.name)}" width="600" height="312" />`
    : esc(config.site.name);
}

function header(page: PageDef): string {
  const items = config.pages
    .filter((p) => p.nav)
    .map((p) => {
      const cur = p.key === page.key ? ' aria-current="page"' : '';
      return `<li><a href="${p.path}"${cur}>${esc(p.title)}</a></li>`;
    })
    .join('');
  return `<header class="site-header">
  <div class="container site-header__inner">
    <a class="site-header__logo" href="/">${logo()}</a>
    <button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="site-nav">메뉴</button>
    <nav id="site-nav" class="site-nav" aria-label="주 메뉴"><ul>${items}</ul></nav>
    ${phone()}
  </div>
</header>`;
}

function subnav(page: PageDef): string {
  if (page.key === 'home' || page.sections.length < 2) return '';
  const links = page.sections.map((s) => `<li><a href="#${esc(s.id)}">${esc(s.title)}</a></li>`).join('');
  return `<nav class="subnav" aria-label="${esc(page.title)} 바로가기"><div class="container"><ul>${links}</ul></div></nav>`;
}

function sections(page: PageDef): string {
  return page.sections
    .map((s) => {
      const file = contentFile(page.key, s.id);
      const attrs = `id="${esc(s.id)}" class="section section--${esc(page.key)}-${esc(s.id)}" data-slot="${esc(page.key)}.${esc(s.id)}"`;
      if (existsSync(file)) return `<section ${attrs}>\n${readFileSync(file, 'utf8').trim()}\n</section>`;
      return `<section ${attrs}>
  <div class="container">
    <h2 class="section__title">${esc(s.title)}</h2>
    <div class="slot-empty">콘텐츠 준비중 (${esc(page.key)}.${esc(s.id)})</div>
  </div>
</section>`;
    })
    .join('\n');
}

function footer(): string {
  const lines = config.footer.lines.map((l) => `<p>${esc(l)}</p>`).join('');
  const disclaimer = config.footer.disclaimer ? `<p class="site-footer__disclaimer">${esc(config.footer.disclaimer)}</p>` : '';
  const tel = config.contact.phone ? `<p>${esc(config.contact.label)} ${esc(config.contact.phone)}</p>` : '';
  return `<footer class="site-footer">
  <div class="container">
    <p class="site-footer__name">${esc(config.site.name)}</p>
    ${lines}
    ${tel}
    ${disclaimer}
    <p class="site-footer__links"><a href="/privacy/">개인정보 처리 안내</a></p>
  </div>
</footer>`;
}

function privacy(): string {
  const p = config.privacy;
  const rows: Array<[string, string]> = [
    ['수집 항목', p.items],
    ['수집·이용 목적', p.purpose],
    ['보유·이용 기간', p.retention],
    ['동의 거부 권리', p.refusal],
  ];
  return `<dl class="privacy-list">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<p class="privacy-version">문구 버전: ${esc(p.version)}</p>`;
}

export function layoutPlugin(): Plugin {
  return {
    name: 'presale-layout',
    configureServer(server) {
      // 콘텐츠 조각(frontend/content)을 고치면 화면을 새로 고친다
      server.watcher.add(CONTENT_DIR);
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(CONTENT_DIR)) server.ws.send({ type: 'full-reload' });
      });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = findPageByPath(ctx.path);
        if (!page) throw new Error(`[layout] 설정(shared/config)에 없는 페이지: ${ctx.path}`);
        return html
          .replace('<html lang="ko">', `<html lang="${esc(config.site.lang)}">`)
          .replace('<!--@head-->', head(page))
          .replace('<!--@header-->', header(page))
          .replace('<!--@title-->', esc(page.key === 'home' ? config.site.name : page.title))
          .replace('<!--@label-->', esc(page.label ?? ''))
          .replace('<!--@subnav-->', subnav(page))
          .replace('<!--@sections-->', sections(page))
          .replace('<!--@footer-->', footer())
          .replace('<!--@privacy-->', privacy());
      },
    },
  };
}
