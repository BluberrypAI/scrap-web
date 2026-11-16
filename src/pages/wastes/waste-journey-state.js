import { hasConfirmedCode } from '../../data/wastes.js';
import { demoRouteStops } from '../../features/treatment/treatment-demo.js';
import { routeVisualState } from '../waste-detail/route-visual-state.js';

export function wasteJourneyState(waste, treatment, checks = {}) {
  if (!hasConfirmedCode(waste)) return { facilities: [], phase: 'classification', activeIndex: -1 };

  // 문진·처리 건 카드는 서버 상태를 따른다. 브라우저에 남은 데모 경로/현장 체크가
  // 실제 처리 단계보다 앞서 보이게 하지 않는다.
  if (waste.caseId || waste.lotId) {
    const phase = waste.status === '완료' ? 'complete' : waste.status === '처리 진행' ? 'processing' : 'ready';
    const completed = (treatment?.data?.completed || []).map((step, index) => ({
      facility_key: step.capability_key || `completed-${index}`,
      kind: 'recycling',
      mapLabel: step.facility || '처리 업체',
    }));
    const activeOffer = [...(treatment?.offers || [])].reverse().find((offer) =>
      ['pending', 'conditional', 'accepted', 'received'].includes(offer.status) && offer.data?.facility?.label);
    const next = activeOffer ? [{
      facility_key: activeOffer.data.facility.facility_key || activeOffer.id,
      kind: 'recycling',
      mapLabel: activeOffer.data.facility.label,
    }] : [];
    const completedKeys = new Set(completed.map((step) => step.facility_key));
    const facilities = [{ facility_key: 'source', kind: 'source', mapLabel: '배출 사업장' }, ...completed, ...next.filter((step) => !completedKeys.has(step.facility_key))];
    return { facilities, phase, activeIndex: facilities.length > 1 ? facilities.length - 1 : -1 };
  }

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
