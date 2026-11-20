import { EVIDENCE_GAP, CONCERN_CATEGORY, REVIEW_FINDING, REVIEW_STATUS } from './labels.js';
import { Icon } from '../../components/Icon.jsx';
import { ProcessDiscovery } from './ProcessDiscovery.jsx';
import { distanceLabel, hasRoadDistance } from './route-result.js';

// 공정 후보 업체 한 곳: 공개 근거, 거리, AI 검토 결과(있으면), 이어서 할 일(action)
export function FacilityCard({ facility, review, action = null, selected = false, onSelect }) {
  const lotReview = review?.lot_review;
  const hasDistance = hasRoadDistance(facility) || Number.isFinite(facility.straight_line_distance_km);
  const processMatch = review?.process_match;
  const checks = processMatch ? [] : facility.checks || [];
  const reviewTitle = processMatch === 'matched' ? '취급 소재가 맞는 업체'
    : processMatch === 'mismatch' ? '재질·공정 불일치'
      : review ? REVIEW_STATUS[review.status] || review.status : '';
  const reviewHasDetails = Boolean(review && (processMatch
    ? review.process_quote || review.process_source || lotReview?.concerns?.length
    : review.evidence_gaps?.length || review.quote || review.next_check || review.source
      || lotReview?.photo_observations?.length || lotReview?.concerns?.length || lotReview?.questions?.length));
  return (
    <li className={`wf-facility${selected ? ' is-selected' : ''}`} id={`facility-${facility.facility_key}`}>
      <div className="wf-facility-head">
        <span className="facility-avatar"><Icon name="building" size={23} /></span>
        <div>
          <strong>{facility.label}</strong>
          <span className="facility-location-line">{facility.region}{onSelect && facility.location && <button type="button" onClick={() => onSelect(facility.facility_key)} aria-pressed={selected}>{selected ? '지도에 표시 중' : '지도에서 위치 보기'}</button>}</span>
        </div>
      </div>
      <dl className="facility-summary">
        <div className="facility-summary-row"><dt>거리</dt><dd>{hasDistance ? distanceLabel(facility) : <span className="facility-empty" aria-label="정보 없음">—</span>}</dd></div>
        <div className="facility-summary-row is-attention"><dt>업체 확인 사항</dt><dd>{checks.length ? <ul className="wf-checks">{checks.map((check) => <li key={check}>{check}</li>)}</ul> : <span className="facility-empty" aria-label="정보 없음">—</span>}</dd></div>
        <div className="facility-summary-row" data-status={review?.status || 'unreviewed'}><dt>AI 검토</dt><dd>
          {review ? <>
            <strong className="facility-review-status">{reviewTitle}</strong>
            {processMatch === 'matched' && <span className="facility-review-finding">세부 공정·반입조건은 사진·물량을 보내고 업체와 대화로 확인해요.</span>}
            {!processMatch && review.finding && <span className="facility-review-finding">{REVIEW_FINDING[review.finding] || review.finding}</span>}
            {reviewHasDetails && <details className="facility-row-details"><summary>검토 내용 보기</summary>
              {processMatch ? <>
                {review.process_quote && <blockquote>{review.process_quote}</blockquote>}
                {review.process_source && <a href={review.process_source.url} target="_blank" rel="noopener noreferrer">{review.process_source.publisher} · 수집 자료</a>}
                {lotReview?.concerns?.length > 0 && <div className="wf-lot-review">{lotReview.concerns.map((concern, index) => <p key={index}><span className="wf-chip">{CONCERN_CATEGORY[concern.category] || concern.category}</span> {concern.concern}</p>)}</div>}
              </> : <>
                {review.evidence_gaps?.length > 0 && <ul className="wf-checks">{review.evidence_gaps.map((gap) => <li key={gap}>{EVIDENCE_GAP[gap] || '반입 근거를 더 확인해야 해요'}</li>)}</ul>}
                {review.quote && <blockquote>{review.quote}</blockquote>}
                {review.next_check && <p>다음 확인: {review.next_check}</p>}
                {review.source && <a href={review.source.url} target="_blank" rel="noopener noreferrer">근거: {review.source.publisher} {review.source.locator}</a>}
                {lotReview?.status === 'reviewed' && <div className="wf-lot-review">
                  {lotReview.photo_observations?.map((observation) => <p key={observation.photo_id}>사진 관찰: {observation.description}</p>)}
                  {lotReview.concerns?.map((concern, index) => <p key={index}><span className="wf-chip">{CONCERN_CATEGORY[concern.category] || concern.category}</span> {concern.concern}<span className="wf-muted"> → {concern.next_check}</span></p>)}
                  {lotReview.questions?.length > 0 && <ul>{lotReview.questions.map((question) => <li key={question}>{question}</li>)}</ul>}
                </div>}
              </>}
            </details>}
          </> : <span className="facility-empty" aria-label="검토 전">—</span>}
        </dd></div>
        <div className="facility-summary-row"><dt>공개 자료</dt><dd>{facility.sources?.length ? <details className="facility-row-details"><summary>{facility.sources.length}건 · 자료 보기</summary><ul className="wf-sources">{facility.sources.map((source) => <li key={source.url + source.locator}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher} · {source.locator}</a></li>)}</ul></details> : <span className="facility-empty" aria-label="정보 없음">—</span>}</dd></div>
        <div className="facility-summary-row"><dt>수신 계정</dt><dd>{facility.recipient ? `${facility.recipient.name}${facility.recipient.synthetic ? ' (시연용 계정)' : ''}` : <span className="facility-empty" aria-label={facility.recipient === null ? '연결된 수신 계정 없음' : '정보 없음'}>—</span>}</dd></div>
      </dl>
      {action && <div className="facility-card-actions">{action}</div>}
    </li>
  );
}

// 다음 공정 하나(입력 형태 → 산출 형태)와 후보 업체 목록
export function ProcessOption({ option, index = 0, reviews, renderAction, selectedKey = null, onSelect }) {
  return (
    <section className="wf-option">
      <div className="process-option-heading">
        <span className="process-step-number">공정 후보 {String(index + 1).padStart(2, '0')}</span>
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
