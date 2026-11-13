import { useEffect, useState } from 'react';
import { AppTopNav } from '../components/AppTopNav.jsx';
import { caseToWaste } from '../data/diagnosisCases.js';
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
import { api } from '../lib/api.js';
import { TaskPlaceholder } from '../pages/workspace/TaskPlaceholder.jsx';

// 문진 엔진 건(case-<ID>) 상세: 건 정보를 불러와 기존 상세 화면(기본 처리경로 탭)에 넘긴다
function CaseWasteDetail({ caseId }) {
  const [waste, setWaste] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api.diagnosis
      .getCase(caseId)
      .then((detail) => setWaste(caseToWaste(detail.case)))
      .catch(() => setFailed(true));
  }, [caseId]);
  if (failed) return <WastesPage />;
  if (!waste) return <main className="session-gate" aria-busy="true" />;
  return <WasteDetailPage waste={waste} />;
}

export function AppShell({ path }) {
  let t = path.match(/^\/wastes\/([^/]+)$/),
    tracking = path.match(/^\/wastes\/([^/]+)\/tracking$/),
    n = path.match(/^\/map\/([^/]+)$/),
    r = path.match(/^\/wastes\/([^/]+)\/(survey|match|report)$/),
    i = t ? wastes.find((e) => e.id === t[1]) : undefined,
    trackingWaste = tracking ? wastes.find((e) => e.id === tracking[1]) : undefined,
    a = r
      ? wastes.find((e) => e.id === r[1]) ||
        (r[2] === 'survey' && (/^lot-[a-f0-9-]{36}$/.test(r[1]) || /^case-[A-Za-z0-9_-]{1,64}$/.test(r[1]))
          ? {
              id: r[1],
              name: '새 폐기물',
            }
          : undefined)
      : undefined,
    o = n ? handlers.find((e) => e.id === n[1]) : undefined;
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
        <CaseWasteDetail caseId={t[1].slice('case-'.length)} />
      ) : o ? (
        <HandlerDetailPage company={o} />
      ) : path === '/map' ? (
        <ResourceMapPage />
      ) : path === '/data' ? (
        <CompanyDataPage />
      ) : (
        <WastesPage />
      )}
    </div>
  );
}
