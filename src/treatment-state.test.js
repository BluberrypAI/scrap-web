import assert from 'node:assert/strict';
import test from 'node:test';
import { beginStep, completeStep, finishCase, getTreatmentCase, loadCase, newCase, restoreCases, storeCase } from './treatment-state.js';

test('selected process persists through list navigation and advances only on manual completion', () => {
  const data = Object.create(null);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: Object.assign(data, {
      getItem: (key) => data[key] ?? null,
      setItem: (key, value) => { data[key] = value; },
    }),
  });
  const value = newCase('lot-test', '가상 PP', { waste_code: '51-03-01', material: 'PP', input_form: 'scrap' });
  const process = { transition_key: 'pp-prepare', label: '선별·파쇄', output_state: { label: '파쇄품' } };
  const facility = { label: '가상 공장', capability_key: 'sample-pp-prepare',
    location: { latitude: 36.32, longitude: 127.03 }, straight_line_distance_km: 50 };
  const pending = storeCase(beginStep(value, process, facility));
  assert.deepEqual(loadCase(value.id), pending);
  assert.equal(restoreCases([])[0].status, '처리 진행');
  assert.equal(pending.completed.length, 0);
  assert.throws(() => beginStep(pending, process, facility));
  const completed = storeCase(completeStep(loadCase(value.id)));
  assert.equal(completed.pending, null);
  assert.equal(completed.completed[0].transition_key, 'pp-prepare');
  assert.deepEqual(completed.completed[0].location, facility.location);
  assert.throws(() => completeStep(completed));
  storeCase(finishCase(completed));
  assert.equal(restoreCases([])[0].status, '완료');
});

test('confirmed cases reuse known material, form and site before any tracking entry exists', () => {
  const origin = { latitude: 36.64, longitude: 127.45 };
  const waste = {
    id: 'aluminium-can-sample', name: '알루미늄 캔 예시', status: '확정', code: '51-29-03',
    classifiedAt: '2026-11-04T00:00:00Z',
    treatmentInput: { material: 'aluminium', input_form: 'can', origin },
  };
  assert.deepEqual(getTreatmentCase(waste).input, {
    waste_code: '51-29-03', material: 'aluminium', input_form: 'can', origin,
  });
  assert.equal(loadCase(waste.id), null);
  assert.equal(getTreatmentCase({ ...waste, status: '후보' }), null);
  assert.equal(getTreatmentCase({ ...waste, treatmentInput: undefined }), null);
  assert.equal(getTreatmentCase({
    ...waste, treatmentInput: { ...waste.treatmentInput, origin: null },
  }).input.origin, null);
});
