// 처리 건(로트) 상태·물량 형태 문구

/** 로트 status → 화면 문구 */
export const LOT_STATUS = {
  ready: '업체 선택 전',
  offered: '인수 요청 중',
  accepted: '인수 수락 · 입고 대기',
  processing: '처리 중',
  processed: '처리 결과 기록됨',
  review_required: '산출물 확인 필요',
  completed: '완료',
};

/** 인수 요청 status → 화면 문구 */
export const OFFER_STATUS = {
  pending: '응답 대기',
  accepted: '수락',
  rejected: '거절',
  received: '입고 확인',
  processed: '처리 결과 기록',
};

/** 물량 형태(state_key) → 화면 문구 */
export const STATE_LABEL = {
  'pp-scrap': 'PP 사출 잔재·스크랩',
  'pp-shredded': 'PP 파쇄품',
  'pp-washed': 'PP 세척 플레이크',
  'pp-pellet': 'PP 재생 펠렛',
  'pp-compound': 'PP 컴파운드',
};

/** 산출물로 기록할 수 있는 형태 (서버 Output.state_key) */
export const OUTPUT_STATES = ['pp-shredded', 'pp-washed', 'pp-pellet', 'pp-compound'];

/** 처리 건을 만들 수 있는 처음 형태 (서버 CreateLot.input_form) */
export const LOT_INPUT_FORMS = [
  ['scrap', 'PP 사출 잔재·스크랩'],
  ['shredded', 'PP 파쇄품'],
];

/** 업체 AI 검토 결과(status·finding) → 문구 */
export const REVIEW_STATUS = {
  reviewed: '공개 근거 확인',
  needs_evidence: '근거 추가 확인 필요',
  model_unavailable: '검토 미완료',
};
export const REVIEW_FINDING = {
  form_mentioned: '이 형태의 반입 근거가 공개 자료에 있음',
  restriction_mentioned: '제한 조건이 공개 자료에 있음',
  insufficient: '공개 자료만으로는 판단하기 어려움',
};
export const CONCERN_CATEGORY = {
  cleaning: '세척',
  sorting: '선별',
  drying: '건조',
  testing: '시험',
  facility_evidence: '업체 근거',
  description_conflict: '설명 불일치',
  other: '기타',
};

/** 로트 status → 폐기물 카드 진행 상태(자원 경로 목록의 단계) */
export function lotCardStatus(status) {
  if (status === 'completed') return '완료';
  if (status === 'ready') return '확정';
  return '처리 진행';
}

export function formatKg(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toLocaleString('ko-KR')}kg`;
}

export function formatDateTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** 로트에서 처리 건 이름 (처음 등록한 형태) */
export function lotTitle(lot) {
  return STATE_LABEL[lot.data?.initial?.input_form === 'shredded' ? 'pp-shredded' : 'pp-scrap'];
}

/** 자원 경로 목록에 보일 "받은 인계" 카드 (다른 기업이 등록한 물량 중 우리가 요청받았거나 처리 중인 것) */
export function lotToWaste(lot, myCompanyId) {
  return {
    id: `lot-${lot.id}`,
    lotId: lot.id,
    caseId: null,
    name: `${lotTitle(lot)} · ${lot.companies[lot.owner_company_id] || '다른 기업'}`,
    code: lot.data?.handoff?.waste_code,
    status: lot.status === 'completed' ? '완료' : '처리 진행',
    displayStatus: LOT_STATUS[lot.status] || lot.status,
    message: lot.current_company_id === myCompanyId ? '우리 기업이 처리할 차례예요' : '받은 인계 요청',
    category: '받은 인계',
    updatedAt: '',
    href: `/lots/${lot.id}`,
    received: true,
  };
}
