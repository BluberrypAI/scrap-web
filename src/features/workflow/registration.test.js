import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLot } from './registration.js';

test('invalid registration values give feedback without calling API', async () => {
  let calls = 0;
  const create = async () => { calls++; };
  for (const massKg of ['', 0, -1, Infinity, 1e10]) {
    await assert.rejects(registerLot(create, { massKg, condition: '깨끗한 파쇄품' }), /중량/);
  }
  await assert.rejects(registerLot(create, { massKg: 1, condition: '  ' }), /상태 설명/);
  assert.equal(calls, 0);
});

test('fractional mass is accepted and an existing lot can be returned', async () => {
  const lot = { id: 'existing-lot', data: { current: {} } };
  const result = await registerLot(async (body) => {
    assert.equal(body.massKg, 0.05);
    assert.equal(body.condition, '깨끗한 파쇄품');
    assert.equal(body.diagnosisId, 'case-id');
    return lot;
  }, { diagnosisId: 'case-id', inputForm: 'shredded', massKg: '0.05', condition: ' 깨끗한 파쇄품 ' });
  assert.equal(result, lot);
});

test('API errors and invalid responses do not silently complete registration', async () => {
  const values = { massKg: 250, condition: '깨끗한 파쇄품' };
  await assert.rejects(registerLot(async () => { throw new Error('서버 연결 실패'); }, values), /서버 연결 실패/);
  await assert.rejects(registerLot(async () => null, values), /등록 결과/);
});
