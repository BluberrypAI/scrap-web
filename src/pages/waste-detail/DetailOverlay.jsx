import { Icon } from '../../components/Icon.jsx';

export function DetailOverlay({ type, waste, onClose }) {
  let r = type === 'legal' ? '근거 조문' : '처리 단계 추가';
  return (
    <div className="overlay-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="analysis-panel detail-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-overlay-title"
        data-layer-name={type === 'legal' ? 'L4-LawArticle' : 'L4-StepAdd'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="panel-header">
          <div>
            <span className="panel-kicker">
              {waste.name}
              {' · '}
              {waste.code}
            </span>
            <h2 id="detail-overlay-title">{r}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>
        {type === 'legal' ? (
          <div className="legal-content">
            <span>조문 번호 · 폐기물관리법 시행규칙 별표 4 제2호</span>
            <h3>사업장폐기물의 종류별 세부분류</h3>
            <div className="law-summary">
              <strong>조문 요약</strong>
              <p>
                발생 공정, 물리적 성상과 유해성을 기준으로 사업장폐기물의 세부분류번호와 재활용
                유형을 결정합니다.
              </p>
            </div>
            <blockquote>
              제4조의2 — 폐기물의 종류와 세부분류는 발생원, 구성 성분 및 유해성을 기준으로 정한다.
            </blockquote>
            <div className="law-reasons">
              <strong>이 폐기물에 해당하는 이유</strong>
              <p>
                <span>01</span>
                {' 폐유가 설비 유지보수 공정에서 발생했습니다.'}
              </p>
              <p>
                <span>02</span>
                {' 성상 분석에서 수분과 유분 함량 기준을 충족합니다.'}
              </p>
              <p>
                <span>03</span>
                {' 재생연료유로 회수 가능한 R1·R3 유형에 해당합니다.'}
              </p>
            </div>
            <a
              className="law-source-link"
              href="https://www.law.go.kr/"
              target="_blank"
              rel="noreferrer"
            >
              원문 보기
              <Icon name="arrow" size={15} />
            </a>
            <small>최종 확인일 2026. 10. 30 · 국가법령정보센터 기준</small>
          </div>
        ) : (
          <div className="panel-body step-add-body">
            <label>
              단계 유형
              <select defaultValue="">
                <option value="" disabled>
                  단계 유형을 선택하세요
                </option>
                <option>중간처리</option>
                <option>최종처리</option>
                <option>재활용</option>
              </select>
            </label>
            <div className="step-company-select">
              <span>
                <strong>업체 선택</strong>선택된 업체가 없습니다.
              </span>
              <a href={`/wastes/${waste.id}/match`}>
                {'업체 찾기 '}
                <Icon name="arrow" size={14} />
              </a>
            </div>
            <label>
              처리 일자
              <input type="date" />
            </label>
            <label>
              단계 메모
              <textarea rows={4} placeholder="처리 단계에 대한 참고사항을 입력하세요" />
            </label>
          </div>
        )}
        <footer className="panel-actions">
          <button className="button button-quiet" type="button" onClick={onClose}>
            닫기
          </button>
          {type !== 'legal' && (
            <button className="button button-primary" type="button" onClick={onClose}>
              추가
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
