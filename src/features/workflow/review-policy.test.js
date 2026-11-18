import test from 'node:test';
import assert from 'node:assert/strict';
import { canRequestIntake } from './review-policy.js';
const review = { version: 'lot-vision-v1', analysis_version: 'isolated-vision-v2', conditions_version: 'intake-questions-v1', reference_checksum: 'test', conditions_checksum: 'test', recycling_checksum: 'test' };
const facility = { recipient: { id: 'recipient' } };
const result = { status: 'needs_evidence', finding: 'insufficient', lot_review: { status: 'reviewed', observation_method: 'no_photo' } };
test('명확한 사진 불일치는 다른 후보 선택으로 우회할 수 없고 서버 확인이 필요하다', () => {
  const conflict = { ...result, lot_review: { ...result.lot_review, concerns: [{ category: 'description_conflict' }] } };
  const reviewed = { ...review, results: { a: result, b: conflict } };
  assert.equal(canRequestIntake(reviewed, facility, result), false);
  assert.equal(canRequestIntake(reviewed, facility, result, { blocked: true }), false);
  assert.equal(canRequestIntake(reviewed, facility, result, { blocked: false, resolution: { note: '사용자 확인' } }), true);
  assert.equal(canRequestIntake(reviewed, facility, { ...result, status: 'model_unavailable' }, { blocked: false, resolution: {} }), false);
});
test('current review permits recipient consideration without claiming approval', () => {
  assert.equal(canRequestIntake(review, facility, result), true);
  assert.equal(canRequestIntake(review, facility, { ...result, lot_review: { status: 'reviewed', observation_method: 'isolated_vision' } }), true);
});
test('legacy review, missing observation, unavailable AI, restriction and unbound facility cannot be sent', () => {
  assert.equal(canRequestIntake({version:'lot-vision-v1'}, facility, result), false);
  assert.equal(canRequestIntake({...review, conditions_checksum: undefined}, facility, result), false);
  assert.equal(canRequestIntake(review, facility, {...result, lot_review: {status:'reviewed'}}), false);
  assert.equal(canRequestIntake(review, facility, {...result, status:'model_unavailable'}), false);
  assert.equal(canRequestIntake(review, facility, {...result, finding:'restriction_mentioned'}), false);
  assert.equal(canRequestIntake(review, {}, result), false);
});

test('R유형 전달 이전 검토는 다시 검토해야 한다', () => {
  assert.equal(canRequestIntake({ ...review, recycling_checksum: undefined }, facility, result), false);
});

test('업체가 신규 문의를 중단하면 AI 검토 완료여도 요청할 수 없다', () => {
  assert.equal(canRequestIntake(review, { ...facility, supplier_policy: { policy: { accepting_inquiries: false } } }, result), false);
  assert.equal(canRequestIntake(review, { ...facility, supplier_policy: { policy: { accepting_inquiries: true } } }, result), true);
});


test('무관 사진은 다른 업체나 사용자 확인으로 우회할 수 없다', () => {
  const invalid = { ...result, lot_review: { ...result.lot_review, observation_method: 'isolated_vision',
    photo_observations: [{ photo_id: 'wrong', visibility: 'not_waste', description: '캐릭터 그림' }] } };
  const reviewed = { ...review, results: { a: result, b: invalid } };
  assert.equal(canRequestIntake(reviewed, facility, result, { blocked: false, resolution: { note: '확인' } }), false);
  assert.equal(canRequestIntake(review, facility, invalid), false);
  const limited = { ...invalid, lot_review: { ...invalid.lot_review,
    photo_observations: [{ photo_id: 'blur', visibility: 'limited' }] } };
  assert.equal(canRequestIntake({ ...review, results: { b: limited } }, facility, limited), true);
});
