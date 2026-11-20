/**
 * 화면 편집기 — 관리자 전용. content-loader 가 관리자 힌트 쿠키를 볼 때만 이 파일을 불러온다(방문자는 내려받지 않음).
 * - 문장·제목·버튼 글자: 그 자리에서 직접 고침(contenteditable)
 * - 링크 주소, 이미지, 배경 이미지: 마우스를 올리면 나오는 작은 도구로 바꿈
 * - 저장 단위: 구획([data-slot]) — 서버가 허용 태그만 남겨 저장하고, 방문자 화면에 반영된다
 */
import './editor.css';
import { api, ApiError } from '../api.js';

const TEXT_SEL = 'h1,h2,h3,h4,p,li,dt,dd,figcaption,th,td,.card__en,.card__title,a.btn';
const BLOCKERS = 'img,figure,a,ul,ol,dl,table,div';
const BG_SEL = '[style*="--hero-image"],[style*="--band-image"]';

let editing = false;
const dirty = new Set<string>();
let overridden = new Set<string>();
let bar: HTMLElement;
let tools: HTMLElement;
let current: { img?: HTMLImageElement; link?: HTMLAnchorElement; bg?: HTMLElement; anchor?: Element } = {};

const slotOf = (el: Element | null) => el?.closest<HTMLElement>('[data-slot]') ?? null;
const sections = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot]'));

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.assign(el, props);
  el.append(...kids);
  return el;
}

function toast(msg: string, error = false): void {
  const t = h('div', { className: `ed-toast${error ? ' is-error' : ''}`, textContent: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

// ── 편집 가능 요소 ──────────────────────
function editableRoots(section: HTMLElement): HTMLElement[] {
  const roots: HTMLElement[] = [];
  section.querySelectorAll<HTMLElement>(TEXT_SEL).forEach((el) => {
    if (el.closest('.ed-tag')) return;
    if (!el.matches('a') && el.querySelector(BLOCKERS)) return; // 사진·링크·목록을 품은 덩어리는 안쪽 글자만
    if (roots.some((r) => r.contains(el))) return;
    roots.push(el);
  });
  return roots;
}

function markDirty(slot: string | undefined): void {
  if (!slot) return;
  dirty.add(slot);
  slotOf(document.querySelector(`[data-slot="${CSS.escape(slot)}"]`))?.classList.add('ed-dirty');
  renderBar();
}

function decorate(section: HTMLElement): void {
  const slot = section.dataset.slot!;
  const tag = h('div', { className: 'ed-tag', contentEditable: 'false' }, h('span', { textContent: slot }));
  if (overridden.has(slot)) {
    tag.append(h('em', { textContent: '수정됨' }));
    const revert = h('button', { type: 'button', textContent: '원래대로' });
    revert.addEventListener('click', () => void revertSlot(slot));
    tag.append(revert);
  }
  section.prepend(tag);
  for (const el of editableRoots(section)) {
    el.contentEditable = 'true';
    el.spellcheck = false;
  }
}

function undecorate(section: HTMLElement): void {
  section.querySelectorAll('.ed-tag').forEach((t) => t.remove());
  section.querySelectorAll('[contenteditable]').forEach((el) => {
    el.removeAttribute('contenteditable');
    el.removeAttribute('spellcheck');
  });
}

function setEditing(on: boolean): void {
  editing = on;
  document.body.classList.toggle('ed-on', on);
  for (const s of sections()) (on ? decorate : undecorate)(s);
  if (!on) hideTools();
  renderBar();
}

// ── 저장·되돌리기 ───────────────────────
function cleanHtml(section: HTMLElement): string {
  const clone = section.cloneNode(true) as HTMLElement;
  undecorate(clone);
  clone.querySelectorAll('.ed-dirty').forEach((el) => el.classList.remove('ed-dirty'));
  return clone.innerHTML.trim();
}

async function saveAll(): Promise<void> {
  if (dirty.size === 0) return;
  let ok = 0;
  for (const slot of [...dirty]) {
    const section = document.querySelector<HTMLElement>(`[data-slot="${CSS.escape(slot)}"]`);
    if (!section) continue;
    try {
      const res = await api<{ html: string }>(`/api/admin/content/${encodeURIComponent(slot)}`, {
        method: 'PUT',
        json: { html: cleanHtml(section) },
      });
      // 서버가 정리한 결과로 다시 그림(허용되지 않은 요소가 빠졌다면 화면에도 반영)
      section.innerHTML = res.html;
      section.classList.remove('ed-dirty');
      overridden.add(slot);
      dirty.delete(slot);
      if (editing) decorate(section);
      ok++;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessionExpired();
      toast(`${slot} 저장 실패: ${err instanceof Error ? err.message : ''}`, true);
    }
  }
  renderBar();
  if (ok) toast(`${ok}개 구획을 저장했습니다. 방문자 화면에는 최대 30초 뒤 반영됩니다.`);
}

async function revertSlot(slot: string): Promise<void> {
  if (!confirm(`${slot} 구획의 수정본을 지우고 원래 내용으로 되돌립니다.`)) return;
  try {
    await api(`/api/admin/content/${encodeURIComponent(slot)}`, { method: 'DELETE' });
    dirty.delete(slot);
    location.reload();
  } catch (err) {
    toast(err instanceof Error ? err.message : '되돌리기 실패', true);
  }
}

function sessionExpired(): void {
  toast('로그인이 만료되었습니다. 관리자 페이지에서 다시 로그인해 주세요.', true);
  document.cookie = 'admin_ui=; Max-Age=0; path=/';
}

// ── 이미지·링크·배경 도구 ─────────────────
async function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    input.click();
  });
}

/** 큰 이미지는 브라우저에서 줄여서(긴 변 2000px, JPEG) 올린다 */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size <= 1.5 * 1024 * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('변환 실패'))), 'image/jpeg', 0.85));
}

async function upload(): Promise<string | null> {
  const file = await pickImage();
  if (!file) return null;
  const blob = await shrink(file);
  const fd = new FormData();
  fd.append('file', blob, file.name.replace(/\.\w+$/, '') + (blob.type === 'image/jpeg' ? '.jpg' : ''));
  toast('이미지를 올리는 중…');
  try {
    const res = await api<{ url: string }>('/api/admin/assets', { method: 'POST', body: fd });
    return res.url;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) sessionExpired();
    else toast(err instanceof Error ? err.message : '업로드 실패', true);
    return null;
  }
}

async function replaceImage(img: HTMLImageElement): Promise<void> {
  const url = await upload();
  if (!url) return;
  img.removeAttribute('srcset');
  img.src = url;
  img.addEventListener('load', () => {
    if (img.hasAttribute('width')) {
      img.width = img.naturalWidth;
      img.height = img.naturalHeight;
    }
  }, { once: true });
  markDirty(slotOf(img)?.dataset.slot);
}

function editAlt(img: HTMLImageElement): void {
  const v = prompt('이미지 설명(대체 텍스트)', img.alt);
  if (v === null) return;
  img.alt = v.trim();
  markDirty(slotOf(img)?.dataset.slot);
}

function editLink(a: HTMLAnchorElement): void {
  const v = prompt('링크 주소 (예: /apply/, /facility/#hotel, https://…, tel:…)', a.getAttribute('href') ?? '');
  if (v === null) return;
  const href = v.trim();
  if (!/^(\/|#|https?:\/\/|tel:|mailto:)/.test(href)) return toast('주소는 /, #, https://, tel:, mailto: 로 시작해야 합니다.', true);
  a.setAttribute('href', href);
  markDirty(slotOf(a)?.dataset.slot);
}

async function replaceBg(el: HTMLElement): Promise<void> {
  const prop = el.getAttribute('style')?.includes('--band-image') ? '--band-image' : '--hero-image';
  const url = await upload();
  if (!url) return;
  el.style.setProperty(prop, `url('${url}')`);
  markDirty(slotOf(el)?.dataset.slot);
}

function hideTools(): void {
  tools.hidden = true;
  current = {};
}

function placeTools(): void {
  if (!current.anchor || tools.hidden) return;
  const r = current.anchor.getBoundingClientRect();
  tools.style.top = `${Math.max(8, r.top + 8)}px`;
  tools.style.left = `${Math.max(8, Math.min(r.left + 8, innerWidth - tools.offsetWidth - 8))}px`;
}

function onHover(e: MouseEvent): void {
  if (!editing) return;
  const target = e.target as HTMLElement;
  if (tools.contains(target) || bar.contains(target)) return;
  if (!slotOf(target)) return hideTools();
  const fig = target.closest('figure');
  const img = (target.closest('img') ?? fig?.querySelector('img') ?? null) as HTMLImageElement | null;
  const link = target.closest<HTMLAnchorElement>('a[href]') ?? undefined;
  const bg = target.closest<HTMLElement>(BG_SEL) ?? undefined;
  const anchor = img ?? link ?? bg;
  if (!anchor) return hideTools();
  if (anchor === current.anchor) return;
  current = { img: img ?? undefined, link, bg, anchor };
  tools.replaceChildren();
  const btn = (label: string, fn: () => void) => {
    const b = h('button', { type: 'button', textContent: label });
    b.addEventListener('click', (ev) => {
      ev.preventDefault();
      fn();
    });
    tools.append(b);
  };
  if (current.img) {
    const i = current.img;
    btn('이미지 교체', () => void replaceImage(i));
    btn('설명', () => editAlt(i));
  }
  if (current.link) {
    const a = current.link;
    btn('링크 주소', () => editLink(a));
  }
  if (current.bg) {
    const b = current.bg;
    btn('배경 이미지 교체', () => void replaceBg(b));
  }
  tools.hidden = false;
  placeTools();
}

// ── 편집 바 ────────────────────────────
function renderBar(): void {
  bar.replaceChildren();
  const label = h('span', { className: 'ed-bar__label', textContent: editing ? '● 편집 중' : '관리자' });
  const toggle = h('button', { type: 'button', className: 'ed-btn', textContent: editing ? '편집 끝내기' : '이 화면 편집' });
  toggle.addEventListener('click', () => {
    if (editing && dirty.size && confirm('저장하지 않은 변경이 있습니다. 저장할까요?')) return void saveAll().then(() => setEditing(false));
    if (editing && dirty.size) return location.reload();
    setEditing(!editing);
  });
  const save = h('button', { type: 'button', className: 'ed-btn ed-btn--primary', textContent: `저장${dirty.size ? ` (${dirty.size})` : ''}`, disabled: dirty.size === 0 });
  save.addEventListener('click', () => void saveAll());
  const cancel = h('button', { type: 'button', className: 'ed-btn', textContent: '취소', disabled: dirty.size === 0 });
  cancel.addEventListener('click', () => confirm('저장하지 않은 변경을 버립니다.') && location.reload());
  const admin = h('a', { className: 'ed-btn', href: '/admin/', textContent: '신청 관리' });
  const logout = h('button', { type: 'button', className: 'ed-btn', textContent: '로그아웃' });
  logout.addEventListener('click', async () => {
    if (dirty.size && !confirm('저장하지 않은 변경이 있습니다. 그래도 로그아웃할까요?')) return;
    dirty.clear();
    await api('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    document.cookie = 'admin_ui=; Max-Age=0; path=/';
    location.reload();
  });
  const hint = editing ? h('span', { className: 'ed-bar__hint', textContent: '글자는 눌러서 바로 고치고, 사진·링크·배경은 마우스를 올려 바꿉니다.' }) : '';
  bar.append(label, toggle, save, cancel, hint, h('span', { className: 'ed-bar__spacer' }), admin, logout);
}

export async function startEditor(alreadyOverridden: Set<string>): Promise<void> {
  // 힌트 쿠키만으로는 믿지 않고 실제 로그인 상태를 확인
  const me = await api<{ authed: boolean }>('/api/admin/me').catch(() => ({ authed: false }));
  if (!me.authed) {
    document.cookie = 'admin_ui=; Max-Age=0; path=/';
    return;
  }
  overridden = alreadyOverridden;
  bar = h('div', { className: 'ed-bar', role: 'toolbar', ariaLabel: '화면 편집' });
  tools = h('div', { className: 'ed-tools', hidden: true });
  document.body.append(bar, tools);
  document.body.classList.add('ed-has-bar');
  renderBar();

  document.addEventListener('mouseover', onHover);
  addEventListener('scroll', placeTools, { passive: true });
  addEventListener('resize', placeTools);

  // 편집 중에는 링크 이동을 막는다
  document.addEventListener(
    'click',
    (e) => {
      if (!editing) return;
      const a = (e.target as Element).closest('a');
      if (a && slotOf(a)) e.preventDefault();
    },
    true,
  );
  document.addEventListener('input', (e) => markDirty(slotOf(e.target as Element)?.dataset.slot));
  // 붙여넣기는 글자만, Enter 는 줄바꿈(<br>)
  document.addEventListener('paste', (e) => {
    if (!editing || !(e.target as HTMLElement).closest('[contenteditable="true"]')) return;
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
  });
  document.addEventListener('keydown', (e) => {
    if (!editing || e.key !== 'Enter' || !(e.target as HTMLElement).closest('[contenteditable="true"]')) return;
    e.preventDefault();
    document.execCommand('insertLineBreak');
  });
  addEventListener('beforeunload', (e) => {
    if (dirty.size) e.preventDefault();
  });
}
