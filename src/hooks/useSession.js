// 화면에서 로그인 상태를 쓰는 훅. 판단 로직은 lib/session.js에 있다.
import { useEffect, useState } from 'react';
import { rememberSession } from '../lib/auth.js';
import { navigate } from '../lib/router.js';
import { loadSession, redirectFor } from '../lib/session.js';

// 한 페이지 안에서는 한 번만 불러온다. 화면 이동은 페이지를 새로 읽지 않으므로
// 로그인·기업 등록·로그아웃처럼 상태가 바뀐 뒤에는 resetSession()으로 다시 불러오게 한다.
let cached = null;

export function resetSession() {
  cached = null;
}

export function useSession() {
  const [state, setState] = useState({ status: 'loading', user: null, company: null });
  useEffect(() => {
    let active = true;
    cached ??= loadSession().then((session) => {
      rememberSession(session);
      return session;
    });
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

// 로그인 상태에 맞지 않는 화면이면 맞는 화면으로 보낸다.
// 반환값의 redirecting이 true면 곧 이동하므로 화면을 그리지 않아도 된다.
export function useRequireSession(path) {
  const session = useSession();
  const ready = session.status !== 'loading' && session.status !== 'error';
  const target = ready ? redirectFor(session, path) : null;
  useEffect(() => {
    if (target) navigate(target);
  }, [target]);
  return { ...session, redirecting: Boolean(target) };
}
