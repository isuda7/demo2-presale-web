import { config } from '../../shared/config/index.js';
import { applyFields, consentField, honeypotField } from '../../shared/form.js';
import { api, ApiError } from './api.js';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const loading = $('apply-loading');
const closedBox = $('apply-closed');
const form = $<HTMLFormElement>('apply-form');
const message = $('apply-message');

function renderFields(): void {
  const wrap = $('apply-fields');
  for (const f of applyFields) {
    const label = document.createElement('label');
    label.className = 'field';
    label.innerHTML = `<span class="field__label"></span>`;
    label.querySelector('.field__label')!.textContent = f.label + (f.required ? ' (필수)' : ' (선택)');
    const input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input') as HTMLInputElement;
    input.name = f.name;
    if (f.type !== 'textarea') input.type = f.type;
    input.maxLength = f.maxLength;
    input.required = f.required;
    if (f.placeholder) input.placeholder = f.placeholder;
    if (f.autocomplete) input.autocomplete = f.autocomplete as AutoFill;
    const err = document.createElement('p');
    err.className = 'field__error';
    err.dataset.errorFor = f.name;
    label.append(input, err);
    wrap.append(label);
  }

  // 동의문 — shared/config 의 privacy 값(초안)을 그대로 표시
  const p = config.privacy;
  $('apply-consent-text').innerHTML = '<dl class="privacy-list"></dl>';
  const dl = $('apply-consent-text').querySelector('dl')!;
  for (const [k, v] of [
    ['수집 항목', p.items],
    ['수집·이용 목적', p.purpose],
    ['보유·이용 기간', p.retention],
    ['동의 거부 권리', p.refusal],
  ]) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
  $('apply-consent-label').textContent = consentField.label;
}

function showErrors(errors: Record<string, string> = {}): void {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => {
    el.textContent = errors[el.dataset.errorFor!] ?? '';
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload: Record<string, unknown> = {};
  for (const f of applyFields) payload[f.name] = String(fd.get(f.name) ?? '');
  payload[consentField.name] = fd.get(consentField.name) === 'on';
  payload[honeypotField] = String(fd.get(honeypotField) ?? '');

  const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  btn.disabled = true;
  message.textContent = '';
  showErrors();
  try {
    const res = await api<{ message: string }>('/api/apply', { method: 'POST', json: payload });
    form.reset();
    message.textContent = res.message;
  } catch (err) {
    if (err instanceof ApiError) {
      showErrors(err.fields);
      message.textContent = err.message;
      if (err.status === 403) showClosed(err.message);
    } else {
      message.textContent = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
  } finally {
    btn.disabled = false;
  }
});

function showClosed(msg: string): void {
  form.hidden = true;
  closedBox.textContent = msg || config.apply.closedMessage;
  closedBox.hidden = false;
}

async function init(): Promise<void> {
  try {
    const status = await api<{ closed: boolean; message: string }>('/api/apply/status');
    if (status.closed) return showClosed(status.message);
    renderFields();
    form.hidden = false;
  } catch {
    closedBox.textContent = '신청 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    closedBox.hidden = false;
  } finally {
    loading.hidden = true;
  }
}

void init();
