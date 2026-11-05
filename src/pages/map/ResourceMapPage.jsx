import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { handlers } from '../../data/handlers.js';

export function ResourceMapPage() {
  let [e, t] = useState(0);
  return (
    <main className="route-content map-page" data-layer-name="L1-ResourceMap">
      <header className="route-heading">
        <p>RESOURCE NETWORK</p>
        <h1>순환자원지도</h1>
        <span>조건을 설명하면 AI가 적합한 처리업체를 지도에서 찾아드려요.</span>
      </header>
      <form className="map-search" onSubmit={(e) => e.preventDefault()}>
        <Icon name="spark" size={23} />
        <input
          type="search"
          aria-label="처리업체 자연어 검색"
          placeholder="경기도에서 폐유를 처리할 수 있는 업체 찾아줘"
        />
        <button className="button button-primary" type="submit">
          검색
        </button>
      </form>
      <div className="map-filter-row">
        <button className="map-filter is-active" type="button">
          처리업체
        </button>
        <button className="map-filter" type="button" disabled>
          {'판매처 '}
          <small>준비 중</small>
        </button>
      </div>
      <section className="map-layout">
        <aside className="handler-results" aria-label="처리업체 검색 결과">
          <header>
            <div>
              <strong>검색 결과</strong>
              <span>{handlers.length}곳</span>
            </div>
            <small>거리순</small>
          </header>
          <div className="handler-list">
            {handlers.map((t, n) => (
              <a
                className={`handler-row${e === n ? ' is-selected' : ''}`}
                href={`/map/${t.id}`}
                key={t.id}
              >
                <span className="handler-index">{String(n + 1).padStart(2, '0')}</span>
                <span className="handler-copy">
                  <strong>{t.name}</strong>
                  <small>
                    {t.type}
                    {' · '}
                    {t.location}
                  </small>
                  <em>{t.materials}</em>
                </span>
                <span className="handler-distance">{t.distance}</span>
              </a>
            ))}
          </div>
        </aside>
        <div className="map-canvas" aria-label="지도 플레이스홀더">
          <span className="map-road road-one" />
          <span className="map-road road-two" />
          <span className="map-road road-three" />
          <span className="map-river" />
          {handlers.map((n, r) => (
            <button
              className={`map-pin pin-${r + 1}${e === r ? ' is-selected' : ''}`}
              type="button"
              onClick={() => t(r)}
              aria-label={`${n.name} 선택`}
              key={n.name}
            >
              <span>{r + 1}</span>
            </button>
          ))}
          <div className="map-label map-label-one">화성시</div>
          <div className="map-label map-label-two">평택시</div>
          <article className="map-summary-card">
            <span>{handlers[e].type}</span>
            <h2>{handlers[e].name}</h2>
            <p>{handlers[e].materials}</p>
            <footer>
              <span>{handlers[e].location}</span>
              <strong>{handlers[e].distance}</strong>
            </footer>
            <a href={`/map/${handlers[e].id}`}>
              업체 상세 보기
              <Icon name="arrow" size={14} />
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}
