import { CONCERN_CATEGORY, REVIEW_FINDING, REVIEW_STATUS } from './labels.js';

// 공정 후보 업체 한 곳: 공개 근거, 거리, AI 검토 결과(있으면), 이어서 할 일(action)
export function FacilityCard({ facility, review, action = null }) {
  const lotReview = review?.lot_review;
  return (
    <li className="wf-facility">
      <div className="wf-facility-head">
        <div>
          <strong>{facility.label}</strong>
          <span>
            {facility.region}
            {facility.straight_line_distance_km != null && ` · 직선 ${facility.straight_line_distance_km.toFixed(1)}km`}
          </span>
        </div>
        <span className="wf-chip">
          {facility.evidence_basis === 'published_site_process' ? '공개 공정 근거' : '역할 추정'}
        </span>
      </div>
      {facility.recipient !== undefined && (
        <p className="wf-muted">
          {facility.recipient
            ? `수신 계정: ${facility.recipient.name}${facility.recipient.synthetic ? ' (로컬 시험용 계정)' : ''}`
            : '이 업체와 연결된 수신 계정이 없어요. 인수 요청을 보낼 수 없어요.'}
        </p>
      )}
      {facility.checks?.length > 0 && (
        <ul className="wf-checks">
          {facility.checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      )}
      {review && (
        <div className="wf-review" data-status={review.status}>
          <p>
            <strong>{REVIEW_STATUS[review.status] || review.status}</strong>
            {review.finding && ` · ${REVIEW_FINDING[review.finding] || review.finding}`}
          </p>
          {review.quote && <blockquote>{review.quote}</blockquote>}
          {review.next_check && <p className="wf-muted">다음 확인: {review.next_check}</p>}
          {review.source && (
            <a href={review.source.url} target="_blank" rel="noopener noreferrer">
              근거: {review.source.publisher} {review.source.locator}
            </a>
          )}
          {lotReview?.status === 'reviewed' && (
            <div className="wf-lot-review">
              {lotReview.photo_observations?.map((o) => (
                <p key={o.photo_id}>사진 관찰: {o.description}</p>
              ))}
              {lotReview.concerns?.map((c, i) => (
                <p key={i}>
                  <span className="wf-chip">{CONCERN_CATEGORY[c.category] || c.category}</span> {c.concern}
                  <span className="wf-muted"> → {c.next_check}</span>
                </p>
              ))}
              {lotReview.questions?.length > 0 && (
                <ul>
                  {lotReview.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {facility.sources?.length > 0 && (
        <details>
          <summary>공개 자료 {facility.sources.length}건</summary>
          <ul className="wf-sources">
            {facility.sources.map((s) => (
              <li key={s.url + s.locator}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.publisher} · {s.locator}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      {action}
    </li>
  );
}

// 다음 공정 하나(입력 형태 → 산출 형태)와 후보 업체 목록
export function ProcessOption({ option, reviews, renderAction }) {
  return (
    <section className="wf-option">
      <header>
        <h3>{option.label}</h3>
        <p>
          {option.input_state?.label} → {option.output_state?.label}
        </p>
      </header>
      {option.operation_steps?.length > 0 && <p className="wf-muted">{option.operation_steps.join(' · ')}</p>}
      {option.facilities?.length ? (
        <ul className="wf-facilities">
          {option.facilities.map((facility) => (
            <FacilityCard
              key={facility.capability_key}
              facility={facility}
              review={reviews?.[facility.capability_key]}
              action={renderAction?.(facility, reviews?.[facility.capability_key])}
            />
          ))}
        </ul>
      ) : (
        <p className="wf-muted">이 공정의 후보 업체가 아직 없어요.</p>
      )}
    </section>
  );
}
