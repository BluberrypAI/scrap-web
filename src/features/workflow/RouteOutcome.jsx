import { routeOutcome } from './route-result.js';

// 경로 상태는 폐기물 이름 카드 아래에 간결한 안내로 표시한다.
export function RouteOutcome({ status, next, error, message, caseId, onRetry, busy }) {
  const outcome = routeOutcome({ status, next, error });
  if (!outcome) return null;
  return (
    <section className="route-status-notice" data-kind={outcome.kind} aria-label="처리 경로 확인 상태">
      <span className="route-status-kicker">{outcome.kind === 'no_candidates' ? '업체 연결 상태' : '경로 확인'}</span>
      <h3>{outcome.title}</h3>
      {(error || message || next?.message) && <p role={error ? 'alert' : undefined}>{error || message || next.message}</p>}
      <p>{outcome.action}</p>
      <div className="route-status-actions">
        {onRetry && <button type="button" onClick={onRetry} disabled={busy}>{busy ? '조회 중…' : '경로 다시 조회'}</button>}
        {caseId && <a href={`/wastes/case-${encodeURIComponent(caseId)}/survey`}>문진 내용 확인</a>}
      </div>
    </section>
  );
}
