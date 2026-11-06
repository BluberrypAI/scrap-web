/** @jsxRuntime classic */
/** @jsx h */
import { auditStep, evidenceStages, latestEvidence, reportFor } from './treatment-evidence.js';

export function createEvidenceUI(React) {
  const { createElement: h } = React;

  function Match({ name, value, children }) {
    return <label>{children}<select required name={name} defaultValue={value == null ? '' : value ? 'yes' : 'no'}>
      <option value="">선택</option>
      <option value="yes">일치</option>
      <option value="no">불일치</option>
    </select></label>;
  }

  function Mass({ name, value, min = 0, children }) {
    return <label>{children}<input name={name} type="number" min={min} max={1e9} step="0.001"
      required defaultValue={value} /></label>;
  }

  function EvidenceForm({ stage, step, previous, onRecord }) {
    const record = latestEvidence(step, stage);
    const previousOutput = previous && latestEvidence(previous, 'processing');
    const receipt = latestEvidence(step, 'receipt');
    return <form className="treatment-evidence-form" key={record?.recordedAt ?? stage}
      onSubmit={(event) => {
        event.preventDefault();
        onRecord(stage, Object.fromEntries(new FormData(event.currentTarget)));
      }}>
      <label>발생일<input type="date" name="occurredOn" required defaultValue={record?.occurredOn} /></label>
      <label>증빙 문서 번호 또는 식별자<input name="reference" required maxLength={160}
        defaultValue={record?.reference} /></label>
      <label>{stage === 'handover' ? '운반 업체' : '실제 기록 업체'}<input name="actor" required maxLength={160}
        defaultValue={record?.actor ?? (stage === 'processing' ? receipt?.actor : undefined)} /></label>
      {stage === 'handover' && <div className="treatment-evidence-fields">
        <label>인계 로트번호<input name="inputLot" required maxLength={160}
          defaultValue={record?.inputLot ?? previousOutput?.outputLot} /></label>
        <Mass name="massKg" value={record?.massKg} min={0.001}>인계 중량 (kg)</Mass>
      </div>}
      {stage === 'receipt' && <div className="treatment-evidence-fields">
        <Mass name="massKg" value={record?.massKg} min={0.001}>입고 중량 (kg)</Mass>
        <label>실제 입고 주소<input name="actualAddress" required maxLength={200} defaultValue={record?.actualAddress} /></label>
        <Match name="siteMatches" value={record?.siteMatches}>입고 주소가 예정 사업장과 일치하나요?</Match>
      </div>}
      {stage === 'processing' && <div className="treatment-evidence-fields">
        <label>실제 공정명<input name="actualProcess" required maxLength={160} defaultValue={record?.actualProcess} /></label>
        <Match name="processMatches" value={record?.processMatches}>실제 공정이 예정 공정과 일치하나요?</Match>
        <label>실제 산출물<input name="actualOutput" required maxLength={160} defaultValue={record?.actualOutput} /></label>
        <Match name="outputMatches" value={record?.outputMatches}>산출물이 예정 상태와 일치하나요?</Match>
        <label>산출물 로트번호·출고 식별자<input name="outputLot" required maxLength={160} defaultValue={record?.outputLot} /></label>
        <Mass name="outputKg" value={record?.outputKg}>산출물 중량 (kg)</Mass>
        <Mass name="residueKg" value={record?.residueKg ?? 0}>잔재물 중량 (kg)</Mass>
        <label>잔재물 처리처·보관 위치<input name="residueDestination" maxLength={160}
          defaultValue={record?.residueDestination} /></label>
        <Mass name="lossKg" value={record?.lossKg ?? 0}>공정 손실량 (kg)</Mass>
        <Mass name="addedKg" value={record?.addedKg ?? 0}>추가 투입량 (kg)</Mass>
        <label>손실·추가 투입 근거<input name="massNote" maxLength={160} defaultValue={record?.massNote} /></label>
      </div>}
      <button className="button button-primary" type="submit">{record ? '정정 기록 저장' : '증빙 기록 저장'}</button>
    </form>;
  }

  function Audit({ audit }) {
    return <div className={`treatment-audit ${audit.differences.length ? 'has-difference' : ''}`} role="status">
      <strong>{audit.differences.length ? '계획·실적 불일치 확인 필요' : audit.ready ? '단계 기록 대조 완료' : '증빙 대기'}</strong>
      {audit.missing.length > 0 && <p>대기 중인 증빙 · {audit.missing.join(', ')}</p>}
      {audit.differences.map((issue) => <p key={issue}>{issue}</p>)}
    </div>;
  }

  function EvidenceTrail({ value, error, onRecord, onComplete }) {
    const { pending } = value;
    const previous = value.completed.at(-1);
    const audit = auditStep(pending, previous);
    return <section className="treatment-evidence" aria-label="공정 실적 증빙">
      <h3>예정 경로와 실제 처리 대조</h3>
      <p>예정 업체 {pending.facility} · 예정 공정 {pending.process}</p>
      {pending.address && <p>예정 입고 주소 · {pending.address}</p>}
      {pending.source?.kind === 'registry' && <p>담당자 확인 자료 · {pending.source.reviewReference}</p>}
      <Audit audit={audit} />
      {error && <p role="alert">{error}</p>}
      {evidenceStages.map(([stage, label], i) => {
        const record = latestEvidence(pending, stage);
        const available = i === 0 || latestEvidence(pending, evidenceStages[i - 1][0]);
        return <details key={stage}>
          <summary>{label} · {record ? `기록됨 (${record.reference})` : available ? '입력 가능' : '앞 단계 대기'}</summary>
          {available ? <EvidenceForm stage={stage} step={pending} previous={previous} onRecord={onRecord} />
            : <p>앞 단계 기록이 저장되면 입력할 수 있어요.</p>}
        </details>;
      })}
      <small>중량 차이가 0.1 kg을 넘으면 검토 대상으로 표시하는 데모 규칙이에요.</small>
      <button className="button button-primary" type="button" disabled={!audit.ready} onClick={onComplete}>
        공정 완료 확인
      </button>
    </section>;
  }

  function EvidenceReport({ value }) {
    const report = reportFor(value);
    function download() {
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `scrap-evidence-${value.id}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (!report.steps.length) return null;
    return <section className="treatment-evidence" aria-label="로트 증빙 보고서">
      <h3>로트 증빙 보고서</h3>
      <p>로트 {report.lotId} · 분류 {report.classification} · {report.originLabel || '배출지 기록 없음'}</p>
      {report.steps.map((step) => <article key={step.transition_key}>
        <h4>{step.process} · {step.facility}</h4>
        <Audit audit={step.audit} />
        {evidenceStages.map(([key, label]) => {
          const event = latestEvidence(step, key);
          if (!event) return null;
          return <p key={key}><strong>{label}</strong> · {event.occurredOn} · {event.actor} · {event.reference}
            {' · '}{key === 'processing'
              ? `${event.actualOutput} ${event.outputKg} kg / 잔재 ${event.residueKg} kg`
              : `${event.massKg} kg`}
            {key === 'receipt' && ` · ${event.actualAddress}`}</p>;
        })}
      </article>)}
      <button className="button button-quiet" type="button" onClick={download}>증빙 기록 내려받기</button>
    </section>;
  }

  return { EvidenceTrail, EvidenceReport };
}
