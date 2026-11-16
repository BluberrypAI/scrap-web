import assert from 'node:assert/strict';
import test from 'node:test';
import { workflowApi } from './api.js';

test('세부 재질 확인을 경로·AI·물량 등록에 동일하게 전달한다', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  };
  try {
    await workflowApi.caseNextStep('packaging-case', 'film', true, 'pe');
    await workflowApi.caseIntakeReviews('packaging-case', 'film', true, 'pe');
    await workflowApi.createLot({ diagnosisId: 'packaging-case', inputForm: 'film',
      solidConfirmed: true, materialDetail: 'pe', massKg: 100, condition: '가상 시험 물량' });
    assert.equal(calls.length, 3);
    for (const { body } of calls) {
      assert.equal(body.material_detail, 'pe');
      assert.equal(body.input_form, 'film');
      assert.equal(body.solid_confirmed, true);
      assert.equal('waste_code' in body, false);
      assert.equal('material' in body, false);
    }
  } finally { globalThis.fetch = original; }
});
