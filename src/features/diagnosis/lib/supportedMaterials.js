/**
 * 문진에서 고를 수 있는 재질을 처리업체 연결까지 검증된 재질로 제한한다.
 *
 * 문진 엔진(scrap-diagnosis v2)은 재질 선택지를 모두 내려준다
 * (pp·pe·pet·pvc·other_resin·synthetic_rubber·aluminium·steel·other). 엔진은 바꾸지 않고 화면에서만 숨긴다.
 * 문진 → 업체 후보 → 수락·QR → 산출물 → 완료까지 이어지는 재질: PP·PE·PET·알루미늄(캔·스크랩)·철(스크랩).
 *  - 알루미늄은 캔이면 51-29-03, 스크랩이면 51-29-02로 판정되고 서버가 각 공정으로 잇는다.
 *  - 철은 스크랩이면 51-29-01(엔진 D18, 2026-11-21)로 서버 철스크랩 공정에 잇는다.
 *    철캔은 엔진이 51-29-03 + route_unsupported로 내고, 경로 화면이 "아직 공정 자료 없음"으로 안내한다.
 * 지원 재질을 늘리면 이 목록만 고친다. 값은 엔진 knowledge/flow/facts.yaml의 material 값이다.
 */
export const SUPPORTED_MATERIALS = ['pp', 'pe', 'pet', 'aluminium', 'steel'];

const ALLOWED = {
  material: new Set(SUPPORTED_MATERIALS),
};

/** 제한 대상 사실 키인지(재질) */
export function isLimitedKey(key) {
  return Object.hasOwn(ALLOWED, key);
}

/** 선택지 목록에서 지원 재질만 남긴다. 제한 대상이 아닌 키는 그대로 둔다 */
export function limitOptions(key, options = []) {
  const allowed = ALLOWED[key];
  if (!allowed) return options;
  // 값 선택지만 남긴다(예전 보드 고치기 선택지는 kind가 없다). 모름·목록에 없음 등은 뺀다
  return options.filter((o) => (o.kind === undefined || o.kind === 'value') && allowed.has(String(o.value)));
}

/**
 * 질문의 선택지를 제한한다. 재질 질문에서는 '모름'도 숨긴다
 * (재질을 모르면 판정과 업체 연결이 모두 이어지지 않는다).
 */
export function limitQuestion(q) {
  if (!q || !isLimitedKey(q.key)) return q;
  return { ...q, options: limitOptions(q.key, q.options), allow_unknown: false };
}
