import assert from 'node:assert/strict';
import test from 'node:test';
import { startLotSync } from './lot-sync.js';
import { wasteJourneyState } from '../../pages/wastes/waste-journey-state.js';

function harness(overrides = {}) {
  const windowTarget = new EventTarget();
  const documentTarget = new EventTarget();
  documentTarget.hidden = false;
  let tick;
  const changes = [];
  const stop = startLotSync({
    read: async () => ({ status: 'processing', revision: 9 }), apply: value => changes.push(value),
    windowTarget, documentTarget, schedule: callback => { tick = callback; return 1; }, cancel() {},
    ...overrides,
  });
  return { tick: () => tick(), stop, changes, windowTarget, documentTarget };
}

test('B의 입고 변경을 주기 조회로 받고 창 복귀 시 즉시 다시 조회한다', async () => {
  let revision = 8;
  const h = harness({ read: async () => ({ revision: ++revision }) });
  await h.tick();
  assert.equal(h.changes[0].revision, 9);
  h.windowTarget.dispatchEvent(new Event('focus'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.changes[1].revision, 10);
  h.documentTarget.hidden = true;
  await h.tick();
  assert.equal(h.changes.length, 2);
  h.stop();
});

test('작업 중 조회를 겹치지 않으며 작업 전 조회 응답이 최신 상태를 덮어쓰지 않는다', async () => {
  let resolve;
  let calls = 0;
  let version = 0;
  let busy = false;
  const h = harness({ read: () => { calls++; return new Promise(r => { resolve = r; }); },
    version: () => version, canRefresh: () => !busy });
  const pending = h.tick();
  await h.tick();
  assert.equal(calls, 1);
  busy = true;
  version++;
  busy = false;
  resolve({ status: 'accepted', revision: 8 });
  await pending;
  assert.equal(h.changes.length, 0);
  busy = true;
  await h.tick();
  assert.equal(calls, 1);
  h.stop();
});

test('화면을 떠나면 늦게 온 응답을 무시하고 조회 오류 후 다음 주기에 복구한다', async () => {
  let fail = true;
  const h = harness({ read: async () => { if (fail) throw new Error('offline'); return { revision: 10 }; } });
  await h.tick();
  assert.equal(h.changes.length, 0);
  fail = false;
  await h.tick();
  assert.equal(h.changes[0].revision, 10);
  h.stop();
  await h.tick();
  assert.equal(h.changes.length, 1);
});

test('목록 최초 조회와 주기 조회는 겹치지 않고 B→C 경로를 새 카드에 반영한다', async () => {
  let resolve;
  let calls = 0;
  const h = harness({ immediate: true, read: () => { calls++; return new Promise(r => { resolve = r; }); } });
  await h.tick();
  assert.equal(calls, 1);
  resolve({ status: 'processed', data: { completed: [{ facility: 'B' }] }, offers: [] });
  await new Promise(r => setImmediate(r));
  const pending = h.tick();
  resolve({ status: 'offered', data: { completed: [{ facility: 'B' }] },
    offers: [{ id: 'BC', status: 'pending', data: { facility: { facility_key: 'c', label: 'C' } } }] });
  await pending;
  const journey = wasteJourneyState({ lotId: 'shared-lot', code: '51-03-01', status: '처리 진행' }, h.changes.at(-1));
  assert.deepEqual(journey.facilities.map(x => x.mapLabel), ['배출 사업장', 'B', 'C']);
  h.stop();
});

test('목록 일시 오류를 알린 뒤 다음 조회로 복구하며 이탈 후 오류는 무시한다', async () => {
  let fail = true;
  const errors = [];
  const h = harness({ immediate: true, onError: e => errors.push(e.message),
    read: async () => { if (fail) throw new Error('offline'); return { revision: 2 }; } });
  await new Promise(r => setImmediate(r));
  assert.deepEqual(errors, ['offline']);
  fail = false;
  await h.tick();
  assert.equal(h.changes[0].revision, 2);
  h.stop();
  fail = true;
  await h.tick();
  assert.equal(errors.length, 1);
});
