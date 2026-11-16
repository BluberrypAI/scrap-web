import { useEffect, useRef, useState } from 'react';
import { workflowApi } from './api.js';
import { CandidateBrowser } from './CandidateBrowser.jsx';
import { Icon } from '../../components/Icon.jsx';
import { canRegisterLot } from './labels.js';
import { registerLot } from './registration.js';

// 확정 문진 → 첫 처리 공정과 후보 업체.
// 분류번호·재질·사업장 위치는 서버가 확정 문진과 기업 정보에서 읽고, 화면은 현재 형태만 고른다.
export function CaseRoutePanel({ caseId, onLotCreated }) {
  const [form, setForm] = useState(null);
  const [context, setContext] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [preferred, setPreferred] = useState(null);
  const registerSection = useRef(null);

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
  const canRegister = context.status === 'ready' && canRegisterLot(context.route_input?.material, form, context.route_input?.waste_code);

  return (
    <div className="wf-panel route-recommendations" aria-busy={loading || reviewing}>
      <details className="route-notes"><summary>추천 기준과 확인 사항{context.warnings?.length ? ` · ${context.warnings.length}건` : ''}</summary><p>{context.message}</p>
      {context.warnings?.length > 0 && (
        <ul className="wf-warnings">
          {context.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {next && <p className="wf-muted">{next.code_label} · {next.current_state?.label}. {next.message}</p>}
      </details>
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
                onChange={() => { setForm(option.value); setPreferred(null); setSelectedKey(null); }}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}
      {context.origin_label && <p className="wf-muted">출발 사업장: {context.origin_label}</p>}
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {loading && <p className="wf-muted" role="status">선택한 형태의 공정과 업체를 불러오고 있어요…</p>}
      {!loading && context.status === 'ready' && next && (
        <>
          <div className="candidate-review-bar"><div><Icon name="spark" size={19} /><span><strong>공개 근거 검토</strong><small>업체별 자료를 확인하고 추가 확인 사항을 정리해요.</small></span></div>
            <button className="button button-quiet" type="button" onClick={review} disabled={reviewing}>
              {reviewing ? '공개 근거를 검토하는 중… (최대 1~2분)' : reviews ? '업체 근거 다시 검토' : '업체 공개 근거 AI 검토'}
            </button>
          </div>
          <CandidateBrowser key={form || 'initial'} options={next.options} reviews={reviews} origin={context.origin} originLabel={context.origin_label} selectedKey={selectedKey} onSelect={setSelectedKey}
            renderAction={(facility) => canRegister && <button className={`button ${preferred?.capability_key === facility.capability_key ? 'button-primary' : 'button-quiet'} facility-select`} type="button" aria-pressed={preferred?.capability_key === facility.capability_key} onClick={() => { setPreferred(facility); setSelectedKey(facility.facility_key); registerSection.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>{preferred?.capability_key === facility.capability_key ? '선택됨 · 물량 입력하기' : '이 업체 선택'}<Icon name="arrow" size={16} /></button>} />
          {canRegister ? (
            <div ref={registerSection} className="lot-registration"><LotRegisterForm caseId={caseId} inputForm={form} preferred={preferred} onCreated={onLotCreated} /></div>
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
function LotRegisterForm({ caseId, inputForm, preferred, onCreated }) {
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
          massKg: Number(mass),
          condition: condition.trim(),
        }), preferred,
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
      <h3>{preferred ? `${preferred.label} 검토 준비` : '처리할 물량 등록'}</h3>
      <p className="wf-muted">중량과 상태를 입력해 주세요. 등록 후 업체 검토를 거쳐 인수 요청을 보낼 수 있어요.</p>
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
      <button className="button button-primary" type="submit" disabled={busy}>
        {busy ? '등록하는 중…' : '처리 건 등록하고 계속'}
      </button>
    </form>
  );
}
