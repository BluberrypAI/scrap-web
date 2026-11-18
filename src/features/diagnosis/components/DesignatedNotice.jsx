import '../designated.css';
import { form12Href } from '../lib/designated.js';

/** 지정폐기물 경고 배너. notice는 designatedNotice()의 결과 */
export function DesignatedBanner({ notice }) {
  if (!notice) return null;
  return (
    <div className="designated-banner" role="alert">
      <span className="designated-banner-icon" aria-hidden="true">⚠</span>
      <div>
        <strong className="designated-banner-title">{notice.title}</strong>
        <p>{notice.warning}</p>
        {notice.reason && <p className="designated-banner-reason">지정 이유: {notice.reason}</p>}
      </div>
    </div>
  );
}

/** "다음 할 일" 목록. 할 일이 없으면 그리지 않는다 */
export function DesignatedNextActions({ notice, caseId, handoff }) {
  const actions = notice?.nextActions || [];
  if (actions.length === 0) return null;
  const href = form12Href(caseId, handoff);
  return (
    <section className="designated-actions" aria-label="지정폐기물 다음 할 일">
      <h4>다음 할 일</h4>
      <ol>
        {actions.map((a, i) => (
          <li key={a.id || i}>
            <span>{a.text}</span>
            {a.source_title && <small className="designated-source">근거: {a.source_title}{a.source_ref ? ` ${a.source_ref}` : ''}</small>}
            {a.form === 'form12' && href && <a className="button button-small button-primary designated-form-link" href={href}>제12호 처리계획서 작성</a>}
          </li>
        ))}
      </ol>
    </section>
  );
}
