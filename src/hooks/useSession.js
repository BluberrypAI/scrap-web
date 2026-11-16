// 화면에서 로그인 상태를 쓰는 훅. 판단 로직은 lib/session.js에 있다.
import { useEffect, useState } from 'react';
import { rememberSession } from '../lib/auth.js';
import { currentRoute, navigate } from '../lib/router.js';
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
  let target = ready ? redirectFor(session, path) : null;
  // 로그인 뒤 돌아올 화면(입고 QR처럼 링크로 바로 여는 화면)
  if (ready && !target && session.status === 'ready' && path === '/wastes') target = peekReturnPath();
  useEffect(() => {
    if (!target) return;
    if (target === '/login' && path.startsWith('/lots/')) saveReturnPath(path + currentRoute().search);
    if (target.startsWith('/lots/')) clearReturnPath();
    navigate(target);
  }, [target, path]);
  return { ...session, redirecting: Boolean(target) };
}

// 소셜 로그인은 서버가 랜딩(/)으로 돌려보내므로, 저장해 둔 화면(입고 QR 등)이 있을 때만
// 로그인 상태를 확인해 그 화면으로 이어 간다. 저장된 화면이 없으면 아무것도 부르지 않는다.
export function useResumeReturnPath(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const target = peekReturnPath();
    if (!target) return undefined;
    let active = true;
    cached ??= loadSession().then((session) => {
      rememberSession(session);
      return session;
    });
    cached
      .then((session) => {
        if (!active || session.status === 'signed-out') return;
        // 기업 등록 전이면 등록 화면에서 /wastes로 넘어갈 때 이어 간다
        if (session.status === 'onboarding') return navigate('/onboarding');
        clearReturnPath();
        navigate(target);
      })
      .catch(() => {
        cached = null;
      });
    return () => {
      active = false;
    };
  }, [enabled]);
}

const RETURN_KEY = 'scrap-return-to';

function saveReturnPath(value) {
  try {
    sessionStorage.setItem(RETURN_KEY, value);
  } catch {
    // 저장소를 못 쓰면 로그인 뒤 목록으로 간다
  }
}

function peekReturnPath() {
  try {
    const value = sessionStorage.getItem(RETURN_KEY);
    return value && value.startsWith('/lots/') ? value : null;
  } catch {
    return null;
  }
}

function clearReturnPath() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // 위와 같음
  }
}
