// 분류번호의 법령표 조회와 실제 업체의 허가·수락을 구분한다.
export function RecyclingTypes({ assessment, followUp = false, compact = false }) {
  if (followUp) return <p className="wf-evidence-alert" data-testid="recycling-follow-up">현재 산출물은 처음 배출한 폐기물과 달라요. 최초 분류의 R유형을 자동 적용하지 않으며, 다음 인계 전 분류·재활용 조건을 다시 확인해야 해요.</p>;
  if (!assessment) return null;
  if (assessment.status !== 'table_listed') return <p className="wf-evidence-alert" data-testid="recycling-unavailable">이 분류·기준일의 재활용 유형표는 아직 확인되지 않았어요.</p>;
  const groups = [['free', '사전 분석 해당 없음'], ['analysis', '사전 분석·확인 필요'], ['unmarked', '분석 조건 확인 필요']];
  return <section className={`wf-recycling-evidence${compact ? ' is-compact' : ''}`} data-testid="recycling-types" aria-label="재활용 유형과 법령 근거">
    <div className="wf-evidence-title"><span>법령표 기준</span><strong>재활용 유형 · {assessment.waste_code}</strong></div>
    <p className="wf-evidence-caution">법령표에 등재된 유형이에요. 이 업체의 허가나 이번 물량의 수락을 뜻하지 않아요.</p>
    <div className="wf-evidence-table-wrap"><table className="wf-evidence-table"><thead><tr><th scope="col">분석 조건</th><th scope="col">재활용 유형(R코드)</th></tr></thead><tbody>
      {groups.filter(([key]) => assessment.types?.[key]?.length).map(([key, label]) => <tr key={key}><th scope="row">{label}</th><td>{assessment.types[key].map((code) => <span className="wf-r-code" key={code}>{code}</span>)}</td></tr>)}
    </tbody></table></div>
    <p className="wf-muted">R-10은 다음 재활용 목적에 따라 분석 조건이 달라져요. 두 그룹에 표시되면 둘 다 확인해야 해요.</p>
    <div className="wf-evidence-source"><a href={assessment.source?.url} target="_blank" rel="noopener noreferrer">별표 4의3 원문 · {assessment.pages?.join(', ')}쪽</a><span>법 기준일 {assessment.as_of} · 원문 확인 {assessment.source?.checked_on}</span></div>
  </section>;
}
