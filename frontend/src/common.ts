import './styles/base.css';

// 모바일 메뉴 열고 닫기
const toggle = document.querySelector<HTMLButtonElement>('.site-header__toggle');
const nav = document.getElementById('site-nav');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav?.classList.toggle('is-open', !open);
});
