import assert from 'node:assert/strict';
import test from 'node:test';
import { handoffHistoryEvents } from './history.js';

test('인계 기록에는 실제 인계와 처리 단계만 표시한다', () => {
  const actions = ['사진 첨부', '사진 교체', '사진 삭제', '문의 답변', '업체별 반입 질문 답변',
    '인수 검토 요청', '인수 수락', '운송 시작', 'QR 입고 확인', '실제 산출물 기록', '처리 결과 정정'];
  assert.deepEqual(handoffHistoryEvents(actions.map((action) => ({ action }))).map(({ action }) => action),
    ['인수 검토 요청', '인수 수락', '운송 시작', 'QR 입고 확인', '실제 산출물 기록', '처리 결과 정정']);
});
