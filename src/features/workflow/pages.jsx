// 처리 경로·인계 화면
//  - /wastes/case-<문진 건 ID>                            : 문진 건 상세 (처리 경로를 보고 업체를 고르는 화면)
//  - /lots/<처리 건 ID>                                    : 처리 건 (요청받은 업체도 여기서 봄)
//  - /lots/<처리 건 ID>/receive/<요청 ID>?t=<QR 토큰>       : 입고 QR을 스캔하면 열리는 입고 확인
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { diagnosisApi } from '../diagnosis/index.jsx';
import { currentRoute, navigate } from '../../lib/router.js';
import { workflowApi } from './api.js';
import { CaseRoutePanel } from './CaseRoutePanel.jsx';
import { LotPanel } from './LotPanel.jsx';
import { LOT_STATUS, lotCardStatus, stateLabel, formatKg } from './labels.js';
import { Icon } from '../../components/Icon.jsx';
import './workflow.css';

export function CaseDetailPage({ caseId }) {
  const [detail, setDetail] = useState(null);
  const [lot, setLot] = useState(undefined); // undefined: 불러오는 중, null: 처리 건 없음
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [preferredFacility, setPreferredFacility] = useState(null);
  const [activeTab, setActiveTab] = useState('route');

  useEffect(() => {
    let live = true;
    diagnosisApi.getCase(caseId).then((d) => live && setDetail(d)).catch((e) => live && setError(e.message));
    workflowApi
      .listLots()
      .then((lots) => live && setLot(lots.find((l) => l.data?.handoff?.case_id === caseId || l.diagnosis_id === caseId) || null))
      .catch(() => live && setLot(null));
    return () => {
      live = false;
    };
  }, [caseId]);

  if (error) return <main className="wf-page"><p className="wf-alert" role="alert">{error} <a href="/wastes">목록으로</a></p></main>;
  if (!detail) return <main className="session-gate" aria-busy="true" />;

  const kase = detail.case;
  const confirmed = ['CODE_CONFIRMED', 'IN_TRANSIT', 'COMPLETED'].includes(kase.status);
  const code = kase.summary?.code || detail.handoff?.waste_code;
  const stage = !confirmed ? '01'
    : kase.status === 'COMPLETED' || lot?.status === 'completed' ? 'done'
    : kase.status === 'IN_TRANSIT' || (lot && lotCardStatus(lot.status) === '처리 진행') ? '03' : '02';
  const stageLabel = stage === '01' ? 'STEP 01 · 분류 확인'
    : stage === '02' ? `STEP 02 · ${lot?.status === 'ready' ? '업체 검토' : lot ? LOT_STATUS[lot.status] || '경로 준비' : '경로 준비'}`
      : stage === '03' ? `STEP 03 · ${lot ? LOT_STATUS[lot.status] || '처리 진행' : '처리 진행'}` : '처리 완료';
  const tracking = stage === '03' || stage === 'done';

  return (
    <main className="wf-page waste-detail">
      <a className="detail-back" href="/wastes"><span>←</span> 자원 경로</a>
      <header className="detail-header waste-identity" data-step={stage === 'done' ? '03' : stage}>
        <div className="waste-identity-copy">
          <span className="detail-stage">{stageLabel}</span>
          <div className="waste-identity-main">
            <div>
              <span className="waste-identity-label">폐기물</span>
              <h1>{kase.summary?.title || '폐기물'}</h1>
            </div>
            <div className="waste-identity-actions">
              <div className="detail-code wf-code"><strong>분류번호 {code || '미정'}</strong></div>
              {tracking && <div id="case-qr-slot" className="waste-identity-qr" aria-label="QR">
                {lot && ['processing', 'processed', 'review_required', 'completed'].includes(lot.status) && <RecordQr caseId={caseId} />}
              </div>}
            </div>
          </div>
        </div>
      </header>
      <div className="route-detail-tabs" role="group" aria-label="자원 경로 상세 보기">
        <button type="button" aria-pressed={activeTab === 'route'} onClick={() => setActiveTab('route')}>{tracking ? '인계 현황' : '공정·업체 추천'}</button>
        <button type="button" aria-pressed={activeTab === 'info'} onClick={() => setActiveTab('info')}>{tracking ? '물량·확인 사항' : '분류·확인 사항'}</button>
      </div>
      {!confirmed && activeTab === 'info' && <section className="route-info-surface" aria-label="분류·확인 사항">
        <div className="route-info-row"><span className="route-info-icon"><Icon name="check" size={18} /></span><div className="route-info-content">
          <h2>분류 정보와 문진 기록</h2>
          <p>{kase.summary?.result_label || kase.summary?.status_label}</p>
          <div className="route-info-links"><a href={`/wastes/case-${caseId}/survey`}>문진 이어서 하기</a><a href={`/wastes/case-${caseId}/history`}>판정 기록</a></div>
        </div></div>
      </section>}
      <div hidden={activeTab !== 'route'}>
      {!confirmed ? (
        <section className="route-status-notice">
          <p>분류를 확정하면 처리 경로를 볼 수 있어요.</p>
          <a href={`/wastes/case-${caseId}/survey`}>문진 이어서 하기</a>
        </section>
      ) : lot === undefined ? (
        <p className="wf-muted">불러오는 중…</p>
      ) : lot ? (
        <>{registered && lot.status === 'ready' && <div className="registration-success" role="status" tabIndex={-1} ref={(node) => { if (node) node.focus(); }}><Icon name="check" size={20} /><div><strong>처리 건이 등록됐어요</strong><p>{preferredFacility ? `${preferredFacility.label}을 검토 후보로 선택했어요. ` : ''}사진을 첨부하고 업체를 검토한 뒤 인수를 요청해 주세요.</p></div></div>}<LotPanel lotId={lot.id} initialLot={lot} preferredFacility={preferredFacility} showRecycling={false} view="progress" onLotChange={setLot} qrTargetId="case-qr-slot" /></>
      ) : null}
      </div>
      {tracking && lot && activeTab === 'info' && <LotPanel lotId={lot.id} initialLot={lot} preferredFacility={preferredFacility} showRecycling={false} view="info" />}
      {confirmed && lot !== undefined && !tracking && <CaseRoutePanel caseId={caseId} caseTitle={kase.summary?.title} wasteCode={code} classification={kase.summary?.result_label || kase.summary?.status_label} lotRecycling={lot?.data.recycling} recyclingFollowUp={lot?.data.completed?.length > 0} view={activeTab} hasLot={!!lot} onLotCreated={(created, preferred) => { setPreferredFacility(preferred); setRegistered(true); setLot(created); setActiveTab('route'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
    </main>
  );
}

function RecordQr({ caseId }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let live = true;
    const url = `${location.origin}/#/wastes/case-${encodeURIComponent(caseId)}`;
    QRCode.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then((next) => { if (live) setImage(next); });
    return () => { live = false; };
  }, [caseId]);
  return image && <figure className="wf-record-qr">
    <img src={image} alt="이 폐기물의 진행 기록을 여는 QR" width="156" height="156" />
    <figcaption>진행 기록 QR</figcaption>
  </figure>;
}

export function LotPage({ lotId }) {
  const [activeTab, setActiveTab] = useState('progress');
  return (
    <main className="wf-page waste-detail">
      <a className="detail-back" href="/wastes"><span>←</span> 자원 경로</a>
      <header className="detail-header">
        <div>
          <span className="detail-stage">기업 간 인계</span>
          <h1>처리 건</h1>
        </div>
      </header>
      <div className="route-detail-tabs" role="group" aria-label="처리 건 상세 보기">
        <button type="button" aria-pressed={activeTab === 'progress'} onClick={() => setActiveTab('progress')}>인계 현황</button>
        <button type="button" aria-pressed={activeTab === 'info'} onClick={() => setActiveTab('info')}>물량·확인 사항</button>
      </div>
      <LotPanel lotId={lotId} view={activeTab} />
    </main>
  );
}

// 수신 기업이 입고 QR을 스캔하면 열린다. 로그인한 기업이 지정된 수신 기업이어야 입고된다
export function ReceivePage({ lotId, offerId }) {
  const token = new URLSearchParams(currentRoute().search).get('t') || '';
  const [lot, setLot] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    workflowApi.getLot(lotId).then(setLot).catch((e) => setError(e.message));
  }, [lotId]);
  const offer = lot?.offers.find((o) => o.id === offerId);
  async function receive() {
    setBusy(true);
    setError('');
    try {
      await workflowApi.receive(lot, offerId, token);
      navigate(`/lots/${lotId}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <main className="wf-page waste-detail">
      <header className="detail-header">
        <div>
          <span className="detail-stage">입고 확인</span>
          <h1>{offer?.data?.facility?.label || '입고 QR'}</h1>
        </div>
      </header>
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {!lot && !error && <p className="wf-muted">불러오는 중…</p>}
      {lot && !offer && <p className="wf-alert">이 QR의 인수 요청을 찾을 수 없어요.</p>}
      {offer && (
        <section className="wf-card">
          <p>
            {lot.companies[offer.sender_id]} → {lot.companies[offer.recipient_id]}
          </p>
          <p>
            받을 물량: {stateLabel(lot, offer.data.current?.state_key)} {formatKg(offer.data.current?.mass_kg)}
          </p>
          <p className="wf-muted">{offer.data.current?.condition}</p>
          {offer.can_receive ? (
            <button className="button button-primary" type="button" disabled={busy || !token} onClick={receive}>
              {busy ? '확인하는 중…' : '실물을 받았어요 · 입고 확인'}
            </button>
          ) : offer.status === 'accepted' ? (
            <p className="wf-alert">요청받은 기업 계정으로 로그인해야 입고할 수 있어요.</p>
          ) : (
            <p className="wf-muted">이미 처리된 요청이에요 ({offer.status}).</p>
          )}
          <a className="button button-quiet" href={`/lots/${lotId}`}>처리 건 보기</a>
        </section>
      )}
    </main>
  );
}
