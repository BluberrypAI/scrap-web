import assert from 'node:assert/strict';
import test from 'node:test';
import { fieldStatus, readFieldChecks, saveFieldCheck } from './field-checks.js';

test('QR confirmations update the waste status in the same browser', () => {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  } });
  assert.equal(fieldStatus(readFieldChecks('waste-alkali')), '현장 확인 전');
  saveFieldCheck('waste-alkali', 'driver', '기사 A');
  assert.equal(fieldStatus(readFieldChecks('waste-alkali')), '운송 중');
  saveFieldCheck('waste-alkali', 'recipient', '업체 담당자 B');
  assert.equal(fieldStatus(readFieldChecks('waste-alkali')), '처리 진행');
  assert.equal(readFieldChecks('waste-alkali').driver.actor, '기사 A');
});
