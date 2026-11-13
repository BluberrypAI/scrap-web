import { useEffect, useState } from 'react';
import { AuthLogo } from '../../components/AuthLogo.jsx';
import { Icon } from '../../components/Icon.jsx';
import { resetSession, useRequireSession } from '../../hooks/useSession.js';
import { ApiError, api } from '../../lib/api.js';
import { rememberSession } from '../../lib/auth.js';
import { navigate } from '../../lib/router.js';

const facilityOptions = ['폐수처리시설', '혼합시설', '세척시설', '반응시설', '건조시설', '저장시설'];
// 서버와 같은 형식 검사 (companies/schemas.py EMAIL_PATTERN)
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// 단계별로 다음으로 넘어가기 전에 빠진 항목을 알려준다. 문제가 없으면 빈 문자열.
function stepProblem(step, values) {
  if (step === 0) {
    if (!values.companyName.trim()) return '회사명을 입력해 주세요.';
    if (!values.workplaceName.trim()) return '사업장명을 입력해 주세요.';
    if (!emailPattern.test(values.contactEmail.trim())) return '담당자 이메일을 확인해 주세요.';
    if (!values.industry) return '업종을 선택해 주세요.';
    if (!values.address.trim()) return '사업장 위치를 입력해 주세요.';
  }
  if (step === 1 && values.facilities.length === 0) return '배출시설을 하나 이상 선택해 주세요.';
  return '';
}

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
    [contactEmail, setContactEmail] = useState(''),
    [workplaceName, setWorkplaceName] = useState(''),
    [problem, setProblem] = useState(''),
    [submitting, setSubmitting] = useState(false),
    // 로그인 전이면 로그인 화면으로, 이미 기업이 있으면 앱 화면으로 보낸다.
    session = useRequireSession('/onboarding'),
    signupEmail = session.user?.email || '',
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
    // 입력칸에 쓰고 '추가'를 누르지 않은 값도 함께 등록한다.
    withPending = (items, text) => {
      const value = text.trim();
      return value && !items.includes(value) ? [...items, value] : items;
    },
    submit = async () => {
      setSubmitting(true);
      try {
        await api.createCompany({
          company_name: companyName.trim(),
          contact_email: contactEmail.trim(),
          industry: n,
          site_name: workplaceName.trim(),
          site_address: i.trim(),
          site_facilities: o,
          main_products: withPending(c, f),
          main_waste_types: withPending(mainWastes, wasteInput).map((category) => ({ category })),
        });
        rememberSession({ status: 'ready' });
        resetSession();
        navigate('/wastes');
      } catch (error) {
        setSubmitting(false);
        if (error instanceof ApiError && error.status === 409) {
          // 다른 탭에서 이미 등록함
          rememberSession({ status: 'ready' });
          resetSession();
          navigate('/wastes');
        } else if (error instanceof ApiError && error.status === 401) {
          navigate('/login?mode=login');
        } else {
          setProblem(
            error instanceof ApiError
              ? `등록하지 못했어요. ${error.message}`
              : '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
          );
        }
      }
    },
    d = () => {
      const found = stepProblem(e, {
        companyName,
        workplaceName,
        contactEmail,
        industry: n,
        address: i,
        facilities: o,
      });
      setProblem(found);
      if (found) return;
      if (e < 2) {
        t((e) => e + 1);
        return;
      }
      submit();
    };
  // 담당자 이메일은 로그인한 계정 이메일로 미리 채운다.
  useEffect(() => {
    if (signupEmail) setContactEmail((value) => value || signupEmail);
  }, [signupEmail]);
  if (session.status === 'loading' || session.redirecting) {
    return <main className="l0-page onboarding-page" aria-busy="true" />;
  }
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
                  담당자 이메일
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
                <input
                  type="text"
                  value={i}
                  onChange={(event) => a(event.target.value)}
                  placeholder="사업장 주소를 입력하세요"
                  autoComplete="street-address"
                />
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
        {problem && (
          <p className="onboarding-error" role="alert">
            {problem}
          </p>
        )}
        <p className="onboarding-guide">
          <Icon name="spark" size={16} />
          등록 후에도 기업 데이터 관리에서 수정할 수 있어요
        </p>
        <footer className="onboarding-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={() => {
              setProblem('');
              t((e) => Math.max(0, e - 1));
            }}
            disabled={e === 0 || submitting}
          >
            이전
          </button>
          <button className="button button-primary" type="button" onClick={d} disabled={submitting}>
            {e === 2 ? (submitting ? '등록하는 중…' : '시작하기') : '다음'}
            <Icon name="arrow" size={17} />
          </button>
        </footer>
      </section>
    </main>
  );
}
