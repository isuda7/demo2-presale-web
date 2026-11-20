import type { Plugin } from 'vite';
import { config, findPageByPath, type PageDef } from '../../shared/config/index.js';

/**
 * 빌드 시 공통 레이아웃 주입(Vite 플러그인).
 * 각 페이지 HTML 의 표식을 설정(shared/config)값으로 바꾼다 → JS 없이도 머리말·메뉴·꼬리말이 HTML 에 들어간다.
 *   <!--@head-->      제목·설명·robots
 *   <!--@header-->    사이트명 + 메뉴
 *   <!--@title-->     페이지 제목(h1)
 *   <!--@sections-->  페이지 구획(빈 자리)
 *   <!--@footer-->    꼬리말
 *   <!--@privacy-->   개인정보 처리 안내(설정값)
 */

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function head(page: PageDef): string {
  const title = page.key === 'home' ? config.site.name : `${page.title} | ${config.site.name}`;
  return [
    `<title>${esc(title)}</title>`,
    config.site.description ? `<meta name="description" content="${esc(config.site.description)}" />` : '',
    page.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '',
  ]
    .filter(Boolean)
    .join('\n    ');
}

function header(page: PageDef): string {
  const items = config.pages
    .filter((p) => p.nav)
    .map((p) => {
      const cur = p.key === page.key ? ' aria-current="page"' : '';
      return `<li><a href="${p.path}"${cur}>${esc(p.title)}</a></li>`;
    })
    .join('');
  const phone = config.contact.phone
    ? `<a class="site-header__tel" href="tel:${esc(config.contact.phone.replace(/[^\d+]/g, ''))}">${esc(config.contact.phone)}</a>`
    : '';
  return `<header class="site-header">
  <div class="container site-header__inner">
    <a class="site-header__logo" href="/">${esc(config.site.name)}</a>
    <button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="site-nav">메뉴</button>
    <nav id="site-nav" class="site-nav" aria-label="주 메뉴"><ul>${items}</ul></nav>
    ${phone}
  </div>
</header>`;
}

function sections(page: PageDef): string {
  if (page.sections.length === 0) return '';
  return page.sections
    .map(
      (s) => `<section id="${esc(s.id)}" class="section" data-slot="${esc(page.key)}.${esc(s.id)}">
  <div class="container">
    <h2 class="section__title">${esc(s.title)}</h2>
    <div class="slot-empty">콘텐츠 준비중 (${esc(page.key)}.${esc(s.id)})</div>
  </div>
</section>`,
    )
    .join('\n');
}

function footer(): string {
  const lines = config.footer.lines.map((l) => `<p>${esc(l)}</p>`).join('');
  const disclaimer = config.footer.disclaimer ? `<p class="site-footer__disclaimer">${esc(config.footer.disclaimer)}</p>` : '';
  return `<footer class="site-footer">
  <div class="container">
    <p class="site-footer__name">${esc(config.site.name)}</p>
    ${lines}
    ${disclaimer}
    <p><a href="/privacy/">개인정보 처리 안내</a></p>
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
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = findPageByPath(ctx.path);
        if (!page) throw new Error(`[layout] 설정(shared/config)에 없는 페이지: ${ctx.path}`);
        return html
          .replace('<!--@head-->', head(page))
          .replace('<html lang="ko">', `<html lang="${esc(config.site.lang)}">`)
          .replace('<!--@header-->', header(page))
          .replace('<!--@title-->', esc(page.key === 'home' ? config.site.name : page.title))
          .replace('<!--@sections-->', sections(page))
          .replace('<!--@footer-->', footer())
          .replace('<!--@privacy-->', privacy());
      },
    },
  };
}
