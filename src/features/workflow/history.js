// 인계 화면과 보고서에는 실제 인수·운송·처리 흐름만 보여 준다.
const VISIBLE_ACTIONS = new Set([
  '인수 검토 요청',
  '인수 수락',
  '인수 거절',
  '운송 시작',
  'QR 입고 확인',
  '실제 산출물 기록',
  '처리 결과 정정',
  '처리 완료 확인',
  '보관 중으로 기록',
  '추가 가공 선택',
]);

export function handoffHistoryEvents(events = []) {
  return events.filter((event) => VISIBLE_ACTIONS.has(event.action));
}
