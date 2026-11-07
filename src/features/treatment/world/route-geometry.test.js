import assert from 'node:assert/strict';
import test from 'node:test';
import { isActiveFacility, routeSegmentPairs } from './route-geometry.js';

test('map roads connect consecutive stops', () => {
  assert.deepEqual(routeSegmentPairs(3), [[0, 1], [1, 2], [2, 3]]);
  assert.deepEqual(routeSegmentPairs(0), []);
});

test('only the current facility is highlighted', () => {
  const atOrigin = { planned: true, activeStopIndex: -1, activeSegmentIndex: -1 };
  assert.deepEqual([0, 1, 2, 3].map((index) => isActiveFacility(index, atOrigin)),
    [true, false, false, false]);
  const transporting = { planned: false, activeStopIndex: -1, activeSegmentIndex: 0 };
  assert.deepEqual([0, 1, 2, 3].map((index) => isActiveFacility(index, transporting)),
    [false, true, false, false]);
  const processing = { planned: false, activeStopIndex: 1, activeSegmentIndex: -1 };
  assert.deepEqual([0, 1, 2, 3].map((index) => isActiveFacility(index, processing)),
    [false, false, true, false]);
});
