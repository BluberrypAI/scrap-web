import { useState } from 'react';
import { WorkBar } from '../../components/WorkBar.jsx';
import { scrapTreatment } from '../../features/treatment/index.js';

const treatmentMaterials = new Set(['PP', 'PE', 'PET', 'aluminium']);

async function classify(path, data) {
  const response = await fetch('/api/classification/sessions' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('문진 엔진에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  return response.json();
}

export function SurveyPage({ waste }) {
  const [view, setView] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [routeInput, setRouteInput] = useState(null);

  async function update(path, data) {
    setBusy(true);
    setError('');
    try {
      setView(await classify(path, data));
      setSelected(null);
      setConfirmed(false);
      setRouteInput(null);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  const session = view ? '/' + encodeURIComponent(view.session_id) : '';
  const start = () => update('', { waste_id: waste.id });
  const back = () => update(session + '/undo', {});
  const question = view?.question;
  const result = view?.result;
  const treatment = result?.treatment;
  const supported = Boolean(result?.kind === 'code' && treatmentMaterials.has(treatment?.material) &&
    treatment.waste_code === result.code);

  return <div className="l3-page sv-page">
    <WorkBar waste={waste} saveState={busy ? 'saving' : 'saved'}
      onExit={() => { location.hash = '#/wastes'; }} />
    {error && <p role="alert" className="sv-helper">{error}</p>}
    {!view && <main className="sv-intake">
      <h1>폐기물 분류 문진</h1>
      <p>재질과 발생 조건을 확인해 분류번호 후보를 좁혀요.</p>
      <button className="button button-primary" type="button" onClick={start} disabled={busy}>
        {busy ? '문진 불러오는 중…' : '문진 시작'}
      </button>
    </main>}
    {question && <main className="sv-shell">
      <section className="sv-main" aria-labelledby="sv-question">
        <span className="sv-step">{view.step.index} / {view.step.total}</span>
        <h1 id="sv-question">{question.title}</h1>
        {question.helper && <p className="sv-helper">{question.helper}</p>}
        {question.law && <div className="sv-law"><p>{question.law.lead}{' '}
          <strong>{question.law.quote}</strong>{' '}{question.law.tail}</p></div>}
        <fieldset className="survey-options sv-options" data-count={question.options.length} disabled={busy}>
          <legend className="sr-only">답변 선택</legend>
          {question.options.map((option, index) => <label key={option.id}
            className={selected === option.id ? 'is-selected' : ''}>
            <input type="radio" name="classification" checked={selected === option.id}
              onChange={() => setSelected(option.id)} />
            <span className="radio-mark" />
            <span className="option-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="sv-option-text"><strong>{option.label}</strong>
              {option.hint && <small>{option.hint}</small>}</span>
          </label>)}
        </fieldset>
        <footer className="survey-actions">
          <button type="button" className="button button-quiet" disabled={busy || !view.can_undo} onClick={back}>이전</button>
          <button type="button" className="button button-primary" disabled={busy || selected === null}
            onClick={() => update(session + '/answer', { answers: question.options.find((item) => item.id === selected).answers })}>
            다음
          </button>
        </footer>
      </section>
      <aside className="sv-panel">
        <p className="sv-panel-label">{view.panel.label}</p>
        <strong>{view.panel.count}개</strong>
        <p>{view.panel.why}</p>
      </aside>
    </main>}
    {result && <main className="sv-result">
      <header className="sv-result-head">
        <div className="sv-badges">{result.badges?.map((badge) => <span key={badge}>{badge}</span>)}</div>
        <p className="sv-result-label">분류 결과</p>
        <h1>{result.code || '분류 확인 필요'}</h1>
        {result.name && <p className="sv-result-name">{result.name}</p>}
        <p>{result.note}</p>
      </header>
      {result.evidence?.length > 0 && <section>
        <h2 className="sv-h2">판정 근거</h2>
        <div className="sv-evidence">{result.evidence.map((item) => <article key={item.num}>
          <h3>{item.title}</h3><p>{item.cite}</p>
          {item.outcome && <strong>{item.outcome}</strong>}
          <details><summary>근거 보기</summary><p>{item.quote}</p><p>{item.reason}</p></details>
        </article>)}</div>
      </section>}
      {result.recycle && <section className="sv-groups">
        {[['free', '사전 분석·확인 해당 없음'], ['analysis', '사전 분석·확인 해당']].map(([key, title]) =>
          <details className="sv-group" key={key}><summary>{title}</summary>
            <ul>{result.recycle[key]?.map(([code, label]) => <li key={code}>{code} · {label}</li>)}</ul>
          </details>)}
      </section>}
      <footer className="sv-result-actions">
        <button className="button button-quiet" type="button" disabled={busy} onClick={start}>다시 문진하기</button>
        {!supported ? <p>{result.kind === 'code' && result.code
          ? '이 번호로 명부를 조회할 수 있어요. 공정과 인수 조건은 업체에 확인해 주세요.'
          : '분류번호를 확인하면 업체 명부를 조회할 수 있어요.'}</p> : <>
          <label><input type="checkbox" checked={confirmed} onChange={(event) => {
            setConfirmed(event.target.checked);
            if (!event.target.checked) setRouteInput(null);
          }} /> 분류번호와 재질을 확인했어요.</label>
          {confirmed && !routeInput && <scrapTreatment.SurveyMaterial treatment={treatment} onAnswer={setRouteInput} />}
          {confirmed && routeInput && <scrapTreatment.Confirm id={waste.id} input={{
            ...routeInput, classificationProvisional: Boolean(result.provisional), classificationAsOf: view.as_of,
          }} />}
        </>}
      </footer>
      {!supported && result.kind === 'code' && result.code &&
        <scrapTreatment.RegistrySearch key={result.code} wasteCode={result.code} />}
    </main>}
  </div>;
}
