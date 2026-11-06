import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { navItems } from '../data/navigation.js';

export function AppTopNav({ path }) {
  let [t, n] = useState(false);
  useEffect(() => {
    let e = (e) => {
      e.key === 'Escape' && n(false);
    };
    return (window.addEventListener('keydown', e), () => window.removeEventListener('keydown', e));
  }, []);
  let r =
    path === '/app' || path.startsWith('/wastes')
      ? '/wastes'
      : path.startsWith('/map')
        ? '/map'
        : path;
  return (
    <header className="app-topnav" data-layer-name="TopNav-App">
      <div className="app-topnav-inner">
        <a className="app-wordmark" href="/" data-layer-name="Logo" aria-label="SCRAP 홈">
          <img className="site-brand-logo" src="/images/scrap-logo-3d.png" alt="" />
        </a>
        <nav className="app-route-nav" aria-label="앱 주요 메뉴">
          {navItems.map((e) => (
            <a
              href={e.href}
              className={r === e.href ? 'is-active' : ''}
              aria-current={r === e.href ? 'page' : undefined}
              key={e.href}
            >
              {e.label}
            </a>
          ))}
        </nav>
        <div className="app-account">
          <span className="workplace-name">(주)가천정밀</span>
          <button
            className="profile-trigger"
            type="button"
            aria-label="사용자 메뉴"
            aria-expanded={t}
            onClick={() => n((e) => !e)}
          >
            김
          </button>
          {t && (
            <div className="profile-menu">
              <div>
                <strong>김수현</strong>
                <span>사업장 관리자</span>
              </div>
              <a href="/data?tab=workplace">
                <Icon name="settings" size={17} />
                계정 설정
              </a>
              <a href="/">
                <Icon name="logout" size={17} />
                로그아웃
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
