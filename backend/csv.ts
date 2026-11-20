import type { ApplicationRow } from './repo.js';
import { formatKst } from './time.js';

function cell(v: string | number): string {
  let s = String(v);
  // 엑셀 수식 주입 방지
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙인다. */
export function toCsv(rows: ApplicationRow[]): string {
  const header = ['번호', '신청일시(KST)', '성함', '연락처', '문의사항', '상태', '개인정보동의', '동의문버전'];
  const lines = rows.map((r) =>
    [r.id, formatKst(r.created_at), r.name, r.phone, r.message, r.status, r.privacy_agreed ? 'Y' : 'N', r.privacy_version]
      .map(cell)
      .join(','),
  );
  return '﻿' + [header.join(','), ...lines].join('\r\n') + '\r\n';
}
