import { availableForms } from '../../documents/fields.js';

export const DESIGNATED_TITLE = '지정폐기물로 판정됐어요';
export const DESIGNATED_FALLBACK_WARNING = '지정폐기물은 지정폐기물 처리 허가를 받은 업체에만 맡길 수 있어요.';
export const DESIGNATED_CONFIRM_TEXT = '지정폐기물로 확정합니다. 일반 재활용 업체에는 맡길 수 없어요. 확정할까요?';
export const DEFAULT_CONFIRM_TEXT = '확정하면 판정이 기록되고 다음 단계로 넘어갑니다. 확정할까요?';

export const isDesignated = (category) => category === 'DESIGNATED';

/**
 * 지정폐기물 경고 배너 내용. 지정폐기물이 아니면 null.
 * designated 필드가 없는 옛 엔진이면 기본 문구만 보인다.
 * @param {{category?: string|null, reason?: string|null, designated?: any}} result
 */
export function designatedNotice(result) {
  if (!result || !isDesignated(result.category)) return null;
  const d = result.designated || null;
  return {
    title: DESIGNATED_TITLE,
    warning: d?.warning || DESIGNATED_FALLBACK_WARNING,
    reason: d?.reason || result.reason || null,
    nextActions: Array.isArray(d?.next_actions) ? d.next_actions.filter((a) => a?.text) : [],
  };
}

export const confirmPrompt = (category) => (isDesignated(category) ? DESIGNATED_CONFIRM_TEXT : DEFAULT_CONFIRM_TEXT);

/** 인계(handoff)에서 지정폐기물 정보를 읽는다. 최상위 또는 result 안 어느 쪽이든 */
export function handoffDesignated(handoff) {
  if (!handoff) return null;
  const result = handoff.result ?? handoff;
  const category = result.category ?? handoff.category;
  return designatedNotice({ category, reason: result.reason ?? null, designated: handoff.designated ?? result.designated ?? null });
}

/** 제12호 작성 화면으로 가는 주소. 서식 화면이 열 수 있는 인계일 때만 준다 */
export function form12Href(caseId, handoff) {
  if (!caseId || !availableForms(handoff).includes('form12')) return null;
  return `/wastes/case-${encodeURIComponent(caseId)}/documents`;
}
