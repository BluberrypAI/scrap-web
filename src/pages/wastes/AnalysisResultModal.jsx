import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { analysisFields } from '../../data/wastes.js';

export function AnalysisResultModal({ waste, onClose }) {
  let [n, r] = useState({}),
    [i, a] = useState(''),
    [o, s] = useState(''),
    [c, l] = useState(''),
    [u, d] = useState(false),
    f = Object.values(n).some(Boolean) || !!(i || o || c),
    p = u ? 'saved' : f ? 'editing' : 'default';
  return (
    <div className="result-overlay-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="result-input-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-input-title"
        data-layer-name="L4-ResultInput"
        data-variant={p}
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          (e.preventDefault(), d(true));
        }}
      >
        <header className="result-modal-header">
          <div>
            <span>ANALYSIS RESULT</span>
            <h2 id="result-input-title">분석 결과 입력</h2>
            <p>
              {waste.name}
              {' · 분석 요청일 2026. 10. 31'}
            </p>
          </div>
          <button className="result-close" type="button" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>
        <div className="result-modal-body">
          <section className="result-values" aria-label="검사 항목 입력">
            <header>
              <strong>검사 항목</strong>
              <span>성적서의 측정값을 입력해 주세요.</span>
            </header>
            {analysisFields.map((e) => (
              <label className="result-value-row" key={e.id}>
                <span>{e.label}</span>
                <span className="result-value-input">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={n[e.id] ?? ''}
                    onChange={(t) =>
                      r((n) => ({
                        ...n,
                        [e.id]: t.target.value,
                      }))
                    }
                  />
                  <small>{e.unit}</small>
                </span>
              </label>
            ))}
          </section>
          <section className="result-meta-fields">
            <label>
              <span>분석기관</span>
              <input
                type="text"
                placeholder="분석기관명을 입력하세요"
                value={i}
                onChange={(e) => a(e.target.value)}
              />
            </label>
            <label>
              <span>분석일</span>
              <input type="date" value={o} onChange={(e) => s(e.target.value)} />
            </label>
          </section>
          <label className="result-file-drop">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => l(e.target.files?.[0]?.name ?? '')}
            />
            <span className="file-icon">PDF</span>
            <span>
              <strong>{c || '성적서 PDF 첨부'}</strong>
              <small>
                {c ? '파일이 선택되었습니다.' : '클릭하여 분석 성적서를 선택하세요 · 최대 10MB'}
              </small>
            </span>
            <em>{c ? '변경' : '파일 선택'}</em>
          </label>
          <section
            className={`result-guide${u ? ' is-saved' : ''}`}
            data-layer-name="L4-ResultInput-Guide"
          >
            {u ? <span className="result-guide-dot" /> : <Icon name="spark" size={20} />}
            <div>
              <strong>
                {u
                  ? '입력한 값 기준으로 재활용 가능한 경로 2개를 찾았어요'
                  : f
                    ? '입력값을 기준으로 가능한 처리 경로를 분석하고 있어요'
                    : '결과를 입력하면 다음 처리 경로를 바로 안내해 드려요'}
              </strong>
              <p>
                {u
                  ? '연료화 재활용과 정제유 회수 경로를 우선 검토할 수 있습니다.'
                  : '수분 함량과 발열량을 입력하면 더 정확한 경로를 찾을 수 있어요.'}
              </p>
            </div>
          </section>
        </div>
        <footer className="result-modal-actions">
          <button className="button button-quiet" type="button" onClick={onClose}>
            취소
          </button>
          {u ? (
            <a className="button button-primary" href={`/wastes/${waste.id}?tab=route`}>
              경로 보기
              <Icon name="arrow" size={17} />
            </a>
          ) : (
            <button className="button button-primary" type="submit">
              저장
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
