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
  globalThis.dispatchEvent?.(new Event('scrap-treatment-change'));
  return value;
}

export function newCase(id, name, input, time = new Date().toISOString()) {
  return { version: 1, id, name, input, completed: [], pending: null, finished: false,
    createdAt: time, updatedAt: time };
}

export function getTreatmentCase(waste) {
  const saved = loadCase(waste.id);
  if (saved) return saved;
  if (!waste.treatmentInput || (waste.status !== '확정'
    && !(waste.status === '처리 진행' && waste.treatmentInput.originType === 'demo'))) return null;
  const { material, input_form } = waste.treatmentInput;
  if (!waste.code || !material || !input_form) return null;
  return newCase(waste.id, waste.name,
    { ...waste.treatmentInput, waste_code: waste.code }, waste.classifiedAt ?? null);
}

export function beginStep(value, process, facility) {
  if (value.pending || value.finished) throw new Error('현재 진행 중인 공정을 먼저 완료해 주세요.');
  const time = new Date().toISOString();
  return {
    ...value, updatedAt: time,
    pending: {
      transition_key: process.transition_key, process: process.label,
      output: process.output_state.label, facility: facility.label,
      address: facility.address || facility.region || null,
      capability_key: facility.capability_key, startedAt: time,
      location: facility.location ?? null, distance: facility.straight_line_distance_km ?? null,
      source: facility.source ?? { kind: 'kg', references: facility.sources || [] },
      evidence: [],
    },
  };
}

export function completeStep(value) {
  if (!value.pending) throw new Error('완료할 공정이 없습니다.');
  if (!auditStep(value.pending, value.completed.at(-1)).ready) {
    throw new Error('증빙 누락이나 계획·실적 불일치를 먼저 확인해 주세요.');
  }
  const time = new Date().toISOString();
  return {
    ...value, updatedAt: time, pending: null,
    completed: [...value.completed, { ...value.pending, completedAt: time }],
  };
}

export function finishCase(value) {
  if (value.pending || !value.completed.length) throw new Error('공정 완료 기록을 먼저 확인해 주세요.');
  return { ...value, finished: true, updatedAt: new Date().toISOString() };
}

export function displayCase(value) {
  return {
    id: value.id,
    name: value.name,
    code: value.input.waste_code,
    category: value.input.material,
    ...(value.input.classificationAsOf && {
      classificationProvisional: value.input.classificationProvisional,
      classificationAsOf: value.input.classificationAsOf,
    }),
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
