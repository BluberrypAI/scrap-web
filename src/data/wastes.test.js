import assert from 'node:assert/strict';
import test from 'node:test';

const storage = Object.create(null);
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: Object.assign(storage, {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, value) => { storage[key] = value; },
  }),
});
const { wasteDisplayStatus, wasteStatusMessage } = await import('./wastes.js');

test('route progress is used as the visible card status', () => {
  assert.equal(wasteDisplayStatus({ status: '처리 진행', routePhase: 'transporting' }), '운송 중');
  assert.equal(wasteDisplayStatus({ status: '처리 진행', routePhase: 'processing' }), '처리 중');
  assert.equal(wasteDisplayStatus({ status: '확정' }), '업체 확인 대기');
  assert.equal(
    wasteStatusMessage({ status: '확정', treatmentInput: { material: 'PP' } }),
    '처리업체 1의 처리 가능 여부 확인을 기다리고 있어요',
  );
  assert.equal(
    wasteStatusMessage({ status: '확정' }),
    '처리업체 1의 처리 가능 여부 확인을 기다리고 있어요',
  );
});
