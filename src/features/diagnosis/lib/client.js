// 문진 화면의 API 호출. server(/api/v1/diagnosis)가 로그인한 기업 기준으로 엔진에 중계한다.
// 엔진 참조 화면(scrap-diagnosis web/)의 client.js와 같은 함수 이름·반환 형식을 유지해 화면 코드를 그대로 쓴다.
//  - 오류에는 kind를 붙인다: network(다시 보내기) / stale·conflict(새로 불러오기) / unauthorized / validation / not_found / http
import { ApiError, apiFetch } from '../../../lib/api.js';
import { normalizeCase, normalizeDetail, normalizeTurn, setCatalog } from './normalize.js';

export const NETWORK_MESSAGE = '서버에 연결하지 못했어요. 연결을 확인하고 다시 보내 주세요.';
export const VALIDATION_MESSAGE = '입력값을 확인해 주세요';

const BASE = '/diagnosis';
const enc = encodeURIComponent;

/** server·엔진 오류에 화면이 쓰는 kind를 붙인다 */
export function withKind(error) {
  if (!(error instanceof ApiError)) {
    if (error && error.name === 'AbortError') return error;
    const e = new ApiError(0, { message: NETWORK_MESSAGE });
    e.kind = 'network';
    return e;
  }
  const { status, code } = error;
  if (status === 401) error.kind = 'unauthorized';
  else if (status === 404) error.kind = 'not_found';
  else if (status === 422) {
    error.kind = 'validation';
    if (Array.isArray(error.details) || /요청을 처리하지 못했어요/.test(error.message)) error.message = VALIDATION_MESSAGE;
  } else if (status === 409) {
    error.kind = code === 'STALE' || /먼저 갱신|동시/.test(error.message) ? 'stale' : 'conflict';
  } else error.kind = 'http';
  return error;
}

async function call(path, options) {
  try {
    return await apiFetch(BASE + path, options);
  } catch (error) {
    throw withKind(error);
  }
}

export const diagnosisApi = {
  catalogFacts: async () => {
    const list = await call('/catalog/facts').catch(() => []);
    setCatalog(list);
    return list;
  },
  /** @param {{memo?: string|null, quantity?: number|null, unit?: string|null, period?: string|null}} body */
  createCase: async (body = {}) => {
    const d = await call('/cases', { method: 'POST', body });
    return { case: normalizeCase(d.case), turn: normalizeTurn(d.turn) };
  },
  listCases: async (page = 1, size = 100) => {
    const d = await call('/cases', { query: { page, size } });
    return { ...d, items: (d.items || []).map(normalizeCase) };
  },
  getCase: async (id) => normalizeDetail(await call(`/cases/${enc(id)}`)),
  /** @param {{text?: string, quick_reply?: {key: string, kind: string, value?: any}}} msg */
  sendMessage: async (id, msg) =>
    normalizeTurn(await call(`/cases/${enc(id)}/messages`, { method: 'POST', body: msg })),
  /** 서류 업로드. facts는 검수 대기 후보로만 저장되고 판정은 그대로다 */
  uploadDocument: async (id, file, facts = null) => {
    const form = new FormData();
    form.append('file', file, file.name || 'document');
    if (facts && Object.keys(facts).length) form.append('facts', JSON.stringify(facts));
    const d = await call(`/cases/${enc(id)}/documents`, { method: 'POST', body: form });
    return { document: d.document, turn: normalizeTurn(d.turn), values: d.values || [] };
  },
  /** 검수한 서류 값을 판정에 반영 */
  applyDocumentValues: async (id, docId, values) =>
    normalizeTurn(
      await call(`/cases/${enc(id)}/documents/${enc(docId)}/values/apply`, { method: 'POST', body: { values } }),
    ),
  revokeDocument: async (id, docId, reason = null) =>
    normalizeTurn(await call(`/cases/${enc(id)}/documents/${enc(docId)}/revoke`, { method: 'POST', body: { reason } })),
  confirm: async (id, expectedCode = null) => {
    const d = await call(`/cases/${enc(id)}/confirm`, {
      method: 'POST',
      body: expectedCode ? { expected_code: expectedCode } : {},
    });
    return { ...d, case: normalizeCase(d.case) };
  },
  reopen: async (id, reason) => {
    const d = await call(`/cases/${enc(id)}/reopen`, { method: 'POST', body: { reason: reason || null } });
    return { ...d, case: normalizeCase(d.case), turn: normalizeTurn(d.turn) };
  },
  rebase: async (id) => normalizeTurn(await call(`/cases/${enc(id)}/rebase`, { method: 'POST' })),
  trace: (id) => call(`/cases/${enc(id)}/trace`),
};
