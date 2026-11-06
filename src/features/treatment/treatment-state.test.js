import assert from 'node:assert/strict';
import test from 'node:test';
import { applyTransportPickup, applyTransportReceipt, beginStep, completeStep, demoWorkplace, finishCase, getTreatmentCase, loadCase, newCase, readyForTreatment, recordTreatmentResult, restoreCases, storeCase, transportLegId } from './treatment-state.js';
import { auditStep, recordEvidence, reportFor } from './treatment-evidence.js';

test('first handoff to an investigation candidate needs a recorded operator review', () => {
  const value = newCase('lot-investigation', '가상 PP', { waste_code: '51-03-01', material: 'PP', input_form: 'film' });
  const process = { transition_key: 'pp-prepare', label: '선별·파쇄', output_state: { label: '파쇄품' } };
  const facility = { label: '가상 공장', facility_key: 'test-site', evidence_basis: 'site_role_hypothesis' };
  assert.throws(() => beginStep(value, process, facility), /확인 자료/);
  const source = { kind: 'kg', reviewBasis: 'operator-confirmed', reviewReference: '  ' };
  assert.throws(() => beginStep(value, process, { ...facility, source }), /확인 자료/);
  const pending = beginStep(value, process, { ...facility, source: { ...source, reviewReference: 'LOT-REF-1' } }).pending;
  assert.ok(transportLegId(pending));
  assert.equal(pending.source.reviewReference, 'LOT-REF-1');
});

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
  const legId = transportLegId(pending.pending);
  const other = storeCase(beginStep({ ...value, id: 'lot-other' }, process, facility));
  const receipt = { wasteId: value.id, legId, status: 'accepted', respondedAt: '2026-11-05T01:02:03Z' };
  assert.equal(applyTransportReceipt({ ...receipt, wasteId: other.id }), false);
  assert.equal(applyTransportReceipt({ ...receipt, respondedAt: 'unknown' }), false);
  const rejection = { ...receipt, status: 'rejected', respondedAt: '2026-11-05T01:00:00Z' };
  assert.equal(applyTransportReceipt(rejection), true);
  assert.equal(loadCase(value.id).pending.handoff.status, 'rejected');
  assert.throws(() => completeStep(loadCase(value.id)));
  assert.equal(applyTransportReceipt(receipt), true);
  assert.equal(applyTransportReceipt(receipt), false);
  assert.equal(applyTransportReceipt(rejection), false);
  assert.equal(loadCase(other.id).pending.handoff, undefined);
  const received = loadCase(value.id);
  assert.equal(received.pending.handoff.status, 'accepted');
  const handed = recordEvidence(received, 'handover', { ...base, inputLot: 'LOT-A', massKg: 1000 });
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
  assert.equal(reportFor(completed).steps[0].handoff.status, 'accepted');
  assert.equal(reportFor(completed).steps[0].handoff.token, undefined);
  const next = storeCase(beginStep(completed, { ...process, transition_key: 'pp-clean' }, facility));
  assert.equal(next.pending.from, facility.label);
  assert.notEqual(transportLegId(next.pending), legId);
  assert.equal(applyTransportReceipt({ ...receipt, respondedAt: '2026-11-05T02:00:00Z' }), false);
  assert.equal(loadCase(value.id).pending.handoff, undefined);
  storeCase(finishCase(completed));
  assert.equal(restoreCases([]).find(({ id }) => id === value.id).status, '완료');
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

test('old demo QR receipts wait for a transport confirmation on the same leg', () => {
  const value = newCase('legacy-qr', '이전 QR', {});
  const startedAt = '2026-11-05T00:00:00Z';
  storeCase({
    ...value,
    pending: { transition_key: 'old-transition', startedAt, handoff: { token: 'old', status: 'accepted' } },
  });
  const restored = loadCase(value.id);
  assert.equal(restored.pending.handoff, undefined);
  assert.equal(applyTransportReceipt({
    wasteId: value.id, legId: transportLegId(restored.pending), status: 'accepted',
    respondedAt: '2026-11-05T01:00:00Z',
  }), true);
  assert.equal(loadCase(value.id).pending.handoff.status, 'accepted');
});

test('actual processor result advances the case while keeping the original process preview', () => {
  const value = newCase('lot-observed', '가상 PP', { material: 'PP' });
  const output = { key: 'pp-shredded', label: '파쇄품' };
  const actual = { key: 'pp-scrap', label: '잔재' };
  const process = { transition_key: 'pp-prepare', label: '선별·파쇄', output_state: output };
  const previews = [[{ transition_key: process.transition_key, label: process.label }]];
  const pending = storeCase(beginStep(value, process, { label: 'B' }, { outputStates: [output, actual], previews }));
  const result = { stateKey: actual.key, massKg: 850, purityPercent: null };
  assert.throws(() => recordTreatmentResult(pending, result));
  assert.equal(applyTransportReceipt({
    wasteId: value.id, legId: transportLegId(pending.pending), status: 'accepted',
    respondedAt: '2026-11-05T01:00:00Z',
  }), true);
  const received = loadCase(value.id);
  assert.throws(() => recordTreatmentResult(received, { ...result, stateKey: 'pe-shredded' }));
  assert.throws(() => recordTreatmentResult(received, { ...result, purityPercent: 101 }));
  const complete = recordTreatmentResult(received, result);
  assert.deepEqual(complete.completed[0].observedOutput, {
    state_key: 'pp-scrap', mass_kg: 850, purity_percent: null,
  });
  assert.equal(complete.pending, null);
  assert.deepEqual(beginStep(complete, process, { label: 'C' }).initialPreviews, previews);
});

test('transport pickup and receipt are separate, and onsite processing needs no QR', () => {
  const value = newCase('lot-onsite', '가상 PET', { material: 'PET' });
  const output = { key: 'pet-sorted', label: '선별 PET' };
  const process = { transition_key: 'pet-prepare', label: '선별', output_state: output };
  const facility = { label: '동일 이름', facility_key: 'factory-one', capability_key: 'factory-one--pet-prepare' };
  const pending = storeCase(beginStep(value, process, facility));
  const legId = transportLegId(pending.pending);
  assert.equal(applyTransportPickup({ wasteId: value.id, legId, actor: '기사' }), true);
  assert.equal(applyTransportPickup({ wasteId: value.id, legId, actor: '기사' }), false);
  assert.equal(readyForTreatment(loadCase(value.id).pending), false);
  const receipt = { wasteId: value.id, legId, status: 'accepted', actor: '업체', respondedAt: new Date().toISOString() };
  assert.equal(applyTransportReceipt(receipt), true);
  assert.equal(loadCase(value.id).pending.pickup.actor, '기사');
  const result = { stateKey: output.key, massKg: 850, purityPercent: null };
  const completed = recordTreatmentResult(loadCase(value.id), result);
  const second = { ...process, transition_key: 'pet-wash' };
  const internal = storeCase(beginStep(completed, second, { ...facility, capability_key: 'factory-one--pet-wash' }));
  assert.equal(internal.pending.internal, true);
  assert.equal(transportLegId(internal.pending), null);
  assert.equal(applyTransportReceipt({ ...receipt, respondedAt: '2026-12-01T00:00:00Z' }), false);
  assert.equal(recordTreatmentResult(loadCase(value.id), result).completed.length, 2);
  const other = beginStep(completed, second, { ...facility, facility_key: 'factory-two' });
  assert.equal(other.pending.internal, false);
  assert.notEqual(transportLegId(other.pending), legId);
});
