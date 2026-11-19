// 법정 서식(제6·12·5호) API (server).
//  - 미리보기: 칸별 값 목록·경고·문제 문구 (저장 없음)
//  - 내려받기: 한글(HWPX, 원본 서식 칸에 값) 또는 PDF(빈 서식 위에 값, 인쇄·제출용). 서버에 저장하지 않음
import { apiFetch, ApiError } from '../../lib/api.js';

const enc = encodeURIComponent;
const path = (caseId, kind) => `/diagnosis/cases/${enc(caseId)}/legal-forms/${enc(kind)}`;

export const legalFormsApi = {
  /** body: {company, waste} (snake_case). 응답: {kind, title, filename, edits, warnings, problem} */
  preview: (caseId, kind, body) =>
    apiFetch(`${path(caseId, kind)}/preview`, { method: 'POST', body }),

  /** format: 'hwpx'(한글) | 'pdf'. 파일을 받아 {blob, filename}으로 돌려준다 */
  async download(caseId, kind, body, format = 'hwpx') {
    const res = await fetch(`/api/v1${path(caseId, kind)}?format=${enc(format)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    const fallback = `서식.${format}`;
    return { blob: await res.blob(), filename: filenameFrom(res.headers.get('Content-Disposition'), fallback) };
  },
};

/** Content-Disposition의 filename*=UTF-8''... 우선, 없으면 filename="..." */
export function filenameFrom(header, fallback = '서식.hwpx') {
  if (!header) return fallback;
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try { return decodeURIComponent(star[1].trim()); } catch { /* 아래로 */ }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : fallback;
}
