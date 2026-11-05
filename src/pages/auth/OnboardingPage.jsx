import { useState } from 'react';
import { AuthLogo } from '../../components/AuthLogo.jsx';
import { Icon } from '../../components/Icon.jsx';
import { GoogleMark } from '../../components/SocialMarks.jsx';
import { navigate } from '../../lib/router.js';

const facilityOptions = ['폐수처리시설', '혼합시설', '세척시설', '반응시설', '건조시설', '저장시설'];

export function OnboardingPage() {
  let [e, t] = useState(0),
    [n, r] = useState(''),
    [i, a] = useState(''),
    [o, s] = useState([]),
    [c, l] = useState([]),
    [f, h] = useState(''),
    u = (e) => {
      s((t) => (t.includes(e) ? t.filter((t) => t !== e) : [...t, e]));
    },
    m = () => {
      let e = f.trim();
      e && (l((t) => (t.includes(e) ? t : [...t, e])), h(''));
    },
    d = () => {
      if (e < 2) {
        t((e) => e + 1);
        return;
      }
      navigate('/wastes');
    };
  return (
    <main className="l0-page onboarding-page" data-layer-name="L0-Onboarding" data-step={e + 1}>
      <AuthLogo />
      <section className="onboarding-card">
        <header className="onboarding-header">
          <span>WORKSPACE SETUP</span>
          <h1>사업장 정보를 알려주세요</h1>
          <p>폐기물 분류와 업체 추천에 필요한 기본 정보예요.</p>
        </header>
        <ol className="onboarding-progress" aria-label="온보딩 진행 단계">
          {['기본 정보', '배출시설', '주생산품'].map((t, n) => (
            <li className={n < e ? 'is-done' : n === e ? 'is-current' : ''} key={t}>
              <span>{n < e ? <Icon name="check" size={14} /> : n + 1}</span>
              <strong>{t}</strong>
            </li>
          ))}
        </ol>
        <div className="onboarding-content">
          {e === 0 && (
            <section className="onboarding-step" data-layer-name="Onboarding-Step-1">
              <div className="linked-account">
                <GoogleMark />
                <label>
                  연동된 이름
                  <input type="text" value="김수현" readOnly />
                </label>
                <label>
                  연동된 이메일
                  <input type="email" value="suhyun@hanbit.co.kr" readOnly />
                </label>
              </div>
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
                <h2>사업장의 주생산품을 입력해 주세요</h2>
              </div>
              <label className="onboarding-field">
                주생산품
                <span className="address-field">
                  <input
                    type="text"
                    value={f}
                    onChange={(e) => h(e.target.value)}
                    onKeyDown={(e) => {
                      e.key === 'Enter' && !e.nativeEvent.isComposing && (e.preventDefault(), m());
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
                  {c.map((e) => (
                    <button
                      type="button"
                      className="is-selected"
                      aria-label={`${e} 삭제`}
                      onClick={() => l((t) => t.filter((t) => t !== e))}
                      key={e}
                    >
                      {e}
                      <Icon name="close" size={15} />
                    </button>
                  ))}
                </div>
              )}
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
