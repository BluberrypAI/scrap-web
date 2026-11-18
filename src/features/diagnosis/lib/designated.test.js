import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmPrompt, designatedNotice, form12Href, handoffDesignated } from './designated.js';
import { normalizeDesignated, normalizeTurn } from './normalize.js';

const designated = {
  reason: '기름 성분 7.5% (기준 5% 이상)',
  warning: '허가 업체에만 맡길 수 있어요.',
  next_actions: [
    { id: 'a', text: '허가 업체에 맡겨요', source_id: 'ACT-WASTE', source_title: '폐기물관리법', form: null },
    { id: 'b', text: '' },
    { id: 'c', text: '계획서를 내요', form: 'form12' },
  ],
};

test('지정폐기물 + designated: 서버 문구와 다음 할 일을 쓴다', () => {
  const n = designatedNotice({ category: 'DESIGNATED', reason: '기존 이유', designated });
  assert.equal(n.warning, designated.warning);
  assert.equal(n.reason, designated.reason);
  assert.equal(n.nextActions.length, 2);
});

test('designated.reason이 null이면 result.reason으로, 둘 다 없으면 null', () => {
  assert.equal(designatedNotice({ category: 'DESIGNATED', reason: '기존', designated: { ...designated, reason: null } }).reason, '기존');
  assert.equal(designatedNotice({ category: 'DESIGNATED', designated: { ...designated, reason: null } }).reason, null);
});

test('지정폐기물인데 designated가 없으면 기본 문구', () => {
  const n = designatedNotice({ category: 'DESIGNATED' });
  assert.match(n.warning, /허가를 받은 업체에만/);
  assert.deepEqual(n.nextActions, []);
});

test('일반 폐기물이면 배너 없음, 확인 문구도 그대로', () => {
  assert.equal(designatedNotice({ category: 'GENERAL', designated }), null);
  assert.equal(designatedNotice(null), null);
  assert.match(confirmPrompt('GENERAL'), /^확정하면 판정이 기록/);
  assert.match(confirmPrompt('DESIGNATED'), /일반 재활용 업체에는 맡길 수 없어요/);
});

test('인계에서 읽기, 제12호 링크는 서식 화면이 열릴 때만', () => {
  const handoff = { route_guidance: { action: 'RECOMMEND_ROUTE' }, result: { result_type: 'WASTE_CODE', category: 'DESIGNATED' }, designated };
  assert.equal(handoffDesignated(handoff).nextActions.length, 2);
  assert.equal(handoffDesignated({ result: { category: 'GENERAL' } }), null);
  assert.equal(handoffDesignated(null), null);
  assert.equal(form12Href('7', handoff), '/wastes/case-7/documents');
  assert.equal(form12Href('7', { ...handoff, route_guidance: { action: 'NEEDS_TEST' } }), null);
  assert.equal(form12Href(null, handoff), null);
});

test('normalize: designated를 ui.result로 그대로 통과시키고 이상한 값은 null', () => {
  assert.equal(normalizeDesignated(null), null);
  assert.equal(normalizeDesignated('x'), null);
  assert.equal(normalizeDesignated(designated).next_actions.length, 2);
  const turn = { branch: 'FINAL_REVIEW', ui: { result: { category: 'DESIGNATED', designated } } };
  assert.equal(normalizeTurn(turn).ui.result.designated.reason, designated.reason);
  const old = { branch: 'FINAL_REVIEW', ui: { result: { category: 'DESIGNATED' } } };
  assert.equal('designated' in normalizeTurn(old).ui.result, false);
  const derived = { branch: 'FINAL_REVIEW', verdict: { category: 'DESIGNATED', designated }, message: '' };
  assert.equal(normalizeTurn(derived).ui.result.designated.warning, designated.warning);
});

test('normalize: 근거 조문(source_ref)을 통과시키고 없으면 null', () => {
  const d = normalizeDesignated({ next_actions: [{ id: 'a', text: '할 일', source_title: '시행규칙', source_ref: '제18조의2' }, { id: 'b', text: '다른 일' }] });
  assert.equal(d.next_actions[0].source_ref, '제18조의2');
  assert.equal(d.next_actions[1].source_ref, null);
});
