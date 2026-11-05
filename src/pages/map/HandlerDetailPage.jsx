import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { InquiryDraftModal } from './InquiryDraftModal.jsx';

export function HandlerDetailPage({ company }) {
  let [t, n] = useState(false);
  useEffect(() => {
    let e = () => n(false);
    return (
      window.addEventListener('popstate', e),
      () => window.removeEventListener('popstate', e)
    );
  }, []);
  let r = () => {
      (window.history.pushState(
        {
          overlay: 'handler-inquiry',
        },
        '',
      ),
        n(true));
    },
    i = () => {
      window.history.state?.overlay === 'handler-inquiry' ? window.history.back() : n(false);
    };
  return (
    <main className="handler-detail-page" data-layer-name="L2-HandlerDetail">
      <a className="detail-back" href="/map">
        <span>←</span>
        {' 순환자원지도'}
      </a>
      <header className="handler-detail-header">
        <div>
          <span>{company.type}</span>
          <h1>{company.name}</h1>
          <p>
            {company.permitNo}
            {' · '}
            {company.location}
          </p>
        </div>
        <span className="verified-badge">
          <Icon name="check" size={14} />
          {' 허가 확인'}
        </span>
      </header>
      <section className="handler-detail-grid">
        <article className="handler-detail-card permit-scope-card">
          <header>
            <span>PERMIT SCOPE</span>
            <h2>허가 범위</h2>
          </header>
          <div>
            <span>
              <Icon name="check" size={15} />
              {' 폐유 수집·운반'}
            </span>
            <span>
              <Icon name="check" size={15} />
              {' 중간 재활용 처리'}
            </span>
            <span>
              <Icon name="check" size={15} />
              {' 재생연료유 생산'}
            </span>
          </div>
          <footer>
            <span>허가 유효기간</span>
            <strong>2028. 12. 31까지</strong>
          </footer>
        </article>
        <article className="handler-detail-card handler-code-card">
          <header>
            <span>WASTE CODES</span>
            <h2>취급 분류번호</h2>
          </header>
          <div className="handler-code-chips">
            {company.codes.map((e) => (
              <span key={e}>{e}</span>
            ))}
          </div>
          <p>
            {company.materials}
            {' 중심으로 허가된 업체입니다.'}
          </p>
        </article>
        <article className="handler-detail-card handler-minimap-card">
          <header>
            <div>
              <span>LOCATION</span>
              <h2>업체 위치</h2>
            </div>
            <small>{company.coordinates}</small>
          </header>
          <div className="handler-minimap" aria-label="업체 좌표 미니맵 플레이스홀더">
            <span className="mini-road mini-road-one" />
            <span className="mini-road mini-road-two" />
            <span className="mini-map-pin">
              <Icon name="building" size={16} />
            </span>
            <strong>{company.location}</strong>
          </div>
        </article>
      </section>
      <footer className="handler-detail-actions">
        <div>
          <span>처리 가능 여부와 단가는 업체에 직접 확인해 주세요.</span>
          <small>SCRAP AI가 현재 폐기물 정보를 바탕으로 문의 내용을 작성해 드려요.</small>
        </div>
        <button className="button button-quiet" type="button" onClick={r}>
          <Icon name="spark" size={17} />
          {' 문의 초안 작성'}
        </button>
      </footer>
      {t && <InquiryDraftModal company={company} onClose={i} />}
    </main>
  );
}
