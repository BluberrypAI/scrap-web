import assert from 'node:assert/strict';
import test from 'node:test';
import { publicInquiryApi, workflowApi } from './api.js';

test('공개 참여만 로그인 쿠키를 받고 401에서도 토큰을 재발급하지 않는다', async (t) => {
  const calls = [];
  const joined = { company_name: '시험 업체 (링크 참여)', lot_visible: false };
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, { method, credentials, cache }) => {
    calls.push({ url, method, credentials, cache });
    return new Response(JSON.stringify(joined), { status: calls.length === 4 ? 401 : 200 });
  };
  const token = 'test/token';
  const url = '/api/v1/public/inquiry-replies/test%2Ftoken';
  await publicInquiryApi.read(token);
  await publicInquiryApi.submit(token, new FormData());
  assert.deepEqual(await publicInquiryApi.join(token), joined);
  await assert.rejects(publicInquiryApi.join(token), { status: 401 });
  assert.deepEqual(calls, [
    { url, method: 'GET', credentials: 'omit', cache: 'no-store' },
    { url, method: 'POST', credentials: 'omit', cache: 'no-store' },
    { url: `${url}/join`, method: 'POST', credentials: 'same-origin', cache: 'no-store' },
    { url: `${url}/join`, method: 'POST', credentials: 'same-origin', cache: 'no-store' },
  ]);
});

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
