import { canRequestIntake } from './review-policy.js';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../../hooks/useSession.js';
import QRCode from 'qrcode';
import { receiveUrl, workflowApi } from './api.js';
import { CandidateBrowser } from './CandidateBrowser.jsx';
import { RecyclingTypes } from './RecyclingTypes.jsx';
import { RouteOutcome } from './RouteOutcome.jsx';
import { IntakeQuestions, ConditionalResponse, DirectoryCandidates } from './IntakeConditions.jsx';
import { validLocation } from './route-result.js';
import {
  LOT_STATUS,
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
export function LotPanel({ lotId, initialLot = null, preferredFacility = null, showRecycling = true, view = 'progress', onLotChange, qrTargetId }) {
  const [lot, setLot] = useState(initialLot);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [qrTarget, setQrTarget] = useState(null);
  const me = useSession().company?.id;

  const reload = useCallback(() => {
    setError('');
    return workflowApi.getLot(lotId).then((next) => { setLot(next); onLotChange?.(next); }).catch((e) => setError(e.message));
  }, [lotId, onLotChange]);

  useEffect(() => {
    if (!initialLot) reload();
  }, [initialLot, reload]);

  useEffect(() => {
    if (qrTargetId) setQrTarget(document.getElementById(qrTargetId));
  }, [qrTargetId, lot?.status]);

  // 서버 호출 공통: 잠금, 오류 문구, 충돌이면 새로 불러오기
  async function run(label, call) {
    setBusy(label);
    setError('');
    try {
      const next = await call();
      if (next?.id && next?.revision) { setLot(next); onLotChange?.(next); }
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
  const pendingOffer = lot.offers.find((o) => ['pending', 'conditional'].includes(o.status));
  const acceptedOffer = lot.offers.find((o) => o.status === 'accepted');
  const name = (id) => lot.companies[id] || '알 수 없는 기업';
  const manage = lot.can_manage;
  const material = lotMaterial(lot);
  const diagnosisId = lot.diagnosis_id || lot.data.handoff?.case_id;
  const canFinish = manage && lot.status === 'processed' && (lot.terminal_states || FINISH_STATES[material] || []).includes(current.state_key);

  const progress = lotProgress(lot, me);
  const summary = (
      <section className="wf-card wf-summary" aria-label="현재 처리 건 상태와 물량">
        <div className="wf-summary-head">
          <div><span className="wf-summary-eyebrow">처리 건 현황</span><h2><span className="wf-status" data-status={lot.status}>{LOT_STATUS[lot.status] || lot.status}</span></h2></div>
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
        {lot.data.warnings?.length > 0 && (
          <div className="wf-inline-checks"><strong>확인 사항</strong>
          <ul className="wf-warnings">
            {lot.data.warnings.map((w) => <li key={w}>{w}</li>)}
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

      {/* 지금 물량을 가진 기업: 사진 → 업체 검토 → 인수 요청, 또는 완료 */}
      {manage && ['ready', 'processed'].includes(lot.status) && (
        <>
          <PhotoSection lot={lot} photos={stagePhotos} busy={busy} onAdd={(file) => run('photo', () => workflowApi.addPhoto(lot.id, file))} />
          <CandidateSection
            lot={lot}
            error={error}
            showRecycling={showRecycling}
            preferredFacility={preferredFacility}
            busy={busy}
            onReview={() => run('review', () => workflowApi.reviewCandidates(lot))}
            onOffer={(key) => run('offer', () => workflowApi.sendOffer(lot, key))}
            onAnswers={(key, answers) => run('answers', () => workflowApi.saveIntakeAnswers(lot, key, answers))}
            onDirectorySave={(transition, listing, cursor, answers) => run('directory', () => workflowApi.saveDirectoryInquiry(lot, transition, listing, cursor, answers))}
          />
          {canFinish && <FinishForm material={material} busy={busy} onFinish={(v) => run('finish', () => workflowApi.finish(lot, v))} />}
        </>
      )}

      {pendingOffer && (
        <OfferCard lot={lot} offer={pendingOffer} name={name}>
          <IntakeQuestions form={pendingOffer.data.intake_conditions} readOnly />
          {pendingOffer.status === 'conditional' && <ConditionalResponse lot={lot} offer={pendingOffer} busy={!!busy}
            onRespond={(values) => run('conditions', () => workflowApi.respondConditions(lot, pendingOffer.id, values))} />}
          {pendingOffer.can_decide ? (
            <DecisionForm busy={busy} offer={pendingOffer}
              onConditions={(conditions, note) => run('conditions', () => workflowApi.setConditions(lot, pendingOffer.id, conditions, note))}
              onDecide={(v) => run('decide', () => workflowApi.decide(lot, pendingOffer.id, v))} />
          ) : (
            <p className="wf-muted">
              {name(pendingOffer.recipient_id)}의 응답을 기다리고 있어요.
              {pendingOffer.sender_id === me && ' 수락되면 여기서 입고 QR을 발급할 수 있어요. 새로고침해 확인해 주세요.'}
            </p>
          )}
        </OfferCard>
      )}

      {acceptedOffer && (
        <OfferCard lot={lot} offer={acceptedOffer} name={name}>
          {acceptedOffer.can_issue_qr && (qrTarget
            ? createPortal(<QrIssue lot={lot} offer={acceptedOffer} busy={busy} run={run} />, qrTarget)
            : <QrIssue lot={lot} offer={acceptedOffer} busy={busy} run={run} />)}
          {acceptedOffer.can_receive && (
            <p className="wf-muted">물량이 도착하면 발송 기업이 준 입고 QR을 휴대전화로 스캔해 입고를 확인해 주세요.</p>
          )}
        </OfferCard>
      )}

      {manage && lot.status === 'processing' && (
        <OutputForm material={material} current={current} outputStates={lot.output_states} busy={busy} onSubmit={(v) => run('output', () => workflowApi.recordOutput(lot, v))} />
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
      <LotChecks lot={lot} name={name} />
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

function CandidateSection({ lot, busy, error, onReview, onOffer, onAnswers, onDirectorySave, preferredFacility, showRecycling }) {
  const [selectedKey, setSelectedKey] = useState(preferredFacility?.facility_key || null);
  const review = lot.review;
  const next = review?.next_step;
  const sendable = (facility, result) => canRequestIntake(review, facility, result);
  return (
    <section className="wf-card wf-candidate-section">
      <h3>다음 처리 업체</h3>
      {preferredFacility && <p className="wf-muted">선택한 검토 후보: <strong>{preferredFacility.label}</strong></p>}
      {showRecycling && <RecyclingTypes assessment={lot.data.recycling} followUp={lot.data.completed.length > 0} />}
      {!review && <p className="wf-muted">현재 물량·사진으로 다음 공정 후보 업체를 모두 검토해요. 후보 수와 AI 응답에 따라 시간이 걸릴 수 있어요.</p>}
      <button className="button button-primary" type="button" onClick={onReview} disabled={!!busy}>
        {busy === 'review' ? '업체를 검토하는 중…' : review ? '다시 검토' : '업체 검토 시작'}
      </button>
      {busy === 'review' && <div className="wf-review-loading" role="status" aria-live="polite">
        <span className="wf-review-orbit" aria-hidden="true"><i /><i /><i /></span>
        <strong>업체의 공개 근거를 확인하고 있어요</strong>
        <p>현재 물량과 사진을 후보 업체의 반입 조건에 대조합니다. 결과가 나오면 이 화면에 표시돼요.</p>
      </div>}
      {error && busy !== 'review' && <p className="wf-alert" role="alert">검토 결과를 받지 못했어요. {error}</p>}
      {review && (review.analysis_version !== 'isolated-vision-v2' || !review.recycling_checksum) && <p role="status">이전 방식의 검토예요. 인수 요청 전에 다시 검토해 주세요.</p>}
      {review && <p className="wf-muted">검토 {formatDateTime(review.at)} · {next?.message}</p>}
      {review && <RouteOutcome next={next} currentLabel={stateLabel(lot, lot.data?.current?.state_key)} code={lot.data?.handoff?.waste_code} />}
      {next?.options && (
        <CandidateBrowser
          options={next.options}
          origin={review.origin}
          originLabel={review.origin_label}
          reviews={review.results}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          renderAction={(facility, result) => <>
            <IntakeQuestions key={facility.capability_key + lot.revision} form={facility.intake_conditions} busy={!!busy}
              onSave={(answers) => onAnswers(facility.capability_key, answers)} />
            {sendable(facility, result) ? (
              <button className="button button-quiet button-small" type="button" disabled={!!busy}
                onClick={() => onOffer(facility.capability_key)}>
                {facility.recipient.name}에 인수 요청 보내기
              </button>
            ) : result?.status === 'model_unavailable' || result?.lot_review?.status === 'model_unavailable' ? (
              <p className="wf-muted">AI 검토가 끝나지 않아 요청을 보낼 수 없어요. 다시 검토해 주세요.</p>
            ) : <p className="wf-muted">{!facility.recipient ? '업체의 수신 계정 연결 후 인수 요청을 보낼 수 있어요.' : result?.finding === 'restriction_mentioned' ? '반입 제한이 확인되어 요청을 보낼 수 없어요.' : '필요한 답변을 입력하고 업체 검토를 완료해 주세요.'}</p>}</>}
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
        {data.synthetic && ' · 로컬 시험용 계정'}
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
      {children}
    </section>
  );
}

function DecisionForm({ busy, onDecide, onConditions, offer }) {
  const [note, setNote] = useState('');
  const [scope, setScope] = useState(false);
  const [intake, setIntake] = useState(false);
  const [conditionsText, setConditionsText] = useState('');
  const [resolved, setResolved] = useState([]);
  const conditions = offer?.data.conditions || [];
  const conditionsReady = conditions.every(c => resolved.includes(c.id) && offer.data.condition_responses?.[c.id]?.text);
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
      {conditions.map(c => <label className="wf-check" key={c.id}><input type="checkbox" checked={resolved.includes(c.id)} disabled={!offer.data.condition_responses?.[c.id]?.text}
        onChange={e => setResolved(e.target.checked ? [...resolved, c.id] : resolved.filter(id => id !== c.id))} />제출 자료로 확인했어요: {c.text}</label>)}
      {offer?.status === 'pending' && <label>추가 반입조건 (한 줄에 하나씩, 최대 12개)
        <textarea rows={3} maxLength={4000} placeholder="예: 오염물 제거 후 사진과 샘플 검사번호를 제출해 주세요." value={conditionsText} onChange={e => setConditionsText(e.target.value)} />
      </label>}
      <div className="wf-actions">
        <button className="button button-primary" type="button" disabled={!!busy || !ok || !scope || !intake || !conditionsReady}
          onClick={() => onDecide({ accept: true, note: note.trim(), scopeChecked: scope, intakeChecked: intake, resolvedConditionIds: resolved })}>{conditions.length ? '조건 확인 후 최종 수락' : '수락'}</button>
        {offer?.status === 'pending' && <button className="button button-quiet" disabled={!!busy || !ok || conditionsText.trim().length < 3}
          onClick={() => onConditions(conditionsText.split('\n').map(s => s.trim()).filter(Boolean), note.trim())}>조건부 수락</button>}
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

function OutputForm({ material, current, outputStates, busy, onSubmit }) {
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
          {(outputStates || (OUTPUT_STATES[material] || []).map(key => ({ key, label: STATE_LABEL[key] }))).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
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

function FinishForm({ material, busy, onFinish }) {
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
      <p className="wf-muted">이 소재의 최종 산출물과 완료 근거가 확인된 물량만 완료할 수 있어요.</p>
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
    <section className="wf-history" aria-labelledby="wf-history-title">
      <header className="wf-history-heading">
        <div><span>HANDOFF STATUS</span><h3 id="wf-history-title">인계 기록</h3><p>처리 건의 진행 상황과 기업별 확인 내역을 시간순으로 확인하세요.</p></div>
        <strong>{events.length}건 기록</strong>
      </header>
      {events.length ? (
        <ol className="wf-history-timeline">
          {events.map((e, i) => (
            <li key={i} className={i === 0 ? 'is-current' : ''}>
              <span className="wf-history-marker" aria-hidden="true" />
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

function LotChecks({ lot, name }) {
  const offersWithConditions = lot.offers.filter((offer) => offer.data.conditions?.length);
  return <section className="wf-evidence-panel wf-lot-checks" aria-label="현재 처리 건 확인 사항">
    <div className="wf-evidence-panel-head"><div><span>물량 · 인계 확인</span><h3>현재 물량 확인 사항</h3></div><strong>{lot.data.warnings?.length || 0}건 확인 필요</strong></div>
    <div className="wf-current-condition"><span>현재 상태 설명</span><p>{lot.data.current.condition || '설명 없음'}</p></div>
    {lot.data.warnings?.length > 0 && <div className="wf-evidence-alert"><strong>먼저 확인할 사항</strong><ul>{lot.data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
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
    : lot.status === 'processing' || lot.status === 'processed' || lot.status === 'review_required' ? 3
      : lot.status === 'accepted' ? 2
        : ['offered', 'conditional'].includes(lot.status) ? 1 : 0;
  const company = name(lot.current_company_id);
  const awaitingRecipient = lot.offers.find((offer) => offer.status === 'accepted');
  const currentOffer = [...lot.offers].reverse().find((offer) => offer.recipient_id === lot.current_company_id && ['received', 'processed'].includes(offer.status));
  const site = currentOffer?.data?.facility?.label || company;
  const message = lot.status === 'processing' ? `${site}에서 처리 중이에요`
    : lot.status === 'completed' ? `${site}에서 처리를 완료했어요`
      : lot.status === 'processed' ? `${site}에서 처리 결과를 기록했어요`
        : lot.status === 'accepted' ? `${awaitingRecipient ? name(awaitingRecipient.recipient_id) : '수신 기업'}의 입고를 기다리고 있어요`
          : lot.status === 'offered' || lot.status === 'conditional' ? '업체의 인수 확인을 기다리고 있어요'
            : `${company}에서 다음 인계를 준비하고 있어요`;
  return <section className="wf-progress-status" aria-label="현재 인계 현황">
    <span>현재 진행 상황</span><h2>{message}</h2>
    <p>현재 담당 · {company}{site !== company && ` · ${site}`}</p>
    <ol>{stages.map((stage, index) => <li key={stage} className={index === current ? 'is-current' : index < current ? 'is-done' : ''}>
      <span aria-hidden="true">{index < current ? '✓' : String(index + 1).padStart(2, '0')}</span>{stage}
    </li>)}</ol>
  </section>;
}

function HandoffMap({ lot }) {
  const origin = lot.data.initial?.origin;
  const handoffs = lot.offers.filter((offer) => ['received', 'processed'].includes(offer.status));
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
  const routePoints = validLocation(origin) ? [[origin.longitude, origin.latitude]] : [];
  for (const site of locations) {
    if (!validLocation(site.point) || !routePoints.length) break;
    routePoints.push([site.point.longitude, site.point.latitude]);
  }
  return <section className="wf-handoff-map" aria-label="인계 사업장 지도">
    <header><strong>인계 경로</strong><span>입고 확인된 사업장</span></header>
    <div className="wf-handoff-map-canvas"><Suspense fallback={<p>지도를 불러오는 중이에요.</p>}>
      <ResourceMapbox factories={factories} origin={validLocation(origin) ? { ...origin, label: '배출 사업장' } : null}
        routePoints={routePoints} label="실제 인계 사업장 위치와 이동 순서 지도" />
    </Suspense></div>
    <p>{handoffs.length ? `${handoffs.length}곳에 입고가 확인됐어요. 선은 확인된 사업장 좌표 간 직선 연결이며 실제 운송 GPS 경로는 아니에요.` : '아직 입고가 확인된 업체가 없어요. 입고 후 이동 순서를 표시합니다.'}</p>
    {handoffs.length > factories.length && <p>일부 사업장 좌표가 없어 지도에 표시하지 못했어요.</p>}
  </section>;
}
