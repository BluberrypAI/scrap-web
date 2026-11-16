import { navItems } from '../data/navigation.js';
import { AuthenticatedAccount } from './AuthenticatedAccount.jsx';

export function AppTopNav({ path }) {
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
          <img className="site-brand-logo" src="/images/scrap-logo-2d.png" alt="" />
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
        <AuthenticatedAccount />
      </div>
    </header>
  );
}
