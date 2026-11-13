import { hasConfirmedCode } from '../../data/wastes.js';
import { demoRouteStops } from '../../features/treatment/treatment-demo.js';
import { routeVisualState } from '../waste-detail/route-visual-state.js';

export function wasteJourneyState(waste, treatment, checks = {}) {
  if (!hasConfirmedCode(waste)) return { facilities: [], phase: 'classification', activeIndex: -1 };

  const recorded = treatment
    ? [...treatment.completed, treatment.pending].filter(Boolean).map((step, index) => ({
      facility_key: step.capability_key || `recorded-${index}`,
      mapLabel: step.facility,
      kind: 'recycling',
    })) : [];
  const planned = treatment?.input.originType === 'demo'
    ? demoRouteStops(treatment.input.material) : [];
  const candidates = recorded.length ? recorded : planned;
  const state = routeVisualState({
    status: waste.status,
    checks,
    completedCount: treatment?.completed.length || 0,
    stopCount: candidates.length,
    pending: treatment?.pending,
    routePhase: waste.routePhase,
    routeStopIndex: waste.routeStopIndex,
    routeLegIndex: waste.routeLegIndex,
  });
  const stops = state.phase === 'ready' ? [...recorded, {
    facility_key: 'unconfirmed', mapLabel: '업체 미정', kind: 'sorting', unconfirmed: true,
  }] : candidates;
  const activeStop = state.phase === 'transporting' ? state.activeSegmentIndex : state.activeStopIndex;
  return {
    facilities: [{ facility_key: 'source', kind: 'source', mapLabel: '배출 사업장' }, ...stops],
    phase: state.phase,
    activeIndex: activeStop < 0 ? -1 : activeStop + 1,
    activeSegmentIndex: state.activeSegmentIndex,
  };
}
