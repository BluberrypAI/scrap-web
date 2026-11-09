// 화면에서 로그인 상태를 쓰는 훅. 판단 로직은 lib/session.js에 있다.
import { useEffect, useState } from 'react';
import { loadSession } from '../lib/session.js';

// hash 라우팅이 이동마다 페이지를 새로 읽으므로, 한 페이지 안에서는 한 번만 불러온다.
let cached = null;

export function useSession() {
  const [state, setState] = useState({ status: 'loading', user: null, company: null });
  useEffect(() => {
    let active = true;
    cached ??= loadSession();
    cached
      .then((session) => active && setState(session))
      .catch((error) => {
        cached = null;
        if (active) setState({ status: 'error', user: null, company: null, error });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
