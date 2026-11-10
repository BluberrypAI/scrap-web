import { lazy, Suspense, useEffect, useState } from 'react';
import { demoRouteStops } from '../../features/treatment/treatment-demo.js';
import { getTreatmentCase } from '../../features/treatment/treatment-state.js';
import { fieldCheckEvent, readFieldChecks } from '../../features/tracking/field-checks.js';
import { BerryDock } from '../survey/BerryDock.jsx';
import { routeEmptyMessage, routeStopState, routeVisualState, visibleRouteStops } from './route-visual-state.js';
import './RouteMapPanel.css';

const MapboxRouteMap = lazy(() => import('./MapboxRouteMap.jsx')
  .then((module) => ({ default: module.MapboxRouteMap })));

export function RouteMapPanel({ waste }) {
  const treatment = getTreatmentCase(waste);
  const planned = treatment?.input.originType === 'demo'
    ? demoRouteStops(treatment.input.material)
    : [];
  const recorded = treatment
    ? [...treatment.completed, treatment.pending].filter(Boolean).map((step, index) => ({
      facility_key: step.capability_key || `recorded-${index}`,
      label: step.facility,
      mapLabel: step.facility,
      region: step.address,
      location: step.location,
    })) : [];
  const stops = planned.length ? planned : recorded;
  const [checks, setChecks] = useState(() => readFieldChecks(waste.id));
  const [mapLoadState, setMapLoadState] = useState('loading');
  const { phase, activeStopIndex, activeSegmentIndex } = routeVisualState({
    status: waste.status, checks, completedCount: treatment?.completed.length || 0,
    stopCount: stops.length, pending: treatment?.pending,
    routePhase: waste.routePhase, routeStopIndex: waste.routeStopIndex,
    routeLegIndex: waste.routeLegIndex,
  });
  const visibleStops = visibleRouteStops(phase, stops);
  const berryMessage = {
    loading: '대한민국 지도를 불러오고 있어요. 잠시만 기다려 주세요!',
    'missing-token': 'Mapbox 연결 정보가 없어요. 공개 액세스 토큰을 확인해 주세요.',
    unsupported: '이 브라우저에서는 지도를 표시하기 어려워요. WebGL을 지원하는 최신 브라우저에서 다시 열어 주세요.',
    timeout: '지도를 불러오는 데 시간이 오래 걸리고 있어요. 네트워크를 확인한 뒤 새로고침해 주세요.',
    error: '지도를 불러오지 못했어요. 토큰의 허용 URL과 브라우저 콘솔을 확인해 주세요.',
  }[mapLoadState];
  const description = phase === 'complete'
    ? '처리가 완료됐어요. 이동한 경로와 처리 결과를 확인할 수 있어요.'
    : phase === 'ready'
    ? '처리 가능 업체를 확인하고 있어요.\n업체 수와 위치가 확정되면 경로에 표시돼요.'
    : phase === 'transporting' ? `${activeSegmentIndex === 0 ? '화성 배출사업장' :
      stops[activeSegmentIndex - 1]?.mapLabel || stops[activeSegmentIndex - 1]?.label || '이전 업체'}에서 ${stops[activeSegmentIndex]?.mapLabel || stops[activeSegmentIndex]?.label || '다음 업체'}로 운송 중이에요.`
      : `${stops[activeStopIndex]?.mapLabel || stops[activeStopIndex]?.label || '처리업체'}에서 ${stops[activeStopIndex]?.process || '처리'} 공정을 진행하고 있어요.`;
  useEffect(() => {
    const refresh = () => setChecks(readFieldChecks(waste.id));
    window.addEventListener(fieldCheckEvent, refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(fieldCheckEvent, refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [waste.id]);

  function moveSpotlight(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  }

  if (!stops.length && !treatment?.input.origin) return <section className="route-map-panel route-map-empty"
    id="treatment-route" aria-label="폐기물 처리경로 안내">
    <p className="route-status-description">{routeEmptyMessage(waste.status)}</p>
  </section>;

  return <><section className="route-map-panel" data-phase={phase}
    id="treatment-route" aria-label="폐기물 처리경로 지도">
    <div className="route-status-panel" onPointerMove={moveSpotlight}>
      <div className="route-status-route">
        <span className="route-status-label">전체 경로</span>
        <div className="route-status-journey" aria-label="전체 처리경로">
          <div className="route-journey-step" data-state={phase === 'ready' ? 'active' : 'done'}>
            <strong>배출지</strong>
            <span>폐기물 배출</span>
          </div>
          {phase === 'ready' && <div className="route-journey-item">
            <span className="route-journey-arrow" aria-hidden="true">→</span>
            <div className="route-journey-step" data-state="waiting">
              <strong>처리 경로 확인 중</strong>
              <span>업체 수·위치 미정</span>
            </div>
          </div>}
          {visibleStops.map((stop, index) => <div className="route-journey-item" key={stop.facility_key}>
            <span className="route-journey-arrow" aria-hidden="true">→</span>
            <div className="route-journey-step" data-state={routeStopState({
              phase, index, activeStopIndex, activeSegmentIndex,
            })}>
              <strong>{stop.mapLabel || stop.label}</strong>
              <span>{stop.kind === 'manufacturing'
                ? `${stop.output || '재생 원료'} 공급`
                : stop.process || '처리'}</span>
            </div>
          </div>)}
        </div>
        <p className="route-status-description">{description}</p>
      </div>
    </div>
    <div className="route-map-world">
      <Suspense fallback={<div className="route-map-skeleton" aria-hidden="true"><span /></div>}>
        <MapboxRouteMap
          stops={visibleStops}
          origin={treatment?.input.origin}
          phase={phase}
          activeStopIndex={activeStopIndex}
          activeSegmentIndex={activeSegmentIndex}
          onLoadStateChange={setMapLoadState}
        />
      </Suspense>
    </div>
  </section>{berryMessage && <BerryDock message={berryMessage} />}</>;
}
