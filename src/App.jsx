import { AppShell } from './layouts/AppShell.jsx';
import { currentRoute } from './lib/router.js';
import { AboutPage } from './pages/about/AboutPage.jsx';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { OnboardingPage } from './pages/auth/OnboardingPage.jsx';
import { LandingPage } from './pages/landing/LandingPage.jsx';
import { BerrySiteTour } from './components/BerrySiteTour.jsx';
import * as React from 'react';
import { createWasteTracking } from './waste-tracking.jsx';

const { Page: TrackingPage } = createWasteTracking(React);

export function App() {
  let e = currentRoute().path.replace(/\/+$/, '') || '/';
  const tracking = e.match(/^\/track\/([^/]+)(?:\/([^/]+))?$/);
  const page = tracking ? (
    <TrackingPage wasteId={decodeURIComponent(tracking[1])}
      legId={tracking[2] ? decodeURIComponent(tracking[2]) : null} />
  ) : e === '/about' ? (
    <AboutPage />
  ) : e === '/login' ? (
    <LoginPage />
  ) : e === '/onboarding' ? (
    <OnboardingPage />
  ) : ['/app', '/wastes', '/map', '/data'].includes(e) ||
    e.startsWith('/wastes/') ||
    e.startsWith('/map/') ? (
    <AppShell path={e} />
  ) : (
    <LandingPage />
  );
  return <>{page}<BerrySiteTour path={e} /></>;
}
