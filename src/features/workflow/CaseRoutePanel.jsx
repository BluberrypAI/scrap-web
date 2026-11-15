import { useEffect, useState } from 'react';
import { workflowApi } from './api.js';
import { ProcessOption } from './FacilityCard.jsx';
import { NearbyCandidates } from './NearbyCandidates.jsx';
import { canRegisterLot } from './labels.js';
import { RouteOutcome } from './RouteOutcome.jsx';
import { hasFacilities, routeOutcome } from './route-result.js';

// 확정 문진 → 첫 처리 공정과 후보 업체.
// 분류번호·사업장 위치는 서버에서 읽고, 문진에 빠진 세부 재질과 현재 형태만 보충한다.
export function CaseRoutePanel({ caseId, caseTitle, wasteCode, onLotCreated }) {
  const [form, setForm] = useState(null);
  const [materialDetail, setMaterialDetail] = useState(null);
  const [solidConfirmed, setSolidConfirmed] = useState(false);
  const [context, setContext] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [reload, setReload] = useState(0);
  const retry = () => setReload((value) => value + 1);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    setContext(null);
    setSelectedKey(null);
    workflowApi
      .caseNextStep(caseId, form, solidConfirmed, materialDetail)
      .then((next) => live && setContext(next))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [caseId, form, solidConfirmed, materialDetail, reload]);

  async function review() {
    setReviewing(true);
    setError('');
    try {
      setContext(await workflowApi.caseIntakeReviews(caseId, form, solidConfirmed, materialDetail));
    } catch (e) {
      setError(e.message);
    } finally {
      setReviewing(false);
    }
  }

  if (loading && !context) return <p className="wf-muted">처리 공정을 불러오는 중…</p>;
  if (!context) return <RouteOutcome error={error} caseId={caseId} currentLabel={caseTitle} code={wasteCode} onRetry={retry} />;

  const next = context.next_step;
  const reviews = context.reviews?.results;
  const canRegister = !loading && canRegisterLot(context, form);
  const outcome = routeOutcome({ status: context.status, next });
  const material = context.handoff?.facts?.material?.value;

  return (
    <div className="wf-panel">
      {!outcome && <p className="wf-lead">{context.message}</p>}
      {context.requires_solid_confirmation && <label className="wf-card">
        <input type="checkbox" checked={solidConfirmed} disabled={reviewing}
          onChange={event => setSolidConfirmed(event.target.checked)} />
        현재 물량은 내용물을 비운 고체입니다. 액체·슬러지가 섞인 상태가 아닙니다.
      </label>}
      <RouteOutcome status={context.status} next={next} message={context.status !== 'ready' ? context.message : undefined}
        currentLabel={next?.current_state?.label || caseTitle || (typeof material === 'string' ? material.toUpperCase() : undefined)}
        code={context.handoff?.waste_code || wasteCode} caseId={caseId} onRetry={retry} busy={reviewing} />
      {context.available_materials?.length > 0 && (
        <fieldset className="wf-forms" disabled={reviewing}>
          <legend>확인된 세부 재질</legend>
          <p className="wf-muted">분류번호는 그대로 유지해요. 재질 표시나 성적서로 확인한 값만 선택하세요.</p>
          {[...context.available_materials, { value: 'unknown', label: '모름 · 혼합물이거나 목록에 없음' }].map(option => (
            <label key={option.value}>
              <input type="radio" name="material-detail" value={option.value}
                checked={materialDetail === option.value}
                onChange={() => { setForm(null); setMaterialDetail(option.value); }} />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}
      {context.available_forms?.length > 0 && (
        <fieldset className="wf-forms" disabled={reviewing}>
          <legend>지금 물량의 형태</legend>
          {context.available_forms.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="input-form"
                value={option.value}
                checked={form === option.value}
                onChange={() => setForm(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}
      {context.origin_label && <p className="wf-muted">출발 사업장: {context.origin_label}</p>}
      {context.warnings?.length > 0 && (
        <details className="wf-more" open={context.status === 'review_required' ? true : undefined}>
          <summary>문진에서 확인할 사항 {context.warnings.length}개</summary>
          <ul className="wf-warnings">{context.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </details>
      )}
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {context.status === 'ready' && next && (
        <>
          {!outcome && <p className="wf-muted">
            {next.code_label} · 현재 {next.current_state?.label}. {next.message}
          </p>}
          <NearbyCandidates options={next.options} origin={context.origin} originLabel={context.origin_label}
            selectedKey={selectedKey} onSelect={setSelectedKey}>
          {(option) => (
            <ProcessOption key={option.transition_key} option={option} reviews={reviews} selectedKey={selectedKey} />
          )}
          </NearbyCandidates>
          {next.status === 'candidates' && hasFacilities(next) && <div className="wf-actions">
            <button className="button button-quiet" type="button" onClick={review} disabled={reviewing}>
              {reviewing ? '공개 근거를 검토하는 중… (최대 1~2분)' : reviews ? '업체 근거 다시 검토' : '업체 공개 근거 AI 검토'}
            </button>
          </div>}
          {canRegister ? (
            <LotRegisterForm caseId={caseId} inputForm={form} materialDetail={materialDetail} solidConfirmed={solidConfirmed} onCreated={onLotCreated} />
          ) : (
            <p className="wf-card wf-muted">
              분류 결과와 현재 형태를 확인한 뒤 처리 건을 등록할 수 있어요.
              업체의 실제 인수 여부는 업체 검토와 수신 기업 확인을 거쳐 결정돼요.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// 지원 재질·형태는 실제 물량을 등록하면 업체에 인수 요청을 보내고 QR로 인계할 수 있다
function LotRegisterForm({ caseId, inputForm, solidConfirmed, materialDetail, onCreated }) {
  const [mass, setMass] = useState('');
  const [condition, setCondition] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onCreated(
        await workflowApi.createLot({
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
      setBusy(false);
    }
  }
  return (
    <form className="wf-card wf-form" onSubmit={submit}>
      <h3>실제 물량 등록하고 업체에 인계하기</h3>
      <p className="wf-muted">등록하면 사진을 붙여 업체 검토를 받고, 업체에 인수 요청을 보낼 수 있어요.</p>
      <label>
        중량(kg)
        <input type="number" min="0.1" step="0.1" required value={mass} onChange={(e) => setMass(e.target.value)} />
      </label>
      <label>
        현재 상태 설명
        <textarea
          required
          minLength={3}
          maxLength={1500}
          rows={3}
          placeholder="예) 이물질 거의 없음, 마대 20개, 일부 라벨·오염 있음"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
      </label>
      {error && <p className="wf-alert" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={busy || !mass || condition.trim().length < 3}>
        {busy ? '등록하는 중…' : '처리 건 등록'}
      </button>
    </form>
  );
}
