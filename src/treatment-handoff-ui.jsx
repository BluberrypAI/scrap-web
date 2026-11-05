/** @jsx h */
import { completeStep, handoffLabel, handoffStep, loadCase, respondToHandoff, storeCase } from './treatment-state.js';
import { recordEvidence } from './treatment-evidence.js';

export function createHandoffUI(React, EvidenceTrail) {
  const { createElement: h, useEffect, useState } = React;

  function useStoredCase(id) {
    const [value, setValue] = useState(() => loadCase(id));
    useEffect(() => {
      const refresh = () => setValue(loadCase(id));
      window.addEventListener('storage', refresh);
      window.addEventListener('scrap-treatment-change', refresh);
      return () => {
        window.removeEventListener('storage', refresh);
        window.removeEventListener('scrap-treatment-change', refresh);
      };
    }, [id]);
    return value;
  }

  function LotProgress({ id }) {
    const value = useStoredCase(id);
    const step = value?.pending ?? value?.completed.at(-1);
    if (!step?.handoff) return null;
    const percent = value.finished || !value.pending ? 100 : step.handoff.status === 'accepted' ? 66 : 33;
    return <div className="handoff-card-progress" data-status={step.handoff.status}>
      <span>{value.finished ? '✓ 추적 완료' : !value.pending ? '✓ 공정 완료' :
        step.handoff.status === 'accepted' ? '✓ 업체 수령 확인' : handoffLabel(step)}</span>
      <progress max="100" value={percent} aria-label="현재 공정 진행 상태" />
    </div>;
  }

  function Sticker({ value }) {
    const step = value.pending;
    const url = new URL(window.location.pathname, window.location.origin);
    url.hash = `/handoff/${value.id}/${step.handoff.token}`;
    const link = url.href;
    const [qr, setQr] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
      let active = true;
      import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(link, {
        width: 256, margin: 4, errorCorrectionLevel: 'M',
      })).then((image) => {
        if (active) setQr(image);
      }).catch(() => {
        if (active) setError('QR을 그리지 못했어요. 수령 화면 링크로 열 수 있어요.');
      });
      return () => { active = false; };
    }, [link]);

    return <section className="handoff-controls" aria-label="로트 수령 QR">
      <div className="handoff-sticker">
        <span>SCRAP · 로트 인계</span>
        <strong>{step.facility}</strong>
        <small>출발 · {step.from || value.input.originLabel || '배출사업장'}</small>
        <small>{value.name} · {value.input.waste_code}</small>
        {qr && <img src={qr} width="144" height="144" alt="업체 수령 화면으로 연결하는 로트 QR" />}
        <small>로트 {value.id}</small>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="handoff-actions">
        <button className="button button-primary" type="button" disabled={!qr} onClick={() => window.print()}>QR 스티커 인쇄</button>
        <a href={link} className="button button-quiet" target="_blank" rel="noopener noreferrer">수령 화면 시연</a>
      </div>
      <small>현재 시연은 같은 브라우저의 두 탭에서 수령 상태를 공유해요.</small>
    </section>;
  }

  function Receiver({ id, token }) {
    const value = useStoredCase(id);
    const step = handoffStep(value, token);
    const [error, setError] = useState('');

    function update(change) {
      try {
        const current = loadCase(id);
        if (current?.pending?.handoff?.token !== token) throw new Error('이미 완료됐거나 유효하지 않은 인계 건이에요.');
        storeCase(change(current));
        setError('');
      } catch (failure) {
        setError(failure.message);
      }
    }

    return <main className="handoff-receiver" data-theme="light">
      <header><small>SCRAP · 처리업체 수령</small><h1>로트 수령 확인</h1></header>
      {!step ? <p role="status">이 브라우저에서 인계 건을 찾을 수 없어요. 발급한 데모 화면에서 수령 화면을 열어 주세요.</p> : <>
        <dl>
          <div><dt>보낸 곳</dt><dd>{step.from || value.input.originLabel || '배출사업장'}</dd></div>
          <div><dt>받는 곳</dt><dd>{step.facility}</dd></div>
          <div><dt>로트</dt><dd>{value.name} · {value.input.waste_code}</dd></div>
          <div><dt>예정 공정</dt><dd>{step.process}</dd></div>
        </dl>
        {step.handoff.status === 'awaiting' ? <>
          <p>QR 라벨과 실제 도착한 물량을 확인한 뒤 수령 결과를 남겨 주세요.</p>
          <div className="handoff-actions">
            <button className="button button-primary" type="button"
              onClick={() => update((current) => respondToHandoff(current, token, 'accepted'))}>정상 수령 확인</button>
            <button className="button button-quiet" type="button"
              onClick={() => update((current) => respondToHandoff(current, token, 'rejected'))}>수령 문제 있음</button>
          </div>
        </> : <p className={`handoff-receipt-status ${step.handoff.status}`} role="status">
          {step.handoff.status === 'accepted' && '✓ '}{handoffLabel(step)} · 배출기업 화면에 반영됐어요.
        </p>}
        {step === value.pending && step.handoff.status === 'accepted' && <details className="handoff-processing">
          <summary>처리업체용 후속 공정 기록</summary>
          <EvidenceTrail value={value} error={error} onRecord={(stage, data) => update((current) =>
            recordEvidence(current, stage, data))} onComplete={() => update(completeStep)} />
        </details>}
        {step === value.completed.at(-1) && value.pending?.handoff?.status === 'awaiting' && <section>
          <h2>다음 업체로 보낼 QR</h2>
          <Sticker value={value} />
        </section>}
      </>}
      {error && <p role="alert">{error}</p>}
    </main>;
  }

  return { LotProgress, Receiver, Sticker };
}
