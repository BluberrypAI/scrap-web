const prefix = 'scrap.field-checks.v1.';
export const fieldCheckEvent = 'scrap-field-check-change';

export function readFieldChecks(wasteId) {
  try {
    const value = JSON.parse(localStorage.getItem(prefix + wasteId));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export function saveFieldCheck(wasteId, role, actor) {
  if (!['driver', 'recipient'].includes(role) || !actor.trim()) {
    throw new Error('담당 역할과 이름을 확인해 주세요.');
  }
  const next = { ...readFieldChecks(wasteId), [role]: {
    actor: actor.trim(), confirmedAt: new Date().toISOString(),
  } };
  localStorage.setItem(prefix + wasteId, JSON.stringify(next));
  globalThis.dispatchEvent?.(new Event(fieldCheckEvent));
  return next;
}

export function fieldStatus(checks) {
  if (checks.recipient) return '처리 진행';
  if (checks.driver) return '운송 중';
  return '현장 확인 전';
}
