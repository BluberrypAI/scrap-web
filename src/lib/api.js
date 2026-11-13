// server API(/api/v1) 호출 모음.
// 로그인은 httpOnly 쿠키로 유지되므로 항상 같은 출처(/api/v1)로만 호출한다.
// 개발 중에는 Vite 프록시, 운영에서는 nginx가 /api/ 요청을 서버로 넘긴다.

const BASE = '/api/v1';

// 서버 공통 오류 형식 {code, message, details}를 담는다.
// 문진 API는 엔진 오류 본문({detail: {code, message}} 또는 {detail: "문구"})을 그대로 넘기므로 그것도 읽는다.
export class ApiError extends Error {
  constructor(status, body) {
    const detail = body && typeof body === 'object' ? body.detail : null;
    const inner = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : null;
    super(
      body?.message ||
        inner?.message ||
        (typeof detail === 'string' ? detail : null) ||
        `요청을 처리하지 못했어요 (${status})`,
    );
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code ?? inner?.code ?? null;
    this.details = body?.details ?? detail ?? null;
  }
}

let refreshing = null;

// access 토큰이 만료되면 refresh 토큰으로 한 번만 다시 발급받는다.
// 동시에 여러 요청이 401을 받아도 갱신 요청은 하나만 보낸다 (서버가 refresh 토큰을 회전함).
function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function apiFetch(path, { method = 'GET', body, query, retry = true } = {}) {
  const search = query ? `?${new URLSearchParams(query)}` : '';
  // 파일 업로드(FormData)는 브라우저가 경계값을 담은 Content-Type을 직접 붙인다
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BASE}${path}${search}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined || isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return apiFetch(path, { method, body, query, retry: false });
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const api = {
  // 소셜 로그인은 fetch가 아니라 페이지 이동으로 시작한다 (API-001)
  loginUrl: (provider) => `${BASE}/auth/${encodeURIComponent(provider)}/login`,
  // 로컬 서버에만 있는 개발용 로그인
  devLogin: (email) => apiFetch('/auth/dev-login', { method: 'POST', body: email ? { email } : {} }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  me: () => apiFetch('/users/me'),
  withdraw: () => apiFetch('/users/me/withdraw', { method: 'POST', body: { confirm: true } }),

  createCompany: (company) => apiFetch('/companies', { method: 'POST', body: company }),
  myCompany: () => apiFetch('/companies/me'),
  // changes에는 바꿀 필드만 담는다. profileVersion은 조회 때 받은 값이다.
  updateCompany: (profileVersion, changes) =>
    apiFetch('/companies/me', {
      method: 'PATCH',
      body: { ...changes, profile_version: profileVersion },
    }),
  companyHistory: (pageNumber = 1, pageSize = 20) =>
    apiFetch('/companies/me/history', { query: { pageNumber, pageSize } }),

  // 문진 (server가 문진 엔진으로 중계함, 응답은 엔진 형식 그대로)
  diagnosis: {
    // body: { memo?, quantity?, unit?, period? } → { case, turn }
    createCase: (body = {}) => apiFetch('/diagnosis/cases', { method: 'POST', body }),
    // 내 기업의 문진 건 목록 → { items, pagingInfo }
    listCases: (page = 1, size = 100) => apiFetch('/diagnosis/cases', { query: { page, size } }),
    // 건 상세. latest_turn으로 새로고침 뒤 이어서 그림
    getCase: (caseId) => apiFetch(`/diagnosis/cases/${encodeURIComponent(caseId)}`),
    // body: { text } 또는 { quick_reply: { key, kind, value } } → TurnResponse
    send: (caseId, body) =>
      apiFetch(`/diagnosis/cases/${encodeURIComponent(caseId)}/messages`, { method: 'POST', body }),
    // 규칙 버전이 바뀐 건(KB_CHANGED)을 지금 규칙으로 다시 평가
    rebase: (caseId) =>
      apiFetch(`/diagnosis/cases/${encodeURIComponent(caseId)}/rebase`, { method: 'POST' }),
    // → { case, verdict, handoff }
    confirm: (caseId, expectedCode) =>
      apiFetch(`/diagnosis/cases/${encodeURIComponent(caseId)}/confirm`, {
        method: 'POST',
        body: expectedCode ? { expected_code: expectedCode } : {},
      }),
    reopen: (caseId) =>
      apiFetch(`/diagnosis/cases/${encodeURIComponent(caseId)}/reopen`, { method: 'POST', body: {} }),
  },
};
