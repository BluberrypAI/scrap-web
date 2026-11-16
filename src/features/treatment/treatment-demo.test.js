import assert from 'node:assert/strict';
import test from 'node:test';
import { demoRouteStops } from './treatment-demo.js';
import { getTreatmentCase } from './treatment-state.js';
import { routeEmptyMessage } from '../../pages/waste-detail/route-visual-state.js';

test('known waste types have a planned map route', () => {
  assert.deepEqual(demoRouteStops('PP').map((stop) => stop.label),
    ['처리업체 1', '처리업체 2', '수요업체']);
  assert.equal(demoRouteStops('alkali')[0].process, '중화 처리');
  assert.deepEqual(demoRouteStops('unknown'), []);
});

test('the waste alkali card has a visible map route', async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem: () => null },
  });
  const { wastes, wasteStatusMessage } = await import('../../data/wastes.js');
  const waste = wastes.find((item) => item.id === 'waste-alkali');
  const treatment = getTreatmentCase(waste);
  assert.equal(treatment.input.material, 'alkali');
  assert.equal(demoRouteStops(treatment.input.material)[0].label, '처리업체 1');
  assert.equal(waste.routePhase, 'processing');
  assert.equal(waste.routeStopIndex, 1);
  assert.equal(wasteStatusMessage(waste), '처리업체 2에서 회수·재활용 중이에요');
  const transporting = wastes.find((item) => item.id === 'plastic-film');
  assert.equal(transporting.routePhase, 'transporting');
  assert.equal(wasteStatusMessage(transporting), '처리업체 1로 운송 중이에요');
  assert.equal(getTreatmentCase(transporting).input.material, 'PE');
  for (const item of wastes) {
    if (!getTreatmentCase(item)) assert.ok(routeEmptyMessage(item.status).includes(
      item.status === '문진 중' ? '문진 중' : item.status === '분석 대기' ? '분석 결과'
        : item.status === '후보' ? '분류 후보' : item.status === '완료' ? '처리가 완료' : '처리경로'));
  }
});
