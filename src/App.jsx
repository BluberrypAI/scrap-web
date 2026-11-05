import { AppShell } from './layouts/AppShell.jsx';
import { currentRoute } from './lib/router.js';
import { AboutPage } from './pages/about/AboutPage.jsx';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { OnboardingPage } from './pages/auth/OnboardingPage.jsx';
import { LandingPage } from './pages/landing/LandingPage.jsx';

export function App() {
  let e = currentRoute().path.replace(/\/+$/, '') || '/';
  return e === '/about' ? (
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
}
