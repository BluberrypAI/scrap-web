import { useEffect } from 'react';

export function useExitGuard(e) {
  useEffect(() => {
    window.history.state?.l3Guard ||
      window.history.pushState(
        {
          l3Guard: true,
        },
        '',
      );
    let t = () => {
      (e(true),
        window.history.pushState(
          {
            l3Guard: true,
          },
          '',
        ));
    };
    return (
      window.addEventListener('popstate', t),
      () => window.removeEventListener('popstate', t)
    );
  }, [e]);
}
