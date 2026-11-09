import { ArrowUpRightIcon } from './LandingIcons.jsx';
import { navItems } from '../data/navigation.js';
import { getStartPath, isAuthenticated } from '../lib/auth.js';
import { AuthenticatedAccount } from './AuthenticatedAccount.jsx';

// 홈·기업소개(로그인 전 화면) 상단 헤더.
// 앱 화면의 AppTopNav와 같은 구조·클래스를 써서 높이, 폭, 메뉴 위치가 똑같이 맞도록 함.
export function SiteHeader({ activeHref }) {
  const authenticated = isAuthenticated();
  return (
    <header className="app-topnav site-topnav" data-layer-name="TopNav-Site">
      <div className="app-topnav-inner">
        <a className="app-wordmark" href="/" data-layer-name="Logo" aria-label="SCRAP 홈">
          <img className="site-brand-logo" src="/images/scrap-logo-2d.png" alt="" />
        </a>
        <nav className="app-route-nav" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <a
              href={item.href}
              className={item.href === activeHref ? 'is-active' : ''}
              aria-current={item.href === activeHref ? 'page' : undefined}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {authenticated && activeHref === '/about' ? (
          <AuthenticatedAccount />
        ) : (
          <div className="app-account landing-header-actions">
            {!authenticated && (
              <a className="landing-header-login" href="/login?mode=login">로그인</a>
            )}
            <a className="landing-button landing-button-primary landing-button-small" href={getStartPath()}>
              시작하기
              <ArrowUpRightIcon />
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
