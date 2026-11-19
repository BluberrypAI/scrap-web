import test from 'node:test';
import assert from 'node:assert/strict';
import { limitOptions, limitQuestion } from './supportedMaterials.js';

const opt = (value, kind = 'value') => ({ label: value, value, kind });

test('소재 분류 질문은 플라스틱·금속만 남기고 모름을 숨긴다', () => {
  const q = { key: 'material_group', input: 'material_group', allow_unknown: true,
    options: [opt('plastic'), opt('metal'), opt('oil'), opt('special'), { label: '모름', kind: 'unknown' }] };
  const out = limitQuestion(q);
  assert.deepEqual(out.options.map((o) => o.value), ['plastic', 'metal']);
  assert.equal(out.allow_unknown, false);
});

test('소재 질문은 PP·PE·PET·철·알루미늄 경로만 남긴다', () => {
  const q = { key: 'material', input: 'material', allow_unknown: true,
    options: ['pp', 'pe', 'pet', 'ps', 'abs', 'pvc', 'eps', 'rubber', 'ferrous_scrap', 'nonferrous_scrap', 'metal_can', 'metal_container'].map((v) => opt(v)) };
  assert.deepEqual(limitQuestion(q).options.map((o) => o.value), ['pp', 'pe', 'pet', 'ferrous_scrap', 'nonferrous_scrap', 'metal_can']);
});

test('소재가 아닌 질문은 그대로 둔다', () => {
  const q = { key: 'physical_state', options: [opt('solid'), opt('liquid')], allow_unknown: true };
  assert.equal(limitQuestion(q), q);
});

test('판정 보드 고치기 선택지(kind 없음)도 같은 기준으로 거른다', () => {
  const options = [{ label: 'PP', value: 'pp' }, { label: 'PS', value: 'ps' }];
  assert.deepEqual(limitOptions('material', options), [{ label: 'PP', value: 'pp' }]);
  assert.equal(limitOptions('physical_state', options), options);
});
