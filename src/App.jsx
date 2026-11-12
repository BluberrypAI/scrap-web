import { AppShell } from './layouts/AppShell.jsx';
import { currentRoute } from './lib/router.js';
import { AboutPage } from './pages/about/AboutPage.jsx';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { OnboardingPage } from './pages/auth/OnboardingPage.jsx';
import { LandingPage } from './pages/landing/LandingPage.jsx';
import { preloadMeadowShowcase } from './pages/landing/ShowcaseHome.jsx';
import { BerrySiteTour } from './components/BerrySiteTour.jsx';
import * as React from 'react';
import { createWasteTracking } from './waste-tracking.jsx';

const { Page: TrackingPage } = createWasteTracking(React);

export function App() {
  const [route, setRoute] = React.useState(currentRoute);
  React.useEffect(() => {
    const updateRoute = () => {
      setRoute(currentRoute());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  React.useEffect(() => {
    if (route.path === '/') return undefined;
    const preload = () => { preloadMeadowShowcase().catch(() => {}); };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 250);
    return () => window.clearTimeout(id);
  }, [route.path]);

  let e = route.path.replace(/\/+$/, '') || '/';
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
    <AppShell path={e} />
  ) : (
    <LandingPage />
  );
  return <>{page}<BerrySiteTour path={e} /></>;
}
