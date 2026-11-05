import { ArrowUpRightIcon } from './LandingIcons.jsx';
import { navItems } from '../data/navigation.js';

// 홈·기업소개(로그인 전 화면) 상단 헤더.
// 앱 화면의 AppTopNav와 같은 구조·클래스를 써서 높이, 폭, 메뉴 위치가 똑같이 맞도록 함.
export function SiteHeader({ activeHref }) {
  return (
    <header className="app-topnav site-topnav" data-layer-name="TopNav-Site">
      <div className="app-topnav-inner">
        <a className="app-wordmark" href="/" data-layer-name="Logo" aria-label="SCRAP 홈">
          SCRAP<span>.</span>
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
        <div className="app-account landing-header-actions">
          <button type="button">로그인</button>
          <a className="landing-button landing-button-primary landing-button-small" href="/login">
            시작하기
            <ArrowUpRightIcon />
          </a>
        </div>
      </div>
    </header>
  );
}
