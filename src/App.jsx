import { AppShell } from './layouts/AppShell.jsx';
import { currentRoute } from './lib/router.js';
import { AboutPage } from './pages/about/AboutPage.jsx';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { OnboardingPage } from './pages/auth/OnboardingPage.jsx';
import { LandingPage } from './pages/landing/LandingPage.jsx';
import { BerrySiteTour } from './components/BerrySiteTour.jsx';
import { useRequireSession } from './hooks/useSession.js';
import * as React from 'react';
import { createWasteTracking } from './waste-tracking.jsx';

const { Page: TrackingPage } = createWasteTracking(React);

// 앱 화면은 로그인하고 기업 등록까지 마친 사용자만 본다.
function ProtectedShell({ path }) {
  const session = useRequireSession(path);
  if (session.status === 'error') {
    return (
      <main className="session-gate" role="alert">
        <p>서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        <button className="button button-primary" type="button" onClick={() => location.reload()}>
          다시 시도
        </button>
      </main>
    );
  }
  if (session.status === 'loading' || session.redirecting) {
    return <main className="session-gate" aria-busy="true" />;
  }
  return <AppShell path={path} />;
}

export function App() {
  let e = currentRoute().path.replace(/\/+$/, '') || '/';
  const page = e.startsWith('/track/') ? (
    <TrackingPage wasteId={decodeURIComponent(e.slice('/track/'.length))} />
  ) : e === '/about' ? (
    <AboutPage />
  ) : e === '/login' ? (
    <LoginPage />
  ) : e === '/onboarding' ? (
    <OnboardingPage />
  ) : ['/app', '/wastes', '/map', '/data'].includes(e) ||
    e.startsWith('/wastes/') ||
    e.startsWith('/map/') ? (
    <ProtectedShell path={e} />
  ) : (
    <LandingPage />
  );
  return <>{page}<BerrySiteTour path={e} /></>;
}
