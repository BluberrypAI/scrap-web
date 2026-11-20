// 후보별로 반복된 무관 사진 관찰을 사진 ID로 합친다.
export function invalidReviewPhotos(review) {
  return [...new Map(Object.values(review?.results || {}).flatMap(r =>
    (r?.lot_review?.photo_observations || []).filter(p => p.visibility === 'not_waste')
  ).map(p => [p.photo_id, p])).values()];
}

// 서버 offer 게이트와 동일한 최소 조건. 실제 허가·반입 승인은 수신 기업이 확인한다.
export function canRequestIntake(review, facility, result, conflictGate) {
  const hasConflict = Object.values(review?.results || { current: result }).some(r =>
    r?.lot_review?.concerns?.some(c => c.category === 'description_conflict'));
  return Boolean(!invalidReviewPhotos({ results: { ...(review?.results || {}), current: result } }).length && !conflictGate?.blocked && (!hasConflict || conflictGate?.resolution)
    && facility?.recipient
    && facility?.supplier_policy?.policy?.accepting_inquiries !== false
    && review?.version === 'lot-vision-v1'
    && review?.analysis_version === 'isolated-vision-v2'
    && review?.conditions_version === 'intake-questions-v1'
    && review?.recycling_checksum
    && review?.reference_checksum && review?.conditions_checksum
    && ['reviewed', 'needs_evidence'].includes(result?.status)
    && result?.finding !== 'restriction_mentioned'
    && !['unverified', 'mismatch'].includes(result?.process_match)
    && result?.lot_review?.status === 'reviewed'
    && ['isolated_vision', 'no_photo'].includes(result?.lot_review?.observation_method));
}
