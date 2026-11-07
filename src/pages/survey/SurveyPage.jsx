import { useRef, useState } from 'react';
import { ExitConfirmModal } from '../../components/ExitConfirmModal.jsx';
import { Icon } from '../../components/Icon.jsx';
import { WorkBar } from '../../components/WorkBar.jsx';
import { scrapTreatment } from '../../features/treatment/index.js';
import { useExitGuard } from '../../hooks/useExitGuard.js';
import { AgentNote } from './AgentNote.jsx';
import { BerryDock } from './BerryDock.jsx';
import { JudgingScreen } from './JudgingScreen.jsx';
import { LawArticleModal } from './LawArticleModal.jsx';
import { holdReason, initialAnswers, materials, outsideScope, routeInput } from './surveyScope.js';

async function classify(path, body) {
  const response = await fetch('/api/classification/sessions' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('문진 엔진에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  const data = await response.json();
  if (!data?.session_id) throw new Error('문진 응답을 확인하지 못했어요.');
  return data;
}

function SurveyChoices({ options, selected, onSelect, disabled }) {
  return <fieldset className="survey-options sv-options" data-count={options.length} disabled={disabled}>
    <legend className="sr-only">답변 선택</legend>
    {options.map((option, index) => <label className={selected === option.id ? 'is-selected' : ''} key={option.id}>
      <input type="radio" name="survey-choice" checked={selected === option.id} onChange={() => onSelect(option.id)} />
      <span className="radio-mark" />
      <span className="option-index">{String(index + 1).padStart(2, '0')}</span>
      <span className="sv-option-text"><strong>{option.label}</strong>
        {option.hint && <small>{option.hint}</small>}</span>
    </label>)}
  </fieldset>;
}

const recyclingGroups = [
  ['free', '사전 분석·확인 비해당'], ['analysis', '사전 분석·확인 해당'], ['unmarked', '분석 요건 확인 필요'],
];

export function SurveyPage({ waste }) {
  const [material, setMaterial] = useState(null);
  const [form, setForm] = useState(null);
  const [view, setView] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hold, setHold] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [article, setArticle] = useState(null);
  const [exitOpen, setExitOpen] = useState(false);
  const requesting = useRef(false);
  useExitGuard(setExitOpen);

  async function update(path, data) {
    if (requesting.current) return;
    requesting.current = true;
    setBusy(true);
    setError('');
    try {
      setView(await classify(path, data));
      setSelected(null);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
      requesting.current = false;
    }
  }

  function restart() {
    setMaterial(null);
    setForm(null);
    setView(null);
    setSelected(null);
    setHold(null);
    setError('');
  }

  const profile = materials.find(({ key }) => key === material);
  const chosenForm = profile?.forms.length === 1 ? profile.forms[0] : profile?.forms.find(({ key }) => key === form);
  const question = view?.question;
  const result = view?.result;
  const ready = !hold && profile && chosenForm && view ? routeInput(view, profile, chosenForm) : null;
  const step = view?.step;
  const lot = profile ? { ...waste, name: profile.label } : waste;
  const berry = hold || result ? '분류 결과와 확인할 내용을 살펴봐요.'
    : question ? '지금 아는 사실만 골라 주세요.' : '배출하려는 자원의 재질과 형태를 골라 주세요.';

  function answer() {
    const option = question.options.find(({ id }) => id === selected);
    if (!option) return;
    const reason = holdReason(option.answers);
    if (reason) setHold(reason);
    else update('/' + encodeURIComponent(view.session_id) + '/answer', { answers: option.answers });
  }

  return <div className="l3-page sv-page" data-layer-name={result || hold ? 'L3-SurveyResult' : 'L3-Survey'}>
    <WorkBar waste={lot} saveState={busy ? 'saving' : 'saved'} onExit={() => setExitOpen(true)} />
    <div className="survey-progress-track">
      <span style={{ width: hold || result ? '100%' : step?.total ? (step.index / step.total) * 100 + '%' : '0%' }} />
    </div>
    {error && <p className="sv-helper" role="alert">{error}</p>}
    {!view && !hold && (busy ? <JudgingScreen /> : <main className="sv-intake" data-layer-name="Survey-Intake">
      <p className="sv-context">새 폐기물 문진 · 지원하는 고형물</p>
      <h1>어떤 자원을 배출하나요?</h1>
      <p className="sv-helper">분류를 확인하면 다음 처리업체를 찾고 기업 간 인계와 실제 산출물을 추적할 수 있어요.</p>
      <SurveyChoices options={materials.map(({ key, label }) => ({ id: key, label }))} selected={material}
        onSelect={(key) => { setMaterial(key); setForm(null); setError(''); }} />
      {profile?.forms.length > 1 && <label>현재 형태
        <select value={form ?? ''} onChange={(event) => setForm(event.target.value)}>
          <option value="">현재 형태 선택</option>
          {profile.forms.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>}
      <footer className="survey-actions">
        <button className="button button-quiet" type="button" onClick={() => setHold(outsideScope)}>
          기타 재질·형태 또는 모름
        </button>
        <button className="button button-primary" type="button" disabled={!chosenForm}
          onClick={() => update('', { waste_id: waste.id, answers: initialAnswers(profile, chosenForm) })}>
          문진 시작 <Icon name="arrow" size={17} />
        </button>
      </footer>
    </main>)}
    {question && !hold && <main className="sv-shell">
      <section className="sv-main" aria-labelledby="sv-question">
        <p className="sv-context">{profile.label} · {chosenForm.label}</p>
        {step && <span className="sv-step">{step.index} / {step.total}</span>}
        <h1 id="sv-question">{question.title}</h1>
        {question.helper && <p className="sv-helper">{question.helper}</p>}
        {question.law && <div className="sv-law">
          <p>{question.law.lead} <strong>{question.law.quote}</strong> {question.law.tail}</p>
          <button type="button" onClick={() => setArticle({ ...question.law, title: question.title, reason: question.helper })}>
            근거 조문 보기 <Icon name="arrow" size={14} />
          </button>
        </div>}
        <SurveyChoices options={question.options} selected={selected} onSelect={setSelected} disabled={busy} />
        <footer className="survey-actions">
          <button type="button" className="button button-quiet" disabled={busy}
            onClick={() => view.can_undo ? update('/' + encodeURIComponent(view.session_id) + '/undo', {}) : restart()}>
            이전
          </button>
          <button type="button" className="button button-primary" disabled={busy || selected === null} onClick={answer}>
            다음 <Icon name="arrow" size={17} />
          </button>
        </footer>
      </section>
      <aside className="sv-panel" data-layer-name="CandidatePanel">
        <p className="sv-panel-label">{view.panel.label}</p>
        <div className="sv-count"><strong>{view.panel.count}</strong><span>개</span></div>
        {view.panel.trail?.length > 1 && <ol className="sv-trail" aria-label="후보 수 변화">
          {view.panel.trail.map((count, index) => <li key={index}
            className={index === view.panel.trail.length - 1 ? 'is-current' : ''}>{count}</li>)}
        </ol>}
        <p className="sv-why">{view.panel.why}</p>
      </aside>
    </main>}
    {(hold || (result && !question)) && <main className="sv-result">
      <div className="sv-result-title">
        <span>STEP 01 · 분류 검토</span>
        <h1>{ready ? '분류 결과를 확인했어요' : '확인 대기'}</h1>
        <p>{hold || (ready ? '결과를 저장하면 경로 준비 카드에서 기업 간 처리 흐름을 추적할 수 있어요.'
          : result?.message || '선택한 재질·형태의 처리경로를 만들기 전에 분류와 배출 조건을 확인해 주세요.')}</p>
        {ready && <ol className="sv-result-transition" aria-label="폐기물 처리 진행 단계">
          <li className="is-complete"><b>01</b><span>분류 확인</span><em>완료</em></li>
          <li className="sv-result-transition-arrow" aria-hidden="true">→</li>
          <li><b>02</b><span>경로 준비</span><em>카드 생성 예정</em></li>
        </ol>}
      </div>
      {!hold && <>
        <header className="sv-result-head">
          <div className="sv-badges">{result.badges?.map((badge) => <span key={badge}>{badge}</span>)}</div>
          {result.code && <><p className="sv-result-label">{result.provisional ? '잠정 분류번호' : '분류번호'}</p>
            <strong className="sv-result-code">{result.code}</strong>
            <p className="sv-result-name">{result.name}</p></>}
          {result.note && <AgentNote mode="lookup" text={result.note} />}
        </header>
        {result.evidence?.length > 0 && <section aria-labelledby="sv-evidence">
          <h2 className="sv-h2" id="sv-evidence">판정 근거</h2>
          <div className="sv-evidence">{result.evidence.map((item) => <article key={item.num}>
            <span className="sv-evidence-num">{item.num}</span><h3>{item.title}</h3><p>{item.cite}</p>
            {item.outcome && <strong>{item.outcome}</strong>}
            <button type="button" onClick={() => setArticle(item)}>근거 조문 보기 <Icon name="arrow" size={14} /></button>
          </article>)}</div>
        </section>}
        {result.recycle?.status === 'ALLOWED' && <section className="sv-recycle-section">
          <h2 className="sv-h2">재활용 유형</h2>
          <div className="sv-groups">{recyclingGroups.map(([group, title]) => result.recycle[group]?.length > 0 &&
            <div className={'sv-group ' + (group === 'free' ? 'is-free' : 'is-analysis')} key={group}>
              <header><strong>{title}</strong><em>{result.recycle[group].length}개</em></header>
              <ul>{result.recycle[group].map(([code, label]) =>
                <li key={code}><b>{code}</b><span>{label}</span></li>)}</ul>
            </div>)}</div>
        </section>}
      </>}
      <footer className="sv-result-actions">
        <button type="button" className="button button-quiet" onClick={restart}>다시 문진하기</button>
        {hold && question && <button className="button button-quiet" type="button" onClick={() => {
          setHold(null);
          setSelected(null);
        }}>답변 다시 고르기</button>}
        {ready && <scrapTreatment.Confirm id={waste.id} input={ready} />}
      </footer>
    </main>}
    <BerryDock message={berry} />
    {article && <LawArticleModal article={article} code={result?.code} asOf={view?.as_of} onClose={() => setArticle(null)} />}
    {exitOpen && <ExitConfirmModal waste={lot} onContinue={() => setExitOpen(false)} />}
  </div>;
}
