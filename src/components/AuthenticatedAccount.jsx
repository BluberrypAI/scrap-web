import { useEffect, useState } from 'react';
import { clearAuthenticatedSession } from '../lib/auth.js';
import { Icon } from './Icon.jsx';

export function AuthenticatedAccount() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <div className="app-account">
      <span className="workplace-name">(주)가천정밀</span>
      <button
        className="profile-trigger"
        type="button"
        aria-label="사용자 메뉴"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        김
      </button>
      {open && (
        <div className="profile-menu">
          <div>
            <strong>김수현</strong>
            <span>사업장 관리자</span>
          </div>
          <a href="/data?tab=workplace">
            <Icon name="building" size={17} />
            기업 데이터 관리
          </a>
          <a href="/" onClick={clearAuthenticatedSession}>
            <Icon name="logout" size={17} />
            로그아웃
          </a>
        </div>
      )}
    </div>
  );
}
