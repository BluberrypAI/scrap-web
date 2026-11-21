import { useEffect, useRef, useState } from 'react';
import { workflowApi } from './api.js';
import { canRegisterLot } from './labels.js';
import { registerLot } from './registration.js';
import { RecyclingTypes } from './RecyclingTypes.jsx';
import { RouteOutcome } from './RouteOutcome.jsx';
import { handoffDesignated } from '../diagnosis/lib/designated.js';
import { DesignatedBanner, DesignatedNextActions } from '../diagnosis/components/DesignatedNotice.jsx';
import { BerryRouteStatus } from './BerryRouteStatus.jsx';

// 확정 문진 → 물량 입력. 후보 표시는 사진·상태 검토 이후 LotPanel에서 한 번만 한다.
// 형태는 문진 인계 값으로만 받는다. 확정 후 형태를 고르거나 수정하는 화면은 없다.
export function CaseRoutePanel({ caseId, caseTitle, wasteCode, classification, lotRecycling, recyclingFollowUp = false, onLotCreated, view = 'route', hasLot = false }) {
  const [materialDetail, setMaterialDetail] = useState(null);
  const [solidConfirmed, setSolidConfirmed] = useState(false);
  const [context, setContext] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const retry = () => setReload((value) => value + 1);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    setContext(null);
    workflowApi
      .caseNextStep(caseId, undefined, solidConfirmed, materialDetail)
      .then((next) => live && setContext(next))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [caseId, solidConfirmed, materialDetail, reload]);

  if (loading && !context) return <BerryRouteStatus text="문진 결과에 맞는 공정과 업체를 찾고 있어요" />;
  if (error && !context) return <div hidden={view !== 'route'}><RouteOutcome error={error} caseId={caseId} currentLabel={caseTitle} code={wasteCode} onRetry={retry} /></div>;
  if (!context) return null;

  const next = context.next_step;
  const designatedInfo = handoffDesignated(context.handoff);
  const currentForm = context.selected_form ?? null;
  const missingForm = context.status === 'needs_input' && context.available_forms?.length > 0 && !currentForm;
  const canRegister = !loading && canRegisterLot(context, currentForm);

  return (
    <div className="wf-panel route-recommendations" aria-busy={loading}>
      <div hidden={view !== 'info'}>
        <div className="wf-evidence-page-head"><span>분류 · 법적 근거</span><h2>확인 사항과 판단 근거</h2><p>확정 분류, 법령표의 재활용 유형, 다음 공정의 확인 사항을 구분해 확인하세요.</p></div>
        <div className="route-evidence-layout" aria-label="분류·확인 사항">
          <div className="route-evidence-main">
            <section className="wf-evidence-panel route-classification-status">
              <div className="wf-evidence-panel-head"><div><span>확정 분류</span><h3>분류 정보와 문진 기록</h3></div><strong>{context.handoff?.waste_code || wasteCode || '분류번호 미정'}</strong></div>
              <p>{classification}</p>
              <div className="route-info-links"><a href={`/wastes/case-${caseId}/survey`}>문진 대화</a><a href={`/wastes/case-${caseId}/history`}>판정 기록</a></div>
            </section>
            <InheritedForm context={context} />
            {(hasLot || context.recycling) && <section className="wf-evidence-panel"><div className="wf-evidence-panel-head"><div><span>법령표 근거</span><h3>재활용 유형과 분석 조건</h3></div></div>
              <RecyclingTypes assessment={hasLot ? lotRecycling || context.recycling : context.recycling} followUp={recyclingFollowUp} compact />
            </section>}
          </div>
          <aside className="wf-evidence-panel route-review-basis" aria-label="추천 기준과 확인 사항">
            <div className="wf-evidence-panel-head"><div><span>업체 추천 근거</span><h3>추천 기준과 확인 사항</h3></div></div>
            {context.warnings?.length > 0 && <div className="wf-evidence-alert"><strong>확인 필요 · {context.warnings.length}건</strong><ul>{context.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
            <p>{context.message}</p>
            {next && <div className="route-info-detail"><span>다음 공정 판단</span><strong>{next.code_label} · {next.current_state?.label}</strong><p>{next.message}</p></div>}
          </aside>
        </div>
      </div>
      <div hidden={view !== 'route' || hasLot} className="route-recommendations-main">
      {designatedInfo && <section className="designated-route" aria-label="지정폐기물 안내"><DesignatedBanner notice={designatedInfo} /><DesignatedNextActions notice={designatedInfo} caseId={caseId} handoff={context.handoff} /></section>}
      {context.requires_solid_confirmation && <label className="wf-card"><input type="checkbox" checked={solidConfirmed} disabled={loading} onChange={(event) => { setSolidConfirmed(event.target.checked); }} />현재 물량은 내용물을 비운 고체이며 액체·슬러지가 섞이지 않았어요.</label>}
      {!missingForm && <RouteOutcome status={context.status} next={next} message={context.status !== 'ready' ? context.message : undefined} currentLabel={next?.current_state?.label || caseTitle} code={context.handoff?.waste_code || wasteCode} caseId={caseId} onRetry={retry} busy={loading} />}
      {context.available_materials?.length > 0 && <fieldset className="wf-forms" disabled={loading}><legend>확인된 세부 재질</legend><p className="wf-muted">분류번호는 그대로 유지해요. 재질 표시나 성적서로 확인한 값만 선택하세요.</p>{[...context.available_materials, { value: 'unknown', label: '모름 · 혼합물이거나 목록에 없음' }].map((option) => <label key={option.value}><input type="radio" name="material-detail" value={option.value} checked={materialDetail === option.value} onChange={() => setMaterialDetail(option.value)} />{option.label}</label>)}</fieldset>}
      <DiagnosisFormStatus context={context} caseId={caseId} missing={missingForm} />
      {context.origin_label && <p className="wf-muted">출발 사업장: {context.origin_label}</p>}
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {loading && <BerryRouteStatus compact text="바뀐 조건으로 공정과 업체를 다시 확인하고 있어요" />}
      {!loading && context.status === 'ready' && next && (
        <>
          {canRegister ? (
            <div className="lot-registration"><LotRegisterForm key={`${currentForm}:${materialDetail}`} caseId={caseId} inputForm={currentForm} solidConfirmed={solidConfirmed} materialDetail={materialDetail} onCreated={onLotCreated} /></div>
          ) : (
            <p className="wf-card wf-muted">
              현재 선택한 재질·형태는 처리 건 등록을 지원하지 않아요. 분류·형태를 확인해 주세요.
            </p>
          )}
        </>
      )}
      </div>
    </div>
  );
}

// 문진에서 이어받은 현재 형태를 '분류·확인 사항'에 보여 준다. 선택·수정은 하지 않는다.
export function InheritedForm({ context }) {
  if (!context.selected_form) return null;
  return <section className="wf-evidence-panel route-current-form" aria-label="현재 형태">
    <div className="wf-evidence-panel-head"><div><span>현재 형태</span><h3>문진에서 확인한 물량 형태</h3></div><strong>{context.selected_form_label || context.selected_form}</strong></div>
    {context.form_quote && <details><summary>문진에서 말한 내용</summary><blockquote>{context.form_quote}</blockquote></details>}
  </section>;
}

// 문진 엔진의 형태 인계를 기다리며, 새 형태를 선택하거나 분류번호를 바꾸지 않는다.
export function DiagnosisFormStatus({ context, caseId, missing = false }) {
  if (missing) return <section className="wf-card" role="status" aria-label="문진 형태 연결 대기">
    <h3>문진 형태 정보 연결 대기</h3>
    <p>현재 형태는 문진에서 받아와요. 형태가 포함된 문진 결과가 연결되면 물량을 등록할 수 있어요.</p>
    <a href={`/wastes/case-${caseId}/survey`}>문진 기록 보기</a>
  </section>;
  if (!context.selected_form) return null;
  return <p className="wf-muted">문진에서 받은 형태: <strong>{context.selected_form_label || context.selected_form}</strong></p>;
}

// 지원 재질·형태는 실제 물량을 등록하면 업체에 인수 요청을 보내고 QR로 인계할 수 있다
function LotRegisterForm({ caseId, inputForm, solidConfirmed, materialDetail, onCreated }) {
  const [mass, setMass] = useState('');
  const [condition, setCondition] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const errorMessage = useRef(null);
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      onCreated(
        await registerLot(workflowApi.createLot, {
          diagnosisId: caseId,
          inputForm,
          solidConfirmed,
          materialDetail,
          massKg: Number(mass),
          condition: condition.trim(),
        }),
      );
    } catch (e) {
      setError(e.message);
      requestAnimationFrame(() => errorMessage.current?.focus());
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="wf-card wf-form" onSubmit={submit} noValidate aria-busy={busy}>
      <h3>현재 물량 알려주기</h3>
      <p className="wf-muted">현재 물량을 저장하면 사진을 첨부할 수 있어요. AI 검토가 끝난 뒤 공정·업체 후보에서 인수 요청할 곳을 선택하세요.</p>
      <label>
        중량(kg)
        <input type="number" min="0" step="any" required disabled={busy} value={mass} onChange={(e) => setMass(e.target.value)} placeholder="예: 250" />
      </label>
      <label>
        현재 상태 설명
        <textarea
          required
          disabled={busy}
          minLength={3}
          maxLength={1500}
          rows={3}
          placeholder="예) 이물질 거의 없음, 마대 20개, 일부 라벨·오염 있음"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
      </label>
      {error && <p ref={errorMessage} tabIndex={-1} className="wf-alert" role="alert">{error}</p>}
      <button className="register-submit facility-select facility-choose" type="submit" disabled={busy}>
        {busy ? '등록하는 중…' : '물량 저장하고 사진 추가'}
      </button>
    </form>
  );
}
