export function routeVisualState({ status, checks, completedCount, stopCount, pending,
  routePhase, routeStopIndex, routeLegIndex }) {
  const phase = status === '완료' ? 'complete' : checks.recipient ? 'processing'
    : checks.driver ? 'transporting'
      : routePhase || (status === '처리 진행' || pending ? 'processing' : 'ready');
  const nextStop = Math.min(completedCount, stopCount - 1);
  return {
    phase,
    inProgress: phase === 'transporting' || phase === 'processing',
    activeStopIndex: phase === 'processing' && stopCount > 0
      ? Math.min(routeStopIndex ?? nextStop, stopCount - 1) : -1,
    activeSegmentIndex: phase === 'transporting' && stopCount > 0
      ? Math.min(routeLegIndex ?? nextStop, stopCount - 1) : -1,
  };
}

export function routeEmptyMessage(status) {
  return {
    '문진 중': '문진 중이에요. 문진을 완료하면 분류 결과를 바탕으로 처리경로를 확인할 수 있어요.',
    후보: '분류 후보를 확인 중이에요. 분류번호가 확정되면 처리경로를 확인할 수 있어요.',
    '분석 대기': '성상 분석 결과를 기다리고 있어요. 결과가 나오면 처리경로를 확인할 수 있어요.',
    확정: '분류가 확정됐어요. 처리경로를 준비하고 있어요.',
    '처리 진행': '처리 중이에요. 연결된 경로 정보가 아직 없어요.',
    완료: '처리가 완료됐어요. 처리 결과는 처리 이력에서 확인할 수 있어요.',
  }[status] || '분류 정보를 확인하면 처리경로를 볼 수 있어요.';
}
