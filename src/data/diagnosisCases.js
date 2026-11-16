// 문진 엔진 건(GET /api/v1/diagnosis/cases의 items) → 폐기물 카드가 쓰는 형식

// 엔진 건 상태 → 카드 진행 상태 (WastesPage의 stages.statuses와 같은 값)
export function cardStatus(item) {
  switch (item.status) {
    case 'CODE_CONFIRMED':
      return '확정';
    case 'IN_TRANSIT':
      return '처리 진행';
    case 'COMPLETED':
      return '완료';
    case 'NEEDS_INFO':
      return '분석 대기';
    default:
      // 결론이 나와 확정을 기다리는 건은 후보
      return item.summary?.result_label ? '후보' : '문진 중';
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}`;
}

export function caseToWaste(item) {
  const summary = item.summary || {};
  const status = cardStatus(item);
  return {
    id: `case-${item.id}`,
    caseId: item.id,
    name: summary.title || '새 폐기물',
    code: summary.code,
    status,
    updatedAt: formatDate(item.last_activity_at || item.updated_at),
    category: summary.result_label || summary.status_label || '',
    // 카드 문구와 상태는 엔진이 준 값을 그대로 씀
    displayStatus: summary.status_label,
    message: summary.next_action,
    // 분류 확인 중이면 문진으로 이어 가고, 확정 뒤에는 상세(처리경로 탭)로 감
    href: ['문진 중', '후보', '분석 대기'].includes(status)
      ? `/wastes/case-${item.id}/survey`
      : `/wastes/case-${item.id}`,
  };
}
