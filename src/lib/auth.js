// 로그인 여부는 서버(/users/me)가 정한다.
// 여기 저장하는 값은 헤더 버튼처럼 서버 응답 전에 바로 그려야 하는 곳에서 쓰는 힌트이고,
// 세션을 불러올 때마다 서버 결과로 다시 맞춘다.
const authStorageKey = 'scrap-auth-session';

function readHint() {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) || 'null');
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return readHint()?.authenticated === true;
}

// loadSession 결과를 힌트로 저장한다.
export function rememberSession(session) {
  if (!session || session.status === 'signed-out') {
    clearAuthenticatedSession();
    return;
  }
  if (session.status !== 'ready' && session.status !== 'onboarding') return;
  try {
    localStorage.setItem(
      authStorageKey,
      JSON.stringify({ authenticated: true, onboarded: session.status === 'ready' }),
    );
  } catch {
    // 저장소를 쓸 수 없으면 힌트 없이 서버 응답만으로 동작한다.
  }
}

export function clearAuthenticatedSession() {
  try {
    localStorage.removeItem(authStorageKey);
  } catch {
    // 위와 같음
  }
}

export function getStartPath() {
  const hint = readHint();
  if (hint?.authenticated !== true) return '/login?mode=signup';
  return hint.onboarded === false ? '/onboarding' : '/wastes';
}
