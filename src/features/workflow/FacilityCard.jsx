import { EVIDENCE_GAP, CONCERN_CATEGORY, REVIEW_FINDING, REVIEW_STATUS } from './labels.js';
import { Icon } from '../../components/Icon.jsx';
import { ProcessDiscovery } from './ProcessDiscovery.jsx';
import { distanceLabel, hasRoadDistance } from './route-result.js';

// 공정 후보 업체 한 곳: 공개 근거, 거리, AI 검토 결과(있으면), 이어서 할 일(action)
export function FacilityCard({ facility, review, action = null, selected = false, onSelect }) {
  const lotReview = review?.lot_review;
  const hasDistance = hasRoadDistance(facility) || Number.isFinite(facility.straight_line_distance_km);
  return (
    <li className={`wf-facility${selected ? ' is-selected' : ''}`} id={`facility-${facility.facility_key}`}>
      <div className="wf-facility-head">
        <span className="facility-avatar"><Icon name="building" size={23} /></span>
        <div>
          <strong>{facility.label}</strong>
          <span className="facility-location-line">{facility.region}{onSelect && facility.location && <button type="button" onClick={() => onSelect(facility.facility_key)} aria-pressed={selected}>{selected ? '지도에 표시 중' : '지도에서 위치 보기'}</button>}</span>
        </div>
      </div>
      {hasDistance && <div className="facility-meta-row"><span><Icon name="map" size={15} />{distanceLabel(facility)}</span></div>}
      {facility.recipient !== undefined && (
        <p className="wf-muted">
          {facility.recipient
            ? `수신 계정: ${facility.recipient.name}${facility.recipient.synthetic ? ' (시연용 계정)' : ''}`
            : '이 업체와 연결된 수신 계정이 없어요. 인수 요청을 보낼 수 없어요.'}
        </p>
      )}
      {!review?.process_match && facility.checks?.length > 0 && (
        <section className="facility-facts" aria-label="업체 확인 사항"><h4>업체 확인 사항</h4>
        <ul className="wf-checks">
          {facility.checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
        </section>
      )}
      {review && (
        <div className="wf-review" data-status={review.status}>
          <p>
            <strong>{review.process_match === 'matched' ? '공정 관련 업체' : review.process_match === 'mismatch' ? '재질·공정 불일치' : REVIEW_STATUS[review.status] || review.status}</strong>
            {!review.process_match && review.finding && ` · ${REVIEW_FINDING[review.finding] || review.finding}`}
          </p>
          {review.process_match && <><p className="wf-muted">세부 반입조건은 사진·물량을 보내고 업체와 대화로 확인해요.</p>
            {review.process_quote && <details><summary>공정 연결 근거</summary><blockquote>{review.process_quote}</blockquote>
              {review.process_source && <a href={review.process_source.url} target="_blank" rel="noopener noreferrer">{review.process_source.publisher} · 수집 자료</a>}
            </details>}
            {lotReview?.concerns?.length > 0 && <details><summary>사진·상태 검토</summary>
              {lotReview.concerns.map((c, i) => <p key={i}><span className="wf-chip">{CONCERN_CATEGORY[c.category] || c.category}</span> {c.concern}</p>)}
            </details>}
          </>}
          {!review.process_match && <>
          <div className="facility-review-facts">
          {review.evidence_gaps?.length > 0 && <ul className="wf-checks">{review.evidence_gaps.map((gap) => <li key={gap}>{EVIDENCE_GAP[gap] || '반입 근거를 더 확인해야 해요'}</li>)}</ul>}
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
          </>}
        </div>
      )}
      {facility.sources?.length > 0 && (
        <details className="facility-facts" aria-label="공개 자료">
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
export function ProcessOption({ option, reviews, renderAction, selectedKey = null, onSelect }) {
  return (
    <section className="wf-option">
      <div className="process-option-heading">
        <div className="process-option-title"><h3>{option.label}</h3><span className="process-count">후보 업체 {option.facilities?.length || 0}곳</span></div>
        <p>{option.input_state?.label} → {option.output_state?.label}</p>
      </div>
      {option.facilities?.length ? (
        <ul className="wf-facilities">
          {option.facilities.map((facility) => (
            <FacilityCard
              key={facility.capability_key}
              facility={facility}
              review={reviews?.[facility.capability_key]}
              selected={facility.facility_key === selectedKey}
              onSelect={onSelect}
              action={renderAction?.(facility, reviews?.[facility.capability_key])}
            />
          ))}
        </ul>
      ) : (
        <><p className="wf-muted">이 공정의 후보 업체가 아직 없어요.</p>
        {option.checks?.length > 0 && <ul className="wf-warnings">{option.checks.map((check) => <li key={check}>{check}</li>)}</ul>}
        {option.sources?.length > 0 && <details className="wf-more"><summary>공정 근거</summary><ul>{option.sources.map((source, index) => <li key={index}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher}</a> · {source.locator}</li>)}</ul></details>}</>
      )}
      <ProcessDiscovery key={`${option.transition_key}-${option.web_search_form}`} option={option} />
    </section>
  );
}
