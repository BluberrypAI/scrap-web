import { useEffect, useState } from 'react';
import {
  displayCase,
  getTreatmentCase,
  loadCase,
} from '../../features/treatment/treatment-state.js';
import { currentRoute } from '../../lib/router.js';
import { hasConfirmedCode } from '../../data/wastes.js';
import { DetailOverlay } from './DetailOverlay.jsx';
import { DetailPanel } from './DetailPanel.jsx';
import { NextActionCard } from './NextActionCard.jsx';
import { AnalysisResultModal } from '../wastes/AnalysisResultModal.jsx';
import { WasteQRShortcut } from './WasteQRShortcut.jsx';
import { RouteMapPanel } from './RouteMapPanel.jsx';

const detailTabs = [
  {
    id: 'route',
    label: '처리경로',
  },
  {
    id: 'classification',
    label: '분류',
  },
];
export function WasteDetailPage({ waste }) {
  const classificationWaste = waste;
  const [, refreshTreatment] = useState(0);
  useEffect(() => {
    const refresh = () => refreshTreatment((revision) => revision + 1);
    window.addEventListener('scrap-treatment-change', refresh);
    return () => window.removeEventListener('scrap-treatment-change', refresh);
  }, []);
  const savedTreatment = loadCase(waste.id);
  if (savedTreatment) waste = { ...waste, ...displayCase(savedTreatment) };
  const routeTreatment = savedTreatment || getTreatmentCase(waste);
  let t = new URLSearchParams(currentRoute().search).get('tab'),
    n = {
      분류: 'classification',
      처리경로: 'route',
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
    <main className="waste-detail is-route-map"
      data-layer-name="L2-WasteDetail" data-variant={waste.status}>
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
          <h1>{waste.name}</h1>
          <div className="detail-code">
            <strong>
              {'분류번호 '}
              {hasConfirmedCode(waste) ? waste.code : '미정'}
            </strong>
            {hasConfirmedCode(waste) && !routeTreatment && (
              <button type="button" onClick={() => o('legal')}>
                근거 조문 보기
              </button>
            )}
          </div>
        </div>
        <WasteQRShortcut waste={waste} />
      </header>
      {!routeTreatment ? (
        <NextActionCard waste={waste} onOpenOverlay={o} />
      ) : null}
      <nav
        className="detail-tabs"
        data-layer-name="L2-WasteDetail-Tabs"
        aria-label="폐기물 상세 메뉴"
      >
        {detailTabs.map((t) => (
          <a
            href={`/wastes/${waste.id}?tab=${t.id}`}
            className={r === t.id ? 'is-active' : ''}
            aria-current={r === t.id ? 'page' : undefined}
            key={t.id}
          >
            {t.label}
          </a>
        ))}
      </nav>
      {r === 'route' ? (
        <RouteMapPanel waste={waste} />
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
