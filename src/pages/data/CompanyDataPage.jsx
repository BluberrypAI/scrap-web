import { Icon } from '../../components/Icon.jsx';
import { demoWorkplace } from '../../features/treatment/treatment-state.js';
import { currentRoute } from '../../lib/router.js';
import { AnimatedContent } from '../landing/LandingMotion.jsx';
import { DataTable } from './DataTable.jsx';
import './CompanyDataPage.css';

const dataTabs = [
  {
    id: 'workplace',
    label: '사업장 정보',
    description: '등록된 사업장',
    icon: 'building',
  },
  {
    id: 'analysis',
    label: '분석 결과',
    description: '성상 분석 결과',
    icon: 'archive',
  },
  {
    id: 'history',
    label: '처리 이력',
    description: '완료된 처리 기록',
    icon: 'clock',
  },
];

const workplaceSummary = [
  ['업종', '화학제품 제조업'],
  ['배출시설', '혼합시설 외 3개'],
  ['주생산품', '산업용 윤활유'],
  ['위치', demoWorkplace.region],
];

export function CompanyDataPage() {
  const requestedTab = new URLSearchParams(currentRoute().search).get('tab');
  const activeTab = dataTabs.some((tab) => tab.id === requestedTab) ? requestedTab : 'workplace';
  return (
    <main className="route-content data-page" data-layer-name="L1-CompanyData">
      <header className="route-heading data-heading">
        <div>
          <p>MY WORKSPACE</p>
          <h1>계정 설정</h1>
          <span>사업장 정보와 분석 결과, 완료된 처리 기록을 확인하세요.</span>
        </div>
      </header>
      <div className="data-layout">
        <aside className="data-sidebar">
          <div className="data-profile">
            <span className="data-profile-avatar" aria-hidden="true">김</span>
            <div>
              <strong>김수현</strong>
              <span>(주)가천정밀 · 사업장 관리자</span>
            </div>
          </div>
          <p className="data-sidebar-label">계정 메뉴</p>
          <nav className="data-tabs" aria-label="계정 설정 메뉴">
            {dataTabs.map((tab) => (
              <a
                href={`/data?tab=${tab.id}`}
                className={activeTab === tab.id ? 'is-active' : ''}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                key={tab.id}
              >
                <Icon name={tab.icon} size={19} />
                <span><strong>{tab.label}</strong><small>{tab.description}</small></span>
                <Icon name="arrow" size={16} />
              </a>
            ))}
          </nav>
        </aside>
        <AnimatedContent key={activeTab} className="data-main">
          {activeTab === 'workplace' ? (
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
                {workplaceSummary.map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>
              <div className="workplace-update-row">
                <span>마지막 수정 2026. 10. 18 · 김수현 관리자</span>
                <span>사업장 정보는 폐기물 분류와 업체 추천에 활용됩니다.</span>
              </div>
            </section>
          ) : (
            <DataTable type={activeTab} />
          )}
        </AnimatedContent>
      </div>
    </main>
  );
}
