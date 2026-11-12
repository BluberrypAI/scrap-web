import { lazy, Suspense } from 'react';

const MeadowShowcase = lazy(() => import('./MeadowShowcase.jsx').then(module => ({ default: module.MeadowShowcase })));

export function MeadowBackground() {
  return <Suspense fallback={null}><MeadowShowcase /></Suspense>;
}
