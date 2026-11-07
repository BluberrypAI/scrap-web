import { useState } from 'react';
import { AuthLogo } from '../../components/AuthLogo.jsx';
import { GoogleMark, MicrosoftMark } from '../../components/SocialMarks.jsx';
import { currentRoute, navigate } from '../../lib/router.js';

export function LoginPage() {
  let e = new URLSearchParams(currentRoute().search).get('variant'),
    [t, n] = useState(e === 'error' ? 'error' : e === 'connecting' ? 'connecting' : 'default'),
    r = () => {
      (n('connecting'),
        window.setTimeout(() => {
          navigate('/onboarding');
        }, 900));
    };
  return (
    <main className="l0-page login-page" data-layer-name="L0-Login" data-variant={t}>
      <AuthLogo />
      <div className="login-stage">
        <section className="login-card">
          {t === 'error' && (
            <div className="login-error" role="alert">
              <span>계정 연동을 완료하지 못했어요.</span>
              <button type="button" onClick={() => n('default')}>
                다시 시도
              </button>
            </div>
          )}
          <header>
            <span>WELCOME TO SCRAP</span>
            <h1>SCRAP 시작하기</h1>
            <p>소셜 계정으로 로그인하면 가입이 함께 진행돼요</p>
          </header>
          <div className="social-login-list">
            <button type="button" onClick={r} disabled={t === 'connecting'}>
              {t === 'connecting' ? <span className="login-spinner" /> : <MicrosoftMark />}
              Microsoft로 계속하기
            </button>
            <button type="button" onClick={r} disabled={t === 'connecting'}>
              {t === 'connecting' ? <span className="login-spinner" /> : <GoogleMark />}Google로
              계속하기
            </button>
          </div>
          <div className="login-divider">
            <span>또는 계정 정보 확인</span>
          </div>
          <div className="login-fields">
            <label>
              이메일
              <input type="email" placeholder="name@company.com" autoComplete="email" />
            </label>
            <label>
              비밀번호
              <input type="password" placeholder="비밀번호" autoComplete="current-password" />
            </label>
          </div>
          <p className="login-terms">
            {'계속하면 SCRAP의 '}
            <a href="#terms">이용약관</a>과 <a href="#privacy">개인정보 처리방침</a>에 동의하게
            됩니다.
          </p>
        </section>
      </div>
    </main>
  );
}
