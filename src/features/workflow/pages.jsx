// 처리 경로·인계 화면
//  - /wastes/case-<문진 건 ID>                            : 문진 건 상세 (처리 경로를 보고 업체를 고르는 화면)
//  - /lots/<처리 건 ID>                                    : 처리 건 (요청받은 업체도 여기서 봄)
//  - /lots/<처리 건 ID>/receive/<요청 ID>?t=<QR 토큰>       : 입고 QR을 스캔하면 열리는 입고 확인
import { useEffect, useState } from 'react';
import { diagnosisApi } from '../diagnosis/index.jsx';
import { currentRoute, navigate } from '../../lib/router.js';
import { workflowApi } from './api.js';
import { CaseRoutePanel } from './CaseRoutePanel.jsx';
import { LotPanel } from './LotPanel.jsx';
import { LOT_STATUS, stateLabel, formatKg } from './labels.js';
import './workflow.css';

export function CaseDetailPage({ caseId }) {
  const [detail, setDetail] = useState(null);
  const [lot, setLot] = useState(undefined); // undefined: 불러오는 중, null: 처리 건 없음
  const [error, setError] = useState('');

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

  return (
    <main className="wf-page waste-detail">
      <a className="detail-back" href="/wastes"><span>←</span> 자원 경로</a>
      <header className="detail-header">
        <div>
          <span className="detail-stage">
            {!confirmed ? 'STEP 01 · 분류 확인' : lot ? `STEP 03 · ${LOT_STATUS[lot.status] || lot.status}` : 'STEP 02 · 경로 준비'}
          </span>
          <h1>{kase.summary?.title || '폐기물'}</h1>
          <p className="detail-meta">{kase.summary?.result_label || kase.summary?.status_label}</p>
          {/* 분류 결과는 카드 위 문구로 충분하고, 근거는 문진 대화·판정 기록에서 본다 */}
          <div className="detail-code wf-code">
            <strong>분류번호 {code || '미정'}</strong>
            <a className="button button-quiet button-small" href={`/wastes/case-${caseId}/survey`}>
              {confirmed ? '문진 대화' : '문진 이어서 하기'}
            </a>
            <a className="button button-quiet button-small" href={`/wastes/case-${caseId}/history`}>판정 기록</a>
          </div>
        </div>
      </header>
      {!confirmed ? (
        <section className="wf-card">
          <p>분류를 확정하면 처리 경로를 볼 수 있어요.</p>
          <a className="button button-primary" href={`/wastes/case-${caseId}/survey`}>문진 이어서 하기</a>
        </section>
      ) : lot === undefined ? (
        <p className="wf-muted">불러오는 중…</p>
      ) : lot ? (
        <LotPanel lotId={lot.id} initialLot={lot} />
      ) : (
        <CaseRoutePanel caseId={caseId} onLotCreated={setLot} />
      )}
    </main>
  );
}

export function LotPage({ lotId }) {
  return (
    <main className="wf-page waste-detail">
      <a className="detail-back" href="/wastes"><span>←</span> 자원 경로</a>
      <header className="detail-header">
        <div>
          <span className="detail-stage">기업 간 인계</span>
          <h1>처리 건</h1>
        </div>
      </header>
      <LotPanel lotId={lotId} />
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
