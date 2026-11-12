import { lazy, Suspense } from 'react';

const loadMeadowShowcase = () => import('./MeadowShowcase.jsx');
const MeadowShowcase = lazy(() => loadMeadowShowcase()
  .then(module => ({ default: module.MeadowShowcase })));

export function preloadMeadowShowcase() {
  return loadMeadowShowcase();
}

export function MeadowBackground({ onBerryClick }) {
  return <Suspense fallback={null}><MeadowShowcase onBerryClick={onBerryClick} /></Suspense>;
}
