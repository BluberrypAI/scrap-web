import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { demoWorkplace } from '../../features/treatment/treatment-state.js';
import { currentRoute } from '../../lib/router.js';
import { DataTable } from './DataTable.jsx';

const dataTabs = [
  {
    id: 'workplace',
    label: '사업장 정보',
  },
  {
    id: 'analysis',
    label: '분석 결과 기록',
  },
  {
    id: 'history',
    label: '처리 이력',
  },
];

const workplaceSummary = [
  ['업종', '화학제품 제조업'],
  ['배출시설', '혼합시설 외 3개'],
  ['주생산품', '산업용 윤활유'],
  ['위치', demoWorkplace.region],
];

export function CompanyDataPage() {
  let [e, t] = useState(() => {
    let e = new URLSearchParams(currentRoute().search).get('tab');
    return e === 'history' || e === 'analysis' ? e : 'workplace';
  });
  return (
    <main className="route-content data-page" data-layer-name="L1-CompanyData">
      <header className="route-heading data-heading">
        <div>
          <p>COMPANY DATA</p>
          <h1>기업 데이터 관리</h1>
          <span>사업장 정보와 폐기물 분석·처리 기록을 한곳에서 관리합니다.</span>
        </div>
        {e === 'workplace' && (
          <button className="button button-primary" type="button">
            정보 수정
          </button>
        )}
      </header>
      <nav className="data-tabs" aria-label="기업 데이터 메뉴">
        {dataTabs.map((n) => (
          <button
            type="button"
            className={e === n.id ? 'is-active' : ''}
            onClick={() => t(n.id)}
            key={n.id}
          >
            {n.label}
          </button>
        ))}
      </nav>
      {e === 'workplace' ? (
        <section className="workplace-panel">
          <header>
            <div className="workplace-mark">
              <Icon name="building" size={25} />
            </div>
            <div>
              <span>사업장 요약</span>
              <h2>(주)가천정밀</h2>
              <p>환경부 사업장 코드 · HW-03182</p>
            </div>
            <span className="verified-badge">
              <Icon name="check" size={14} />
              인증 완료
            </span>
          </header>
          <div className="workplace-info-grid">
            {workplaceSummary.map(([e, t]) => (
              <article key={e}>
                <span>{e}</span>
                <strong>{t}</strong>
              </article>
            ))}
          </div>
          <div className="workplace-update-row">
            <span>마지막 수정 2026. 10. 18 · 김수현 관리자</span>
            <span>사업장 정보는 폐기물 분류와 업체 추천에 활용됩니다.</span>
          </div>
        </section>
      ) : (
        <DataTable type={e} />
      )}
    </main>
  );
}
