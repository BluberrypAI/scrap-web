import { useEffect, useRef, useState } from 'react';
import { demoRouteStops } from '../../features/treatment/treatment-demo.js';
import { getTreatmentCase } from '../../features/treatment/treatment-state.js';
import { fieldCheckEvent, readFieldChecks } from '../../features/tracking/field-checks.js';
import { routeEmptyMessage, routeVisualState } from './route-visual-state.js';
import './RouteMapPanel.css';

export function RouteMapPanel({ waste }) {
  const treatment = getTreatmentCase(waste);
  const planned = treatment?.input.originType === 'demo' && !treatment.input.classificationAsOf
    ? demoRouteStops(treatment.input.material)
    : [];
  const recorded = treatment
    ? [...treatment.completed, treatment.pending].filter(Boolean).map((step, index) => ({
      facility_key: step.capability_key || `recorded-${index}`,
      label: step.facility,
      process: step.process,
      output: step.output,
    })) : [];
  const stops = planned.length ? planned : recorded;
  const host = useRef(null);
  const [checks, setChecks] = useState(() => readFieldChecks(waste.id));
  const [compact, setCompact] = useState(() => window.innerWidth < 700);
  const { phase, activeStopIndex, activeSegmentIndex } = routeVisualState({
    status: waste.status, checks, completedCount: treatment?.completed.length || 0,
    stopCount: stops.length, pending: treatment?.pending,
    routePhase: treatment?.input.classificationAsOf ? 'ready' : waste.routePhase,
    routeStopIndex: waste.routeStopIndex,
    routeLegIndex: waste.routeLegIndex,
  });
  const description = phase === 'complete'
    ? '처리가 완료됐어요. 이동한 경로와 처리 결과를 확인할 수 있어요.'
    : phase === 'ready'
    ? treatment?.input.classificationAsOf
      ? '다음 처리업체를 기록했어요. 인계 확인을 기다리고 있어요.'
      : '분류가 완료됐어요. 예정된 처리업체와 최종 수요업체로 가는 경로를 준비하고 있어요.'
    : phase === 'transporting' ? `${activeSegmentIndex === 0 ? '배출 사업장' :
      stops[activeSegmentIndex - 1]?.label || '이전 업체'}에서 ${stops[activeSegmentIndex]?.label || '다음 업체'}로 운송 중이에요.`
      : `${stops[activeStopIndex]?.label || '처리업체'}에서 ${stops[activeStopIndex]?.process || '처리'} 공정을 진행하고 있어요.`;
  const stopState = (index) => {
    if (phase === 'ready' || phase === 'complete') return phase === 'ready' ? 'planned' : 'done';
    if (phase === 'processing') {
      if (index < activeStopIndex) return 'done';
      return index === activeStopIndex ? 'active' : 'planned';
    }
    if (index < activeSegmentIndex) return 'done';
    return index === activeSegmentIndex ? 'active' : 'planned';
  };
  useEffect(() => {
    if (!stops.length) return undefined;
    let dispose;
    let cancelled = false;
    import('../../features/treatment/world/route-scene.js').then(({ mountRouteScene }) => {
      if (!cancelled && host.current) dispose = mountRouteScene(host.current, {
        stops, planned: phase === 'ready',
        activeStopIndex, activeSegmentIndex,
      });
    });
    return () => { cancelled = true; dispose?.(); };
  }, [stops.length, phase, activeStopIndex, activeSegmentIndex, compact]);

  useEffect(() => {
    const update = () => setCompact(window.innerWidth < 700);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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

  if (!stops.length) return <section className="route-map-panel route-map-empty"
    id="treatment-route" aria-label="폐기물 처리경로 안내">
    <p className="route-status-description">{routeEmptyMessage(waste.status)}</p>
  </section>;

  return <section className="route-map-panel" data-phase={phase}
    id="treatment-route" aria-label="폐기물 처리경로 지도">
    <div className="route-status-panel" onPointerMove={moveSpotlight}>
      <div className="route-status-route">
        <span className="route-status-label">전체 경로</span>
        <div className="route-status-journey" aria-label="전체 처리경로">
          <div className="route-journey-step" data-state={phase === 'ready' ? 'active' : 'done'}>
            <strong>배출지</strong>
            <span>폐기물 배출</span>
          </div>
          {stops.map((stop, index) => <div className="route-journey-item" key={stop.facility_key}>
            <span className="route-journey-arrow" aria-hidden="true">→</span>
            <div className="route-journey-step" data-state={stopState(index)}>
              <strong>{stop.label}</strong>
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
      <div className="route-map-canvas" ref={host} aria-hidden="true" />
    </div>
  </section>;
}
