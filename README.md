# 분양 사이트 — 구축 초안

Vite 멀티페이지(HTML/CSS/JS) + Hono API + Turso(libSQL). 배포는 Vercel(GitHub 푸시 시 자동 배포).

> 카탈로그(PDF 14쪽)의 콘텐츠·이미지·디자인을 적용한 상태입니다. 본문은 `frontend/content/`, 이미지는 `frontend/public/images/` 에 있습니다. 확정이 필요한 항목은 [doc/미확인.md](doc/미확인.md).

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값을 채운다(ADMIN_PASSWORD, TOKEN_SECRET). Turso 칸은 비워 두면 ./local.db 사용
npm run dev                  # 화면 http://localhost:5190 · API http://localhost:8797/api
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 화면(Vite) + API(Hono) 동시 실행. 화면의 `/api` 요청은 API 로 전달 |
| `npm run build` | 화면 빌드 → `frontend/dist` |
| `npm run typecheck` | 타입 검사 |
| `npm run check` | 점검(import 확장자·페이지 짝·비밀값 유출·환경변수·미확정 문구) |
| `npm run db:init` | DB 테이블 생성 확인 |
| `npm run new-page -- <key>` | 새 페이지 HTML 골격 생성 |

포트가 겹치면 `API_PORT`, `WEB_PORT` 환경변수로 바꿉니다.

## 문서

- [doc/사이트설계.md](doc/사이트설계.md) — 페이지 구성(PDF 근거), 설정 레이어
- [doc/개발환경.md](doc/개발환경.md) — 폴더 구조, API, DB, 인증
- [doc/배포.md](doc/배포.md) — GitHub · Vercel · Turso 연결 절차
- [doc/미확인.md](doc/미확인.md) — 확정이 필요한 항목·검증하지 못한 항목
