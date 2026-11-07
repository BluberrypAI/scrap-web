export const materials = [
  {
    key: 'pp', label: 'PP 사출 잔재·파쇄품', engineMaterial: 'pp', routeMaterial: 'PP',
    forms: [
      { key: 'scrap', label: '사출 제조 잔재', codes: ['51-03-01'], resin: 'ordinary_resin' },
      { key: 'shredded', label: 'PP 파쇄품', codes: ['51-03-01'] },
    ],
  },
  {
    key: 'pe', label: 'PE 폐필름', engineMaterial: 'pe', routeMaterial: 'PE',
    forms: [{ key: 'film', label: 'PE 필름', codes: ['51-03-01', '51-03-07'] }],
  },
  {
    key: 'pet', label: '사용 후 PET병', engineMaterial: 'pet', routeMaterial: 'PET',
    forms: [{ key: 'bottle', label: '사용 후 PET병', codes: ['51-03-07'], resin: 'discarded_packaging' }],
  },
  {
    key: 'aluminium', label: '사용 후 알루미늄 음료캔', engineMaterial: 'metal_can', routeMaterial: 'aluminium',
    forms: [{ key: 'can', label: '알루미늄 음료캔', codes: ['51-29-03'] }],
  },
];

export const outsideScope = '이번 문진은 PP 사출 잔재·파쇄품, PE 필름, 사용 후 PET병, 알루미늄 음료캔을 지원해요.';

export function initialAnswers(material, form) {
  return {
    material: material.engineMaterial,
    physical_state: 'solid',
    ...(form.resin && { resin_stream: form.resin }),
  };
}

export function holdReason(answers) {
  if (['designated_residue', 'pcb_possible', 'toxic_chemical_discard'].some((fact) =>
    answers[fact] === true || answers[fact] === 'UNKNOWN') ||
    ['present', 'UNKNOWN'].includes(answers.oil_presence)) {
    return '잔류물이나 오염 가능성을 먼저 확인해 주세요. 확인 전에는 처리경로를 만들 수 없어요.';
  }
  if (answers.can_scope && answers.can_scope !== 'covered_aluminium') {
    return '재활용의무 대상 음료캔인지, 알루미늄 재질인지 확인해 주세요.';
  }
  if (answers.physical_state && answers.physical_state !== 'solid') return outsideScope;
  if (Object.values(answers).includes('UNKNOWN')) return '분류에 필요한 정보가 더 있어요. 확인한 뒤 문진을 이어가 주세요.';
  return null;
}

export function routeInput(view, material, form) {
  const result = view.result;
  if (view.question || view.needs_review?.length || result?.kind !== 'code' || !form.codes.includes(result.code) ||
    result.treatment?.material !== material.routeMaterial || result.treatment?.waste_code !== result.code ||
    result.recycle?.status !== 'ALLOWED') return null;
  return {
    waste_code: result.code,
    material: material.routeMaterial,
    input_form: form.key,
    classificationProvisional: Boolean(result.provisional),
    classificationAsOf: view.as_of,
    classificationEvidence: result.evidence ?? [],
    recycling_types: Object.fromEntries(['free', 'analysis', 'unmarked'].map((group) =>
      [group, (result.recycle[group] ?? []).map(([code]) => code)])),
  };
}
