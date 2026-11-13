import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { receiveUrl, workflowApi } from './api.js';
import { ProcessOption } from './FacilityCard.jsx';
import {
  LOT_STATUS,
  OFFER_STATUS,
  OUTPUT_STATES,
  STATE_LABEL,
  formatDateTime,
  formatKg,
} from './labels.js';

// 처리 건(로트) 하나. 지금 물량을 가진 기업(can_manage)과 요청받은 기업이 각자 할 일을 본다.
// 모든 변경은 revision을 함께 보내고, 다른 화면에서 바뀌었으면(409) 새로 불러온다.
export function LotPanel({ lotId, initialLot = null }) {
  const [lot, setLot] = useState(initialLot);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const reload = useCallback(() => {
    setError('');
    return workflowApi.getLot(lotId).then(setLot).catch((e) => setError(e.message));
  }, [lotId]);

  useEffect(() => {
    if (!initialLot) reload();
  }, [initialLot, reload]);

  // 서버 호출 공통: 잠금, 오류 문구, 충돌이면 새로 불러오기
  async function run(label, call) {
    setBusy(label);
    setError('');
    try {
      const next = await call();
      if (next?.id && next?.revision) setLot(next);
      return next;
    } catch (e) {
      setError(e.message);
      if (e.status === 409) reload();
      return null;
    } finally {
      setBusy('');
    }
  }

  if (!lot) return error ? <p className="wf-alert" role="alert">{error}</p> : <p className="wf-muted">처리 건을 불러오는 중…</p>;

  const current = lot.data.current;
  const stage = lot.data.completed.length;
  const stagePhotos = lot.photos.filter((p) => p.stage === stage);
  const pendingOffer = lot.offers.find((o) => o.status === 'pending');
  const acceptedOffer = lot.offers.find((o) => o.status === 'accepted');
  const name = (id) => lot.companies[id] || '알 수 없는 기업';
  const manage = lot.can_manage;
  const canFinish = manage && lot.status === 'processed' && ['pp-pellet', 'pp-compound'].includes(current.state_key);

  return (
    <div className="wf-panel">
      <section className="wf-card wf-summary">
        <div className="wf-summary-head">
          <span className="wf-status" data-status={lot.status}>{LOT_STATUS[lot.status] || lot.status}</span>
          <button className="button button-quiet button-small" type="button" onClick={reload} disabled={!!busy}>
            새로고침
          </button>
        </div>
        <dl className="wf-facts">
          <div><dt>현재 물량</dt><dd>{STATE_LABEL[current.state_key] || current.state_key} · {formatKg(current.mass_kg)}</dd></div>
          <div><dt>지금 담당</dt><dd>{name(lot.current_company_id)}{manage && ' (우리 기업)'}</dd></div>
          <div><dt>처음 배출</dt><dd>{name(lot.owner_company_id)}</dd></div>
          {current.purity_percent != null && <div><dt>순도</dt><dd>{current.purity_percent}%</dd></div>}
        </dl>
        <p className="wf-muted">상태 설명: {current.condition}</p>
        {lot.data.warnings?.length > 0 && (
          <ul className="wf-warnings">
            {lot.data.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
      </section>

      {error && <p className="wf-alert" role="alert">{error}</p>}

      {lot.status === 'review_required' && (
        <p className="wf-alert">기록한 산출물이 예상한 형태와 달라 다음 단계를 보류했어요. 담당자 확인이 필요해요.</p>
      )}

      {/* 지금 물량을 가진 기업: 사진 → 업체 검토 → 인수 요청, 또는 완료 */}
      {manage && ['ready', 'processed'].includes(lot.status) && (
        <>
          <PhotoSection lot={lot} photos={stagePhotos} busy={busy} onAdd={(file) => run('photo', () => workflowApi.addPhoto(lot.id, file))} />
          <CandidateSection
            lot={lot}
            busy={busy}
            onReview={() => run('review', () => workflowApi.reviewCandidates(lot))}
            onOffer={(key) => run('offer', () => workflowApi.sendOffer(lot, key))}
          />
          {canFinish && <FinishForm busy={busy} onFinish={(v) => run('finish', () => workflowApi.finish(lot, v))} />}
        </>
      )}

      {pendingOffer && (
        <OfferCard lot={lot} offer={pendingOffer} name={name}>
          {pendingOffer.can_decide ? (
            <DecisionForm busy={busy} onDecide={(v) => run('decide', () => workflowApi.decide(lot, pendingOffer.id, v))} />
          ) : (
            <p className="wf-muted">{name(pendingOffer.recipient_id)}의 응답을 기다리고 있어요.</p>
          )}
        </OfferCard>
      )}

      {acceptedOffer && (
        <OfferCard lot={lot} offer={acceptedOffer} name={name}>
          {acceptedOffer.can_issue_qr && <QrIssue lot={lot} offer={acceptedOffer} busy={busy} run={run} />}
          {acceptedOffer.can_receive && (
            <p className="wf-muted">물량이 도착하면 발송 기업이 준 입고 QR을 휴대전화로 스캔해 입고를 확인해 주세요.</p>
          )}
        </OfferCard>
      )}

      {manage && lot.status === 'processing' && (
        <OutputForm current={current} busy={busy} onSubmit={(v) => run('output', () => workflowApi.recordOutput(lot, v))} />
      )}

      <History lot={lot} name={name} />
    </div>
  );
}

function PhotoSection({ lot, photos, busy, onAdd }) {
  return (
    <section className="wf-card">
      <h3>현재 물량 사진 ({photos.length}/4)</h3>
      <p className="wf-muted">사진과 상태 설명은 업체 검토를 위해 AI(Azure)로 전달돼요. JPEG·PNG·WebP, 3MB 이하.</p>
      <div className="wf-photos">
        {photos.map((p) => (
          <img key={p.id} src={workflowApi.photoUrl(p)} alt="현재 물량 사진" loading="lazy" />
        ))}
      </div>
      {photos.length < 4 && (
        <label className="button button-quiet button-small wf-file">
          {busy === 'photo' ? '올리는 중…' : '사진 추가'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!!busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onAdd(file);
            }}
          />
        </label>
      )}
      {lot.review && <p className="wf-muted">사진을 바꾸면 업체 검토를 다시 해야 해요.</p>}
    </section>
  );
}

function CandidateSection({ lot, busy, onReview, onOffer }) {
  const review = lot.review;
  const next = review?.next_step;
  const sendable = (facility, result) =>
    facility.recipient &&
    ['reviewed', 'needs_evidence'].includes(result?.status) &&
    result?.finding !== 'restriction_mentioned' &&
    result?.lot_review?.status === 'reviewed';
  return (
    <section className="wf-card">
      <h3>다음 처리 업체</h3>
      {!review && <p className="wf-muted">현재 물량·사진으로 다음 공정 후보 업체를 모두 검토해요. 1~2분 걸릴 수 있어요.</p>}
      <button className="button button-primary" type="button" onClick={onReview} disabled={!!busy}>
        {busy === 'review' ? '업체를 검토하는 중…' : review ? '다시 검토' : '업체 검토 시작'}
      </button>
      {review && <p className="wf-muted">검토 {formatDateTime(review.at)} · {next?.message}</p>}
      {next?.options?.map((option) => (
        <ProcessOption
          key={option.transition_key}
          option={option}
          reviews={review.results}
          renderAction={(facility, result) =>
            sendable(facility, result) ? (
              <button className="button button-quiet button-small" type="button" disabled={!!busy}
                onClick={() => onOffer(facility.capability_key)}>
                {facility.recipient.name}에 인수 요청 보내기
              </button>
            ) : result?.status === 'model_unavailable' || result?.lot_review?.status === 'model_unavailable' ? (
              <p className="wf-muted">AI 검토가 끝나지 않아 요청을 보낼 수 없어요. 다시 검토해 주세요.</p>
            ) : null
          }
        />
      ))}
    </section>
  );
}

function OfferCard({ lot, offer, name, children }) {
  const data = offer.data;
  const photos = lot.photos.filter((p) => data.photo_ids?.includes(p.id));
  return (
    <section className="wf-card wf-offer">
      <h3>
        인수 요청 · {data.facility?.label} <span className="wf-chip">{OFFER_STATUS[offer.status] || offer.status}</span>
      </h3>
      <p className="wf-muted">
        {name(offer.sender_id)} → {name(offer.recipient_id)} · {data.option?.label}
        {data.synthetic && ' · 로컬 시험용 계정'}
      </p>
      <p>
        보낸 물량: {STATE_LABEL[data.current?.state_key] || data.current?.state_key} {formatKg(data.current?.mass_kg)} · {data.current?.condition}
      </p>
      {photos.length > 0 && (
        <div className="wf-photos">
          {photos.map((p) => <img key={p.id} src={workflowApi.photoUrl(p)} alt="보낸 물량 사진" loading="lazy" />)}
        </div>
      )}
      {data.decision && <p className="wf-muted">응답 메모: {data.decision.note}</p>}
      {children}
    </section>
  );
}

function DecisionForm({ busy, onDecide }) {
  const [note, setNote] = useState('');
  const [scope, setScope] = useState(false);
  const [intake, setIntake] = useState(false);
  const ok = note.trim().length >= 3;
  return (
    <div className="wf-form">
      <label>
        메모 (수락·거절 이유)
        <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="wf-check"><input type="checkbox" checked={scope} onChange={(e) => setScope(e.target.checked)} /> 우리 허가 범위에 이 물량이 들어가는지 확인했어요</label>
      <label className="wf-check"><input type="checkbox" checked={intake} onChange={(e) => setIntake(e.target.checked)} /> 반입 규격(형태·상태·중량)을 확인했어요</label>
      <p className="wf-muted">수락은 이번 물량을 받는다는 업무상 응답이에요. 허가 검증을 대신하지 않아요.</p>
      <div className="wf-actions">
        <button className="button button-primary" type="button" disabled={!!busy || !ok || !scope || !intake}
          onClick={() => onDecide({ accept: true, note: note.trim(), scopeChecked: scope, intakeChecked: intake })}>수락</button>
        <button className="button button-quiet" type="button" disabled={!!busy || !ok}
          onClick={() => onDecide({ accept: false, note: note.trim(), scopeChecked: scope, intakeChecked: intake })}>거절</button>
      </div>
    </div>
  );
}

// 발송 기업: 입고 QR 발급. 토큰은 발급 응답에만 있으므로 이 화면을 닫으면 다시 발급해야 한다(이전 QR은 무효)
function QrIssue({ lot, offer, busy, run }) {
  const [qr, setQr] = useState(null);
  async function issue() {
    const result = await run('qr', () => workflowApi.issueQr(lot, offer.id));
    if (!result) return;
    const url = receiveUrl(lot.id, offer.id, result.token);
    const image = await QRCode.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: 'M' });
    setQr({ url, image });
    run('reload', () => workflowApi.getLot(lot.id));
  }
  return (
    <div className="wf-qr">
      {qr ? (
        <>
          <img src={qr.image} alt="입고 QR" width="240" height="240" />
          <p className="wf-muted">물량과 함께 보내 주세요. 7일 동안 유효하고, 다시 발급하면 이 QR은 쓸 수 없어요.</p>
          <div className="wf-actions">
            <button className="button button-quiet button-small" type="button" onClick={() => window.print()}>인쇄</button>
            <button className="button button-quiet button-small" type="button" onClick={() => navigator.clipboard?.writeText(qr.url)}>링크 복사</button>
          </div>
        </>
      ) : (
        <button className="button button-primary" type="button" disabled={!!busy} onClick={issue}>
          {busy === 'qr' ? '발급하는 중…' : '입고 QR 발급'}
        </button>
      )}
    </div>
  );
}

function OutputForm({ current, busy, onSubmit }) {
  const [state, setState] = useState('');
  const [mass, setMass] = useState('');
  const [purity, setPurity] = useState('');
  const [condition, setCondition] = useState('');
  const [evidence, setEvidence] = useState('');
  const ok = state && Number(mass) > 0 && condition.trim().length >= 3 && evidence.trim().length >= 3;
  return (
    <form className="wf-card wf-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        state_key: state,
        mass_kg: Number(mass),
        purity_percent: purity === '' ? null : Number(purity),
        condition: condition.trim(),
        evidence: evidence.trim(),
      });
    }}>
      <h3>처리 결과(실제 산출물) 기록</h3>
      <p className="wf-muted">입고 물량 {formatKg(current.mass_kg)}을 넘을 수 없어요.</p>
      <label>산출물 형태
        <select required value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">선택</option>
          {OUTPUT_STATES.map((key) => <option key={key} value={key}>{STATE_LABEL[key]}</option>)}
        </select>
      </label>
      <label>중량(kg)<input type="number" min="0.1" step="0.1" required value={mass} onChange={(e) => setMass(e.target.value)} /></label>
      <label>순도(%, 모르면 비움)<input type="number" min="0" max="100" step="0.1" value={purity} onChange={(e) => setPurity(e.target.value)} /></label>
      <label>상태 설명<textarea rows={2} maxLength={1500} value={condition} onChange={(e) => setCondition(e.target.value)} /></label>
      <label>근거(계량표·작업일지 번호 등)<input maxLength={300} value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
      <button className="button button-primary" type="submit" disabled={!!busy || !ok}>
        {busy === 'output' ? '기록하는 중…' : '처리 결과 기록'}
      </button>
    </form>
  );
}

function FinishForm({ busy, onFinish }) {
  const [reference, setReference] = useState('');
  const [use, setUse] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const ok = reference.trim().length >= 3 && use.trim().length >= 3 && confirmed;
  return (
    <form className="wf-card wf-form" onSubmit={(e) => {
      e.preventDefault();
      onFinish({ reference: reference.trim(), intendedUse: use.trim() });
    }}>
      <h3>재활용 완료</h3>
      <p className="wf-muted">펠렛·컴파운드 산출물까지 기록한 물량만 완료할 수 있어요.</p>
      <label>완료 근거(출고·판매 기록 번호 등)<input maxLength={300} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
      <label>용도<input maxLength={500} placeholder="예) 자동차 내장재 원료" value={use} onChange={(e) => setUse(e.target.value)} /></label>
      <label className="wf-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> 실제 산출물과 완료 근거를 확인했어요</label>
      <button className="button button-primary" type="submit" disabled={!!busy || !ok}>
        {busy === 'finish' ? '완료 처리 중…' : '완료'}
      </button>
    </form>
  );
}

function History({ lot, name }) {
  const events = [...(lot.data.events || [])].reverse();
  return (
    <section className="wf-card">
      <h3>인계 기록</h3>
      {lot.data.completed.length > 0 && (
        <ol className="wf-steps">
          {lot.data.completed.map((step, i) => (
            <li key={i}>
              <strong>{step.facility}</strong> · {STATE_LABEL[step.output.state_key] || step.output.state_key} {formatKg(step.output.mass_kg)}
              <span className="wf-muted"> (근거: {step.output.evidence})</span>
            </li>
          ))}
        </ol>
      )}
      {events.length ? (
        <ul className="wf-events">
          {events.map((e, i) => (
            <li key={i}>
              <span className="wf-muted">{formatDateTime(e.at)}</span> {e.action} · {name(e.company_id)}
              {e.facility && ` · ${e.facility}`}
              {e.note && <span className="wf-muted"> · {e.note}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="wf-muted">아직 기록이 없어요.</p>
      )}
    </section>
  );
}
