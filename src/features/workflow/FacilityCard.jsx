import { EVIDENCE_GAP, CONCERN_CATEGORY, REVIEW_FINDING, REVIEW_STATUS, recipientAccountLabel } from './labels.js';
import { Icon } from '../../components/Icon.jsx';
import { distanceLabel, hasRoadDistance } from './route-result.js';

// AI 검토 한 줄 요약. 카드와 상세가 같은 문구를 쓴다.
export function reviewSummary(review) {
  if (!review) return null;
  const processMatch = review.process_match;
  if (processMatch === 'mismatch') return { tone: 'bad', title: '재질·공정 불일치', note: '' };
  if (review.finding === 'restriction_mentioned') return { tone: 'bad', title: '공개 자료에 반입 제한', note: REVIEW_FINDING.restriction_mentioned };
  if (processMatch === 'matched' && ['reviewed', 'needs_evidence'].includes(review.status)) return { tone: 'good', title: '취급 소재가 맞는 업체', note: '세부 공정·반입조건은 사진·물량을 보내고 업체와 대화로 확인해요.' };
  const title = REVIEW_STATUS[review.status] || review.status;
  const note = review.finding ? REVIEW_FINDING[review.finding] || review.finding : '';
  return { tone: review.status === 'reviewed' ? 'good' : 'warn', title, note };
}

function shortDistance(facility) {
  if (hasRoadDistance(facility)) return { value: `${facility.road_distance_km.toFixed(1)} km`, basis: '도로' };
  if (Number.isFinite(facility.straight_line_distance_km)) return { value: `${facility.straight_line_distance_km.toFixed(1)} km`, basis: '직선' };
  return null;
}

// 후보 목록의 업체 한 곳. 비교에 필요한 정보만 보이고, 누르면 오른쪽 상세가 바뀐다.
export function FacilityListItem({ facility, review, status, active = false, panelId, onActivate }) {
  const summary = reviewSummary(review);
  const distance = shortDistance(facility);
  return (
    <li className="facility-item">
      <button type="button" className={`facility-item-button${active ? ' is-active' : ''}`} id={`facility-${facility.capability_key}`}
        aria-pressed={active} aria-controls={panelId} onClick={() => onActivate(facility)}>
        <span className="facility-avatar" aria-hidden="true"><Icon name="building" size={20} /></span>
        <span className="facility-item-main">
          <span className="facility-item-name">{facility.label}</span>
          <span className="facility-item-region">{facility.region || '지역 정보 없음'}</span>
          <span className="facility-item-tags">
            {summary && <span className="facility-tag" data-tone={summary.tone}>{summary.title}</span>}
            {status && <span className="facility-tag" data-tone={status.tone}>{status.label}</span>}
            {facility.recipient?.guest === true &&
              <span className="facility-tag" data-tone="hold">{recipientAccountLabel(facility.recipient)}</span>}
          </span>
        </span>
        <span className="facility-item-side">
          {distance ? <><strong>{distance.value}</strong><small>{distance.basis}</small></> : <small>거리 미확인</small>}
          <span className="facility-item-open">업체 확인<Icon name="arrow" size={14} /></span>
        </span>
      </button>
    </li>
  );
}

// 오른쪽 상세 패널: 지금 할 일 → AI 검토 → 업체 확인 사항 → 업체 안내 조건 → 공개 자료
export function FacilityDetail({ option, index = 0, facility, review, action = null, extra = null, headingRef }) {
  const recipient = facility.recipient;
  const accountLabel = recipientAccountLabel(recipient);
  const summary = reviewSummary(review);
  const lotReview = review?.lot_review;
  const processMatch = review?.process_match;
  const checks = processMatch ? [] : facility.checks || [];
  const concerns = lotReview?.concerns || [];
  const evidence = Boolean(review && (processMatch
    ? review.process_quote || review.process_source
    : review.evidence_gaps?.length || review.quote || review.next_check || review.source
      || lotReview?.photo_observations?.length || lotReview?.questions?.length));
  return (
    <article className="facility-detail" aria-labelledby={`facility-detail-${facility.capability_key}`}>
      <header className="facility-detail-head">
        <span className="facility-detail-process">공정 후보 {String(index + 1).padStart(2, '0')} · {option.label}</span>
        <h3 id={`facility-detail-${facility.capability_key}`} ref={headingRef} tabIndex={-1}>{facility.label}</h3>
        <p>{facility.region || '지역 정보 없음'}</p>
        <dl className="facility-detail-facts">
          <div><dt>처리 형태</dt><dd>{option.input_state?.label || '현재 물량'} → {option.output_state?.label || '다음 형태'}</dd></div>
          <div><dt>거리</dt><dd>{distanceLabel(facility)}</dd></div>
          <div><dt>수신 계정</dt><dd>{recipient ? <>
            {recipient.name}
            {accountLabel && (recipient.guest === true
              ? <> <span className="facility-tag" data-tone="hold">{accountLabel}</span></>
              : ` (${accountLabel})`)}
          </> : '연결된 계정 없음'}</dd></div>
        </dl>
      </header>

      {action}

      <section className="facility-detail-section" aria-label="AI 검토">
        <h4><Icon name="spark" size={15} />AI 검토</h4>
        {summary ? <>
          <p className="facility-detail-verdict" data-tone={summary.tone}>{summary.title}</p>
          {summary.note && <p className="facility-detail-note">{summary.note}</p>}
          {concerns.length > 0 && <ul className="facility-concerns">{concerns.map((concern, i) => <li key={i}>
            <span className="wf-chip">{CONCERN_CATEGORY[concern.category] || concern.category}</span>
            <span>{concern.concern}{!processMatch && concern.next_check && <small> → {concern.next_check}</small>}</span>
          </li>)}</ul>}
          {evidence && <details className="facility-detail-more"><summary>검토 근거 보기</summary>
            {processMatch ? <>
              {review.process_quote && <blockquote>{review.process_quote}</blockquote>}
              {review.process_source && <a href={review.process_source.url} target="_blank" rel="noopener noreferrer">{review.process_source.publisher} · 수집 자료</a>}
            </> : <>
              {review.evidence_gaps?.length > 0 && <ul>{review.evidence_gaps.map((gap) => <li key={gap}>{EVIDENCE_GAP[gap] || '반입 근거를 더 확인해야 해요'}</li>)}</ul>}
              {review.quote && <blockquote>{review.quote}</blockquote>}
              {review.next_check && <p>다음 확인: {review.next_check}</p>}
              {review.source && <a href={review.source.url} target="_blank" rel="noopener noreferrer">근거: {review.source.publisher} {review.source.locator}</a>}
              {lotReview?.photo_observations?.map((observation) => <p key={observation.photo_id}>사진 관찰: {observation.description}</p>)}
              {lotReview?.questions?.length > 0 && <ul>{lotReview.questions.map((question) => <li key={question}>{question}</li>)}</ul>}
            </>}
          </details>}
          <p className="facility-detail-disclaimer">AI는 공개 자료와 현재 물량을 대조했을 뿐이에요. 실제 인수 여부는 받는 업체가 결정해요.</p>
        </> : <p className="facility-detail-note">아직 AI 검토 전이에요.</p>}
      </section>

      {checks.length > 0 && <section className="facility-detail-section is-attention" aria-label="업체 확인 사항">
        <h4><Icon name="check" size={15} />업체에 확인할 사항</h4>
        <ul>{checks.map((check) => <li key={check}>{check}</li>)}</ul>
      </section>}

      {extra && <section className="facility-detail-section" aria-label="업체가 안내한 반입조건">
        <h4><Icon name="archive" size={15} />업체가 안내한 반입조건</h4>
        {extra}
      </section>}

      {facility.sources?.length > 0 && <section className="facility-detail-section" aria-label="공개 자료">
        <details className="facility-detail-more"><summary>공개 자료 {facility.sources.length}건</summary>
          <ul>{facility.sources.map((source) => <li key={source.url + source.locator}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher} · {source.locator}</a></li>)}</ul>
        </details>
      </section>}
    </article>
  );
}

// 상세 패널의 '지금 할 일' 상자. 요청 가능 여부와 다음 행동을 한 곳에 둔다.
export function FacilityNextStep({ tone = 'hold', title, children, actions = null }) {
  return (
    <section className="facility-next-step" data-tone={tone} aria-label="지금 할 일">
      <span className="facility-next-step-label">지금 할 일</span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {actions && <div className="facility-next-step-actions">{actions}</div>}
    </section>
  );
}
