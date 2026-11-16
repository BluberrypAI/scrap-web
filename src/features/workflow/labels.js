// 처리 건(로트) 상태·물량 형태 문구

/** 로트 status → 화면 문구 */
export const LOT_STATUS = {
  ready: '업체 선택 전',
  offered: '인수 요청 중',
  conditional: '조건부 수락 · 자료 확인 중',
  accepted: '인수 수락 · 입고 대기',
  processing: '처리 중',
  processed: '처리 결과 기록됨',
  review_required: '산출물 확인 필요',
  completed: '완료',
};

/** 인수 요청 status → 화면 문구 */
export const OFFER_STATUS = {
  pending: '응답 대기',
  conditional: '조건부 수락',
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
  'pe-scrap': 'PE 필름·스크랩',
  'pe-shredded': 'PE 파쇄품',
  'pe-washed': 'PE 세척 플레이크',
  'pe-pellet': 'PE 재생 펠렛',
  'pe-compound': 'PE 컴파운드',
  'pet-bottle': 'PET병',
  'pet-sorted': 'PET 선별품',
  'pet-washed': 'PET 세척품',
  'pet-flake': 'PET 플레이크',
  'pet-pellet': 'PET 펠렛',
  'al-used-can': '사용 후 알루미늄 음료캔',
  'al-sheet': '재활용 알루미늄 판재',
  'al-sheet-ingot': '알루미늄 잉곳',
};

/** 재질별로 산출물로 기록할 수 있는 형태 (서버가 로트 재질의 등록 상태인지 확인) */
export const OUTPUT_STATES = {
  pp: ['pp-shredded', 'pp-washed', 'pp-pellet', 'pp-compound'],
  pe: ['pe-shredded', 'pe-washed', 'pe-pellet', 'pe-compound'],
  aluminium: ['al-sheet', 'al-sheet-ingot'],
};

/** 재질별로 완료할 수 있는 실제 산출물 (파쇄품은 완료로 보지 않음) */
export const FINISH_STATES = {
  pp: ['pp-pellet', 'pp-compound'],
  pe: ['pe-pellet', 'pe-compound'],
  aluminium: ['al-sheet', 'al-sheet-ingot'],
};

/**
 * 처리 건을 만들 수 있는 처음 재질·형태 (서버 CreateLot.input_form, 문진·처리경로 교집합)
 * [재질, 형태, 처음 상태, 화면 문구]
 */
export const LOT_INPUT_FORMS = [
  ['pp', 'scrap', 'pp-scrap', 'PP 사출 잔재·스크랩'],
  ['pp', 'shredded', 'pp-shredded', 'PP 파쇄품'],
  ['pe', 'film', 'pe-scrap', 'PE 필름'],
  ['aluminium', 'can', 'al-used-can', '사용 후 알루미늄 음료캔'],
  // 서버 context가 확정 코드·형태를 확인한 경우만 등록. 일반 PET(51-03-01)는 계속 보류.
  ['pet', 'bottle', 'pet-bottle', '사용 후 PET병'],
];

export function canRegisterLot(material, form, wasteCode) {
  return (material !== 'pet' || wasteCode === '51-03-07') && LOT_INPUT_FORMS.some(([m, f]) => m === material && f === form);
}

/** 기존 PP 로트는 재질 값이 없을 수 있어 pp로 본다 */
export function lotMaterial(lot) {
  return lot.data?.initial?.material || 'pp';
}

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
  const initial = lot.data?.initial;
  const form = LOT_INPUT_FORMS.find(([material, value]) => material === lotMaterial(lot) && value === initial?.input_form);
  return form?.[3] || `${initial?.material?.toUpperCase() || ''} 자원순환`;
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
    ...lotCardText(lot, myCompanyId),
    category: '받은 인계',
    updatedAt: '',
    href: `/lots/${lot.id}`,
    received: true,
  };
}

/**
 * 이 기업 입장에서 처리 건이 어디까지 왔는지.
 *  - completed: 재활용 완료
 *  - handed_off: 우리가 보낸 물량을 받는 쪽이 QR 입고 확인함(지금 담당은 다른 기업). 우리 몫은 끝
 *  - active: 우리가 할 일이 있거나 아직 넘기기 전
 */
export function lotProgress(lot, me) {
  if (lot.status === 'completed') return { kind: 'completed', offer: null };
  if (me && lot.current_company_id !== me) {
    const sent = [...(lot.offers || [])]
      .reverse()
      .find((o) => o.sender_id === me && ['received', 'processed'].includes(o.status));
    if (sent) return { kind: 'handed_off', offer: sent };
  }
  return { kind: 'active', offer: null };
}

/** 자원 경로 목록 카드의 상태 문구 (내 몫이 끝났는지 먼저 보여 줌) */
export function lotCardText(lot, me) {
  const progress = lotProgress(lot, me);
  if (progress.kind === 'completed') return { displayStatus: '재활용 완료', message: '처리 과정 보기' };
  if (progress.kind === 'handed_off') return { displayStatus: '전달 완료', message: '처리 추적 중' };
  if (lot.current_company_id === me) {
    return { displayStatus: LOT_STATUS[lot.status] || lot.status, message: '우리 기업이 처리할 차례예요' };
  }
  return { displayStatus: LOT_STATUS[lot.status] || lot.status, message: '상대 기업 응답 대기' };
}
