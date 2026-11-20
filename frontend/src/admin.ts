import './styles/base.css';
import './styles/admin.css';
import { api, ApiError } from './api.js';

interface Row {
  id: number;
  name: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
}
interface ListResponse {
  total: number;
  page: number;
  size: number;
  statuses: string[];
  rows: Row[];
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const loginForm = $<HTMLFormElement>('login-form');
const panel = $('admin-panel');
const filterForm = $<HTMLFormElement>('filter-form');
const rowsEl = $('admin-rows');
const logoutBtn = $<HTMLButtonElement>('admin-logout');
const exportLink = $<HTMLAnchorElement>('export-csv');

let page = 1;
let statuses: string[] = [];

const fmt = (iso: string) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });

function filterQuery(): URLSearchParams {
  const fd = new FormData(filterForm);
  const qs = new URLSearchParams();
  for (const k of ['q', 'status', 'from', 'to']) {
    const v = String(fd.get(k) ?? '').trim();
    if (v) qs.set(k, v);
  }
  return qs;
}

function showLogin(): void {
  panel.hidden = true;
  logoutBtn.hidden = true;
  loginForm.hidden = false;
}

function cell(text: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

async function load(): Promise<void> {
  const qs = filterQuery();
  exportLink.href = `/api/admin/export.csv${qs.size ? `?${qs}` : ''}`;
  qs.set('page', String(page));
  let data: ListResponse;
  try {
    data = await api<ListResponse>(`/api/admin/applications?${qs}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return showLogin();
    $('admin-summary').textContent = err instanceof Error ? err.message : '불러오기 실패';
    return;
  }

  if (statuses.length === 0) {
    statuses = data.statuses;
    const sel = filterForm.elements.namedItem('status') as HTMLSelectElement;
    for (const s of statuses) sel.add(new Option(s, s));
  }

  rowsEl.replaceChildren(
    ...data.rows.map((r) => {
      const tr = document.createElement('tr');
      const statusTd = document.createElement('td');
      const sel = document.createElement('select');
      for (const s of statuses) sel.add(new Option(s, s, false, s === r.status));
      sel.addEventListener('change', async () => {
        try {
          await api(`/api/admin/applications/${r.id}`, { method: 'PATCH', json: { status: sel.value } });
        } catch (err) {
          alert(err instanceof Error ? err.message : '변경 실패');
          sel.value = r.status;
        }
      });
      statusTd.append(sel);

      const delTd = document.createElement('td');
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn--danger';
      del.textContent = '삭제';
      del.addEventListener('click', async () => {
        if (!confirm(`${r.id}번 신청(${r.name})을 삭제합니다. 되돌릴 수 없습니다.`)) return;
        try {
          await api(`/api/admin/applications/${r.id}`, { method: 'DELETE' });
          await load();
        } catch (err) {
          alert(err instanceof Error ? err.message : '삭제 실패');
        }
      });
      delTd.append(del);

      tr.append(cell(String(r.id)), cell(fmt(r.created_at)), cell(r.name), cell(r.phone), cell(r.message), statusTd, delTd);
      return tr;
    }),
  );
  if (data.rows.length === 0) {
    const tr = document.createElement('tr');
    const td = cell('신청 내역이 없습니다.');
    td.colSpan = 7;
    tr.append(td);
    rowsEl.append(tr);
  }

  const pages = Math.max(1, Math.ceil(data.total / data.size));
  $('admin-summary').textContent = `총 ${data.total}건 · ${data.page}/${pages} 페이지`;
  const pager = $('admin-pager');
  pager.replaceChildren();
  for (let i = 1; i <= pages; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = String(i);
    if (i === page) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => {
      page = i;
      void load();
    });
    pager.append(b);
  }

  loginForm.hidden = true;
  panel.hidden = false;
  logoutBtn.hidden = false;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = String(new FormData(loginForm).get('password') ?? '');
  try {
    await api('/api/admin/login', { method: 'POST', json: { password } });
    loginForm.reset();
    $('login-message').textContent = '';
    page = 1;
    await load();
  } catch (err) {
    $('login-message').textContent = err instanceof Error ? err.message : '로그인 실패';
  }
});

filterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  page = 1;
  void load();
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
  showLogin();
});

async function init(): Promise<void> {
  try {
    const me = await api<{ authed: boolean; configured: boolean }>('/api/admin/me');
    if (!me.configured) $('admin-unconfigured').hidden = false;
    else if (me.authed) await load();
    else showLogin();
  } catch {
    $('admin-unconfigured').textContent = 'API 에 연결할 수 없습니다.';
    $('admin-unconfigured').hidden = false;
  } finally {
    $('admin-loading').hidden = true;
  }
}

void init();
