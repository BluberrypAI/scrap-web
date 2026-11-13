import { useEffect, useState } from 'react';
import { resetSession, useSession } from '../hooks/useSession.js';
import { api } from '../lib/api.js';
import { clearAuthenticatedSession } from '../lib/auth.js';
import { navigate } from '../lib/router.js';
import { Icon } from './Icon.jsx';

export function AuthenticatedAccount() {
  const [open, setOpen] = useState(false);
  const session = useSession();

  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  // 로그아웃은 서버 세션을 끝낸 뒤 홈으로 간다. 서버가 응답하지 않아도 화면 상태는 지운다.
  // 링크(<a>)로 두면 해시 라우팅이 먼저 페이지를 새로 읽어 요청이 끊기므로 버튼을 쓴다.
  const logout = async () => {
    await api.logout().catch(() => {});
    clearAuthenticatedSession();
    resetSession();
    navigate('/');
  };

  if (session.status === 'signed-out') return null;
  const displayName = session.user?.name || session.user?.email || '';
  const companyName = session.company?.company_name || '';

  return (
    <div className="app-account">
      <span className="workplace-name">{companyName}</span>
      <button
        className="profile-trigger"
        type="button"
        aria-label="사용자 메뉴"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {displayName.charAt(0)}
      </button>
      {open && (
        <div className="profile-menu">
          <div>
            <strong>{displayName}</strong>
            <span>사업장 관리자</span>
          </div>
          <a href="/data?tab=workplace">
            <Icon name="building" size={17} />
            기업 데이터 관리
          </a>
          <button type="button" onClick={logout}>
            <Icon name="logout" size={17} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
