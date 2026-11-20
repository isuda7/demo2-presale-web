import type { DeepPartial, SiteConfig } from './config/schema.js';

/**
 * 현장 설정 — 이 현장에만 해당하는 값. 기본(base) → 유형(template) 위에 마지막으로 덮어쓴다.
 * 배열(pages 등)은 통째로 교체되므로 바꿀 때는 전체 목록을 적는다.
 *
 * 근거 자료: 공덕해링턴스퀘어카다록_20160119.pdf (14쪽) — doc/사이트설계.md 참고.
 * 구획별 본문은 frontend/content/<페이지>/<구획>.html 에 있다.
 */
export const site: { template: string | null; overrides: DeepPartial<SiteConfig> } = {
  template: null,
  overrides: {
    site: {
      name: '공덕역 효성해링턴 스퀘어',
      description: '마포를 바꾸는 랜드마크 멀티라이프 복합타운, 공덕역 효성해링턴 스퀘어',
      logo: '/images/logo.png',
    },
    contact: {
      // PDF 표지 표기 그대로. 지역번호 미표기 → 전화 걸기 링크는 만들지 않음(doc/미확인.md)
      label: '임대문의',
      phone: '3274-3709',
    },
    footer: {
      lines: ['시행 공덕경우개발(주) · 시공 효성, 진흥기업'],
      disclaimer:
        '※ 본 사이트의 CG·사진·평면도 일러스트는 소비자의 이해를 돕기 위해 제작된 것으로 실제와 다를 수 있으며, 설계계획 등은 실제 시공 및 인·허가 과정에 따라 변경될 수 있습니다.',
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
          { id: 'facilities', title: '시설 바로가기' },
          { id: 'landmark', title: '랜드마크' },
          { id: 'cta', title: '관심고객 등록 안내' },
        ],
      },
      {
        key: 'business',
        path: '/business/',
        title: '사업개요',
        label: 'Business Overview',
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
        label: 'Location',
        nav: true,
        sections: [
          { id: 'map', title: '입지 지도' },
          { id: 'premium', title: '입지 프리미엄' },
        ],
      },
      {
        key: 'facility',
        path: '/facility/',
        title: '시설안내',
        label: 'Multi-Life Complex',
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
        label: 'All in One Site Plan',
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
        label: 'Floor Plan Information',
        nav: true,
        sections: [
          { id: 'overview', title: '공간계획' },
          { id: 'f1', title: '1F' },
          { id: 'f2', title: '2F' },
          { id: 'f3', title: '3F' },
          { id: 'f4', title: '4F' },
          { id: 'f5', title: '5F' },
          { id: 'f6', title: '6F' },
          { id: 'f7', title: '7F' },
        ],
      },
      {
        key: 'apply',
        path: '/apply/',
        title: '관심고객 등록',
        label: 'Contact',
        nav: true,
        sections: [],
      },
      {
        key: 'privacy',
        path: '/privacy/',
        title: '개인정보 처리 안내',
        label: 'Privacy',
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
