import assert from 'node:assert/strict';
import test from 'node:test';
import { startLotSync } from './lot-sync.js';

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
