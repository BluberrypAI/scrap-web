import { AuthenticatedAccount } from './AuthenticatedAccount.jsx';
import { NotificationInbox } from './NotificationInbox.jsx';
import { ArrowUpRightIcon } from './LandingIcons.jsx';
import { StageProgress } from '../pages/wastes/StageProgress.jsx';

export function AppTopNav({ currentStage = null, showStages = true }) {
  return (
    <header className="app-topnav" data-layer-name="TopNav-App">
      <div className="app-topnav-inner">
        <a className="app-wordmark" href="/" data-layer-name="Logo" aria-label="SCRAP 홈">
          <img className="site-brand-logo" src="/images/scrap-logo-2d.png" alt="" />
        </a>
        {showStages && <StageProgress current={currentStage} />}
        <div className="app-account">
          {showStages ? <><NotificationInbox /><AuthenticatedAccount /></> : (
            <a className="landing-button landing-button-primary landing-button-small" href="/wastes">자원 경로 <ArrowUpRightIcon /></a>
          )}
        </div>
      </div>
    </header>
  );
}
