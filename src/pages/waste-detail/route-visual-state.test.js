import assert from 'node:assert/strict';
import test from 'node:test';
import { routeEmptyMessage, routeVisualState } from './route-visual-state.js';

test('step 2 stays planned while step 3 highlights the current factory', () => {
  const base = { checks: {}, completedCount: 0, stopCount: 2, pending: null };
  assert.deepEqual(routeVisualState({ ...base, status: '확정' }), {
    phase: 'ready', inProgress: false, activeStopIndex: -1, activeSegmentIndex: -1,
  });
  const processingAtB = routeVisualState({ ...base, status: '처리 진행', completedCount: 1 });
  assert.equal(processingAtB.activeStopIndex, 1);
  const transporting = routeVisualState({ ...base, status: '처리 진행', routePhase: 'transporting' });
  assert.equal(transporting.activeSegmentIndex, 0);
  const middle = routeVisualState({ ...base, status: '처리 진행', stopCount: 3,
    routePhase: 'processing', routeStopIndex: 1 });
  assert.equal(middle.activeStopIndex, 1);
  assert.deepEqual(routeVisualState({ ...base, status: '완료' }), {
    phase: 'complete', inProgress: false, activeStopIndex: -1, activeSegmentIndex: -1,
  });
});

test('wastes without a route explain their actual classification stage', () => {
  assert.match(routeEmptyMessage('문진 중'), /문진 중/);
  assert.match(routeEmptyMessage('후보'), /분류 후보/);
  assert.match(routeEmptyMessage('분석 대기'), /분석 결과/);
  assert.match(routeEmptyMessage('확정'), /처리경로를 준비/);
  assert.match(routeEmptyMessage('완료'), /처리가 완료/);
});
