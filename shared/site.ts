import type { DeepPartial, SiteConfig } from './config/schema.js';

/**
 * 현장 설정 — 이 현장에만 해당하는 값. 기본(base) → 유형(template) 위에 마지막으로 덮어쓴다.
 * 배열(pages 등)은 통째로 교체되므로 바꿀 때는 전체 목록을 적는다.
 *
 * 페이지 구성 근거: 공덕해링턴스퀘어카다록_20160119.pdf (14쪽) — doc/사이트설계.md 참고.
 * 구축 초안 단계: 구획(섹션) 자리만 잡고 본문 콘텐츠는 비워 둔다.
 */
export const site: { template: string | null; overrides: DeepPartial<SiteConfig> } = {
  template: null,
  overrides: {
    site: {
      name: '공덕역 효성해링턴 스퀘어',
    },
    pages: [
      {
        key: 'home',
        path: '/',
        title: '홈',
        nav: false,
        sections: [
          { id: 'hero', title: '메인 비주얼' },
          { id: 'concept', title: '단지 컨셉' },
          { id: 'cta', title: '관심고객 등록 안내' },
        ],
      },
      {
        key: 'business',
        path: '/business/',
        title: '사업개요',
        nav: true,
        sections: [
          { id: 'overview', title: '사업개요' },
          { id: 'scale', title: '사업규모' },
          { id: 'developer', title: '시행·시공' },
        ],
      },
      {
        key: 'location',
        path: '/location/',
        title: '입지환경',
        nav: true,
        sections: [
          { id: 'map', title: '입지 지도' },
          { id: 'transport', title: '교통' },
        ],
      },
      {
        key: 'facility',
        path: '/facility/',
        title: '시설안내',
        nav: true,
        sections: [
          { id: 'hotel', title: '호텔 & 컨벤션' },
          { id: 'office', title: '비즈니스 오피스' },
          { id: 'retail', title: '상가' },
          { id: 'green', title: '휴식 & 문화공간' },
        ],
      },
      {
        key: 'complex',
        path: '/complex/',
        title: '단지안내',
        nav: true,
        sections: [
          { id: 'siteplan', title: '단지 배치' },
          { id: 'md', title: 'MD 구성' },
        ],
      },
      {
        key: 'floor',
        path: '/floor/',
        title: '층별안내',
        nav: true,
        sections: [{ id: 'plans', title: '층별 평면' }],
      },
      {
        key: 'apply',
        path: '/apply/',
        title: '관심고객 등록',
        nav: true,
        sections: [],
      },
      {
        key: 'privacy',
        path: '/privacy/',
        title: '개인정보 처리 안내',
        nav: false,
        sections: [],
      },
      {
        key: 'admin',
        path: '/admin/',
        title: '관리자',
        nav: false,
        noindex: true,
        sections: [],
      },
    ],
  },
};
