import { canRequestIntake } from './review-policy.js';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../hooks/useSession.js';
import QRCode from 'qrcode';
import { receiveUrl, workflowApi } from './api.js';
import { ProcessOption } from './FacilityCard.jsx';
import { FacilityMap } from './FacilityMap.jsx';
import { IntakeQuestions, ConditionalResponse, DirectoryCandidates } from './IntakeConditions.jsx';
import {
  LOT_STATUS,
  OFFER_STATUS,
  FINISH_STATES,
  OUTPUT_STATES,
  STATE_LABEL,
  formatDateTime,
  formatKg,
  lotMaterial,
  lotProgress,
} from './labels.js';

// 처리 건(로트) 하나. 지금 물량을 가진 기업(can_manage)과 요청받은 기업이 각자 할 일을 본다.
// 모든 변경은 revision을 함께 보내고, 다른 화면에서 바뀌었으면(409) 새로 불러온다.
export function LotPanel({ lotId, initialLot = null }) {
  const [lot, setLot] = useState(initialLot);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const me = useSession().company?.id;

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
  const pendingOffer = lot.offers.find((o) => ['pending', 'conditional'].includes(o.status));
  const acceptedOffer = lot.offers.find((o) => o.status === 'accepted');
  const name = (id) => lot.companies[id] || '알 수 없는 기업';
  const manage = lot.can_manage;
  const material = lotMaterial(lot);
  const canFinish = manage && lot.status === 'processed' && (lot.terminal_states || FINISH_STATES[material] || []).includes(current.state_key);

  const progress = lotProgress(lot, me);
  const summary = (
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
          {acceptedOffer.can_issue_qr && <QrIssue lot={lot} offer={acceptedOffer} busy={busy} run={run} />}
          {acceptedOffer.can_receive && (
            <p className="wf-muted">물량이 도착하면 발송 기업이 준 입고 QR을 휴대전화로 스캔해 입고를 확인해 주세요.</p>
          )}
        </OfferCard>
      )}

      {manage && lot.status === 'processing' && (
        <OutputForm material={material} current={current} outputStates={lot.output_states} busy={busy} onSubmit={(v) => run('output', () => workflowApi.recordOutput(lot, v))} />
      )}

      <History lot={lot} name={name} />
    </>
  );

  // 내 몫의 일이 끝났으면(전달 완료·재활용 완료) 그것을 먼저 보여 주고, 처리 과정은 접어 둔다.
  // 배출 기업은 위탁 뒤에도 최종 처리까지 확인할 수 있어야 하므로 숨기지 않는다.
  return (
    <div className="wf-panel">
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {progress.kind === 'active' ? (
        <>
          {summary}
          {steps}
        </>
      ) : (
        <>
          {progress.kind === 'completed' ? (
            <CompletedCard lot={lot} name={name} />
          ) : (
            <HandedOffCard lot={lot} offer={progress.offer} name={name} onReload={reload} busy={busy} />
          )}
          <details className="wf-card wf-more">
            <summary>{progress.kind === 'completed' ? '처리 과정 보기' : '이후 처리 과정 보기'}</summary>
            <div className="wf-panel">
              {summary}
              {steps}
            </div>
          </details>
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
        <div><dt>전달 물량</dt><dd>{STATE_LABEL[sent?.state_key] || sent?.state_key} · {formatKg(sent?.mass_kg)}</dd></div>
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
      <h3>{STATE_LABEL[current.state_key] || current.state_key} {formatKg(current.mass_kg)}로 재활용됐어요</h3>
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

function CandidateSection({ lot, busy, onReview, onOffer, onAnswers, onDirectorySave }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const review = lot.review;
  const next = review?.next_step;
  const sendable = (facility, result) => canRequestIntake(review, facility, result);
  return (
    <section className="wf-card">
      <h3>다음 처리 업체</h3>
      {!review && <p className="wf-muted">현재 물량·사진으로 다음 공정 후보 업체를 모두 검토해요. 1~2분 걸릴 수 있어요.</p>}
      <button className="button button-primary" type="button" onClick={onReview} disabled={!!busy}>
        {busy === 'review' ? '업체를 검토하는 중…' : review ? '다시 검토' : '업체 검토 시작'}
      </button>
      {review && review.analysis_version !== 'isolated-vision-v2' && <p role="status">이전 방식의 검토예요. 인수 요청 전에 다시 검토해 주세요.</p>}
      {review && <p className="wf-muted">검토 {formatDateTime(review.at)} · {next?.message}</p>}
      {next?.options?.length > 0 && (
        <FacilityMap options={next.options} selectedKey={selectedKey} onSelect={setSelectedKey} />
      )}
      {next?.options?.map((option) => (
        <div key={option.transition_key}><ProcessOption
          key={option.transition_key}
          option={option}
          reviews={review.results}
          selectedKey={selectedKey}
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
            ) : null}</>
          }
        /><DirectoryCandidates lot={lot} transitionKey={option.transition_key} onSave={(listing, cursor, answers) => onDirectorySave(option.transition_key, listing, cursor, answers)} /></div>
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
    <section className="wf-card">
      <h3>인계 기록</h3>
      {lot.offers.filter(o => o.status !== 'conditional' && o.data.conditions?.length).map(o => (
        <details key={o.id} className="wf-card">
          <summary>반입조건 확인 기록 · {name(o.recipient_id)}</summary>
          <p className="wf-muted">{OFFER_STATUS[o.status] || o.status} · {o.data.decision?.note}</p>
          <dl className="wf-form">{o.data.conditions.map(c => <div key={c.id}>
            <dt>{c.text}</dt><dd>{o.data.condition_responses?.[c.id]?.text || '미제출'}</dd>
            <small>{o.data.decision?.resolved_condition_ids?.includes(c.id) ? '수신기업 확인 완료' : '수신기업 확인 전'}</small>
          </div>)}</dl>
        </details>
      ))}
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
