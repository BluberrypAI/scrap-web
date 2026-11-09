import assert from 'node:assert/strict';
import test from 'node:test';
import {
  routeEmptyMessage,
  routeMapMarkerState,
  routeMapSegmentState,
  routeStopState,
  routeVisualState,
  visibleRouteStops,
} from './route-visual-state.js';

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

test('step 2 hides unconfirmed factories until a route is selected', () => {
  const candidates = [{ label: '후보 업체 1' }, { label: '후보 업체 2' }];
  assert.deepEqual(visibleRouteStops('ready', candidates), []);
  assert.deepEqual(visibleRouteStops('processing', candidates), candidates);
});

test('map markers and lines follow the active treatment state', () => {
  const processing = { phase: 'processing', activeStopIndex: 1, activeSegmentIndex: -1 };
  assert.deepEqual([0, 1, 2, 3].map((index) => routeMapMarkerState({ ...processing, index })),
    ['done', 'done', 'active', 'planned']);
  assert.deepEqual([0, 1, 2].map((index) => routeMapSegmentState({ ...processing, index })),
    ['done', 'done', 'planned']);
  assert.deepEqual([0, 1, 2].map((index) => routeStopState({ ...processing, index })),
    ['done', 'active', 'planned']);

  const transporting = { phase: 'transporting', activeStopIndex: -1, activeSegmentIndex: 1 };
  assert.deepEqual([0, 1, 2, 3].map((index) => routeMapMarkerState({ ...transporting, index })),
    ['done', 'done', 'active', 'planned']);
  assert.deepEqual([0, 1, 2].map((index) => routeMapSegmentState({ ...transporting, index })),
    ['done', 'active', 'planned']);
});
