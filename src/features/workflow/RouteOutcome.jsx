import { routeOutcome } from './route-result.js';

// 빈 결과도 현재 물량과 다음 행동을 남긴다. 업체·경로를 임의로 만들지 않는다.
export function RouteOutcome({ status, next, error, message, currentLabel, code, caseId, onRetry, busy }) {
  const outcome = routeOutcome({ status, next, error });
  if (!outcome) return null;
  return (
    <section className="wf-card wf-route-outcome" aria-label="처리 경로 확인 상태">
      <div className="wf-route-progress" aria-label="경로 진행 상태">
        <div><span className="wf-chip">현재 물량</span><strong>{currentLabel || '문진에서 확인한 폐기물'}</strong>
          {code && <small>분류번호 {code}</small>}</div>
        <span className="wf-route-connector" aria-hidden="true">→</span>
        <div className="wf-route-pending"><span className="wf-chip">확인 대기</span>
          <strong>{outcome.kind === 'end_of_route' ? '완료 증빙 확인' : '다음 공정·업체'}</strong></div>
      </div>
      <h3>{outcome.title}</h3>
      {(error || message || next?.message) && <p className="wf-muted" role={error ? 'alert' : undefined}>{error || message || next.message}</p>}
      <p className="wf-muted">{outcome.action}</p>
      <div className="wf-actions">
        {onRetry && <button className="button button-quiet button-small" type="button" onClick={onRetry} disabled={busy}>
          {busy ? '조회 중…' : '경로 다시 조회'}</button>}
        {caseId && <a className="button button-quiet button-small" href={`/wastes/case-${encodeURIComponent(caseId)}/survey`}>문진 내용 확인</a>}
      </div>
    </section>
  );
}
