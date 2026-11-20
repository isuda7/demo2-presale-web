/** 저장은 UTC ISO 문자열, 화면·필터는 한국시간(KST, UTC+9) 기준. */

export function nowIso(): string {
  return new Date().toISOString();
}

/** 'YYYY-MM-DD'(KST) → 그날 00:00 KST 의 UTC ISO. 형식이 틀리면 null */
export function kstDayStartIso(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T00:00:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** 'YYYY-MM-DD'(KST) → 다음날 00:00 KST 의 UTC ISO (미만 비교용) */
export function kstDayEndExclusiveIso(day: string): string | null {
  const start = kstDayStartIso(day);
  if (!start) return null;
  return new Date(new Date(start).getTime() + 86_400_000).toISOString();
}

export function formatKst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
