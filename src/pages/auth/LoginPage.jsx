import { useState } from 'react';
import { AuthLogo } from '../../components/AuthLogo.jsx';
import { GoogleMark, MicrosoftMark } from '../../components/SocialMarks.jsx';
import { useRequireSession } from '../../hooks/useSession.js';
import { api } from '../../lib/api.js';
import { rememberSession } from '../../lib/auth.js';
import { currentRoute, navigate } from '../../lib/router.js';
import { loadSession, redirectFor } from '../../lib/session.js';

// 서버가 소셜 로그인 실패 뒤 /login?error=... 로 돌려보낼 때의 안내 문구
const errorMessages = {
  oauth_failed: '계정 연동을 완료하지 못했어요.',
  account_withdrawn: '탈퇴 처리 중인 계정이에요.',
};
const defaultErrorMessage = errorMessages.oauth_failed;

export function LoginPage() {
  const params = new URLSearchParams(currentRoute().search);
  const [mode, setMode] = useState(params.get('mode') === 'login' ? 'login' : 'signup');
  const [errorMessage, setErrorMessage] = useState(
    errorMessages[params.get('error')] ||
      (params.get('error') || params.get('variant') === 'error' ? defaultErrorMessage : ''),
  );
  const [status, setStatus] = useState(
    errorMessage ? 'error' : params.get('variant') === 'connecting' ? 'connecting' : 'default',
  );
  // 이미 로그인했으면 온보딩 또는 앱 화면으로 보낸다.
  useRequireSession('/login');
  const isLogin = mode === 'login';
  const changeMode = (nextMode) => {
    setMode(nextMode);
    setStatus('default');
  };
  // 로그인과 회원가입은 같은 소셜 로그인으로 시작한다. 기업 등록 여부에 따라 서버가 이동할 화면을 정한다.
  const startSocialLogin = (provider) => {
    setStatus('connecting');
    window.location.href = api.loginUrl(provider);
  };
  // 로컬 서버(APP_ENV=local)에만 있는 개발용 로그인. 빌드 결과에는 버튼이 나오지 않는다.
  // 여러 기업 계정으로 인계를 시험할 때 이메일을 바꿔 로그인한다(비우면 dev@example.com)
  const [devEmail, setDevEmail] = useState('');
  const devLogin = async () => {
    setStatus('connecting');
    try {
      await api.devLogin(devEmail.trim() || undefined);
      const session = await loadSession();
      rememberSession(session);
      navigate(redirectFor(session, '/login') || '/wastes');
    } catch {
      setErrorMessage('개발용 로그인에 실패했어요. 서버가 APP_ENV=local로 실행 중인지 확인해 주세요.');
      setStatus('error');
    }
  };
  return (
    <main className="l0-page login-page" data-layer-name="L0-Login" data-variant={status}>
      <AuthLogo />
      <div className="login-stage">
        <aside className="login-showcase" aria-label="SCRAP 서비스 소개">
          <span className="login-showcase-eyebrow">RESOURCE ROUTE PLATFORM</span>
          <h1>
            버려지는 순간부터
            <br />
            <em>다시 쓰이는 경로</em>까지.
          </h1>
          <p>
            분류와 처리업체 확인, 현장 인수까지<br />
            사업장의 자원 흐름을 한곳에서 관리하세요.
          </p>
          <ol className="login-showcase-steps">
            <li><b>01</b><span>폐기물 분류</span></li>
            <li><b>02</b><span>처리경로 준비</span></li>
            <li><b>03</b><span>처리 현황 확인</span></li>
          </ol>
          <div className="login-showcase-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </aside>
        <section className="login-card">
          {status === 'error' && (
            <div className="login-error" role="alert">
              <span>{errorMessage || defaultErrorMessage}</span>
              <button type="button" onClick={() => setStatus('default')}>
                다시 시도
              </button>
            </div>
          )}
          <nav className="login-mode-switch" aria-label="로그인 및 회원가입 선택">
            <button
              type="button"
              className={isLogin ? 'is-active' : ''}
              aria-current={isLogin ? 'page' : undefined}
              onClick={() => changeMode('login')}
            >
              로그인
            </button>
            <button
              type="button"
              className={!isLogin ? 'is-active' : ''}
              aria-current={!isLogin ? 'page' : undefined}
              onClick={() => changeMode('signup')}
            >
              회원가입
            </button>
          </nav>
          <header>
            <span>{isLogin ? 'WELCOME BACK' : 'START WITH SCRAP'}</span>
            <h1>{isLogin ? '다시 만나서 반가워요' : '우리 회사의 자원 경로를 만들어보세요'}</h1>
            <p>
              {isLogin
                ? '등록한 계정으로 자원 경로를 이어서 확인하세요.'
                : '계정을 만든 뒤 회사와 사업장 정보를 등록할 수 있어요.'}
            </p>
          </header>
          <div className="social-login-list">
            <button type="button" onClick={() => startSocialLogin('microsoft')} disabled={status === 'connecting'}>
              {status === 'connecting' ? <span className="login-spinner" /> : <MicrosoftMark />}
              Microsoft로 {isLogin ? '로그인' : '계속하기'}
            </button>
            <button type="button" onClick={() => startSocialLogin('google')} disabled={status === 'connecting'}>
              {status === 'connecting' ? <span className="login-spinner" /> : <GoogleMark />}
              Google로 {isLogin ? '로그인' : '계속하기'}
            </button>
            {/* 개발 서버, 또는 로컬 통합 실행용 빌드(VITE_ENABLE_DEV_LOGIN=true)에서만 보임 */}
            {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true') && (
              <div className="dev-login-group">
                <input
                  type="email"
                  className="dev-login-email"
                  aria-label="개발용 로그인 이메일"
                  placeholder="dev@example.com"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                />
                <button type="button" className="dev-login-button" onClick={devLogin} disabled={status === 'connecting'}>
                  개발용 로그인 (로컬 서버)
                </button>
              </div>
            )}
          </div>
          <p
            className={`social-signup-terms${isLogin ? ' is-placeholder' : ''}`}
            aria-hidden={isLogin ? 'true' : undefined}
          >
            {'계속하면 SCRAP의 '}
            <a href="#terms" tabIndex={isLogin ? -1 : undefined}>이용약관</a>과{' '}
            <a href="#privacy" tabIndex={isLogin ? -1 : undefined}>개인정보 처리방침</a>에 동의하게 됩니다.
          </p>
          <p className="login-switch-copy">
            {isLogin ? '아직 가입하지 않으셨나요?' : '이미 SCRAP 계정이 있으신가요?'}
            <button type="button" onClick={() => changeMode(isLogin ? 'signup' : 'login')}>
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
