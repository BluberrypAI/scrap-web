import { useEffect, useState } from 'react';
import { workflowApi } from './api.js';
import { ProcessOption } from './FacilityCard.jsx';
import { FacilityMap } from './FacilityMap.jsx';
import { canRegisterLot } from './labels.js';

// 확정 문진 → 첫 처리 공정과 후보 업체.
// 분류번호·재질·사업장 위치는 서버가 확정 문진과 기업 정보에서 읽고, 화면은 현재 형태만 고른다.
export function CaseRoutePanel({ caseId, onLotCreated }) {
  const [form, setForm] = useState(null);
  const [context, setContext] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    workflowApi
      .caseNextStep(caseId, form)
      .then((next) => live && setContext(next))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [caseId, form]);

  async function review() {
    setReviewing(true);
    setError('');
    try {
      setContext(await workflowApi.caseIntakeReviews(caseId, form));
    } catch (e) {
      setError(e.message);
    } finally {
      setReviewing(false);
    }
  }

  if (loading && !context) return <p className="wf-muted">처리 공정을 불러오는 중…</p>;
  if (error && !context) return <p className="wf-alert" role="alert">{error}</p>;
  if (!context) return null;

  const next = context.next_step;
  const reviews = context.reviews?.results;
  const canRegister = context.status === 'ready' && canRegisterLot(context.route_input?.material, form);

  return (
    <div className="wf-panel">
      <p className="wf-lead">{context.message}</p>
      {context.warnings?.length > 0 && (
        <ul className="wf-warnings">
          {context.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {context.available_forms?.length > 0 && (
        <fieldset className="wf-forms">
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
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {context.status === 'ready' && next && (
        <>
          <p className="wf-muted">
            {next.code_label} · 현재 {next.current_state?.label}. {next.message}
          </p>
          <FacilityMap options={next.options} origin={context.origin} originLabel={context.origin_label}
            selectedKey={selectedKey} onSelect={setSelectedKey} />
          {next.options.map((option) => (
            <ProcessOption key={option.transition_key} option={option} reviews={reviews} selectedKey={selectedKey} />
          ))}
          <div className="wf-actions">
            <button className="button button-quiet" type="button" onClick={review} disabled={reviewing}>
              {reviewing ? '공개 근거를 검토하는 중… (최대 1~2분)' : reviews ? '업체 근거 다시 검토' : '업체 공개 근거 AI 검토'}
            </button>
          </div>
          {canRegister ? (
            <LotRegisterForm caseId={caseId} inputForm={form} onCreated={onLotCreated} />
          ) : (
            <p className="wf-card wf-muted">
              업체에 인수 요청을 보내고 QR로 인계하는 기능은 PP 사출 잔재·파쇄품, PE 필름, 사용 후 알루미늄 음료캔만
              지원해요. 이 물량은 후보 업체와 공개 근거까지 확인할 수 있어요.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// 지원 재질·형태는 실제 물량을 등록하면 업체에 인수 요청을 보내고 QR로 인계할 수 있다
function LotRegisterForm({ caseId, inputForm, onCreated }) {
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
