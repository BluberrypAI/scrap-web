import { useCallback, useEffect, useState } from 'react';

/** 비동기 읽기. fn은 deps가 바뀔 때마다 다시 부른다. reload()로 수동 갱신 */
export function useLoad(fn, deps) {
  const [s, setS] = useState({ data: null, error: null, loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setS((p) => ({ ...p, loading: true, error: null }));
    fn().then(
      (data) => live && setS({ data, error: null, loading: false }),
      (error) => live && setS({ data: null, error, loading: false }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { ...s, reload };
}
