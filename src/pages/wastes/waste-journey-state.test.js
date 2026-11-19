import assert from 'node:assert/strict';
import test from 'node:test';
import { wasteJourneyState } from './waste-journey-state.js';

test('인수 요청·조건부 수락·QR 대기 단계는 입고 전 공장을 가동하지 않는다', () => {
  const waste = { lotId: 'real-lot', code: '51-03-01', status: '처리 진행' };
  for (const status of ['ready', 'offered', 'conditional', 'accepted', 'processed']) {
    const lot = { status, data: { completed: [] }, offers: [] };
    assert.equal(wasteJourneyState(waste, lot).phase, 'ready', status);
  }
  assert.equal(wasteJourneyState(waste, { status: 'processing' }).phase, 'processing');
  assert.equal(wasteJourneyState(waste, { status: 'completed' }).phase, 'complete');
});

test('서버 문진 카드는 남은 데모 처리 기록으로 다음 단계에 앞서 가지 않는다', () => {
  const waste = { id: 'case-1', caseId: '1', code: '51-03-01', status: '확정' };
  const staleTreatment = { input: { originType: 'demo', material: 'pp' }, completed: [], pending: { facility: '옛 업체' } };
  const journey = wasteJourneyState(waste, staleTreatment, { recipient: true });
  assert.equal(journey.phase, 'ready');
  assert.deepEqual(journey.facilities.map((facility) => facility.mapLabel), ['배출 사업장']);
});

test('처리 건 카드는 기록된 공정과 실제 인수 요청 업체를 순서대로 보여 준다', () => {
  const waste = { id: 'case-1', caseId: '1', code: '51-03-01', status: '처리 진행' };
  const lot = {
    data: { completed: [{ capability_key: 'washed', facility: '세척 업체' }] },
    offers: [{ id: 'offer-1', status: 'accepted', data: { facility: { facility_key: 'recycler', label: '재활용 업체' } } }],
  };
  const journey = wasteJourneyState(waste, lot);
  assert.deepEqual(journey.facilities.map((facility) => facility.mapLabel), ['배출 사업장', '세척 업체', '재활용 업체']);
  assert.equal(journey.activeIndex, 2);
});

test('처리 건 등록만으로 후보 업체를 확정 경로처럼 표시하지 않는다', () => {
  const waste = { id: 'case-1', caseId: '1', code: '51-03-01', status: '확정' };
  const lot = { data: { completed: [] }, offers: [] };
  assert.deepEqual(wasteJourneyState(waste, lot).facilities.map((facility) => facility.mapLabel), ['배출 사업장']);
});

test('완료된 인계 업체를 다음 후보로 중복 표시하지 않는다', () => {
  const waste = { caseId: '1', code: '51-03-01', status: '완료' };
  const lot = {
    data: { completed: [
      { capability_key: 'b-wash', facility: '세척 업체' },
      { capability_key: 'c-pellet', facility: '펠렛 업체' },
    ] },
    offers: [{ id: 'offer-c', status: 'processed', data: { facility: { facility_key: 'c', label: '펠렛 업체' } } }],
  };
  const journey = wasteJourneyState(waste, lot);
  assert.deepEqual(journey.facilities.map((facility) => facility.mapLabel), ['배출 사업장', '세척 업체', '펠렛 업체']);
  assert.equal(journey.phase, 'complete');
});

test('처리가 끝난 이전 인수 요청은 다음 사업장으로 중복 표시하지 않는다', () => {
  const waste = { id: 'case-1', caseId: '1', code: '51-03-01', status: '처리 진행' };
  const lot = {
    status: 'processed',
    data: { completed: [{ facility: '중앙이엔비 공주 사업장' }] },
    offers: [{ id: 'offer-1', status: 'processed', data: { facility: { facility_key: 'jungang-gongju', label: '중앙이엔비 공주 사업장' } } }],
  };
  const journey = wasteJourneyState(waste, lot);
  assert.deepEqual(journey.facilities.map((facility) => facility.mapLabel), ['배출 사업장', '중앙이엔비 공주 사업장']);
});
