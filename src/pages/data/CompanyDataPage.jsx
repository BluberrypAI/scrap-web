import { useState } from 'react';
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

const workplaceFields = [
  ['industry', '업종'],
  ['facilities', '배출시설'],
  ['product', '주생산품'],
  ['region', '위치'],
];

const defaultWorkplaceInfo = {
  industry: '화학제품 제조업',
  facilities: '혼합시설 외 3개',
  product: '산업용 윤활유',
  region: demoWorkplace.region,
  savedAt: '',
};
const storageKey = 'scrap-workplace-info-v1';

function readWorkplaceInfo() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved || typeof saved !== 'object') return defaultWorkplaceInfo;
    const info = { ...defaultWorkplaceInfo };
    for (const [key] of workplaceFields) {
      if (typeof saved[key] === 'string' && saved[key].trim()) info[key] = saved[key];
    }
    if (typeof saved.savedAt === 'string') info.savedAt = saved.savedAt;
    return info;
  } catch {
    return defaultWorkplaceInfo;
  }
}

export function CompanyDataPage() {
  const requestedTab = new URLSearchParams(currentRoute().search).get('tab');
  const activeTab = dataTabs.some((tab) => tab.id === requestedTab) ? requestedTab : 'workplace';
  const [workplaceInfo, setWorkplaceInfo] = useState(readWorkplaceInfo);
  const [draft, setDraft] = useState(workplaceInfo);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const saveWorkplaceInfo = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(workplaceFields.map(([key]) => [key, draft[key].trim()]));
    next.savedAt = new Date().toLocaleDateString('ko-KR');
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setWorkplaceInfo(next);
      setSaveError('');
      setIsEditing(false);
    } catch {
      setSaveError('저장할 수 없어요. 브라우저 저장소를 확인해 주세요.');
    }
  };
  return (
    <main className="route-content data-page" data-layer-name="L1-CompanyData">
      <header className="route-heading data-heading">
        <div>
          <p>COMPANY DATA</p>
          <h1>기업 데이터 관리</h1>
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
          <p className="data-sidebar-label">기업 데이터</p>
          <nav className="data-tabs" aria-label="기업 데이터 메뉴">
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
                <div className="workplace-header-actions">
                  <span className="verified-badge">
                    <Icon name="check" size={14} /> 인증 완료
                  </span>
                  <button
                    className="workplace-edit-button"
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        setIsEditing(false);
                        setSaveError('');
                      } else {
                        setDraft(workplaceInfo);
                        setIsEditing(true);
                      }
                    }}
                  >
                    {isEditing ? '취소' : '정보 수정'}
                  </button>
                </div>
              </header>
              {isEditing ? (
                <form className="workplace-edit-form" onSubmit={saveWorkplaceInfo}>
                  <div className="workplace-edit-grid">
                    {workplaceFields.map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          type="text"
                          value={draft[key]}
                          onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.value }))}
                          maxLength={80}
                          required
                        />
                      </label>
                    ))}
                  </div>
                  <div className="workplace-edit-footer">
                    <span>입력한 내용은 이 브라우저에 저장됩니다.</span>
                    <button className="button button-primary" type="submit">저장하기</button>
                  </div>
                  {saveError && <p className="workplace-save-error" role="alert">{saveError}</p>}
                </form>
              ) : (
                <div className="workplace-info-grid">
                  {workplaceFields.map(([key, label]) => (
                    <article key={key}>
                      <span>{label}</span>
                      <strong>{workplaceInfo[key]}</strong>
                    </article>
                  ))}
                </div>
              )}
              <div className="workplace-update-row">
                <span>마지막 수정 {workplaceInfo.savedAt || '2026. 10. 18'} · 김수현 관리자</span>
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
