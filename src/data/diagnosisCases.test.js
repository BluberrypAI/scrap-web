import assert from 'node:assert/strict';
import test from 'node:test';
import { caseToWaste, cardStatus } from './diagnosisCases.js';

test('엔진 건 상태를 카드 진행 상태로 바꾼다', () => {
  assert.equal(cardStatus({ status: 'DIAGNOSING', summary: {} }), '문진 중');
  assert.equal(cardStatus({ status: 'DIAGNOSING', summary: { result_label: '51-03-01 폐합성수지류' } }), '후보');
  assert.equal(cardStatus({ status: 'NEEDS_INFO' }), '분석 대기');
  assert.equal(cardStatus({ status: 'CODE_CONFIRMED' }), '확정');
});

test('엔진 건을 카드 데이터로 바꾼다', () => {
  const waste = caseToWaste({
    id: 'abc123',
    status: 'CODE_CONFIRMED',
    last_activity_at: '2026-11-12T12:48:20+09:00',
    summary: { title: 'PP 사출 잔재', code: '51-03-01', status_label: '확정', next_action: '처리 경로 보기' },
  });
  assert.equal(waste.id, 'case-abc123');
  assert.equal(waste.code, '51-03-01');
  assert.equal(waste.status, '확정');
  assert.equal(waste.message, '처리 경로 보기');
  assert.equal(waste.href, '/wastes/case-abc123');
  assert.equal(caseToWaste({ id: 'x', status: 'DIAGNOSING', summary: {} }).href, '/wastes/case-x/survey');
  assert.match(waste.updatedAt, /^2026\. 11\. 1[12]$/);
});
