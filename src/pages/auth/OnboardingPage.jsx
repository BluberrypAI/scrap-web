import { useState } from 'react';
import { AuthLogo } from '../../components/AuthLogo.jsx';
import { Icon } from '../../components/Icon.jsx';
import {
  clearSignupDraft,
  getSignupDraft,
  saveAuthenticatedSession,
} from '../../lib/auth.js';
import { navigate } from '../../lib/router.js';

const facilityOptions = ['폐수처리시설', '혼합시설', '세척시설', '반응시설', '건조시설', '저장시설'];

export function OnboardingPage() {
  let [e, t] = useState(0),
    [n, r] = useState(''),
    [i, a] = useState(''),
    [o, s] = useState([]),
    [c, l] = useState([]),
    [f, h] = useState(''),
    [mainWastes, setMainWastes] = useState([]),
    [wasteInput, setWasteInput] = useState(''),
    [companyName, setCompanyName] = useState(''),
    [signupEmail] = useState(() => getSignupDraft().email),
    [contactEmail, setContactEmail] = useState(() => getSignupDraft().email),
    [workplaceName, setWorkplaceName] = useState(''),
    u = (e) => {
      s((t) => (t.includes(e) ? t.filter((t) => t !== e) : [...t, e]));
    },
    m = () => {
      let e = f.trim();
      e && (l((t) => (t.includes(e) ? t : [...t, e])), h(''));
    },
    addMainWaste = () => {
      let value = wasteInput.trim();
      value && (
        setMainWastes((items) => (items.includes(value) ? items : [...items, value])),
        setWasteInput('')
      );
    },
    d = () => {
      if (e < 2) {
        t((e) => e + 1);
        return;
      }
      saveAuthenticatedSession();
      clearSignupDraft();
      navigate('/wastes');
    };
  return (
    <main className="l0-page onboarding-page" data-layer-name="L0-Onboarding" data-step={e + 1}>
      <AuthLogo />
      <section className="onboarding-card">
        <aside className="onboarding-sidebar">
          <header className="onboarding-header">
            <span>WORKSPACE SETUP</span>
            <h1>사업장 정보를<br />알려주세요</h1>
            <p>업체 추천에 필요한 정보를<br />차례대로 등록해요.</p>
          </header>
          <ol className="onboarding-progress" aria-label="온보딩 진행 단계">
            {['기본 정보', '배출시설', '생산·폐기물'].map((t, n) => (
              <li className={n < e ? 'is-done' : n === e ? 'is-current' : ''} key={t}>
                <span>{n < e ? <Icon name="check" size={14} /> : n + 1}</span>
                <strong>{t}</strong>
              </li>
            ))}
          </ol>
        </aside>
        <div className="onboarding-content">
          {e === 0 && (
            <section className="onboarding-step" data-layer-name="Onboarding-Step-1">
              <div className="onboarding-field-row">
                <label className="onboarding-field">
                  회사명
                  <input
                    type="text"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="회사명을 입력해 주세요"
                    autoComplete="organization"
                  />
                </label>
                <label className="onboarding-field">
                  사업장명
                  <input
                    type="text"
                    value={workplaceName}
                    onChange={(event) => setWorkplaceName(event.target.value)}
                    placeholder="예: 화성 제1사업장"
                  />
                </label>
              </div>
              <div className="onboarding-field-row">
                <label className="onboarding-field">
                  담당자 연락처
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder={signupEmail || 'contact@company.com'}
                    autoComplete="email"
                  />
                </label>
                <label className="onboarding-field">
                  업종
                  <select value={n} onChange={(e) => r(e.target.value)}>
                    <option value="">업종을 선택하세요</option>
                    <option>화학제품 제조업</option>
                    <option>금속 가공업</option>
                    <option>전자부품 제조업</option>
                    <option>식품 제조업</option>
                  </select>
                </label>
              </div>
              <label className="onboarding-field">
                사업장 위치
                <span className="address-field">
                  <input type="text" value={i} readOnly placeholder="사업장 주소를 검색하세요" />
                  <button type="button" onClick={() => a('경기도 화성시 팔탄면 산업로 128')}>
                    주소 검색
                  </button>
                </span>
              </label>
            </section>
          )}
          {e === 1 && (
            <section className="onboarding-step" data-layer-name="Onboarding-Step-2">
              <div className="step-intro">
                <h2>운영 중인 배출시설을 선택해 주세요</h2>
                <p>여러 시설을 선택할 수 있습니다.</p>
              </div>
              <div className="facility-chips">
                {facilityOptions.map((e) => (
                  <button
                    type="button"
                    className={o.includes(e) ? 'is-selected' : ''}
                    onClick={() => u(e)}
                    key={e}
                  >
                    {o.includes(e) && <Icon name="check" size={15} />}
                    {e}
                  </button>
                ))}
              </div>
            </section>
          )}
          {e === 2 && (
            <section className="onboarding-step" data-layer-name="Onboarding-Step-3">
              <div className="step-intro">
                <h2>생산품과 폐기물 정보를 입력해 주세요</h2>
                <p>알고 있는 항목만 입력해도 괜찮아요.</p>
              </div>
              <div className="onboarding-optional-grid">
                <div className="onboarding-optional-group">
                  <label className="onboarding-field">
                    <span className="onboarding-optional-label">주생산품 <small>선택</small></span>
                    <span className="address-field">
                      <input
                        type="text"
                        value={f}
                        onChange={(event) => h(event.target.value)}
                        onKeyDown={(event) => {
                          event.key === 'Enter' && !event.nativeEvent.isComposing && (
                            event.preventDefault(),
                            m()
                          );
                        }}
                        placeholder="예: 산업용 윤활유"
                      />
                      <button type="button" onClick={m} disabled={!f.trim()}>
                        추가
                      </button>
                    </span>
                  </label>
                  {c.length > 0 && (
                    <div className="facility-chips">
                      {c.map((product) => (
                        <button
                          type="button"
                          className="is-selected"
                          aria-label={`${product} 삭제`}
                          onClick={() => l((items) => items.filter((item) => item !== product))}
                          key={product}
                        >
                          {product}
                          <Icon name="close" size={15} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="onboarding-optional-group">
                  <label className="onboarding-field">
                    <span className="onboarding-optional-label">주 폐기물 <small>선택</small></span>
                    <span className="address-field">
                      <input
                        type="text"
                        value={wasteInput}
                        onChange={(event) => setWasteInput(event.target.value)}
                        onKeyDown={(event) => {
                          event.key === 'Enter' && !event.nativeEvent.isComposing && (
                            event.preventDefault(),
                            addMainWaste()
                          );
                        }}
                        placeholder="예: 폐유, 폐합성수지"
                      />
                      <button type="button" onClick={addMainWaste} disabled={!wasteInput.trim()}>
                        추가
                      </button>
                    </span>
                  </label>
                  {mainWastes.length > 0 && (
                    <div className="facility-chips">
                      {mainWastes.map((waste) => (
                        <button
                          type="button"
                          className="is-selected"
                          aria-label={`${waste} 삭제`}
                          onClick={() => setMainWastes((items) => items.filter((item) => item !== waste))}
                          key={waste}
                        >
                          {waste}
                          <Icon name="close" size={15} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
        <p className="onboarding-guide">
          <Icon name="spark" size={16} />
          등록 후에도 기업 데이터 관리에서 수정할 수 있어요
        </p>
        <footer className="onboarding-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={() => t((e) => Math.max(0, e - 1))}
            disabled={e === 0}
          >
            이전
          </button>
          <button className="button button-primary" type="button" onClick={d}>
            {e === 2 ? '시작하기' : '다음'}
            <Icon name="arrow" size={17} />
          </button>
        </footer>
      </section>
    </main>
  );
}
