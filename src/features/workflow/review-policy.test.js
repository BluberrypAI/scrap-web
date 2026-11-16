import test from 'node:test';
import assert from 'node:assert/strict';
import { canRequestIntake } from './review-policy.js';
const review = { version: 'lot-vision-v1', analysis_version: 'isolated-vision-v2', conditions_version: 'intake-questions-v1', reference_checksum: 'test', conditions_checksum: 'test' };
const facility = { recipient: { id: 'recipient' } };
const result = { status: 'needs_evidence', finding: 'insufficient', lot_review: { status: 'reviewed', observation_method: 'no_photo' } };
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
