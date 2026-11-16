// 화면 문구 표. 서버가 라벨을 주면 그것을 쓰고, 없을 때만 이 표로 채운다.

/** 건 상태 → 배지 문구 (ui-contract §3) */
export const STATUS_LABEL = {
  DIAGNOSING: '문진 중',
  NEEDS_INFO: '추가 정보 필요',
  CODE_CONFIRMED: '확정',
  IN_TRANSIT: '운반 중',
  COMPLETED: '완료',
};

/** 건 상태 → 다음 할 일(서버 summary.next_action이 없을 때) */
export const NEXT_ACTION = {
  DIAGNOSING: '질문에 답하기',
  NEEDS_INFO: '추가 정보·서류 확인',
  CODE_CONFIRMED: '경로 추천 대기',
  IN_TRANSIT: '운반 중',
  COMPLETED: '처리 완료',
};

/** 사실 출처 → 배지 (ui-contract §1.2) */
export const SOURCE_LABEL = {
  UTTERANCE: '말함',
  DOCUMENT: '서류',
  PROFILE: '기업 정보',
  SCREENING: '묶음 답',
  DERIVED: '자동',
  SIMULATION: '시험',
};

/** 보드 pending.reason */
export const PENDING_REASON = {
  MISSING: '아직 모름',
  NEEDS_EVIDENCE: '서류 필요',
  DECLARED_UNKNOWN: '모름으로 답함',
};

/** verdict.status → 결론 상태 */
export const VERDICT_STATUS = {
  IN_PROGRESS: '확인 중',
  NEEDS_EVIDENCE: '서류 확인 필요',
  CONFIRMABLE: '확정 가능',
  UNDETERMINABLE: '판정 불가',
};

/** 분류 구분 */
export const CATEGORY_LABEL = {
  GENERAL: '사업장일반폐기물',
  DESIGNATED: '지정폐기물',
  OUT_OF_SCOPE: '폐기물관리법 대상 아님',
  NEEDS_INTERPRETATION: '해석 필요',
};

/** 코드 없는 결론 사유(outcome) → 짧은 이름 */
export const OUTCOME_LABEL = {
  NOT_WASTE: '폐기물 아님',
  CIRCULAR_RESOURCE: '순환자원(폐기물 아님)',
  EXCLUDED: '다른 법 적용',
  HOUSEHOLD: '생활폐기물',
  INTERPRETATION_NEEDED: '관할 기관 해석 필요',
  NO_GENERAL_CODE: '지정폐기물 아님(세부 번호 확인 필요)',
  CODE_NEEDS_TEST: '시험 후 분류',
  NO_MIXTURE_RULE: '소재별로 나눠 확인 필요',
};

/** 인계 route_guidance.action → 한국어 이름 (handoff-contract) */
export const ROUTE_ACTION_LABEL = {
  RECOMMEND_ROUTE: '처리 경로·업체 추천',
  NO_ROUTE_NEEDED: '처리 경로 필요 없음',
  REFER_OTHER_LAW: '다른 법의 절차 안내',
  REFER_MUNICIPALITY: '지자체 생활폐기물 배출 안내',
  REFER_AUTHORITY: '관할 기관 질의 안내',
  NEEDS_TEST: '분석기관 시험 안내',
  MANUAL_CLASSIFICATION: '담당자 분류 확인',
};

/** evidence_type → 서류 이름 (서버 label이 없을 때. app/agent/templates.py EVIDENCE_TEXT와 같다) */
export const EVIDENCE_LABEL = {
  TEST_REPORT: '시험성적서',
  MSDS: '물질안전보건자료(MSDS)',
  EQUIPMENT_NAMEPLATE: '기기 명판 사진 또는 절연유 분석 기록',
  EMISSION_FACILITY_PERMIT: '배출시설 설치허가증(신고증명서)',
  CIRCULAR_RESOURCE_CERTIFICATE: '순환자원 인정서',
  WASTE_DISCHARGE_REPORT: '폐기물 배출자신고서',
  CONSTRUCTION_CONTRACT: '공사 계약서',
  FACILITY_NOTIFICATION: '시설 설치 신고서',
  DOCUMENT: '관련 서류',
};

/** 기업 배출시설 선택지(서버 /companies/profile-options가 없을 때) */
export const FALLBACK_FACILITIES = [
  { value: 'air_emission', label: '대기 배출시설' },
  { value: 'water_emission', label: '수질 배출시설' },
  { value: 'noise_vibration', label: '소음·진동 배출시설' },
  { value: 'waste_treatment', label: '폐기물 처리시설' },
  { value: 'none', label: '해당 없음' },
];

/** 서류 요청 카드의 '서류가 없어요' 문장(서버 EVIDENCE_REFUSE_REPLY와 같아야 한다) */
export const EVIDENCE_REFUSE_REPLY = '서류가 없어요';

/** @param {string|null|undefined} s */
export function statusLabel(s) {
  return (s && STATUS_LABEL[s]) || s || '';
}

/** @param {string} t */
export function evidenceLabel(t) {
  return EVIDENCE_LABEL[t] || t;
}

/** 규칙 검토 상태(verdict·handoff의 review). 전문가가 검토를 마친 규칙만 VERIFIED다. */
export const REVIEW_LABEL = {
  UNVERIFIED: '검토 전 규칙 · 참고용',
  VERIFIED: '전문가 검토 완료',
};

/** 서류 파일 선택 창이 받는 형식. PDF·사진은 엔진이 시험성적서 표 값을 자동으로 읽는다(사진·스캔본은 서버의 문서 인식이 켜져 있어야 함) */
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.tif,.tiff,.bmp,.heic,.heif,.txt,.md,application/pdf,image/*';
