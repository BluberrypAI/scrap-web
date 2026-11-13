import { useEffect, useState } from 'react';
import { ExitConfirmModal } from '../../components/ExitConfirmModal.jsx';
import { Icon } from '../../components/Icon.jsx';
import { WorkBar } from '../../components/WorkBar.jsx';
import { scrapTreatment } from '../../features/treatment/index.js';
import { useExitGuard } from '../../hooks/useExitGuard.js';
import { ApiError, api } from '../../lib/api.js';
import { AgentNote } from './AgentNote.jsx';
import { BerryDock } from './BerryDock.jsx';
import { JudgingScreen } from './JudgingScreen.jsx';
import { LawArticleModal } from './LawArticleModal.jsx';
import {
  LAW_BASE_DATE,
  analysisRecycleTypes,
  evidenceItems,
  freeRecycleTypes,
  intakeCues,
  intakeExamples,
} from './surveyData.js';

// 문진 엔진 오류를 베리 말풍선 문구로
function errorText(error) {
  if (error instanceof ApiError && error.code === 'ENGINE_UNAVAILABLE')
    return '문진 엔진에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
  return error instanceof ApiError ? error.message : '서버에 연결하지 못했어요.';
}

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
  // 문진 엔진 건과 마지막 턴. 질문·선택지·남은 후보·결과는 모두 이 턴에서 읽는다
  const [caseId, setCaseId] = useState(null);
  const [turn, setTurn] = useState(null);
  const [counts, setCounts] = useState([]);
  const question = turn?.ui?.question;
  const board = turn?.ui?.board;
  const result = turn?.branch === 'FINAL_REVIEW' ? turn.ui.result : null;
  const maxQuestions = board?.progress?.max_questions || 12;
  const showTurn = (next) => {
    setTurn(next);
    const count = next?.ui?.board?.candidates_count;
    if (typeof count === 'number') setCounts((list) => [...list, count]);
    if (next?.branch === 'FINAL_REVIEW') {
      c('route-input');
    } else if (next?.message) {
      p(next.message, 4000);
    }
  };
  const startCase = (memo) => {
    o(true);
    p('입력하신 내용을 읽고 있어요');
    api.diagnosis
      .createCase(memo ? { memo } : {})
      .then((created) => {
        setCaseId(created.case.id);
        setCounts([]);
        n(0);
        i({});
        c('question');
        showTurn(created.turn);
      })
      .catch((error) => {
        c('intake');
        p(errorText(error));
      })
      .finally(() => o(false));
  };
  // 목록 카드(case-<엔진 건 ID>)에서 들어오면 그 건의 마지막 턴부터 이어서 보여 준다
  useEffect(() => {
    if (!waste.id.startsWith('case-')) return;
    const id = waste.id.slice('case-'.length);
    api.diagnosis
      .getCase(id)
      .then((detail) => {
        setCaseId(id);
        n(detail.conversation?.filter((item) => item.role === 'user').length || 0);
        c('question');
        showTurn(detail.latest_turn);
      })
      .catch((error) => p(errorText(error)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waste.id]);
  let y = question
      ? {
          title: question.text,
          helper: question.help,
          options: question.options.map((option) => ({ label: option.label, reply: option })),
        }
      : { title: turn?.message || '', options: [] },
    b = r[t],
    S = b === undefined ? undefined : y.options[b],
    w = false,
    ee = false,
    te = counts.at(-1) ?? 0,
    ne = counts.length > 1 ? counts.at(-2) - te : 0,
    T = counts;
  y.start = counts.at(-2) ?? te;
  y.remaining = te;
  let re = a ? 'saving' : S ? 'answered' : 'unanswered',
    ie = {
      ...waste,
      name: result?.name || waste.name,
    },
    ae = (e) => {
      if (a || !caseId) return;
      const reply = y.options[e].reply;
      (i((n) => ({
        ...n,
        [t]: e,
      })),
        o(true),
        p('답변이 앞선 내용과 맞는지 살펴보고 있어요'));
      api.diagnosis
        .send(caseId, { quick_reply: { key: question.key, kind: reply.kind, value: reply.value } })
        .then((next) => {
          n((step) => step + 1);
          showTurn(next);
        })
        .catch((error) => {
          i({});
          p(errorText(error));
        })
        .finally(() => o(false));
    },
    oe = () => {},
    se = () => {
      (setCaseId(null), setTurn(null), setCounts([]), i({}), n(0), c('intake'), f('어떤 폐기물인지 편하게 적어 주세요'));
    },
    ce = () => {
      l.trim() && (c('reading'), startCase(l.trim()));
    },
    le = () => {
      startCase(null);
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
            width: `${s === 'intake' || s === 'reading' || s === 'confirm' ? 0 : s === 'question' ? ((t + 0.4) / maxQuestions) * 100 : 100}%`,
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
              {' / 최대 '}
              {maxQuestions}
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
                disabled
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
                    ? '답변을 반영하고 있어요.'
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
                  width: `${counts.length ? (te / Math.max(...counts)) * 100 : 0}%`,
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
            {ne > 0 && (
              <p className="sv-why">
                {y.start}
                {'개 후보를 '}
                {y.remaining}개로 줄였어요.
              </p>
            )}
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
              if (turn?.ui?.can_confirm) {
                api.diagnosis.confirm(caseId).catch((error) => p(errorText(error)));
              }
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
          <div className="sv-result-title">
            <span>STEP 01 · 분류 확인 완료</span>
            <h1>폐기물 분류가 확정됐어요</h1>
            <p>분류 결과를 저장하면 이 폐기물의 Step 02 경로 준비 카드가 생성됩니다.</p>
            <ol className="sv-result-transition" aria-label="폐기물 처리 진행 단계">
              <li className="is-complete">
                <b>01</b>
                <span>분류 확인</span>
                <em>완료</em>
              </li>
              <li className="sv-result-transition-arrow" aria-hidden="true">→</li>
              <li>
                <b>02</b>
                <span>경로 준비</span>
                <em>카드 생성 예정</em>
              </li>
            </ol>
          </div>
          <header className="sv-result-head">
            {result?.category_label && (
              <div className="sv-badges">
                <span>{result.category_label}</span>
              </div>
            )}
            <p className="sv-result-label">{result?.code ? '분류번호' : '판정 결과'}</p>
            <strong className="sv-result-code">{result?.code || '분류번호 없음'}</strong>
            <p className="sv-result-name">{result?.name || result?.conclusion}</p>
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
          <section className="sv-recycle-section" aria-labelledby="sv-recycle">
            <header className="sv-recycle-head">
              <div>
                <h2 id="sv-recycle">허용 재활용 유형</h2>
                <p>분류 결과에 따라 바로 진행할 수 있는 유형과 사전 분석이 필요한 유형을 나눴어요.</p>
              </div>
              <strong>총 {freeRecycleTypes.length + analysisRecycleTypes.length}개</strong>
            </header>
            <div className="sv-groups">
              <div className="sv-group is-free">
                <header>
                  <span className="sv-group-index" aria-hidden="true">01</span>
                  <div>
                    <strong>바로 진행 가능</strong>
                    <small>사전 분석·확인 해당 없음</small>
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
                  <span className="sv-group-index" aria-hidden="true">02</span>
                  <div>
                    <strong>사전 분석 필요</strong>
                    <small>분석 결과를 확인한 뒤 진행해요</small>
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
                선택한 재활용 방식에 따라 필요한 절차가 달라져요. 바로 진행 가능한 유형은 추가 분석
                없이 진행할 수 있고, 고형연료·시멘트 보조연료 유형은 폐기물분석전문기관의 분석 결과가
                필요합니다.
              </p>
            </div>
          </section>
          <footer className="sv-result-actions">
            <button className="button button-quiet" type="button" onClick={se}>
              다시 문진하기
            </button>
            {/* 목록 카드 ID(case-<엔진 건 ID>)로 넘겨야 새 카드 강조(?created=)가 맞음 */}
            <scrapTreatment.Confirm id={caseId ? `case-${caseId}` : waste.id} input={routeInput} />
          </footer>
        </main>
      )}
      <BerryDock message={d} />
      {g !== null && <LawArticleModal index={g} onClose={() => v(null)} />}
      {m && <ExitConfirmModal waste={ie} onContinue={() => h(false)} />}
    </div>
  );
}
