/**
 * 신청 폼 정의 — 화면(frontend)과 서버(backend)가 같은 정의·검증을 사용한다.
 */

export interface FormField {
  name: 'name' | 'phone' | 'message';
  label: string;
  type: 'text' | 'tel' | 'textarea';
  required: boolean;
  maxLength: number;
  placeholder?: string;
  autocomplete?: string;
}

export const applyFields: FormField[] = [
  { name: 'name', label: '성함', type: 'text', required: true, maxLength: 30, autocomplete: 'name' },
  { name: 'phone', label: '연락처', type: 'tel', required: true, maxLength: 13, placeholder: '010-0000-0000', autocomplete: 'tel' },
  // 문의사항 필수 여부: 미확정 — 초안은 선택 입력
  { name: 'message', label: '문의사항', type: 'textarea', required: false, maxLength: 1000 },
];

export const consentField = {
  name: 'privacyAgree' as const,
  label: '개인정보 수집·이용에 동의합니다.',
  required: true,
};

/** 스팸 차단용 숨김 칸 이름. 사람이 채울 일이 없는 칸이 채워져 오면 거부한다. */
export const honeypotField = 'website';

export interface ApplyInput {
  name: string;
  phone: string;
  message: string;
  privacyAgree: true;
}

export type ValidationResult =
  | { ok: true; value: ApplyInput }
  | { ok: false; errors: Record<string, string> };

/** 숫자만 남긴 뒤 하이픈 형식으로 정리. 휴대전화·지역번호 모두 허용(9~11자리). */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (!/^0\d{8,10}$/.test(d)) return null;
  if (d.startsWith('02')) {
    return d.length === 9 ? `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}` : `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function validateApply(input: unknown): ValidationResult {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const value: Record<string, string> = {};

  for (const f of applyFields) {
    const raw = typeof src[f.name] === 'string' ? (src[f.name] as string).trim() : '';
    if (f.required && !raw) {
      errors[f.name] = `${f.label}을(를) 입력해 주세요.`;
      continue;
    }
    if (raw.length > f.maxLength) {
      errors[f.name] = `${f.label}은(는) ${f.maxLength}자 이내로 입력해 주세요.`;
      continue;
    }
    value[f.name] = raw;
  }

  if (!errors.phone && value.phone) {
    const p = normalizePhone(value.phone);
    if (!p) errors.phone = '연락처 형식을 확인해 주세요.';
    else value.phone = p;
  }

  if (src[consentField.name] !== true) {
    errors[consentField.name] = '개인정보 수집·이용에 동의해 주세요.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name: value.name, phone: value.phone, message: value.message ?? '', privacyAgree: true },
  };
}
