import { handle } from 'hono/vercel';
import { app } from '../backend/app.js';

/**
 * Vercel 진입점. vercel.json 의 rewrites 가 /api/* 요청을 모두 이 함수로 보낸다.
 * Node.js 런타임에서 Web 표준 Request/Response 방식(메서드별 export)으로 실행된다.
 */
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
