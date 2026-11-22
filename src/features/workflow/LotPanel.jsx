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
import { FacilityNextStep } from './FacilityCard.jsx';
import { QrPreview } from './QrPreview.jsx';
import { RecyclingTypes } from './RecyclingTypes.jsx';
import { RouteOutcome } from './RouteOutcome.jsx';
import { ConditionalResponse, DirectoryCandidates } from './IntakeConditions.jsx';
import { currentLotWarnings, validLocation } from './route-result.js';
import { startLotSync } from './lot-sync.js';
import { handoffHistoryEvents } from './history.js';
import { WorkflowEvidenceReport } from './WorkflowEvidenceReport.jsx';
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
export function LotPanel({ lotId, initialLot = null, showRecycling = true, view = 'progress', onLotChange, onShowRecommendations }) {
  const [lot, setLot] = useState(initialLot);
  const [failure, setFailure] = useState(null);
  const error = failure?.message || '';
  const [action, setBusy] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
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
    setFailure(null);
    return workflowApi.getLot(lotId).then(applyLot).catch((e) => setFailure({ message: e.message }));
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
    setFailure(null);
    try {
      const next = await call();
      if (next?.id && next?.revision) applyLot(next);
      return next;
    } catch (e) {
      setFailure({ message: e.message, action: label });
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
  const terminalStates = lot.terminal_states || FINISH_STATES[material] || [];
  const warnings = currentLotWarnings(lot.data.warnings, lot.review?.origin);
  const canReviewNext = manage && (lot.status === 'ready' || (lot.status === 'processed' && current.next_action === 'forward'));
  const hasRecommendations = canReviewNext && !!lot.review;
  const splitRecommendations = hasRecommendations && !!onShowRecommendations;
  const lastStep = lot.data.completed.at(-1);
  const correctionInput = lot.offers.find((offer) => offer.id === lastStep?.offer_id)?.data?.current || current;

  const progress = lotProgress(lot, me);
  const summary = (
      <section className="wf-card wf-summary" aria-label="현재 처리 건 상태와 물량">
        <div className="wf-summary-head">
          <div><span className="wf-summary-eyebrow">처리 건 현황</span><h2><span className="wf-status" data-status={lot.status}>{lotStatusLabel(lot)}</span></h2></div>
          <div className="wf-summary-actions">
            {view === 'progress' && manage && lot.status === 'review_required' && lastStep &&
              <button className="button button-quiet button-small" type="button"
                aria-expanded={showCorrection} aria-controls="wf-output-correction"
                onClick={() => setShowCorrection((open) => !open)}>
                {showCorrection ? '정정 닫기' : '처리 결과 정정'}
              </button>}
            <button className="button button-quiet button-small" type="button" onClick={reload} disabled={!!busy}>
              새로고침
            </button>
          </div>
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
      {manage && ['processed', 'stored'].includes(lot.status) && <ResultActionForm
        key={`${stage}:${current.state_key}:${current.next_action || ''}`} current={current}
        terminalStates={terminalStates} busy={busy}
        onSubmit={(decision) => run('output-action', () => workflowApi.outputAction(lot, decision))} />}

      {pendingOffer && (
        <OfferCard lot={lot} offer={pendingOffer} name={name}>
          <SupplierPolicySummary value={pendingOffer.data.facility?.supplier_policy} />
          <InquiryConversation lot={lot} offer={pendingOffer} me={me} busy={!!busy}
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
          {!!acceptedOffer.data.messages?.length && <InquiryConversation lot={lot} offer={acceptedOffer} me={me} readOnly />}
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

  const correctionPanel = manage && lot.status === 'review_required' && lastStep && showCorrection &&
    <div id="wf-output-correction">
      <OutputForm key={`correction-${stage}-${lot.revision}`} material={material} current={correctionInput}
        outputStates={lot.output_states} terminalStates={terminalStates} busy={busy}
        initialOutput={current} expectedState={stateLabel(lot, lastStep.expected_state)}
        onSubmit={(values) => run('correct-output', () => workflowApi.correctOutput(lot, values))} />
    </div>;

  const candidateContent = canReviewNext && <>
    <PhotoSection lot={lot} photos={stagePhotos} busy={busy} error={failure?.action === 'photo' || failure?.action === 'photo-delete' ? error : ''}
      onAdd={(file) => run('photo', () => workflowApi.addPhoto(lot.id, file))}
      onDelete={(photoId) => run('photo-delete', () => workflowApi.removePhoto(lot, photoId))} />
    <PhotoConflict key={`conflict-${lot.revision}-${lot.review?.at}`} lot={lot} busy={busy} onResolve={body => run('conflict', () => workflowApi.resolvePhotoConflict(lot, body))} />
    <CandidateSection
      key={`${stage}:${current.state_key}`}
      lot={lot}
      error={failure?.action === 'photo' || failure?.action === 'photo-delete' ? '' : error}
      offerFailed={failure?.action === 'offer'}
      showRecycling={showRecycling}
      busy={busy}
      onReview={() => run('review', () => workflowApi.startCandidateReview(lot))}
      onOffer={(key) => run('offer', () => workflowApi.sendOffer(lot, key))}
      onAnswers={(key, answers) => run('answers', () => workflowApi.saveIntakeAnswers(lot, key, answers))}
      onDirectorySave={(transition, listing, cursor, answers) => run('directory', () => workflowApi.saveDirectoryInquiry(lot, transition, listing, cursor, answers))}
    />
  </>;
  const recommendationLink = hasRecommendations && onShowRecommendations && <section className="wf-recommendation-entry" aria-label="다음 업체 추천">
    <div><strong>다음 업체 추천</strong><p>현재 산출물에 맞는 공정과 업체 검토 결과를 확인하세요.</p></div>
    <button className="button button-primary button-small" type="button" onClick={onShowRecommendations}>추천 업체 보기</button>
  </section>;

  if (view === 'info') return <div className="wf-panel"><WorkflowEvidenceReport lot={lot} /></div>;

  if (view === 'recommendations') return <div className="wf-panel wf-recommendations-panel">
    {canReviewNext ? candidateContent : <p className="wf-muted">현재 선택할 다음 업체가 없어요. 인계 현황을 확인해 주세요.</p>}
  </div>;

  if (lot.status === 'ready') return <div className="wf-panel">
    {error && <p className="wf-alert" role="alert">{error}</p>}
    {summary}
    {splitRecommendations ? recommendationLink : candidateContent}
    {steps}
  </div>;

  return (
    <div className="wf-panel">
      {error && <p className="wf-alert" role="alert">{error}</p>}
      <ProgressStatus lot={lot} name={name} handedOff={progress.kind === 'handed_off'} />
      {summary}
      {progress.kind === 'active' && (
        <>
          {correctionPanel}
          {splitRecommendations ? recommendationLink : candidateContent}
        </>
      )}
      <div className="wf-tracking-layout"><History lot={lot} name={name} /><HandoffMap lot={lot} /></div>
      {progress.kind === 'active' && steps}
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

function PhotoSection({ lot, photos, busy, error, onAdd, onDelete }) {
  return (
    <section className="wf-card wf-photo-section">
      <div className="wf-photo-head">
        <h3>현재 물량 사진 ({photos.length}/4)</h3>
      </div>
      <p className="wf-muted">사진과 상태 설명은 업체 검토를 위해 AI(Azure)로 전달돼요. JPEG·PNG·WebP, 3MB 이하.</p>
      <div className="wf-photos wf-photo-list">
        {photos.map((p, index) => (
          <div className="wf-photo-item" key={p.id}>
            <img src={workflowApi.photoUrl(p)} alt={`현재 물량 사진 ${index + 1}`} loading="lazy" />
            <button className="wf-photo-delete" type="button" aria-label={`사진 ${index + 1} 삭제`} title={`사진 ${index + 1} 삭제`}
              disabled={!!busy} onClick={() => onDelete(p.id)}>×</button>
          </div>
        ))}
        {photos.length < 4 && (
          <label className="button button-quiet button-small wf-file wf-photo-add">
            <span aria-hidden="true">＋</span>{busy === 'photo' ? '올리는 중…' : '사진 추가'}
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
      </div>
      {error && <p className="wf-alert" role="alert">사진을 변경하지 못했어요. {error}</p>}
      {lot.review && <p className="wf-muted">사진을 바꾸면 업체 검토를 다시 해야 해요.</p>}
    </section>
  );
}

function CandidateSection({ lot, busy, error, offerFailed, onReview, onOffer, onAnswers, onDirectorySave, showRecycling }) {
  const review = lot.review;
  if (invalidReviewPhotos(review).length || lot.photo_conflict_gate?.invalid_photos?.length) return null;
  const next = review?.next_step;
  const candidateKeys = [...new Set((next?.options || []).flatMap(o => (o.facilities || []).map(f => f.capability_key)))];
  const companyCount = new Set((next?.options || []).flatMap(o => (o.facilities || []).map(f => f.facility_key))).size;
  const reviewedCount = candidateKeys.filter(key => {
    const r = review?.results?.[key];
    return ['reviewed', 'needs_evidence'].includes(r?.status) && r?.lot_review?.status === 'reviewed'
      && ['isolated_vision', 'no_photo'].includes(r?.lot_review?.observation_method);
  }).length;
  const sendable = (facility, result) => canRequestIntake(review, facility, result, lot.photo_conflict_gate);
  // 카드 배지와 상세 '지금 할 일'이 같은 판단을 쓴다. 요청 가능 조건은 review-policy.js와 서버가 정한다.
  function requestState(facility, result) {
    const recipient = facility.recipient?.name || '받는 업체';
    if (sendable(facility, result)) return { badge: { tone: 'ready', label: '인수 요청 가능' }, title: '인수 요청을 보낼 수 있어요',
      text: `현재 물량·사진·검토 결과가 ${recipient}에 전달돼요. 실제 반입 여부는 받는 업체가 확인하고 답해요.` };
    if (lot.photo_conflict_gate?.blocked) return { badge: { tone: 'hold', label: '사진·설명 확인 필요' }, title: '사진과 설명이 맞는지 먼저 확인해 주세요',
      text: '후보 목록 위의 불일치 확인 영역에서 설명을 고치거나 확인 사유를 남겨 주세요.' };
    if (result?.status === 'model_unavailable' || result?.lot_review?.status === 'model_unavailable') return { badge: { tone: 'hold', label: 'AI 검토 미완료' }, title: 'AI 검토가 끝나지 않았어요',
      text: '후보 목록 위의 [현재 물량 다시 검토]를 누르면 미완료 업체만 다시 확인해요. 미완료는 부적합 판정이 아니에요.' };
    if (['mismatch', 'unverified'].includes(result?.process_match)) return { badge: { tone: 'off', label: '요청 불가' },
      title: result.process_match === 'mismatch' ? '현재 물량의 재질·공정과 맞지 않는 업체예요' : '이 업체의 공정 연결 근거가 아직 확인되지 않았어요',
      text: '다시 검토해도 같은 결과일 수 있어요. 다른 후보 업체를 확인해 주세요.' };
    if (!facility.recipient) return { badge: { tone: 'off', label: '수신 계정 미연결' }, title: '이 업체는 아직 서비스 계정이 없어요',
      text: '인수 요청은 보낼 수 없지만, 문의서를 만들어 전화·메일로 반입 조건을 물어볼 수 있어요.' };
    if (facility.supplier_policy?.policy?.accepting_inquiries === false) return { badge: { tone: 'off', label: '새 문의 중단' }, title: '이 업체는 새 반입 문의를 잠시 받지 않아요',
      text: '다른 후보 업체를 확인해 주세요.' };
    if (result?.finding === 'restriction_mentioned') return { badge: { tone: 'off', label: '요청 불가' }, title: '공개 자료에서 반입 제한이 확인됐어요',
      text: '아래 검토 근거를 확인하고 다른 후보 업체를 살펴봐 주세요.' };
    return { badge: { tone: 'hold', label: '검토 필요' }, title: '공정·물량 검토를 마쳐야 요청할 수 있어요',
      text: '후보 목록 위의 [현재 물량 다시 검토]로 현재 물량 기준 검토를 완료해 주세요.' };
  }
  return (
    <section className="wf-card wf-candidate-section">
      <div className="wf-candidate-head">
        <div><span className="wf-candidate-eyebrow">다음 업체 찾기</span><h3>{review ? '추천 업체 검토 결과' : '현재 물량으로 업체 검토'}</h3>
          <p>{review ? '검토 내용을 확인하고 다음 인계 요청을 보낼 업체를 선택하세요.' : '사진과 현재 상태를 바탕으로 다음 공정에 맞는 업체를 찾아요.'}</p></div>
        {review && <button className="button button-quiet button-small" type="button" onClick={onReview} disabled={!!busy}>
          {busy === 'review' ? '검토 중…' : '현재 물량 다시 검토'}
        </button>}
      </div>
      {showRecycling && <RecyclingTypes assessment={lot.data.recycling} followUp={lot.data.completed.length > 0} />}
      {!review && <><p className="wf-muted">사진이 없어도 상태 설명으로 검토할 수 있어요. 사진으로 확인한 것처럼 판단하지는 않아요.</p>
        <button className="button button-primary" type="button" onClick={onReview} disabled={!!busy}>
          {busy === 'review' ? '업체를 검토하는 중…' : 'AI 검토하고 후보 보기'}
        </button></>}
      {busy === 'review' && <ReviewOrb key={reviewIsRunning(lot) ? lot.review_progress.id : 'starting'}
        progress={reviewIsRunning(lot) ? lot.review_progress : null} />}
      {['failed', 'interrupted'].includes(lot.review_progress?.status) && busy !== 'review'
        && <p className="wf-alert" role="alert">{lot.review_progress.message || '검토가 중단됐어요. 완료된 결과를 유지하고 다시 시도할 수 있어요.'}</p>}
      {error && busy !== 'review' && <p className="wf-alert" role="alert">{offerFailed ? '인수 요청을 보내지 못했어요.' : '검토 결과를 받지 못했어요.'} {error}</p>}
      {review && (review.analysis_version !== 'isolated-vision-v2' || !review.recycling_checksum) && <p role="status">이전 방식의 검토예요. 인수 요청 전에 다시 검토해 주세요.</p>}
      {review && <><dl className="wf-review-overview" aria-label="추천 업체 검토 요약">
        <div><dt>추천 업체</dt><dd><strong>{companyCount}곳</strong><span>공개 공정 자료와 도로거리로 추린 후보예요.</span></dd></div>
        <div><dt>추천 목록 검토</dt><dd><strong>{reviewedCount}/{candidateKeys.length}건 완료</strong><span>화면에 표시한 업체·공정 연결을 현재 물량과 대조한 건수예요.</span></dd></div>
        <div><dt>반입 결정</dt><dd><strong>업체 확인 필요</strong><span>AI 검토는 추천 근거예요. 실제 반입은 요청받은 업체가 결정해요.</span></dd></div>
      </dl>
        {reviewedCount < candidateKeys.length && <p className="wf-evidence-alert" role="status">{candidateKeys.length - reviewedCount}건의 검토가 미완료예요. 부적합 판정은 아니며, ‘현재 물량 다시 검토’를 누르면 재시도할 수 있어요.</p>}
        <details className="wf-review-method"><summary>후보를 찾은 기준과 검토 기록</summary>
          <dl><div><dt>검토 시각</dt><dd>{formatDateTime(review.at)}</dd></div>
            <div><dt>후보 선정</dt><dd>취급 소재가 맞는 업체를 도로거리순으로 최대 5곳 표시해요.</dd></div>
            <div><dt>검토 단위</dt><dd>한 업체가 여러 공정을 맡으면 공정마다 따로 검토해요.</dd></div>
            {next?.message && <div><dt>현재 물량 안내</dt><dd>{next.message}</dd></div>}</dl>
        </details></>}
      {review && <RouteOutcome next={next} currentLabel={stateLabel(lot, lot.data?.current?.state_key)} code={lot.data?.handoff?.waste_code} />}
      {next?.options && (
        <CandidateBrowser
          key={lot.data.current.state_key}
          options={next.options}
          origin={review.origin}
          originLabel={review.origin_label}
          reviews={review.results}
          requestState={(facility, result) => requestState(facility, result).badge}
          renderAction={(facility, result) => {
            const state = requestState(facility, result);
            const packet = <InquiryPacket lot={lot} facility={facility} busy={!!busy} />;
            return <><FacilityNextStep tone={state.badge.tone} title={state.title}
              actions={state.badge.tone === 'ready' ? <>
                <button className="button button-primary" type="button" disabled={!!busy}
                  onClick={() => onOffer(facility.capability_key)}>
                  {busy === 'offer' ? '요청 보내는 중…' : `${facility.recipient.name}에 인수 요청 보내기`}
                </button>
                {packet}
              </> : packet}>
              {state.text}
            </FacilityNextStep>
              {offerFailed && <p className="wf-alert candidate-sheet-error" role="alert">인수 요청을 보내지 못했어요. {error}</p>}
            </>;
          }}
          renderDetailExtra={(facility) => <SupplierPolicySummary value={facility.supplier_policy} />}
          renderExtra={(option) => <DirectoryCandidates lot={lot} transitionKey={option.transition_key} onSave={(listing, cursor, answers) => onDirectorySave(option.transition_key, listing, cursor, answers)} />}
        />
      )}
      {review?.selection?.other_options?.length > 0 && <details className="wf-more wf-other-candidates">
        <summary>추천 목록 밖의 업체 확인</summary>
        <p className="wf-muted">여기에는 거리 미확인, 추가 검토가 필요한 업체 등이 있어요. 미검토는 부적합 판정이 아니에요.</p>
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
  const [choice, setChoice] = useState(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const requiredChecks = offer?.data.facility?.supplier_policy?.policy?.required_checks || [];
  const [conditionsText, setConditionsText] = useState(requiredChecks.join('\n'));
  const [resolved, setResolved] = useState([]);
  const conditions = offer?.data.conditions || [];
  const conditionsReady = (!requiredChecks.length || conditions.length > 0) && conditions.every(c => resolved.includes(c.id) && offer.data.condition_responses?.[c.id]?.text);
  const ok = note.trim().length >= 3;
  return (
    <div className="wf-decision" aria-label="인수 결정">
      <div className="wf-decision-head"><h4>인수 결정</h4><p>물량과 반입 조건을 확인한 뒤 선택해 주세요.</p></div>
      <div className="wf-decision-choices" role="group" aria-label="인수 결정 선택">
        <button type="button" aria-pressed={choice === 'accept'} onClick={() => setChoice('accept')}>수락</button>
        {offer?.status === 'pending' && <button type="button" aria-pressed={choice === 'conditional'} onClick={() => setChoice('conditional')}>조건부 수락</button>}
        <button type="button" aria-pressed={choice === 'reject'} onClick={() => setChoice('reject')}>거절</button>
      </div>
      {choice && <div className="wf-decision-fields wf-form">
        {choice === 'conditional' && <label>추가 반입조건 <span>한 줄에 하나씩 입력해 주세요.</span>
          <textarea rows={2} maxLength={4000} placeholder="예: 오염물 제거 후 사진을 보내 주세요." value={conditionsText} onChange={e => setConditionsText(e.target.value)} />
        </label>}
        {choice === 'accept' && <>
          <label className="wf-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> 우리 사업장의 처리 범위와 이번 물량의 반입조건을 확인했어요</label>
          {conditions.map(c => <label className="wf-check" key={c.id}><input type="checkbox" checked={resolved.includes(c.id)} disabled={!offer.data.condition_responses?.[c.id]?.text}
            onChange={e => setResolved(e.target.checked ? [...resolved, c.id] : resolved.filter(id => id !== c.id))} />제출 자료로 확인했어요: {c.text}</label>)}
          {!!requiredChecks.length && !conditions.length && <p className="wf-muted">업체 필수 확인 조건이 있어요. 조건부 수락으로 요청한 뒤 확인해 주세요.</p>}
        </>}
        <label>{choice === 'reject' ? '거절 이유' : choice === 'conditional' ? '조건 안내 메모' : '수락 메모'}
          <input type="text" maxLength={1000} placeholder={choice === 'reject' ? '예: 현재 해당 물량을 받을 수 없어요.' : '결정 이유를 간단히 적어 주세요.'} value={note} onChange={e => setNote(e.target.value)} />
        </label>
        <button className="button button-primary" type="button" disabled={!!busy || !ok || (choice === 'accept' && (!confirmed || !conditionsReady)) || (choice === 'conditional' && conditionsText.trim().length < 3)}
          onClick={() => choice === 'conditional'
            ? onConditions(conditionsText.split('\n').map(s => s.trim()).filter(Boolean), note.trim())
            : onDecide({ accept: choice === 'accept', note: note.trim(), scopeChecked: confirmed, intakeChecked: confirmed, resolvedConditionIds: resolved })}>
          {choice === 'accept' ? conditions.length ? '조건 확인 후 수락' : '인수 수락' : choice === 'conditional' ? '조건 보내기' : '인수 거절'}
        </button>
      </div>}
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
      <option value="forward">다음 업체로 인계 (추가 가공)</option>
      <option value="hold">보관 중</option>
    </select></label>
    {!canComplete && stateKey && <p className="wf-muted">이 산출물은 다음 업체에 인계하거나 보관할 수 있어요.</p>}
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

function OutputForm({ material, current, outputStates, terminalStates, busy, onSubmit, initialOutput = null, expectedState = '' }) {
  const correction = !!initialOutput;
  const [state, setState] = useState(initialOutput?.state_key || '');
  const [mass, setMass] = useState(initialOutput?.mass_kg ?? '');
  const [purity, setPurity] = useState(initialOutput?.purity_percent ?? '');
  const [purityBadInput, setPurityBadInput] = useState(false);
  const [condition, setCondition] = useState(initialOutput?.condition || '');
  const [evidence, setEvidence] = useState(initialOutput?.evidence || '');
  const [action, setAction] = useState(initialOutput?.next_action || '');
  const [reason, setReason] = useState('');
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
    correction && reason.trim().length < 3 && '정정 사유를 3자 이상 적어 주세요.',
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
        ...(correction ? { reason: reason.trim() } : {}),
        ...(action === 'complete' ? { completion_reference: evidence.trim(), intended_use: use.trim(), completion_confirmed: confirmed } : {}),
      });
    }}>
      <h3>{correction ? '처리 결과 정정' : '처리 결과(실제 산출물) 기록'}</h3>
      {correction && <div className="wf-correction-notice" role="status"><strong>기록한 산출물과 예정 산출물이 달라 인계가 보류됐어요.</strong>
        <p>예정: {expectedState} · 기록: {STATE_LABEL[initialOutput.state_key] || initialOutput.state_key}</p>
        <p>실제로 나온 산출물을 확인하고 아래 내용을 고쳐 주세요. 이전 기록과 정정 사유는 이력에 남아요.</p>
        <p>실제 산출물이 예정과 계속 다르면 이 정정만으로 보류가 풀리지 않아요.</p>
      </div>}
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
      {correction && <label>정정 사유<textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 산출물 형태를 잘못 선택해 실제 작업 기록과 일치하도록 정정합니다." /></label>}
      <ProcessingDecision stateKey={state} terminalStates={terminalStates} action={action} setAction={setAction}
        use={use} setUse={setUse} confirmed={confirmed} setConfirmed={setConfirmed} />
      <button className="button button-primary" type="submit" disabled={!!busy}>
        {busy === 'output' || busy === 'correct-output' ? '저장하는 중…' : correction ? '정정 내용 저장' : '처리 결과 기록'}
      </button>
    </form>
  );
}

function History({ lot, name }) {
  const events = handoffHistoryEvents(lot.data.events).reverse();
  const isFinished = lot.status === 'completed';
  return (
    <section className="wf-history" aria-labelledby="wf-history-title">
      <header className="wf-history-heading">
        <div><h3 id="wf-history-title">인계 기록</h3><p>최근 기록부터 표시해요</p></div>
        <strong>{events.length}건 기록</strong>
      </header>
      {events.length ? (
        <ol className="wf-history-timeline">
          {!isFinished && <li className="is-current">
            <span className="wf-history-marker" aria-hidden="true" />
            <div className="wf-history-entry">
              <div className="wf-history-entry-top"><strong>{lotStatusLabel(lot)}</strong><span>진행 중</span></div>
              <p>{name(lot.current_company_id)}</p>
            </div>
          </li>}
          {events.map((e, i) => (
            <li key={`${e.at}-${e.action}-${i}`} className="is-done">
              <span className="wf-history-marker" aria-hidden="true" />
              <div className="wf-history-entry">
                <div className="wf-history-entry-top"><strong>{e.action}</strong><span>완료</span></div>
                <p>{name(e.company_id)}{e.facility && ` · ${e.facility}`}</p>
                <time dateTime={e.at}>{formatDateTime(e.at)}</time>
                {e.note && <p className="wf-history-note">{e.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="wf-history-empty">아직 기록이 없어요.</p>}
    </section>
  );
}

function ProgressStatus({ lot, name, handedOff }) {
  const stages = ['처리 건 등록', '업체 인수 요청', '입고 확인', '처리 진행', '재활용 완료'];
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
    <span>{handedOff ? '우리 기업 단계' : '현재 진행 상황'}</span>
    <h2>{handedOff ? '처리 완료' : message}</h2>
    {handedOff && <p>{message}</p>}
    <p>현재 담당 · {company}{site !== company && ` · ${site}`}</p>
    <ol aria-label="전체 처리 경로">{stages.map((stage, index) => <li key={stage} className={index === current ? (lot.status === 'completed' ? 'is-done is-current' : 'is-current') : index < current ? 'is-done' : ''}>
      <span aria-hidden="true">{index < current || lot.status === 'completed' ? '✓' : String(index + 1).padStart(2, '0')}</span>{stage}
    </li>)}</ol>
  </section>;
}

function HandoffMap({ lot }) {
  const handoffs = lot.offers.filter((offer) => ['pending', 'conditional', 'accepted', 'received', 'processed'].includes(offer.status));
  const origin = [lot.data.initial?.origin, ...handoffs.map((offer) => offer.data.origin)].find(validLocation) || null;
  const originName = lot.companies[lot.owner_company_id];
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
      <ResourceMapbox factories={factories} origin={origin ? { ...origin, label: originName ? `${originName} · 최초 배출지` : '처음 배출지', logo: true } : null}
        routeLines={routeLines} plannedRouteLines={plannedRouteLines} label="인계 사업장과 조회된 자동차 도로 경로 지도" />
    </Suspense></div>
    <p>{!handoffs.length ? '인수 요청을 보내면 두 사업장과 예정 도로 경로를 표시해요.' : !road ? '도로 경로를 조회하고 있어요.'
      : segments.length ? `${plannedRouteLines.length ? '예정 구간 포함 · ' : ''}자동차 도로 경로 ${roadDistance.toFixed(1)}km · ${providers}. 실제 차량 GPS 기록은 아니에요.`
        : '도로 경로를 불러오지 못해 사업장 위치만 표시해요.'}</p>
    {road && segments.length > 0 && segments.length < handoffs.length && <p>일부 구간의 도로 경로는 확인되지 않았어요.</p>}
    {handoffs.length > factories.length && <p>일부 사업장 좌표가 없어 지도에 표시하지 못했어요.</p>}
  </section>;
}
