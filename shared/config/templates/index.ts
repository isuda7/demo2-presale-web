import type { DeepPartial, SiteConfig } from '../schema.js';

/**
 * 유형(템플릿) 레이어 — 기본 위에, 현장 설정 아래에 덮어쓴다.
 * 구축 초안 단계에서는 유형을 적용하지 않으므로 비어 있다.
 * 추가 예: templates/residential.ts 를 만들고 아래 목록에 등록한 뒤 shared/site.ts 의 template 에 키를 지정.
 */
export const templates: Record<string, DeepPartial<SiteConfig>> = {};

export type TemplateKey = keyof typeof templates;
