import assert from 'node:assert/strict';
import test from 'node:test';
import { routeOutcome, hasFacilities, facilityMapData, candidateMapOptions } from './route-result.js';

test('서버 조회 실패와 실제 빈 결과를 구분한다', () => {
  assert.equal(routeOutcome({ error: '연결 실패' }).kind, 'error');
  assert.equal(routeOutcome({}).kind, 'missing_result');
  assert.equal(routeOutcome({ next: { status: 'no_route', options: [] } }).kind, 'no_candidates');
});

test('미지원 문진과 확인 보류를 빈 후보로 바꾸지 않는다', () => {
  for (const status of ['unsupported', 'review_required']) {
    assert.equal(routeOutcome({ status }).kind, status);
    assert.equal(routeOutcome({ next: { status } }).kind, status);
  }
  assert.equal(routeOutcome({ status: 'needs_input' }), null);
});

test('후보 상태라도 빈 목록이면 안내하고 AI 검토를 켜지 않는다', () => {
  for (const options of [[], [{ facilities: [] }], [{}]]) {
    const next = { status: 'candidates', options };
    assert.equal(routeOutcome({ next }).kind, 'no_candidates');
    assert.equal(hasFacilities(next), false);
  }
  const next = { status: 'candidates', options: [{ facilities: [{ facility_key: 'a' }] }] };
  assert.equal(routeOutcome({ next }), null);
  assert.equal(hasFacilities(next), true);
});

test('마지막 산출 상태도 실제 완료나 허가 승인이라고 표시하지 않는다', () => {
  const outcome = routeOutcome({ next: { status: 'end_of_route', options: [], can_finish: true } });
  assert.equal(outcome.kind, 'end_of_route');
  assert.match(outcome.action, /자동 완료되지는/);
});

test('좌표가 없어도 업체 수를 보존하고, 중복 업체와 잘못된 좌표를 지도에서 제외한다', () => {
  const options = [{ facilities: [
    { facility_key: 'a', location: null },
    { facility_key: 'b', location: { latitude: 37, longitude: 127 } },
    { facility_key: 'c', location: { latitude: null, longitude: 127 } },
    { facility_key: 'd', location: { latitude: 200, longitude: 127 } },
  ] }, { facilities: [
    { facility_key: 'b', location: { latitude: 37, longitude: 127 } },
    { facility_key: 'a', location: { latitude: 36, longitude: 128 } },
  ] }];
  const result = facilityMapData(options);
  assert.equal(result.total, 4);
  assert.deepEqual(result.factories.map((f) => f.id), ['a', 'b']);
  assert.equal(facilityMapData().total, 0);
});

test('새 후보 브라우저는 가까운 5곳만 지도에 표시하고 전체 목록을 보존한다', () => {
  const facilities = Array.from({ length: 8 }, (_, i) => ({
    facility_key: `site-${i}`, label: `업체 ${i}`,
    location: { latitude: 37, longitude: 127 + i / 10 },
    straight_line_distance_km: 80 - i * 10,
  }));
  const options = [{ facilities }, { facilities: [facilities[7]] }];
  const origin = { latitude: 37.1, longitude: 127 };
  const mapped = candidateMapOptions(options, origin);
  assert.deepEqual(facilityMapData(mapped).factories.map(f => f.id).sort(),
    ['site-3', 'site-4', 'site-5', 'site-6', 'site-7']);
  assert.equal(facilityMapData(options).total, 8);
  assert.equal(facilities.length, 8);
  const selected = facilityMapData(candidateMapOptions(options, origin, 'site-0'));
  assert.equal(selected.factories.length, 5);
  assert.ok(selected.factories.some(f => f.id === 'site-0'));
  const searched = [{ facilities: [facilities[0]] }];
  assert.equal(facilityMapData(candidateMapOptions(searched, origin)).factories[0].id, 'site-0');
});

test('거리 미확인 업체를 가까운 곳으로 간주하지 않고 명시 선택 시에만 지도에 추가한다', () => {
  const options = [{ facilities: [
    { facility_key: 'known', location: { latitude: 37, longitude: 127 }, straight_line_distance_km: 12 },
    { facility_key: 'unknown', location: { latitude: 38, longitude: 127 }, straight_line_distance_km: null },
    { facility_key: 'invalid', location: { latitude: null, longitude: 127 }, straight_line_distance_km: 0 },
  ] }];
  const origin = { latitude: 37.1, longitude: 127 };
  assert.deepEqual(facilityMapData(candidateMapOptions(options, origin)).factories.map(f => f.id), ['known']);
  assert.equal(facilityMapData(candidateMapOptions(options, origin, 'unknown')).factories.length, 2);
  assert.equal(facilityMapData(candidateMapOptions(options, null)).factories.length, 2);
  assert.equal(facilityMapData(options).total, 3);
});
