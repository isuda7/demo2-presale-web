import type { SiteConfig } from './schema.js';

/**
 * 기본(base) 설정 — 유형·현장 설정 없이도 이것만으로 완전한 사이트가 된다.
 * 현장 고유 값은 여기에 넣지 말고 shared/site.ts 에서 덮어쓴다.
 */
export const baseConfig: SiteConfig = {
  site: {
    name: '분양 사이트',
    description: '',
    lang: 'ko',
  },
  pages: [
    {
      key: 'home',
      path: '/',
      title: '홈',
      nav: false,
      sections: [
        { id: 'hero', title: '메인 비주얼' },
        { id: 'summary', title: '사업 요약' },
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
      key: 'complex',
      path: '/complex/',
      title: '단지안내',
      nav: true,
      sections: [{ id: 'siteplan', title: '단지 배치' }],
    },
    {
      key: 'floor',
      path: '/floor/',
      title: '평면안내',
      nav: true,
      sections: [{ id: 'plans', title: '평면도' }],
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
  contact: {
    label: '대표번호',
    phone: '',
  },
  footer: {
    lines: [],
    disclaimer: '',
  },
  apply: {
    closed: false,
    closedMessage: '신청이 마감되었습니다.',
    doneMessage: '신청이 접수되었습니다.',
    statuses: ['신규', '연락완료', '보류'],
  },
  privacy: {
    // ⚠ 아래 문구는 확정되지 않은 자리표시입니다. 실제 문구는 운영 주체가 확정해야 합니다.
    version: 'draft-0',
    items: '성함, 연락처, 문의사항',
    purpose: '[미확정] 수집·이용 목적',
    retention: '[미확정] 보유·이용 기간',
    refusal: '[미확정] 동의 거부 권리 및 거부 시 불이익',
  },
  admin: {
    pageSize: 20,
    sessionHours: 8,
  },
};
