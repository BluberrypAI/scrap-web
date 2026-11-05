import { useState } from 'react';
import { ExitConfirmModal } from '../../components/ExitConfirmModal.jsx';
import { Icon } from '../../components/Icon.jsx';
import { WorkBar } from '../../components/WorkBar.jsx';
import { scrapTreatment } from '../../features/treatment/index.js';
import { useExitGuard } from '../../hooks/useExitGuard.js';
import { AgentNote } from './AgentNote.jsx';
import { BerryDock } from './BerryDock.jsx';
import { JudgingScreen } from './JudgingScreen.jsx';
import { LawArticleModal } from './LawArticleModal.jsx';
import {
  LAW_BASE_DATE,
  TOTAL_CANDIDATES,
  analysisRecycleTypes,
  evidenceItems,
  freeRecycleTypes,
  intakeCues,
  intakeExamples,
  surveySteps,
} from './surveyData.js';

export function SurveyPage({ waste }) {
  const [routeInput, setRouteInput] = useState(null);
  let [t, n] = useState(0),
    [r, i] = useState({}),
    [a, o] = useState(false),
    [s, c] = useState('intake'),
    [l, u] = useState(''),
    [d, f] = useState('어떤 폐기물인지 편하게 적어 주세요'),
    p = (e, t = 0) => {
      (f(e), e && t && window.setTimeout(() => f(null), t));
    },
    [m, h] = useState(false),
    [g, v] = useState(null);
  useExitGuard(h);
  let y = surveySteps[t],
    b = r[t],
    S = b === undefined ? undefined : y.options[b],
    w = !!S?.demo,
    ee = t === surveySteps.length - 1,
    te = w ? y.remaining : y.start,
    ne = y.start - te,
    T = [TOTAL_CANDIDATES];
  for (let e = 0; e <= t; e += 1)
    surveySteps[e].options[r[e]]?.demo && T.push(surveySteps[e].remaining);
  let re = a ? 'saving' : S ? 'answered' : 'unanswered',
    ie = {
      ...waste,
      name: '폐합성수지',
    },
    ae = (e) => {
      (i((n) => ({
        ...n,
        [t]: e,
      })),
        o(true),
        p('답변이 앞선 내용과 맞는지 살펴보고 있어요', 1400),
        window.setTimeout(() => o(false), 700));
    },
    oe = () => {
      if (w) {
        if (ee) {
          c('route-input');
          return;
        }
        n((e) => e + 1);
      }
    },
    se = () => {
      (i({}), n(0), c('question'), f(null));
    },
    ce = () => {
      l.trim() &&
        (c('reading'),
        p('입력하신 내용을 읽고 있어요'),
        window.setTimeout(() => {
          c((e) => (e === 'reading' ? (p('이렇게 읽었어요. 맞는지 확인해 주세요'), 'confirm') : e));
        }, 1400));
    },
    le = () => {
      (c('question'), p('질문 3개로 후보를 좁혀 볼게요', 2200));
    };
  return (
    <div
      className="l3-page sv-page"
      data-layer-name={s === 'result' ? 'L3-SurveyResult' : 'L3-Survey'}
      data-variant={re}
    >
      <WorkBar waste={ie} saveState={a ? 'saving' : 'saved'} onExit={() => h(true)} />
      <div className="survey-progress-track">
        <span
          style={{
            width: `${s === 'intake' || s === 'reading' || s === 'confirm' ? 0 : s === 'question' ? ((t + (w ? 1 : 0.4)) / surveySteps.length) * 100 : 100}%`,
          }}
        />
      </div>
      {(s === 'intake' || s === 'reading') && (
        <main className="sv-intake" data-layer-name="Survey-Intake">
          <p className="sv-context">(주)가천정밀 · 새 폐기물 문진</p>
          <h1>어떤 폐기물인가요?</h1>
          <p className="sv-helper">
            어떤 공정에서 무엇이 나오는지 편하게 적어 주세요. 적어 주신 만큼 질문이 줄어들어요.
          </p>
          <textarea
            className="sv-textarea"
            rows={5}
            value={l}
            onChange={(e) => u(e.target.value)}
            placeholder="예) 사출 공장에서 나오는 플라스틱 불량품이에요"
            disabled={s === 'reading'}
            aria-label="폐기물 설명"
          />
          <div className="sv-examples">
            <span>예시</span>
            {intakeExamples.map((e) => (
              <button type="button" onClick={() => u(e)} disabled={s === 'reading'} key={e}>
                {e}
              </button>
            ))}
          </div>
          <footer className="survey-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={le}
              disabled={s === 'reading'}
            >
              질문으로 바로 시작
            </button>
            {s === 'reading' ? (
              <button
                className="sv-demo-skip"
                type="button"
                onClick={() => {
                  (p('이렇게 읽었어요. 맞는지 확인해 주세요'), c('confirm'));
                }}
              >
                바로 확인 (데모)
                <Icon name="arrow" size={14} />
              </button>
            ) : (
              <button
                className="button button-primary"
                type="button"
                onClick={ce}
                disabled={!l.trim()}
              >
                베리에게 알려주기
                <Icon name="arrow" size={17} />
              </button>
            )}
          </footer>
        </main>
      )}
      {s === 'confirm' && (
        <main className="sv-intake" data-layer-name="Survey-Confirm">
          <p className="sv-context">(주)가천정밀 · 새 폐기물 문진</p>
          <h1>이렇게 이해했어요</h1>
          <p className="sv-helper">
            다르게 읽은 부분이 있다면 수정해 주세요. 확인하면 남은 질문으로 이어집니다.
          </p>
          <dl className="sv-cues">
            {intakeCues.map(([e, t]) => (
              <div key={e}>
                <dt>{e}</dt>
                <dd>{t}</dd>
              </div>
            ))}
          </dl>
          <footer className="survey-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={() => {
                (c('intake'), p('어떤 폐기물인지 편하게 적어 주세요'));
              }}
            >
              수정하기
            </button>
            <button className="button button-primary" type="button" onClick={le}>
              맞아요, 문진 시작
              <Icon name="arrow" size={17} />
            </button>
          </footer>
        </main>
      )}
      {s === 'question' && (
        <main className="sv-shell">
          <section className="sv-main" aria-labelledby="sv-question">
            <p className="sv-context">(주)가천정밀 · 10인 사출 공장 · 3번 라인 월 2.3톤 배출</p>
            <span className="sv-step">
              {t + 1}
              {' / '}
              {surveySteps.length}
            </span>
            <h1 id="sv-question">{y.title}</h1>
            {y.helper && <p className="sv-helper">{y.helper}</p>}
            {y.law && (
              <div className="sv-law">
                <p>
                  시행령 별표 1 제1호 가목은 지정폐기물 대상을{' '}
                  <strong>“폐합성 수지(고체상태의 것은 제외한다)”</strong>로 규정합니다.
                </p>
                <button type="button" onClick={() => v(1)}>
                  근거 조문 보기
                  <Icon name="arrow" size={14} />
                </button>
              </div>
            )}
            <fieldset className="survey-options sv-options" data-count={y.options.length}>
              <legend className="sr-only">답변 선택</legend>
              {y.options.map((e, n) => (
                <label className={b === n ? 'is-selected' : ''} key={e.label}>
                  <input
                    type="radio"
                    name={`survey-step-${t}`}
                    checked={b === n}
                    onChange={() => ae(n)}
                  />
                  <span className="radio-mark" />
                  <span className="option-index">{String(n + 1).padStart(2, '0')}</span>
                  <span className="sv-option-text">
                    <strong>{e.label}</strong>
                    {e.hint && <small>{e.hint}</small>}
                  </span>
                </label>
              ))}
            </fieldset>
            <footer className="survey-actions">
              <button
                className="button button-quiet"
                type="button"
                onClick={() => n((e) => Math.max(0, e - 1))}
                disabled={t === 0}
              >
                이전
              </button>
              {w ? (
                <button className="button button-primary" type="button" onClick={oe}>
                  {ee ? '재질·형태 확인' : '다음'}
                  <Icon name="arrow" size={17} />
                </button>
              ) : (
                <span className="survey-guide">
                  {S
                    ? '데모에서는 합성수지 · 고체 · 일반 합성수지류 경로만 제공돼요.'
                    : '답변을 선택하면 다음 단계로 이동할 수 있어요.'}
                </span>
              )}
            </footer>
          </section>
          <aside className="sv-panel" data-layer-name="CandidatePanel">
            <p className="sv-panel-label">남은 후보</p>
            <div className="sv-count">
              <strong key={te}>{te}</strong>
              <span>개</span>
              {ne > 0 && <em>−{ne}개 제외</em>}
            </div>
            <div className="sv-bar" aria-hidden="true">
              <span
                style={{
                  width: `${(te / TOTAL_CANDIDATES) * 100}%`,
                }}
              />
            </div>
            <ol className="sv-trail" aria-label="후보 수 변화">
              {T.map((e, t) => (
                <li className={t === T.length - 1 ? 'is-current' : ''} key={`${e}-${t}`}>
                  {e}
                </li>
              ))}
            </ol>
            <p className="sv-why">
              {y.start}
              {'개 후보를 '}
              {y.remaining}개로 줄이는 질문이에요.
            </p>
            {w && y.note && <p className="sv-note">{y.note}</p>}
          </aside>
        </main>
      )}
      {s === 'route-input' && (
        <main className="sv-intake">
          <scrapTreatment.SurveyMaterial
            onAnswer={(input) => {
              setRouteInput(input);
              c('judging');
            }}
          />
        </main>
      )}
      {s === 'judging' && (
        <JudgingScreen
          onBerry={f}
          onDone={() => {
            (f(null), c('result'));
          }}
        />
      )}
      {s === 'result' && (
        <main className="sv-result">
          <header className="sv-result-head">
            <div className="sv-badges">
              <span>사업장일반폐기물</span>
              <span>배출시설 운영 사업장</span>
            </div>
            <p className="sv-result-label">분류번호</p>
            <h1>51-03-01</h1>
            <p className="sv-result-name">폐합성수지류 (폐염화비닐수지류는 제외한다)</p>
            <AgentNote
              mode="lookup"
              text={`분류번호는 법령 기준표에서 조회한 결과입니다 · 법령 기준일 ${LAW_BASE_DATE}`}
            />
          </header>
          <section aria-labelledby="sv-evidence">
            <h2 id="sv-evidence" className="sv-h2">
              판정 근거
            </h2>
            <div className="sv-evidence">
              {evidenceItems.map((e, t) => (
                <article key={e.num}>
                  <span className="sv-evidence-num">{e.num}</span>
                  <h3>{e.title}</h3>
                  <p>{e.cite}</p>
                  {e.outcome && <strong>{e.outcome}</strong>}
                  <button type="button" onClick={() => v(t)}>
                    근거 조문 보기
                    <Icon name="arrow" size={14} />
                  </button>
                </article>
              ))}
            </div>
          </section>
          <section aria-labelledby="sv-recycle">
            <h2 id="sv-recycle" className="sv-h2">
              허용 재활용 유형
            </h2>
            <AgentNote mode="lookup" text="허용된 재활용 유형을 조회한 결과입니다" />
            <div className="sv-groups">
              <div className="sv-group is-free">
                <header>
                  <span className="lime-status" />
                  <div>
                    <strong>사전 분석·확인 해당 없음</strong>
                    <small>바로 진행할 수 있어요</small>
                  </div>
                  <em>{freeRecycleTypes.length}개</em>
                </header>
                <ul>
                  {freeRecycleTypes.map(([e, t]) => (
                    <li key={`${e}-free`}>
                      <b>{e}</b>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="sv-group is-analysis">
                <header>
                  <Icon name="clock" size={18} />
                  <div>
                    <strong>사전 분석·확인 해당</strong>
                    <small>분석 결과가 먼저 필요해요</small>
                  </div>
                  <em>{analysisRecycleTypes.length}개</em>
                </header>
                <ul>
                  {analysisRecycleTypes.map(([e, t]) => (
                    <li key={`${e}-analysis`}>
                      <b>{e}</b>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="sv-notice">
              <Icon name="spark" size={18} />
              <p>
                목표 재활용 유형에 따라 분석 요건이 달라집니다. 「해당 없음」 그룹은 바로 진행할 수
                있고, 고형연료·시멘트 보조연료로 가려면 폐기물분석전문기관의 분석이 먼저입니다.
              </p>
            </div>
          </section>
          <footer className="sv-result-actions">
            <button className="button button-quiet" type="button" onClick={se}>
              다시 문진하기
            </button>
            <scrapTreatment.Confirm id={waste.id} input={routeInput} />
          </footer>
        </main>
      )}
      <BerryDock message={d} />
      {g !== null && <LawArticleModal index={g} onClose={() => v(null)} />}
      {m && <ExitConfirmModal waste={ie} onContinue={() => h(false)} />}
    </div>
  );
}
