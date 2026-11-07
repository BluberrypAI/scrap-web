import { useEffect } from 'react';
import { Icon } from '../../components/Icon.jsx';

export function LawArticleModal({ article: n, code, asOf, onClose }) {
  return (
    useEffect(() => {
      let e = (e) => {
        e.key === 'Escape' && onClose();
      };
      return (
        window.addEventListener('keydown', e),
        () => window.removeEventListener('keydown', e)
      );
    }, [onClose]),
    (
      <div className="overlay-backdrop" role="presentation" onMouseDown={onClose}>
        <section
          className="analysis-panel detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sv-law-title"
          data-layer-name="L4-LawArticle"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <header className="panel-header">
            <div>
              <span className="panel-kicker">{code || '분류 기준'}</span>
              <h2 id="sv-law-title">근거 조문</h2>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="닫기">
              <Icon name="close" />
            </button>
          </header>
          <div className="legal-content">
            <span>
              {'조문 · '}
              {n.cite}
            </span>
            <h3>{n.title}</h3>
            <blockquote>“{n.quote}”</blockquote>
            <div className="law-reasons">
              <strong>이 폐기물에 해당하는 이유</strong>
              <p>
                <span>01</span> {n.reason}
              </p>
              {n.outcome && (
                <p>
                  <span>02</span>
                  {' 판정: '}
                  {n.outcome}
                </p>
              )}
            </div>
            <a
              className="law-source-link"
              href="https://www.law.go.kr/"
              target="_blank"
              rel="noreferrer"
            >
              국가법령정보센터에서 확인
              <Icon name="arrow" size={15} />
            </a>
            <small>
              {'법령 기준일 '}
              {asOf}
              {' · 국가법령정보센터 기준'}
            </small>
          </div>
        </section>
      </div>
    )
  );
}
