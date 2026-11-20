import { canRequestIntake, invalidReviewPhotos } from './review-policy.js';
import { ReviewOrb, reviewIsRunning } from './ReviewOrb.jsx';
import { PhotoConflict, PhotoConflictReceipt } from './PhotoConflict.jsx';
import { InquiryPacket } from './InquiryPacket.jsx';
import { SupplierPolicySummary, InquiryConversation } from './SupplierPolicy.jsx';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../hooks/useSession.js';
import QRCode from 'qrcode';
import { receiveUrl, workflowApi } from './api.js';
import { CandidateBrowser } from './CandidateBrowser.jsx';
import { QrPreview } from './QrPreview.jsx';
import { RecyclingTypes } from './RecyclingTypes.jsx';
import { RouteOutcome } from './RouteOutcome.jsx';
import { ConditionalResponse, DirectoryCandidates } from './IntakeConditions.jsx';
import { currentLotWarnings, validLocation } from './route-result.js';
import { startLotSync } from './lot-sync.js';
import {
  LOT_STATUS,
  lotStatusLabel,
  OFFER_STATUS,
  FINISH_STATES,
  OUTPUT_STATES,
  STATE_LABEL,
  formatDateTime,
  formatKg,
  stateLabel,
  lotMaterial,
  lotProgress,
} from './labels.js';

const ResourceMapbox = lazy(() => import('../../pages/map/ResourceMapbox.jsx').then((module) => ({ default: module.ResourceMapbox })));

// 처리 건(로트) 하나. 지금 물량을 가진 기업(can_manage)과 요청받은 기업이 각자 할 일을 본다.
// 모든 변경은 revision을 함께 보내고, 다른 화면에서 바뀌었으면(409) 새로 불러온다.
export function LotPanel({ lotId, initialLot = null, showRecycling = true, view = 'progress', onLotChange }) {
  const [lot, setLot] = useState(initialLot);
  const [error, setError] = useState('');
  const [action, setBusy] = useState('');
  const reviewRunning = reviewIsRunning(lot);
  const busy = action || (reviewRunning ? 'review' : '');
  const actionVersion = useRef(0);
  const actionBusy = useRef(false);
  const lastSnapshot = useRef(initialLot ? JSON.stringify(initialLot) : '');
  const me = useSession().company?.id;

  const applyLot = useCallback((next) => {
    const snapshot = JSON.stringify(next);
    if (snapshot === lastSnapshot.current) return;
    lastSnapshot.current = snapshot;
    setLot(next);
    onLotChange?.(next);
  }, [onLotChange]);

  const reload = useCallback(() => {
    setError('');
    return workflowApi.getLot(lotId).then(applyLot).catch((e) => setError(e.message));
  }, [lotId, applyLot]);

  useEffect(() => {
    if (!initialLot) reload();
  }, [initialLot, reload]);

  useEffect(() => startLotSync({
    read: () => workflowApi.getLot(lotId),
    canRefresh: () => !actionBusy.current,
    version: () => actionVersion.current,
    apply: applyLot,
  }), [lotId, applyLot]);

  useEffect(() => {
    if (!reviewRunning) return;
    let live = true;
    let timer;
    async function poll() {
      try {
        const next = await workflowApi.getLot(lotId);
        if (live) applyLot(next);
      } catch { /* A temporary fetch error does not discard the saved server job. */ }
      if (live) timer = setTimeout(poll, 1200);
    }
    timer = setTimeout(poll, 500);
    return () => { live = false; clearTimeout(timer); };
  }, [lotId, reviewRunning, applyLot]);

  // 서버 호출 공통: 잠금, 오류 문구, 충돌이면 새로 불러오기
  async function run(label, call) {
    actionBusy.current = true;
    actionVersion.current += 1;
    setBusy(label);
    setError('');
    try {
      const next = await call();
      if (next?.id && next?.revision) applyLot(next);
      return next;
    } catch (e) {
      setError(e.message);
      if (e.status === 409) {
        // Keep the conflict reason visible while updating the revision.
        try {
          const next = await workflowApi.getLot(lotId);
          applyLot(next);
        } catch { /* Preserve the original action error. */ }
      }
      return null;
    } finally {
      actionBusy.current = false;
      setBusy('');
    }
  }

  if (!lot) return error ? <p className="wf-alert" role="alert">{error}</p> : <p className="wf-muted">처리 건을 불러오는 중…</p>;

  const current = lot.data.current;
  const stage = lot.data.completed.length;
  const stagePhotos = lot.photos.filter((p) => p.stage === stage && p.active !== false);
  const pendingOffer = lot.offers.find((o) => ['pending', 'conditional'].includes(o.status));
  const acceptedOffer = lot.offers.find((o) => o.status === 'accepted');
  const name = (id) => lot.companies[id] || '알 수 없는 기업';
  const manage = lot.can_manage;
  const material = lotMaterial(lot);
  const diagnosisId = lot.diagnosis_id || lot.data.handoff?.case_id;
  const terminalStates = lot.terminal_states || FINISH_STATES[material] || [];
  const warnings = currentLotWarnings(lot.data.warnings, lot.review?.origin);

  const progress = lotProgress(lot, me);
  const summary = (
      <section className="wf-card wf-summary" aria-label="현재 처리 건 상태와 물량">
        <div className="wf-summary-head">
          <div><span className="wf-summary-eyebrow">처리 건 현황</span><h2><span className="wf-status" data-status={lot.status}>{lotStatusLabel(lot)}</span></h2></div>
          <button className="button button-quiet button-small" type="button" onClick={reload} disabled={!!busy}>
            새로고침
          </button>
        </div>
        <dl className="wf-facts">
          <div><dt>현재 물량</dt><dd>{stateLabel(lot, current.state_key)} · {formatKg(current.mass_kg)}</dd></div>
          <div><dt>지금 담당</dt><dd>{name(lot.current_company_id)}{manage && ' (우리 기업)'}</dd></div>
          <div><dt>처음 배출</dt><dd>{name(lot.owner_company_id)}</dd></div>
          {current.purity_percent != null && <div><dt>순도</dt><dd>{current.purity_percent}%</dd></div>}
        </dl>
        <p className="wf-muted">상태 설명: {current.condition}</p>
        {warnings.length > 0 && (
          <div className="wf-inline-checks"><strong>확인 사항</strong>
          <ul className="wf-warnings">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
          </div>
        )}
      </section>
  );
  const steps = (
    <>
      {lot.status === 'review_required' && (
        <p className="wf-alert">기록한 산출물이 예상한 형태와 달라 다음 단계를 보류했어요. 담당자 확인이 필요해요.</p>
      )}

      {manage && ['processed', 'stored'].includes(lot.status) && <ResultActionForm
        key={`${stage}:${current.state_key}:${current.next_action || ''}`} current={current}
        terminalStates={terminalStates} busy={busy}
        onSubmit={(decision) => run('output-action', () => workflowApi.outputAction(lot, decision))} />}

      {/* 완료 가능한 형태도 보유 기업이 후속 인계를 선택할 수 있다. */}
      {manage && (lot.status === 'ready' || (lot.status === 'processed' && current.next_action === 'forward')) && (
        <>
          <PhotoSection lot={lot} photos={stagePhotos} busy={busy} onAdd={(file, photoId = null) => run('photo', () => workflowApi.addPhoto(lot.id, file, photoId ? { photoId, revision: lot.revision } : null))} />
          <PhotoConflict key={`conflict-${lot.revision}-${lot.review?.at}`} lot={lot} busy={busy} onResolve={body => run('conflict', () => workflowApi.resolvePhotoConflict(lot, body))} />
          <CandidateSection
            key={`${stage}:${current.state_key}`}
            lot={lot}
            error={error}
            showRecycling={showRecycling}
            busy={busy}
            onReview={() => run('review', () => workflowApi.startCandidateReview(lot))}
            onOffer={(key) => run('offer', () => workflowApi.sendOffer(lot, key))}
            onAnswers={(key, answers) => run('answers', () => workflowApi.saveIntakeAnswers(lot, key, answers))}
            onDirectorySave={(transition, listing, cursor, answers) => run('directory', () => workflowApi.saveDirectoryInquiry(lot, transition, listing, cursor, answers))}
          />
        </>
      )}

      {pendingOffer && (
        <OfferCard lot={lot} offer={pendingOffer} name={name}>
          <SupplierPolicySummary value={pendingOffer.data.facility?.supplier_policy} />
          <InquiryConversation lot={lot} offer={pendingOffer} busy={!!busy}
            readOnly={![pendingOffer.sender_id, pendingOffer.recipient_id].includes(me)}
            onSend={(text) => run('message', () => workflowApi.replyInquiry(lot, pendingOffer.id, text))} />
          {pendingOffer.status === 'conditional' && <ConditionalResponse lot={lot} offer={pendingOffer} busy={!!busy}
            onRespond={(values) => run('conditions', () => workflowApi.respondConditions(lot, pendingOffer.id, values))} />}
          {pendingOffer.can_decide ? (
            <DecisionForm busy={busy} offer={pendingOffer}
              onConditions={(conditions, note) => run('conditions', () => workflowApi.setConditions(lot, pendingOffer.id, conditions, note))}
              onDecide={(v) => run('decide', () => workflowApi.decide(lot, pendingOffer.id, v))} />
          ) : (
            <p className="wf-muted">
              {name(pendingOffer.recipient_id)}의 응답을 기다리고 있어요.
              {pendingOffer.sender_id === me && ' 수락되면 여기서 입고 QR을 발급할 수 있어요. 응답은 자동으로 반영돼요.'}
            </p>
          )}
        </OfferCard>
      )}

      {acceptedOffer && (
        <OfferCard lot={lot} offer={acceptedOffer} name={name}>
          <InquiryConversation lot={lot} offer={acceptedOffer} readOnly />
          {acceptedOffer.can_dispatch && <div className="wf-qr"><p className="wf-muted">물량을 실제로 출발시킬 때 눌러 주세요. 인수 수락만으로 운송이 시작되지는 않아요.</p><button type="button" className="button button-primary wf-qr-issue-button" disabled={!!busy} onClick={() => run('dispatch', () => workflowApi.dispatch(lot, acceptedOffer.id))}>운송 시작</button></div>}
          {acceptedOffer.data.dispatch && <p className="wf-muted">운송 중 · 도착 후 수신 기업이 QR로 입고를 확인해요.</p>}
          {acceptedOffer.can_issue_qr && <QrIssue lot={lot} offer={acceptedOffer} busy={busy} run={run} />}
          {acceptedOffer.can_receive && (
            <p className="wf-muted">물량이 도착하면 발송 기업이 준 입고 QR을 휴대전화로 스캔해 입고를 확인해 주세요.</p>
          )}
        </OfferCard>
      )}

      {manage && lot.status === 'processing' && (
        <OutputForm material={material} current={current} outputStates={lot.output_states} terminalStates={terminalStates} busy={busy} onSubmit={(v) => run('output', () => workflowApi.recordOutput(lot, v))} />
      )}

    </>
  );

  if (view === 'info') return (
    <div className="wf-panel">
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {lot.status === 'completed' && <CompletedCard lot={lot} name={name} />}
      {summary}
      <section className="wf-evidence-panel" aria-label="최초 폐기물의 법령표 근거">
        <div className="wf-evidence-panel-head"><div><span>최초 분류 기준</span><h3>재활용 유형과 법령 근거</h3></div><strong>{lot.data.handoff?.waste_code || '분류번호 미정'}</strong></div>
        <RecyclingTypes assessment={lot.data.recycling} compact />
        {!lot.data.recycling && <p className="wf-evidence-alert">이 처리 건에 연결된 재활용 유형표 정보가 없어요. 최초 문진의 판정 기록을 확인해 주세요.</p>}
        {lot.data.completed.length > 0 && <RecyclingTypes followUp />}
        {diagnosisId && <div className="route-info-links"><a href={`/wastes/case-${diagnosisId}/survey`}>문진 대화</a><a href={`/wastes/case-${diagnosisId}/history`}>판정 기록</a></div>}
      </section>
      <LotChecks lot={lot} name={name} warnings={warnings} />
    </div>
  );

  if (lot.status === 'ready') return <div className="wf-panel">
    {error && <p className="wf-alert" role="alert">{error}</p>}
    {summary}
    {steps}
  </div>;

  return (
    <div className="wf-panel">
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {progress.kind === 'active' ? (
        <>
          <ProgressStatus lot={lot} name={name} />
          {summary}
          <div className="wf-tracking-layout"><History lot={lot} name={name} /><HandoffMap lot={lot} /></div>
          {steps}
        </>
      ) : (
        <>
          <ProgressStatus lot={lot} name={name} />
          {summary}
          <div className="wf-tracking-layout"><History lot={lot} name={name} /><HandoffMap lot={lot} /></div>
        </>
      )}
    </div>
  );
}

// 우리 기업이 다음 업체에 실물을 넘겼다(받는 쪽 QR 입고 확인). 우리 몫은 끝났고 이후는 추적만 한다
function HandedOffCard({ lot, offer, name, onReload, busy }) {
  const received = lot.data.events?.find((e) => e.action === 'QR 입고 확인' && e.company_id === offer.recipient_id);
  const sent = offer.data.current;
  return (
    <section className="wf-card wf-done">
      <div className="wf-summary-head">
        <span className="wf-status" data-status="handed_off">전달 완료</span>
        <button className="button button-quiet button-small" type="button" onClick={onReload} disabled={!!busy}>새로고침</button>
      </div>
      <h3>{offer.data.facility?.label}에 전달했어요</h3>
      <dl className="wf-facts">
        <div><dt>받은 기업</dt><dd>{name(offer.recipient_id)}</dd></div>
        <div><dt>입고 확인</dt><dd>{received ? formatDateTime(received.at) : '-'}</dd></div>
        <div><dt>전달 물량</dt><dd>{stateLabel(lot, sent?.state_key)} · {formatKg(sent?.mass_kg)}</dd></div>
        <div><dt>지금 진행</dt><dd>{name(lot.current_company_id)} · {LOT_STATUS[lot.status] || lot.status}</dd></div>
      </dl>
      <p className="wf-muted">우리 기업이 할 일은 끝났어요. 최종 처리까지는 아래에서 확인할 수 있어요.</p>
    </section>
  );
}

function CompletedCard({ lot, name }) {
  const finished = [...(lot.data.events || [])].reverse().find((e) => e.action === '처리 완료 확인');
  const current = lot.data.current;
  return (
    <section className="wf-card wf-done">
      <div className="wf-summary-head">
        <span className="wf-status" data-status="completed">재활용 완료</span>
      </div>
      <h3>{stateLabel(lot, current.state_key)} {formatKg(current.mass_kg)}로 재활용됐어요</h3>
      <dl className="wf-facts">
        <div><dt>완료 업체</dt><dd>{name(lot.current_company_id)}</dd></div>
        <div><dt>완료 일시</dt><dd>{finished ? formatDateTime(finished.at) : '-'}</dd></div>
        <div><dt>용도</dt><dd>{finished?.intended_use || '-'}</dd></div>
        <div><dt>완료 근거</dt><dd>{finished?.reference || '-'}</dd></div>
      </dl>
      <p className="wf-muted">처리 단계 {lot.data.completed.length}개 · 처음 배출 {name(lot.owner_company_id)}</p>
    </section>
  );
}

function PhotoSection({ lot, photos, busy, onAdd }) {
  return (
    <section className="wf-card">
      <h3>현재 물량 사진 ({photos.length}/4)</h3>
      <p className="wf-muted">사진과 상태 설명은 업체 검토를 위해 AI(Azure)로 전달돼요. JPEG·PNG·WebP, 3MB 이하.</p>
      <div className="wf-photos">
        {photos.map((p, index) => (
          <div key={p.id}>
            <img src={workflowApi.photoUrl(p)} alt={`현재 물량 사진 ${index + 1}`} loading="lazy" />
            <label className="button button-quiet button-small wf-file">사진 {index + 1} 교체
              <input type="file" aria-label={`사진 ${index + 1} 교체`} accept="image/jpeg,image/png,image/webp" disabled={!!busy}
                onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onAdd(file, p.id); }} />
            </label>
          </div>
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

function CandidateSection({ lot, busy, error, onReview, onOffer, onAnswers, onDirectorySave, showRecycling }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const review = lot.review;
  if (invalidReviewPhotos(review).length || lot.photo_conflict_gate?.invalid_photos?.length) return null;
  const next = review?.next_step;
  const candidateKeys = [...new Set((next?.options || []).flatMap(o => (o.facilities || []).map(f => f.capability_key)))];
  const reviewedCount = candidateKeys.filter(key => {
    const r = review?.results?.[key];
    return ['reviewed', 'needs_evidence'].includes(r?.status) && r?.lot_review?.status === 'reviewed'
      && ['isolated_vision', 'no_photo'].includes(r?.lot_review?.observation_method);
  }).length;
  const sendable = (facility, result) => canRequestIntake(review, facility, result, lot.photo_conflict_gate);
  return (
    <section className="wf-card wf-candidate-section">
      <h3>{review ? '공정·업체 검토 결과' : '사진·상태로 공정·업체 검토'}</h3>
      {showRecycling && <RecyclingTypes assessment={lot.data.recycling} followUp={lot.data.completed.length > 0} />}
      {!review && <p className="wf-muted">분류번호·재질·현재 형태로 찾은 후보를 사진·상태 설명 및 업체 공개 근거와 대조해요. 검토가 끝난 뒤 보낼 업체를 선택하세요. 사진이 없으면 상태 설명만 검토하며 사진으로 확인한 것처럼 판단하지 않아요.</p>}
      <button className="button button-primary" type="button" onClick={onReview} disabled={!!busy}>
        {busy === 'review' ? '업체를 검토하는 중…' : review ? '다시 검토' : 'AI 검토하고 후보 보기'}
      </button>
      {busy === 'review' && <ReviewOrb key={reviewIsRunning(lot) ? lot.review_progress.id : 'starting'}
        progress={reviewIsRunning(lot) ? lot.review_progress : null} />}
      {['failed', 'interrupted'].includes(lot.review_progress?.status) && busy !== 'review'
        && <p className="wf-alert" role="alert">{lot.review_progress.message || '검토가 중단됐어요. 완료된 결과를 유지하고 다시 시도할 수 있어요.'}</p>}
      {error && busy !== 'review' && <p className="wf-alert" role="alert">검토 결과를 받지 못했어요. {error}</p>}
      {review && (review.analysis_version !== 'isolated-vision-v2' || !review.recycling_checksum) && <p role="status">이전 방식의 검토예요. 인수 요청 전에 다시 검토해 주세요.</p>}
      {review && <p className="wf-muted">검토 {formatDateTime(review.at)} · {next?.message}</p>}
      {review?.selection && <p className="wf-muted" role="status">
        취급 소재가 맞는 업체를 도로거리순으로 최대 5곳 보여드려요. 현재 {review.selection.selected_keys.length}곳이에요.
        {' '}사진·물량을 보내면 업체가 대화에서 세부 조건을 확인하고 수락해요.
      </p>}
      {review?.selection?.unavailable_keys?.length > 0 && <p className="wf-muted">
        일부 업체의 공정 검토가 미완료예요. 미완료 업체를 부적합으로 판단하지 않아요.
      </p>}
      {review && candidateKeys.length > 0 && <p className={reviewedCount < candidateKeys.length ? 'wf-alert' : 'wf-muted'} role="status">
        공정·업체 조합 {candidateKeys.length}건 중 {reviewedCount}건 검토 완료.
        {reviewedCount < candidateKeys.length ? ` ${candidateKeys.length - reviewedCount}건은 미완료예요. 다시 검토하면 같은 조건에서 완료된 결과를 유지하고 미완료 후보만 재시도해요.` : ' 실제 반입은 수신 기업이 확인해요.'}
      </p>}
      {review && <RouteOutcome next={next} currentLabel={stateLabel(lot, lot.data?.current?.state_key)} code={lot.data?.handoff?.waste_code} />}
      {review?.selection?.other_options?.length > 0 && <details className="wf-more">
        <summary>추가 확인·미검토 업체 보기</summary>
        <p className="wf-muted">뒤 후보는 보존돼요. 미검토·거리 미확인은 부적합 판정이 아니에요.</p>
        <ul>{review.selection.other_options.flatMap(option => option.facilities.map(facility => {
          const key = facility.capability_key;
          const s = review.selection;
          const label = s.distance_unknown_keys.includes(key) ? '도로거리 미확인'
            : s.restricted_keys.includes(key) ? '공개 자료에서 반입 제한 확인'
            : s.mismatch_keys?.includes(key) ? '재질·공정 불일치'
            : s.needs_evidence_keys.includes(key) ? '공정 연결 자료 추가 조사 대상'
            : s.unavailable_keys.includes(key) ? 'AI 검토 미완료' : '이번 조회에서 미검토';
          return <li key={key}><strong>{facility.label}</strong> · {label}
            {facility.road_distance_status === 'available' && ` · 도로 ${facility.road_distance_km.toFixed(1)}km`}</li>;
        }))}</ul>
      </details>}
      {next?.options && (
        <CandidateBrowser
          key={lot.data.current.state_key}
          options={next.options}
          origin={review.origin}
          originLabel={review.origin_label}
          reviews={review.results}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          renderAction={(facility, result) => <>
            <SupplierPolicySummary value={facility.supplier_policy} />
            <InquiryPacket lot={lot} facility={facility} busy={!!busy} />
            {sendable(facility, result) ? (
              <button className="button button-quiet button-small" type="button" disabled={!!busy}
                onClick={() => onOffer(facility.capability_key)}>
                {facility.recipient.name}에 인수 요청 보내기
              </button>
            ) : lot.photo_conflict_gate?.blocked ? (
              <p className="wf-alert">사진·설명 불일치 확인 전이라 인수 요청을 보류했어요. 위 확인 영역에서 수정하거나 확인 사유를 남겨 주세요.</p>
            ) : result?.status === 'model_unavailable' || result?.lot_review?.status === 'model_unavailable' ? (
              <p className="wf-muted">AI 검토가 끝나지 않아 요청을 보낼 수 없어요. 다시 검토해 주세요.</p>
            ) : <p className="wf-muted">{!facility.recipient ? '업체의 수신 계정 연결 후 인수 요청을 보낼 수 있어요.' : result?.finding === 'restriction_mentioned' ? '반입 제한이 확인되어 요청을 보낼 수 없어요.' : '공정·물량 검토를 완료해 주세요.'}</p>}</>}
          renderExtra={(option) => <DirectoryCandidates lot={lot} transitionKey={option.transition_key} onSave={(listing, cursor, answers) => onDirectorySave(option.transition_key, listing, cursor, answers)} />}
        />
      )}
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
        {data.synthetic && ' · 시연용 계정'}
      </p>
      <p>
        보낸 물량: {stateLabel(lot, data.current?.state_key)} {formatKg(data.current?.mass_kg)} · {data.current?.condition}
      </p>
      {photos.length > 0 && (
        <div className="wf-photos">
          {photos.map((p) => <img key={p.id} src={workflowApi.photoUrl(p)} alt="보낸 물량 사진" loading="lazy" />)}
        </div>
      )}
      {data.decision && <p className="wf-muted">응답 메모: {data.decision.note}</p>}
      <PhotoConflictReceipt value={data.photo_conflict_resolution} />
      {children}
    </section>
  );
}

function DecisionForm({ busy, onDecide, onConditions, offer }) {
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const requiredChecks = offer?.data.facility?.supplier_policy?.policy?.required_checks || [];
  const [conditionsText, setConditionsText] = useState(requiredChecks.join('\n'));
  const [resolved, setResolved] = useState([]);
  const conditions = offer?.data.conditions || [];
  const conditionsReady = (!requiredChecks.length || conditions.length > 0) && conditions.every(c => resolved.includes(c.id) && offer.data.condition_responses?.[c.id]?.text);
  const ok = note.trim().length >= 3;
  return (
    <div className="wf-form">
      <label>
        메모 (수락·거절 이유)
        <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="wf-muted">사진·물량과 대화를 확인하고, 필요한 조건은 메시지로 협의해 주세요.</p>
      <label className="wf-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> 우리 사업장의 처리 범위와 이번 물량의 반입조건을 확인했어요</label>
      {conditions.map(c => <label className="wf-check" key={c.id}><input type="checkbox" checked={resolved.includes(c.id)} disabled={!offer.data.condition_responses?.[c.id]?.text}
        onChange={e => setResolved(e.target.checked ? [...resolved, c.id] : resolved.filter(id => id !== c.id))} />제출 자료로 확인했어요: {c.text}</label>)}
      {offer?.status === 'pending' && <label>추가 반입조건 (한 줄에 하나씩, 최대 12개)
        <textarea rows={3} maxLength={4000} placeholder="예: 오염물 제거 후 사진과 샘플 검사번호를 제출해 주세요." value={conditionsText} onChange={e => setConditionsText(e.target.value)} />
      </label>}
      <div className="wf-actions">
        <button className="button button-primary" type="button" disabled={!!busy || !ok || !confirmed || !conditionsReady}
          onClick={() => onDecide({ accept: true, note: note.trim(), scopeChecked: confirmed, intakeChecked: confirmed, resolvedConditionIds: resolved })}>{conditions.length ? '조건 확인 후 최종 수락' : '수락'}</button>
        {offer?.status === 'pending' && <button className="button button-quiet" disabled={!!busy || !ok || conditionsText.trim().length < 3}
          onClick={() => onConditions(conditionsText.split('\n').map(s => s.trim()).filter(Boolean), note.trim())}>조건부 수락</button>}
        <button className="button button-quiet" type="button" disabled={!!busy || !ok}
          onClick={() => onDecide({ accept: false, note: note.trim(), scopeChecked: confirmed, intakeChecked: confirmed })}>거절</button>
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
          <QrPreview image={qr.image} url={qr.url} label="입고 QR" description="수신 기업이 실물을 받은 뒤 스캔해 입고를 확인하는 QR이에요. 7일 동안 유효합니다." />
          <p className="wf-muted">물량과 함께 보내 주세요. 7일 동안 유효하고, 다시 발급하면 이 QR은 쓸 수 없어요.</p>
          <div className="wf-actions">
            <button className="button button-quiet button-small" type="button" onClick={() => window.print()}>인쇄</button>
            <button className="button button-quiet button-small" type="button" onClick={() => navigator.clipboard?.writeText(qr.url)}>링크 복사</button>
          </div>
        </>
      ) : (
        <button className="button button-primary wf-qr-issue-button" type="button" disabled={!!busy} onClick={issue}>
          {busy === 'qr' ? '발급하는 중…' : '입고 QR 발급'}
        </button>
      )}
    </div>
  );
}

function ProcessingDecision({ stateKey, terminalStates, action, setAction, use, setUse, confirmed, setConfirmed }) {
  const canComplete = terminalStates.includes(stateKey);
  return <>
    <label>다음 진행<select required value={action} onChange={(e) => setAction(e.target.value)}>
      <option value="">선택</option>
      <option value="complete" disabled={!canComplete}>완료</option>
      <option value="forward">추가 가공</option>
      <option value="hold">보관 중</option>
    </select></label>
    {!canComplete && stateKey && <p className="wf-muted">이 산출물은 추가 가공 또는 보관 중으로 기록할 수 있어요.</p>}
    {action === 'complete' && <>
      <label>산출물 용도<input maxLength={500} value={use} onChange={(e) => setUse(e.target.value)} /></label>
      <label className="wf-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> 처리 결과와 이번 처리 건의 완료를 확인했어요</label>
    </>}
  </>;
}

function ResultActionForm({ current, terminalStates, busy, onSubmit }) {
  const [action, setAction] = useState(current.next_action || '');
  const [use, setUse] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const canSave = action && action !== current.next_action && (action !== 'complete' ||
    (terminalStates.includes(current.state_key) && use.trim().length >= 3 && confirmed));
  return <form className="wf-card wf-form" onSubmit={(event) => {
    event.preventDefault();
    if (!canSave) return;
    onSubmit({ next_action: action, ...(action === 'complete' ? {
      completion_reference: current.evidence, intended_use: use.trim(), completion_confirmed: confirmed,
    } : {}) });
  }}>
    <h3>처리 결과·다음 진행</h3>
    <p className="wf-muted">산출물 기록은 유지하고 다음 진행만 바꿀 수 있어요.</p>
    <ProcessingDecision stateKey={current.state_key} terminalStates={terminalStates} action={action} setAction={setAction}
      use={use} setUse={setUse} confirmed={confirmed} setConfirmed={setConfirmed} />
    <button type="submit" className="button button-quiet" disabled={!!busy || !canSave}>진행 방향 저장</button>
  </form>;
}

function OutputForm({ material, current, outputStates, terminalStates, busy, onSubmit }) {
  const [state, setState] = useState('');
  const [mass, setMass] = useState('');
  const [purity, setPurity] = useState('');
  const [purityBadInput, setPurityBadInput] = useState(false);
  const [condition, setCondition] = useState('');
  const [evidence, setEvidence] = useState('');
  const [action, setAction] = useState('');
  const [use, setUse] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const errorRef = useRef(null);
  const issues = [
    !state && '산출물 형태를 선택해 주세요.',
    !(Number(mass) > 0 && Number(mass) <= Number(current.mass_kg)) && `중량은 0kg보다 크고 입고 물량 ${formatKg(current.mass_kg)} 이하여야 해요.`,
    (purityBadInput || (purity !== '' && !(Number(purity) >= 0 && Number(purity) <= 100))) && '순도는 0~100 사이 숫자로 적거나, 모르면 비워 주세요.',
    condition.trim().length < 3 && '상태 설명을 3자 이상 적어 주세요.',
    evidence.trim().length < 3 && '계량표·작업일지 번호 등 근거를 3자 이상 적어 주세요.',
    !action && '완료·추가 가공·보관 중에서 다음 진행을 선택해 주세요.',
    action === 'complete' && !terminalStates.includes(state) && '현재 산출물은 완료 가능한 형태가 아닙니다.',
    action === 'complete' && (use.trim().length < 3 || !confirmed) && '산출물 용도와 완료 확인이 필요해요.',
  ].filter(Boolean);
  return (
    <form className="wf-card wf-form" noValidate onSubmit={(e) => {
      e.preventDefault();
      setAttempted(true);
      if (issues.length) { requestAnimationFrame(() => errorRef.current?.focus()); return; }
      onSubmit({
        state_key: state,
        mass_kg: Number(mass),
        purity_percent: purity === '' ? null : Number(purity),
        condition: condition.trim(),
        evidence: evidence.trim(),
        next_action: action,
        ...(action === 'complete' ? { completion_reference: evidence.trim(), intended_use: use.trim(), completion_confirmed: confirmed } : {}),
      });
    }}>
      <h3>처리 결과(실제 산출물) 기록</h3>
      <p className="wf-muted">입고 물량 {formatKg(current.mass_kg)}을 넘을 수 없어요.</p>
      <p className="wf-muted">상태 설명과 근거는 각각 3자 이상 적어 주세요. 순도를 모르면 비워 두면 됩니다.</p>
      {attempted && issues.length > 0 && <div ref={errorRef} className="wf-form-errors" role="alert" tabIndex={-1}><strong>기록하기 전에 확인해 주세요</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
      <label>산출물 형태
        <select required value={state} onChange={(e) => {
          setState(e.target.value);
          if (action === 'complete' && !terminalStates.includes(e.target.value)) setAction('');
        }}>
          <option value="">선택</option>
          {(outputStates || (OUTPUT_STATES[material] || []).map(key => ({ key, label: STATE_LABEL[key] }))).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      <label>중량(kg)<input type="number" min="0" step="any" required value={mass} onChange={(e) => setMass(e.target.value)} /></label>
      <label>순도(%, 모르면 비움)<input type="number" min="0" max="100" step="any" value={purity} onChange={(e) => { setPurity(e.target.value); setPurityBadInput(e.target.validity.badInput); }} /></label>
      <label>상태 설명<textarea rows={2} maxLength={1500} value={condition} onChange={(e) => setCondition(e.target.value)} /></label>
      <label>근거(계량표·작업일지 번호 등)<input maxLength={300} value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
      <ProcessingDecision stateKey={state} terminalStates={terminalStates} action={action} setAction={setAction}
        use={use} setUse={setUse} confirmed={confirmed} setConfirmed={setConfirmed} />
      <button className="button button-primary" type="submit" disabled={!!busy}>
        {busy === 'output' ? '기록하는 중…' : '처리 결과 기록'}
      </button>
    </form>
  );
}

function History({ lot, name }) {
  const events = [...(lot.data.events || [])].reverse();
  return (
    <section className="wf-history" aria-labelledby="wf-history-title">
      <header className="wf-history-heading">
        <div><span>HANDOFF STATUS</span><h3 id="wf-history-title">인계 기록</h3><p>처리 건의 진행 상황과 기업별 확인 내역을 시간순으로 확인하세요.</p></div>
        <strong>{events.length}건 기록</strong>
      </header>
      {events.length ? (
        <ol className="wf-history-timeline">
          {events.map((e, i) => (
            <li key={`${e.at}-${e.action}-${i}`} className={i === 0 ? 'is-done is-current' : 'is-done'}>
              <span className="wf-history-marker" aria-hidden="true">✓</span>
              <div className="wf-history-entry">
                <div className="wf-history-entry-top"><strong>{e.action}</strong>{i === 0 && <span>최근 단계</span>}</div>
                <p>{name(e.company_id)}{e.facility && ` · ${e.facility}`}</p>
                {e.note && <p>{e.note}</p>}
                <time>{formatDateTime(e.at)}</time>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="wf-history-empty">아직 기록이 없어요.</p>}
    </section>
  );
}

function LotChecks({ lot, name, warnings }) {
  const offersWithConditions = lot.offers.filter((offer) => offer.data.conditions?.length);
  return <section className="wf-evidence-panel wf-lot-checks" aria-label="현재 처리 건 확인 사항">
    <div className="wf-evidence-panel-head"><div><span>물량 · 인계 확인</span><h3>현재 물량 확인 사항</h3></div><strong>{warnings.length}건 확인 필요</strong></div>
    <div className="wf-current-condition"><span>현재 상태 설명</span><p>{lot.data.current.condition || '설명 없음'}</p></div>
    {lot.offers.filter(offer => offer.data.messages?.length || offer.data.facility?.supplier_policy).map(offer =>
      <details className="wf-evidence-accordion" key={`inquiry-${offer.id}`}>
        <summary>{name(offer.recipient_id)} · 문의 당시 반입조건과 대화</summary>
        <SupplierPolicySummary value={offer.data.facility?.supplier_policy} />
        <InquiryConversation lot={lot} offer={offer} readOnly />
      </details>
    )}
    {lot.offers.filter(offer => offer.data.photo_conflict_resolution).map(offer => <PhotoConflictReceipt key={offer.id} value={offer.data.photo_conflict_resolution} />)}
    {warnings.length > 0 && <div className="wf-evidence-alert"><strong>먼저 확인할 사항</strong><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    {offersWithConditions.map((offer) => <details className="wf-evidence-accordion" key={offer.id}>
      <summary><span><strong>{name(offer.recipient_id)} 반입 조건</strong><small>{OFFER_STATUS[offer.status] || offer.status} · {offer.data.conditions.length}건</small></span><span className="wf-disclosure-arrow" aria-hidden="true">⌄</span></summary>
      <div className="wf-evidence-accordion-body"><p className="wf-muted">{OFFER_STATUS[offer.status] || offer.status} · {offer.data.decision?.note}</p>
        <dl className="wf-check-table">{offer.data.conditions.map((condition) => <div key={condition.id}>
          <dt>{condition.text}</dt><dd>{offer.data.condition_responses?.[condition.id]?.text || '미제출'}</dd>
          <dd className="wf-check-state">{offer.data.decision?.resolved_condition_ids?.includes(condition.id) ? '수신기업 확인 완료' : '수신기업 확인 전'}</dd>
        </div>)}</dl>
      </div>
    </details>)}
    {lot.data.completed.length > 0 && <details className="wf-evidence-accordion"><summary><span><strong>완료된 공정</strong><small>{lot.data.completed.length}건 · 산출물과 근거</small></span><span className="wf-disclosure-arrow" aria-hidden="true">⌄</span></summary><div className="wf-evidence-accordion-body"><ol className="wf-steps">
      {lot.data.completed.map((step, index) => <li key={index}><strong>{step.facility}</strong> · {stateLabel(lot, step.output.state_key)} {formatKg(step.output.mass_kg)} <span className="wf-muted">(근거: {step.output.evidence})</span></li>)}
    </ol></div></details>}
  </section>;
}

function ProgressStatus({ lot, name }) {
  const stages = ['처리 건 등록', '업체 인수 요청', '입고 확인', '처리 진행', '처리 완료'];
  const current = lot.status === 'completed' ? 4
    : ['processing', 'processed', 'stored', 'review_required'].includes(lot.status) ? 3
      : lot.status === 'accepted' ? 2
        : ['offered', 'conditional'].includes(lot.status) ? 1 : 0;
  const company = name(lot.current_company_id);
  const awaitingRecipient = lot.offers.find((offer) => offer.status === 'accepted');
  const currentOffer = [...lot.offers].reverse().find((offer) => offer.recipient_id === lot.current_company_id && ['received', 'processed'].includes(offer.status));
  const site = currentOffer?.data?.facility?.label || company;
  const message = lot.status === 'processing' ? `${site}에서 처리 중이에요`
    : lot.status === 'completed' ? `${site}에서 처리를 완료했어요`
      : lot.status === 'processed' ? `${site}에서 처리 결과를 기록했어요`
        : lot.status === 'stored' ? `${site}에서 산출물을 보관 중이에요`
        : lot.status === 'accepted' ? (awaitingRecipient?.data?.dispatch
          ? `${name(awaitingRecipient.recipient_id)}으로 운송 중이에요`
          : `${awaitingRecipient ? name(awaitingRecipient.recipient_id) : '수신 기업'}의 입고를 기다리고 있어요`)
          : lot.status === 'offered' || lot.status === 'conditional' ? '업체의 인수 확인을 기다리고 있어요'
            : `${company}에서 다음 인계를 준비하고 있어요`;
  return <section className="wf-progress-status" aria-label="현재 인계 현황">
    <span>현재 진행 상황</span><h2>{message}</h2>
    <p>현재 담당 · {company}{site !== company && ` · ${site}`}</p>
    <ol>{stages.map((stage, index) => <li key={stage} className={index === current ? (lot.status === 'completed' ? 'is-done is-current' : 'is-current') : index < current ? 'is-done' : ''}>
      <span aria-hidden="true">{index < current || lot.status === 'completed' ? '✓' : String(index + 1).padStart(2, '0')}</span>{stage}
    </li>)}</ol>
  </section>;
}

function HandoffMap({ lot }) {
  const origin = lot.data.initial?.origin;
  const handoffs = lot.offers.filter((offer) => ['pending', 'conditional', 'accepted', 'received', 'processed'].includes(offer.status));
  const [road, setRoad] = useState(null);
  const routeKey = JSON.stringify(handoffs.map(offer => [offer.id, offer.status, !!offer.data.dispatch, offer.data.origin, offer.data.facility?.location]));
  useEffect(() => {
    let live = true;
    setRoad(null);
    if (handoffs.length) workflowApi.getRoadRoute(lot.id)
      .then(value => { if (live) setRoad(value); })
      .catch(() => { if (live) setRoad({ segments: [] }); });
    return () => { live = false; };
  }, [lot.id, routeKey]);
  const locations = handoffs.map((offer) => ({
    id: offer.id,
    name: offer.data.facility?.label || lot.companies[offer.recipient_id] || '처리 사업장',
    location: offer.data.facility?.region || '',
    point: offer.data.facility?.location,
  }));
  const factories = locations.filter((site) => validLocation(site.point)).map((site) => ({
    id: site.id, name: site.name, location: site.location,
    latitude: site.point.latitude, longitude: site.point.longitude,
  }));
  const segments = (road?.segments || []).filter(segment => segment.status === 'available');
  const routeLines = segments.filter(segment => segment.phase !== 'planned').map(segment => segment.coordinates);
  const plannedRouteLines = segments.filter(segment => segment.phase === 'planned').map(segment => segment.coordinates);
  const roadDistance = segments.reduce((sum, segment) => sum + segment.distance_km, 0);
  const providers = [...new Set(segments.map(segment => segment.provider === 'kakao' ? '카카오모빌리티' : 'OSRM'))].join(' · ');
  return <section className="wf-handoff-map" aria-label="인계 사업장 지도">
    <header><strong>인계 경로</strong><span>{plannedRouteLines.length ? '점선: 예정 경로 · 실선: 운송·입고 구간' : '운송·입고 사업장'}</span></header>
    <div className="wf-handoff-map-canvas"><Suspense fallback={<p>지도를 불러오는 중이에요.</p>}>
      <ResourceMapbox factories={factories} origin={validLocation(origin) ? { ...origin, label: '배출 사업장' } : null}
        routeLines={routeLines} plannedRouteLines={plannedRouteLines} label="인계 사업장과 조회된 자동차 도로 경로 지도" />
    </Suspense></div>
    <p>{!handoffs.length ? '인수 요청을 보내면 두 사업장과 예정 도로 경로를 표시해요.' : !road ? '도로 경로를 조회하고 있어요.'
      : segments.length ? `${plannedRouteLines.length ? '예정 구간 포함 · ' : ''}자동차 도로 경로 ${roadDistance.toFixed(1)}km · ${providers}. 실제 차량 GPS 기록은 아니에요.`
        : '도로 경로를 불러오지 못해 사업장 위치만 표시해요.'}</p>
    {road && segments.length > 0 && segments.length < handoffs.length && <p>일부 구간의 도로 경로는 확인되지 않았어요.</p>}
    {handoffs.length > factories.length && <p>일부 사업장 좌표가 없어 지도에 표시하지 못했어요.</p>}
  </section>;
}
