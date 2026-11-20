import { baseConfig } from './base.js';
import { mergeConfig } from './merge.js';
import { templates } from './templates/index.js';
import { site } from '../site.js';
import type { PageDef, SiteConfig } from './schema.js';

export type { PageDef, PageSection, SiteConfig, DeepPartial } from './schema.js';

function resolveTemplate(key: string | null) {
  if (key === null) return undefined;
  const t = templates[key];
  if (!t) throw new Error(`shared/site.ts: 등록되지 않은 유형(template) "${key}"`);
  return t;
}

/** 최종 설정 = 기본(base) → 유형(template) → 현장(site) */
export const config: SiteConfig = mergeConfig<SiteConfig>(baseConfig, resolveTemplate(site.template), site.overrides);

export function findPageByPath(path: string): PageDef | undefined {
  const norm = path.replace(/index\.html$/, '');
  return config.pages.find((p) => p.path === norm);
}
