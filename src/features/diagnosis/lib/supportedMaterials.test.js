import test from 'node:test';
import assert from 'node:assert/strict';
import { limitOptions, limitQuestion } from './supportedMaterials.js';

const opt = (value, kind = 'value') => ({ label: value, value, kind });

test('재질 질문은 PP·PE·PET·알루미늄만 남기고 모름을 숨긴다', () => {
  const q = { key: 'material', input: 'choice', allow_unknown: true,
    options: [...['pp', 'pe', 'pet', 'pvc', 'other_resin', 'synthetic_rubber', 'aluminium', 'steel', 'other'].map((v) => opt(v)),
      { label: '모름', value: null, kind: 'unknown' }] };
  const out = limitQuestion(q);
  assert.deepEqual(out.options.map((o) => o.value), ['pp', 'pe', 'pet', 'aluminium']);
  assert.equal(out.allow_unknown, false);
});

test('재질이 아닌 질문은 그대로 둔다', () => {
  const q = { key: 'input_form', options: [opt('can'), opt('scrap')], allow_unknown: true };
  assert.equal(limitQuestion(q), q);
});

test('판정 보드 고치기 선택지(kind 없음)도 같은 기준으로 거른다', () => {
  const options = [{ label: 'PP', value: 'pp' }, { label: '알루미늄', value: 'aluminium' }, { label: '철', value: 'steel' }];
  assert.deepEqual(limitOptions('material', options), [{ label: 'PP', value: 'pp' }, { label: '알루미늄', value: 'aluminium' }]);
  assert.equal(limitOptions('physical_state', options), options);
});
