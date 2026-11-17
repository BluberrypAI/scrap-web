// 서버 offer 게이트와 동일한 최소 조건. 실제 허가·반입 승인은 수신 기업이 확인한다.
export function canRequestIntake(review, facility, result, conflictGate) {
  const hasConflict = Object.values(review?.results || { current: result }).some(r =>
    r?.lot_review?.concerns?.some(c => c.category === 'description_conflict'));
  return Boolean(!conflictGate?.blocked && (!hasConflict || conflictGate?.resolution)
    && facility?.recipient
    && facility?.supplier_policy?.policy?.accepting_inquiries !== false
    && review?.version === 'lot-vision-v1'
    && review?.analysis_version === 'isolated-vision-v2'
    && review?.conditions_version === 'intake-questions-v1'
    && review?.recycling_checksum
    && review?.reference_checksum && review?.conditions_checksum
    && ['reviewed', 'needs_evidence'].includes(result?.status)
    && result?.finding !== 'restriction_mentioned'
    && result?.lot_review?.status === 'reviewed'
    && ['isolated_vision', 'no_photo'].includes(result?.lot_review?.observation_method));
}
