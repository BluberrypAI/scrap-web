import assert from 'node:assert/strict';
import test from 'node:test';
import { beginStep, completeStep, demoWorkplace, finishCase, getTreatmentCase, loadCase, newCase, restoreCases, storeCase } from './treatment-state.js';
import { auditStep, recordEvidence, reportFor } from './treatment-evidence.js';

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
  assert.throws(() => completeStep(pending));
  const base = { occurredOn: '2026-11-05', actor: '가상 업체', reference: '가상-증빙' };
  const handed = recordEvidence(loadCase(value.id), 'handover', { ...base, inputLot: 'LOT-A', massKg: 1000 });
  const wrongReceipt = recordEvidence(handed, 'receipt', {
    ...base, siteMatches: 'yes', actualAddress: '가상 주소', massKg: 990,
  });
  const processed = recordEvidence(wrongReceipt, 'processing', {
    ...base, processMatches: 'yes', outputMatches: 'yes', actualProcess: '파쇄',
    actualOutput: '파쇄품', outputLot: 'LOT-B', outputKg: 900, residueKg: 100,
    residueDestination: '가상 잔재 보관장', addedKg: 0, lossKg: 0,
  });
  assert.equal(auditStep(processed.pending).differences.length, 2);
  assert.throws(() => completeStep(processed));
  const corrected = recordEvidence(processed, 'receipt', {
    ...base, siteMatches: 'yes', actualAddress: '가상 주소', massKg: 1000,
  });
  const completed = storeCase(completeStep(corrected));
  assert.equal(completed.pending, null);
  assert.equal(completed.completed[0].transition_key, 'pp-prepare');
  assert.deepEqual(completed.completed[0].location, facility.location);
  assert.throws(() => completeStep(completed));
  assert.equal(reportFor(completed).steps[0].evidence.length, 4);
  assert.equal(reportFor(completed).steps[0].audit.ready, true);
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
  const processing = { ...waste, status: '처리 진행',
    treatmentInput: { ...waste.treatmentInput, originType: 'demo' } };
  assert.equal(getTreatmentCase(processing).input.material, 'aluminium');
  assert.deepEqual(getTreatmentCase(processing), getTreatmentCase(processing));
  assert.equal(getTreatmentCase({ ...waste, status: '처리 진행' }), null);
  assert.equal(getTreatmentCase({ ...waste, treatmentInput: undefined }), null);
  assert.equal(getTreatmentCase({
    ...waste, treatmentInput: { ...waste.treatmentInput, origin: null },
  }).input.origin, null);
});

test('saved demos pick up the profile location and keep their pending process', () => {
  const value = newCase('legacy-demo', '이전 데모', {
    waste_code: '51-29-03', material: 'aluminium', input_form: 'can', originType: 'demo',
    origin: { latitude: 36.64, longitude: 127.45 },
  });
  const pending = { transition_key: 'al-can-sheet', facility: '영주', distance: 106.2 };
  storeCase({ ...value, pending });
  const restored = loadCase(value.id);
  assert.deepEqual(restored.input.origin, demoWorkplace.routeOrigin.origin);
  assert.deepEqual(restored.pending, { ...pending, distance: null });
});
