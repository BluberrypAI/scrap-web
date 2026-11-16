import { useState } from 'react';
import { ExitConfirmModal } from '../../components/ExitConfirmModal.jsx';
import { Icon } from '../../components/Icon.jsx';
import { WorkBar } from '../../components/WorkBar.jsx';
import { useExitGuard } from '../../hooks/useExitGuard.js';

export function ReportPage({ waste }) {
  let [t, n] = useState(false),
    [r, i] = useState(false),
    [a, o] = useState(false);
  useExitGuard(n);
  let s = async () => {
      (await navigator.clipboard?.writeText(window.location.href), o(true));
    },
    c = [
      ['01', '배출', '(주)가천정밀', '폐기물 인계'],
      ['02', '수집·운반', '한결자원운송', '전용 차량 운송'],
      ['03', '중간처리', '에코순환환경', '선별·유수분리'],
      ['04', '최종 재활용', '동우에너지', '재생연료유 생산'],
    ];
  return (
    <div className="l3-page report-page" data-layer-name="L3-Report">
      <WorkBar waste={waste} saveState="saved" onExit={() => n(true)} />
      <main className="report-document">
        <header className="report-document-header">
          <div>
            <span>SCRAP CIRCULAR REPORT</span>
            <h1>폐기물 처리 완료 결과지</h1>
            <p>문서번호 SCR-{waste.code.replaceAll('-', '')}-2026</p>
          </div>
          <div className="report-export">
            <button
              className="button button-primary"
              type="button"
              aria-expanded={r}
              onClick={() => i((e) => !e)}
            >
              내보내기
              <Icon name="arrow" size={16} />
            </button>
            {r && (
              <div className="report-export-menu">
                <button type="button" onClick={() => window.print()}>
                  <span>PDF</span>
                  <div>
                    <strong>PDF로 저장</strong>
                    <small>인쇄 대화상자 열기</small>
                  </div>
                </button>
                <button type="button" onClick={s}>
                  <Icon name="arrow" size={16} />
                  <div>
                    <strong>{a ? '링크 복사 완료' : '링크 공유'}</strong>
                    <small>결과지 주소 복사</small>
                  </div>
                </button>
              </div>
            )}
          </div>
        </header>
        <section className="report-section">
          <header>
            <span>01</span>
            <h2>폐기물 정보</h2>
          </header>
          <dl className="report-info-table">
            <div>
              <dt>품목명</dt>
              <dd>{waste.name}</dd>
            </div>
            <div>
              <dt>폐기물 유형</dt>
              <dd>
                {'사업장 일반폐기물 · '}
                {waste.category}
              </dd>
            </div>
            <div>
              <dt>배출 사업장</dt>
              <dd>(주)가천정밀</dd>
            </div>
            <div>
              <dt>총 처리량</dt>
              <dd>8.4톤</dd>
            </div>
          </dl>
        </section>
        <section className="report-section">
          <header>
            <span>02</span>
            <h2>분류번호와 근거 조문</h2>
          </header>
          <div className="report-classification">
            <div>
              <span>확정 분류번호</span>
              <strong>{waste.code}</strong>
            </div>
            <div>
              <span>R유형</span>
              <strong>R1 · 연료로 직접 사용</strong>
            </div>
            <article>
              <span>폐기물관리법 시행규칙 별표 4</span>
              <p>발생 공정과 성상 분석 결과를 기준으로 해당 폐기물의 세부분류를 확정했습니다.</p>
              <small>근거 조문 최종 확인 · 2026. 10. 30</small>
            </article>
          </div>
        </section>
        <section className="report-section">
          <header>
            <span>03</span>
            <h2>처리 경로</h2>
          </header>
          <div className="report-route">
            {c.map(([e, t, n, r], i) => (
              <article className={i === c.length - 1 ? 'is-complete' : ''} key={e}>
                <span className="report-route-number">
                  {i === c.length - 1 ? <Icon name="check" size={16} /> : e}
                </span>
                <div>
                  <small>{t}</small>
                  <strong>{n}</strong>
                  <p>{r}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="report-section report-completion">
          <header>
            <span>04</span>
            <h2>완료 일자</h2>
          </header>
          <div>
            <span>최종 처리 완료</span>
            <strong>2026년 10월 21일</strong>
            <small>처리 담당자 확인 · 에코순환환경 이정민</small>
          </div>
        </section>
        <footer className="report-footer">
          <span>본 결과지는 SCRAP에 등록된 처리 기록을 기반으로 자동 생성되었습니다.</span>
          <strong>SCRAP.</strong>
        </footer>
      </main>
      {t && <ExitConfirmModal waste={waste} onContinue={() => n(false)} />}
    </div>
  );
}
