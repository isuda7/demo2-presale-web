/**
 * 사이트 설정의 형태(타입). 기본(base) · 유형(template) · 현장(site) 설정이 모두 이 형태를 따른다.
 */

/** 페이지 안의 구획(섹션). 내용은 비워 두고 자리만 잡는다. */
export interface PageSection {
  id: string;
  title: string;
}

export interface PageDef {
  /** 내부 키. frontend/<key>/index.html 과 짝을 이룬다(home 은 frontend/index.html). */
  key: string;
  /** 주소. 예: "/", "/location/" */
  path: string;
  /** 메뉴·문서 제목 */
  title: string;
  /** 페이지 머리 영문 표기(선택) */
  label?: string;
  /** 상단 메뉴 노출 여부 */
  nav: boolean;
  /** 검색엔진 비노출(관리자 등) */
  noindex?: boolean;
  sections: PageSection[];
}

export interface SiteConfig {
  site: {
    name: string;
    description: string;
    lang: string;
    /** 로고 이미지 경로(선택). 없으면 사이트명을 글자로 표시 */
    logo?: string;
  };
  pages: PageDef[];
  contact: {
    /** 대표번호 앞 표기(예: "대표번호", "분양문의") */
    label: string;
    /** 대표번호. 비어 있으면 화면에 노출하지 않는다. 0 으로 시작할 때만 전화 걸기 링크가 된다. */
    phone: string;
  };
  footer: {
    /** 시행·시공 등 표기 줄. 비어 있으면 노출하지 않는다. */
    lines: string[];
    /** 이미지·CG 관련 고지문 */
    disclaimer: string;
  };
  apply: {
    /** 신청 마감 스위치. true 면 화면은 안내만, 서버는 접수를 거부한다. */
    closed: boolean;
    closedMessage: string;
    doneMessage: string;
    /** 관리자 상태값 목록. 첫 번째 값이 신규 접수의 기본 상태. */
    statuses: string[];
  };
  privacy: {
    /** 동의문 버전. 문구를 바꾸면 올려서 신청 건에 어떤 문구로 동의했는지 남긴다. */
    version: string;
    /** 수집 항목 — 폼 정의(shared/form.ts)와 일치해야 한다. */
    items: string;
    purpose: string;
    retention: string;
    refusal: string;
  };
  admin: {
    pageSize: number;
    sessionHours: number;
  };
}

type Primitive = string | number | boolean | null | undefined;
/** 덮어쓰기용 부분 설정. 배열은 통째로 교체된다. */
export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends readonly unknown[]
    ? T
    : { [K in keyof T]?: DeepPartial<T[K]> };
