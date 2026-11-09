// 해시 기반 라우팅. 기존 index.html 인라인 스크립트(window.__route, window.__go)를 옮긴 것으로 동작은 같다.

// 현재 해시에서 경로와 쿼리를 읽는다. 예: #/wastes/slag?tab=route → { path: '/wastes/slag', search: '?tab=route' }
export function currentRoute() {
  let hash = location.hash.slice(1) || '/';
  hash = hash.split('#')[0];
  const queryIndex = hash.indexOf('?');
  const path = (queryIndex < 0 ? hash : hash.slice(0, queryIndex)).replace(/\/+$/, '') || '/';
  return { path, search: queryIndex < 0 ? '' : hash.slice(queryIndex) };
}

export function navigate(url) {
  location.hash = '#' + url;
}

// 서버는 로그인 뒤 /onboarding, /login?error=... 같은 일반 경로로 보낸다.
// 이 화면은 해시 라우팅이므로 같은 화면의 해시 주소로 바꾼다. 바꿀 필요가 없으면 null.
export function hashUrlFor(pathname, search = '') {
  const path = pathname.replace(/\/+$/, '');
  if (!path || path === '/index.html') return null;
  return `/#${path}${search}`;
}

// 해시가 바뀌면 새로고침해 화면을 다시 그리고, 내부 링크(/...)는 해시 이동으로 바꾼다.
export function installHashRouting() {
  const redirect = location.hash ? null : hashUrlFor(location.pathname, location.search);
  if (redirect) location.replace(redirect);
  window.addEventListener('hashchange', () => location.reload());
  document.addEventListener(
    'click',
    (event) => {
      const anchor = event.target.closest && event.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (href && (href.charAt(0) === '/' || href.charAt(0) === '#')) {
        event.preventDefault();
        if (href.charAt(0) === '/') location.hash = '#' + href;
      }
    },
    true,
  );
}
