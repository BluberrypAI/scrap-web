import { AppTopNav } from '../components/AppTopNav.jsx';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { DiagnosisCaseScreen, DiagnosisHistoryScreen } from '../features/diagnosis/index.jsx';
import { CaseDetailPage, LotPage, ReceivePage } from '../features/workflow/pages.jsx';
import { handlers } from '../data/handlers.js';
import { wastes } from '../data/wastes.js';
import { CompanyDataPage } from '../pages/data/CompanyDataPage.jsx';
import { HandlerDetailPage } from '../pages/map/HandlerDetailPage.jsx';
import { ResourceMapPage } from '../pages/map/ResourceMapPage.jsx';
import { MatchPage } from '../pages/match/MatchPage.jsx';
import { ReportPage } from '../pages/report/ReportPage.jsx';
import { SurveyPage } from '../pages/survey/SurveyPage.jsx';
import { WasteDetailPage } from '../pages/waste-detail/WasteDetailPage.jsx';
import { WasteTrackingPage } from '../pages/waste-detail/WasteTrackingPage.jsx';
import { WastesPage } from '../pages/wastes/WastesPage.jsx';
import { TaskPlaceholder } from '../pages/workspace/TaskPlaceholder.jsx';

// 기업소개와 같은 하단 푸터는 1단계 메뉴 화면(자원 경로, 순환자원지도, 기업데이터)에만 붙임
const FOOTER_PATHS = ['/wastes', '/map', '/data'];

export function AppShell({ path }) {
  let t = path.match(/^\/wastes\/([^/]+)$/),
    tracking = path.match(/^\/wastes\/([^/]+)\/tracking$/),
    n = path.match(/^\/map\/([^/]+)$/),
    r = path.match(/^\/wastes\/([^/]+)\/(survey|match|report)$/),
    i = t ? wastes.find((e) => e.id === t[1]) : undefined,
    trackingWaste = tracking ? wastes.find((e) => e.id === tracking[1]) : undefined,
    a = r
      ? wastes.find((e) => e.id === r[1]) ||
        (r[2] === 'survey' && /^lot-[a-f0-9-]{36}$/.test(r[1])
          ? {
              id: r[1],
              name: '새 폐기물',
            }
          : undefined)
      : undefined,
    o = n ? handlers.find((e) => e.id === n[1]) : undefined,
    // 문진 엔진 건: 문진(베리 | 채팅 | 판정 보드)과 판정 기록
    dx = path.match(/^\/wastes\/case-([A-Za-z0-9_-]{1,64})\/(survey|history)$/),
    // 기업 간 인계: 처리 건, 입고 QR 확인
    lot = path.match(/^\/lots\/([0-9a-f-]{36})(?:\/receive\/([0-9a-f-]{36}))?$/);
  if (lot)
    return (
      <div className="app-route-shell" data-theme="light">
        <AppTopNav path={path} />
        {lot[2] ? <ReceivePage lotId={lot[1]} offerId={lot[2]} /> : <LotPage lotId={lot[1]} />}
      </div>
    );
  if (dx)
    return (
      <div className="app-route-shell" data-theme="light">
        <AppTopNav path={path} />
        {dx[2] === 'survey' ? <DiagnosisCaseScreen caseId={dx[1]} /> : <DiagnosisHistoryScreen caseId={dx[1]} />}
      </div>
    );
  return a && r && r[2] !== 'match' ? (
    <div className="l3-shell" data-theme="light">
      {r[2] === 'survey' ? (
        <SurveyPage waste={a} />
      ) : r[2] === 'match' ? (
        <MatchPage waste={a} />
      ) : r[2] === 'report' ? (
        <ReportPage waste={a} />
      ) : (
        <TaskPlaceholder waste={a} task={r[2]} />
      )}
    </div>
  ) : (
    <div className="app-route-shell" data-theme="light">
      <AppTopNav path={path} />
      {trackingWaste ? (
        <WasteTrackingPage waste={trackingWaste} />
      ) : i || (r?.[2] === 'match' && a) ? (
        <WasteDetailPage waste={i || a} />
      ) : t && /^case-[A-Za-z0-9_-]{1,64}$/.test(t[1]) ? (
        <CaseDetailPage key={t[1]} caseId={t[1].slice('case-'.length)} />
      ) : o ? (
        <HandlerDetailPage company={o} />
      ) : path === '/map' ? (
        <ResourceMapPage />
      ) : path === '/data' ? (
        <CompanyDataPage />
      ) : (
        <WastesPage />
      )}
      {FOOTER_PATHS.includes(path) && <SiteFooter />}
    </div>
  );
}
