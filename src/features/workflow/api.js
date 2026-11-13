// 처리 경로·기업 간 인계 API (server).
//  - 문진 연계 처리 경로: /api/v1/diagnosis/cases/{id}/treatment/* (분류번호·재질·위치는 서버가 확정 문진에서 읽음)
//  - 기업 간 인계(PP): /api/v1/workflow/* (로트·사진·업체 검토·인수 요청·QR 입고·산출물·완료)
import { apiFetch } from '../../lib/api.js';

const enc = encodeURIComponent;

// 서버의 HTTPException은 {detail: "문구"}, 공통 오류는 {code, message} 형식이다. ApiError가 둘 다 message로 읽는다.
export const workflowApi = {
  // ---- 문진 연계 처리 경로 ----
  /** 확정 문진의 첫 공정 후보. inputForm이 없으면 needs_input과 선택지(available_forms)를 돌려준다 */
  caseNextStep: (caseId, inputForm = null) =>
    apiFetch(`/diagnosis/cases/${enc(caseId)}/treatment/next-step`, {
      method: 'POST',
      body: inputForm ? { input_form: inputForm } : {},
    }),
  /** 후보 업체 전체의 공개 근거 AI 검토 (Azure 호출, 수십 초 걸릴 수 있음) */
  caseIntakeReviews: (caseId, inputForm) =>
    apiFetch(`/diagnosis/cases/${enc(caseId)}/treatment/intake-reviews`, {
      method: 'POST',
      body: { input_form: inputForm },
    }),

  // ---- 기업 간 인계 ----
  listLots: () => apiFetch('/workflow/lots'),
  getLot: (lotId) => apiFetch(`/workflow/lots/${enc(lotId)}`),
  /** 확정 문진으로 처리 건 등록. 같은 문진으로 이미 만든 건이 있으면 그 건을 돌려준다 */
  createLot: ({ diagnosisId, inputForm, massKg, condition }) =>
    apiFetch('/workflow/lots', {
      method: 'POST',
      body: { diagnosis_id: diagnosisId, input_form: inputForm, mass_kg: massKg, condition },
    }),
  addPhoto: (lotId, file) => {
    const form = new FormData();
    form.append('file', file, file.name || 'photo.jpg');
    return apiFetch(`/workflow/lots/${enc(lotId)}/photos`, { method: 'POST', body: form });
  },
  photoUrl: (photo) => photo.url,
  /** 현재 물량 기준 다음 공정 업체 검토(사진·상태 AI 관찰 포함) */
  reviewCandidates: (lot) =>
    apiFetch(`/workflow/lots/${enc(lot.id)}/candidates`, { method: 'POST', body: { revision: lot.revision } }),
  sendOffer: (lot, capabilityKey) =>
    apiFetch(`/workflow/lots/${enc(lot.id)}/offers`, {
      method: 'POST',
      body: { revision: lot.revision, capability_key: capabilityKey },
    }),
  getOffer: (offerId) => apiFetch(`/workflow/offers/${enc(offerId)}`),
  decide: (lot, offerId, { accept, note, scopeChecked, intakeChecked }) =>
    apiFetch(`/workflow/offers/${enc(offerId)}/decision`, {
      method: 'POST',
      body: {
        revision: lot.revision,
        accept,
        note,
        scope_checked: scopeChecked,
        intake_checked: intakeChecked,
      },
    }),
  /** 입고 QR 발급. 토큰 원문은 이 응답에만 있고 서버에는 해시만 남는다 */
  issueQr: (lot, offerId) =>
    apiFetch(`/workflow/offers/${enc(offerId)}/qr`, { method: 'POST', body: { revision: lot.revision } }),
  receive: (lot, offerId, token) =>
    apiFetch(`/workflow/offers/${enc(offerId)}/receive`, {
      method: 'POST',
      body: { revision: lot.revision, token },
    }),
  recordOutput: (lot, output) =>
    apiFetch(`/workflow/lots/${enc(lot.id)}/output`, {
      method: 'POST',
      body: { revision: lot.revision, ...output },
    }),
  finish: (lot, { reference, intendedUse }) =>
    apiFetch(`/workflow/lots/${enc(lot.id)}/finish`, {
      method: 'POST',
      body: { revision: lot.revision, reference, intended_use: intendedUse, confirmed: true },
    }),
};

/** 입고 QR에 넣는 주소. 수신 기업이 로그인한 상태로 열면 입고 확인 화면이 뜬다 */
export function receiveUrl(lotId, offerId, token) {
  return `${location.origin}/#/lots/${enc(lotId)}/receive/${enc(offerId)}?t=${enc(token)}`;
}
