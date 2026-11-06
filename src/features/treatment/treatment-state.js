import { auditStep } from './treatment-evidence.js';

const storagePrefix = 'scrap.treatment.v1.';
export const demoWorkplace = {
  region: '경기도 화성시 팔탄면',
  routeOrigin: {
    origin: { latitude: 37.16224762, longitude: 126.90491285 },
    originType: 'demo',
    originLabel: '화성시 팔탄면 · 행정복지센터 기준점',
    originSource: 'https://qbn.purpleo.kr/article/45361',
  },
};

export function loadCase(id) {
  try {
    const value = JSON.parse(localStorage.getItem(storagePrefix + id));
    if (value?.version !== 1 || value.id !== id) return null;
    // Pending receipts from the old QR demo do not represent transport confirmations.
    if (value.pending?.handoff?.token) delete value.pending.handoff;
    const pending = value.pending;
    if (pending && !pending.handoff && !pending.pickup && sameFacility(value.completed.at(-1), pending)) {
      value.pending = { ...pending, internal: true, legId: null, distance: null };
    }
    if (value.input?.originType !== 'demo' || value.input.originLabel) return value;
    return {
      ...value,
      input: { ...value.input, ...demoWorkplace.routeOrigin },
      pending: value.pending ? { ...value.pending, distance: null } : null,
    };
  } catch {
    return null;
  }
}

export function storeCase(value) {
  localStorage.setItem(storagePrefix + value.id, JSON.stringify(value));
  globalThis.dispatchEvent?.(new CustomEvent('scrap-treatment-change', { detail: value.id }));
  return value;
}

export function watchCase(id, refresh) {
  const onStorage = (event) => {
    if (event.key === storagePrefix + id || event.key === null) refresh();
  };
  const onLocalChange = (event) => {
    if (event.detail === id) refresh();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('scrap-treatment-change', onLocalChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('scrap-treatment-change', onLocalChange);
  };
}

export function newCase(id, name, input, time = new Date().toISOString()) {
  return { version: 1, id, name, input, completed: [], pending: null, finished: false,
    createdAt: time, updatedAt: time };
}

export function getTreatmentCase(waste) {
  const saved = loadCase(waste.id);
  if (saved) return saved;
  if (waste.status !== '확정' || !waste.treatmentInput) return null;
  const { material, input_form } = waste.treatmentInput;
  if (!waste.code || !material || !input_form) return null;
  return newCase(waste.id, waste.name, { ...waste.treatmentInput, waste_code: waste.code }, waste.classifiedAt ?? null);
}

function facilityKey(facility) {
  if (!facility || facility.source?.kind === 'registry') return null;
  return facility.facility_key ??
    /^([a-z0-9-]+)--[a-z0-9-]+$/.exec(facility.capability_key || '')?.[1] ?? null;
}

export function sameFacility(previous, candidate) {
  const key = facilityKey(previous);
  return key !== null && key === facilityKey(candidate);
}

export function readyForTreatment(step) {
  return step?.internal === true || step?.handoff?.status === 'accepted';
}

export function beginStep(value, process, facility, { outputStates = [], previews = [] } = {}) {
  if (value.pending || value.finished) throw new Error('현재 진행 중인 공정을 먼저 완료해 주세요.');
  const previous = value.completed.at(-1);
  if (!previous && facility.evidence_basis === 'site_role_hypothesis' &&
      (facility.source?.reviewBasis !== 'operator-confirmed' || !facility.source.reviewReference?.trim())) {
    throw new Error('이 업체의 공정·허가·인수 조건을 확인하고 확인 자료를 기록해 주세요.');
  }
  const time = new Date().toISOString();
  const internal = sameFacility(previous, facility);
  return {
    ...value, updatedAt: time,
    initialPreviews: value.initialPreviews ?? previews.filter(
      (path) => path[0]?.transition_key === process.transition_key,
    ),
    pending: {
      legId: internal ? null : crypto.randomUUID(),
      internal,
      transition_key: process.transition_key, process: process.label,
      output: process.output_state.label, expectedState: process.output_state,
      outputStates, facility: facility.label,
      from: previous?.facility || value.input.originLabel || '배출사업장',
      address: facility.address || facility.region || null,
      capability_key: facility.capability_key, facility_key: facilityKey(facility), startedAt: time,
      location: facility.location ?? (internal ? previous.location : null),
      distance: internal ? null : facility.straight_line_distance_km ?? null,
      source: facility.source ?? { kind: 'kg', references: facility.sources || [] },
      ...(facility.intake_review && { intakeReview: facility.intake_review }),
      evidence: [],
    },
  };
}

export function completeStep(value) {
  if (!value.pending) throw new Error('완료할 공정이 없습니다.');
  if (value.pending.handoff?.status !== 'accepted') throw new Error('업체의 수령 확인을 먼저 기다려 주세요.');
  if (!auditStep(value.pending, value.completed.at(-1)).ready) {
    throw new Error('증빙 누락이나 계획·실적 불일치를 먼저 확인해 주세요.');
  }
  const time = new Date().toISOString();
  return {
    ...value, updatedAt: time, pending: null,
    completed: [...value.completed, { ...value.pending, completedAt: time }],
  };
}

export function recordTreatmentResult(value, { stateKey, massKg, purityPercent }) {
  const step = value.pending;
  if (!readyForTreatment(step)) throw new Error('업체의 수령 확인이 필요해요.');
  const states = step.outputStates?.length ? step.outputStates : [step.expectedState].filter(Boolean);
  const state = states.find(({ key }) => key === stateKey);
  if (stateKey !== null && !state) throw new Error('실제 산출물 상태를 선택해 주세요.');
  if (!Number.isFinite(massKg) || massKg < 0 || massKg > 1e9 ||
      (purityPercent !== null && (!Number.isFinite(purityPercent) || purityPercent < 0 || purityPercent > 100))) {
    throw new Error('산출물 중량과 순도를 확인해 주세요.');
  }
  const time = new Date().toISOString();
  const observedOutput = {
    state_key: stateKey, mass_kg: massKg, purity_percent: purityPercent,
  };
  return {
    ...value, updatedAt: time, pending: null,
    completed: [...value.completed, {
      ...step, completedAt: time, observedOutput, observedLabel: state?.label ?? '상태 미분류',
    }],
  };
}

export function transportLegId(step) {
  if (!step || step.internal) return null;
  return step.legId ?? (step.startedAt ? `legacy:${step.transition_key}:${step.startedAt}` : null);
}

// Called with a receipt confirmed by the transport module.
export function applyTransportReceipt({ wasteId, legId, status, respondedAt, actor }) {
  if (typeof wasteId !== 'string' || !wasteId || !legId || !['accepted', 'rejected'].includes(status) ||
      typeof respondedAt !== 'string') return false;
  const value = loadCase(wasteId);
  const step = value?.pending;
  if (!step || transportLegId(step) !== legId) return false;
  const timestamp = Date.parse(respondedAt);
  const previousTimestamp = Date.parse(step.handoff?.respondedAt);
  if (!Number.isFinite(timestamp) || timestamp <= previousTimestamp) return false;
  storeCase({
    ...value, updatedAt: new Date().toISOString(),
    pending: { ...step, handoff: { status, respondedAt: new Date(timestamp).toISOString(),
      ...(actor && { actor }) } },
  });
  return true;
}

export function applyTransportPickup({ wasteId, legId, actor, respondedAt }) {
  const value = loadCase(wasteId);
  const step = value?.pending;
  if (!legId || transportLegId(step) !== legId || step.pickup || step.handoff) return false;
  const time = respondedAt || new Date().toISOString();
  storeCase({
    ...value, updatedAt: time,
    pending: { ...step, pickup: { actor, respondedAt: time } },
  });
  return true;
}

export function handoffLabel(step) {
  if (step?.internal) return '사업장 내부 공정 진행';
  return { accepted: '업체 수령 확인', rejected: '수령 문제 있음', awaiting: '업체 수령 대기' }[step?.handoff?.status]
    || '업체 수령 대기';
}

export function finishCase(value) {
  if (value.pending || !value.completed.length) throw new Error('공정 완료 기록을 먼저 확인해 주세요.');
  const step = value.completed.at(-1);
  if (step.observedOutput && (!step.observedOutput.state_key || step.observedOutput.mass_kg === 0 ||
      (step.expectedState?.key && step.expectedState.key !== step.observedOutput.state_key &&
        !step.observedOutput.review_reference?.trim()))) {
    throw new Error('산출물 확인 자료를 먼저 확인해 주세요.');
  }
  return { ...value, finished: true, updatedAt: new Date().toISOString() };
}

export function reviewTreatmentOutput(value, reference) {
  const step = value.completed.at(-1);
  const checked = reference.trim();
  if (value.pending || value.finished || !step?.observedOutput?.state_key || !checked || checked.length > 160) {
    throw new Error('실제 산출물의 확인 자료를 입력해 주세요.');
  }
  return { ...value, updatedAt: new Date().toISOString(), completed: [...value.completed.slice(0, -1), {
    ...step, observedOutput: { ...step.observedOutput, review_reference: checked },
  }] };
}

export function displayCase(value) {
  return {
    id: value.id,
    name: value.name,
    code: value.input.waste_code,
    category: value.input.material,
    status: value.finished ? '완료' : value.pending ? '처리 진행' : '확정',
    updatedAt: new Date(value.updatedAt).toLocaleDateString('ko-KR'),
  };
}

export function restoreCases(defaultCases) {
  try {
    const saved = Object.keys(localStorage)
      .filter((key) => key.startsWith(storagePrefix))
      .map((key) => loadCase(key.slice(storagePrefix.length)))
      .filter(Boolean)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(displayCase);
    const ids = new Set(saved.map((item) => item.id));
    return [...saved, ...defaultCases.filter((item) => !ids.has(item.id))];
  } catch {
    return defaultCases;
  }
}
