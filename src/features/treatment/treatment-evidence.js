export const evidenceStages = [
  ['handover', '배출·운반 인계'],
  ['receipt', '처리업체 입고'],
  ['processing', '처리·산출물'],
];

export function latestEvidence(step, stage) {
  return step.evidence?.findLast((record) => record.stage === stage);
}

function required(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label}을 입력해 주세요.`);
  return text;
}

function kg(value, label, min = 0) {
  const number = Number(required(value, label));
  if (!Number.isFinite(number) || number < min || number > 1e9) {
    throw new Error(`${label}의 중량(kg)을 확인해 주세요.`);
  }
  return number;
}

function match(value, label) {
  if (value !== 'yes' && value !== 'no') throw new Error(`${label}을 선택해 주세요.`);
  return value === 'yes';
}

export function recordEvidence(value, stage, data) {
  if (!value.pending || value.finished) throw new Error('진행 중인 공정이 없어요.');
  const index = evidenceStages.findIndex(([key]) => key === stage);
  if (index < 0) throw new Error('증빙 종류를 확인해 주세요.');
  const prior = index ? latestEvidence(value.pending, evidenceStages[index - 1][0]) : null;
  if (index && !prior) throw new Error('앞 단계의 증빙을 먼저 기록해 주세요.');

  const occurredOn = required(data.occurredOn, '발생일');
  const date = new Date(occurredOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || !Number.isFinite(date.getTime())
      || date.toISOString().slice(0, 10) !== occurredOn) {
    throw new Error('발생일을 확인해 주세요.');
  }
  const following = evidenceStages[index + 1];
  const next = following && latestEvidence(value.pending, following[0]);
  if ((prior && occurredOn < prior.occurredOn) || (next && occurredOn > next.occurredOn)) {
    throw new Error('인계, 입고, 처리 순서에 맞는 날짜를 입력해 주세요.');
  }
  const time = new Date().toISOString();
  const reference = required(data.reference, '증빙 문서 번호 또는 식별자');
  const actor = required(data.actor, '기록된 업체명');
  const details = stage === 'handover'
    ? {
      massKg: kg(data.massKg, '인계 중량', 0.001),
      inputLot: required(data.inputLot, '인계 로트번호'),
    }
    : stage === 'receipt'
      ? {
        massKg: kg(data.massKg, '입고 중량', 0.001),
        actualAddress: required(data.actualAddress, '실제 입고 주소'),
        siteMatches: match(data.siteMatches, '예정 사업장과의 일치 여부'),
      }
      : {
        processMatches: match(data.processMatches, '예정 공정과의 일치 여부'),
        actualProcess: required(data.actualProcess, '실제 공정명'),
        outputMatches: match(data.outputMatches, '예정 산출물과의 일치 여부'),
        actualOutput: required(data.actualOutput, '실제 산출물'),
        outputLot: required(data.outputLot, '산출물 로트번호 또는 출고 식별자'),
        outputKg: kg(data.outputKg, '산출물 중량'),
        residueKg: kg(data.residueKg, '잔재물 중량'),
        lossKg: kg(data.lossKg, '공정 손실량'),
        addedKg: kg(data.addedKg, '추가 투입량'),
      };
  if (stage === 'processing' && details.residueKg > 0) {
    details.residueDestination = required(data.residueDestination, '잔재물 처리처 또는 보관 위치');
  }
  if (stage === 'processing' && (details.lossKg > 0 || details.addedKg > 0)) {
    details.massNote = required(data.massNote, '공정 손실·추가 투입의 기록 근거');
  }
  return {
    ...value, updatedAt: time,
    pending: {
      ...value.pending,
      evidence: [...(value.pending.evidence || []), {
        stage, occurredOn, actor, reference, ...details, recordedAt: time,
      }],
    },
  };
}

export function auditStep(step, previous) {
  const handover = latestEvidence(step, 'handover');
  const receipt = latestEvidence(step, 'receipt');
  const processing = latestEvidence(step, 'processing');
  const missing = evidenceStages.filter(([key]) => !latestEvidence(step, key)).map(([, label]) => label);
  const differences = [];
  const priorOutput = previous && latestEvidence(previous, 'processing');

  function compare(label, expected, actual) {
    const difference = Math.round((actual - expected) * 1000) / 1000;
    if (Math.abs(difference) > 0.1) differences.push(`${label} 차이 ${difference} kg`);
  }

  if (priorOutput && handover) {
    compare('이전 산출물과 다음 인계 중량', priorOutput.outputKg, handover.massKg);
    if (priorOutput.outputLot !== handover.inputLot) differences.push('이전 산출물과 다음 인계 로트번호가 다릅니다.');
  }
  if (handover && receipt) compare('인계·입고 중량', handover.massKg, receipt.massKg);
  if (receipt && !receipt.siteMatches) differences.push('실제 입고 사업장이 예정 사업장과 다릅니다.');
  if (processing && !processing.processMatches) differences.push('실제 작업이 예정 공정과 다릅니다.');
  if (processing && !processing.outputMatches) differences.push('실제 산출물이 후속 경로의 예정 상태와 다릅니다.');
  if (processing?.outputKg === 0) differences.push('기록된 재활용 산출물 중량이 0 kg입니다.');
  if (processing && receipt) {
    compare('입고·추가 투입과 산출·잔재·손실 중량',
      receipt.massKg + processing.addedKg,
      processing.outputKg + processing.residueKg + processing.lossKg);
  }
  return { missing, differences, ready: missing.length === 0 && differences.length === 0 };
}

export function reportFor(value) {
  const steps = value.pending ? [...value.completed, value.pending] : value.completed;
  return {
    reportType: 'scrap-lot-evidence-v1',
    reviewScope: 'operator-recorded-references-and-consistency-check',
    lotId: value.id,
    lotName: value.name,
    classification: value.input.waste_code,
    material: value.input.material,
    inputForm: value.input.input_form,
    originLabel: value.input.originLabel ?? null,
    trackingClosed: value.finished,
    steps: steps.map((step, i) => ({ ...step, audit: auditStep(step, steps[i - 1]) })),
  };
}
