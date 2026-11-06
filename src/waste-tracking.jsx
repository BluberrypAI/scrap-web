/** @jsxRuntime classic */
/** @jsx h */
import QRCode from 'qrcode';
import {
  handoffLabel, loadCase, transportLegId, watchCase,
} from './features/treatment/treatment-state.js';
import { transportRequest, useServerTransport } from './features/treatment/transport-client.js';
import './waste-tracking.css';

export function fieldCheckUrl(wasteId, legId) {
  const url = new URL(location.href);
  url.hash = `/track/${encodeURIComponent(wasteId)}/${encodeURIComponent(legId)}`;
  return url.href;
}

export function createWasteTracking(React) {
  const { createElement: h, useEffect, useState } = React;

  function useTrackingCase(wasteId) {
    const [value, setValue] = useState(() => loadCase(wasteId));
    useEffect(() => {
      const refresh = () => setValue(loadCase(wasteId));
      refresh();
      return watchCase(wasteId, refresh);
    }, [wasteId]);
    return value;
  }

  function QR({ wasteId, legId }) {
    const [image, setImage] = useState('');
    const [message, setMessage] = useState('');
    const url = fieldCheckUrl(wasteId, legId);
    useEffect(() => {
      let active = true;
      QRCode.toDataURL(url, { width: 320, margin: 4, errorCorrectionLevel: 'M' })
        .then((src) => { if (active) setImage(src); })
        .catch(() => { if (active) setMessage('QR을 표시하지 못했습니다. 아래 링크를 사용해 주세요.'); });
      return () => { active = false; };
    }, [url]);
    async function copy() {
      try { await navigator.clipboard.writeText(url); setMessage('링크를 복사했습니다.'); }
      catch { setMessage('아래 주소를 선택해 복사해 주세요.'); }
    }
    return <div className="wt-qr">
      {image && <img src={image} alt="이 폐기물의 현장 확인 QR" width="220" height="220" />}
      <div><h4>현장 확인 QR</h4><p>스캔하면 담당 역할과 이름을 입력하는 화면이 열립니다.</p>
        <div className="wt-buttons"><a className="button button-primary" href={url} target="_blank" rel="noreferrer">현장 화면 열기 ↗</a>
          <button className="button button-quiet" type="button" onClick={copy}>링크 복사</button></div>
        <input aria-label="현장 확인 주소" readOnly value={url} onFocus={(event) => event.target.select()} />
        <small role="status">{message}</small>
        {['localhost', '127.0.0.1', '::1'].includes(location.hostname) &&
          <p className="wt-notice">휴대폰에서 열려면 같은 Wi-Fi의 PC 주소로 접속해 이 QR을 표시해 주세요.</p>}
      </div>
    </div>;
  }

  function CompanyPanel({ waste }) {
    const value = useTrackingCase(waste.id);
    const pending = value?.pending;
    const legId = transportLegId(pending);
    const registration = useServerTransport(waste.id, pending);
    const transported = (value?.completed ?? []).filter((step) => transportLegId(step));
    return <section className="wt-company" aria-label="폐기물 현장 확인 QR">
      <header><div><small>FIELD CHECK</small><h3>QR · 운송 현황</h3></div></header>
      {legId ? <>
        <p>{pending.from} → {pending.facility} · {handoffLabel(pending)}</p>
        {pending.pickup && <p>✓ 운송기사 인수 기록</p>}
        {pending.handoff?.status === 'accepted' ? <p>✓ 업체 입고 기록</p> : registration === 200 ?
          <QR key={legId} wasteId={waste.id} legId={legId} /> : <p role="status">{
            registration === 401 ? '로그인한 뒤 인계 QR을 만들 수 있어요.' : registration == null
              ? '인계 구간을 서버에 등록 중이에요.' : '인계 구간을 등록하지 못했어요. 서버 연결을 확인해 주세요.'}</p>}
      </> : <p>{pending?.internal ? '현재 공정은 같은 사업장 안에서 진행돼요.' : '인계 업체를 선택하면 이 카드에 운송 QR이 생겨요.'}</p>}
      {transported.length > 0 && <ul>{transported.map((step) => <li key={transportLegId(step)}>
        {step.from} → {step.facility} · {handoffLabel(step)}
      </li>)}</ul>}
      <p className="wt-notice">현장 확인은 서버에 저장돼 처리경로에 반영됩니다.</p>
    </section>;
  }

  function PublicPage({ wasteId, legId }) {
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('driver');
    const [actor, setActor] = useState('');
    const [message, setMessage] = useState('');
    const label = role === 'driver' ? '폐기물 인수 완료' : '업체 입고 확인';
    const step = record?.lot === wasteId ? record : null;
    const alreadyConfirmed = role === 'driver' ? step?.pickup_at : step?.receipt_at;
    const [saving, setSaving] = useState(false);
    useEffect(() => {
      const controller = new AbortController();
      transportRequest(legId, { signal: controller.signal })
        .then(({ value }) => { if (!controller.signal.aborted) setRecord(value); })
        .catch(() => { if (!controller.signal.aborted) setMessage('서버 연결을 확인해 주세요.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
      return () => controller.abort();
    }, [legId]);
    async function confirm() {
      setSaving(true);
      try {
        const { status, value } = await transportRequest(legId, { method: 'POST', data: { role, actor: actor.trim() } });
        if (value) setRecord(value);
        setMessage(value ? '서버에서 현장 기록을 확인했어요.' : [401, 403].includes(status)
          ? '지정된 처리업체 계정으로 로그인해 주세요.' : '현재 인계 건을 다시 확인해 주세요.');
      } catch {
        setMessage('저장하지 못했어요. 서버 연결을 확인하고 다시 시도해 주세요.');
      } finally {
        setSaving(false);
      }
    }
    return <main className="transport-page wt-public">
      <header className="wt-public-header"><strong>SCRAP<span>.</span></strong><span>현장 확인</span></header>
      <div className="wt-public-body">
        <section className="transport-card wt-action">
          <small>폐기물 현장 확인</small>
          <h1>{loading ? '인계 건 조회 중' : step ? `${step.origin} → ${step.destination}` : '이 인계 건을 찾을 수 없어요'}</h1>
          {step?.pickup_at && <p>✓ 운송기사 인수 확인</p>}
          {step?.receipt_at && <p>✓ 업체 입고 확인</p>}
          {step && !step.receipt_at ? <>
          <div className="wt-role" aria-label="담당 역할">
            {[['driver', '운송기사'], ['recipient', '수요·처리업체']].map(([key, title]) =>
              <button type="button" key={key} aria-pressed={role === key}
                onClick={() => { setRole(key); setActor(''); setMessage(''); }}>{title}</button>)}
          </div>
          <label>확인자 이름<input value={actor} maxLength="80"
            onChange={(event) => { setActor(event.target.value); setMessage(''); }}
            placeholder="이름을 입력해 주세요" autoComplete="name" /></label>
          <button className="button button-primary" type="button" disabled={saving || !actor.trim() || Boolean(alreadyConfirmed)}
            onClick={confirm}>{label}</button>
          </> : !loading && !step ? <p>카드의 운송 탭에서 현재 구간 QR을 다시 열어 주세요.</p> : null}
          {message && <p role="status">{message}</p>}
          <small>이 링크를 가진 현장 담당자가 확인을 기록합니다.</small>
        </section>
      </div>
    </main>;
  }

  return { CompanyPanel, Page: PublicPage };
}
