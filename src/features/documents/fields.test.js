import assert from 'node:assert/strict';
import test from 'node:test';
import { availableForms, buildBody, fieldsFor, todayString } from './fields.js';

test('서식마다 맞는 입력칸만 고른다', () => {
  const keys = (k) => fieldsFor(k).map((f) => f.key);
  assert.ok(keys('form6').includes('tons_per_month'));
  assert.ok(!keys('form12').includes('tons_per_month'));
  assert.ok(keys('form12').includes('kg_per_month'));
  assert.ok(!keys('form5').includes('vendor'));
});

test('서버 body로 바꾼다: 빈 값 제외, 숫자·구분 변환', () => {
  const body = buildBody('form6', {
    company: { name: ' 가나다 ', phone: '' },
    waste: { group: '2', tons_per_month: '1.5', vendor: '업체', kg_per_month: '9' },
  });
  assert.deepEqual(body, { company: { name: '가나다' }, waste: { group: 2, tons_per_month: 1.5, vendor: '업체' } });
});

test('인계에 따라 쓸 수 있는 서식이 정해진다', () => {
  const h = (action, category, type = 'WASTE_CODE') => ({ route_guidance: { action }, result: { result_type: type, category } });
  assert.deepEqual(availableForms(h('RECOMMEND_ROUTE', 'GENERAL')), ['form6', 'form5']);
  assert.deepEqual(availableForms(h('RECOMMEND_ROUTE', 'DESIGNATED')), ['form12', 'form5']);
  assert.deepEqual(availableForms(h('ASK_MORE', 'GENERAL')), []);
  assert.deepEqual(availableForms(h('RECOMMEND_ROUTE', 'GENERAL', 'NO_CODE')), []);
  assert.deepEqual(availableForms(null), []);
});

test('제출 정보는 제6·12호만 보내고 빈 값은 뺀다', () => {
  const v = { company: {}, waste: { waste_code: ' 51-03-01 ', physical_state: 'solid' }, submit: { date: '2026-11-17', recipient: ' 화성시장 ', signer_name: '', signature_png: 'data:image/png;base64,AA', signer_confirmed: true } };
  assert.deepEqual(buildBody('form6', v).submit, { date: '2026-11-17', recipient: '화성시장', signature_png: 'data:image/png;base64,AA', mark_type: 'signature', signer_confirmed: true });
  assert.equal(buildBody('form6', { submit: { signature_png: 'data:image/png;base64,AA', mark_type: 'seal' } }).submit.mark_type, 'seal');
  assert.equal(buildBody('form6', { submit: { mark_type: 'seal' } }).submit, undefined);
  assert.equal(buildBody('form5', v).submit, undefined);
  assert.deepEqual(buildBody('form5', v).waste, { waste_code: '51-03-01', physical_state: 'solid' });
  assert.equal(buildBody('form12', { submit: {} }).submit, undefined);
  assert.equal(todayString(new Date(2026, 10, 7)), '2026-11-07');
});

test('availableForms: 지정폐기물인데 세부 번호를 못 정한 결론도 제12호·제5호 초안', () => {
  const codeNeeded = { result_type: 'NO_CODE', outcome: 'DESIGNATED_CODE_NEEDED', category: 'DESIGNATED', route_guidance: { action: 'MANUAL_CLASSIFICATION' } };
  assert.deepEqual(availableForms(codeNeeded), ['form12', 'form5']);
  assert.deepEqual(availableForms({ ...codeNeeded, outcome: 'INTERPRETATION_NEEDED' }), []);
  assert.deepEqual(availableForms({ ...codeNeeded, category: 'GENERAL' }), []);
});
