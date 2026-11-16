// 분류번호의 법령표 조회와 실제 업체의 허가·수락을 구분한다.
export function RecyclingTypes({ assessment, followUp = false }) {
  if (followUp) return <p className="wf-muted" data-testid="recycling-follow-up">현재 산출물은 처음 배출한 폐기물과 달라요. 최초 분류의 R유형을 자동 적용하지 않으며, 다음 인계 전 분류·재활용 조건을 다시 확인해야 해요.</p>;
  if (!assessment) return null;
  if (assessment.status !== 'table_listed') return <p className="wf-muted" data-testid="recycling-unavailable">이 분류·기준일의 재활용 유형표는 아직 확인되지 않았어요.</p>;
  const groups = [['free', '사전 분석 해당 없음'], ['analysis', '사전 분석·확인 필요'], ['unmarked', '분석 조건 확인 필요']];
  return <details className="wf-more" data-testid="recycling-types">
    <summary>재활용 유형 확인 · {assessment.waste_code}</summary>
    <p className="wf-muted">법령표에 등재된 유형이에요. 이 업체의 허가나 이번 물량의 수락을 뜻하지 않아요.</p>
    <dl className="wf-facts">{groups.filter(([key]) => assessment.types?.[key]?.length).map(([key, label]) =>
      <div key={key}><dt>{label}</dt><dd>{assessment.types[key].join(', ')}</dd></div>)}</dl>
    <p className="wf-muted">R-10은 다음 재활용 목적에 따라 분석 조건이 달라져요. 두 그룹에 표시되면 둘 다 확인해야 해요.</p>
    <a href={assessment.source?.url} target="_blank" rel="noopener noreferrer">별표 4의3 원문 · {assessment.pages?.join(', ')}쪽</a>
    <p className="wf-muted">법 기준일 {assessment.as_of} · 원문 확인 {assessment.source?.checked_on}</p>
  </details>;
}
