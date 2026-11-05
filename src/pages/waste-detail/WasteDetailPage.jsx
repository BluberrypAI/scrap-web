import { useEffect, useState } from 'react';
import { scrapTreatment } from '../../features/treatment/index.js';
import {
  displayCase,
  getTreatmentCase,
  loadCase,
  transportLegId,
  watchCase,
} from '../../features/treatment/treatment-state.js';
import { currentRoute } from '../../lib/router.js';
import { DetailOverlay } from './DetailOverlay.jsx';
import { DetailPanel } from './DetailPanel.jsx';
import { NextActionCard } from './NextActionCard.jsx';
import { AnalysisResultModal } from '../wastes/AnalysisResultModal.jsx';
import { WasteQRShortcut } from './WasteQRShortcut.jsx';
import * as React from 'react';
import { createWasteTracking } from '../../waste-tracking.jsx';

const { CompanyPanel } = createWasteTracking(React);

const detailTabs = [
  {
    id: 'route',
    label: '처리경로',
  },
  {
    id: 'classification',
    label: '분류',
  },
  { id: 'transport', label: '운송' },
  { id: 'history', label: '기록' },
];
export function WasteDetailPage({ waste }) {
  const classificationWaste = waste;
  const [, refreshTreatment] = useState(0);
  useEffect(() => {
    const refresh = () => refreshTreatment((revision) => revision + 1);
    return watchCase(waste.id, refresh);
  }, [waste.id]);
  const savedTreatment = loadCase(waste.id);
  if (savedTreatment) waste = displayCase(savedTreatment);
  const routeTreatment = savedTreatment || getTreatmentCase(waste);
  const routeParams = new URLSearchParams(currentRoute().search);
  const processorView = routeParams.get('view') === 'processor';
  let t = routeParams.get('tab'),
    n = {
      분류: 'classification',
      처리경로: 'route',
      운송: 'transport',
    },
    r = t && n[t] ? n[t] : detailTabs.some((e) => e.id === t) ? t : 'route',
    [i, a] = useState(null);
  useEffect(() => {
    let e = () => a(null);
    return (
      window.addEventListener('popstate', e),
      () => window.removeEventListener('popstate', e)
    );
  }, []);
  let o = (e) => {
      (window.history.pushState(
        {
          overlay: e,
        },
        '',
      ),
        a(e));
    },
    s = () => {
      window.history.state?.overlay ? window.history.back() : a(null);
    };
  return (
    <main className="waste-detail" data-layer-name="L2-WasteDetail" data-variant={waste.status}>
      <a className="detail-back" href="/wastes">
        <span>←</span>
        {' 내 폐기물'}
      </a>
      <header className="detail-header">
        <div>
          <span>
            {waste.category}
            {' · 마지막 업데이트 '}
            {waste.updatedAt}
          </span>
          <div className="detail-heading-row">
            <h1>{waste.name}</h1>
          </div>
          <div className="detail-code">
            <strong>
              {'분류번호 '}
              {waste.code}
            </strong>
            {!routeTreatment && (
              <button type="button" onClick={() => o('legal')}>
                근거 조문 보기
              </button>
            )}
          </div>
        </div>
        <WasteQRShortcut waste={waste} legId={transportLegId(routeTreatment?.pending)} />
      </header>
      {r === 'route' && (routeTreatment && !routeTreatment.pending ? (
        <scrapTreatment.Summary waste={waste} processorView={processorView} />
      ) : !routeTreatment ? (
        <NextActionCard waste={waste} onOpenOverlay={o} />
      ) : null)}
      <nav
        className="detail-tabs"
        data-layer-name="L2-WasteDetail-Tabs"
        aria-label="폐기물 상세 메뉴"
      >
        {detailTabs.map((t) => (
          <a
            href={`/wastes/${waste.id}?tab=${t.id}${processorView ? '&view=processor' : ''}`}
            className={r === t.id ? 'is-active' : ''}
            aria-current={r === t.id ? 'page' : undefined}
            key={t.id}
          >
            {t.label}
          </a>
        ))}
      </nav>
      {r === 'route' ? (
        <scrapTreatment.Panel waste={waste} processorView={processorView} />
      ) : r === 'transport' ? (
        <CompanyPanel waste={waste} />
      ) : routeTreatment ? (
        <scrapTreatment.SavedTab waste={waste} tab={r} />
      ) : (
        <DetailPanel waste={classificationWaste} tab={r} onOpenLegal={() => o('legal')} />
      )}
      {i === 'analysis' ? (
        <AnalysisResultModal waste={waste} onClose={s} />
      ) : i ? (
        <DetailOverlay type={i} waste={waste} onClose={s} />
      ) : null}
    </main>
  );
}
