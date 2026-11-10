import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { useSession } from '../../hooks/useSession.js';
import { ApiError, api } from '../../lib/api.js';
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

// [서버 필드, 화면 이름, 목록 여부, 필수 여부]. 목록은 쉼표로 나눠 입력받는다.
const workplaceFields = [
  ['industry', '업종', false, true],
  ['site_facilities', '배출시설', true, true],
  ['main_products', '주생산품', true, false],
  ['main_waste_types', '주폐기물', true, false],
  ['site_address', '위치', false, true],
];

// 화면에 보이는 값. 주폐기물은 종류 이름만 보여준다.
function readField(company, key, isList) {
  if (!isList) return company?.[key] || '';
  const items = company?.[key] || [];
  return key === 'main_waste_types' ? items.map((item) => item.category) : items;
}

// 서버 값 → 입력란 문자열
function toDraft(company) {
  return Object.fromEntries(
    workplaceFields.map(([key, , isList]) => {
      const value = readField(company, key, isList);
      return [key, isList ? value.join(', ') : value];
    }),
  );
}

// 입력란 문자열 → 화면 값 (readField와 같은 형태)
function fromDraft(isList, text) {
  if (!isList) return text.trim();
  return [...new Set(text.split(',').map((item) => item.trim()).filter(Boolean))];
}

// 화면 값 → 서버로 보낼 값. 주폐기물은 기존 항목의 예상 물량을 종류별로 유지한다.
function toServerValue(company, key, value) {
  if (key !== 'main_waste_types') return value;
  const volumes = new Map(
    (company.main_waste_types || []).map((item) => [item.category, item.expected_monthly_volume_kg]),
  );
  return value.map((category) => ({
    category,
    expected_monthly_volume_kg: volumes.get(category) ?? null,
  }));
}

function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function saveErrorMessage(error) {
  if (error instanceof ApiError && error.status === 409) {
    return '다른 곳에서 먼저 수정했어요. 새로고침한 뒤 다시 수정해 주세요.';
  }
  if (error instanceof ApiError) return `저장하지 못했어요. ${error.message}`;
  return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function CompanyDataPage() {
  const requestedTab = new URLSearchParams(currentRoute().search).get('tab');
  const activeTab = dataTabs.some((tab) => tab.id === requestedTab) ? requestedTab : 'workplace';
  // 이 화면은 AppShell 안에서만 열리므로 이미 기업 등록까지 마친 세션이다.
  const session = useSession();
  const [company, setCompany] = useState(null);
  const [savedAt, setSavedAt] = useState('');
  const [draft, setDraft] = useState(() => toDraft(null));
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const displayName = session.user?.name || session.user?.email || '';

  useEffect(() => {
    if (session.company) setCompany(session.company);
  }, [session.company]);
  // 마지막 수정일은 변경 이력의 최신 항목에서 읽는다. 수정한 적이 없으면 비어 있다.
  useEffect(() => {
    if (!session.company) return;
    api
      .companyHistory(1, 1)
      .then((page) => {
        const latest = page?.items?.[0]?.changed_at;
        if (latest) setSavedAt(new Date(latest).toLocaleDateString('ko-KR'));
      })
      .catch(() => {});
  }, [session.company]);

  const saveWorkplaceInfo = async (event) => {
    event.preventDefault();
    const changes = {};
    for (const [key, label, isList, required] of workplaceFields) {
      const value = fromDraft(isList, draft[key]);
      if (required && (isList ? value.length === 0 : !value)) {
        setSaveError(`${label} 항목을 입력해 주세요.`);
        return;
      }
      if (!sameValue(value, readField(company, key, isList))) {
        changes[key] = toServerValue(company, key, value);
      }
    }
    if (Object.keys(changes).length === 0) {
      setSaveError('');
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const result = await api.updateCompany(company.profile_version, changes);
      setCompany((value) => ({ ...value, ...changes, profile_version: result.profile_version }));
      if (result.changed_fields.length > 0) setSavedAt(new Date().toLocaleDateString('ko-KR'));
      setSaveError('');
      setIsEditing(false);
    } catch (error) {
      setSaveError(saveErrorMessage(error));
    } finally {
      setSaving(false);
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
            <span className="data-profile-avatar" aria-hidden="true">{displayName.charAt(0)}</span>
            <div>
              <strong>{displayName}</strong>
              <span>{company?.company_name} · 사업장 관리자</span>
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
                  <h2>{company?.company_name}</h2>
                  <p>{company?.site_name}</p>
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
                        setDraft(toDraft(company));
                        setSaveError('');
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
                    {workplaceFields.map(([key, label, isList, required]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          type="text"
                          value={draft[key]}
                          onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.value }))}
                          maxLength={key === 'site_address' ? 500 : isList ? 1000 : 100}
                          placeholder={isList ? '쉼표(,)로 나눠 입력' : undefined}
                          required={required}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="workplace-edit-footer">
                    <span>저장하면 서버의 기업 정보가 바뀝니다.</span>
                    <button className="button button-primary" type="submit" disabled={saving || !company}>
                      {saving ? '저장하는 중…' : '저장하기'}
                    </button>
                  </div>
                  {saveError && <p className="workplace-save-error" role="alert">{saveError}</p>}
                </form>
              ) : (
                <div className="workplace-info-grid">
                  {workplaceFields.map(([key, label, isList]) => (
                    <article key={key}>
                      <span>{label}</span>
                      <strong>
                        {isList
                          ? readField(company, key, true).join(', ') || '없음'
                          : company?.[key]}
                      </strong>
                    </article>
                  ))}
                </div>
              )}
              <div className="workplace-update-row">
                <span>{savedAt ? `마지막 수정 ${savedAt}` : '등록 후 수정 이력 없음'}</span>
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
