/**
 * 문진에서 고를 수 있는 소재를 처리업체 연결까지 검증된 재질로 제한한다.
 *
 * 문진 엔진(scrap-diagnosis)은 전체 소재를 그대로 내려준다. 엔진은 바꾸지 않고 화면에서만 숨긴다.
 * 문진 → 업체 후보 → 수락·QR → 산출물 → 완료까지 이어지는 재질: PP·PE·PET·철·알루미늄.
 *  - 알루미늄은 금속캔(알루미늄 음료캔)과 비철금속(세부 재질에서 알루미늄 스크랩)으로 들어온다.
 * 지원 재질을 늘리면 이 목록만 고친다. 값은 엔진 knowledge/materials.yaml의 키다.
 */
export const SUPPORTED_MATERIAL_GROUPS = ['plastic', 'metal'];
export const SUPPORTED_MATERIALS = ['pp', 'pe', 'pet', 'ferrous_scrap', 'metal_can', 'nonferrous_scrap'];

const ALLOWED = {
  material_group: new Set(SUPPORTED_MATERIAL_GROUPS),
  material: new Set(SUPPORTED_MATERIALS),
};

/** 제한 대상 사실 키인지(소재 분류·소재) */
export function isLimitedKey(key) {
  return Object.hasOwn(ALLOWED, key);
}

/** 선택지 목록에서 지원 재질만 남긴다. 제한 대상이 아닌 키는 그대로 둔다 */
export function limitOptions(key, options = []) {
  const allowed = ALLOWED[key];
  if (!allowed) return options;
  // 값 선택지만 남긴다(보드 고치기 선택지는 kind가 없다). 모름·목록에 없음 등은 뺀다
  return options.filter((o) => (o.kind === undefined || o.kind === 'value') && allowed.has(String(o.value)));
}

/**
 * 질문의 선택지를 제한한다. 소재 질문에서는 '목록에 없어요/모름'도 숨긴다
 * (고르면 엔진이 전체 폐기물 종류 질문으로 넘어가 지원하지 않는 재질로 이어진다).
 */
export function limitQuestion(q) {
  if (!q || !isLimitedKey(q.key)) return q;
  return { ...q, options: limitOptions(q.key, q.options), allow_unknown: false };
}
