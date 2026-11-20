/**
 * 방문자용 경량 스크립트 — 관리자가 저장한 수정본(구획 단위)을 화면에 반영한다.
 * 편집기 코드는 여기 들어 있지 않다. 관리자 힌트 쿠키가 있을 때만 편집기 파일을 따로 불러온다.
 */

const isAdminHint = () => document.cookie.split('; ').includes('admin_ui=1');

export async function applyContent(): Promise<void> {
  const page = document.body.dataset.page;
  const admin = isAdminHint();
  const overridden = new Set<string>();

  if (page && document.querySelector('[data-slot]')) {
    try {
      const res = await fetch(`/api/content?page=${encodeURIComponent(page)}${admin ? '&fresh=1' : ''}`);
      if (res.ok) {
        const { overrides } = (await res.json()) as { overrides: Record<string, string> };
        for (const [slot, html] of Object.entries(overrides)) {
          const el = document.querySelector<HTMLElement>(`[data-slot="${CSS.escape(slot)}"]`);
          if (!el) continue;
          el.innerHTML = html; // 서버에서 저장 시 허용 태그만 남긴 값
          overridden.add(slot);
        }
      }
    } catch {
      /* 수정본을 못 불러오면 빌드된 원본을 그대로 보여 준다 */
    }
  }

  if (admin) {
    const { startEditor } = await import('./editor/editor.js');
    await startEditor(overridden);
  }
}
