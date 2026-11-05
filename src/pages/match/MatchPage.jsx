import { useState } from 'react';
import { ExitConfirmModal } from '../../components/ExitConfirmModal.jsx';
import { Icon } from '../../components/Icon.jsx';
import { WorkBar } from '../../components/WorkBar.jsx';
import { useExitGuard } from '../../hooks/useExitGuard.js';
import { MatchConfirmModal } from './MatchConfirmModal.jsx';

export const matchCompanies = [
  {
    name: '에코순환환경',
    permit: '폐유 수집·운반 및 중간재활용',
    codes: ['06-01-01', '06-01-02'],
    method: '정제·재생처리',
    distance: '12.4km',
    location: '경기도 화성시',
  },
  {
    name: '그린오일리사이클',
    permit: '폐유 종합재활용',
    codes: ['06-01-01', '06-02-00'],
    method: '연료유 재생',
    distance: '24.8km',
    location: '경기도 평택시',
  },
  {
    name: '한결자원순환',
    permit: '지정폐기물 수집·운반',
    codes: ['06-01-01', '06-03-00'],
    method: '수집·운반',
    distance: '31.2km',
    location: '경기도 안산시',
  },
  {
    name: '새봄환경산업',
    permit: '폐유 중간처분 및 재활용',
    codes: ['06-01-01', '06-01-03'],
    method: '유수분리·정제',
    distance: '38.6km',
    location: '경기도 시흥시',
  },
  {
    name: '동우에너지',
    permit: '폐유 최종재활용',
    codes: ['06-01-01', '06-02-01'],
    method: '재생연료 생산',
    distance: '46.1km',
    location: '인천광역시 남동구',
  },
];
export function MatchPage({ waste }) {
  let [t, n] = useState(0),
    [r, i] = useState(null),
    [a, o] = useState(false),
    [s, c] = useState('처리 방식');
  useExitGuard(o);
  let l = (e) => {
    (n(e), i(e));
  };
  return (
    <div className="l3-page" data-layer-name="L3-Match">
      <WorkBar waste={waste} saveState="saved" onExit={() => o(true)} />
      <main className="match-content">
        <header className="match-heading">
          <div>
            <span>처리 단계 2 · 중간처리</span>
            <h1>처리업체를 선택해 주세요</h1>
            <p>폐유 06-01-01 허가 범위와 이동 거리를 기준으로 추천했어요.</p>
          </div>
          <span>
            {'추천 업체 '}
            {matchCompanies.length}곳
          </span>
        </header>
        <div className="match-filters" aria-label="업체 필터">
          {['처리 방식', '거리', '허가 범위'].map((e) => (
            <button
              type="button"
              className={s === e ? 'is-active' : ''}
              onClick={() => c(e)}
              key={e}
            >
              {e}
              <Icon name="arrow" size={13} />
            </button>
          ))}
        </div>
        <section className="match-layout">
          <div className="match-company-list">
            {matchCompanies.map((e, n) => (
              <article
                className={`match-company-card${t === n ? ' is-selected' : ''}`}
                key={e.name}
              >
                <div className="match-card-index">{String(n + 1).padStart(2, '0')}</div>
                <div className="match-company-info">
                  <div>
                    <span>{e.method}</span>
                    <strong>{e.name}</strong>
                  </div>
                  <p>{e.permit}</p>
                  <div className="permit-code-row">
                    {e.codes.map((e) => (
                      <span key={e}>{e}</span>
                    ))}
                  </div>
                  <footer>
                    <span>{e.location}</span>
                    <strong>{e.distance}</strong>
                  </footer>
                </div>
                <button className="match-select-button" type="button" onClick={() => l(n)}>
                  선택
                </button>
              </article>
            ))}
          </div>
          <aside className="match-map" aria-label="업체 위치 지도 플레이스홀더">
            <span className="match-map-road match-road-one" />
            <span className="match-map-road match-road-two" />
            <span className="match-map-road match-road-three" />
            <div className="match-origin">
              <Icon name="building" size={14} />
              {' 배출 사업장'}
            </div>
            {matchCompanies.map((e, n) => (
              <button
                type="button"
                className={`match-map-pin match-pin-${n + 1}${t === n ? ' is-selected' : ''}`}
                onClick={() => l(n)}
                aria-label={`${e.name} 지도 핀`}
                key={e.name}
              >
                <span>{n + 1}</span>
              </button>
            ))}
            <article className="selected-map-company">
              <span>선택한 업체</span>
              <strong>{matchCompanies[t].name}</strong>
              <p>
                {matchCompanies[t].location}
                {' ·'} {matchCompanies[t].distance}
              </p>
            </article>
          </aside>
        </section>
      </main>
      {r !== null && <MatchConfirmModal waste={waste} companyIndex={r} onCancel={() => i(null)} />}
      {a && <ExitConfirmModal waste={waste} onContinue={() => o(false)} />}
    </div>
  );
}
