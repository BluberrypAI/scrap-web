import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateMapOptions, distanceBasis, distanceLabel, comparisonDistance } from './route-result.js';

const origin = { latitude: 37, longitude: 127 };
const sites = Array.from({ length: 8 }, (_, i) => ({
  facility_key: `site-${i}`, location: { latitude: 37 + i / 100, longitude: 127 },
  straight_line_distance_km: i + 1, road_distance_status: 'available', road_distance_km: 10 - i,
}));

test('도로거리로 5곳을 고르되 전체 업체를 보존한다', () => {
  const options = [{ facilities: sites }];
  const shown = candidateMapOptions(options, origin);
  assert.equal(distanceBasis(options), 'road');
  assert.deepEqual(shown[0].facilities.map(f => f.facility_key), ['site-3', 'site-4', 'site-5', 'site-6', 'site-7']);
  assert.equal(sites.length, 8);
  assert.match(distanceLabel(sites[7]), /도로 3.0 km/);
});

test('도로 미확인 업체의 짧은 직선거리를 도로거리와 섞지 않는다', () => {
  const unknown = { ...sites[0], road_distance_status: 'unavailable', road_distance_km: null };
  const options = [{ facilities: [unknown, sites[7]] }];
  assert.equal(comparisonDistance(unknown, 'road'), Infinity);
  assert.deepEqual(candidateMapOptions(options, origin)[0].facilities.map(f => f.facility_key), ['site-7']);
  assert.match(distanceLabel(unknown), /직선.*도로거리 미확인/);
  assert.equal(candidateMapOptions(options, origin, 'site-0')[0].facilities.length, 2);
});

test('키가 없거나 전부 실패하면 직선거리임을 유지한다', () => {
  const options = [{ facilities: sites.map(f => ({ ...f, road_distance_status: 'not_configured', road_distance_km: null })) }];
  assert.equal(distanceBasis(options), 'straight_line');
  assert.deepEqual(candidateMapOptions(options, origin)[0].facilities.map(f => f.facility_key), ['site-0', 'site-1', 'site-2', 'site-3', 'site-4']);
});
