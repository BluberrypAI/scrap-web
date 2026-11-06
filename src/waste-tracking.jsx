/** @jsxRuntime classic */
/** @jsx h */
import QRCode from 'qrcode';
import { wastes } from './data/wastes.js';
import { fieldCheckEvent, readFieldChecks, saveFieldCheck } from './features/tracking/field-checks.js';
import './waste-tracking.css';

export function createWasteTracking(React) {
  const { createElement: h, useEffect, useState } = React;

  function QR({ wasteId }) {
    const [image, setImage] = useState('');
    const [message, setMessage] = useState('');
    const url = `${location.origin}/#/track/${encodeURIComponent(wasteId)}`;
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
    const [checks, setChecks] = useState(() => readFieldChecks(waste.id));
    useEffect(() => {
      const refresh = () => setChecks(readFieldChecks(waste.id));
      window.addEventListener(fieldCheckEvent, refresh);
      window.addEventListener('storage', refresh);
      return () => {
        window.removeEventListener(fieldCheckEvent, refresh);
        window.removeEventListener('storage', refresh);
      };
    }, [waste.id]);
    return <section className="wt-company" aria-label="폐기물 현장 확인 QR">
      <header><div><small>FIELD CHECK</small><h3>QR · 운송 현황</h3></div></header>
      <QR wasteId={waste.id} />
      <div className="wt-checks">
        <span>운송기사 인수 {checks.driver ? `완료 · ${checks.driver.actor}` : '대기'}</span>
        <span>처리업체 입고 {checks.recipient ? `완료 · ${checks.recipient.actor}` : '대기'}</span>
      </div>
    </section>;
  }

  function PublicPage({ wasteId }) {
    const waste = wastes.find((item) => item.id === wasteId);
    const [role, setRole] = useState('driver');
    const [actor, setActor] = useState('');
    const [confirmed, setConfirmed] = useState(null);
    const [error, setError] = useState('');
    const label = role === 'driver' ? '폐기물 인수 완료' : '업체 입고 확인';
    return <main className="transport-page wt-public">
      <header className="wt-public-header"><strong>SCRAP<span>.</span></strong><span>현장 확인</span></header>
      <div className="wt-public-body">
        <section className="transport-card wt-action">
          <small>{waste?.name || '폐기물 현장 확인'}</small>
          <h1>담당 역할을 선택해 주세요</h1>
          <div className="wt-role" aria-label="담당 역할">
            {[['driver', '운송기사'], ['recipient', '수요·처리업체']].map(([key, title]) =>
              <button type="button" key={key} aria-pressed={role === key}
                onClick={() => { setRole(key); setActor(''); setConfirmed(null); }}>{title}</button>)}
          </div>
          <label>확인자 이름<input value={actor} maxLength="80"
            onChange={(event) => { setActor(event.target.value); setConfirmed(null); }}
            placeholder="이름을 입력해 주세요" autoComplete="name" /></label>
          <button className="button button-primary" type="button" disabled={!actor.trim()}
            onClick={() => {
              try {
                saveFieldCheck(wasteId, role, actor);
                setConfirmed({ role, actor: actor.trim() });
                setError('');
              } catch {
                setError('확인 내용을 저장하지 못했어요. 브라우저 저장소를 확인해 주세요.');
              }
            }}>{label}</button>
          {confirmed && <p role="status">{confirmed.actor} · {confirmed.role === 'driver' ? '인수' : '입고'} 확인 화면입니다.</p>}
          {error && <p role="alert">{error}</p>}
          <small>확인 기록은 현재 사용 중인 브라우저에 저장됩니다.</small>
        </section>
      </div>
    </main>;
  }

  return { CompanyPanel, Page: PublicPage };
}
