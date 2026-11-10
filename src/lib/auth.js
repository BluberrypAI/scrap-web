const authStorageKey = 'scrap-auth-session';
const signupDraftStorageKey = 'scrap-signup-draft';

export function isAuthenticated() {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) || 'null')?.authenticated === true;
  } catch {
    return false;
  }
}

export function saveAuthenticatedSession() {
  localStorage.setItem(
    authStorageKey,
    JSON.stringify({ authenticated: true, signedInAt: new Date().toISOString() }),
  );
}

export function clearAuthenticatedSession() {
  localStorage.removeItem(authStorageKey);
}

export function saveSignupDraft({ email = '' } = {}) {
  sessionStorage.setItem(signupDraftStorageKey, JSON.stringify({ email }));
}

export function getSignupDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(signupDraftStorageKey) || 'null') || { email: '' };
  } catch {
    return { email: '' };
  }
}

export function clearSignupDraft() {
  sessionStorage.removeItem(signupDraftStorageKey);
}

export function getStartPath() {
  return isAuthenticated() ? '/wastes' : '/login?mode=signup';
}
