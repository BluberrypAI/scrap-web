import assert from 'node:assert/strict';
import test from 'node:test';
import { routeOutcome, hasFacilities, facilityMapData } from './route-result.js';

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
