import assert from 'node:assert/strict';
import test from 'node:test';
import { canRegisterLot, stateLabel, formatKg, lotCardStatus, lotCardText, lotProgress, lotStatusLabel, lotTitle, lotToWaste } from './labels.js';

const lot = {
  id: '0819348d-95ec-4946-9dd8-7a5cc0893ff3',
  status: 'offered',
  owner_company_id: 'A',
  current_company_id: 'A',
  companies: { A: '테스트정밀', B: '선별' },
  data: { initial: { input_form: 'scrap' }, handoff: { waste_code: '51-03-01' } },
};

test('처리 건 상태를 자원 경로 단계로 바꾼다', () => {
  assert.equal(lotCardStatus('ready'), '확정');
  assert.equal(lotCardStatus('processing'), '처리 진행');
  assert.equal(lotCardStatus('completed'), '완료');
});

test('받은 인계 카드는 처리 건 화면으로 이동한다', () => {
  const card = lotToWaste(lot, 'B');
  assert.equal(card.href, `/lots/${lot.id}`);
  assert.equal(card.status, '처리 진행');
  assert.equal(card.code, '51-03-01');
  assert.equal(card.name, 'PP 사출 잔재·스크랩');
  assert.equal(card.emitter, '테스트정밀');
  assert.equal(card.message, '상대 기업 응답 대기');
  assert.equal(lotToWaste({ ...lot, current_company_id: 'B' }, 'B').message, '우리 기업이 처리할 차례예요');
});

test('PE 스크랩 인계 카드에는 실제 입력 형태와 배출 기업을 표시한다', () => {
  const pe = { ...lot, data: { ...lot.data, initial: { material: 'pe', input_form: 'scrap' } } };
  assert.equal(lotToWaste(pe, 'B').name, 'PE 스크랩');
  assert.equal(lotToWaste(pe, 'B').emitter, '테스트정밀');
});

test('형태 이름과 중량 표시', () => {
  assert.equal(lotTitle(lot), 'PP 사출 잔재·스크랩');
  assert.equal(formatKg(1000), '1,000kg');
  assert.equal(formatKg(null), '-');
});

test('인수 요청·조건부 수락·QR 안내를 발송자와 수신자에 맞게 표시한다', () => {
  const current = (status) => ({ ...lot, offers: [{ sender_id: 'A', recipient_id: 'B', status }] });
  assert.equal(lotCardText(current('pending'), 'B').message, '받은 인수 요청을 검토해 주세요');
  assert.equal(lotCardText(current('pending'), 'A').message, '상대 기업 응답 대기');
  assert.equal(lotCardText(current('conditional'), 'A').message, '업체가 요청한 추가 자료를 제출해 주세요');
  assert.equal(lotCardText(current('conditional'), 'B').message, '추가 자료 확인 후 수락해 주세요');
  assert.equal(lotCardText(current('accepted'), 'A').message, '입고 QR을 발급해 물량과 함께 보내 주세요');
  assert.equal(lotCardText(current('accepted'), 'B').message, '도착한 물량의 QR로 입고를 확인해 주세요');
});

test('QR 입고 확인 뒤 발송자 단계가 완료되고 전체 처리는 계속 추적한다', () => {
  const base = { ...lot, status: 'accepted', current_company_id: 'A', offers: [{ sender_id: 'A', recipient_id: 'B', status: 'accepted' }] };
  assert.equal(lotProgress(base, 'A').kind, 'active');
  assert.equal(lotCardText(base, 'A').displayStatus, '인수 수락 · 입고 대기');
  assert.equal(lotStatusLabel(base, 'A'), '인수 수락 · 입고 대기');
  const received = { ...base, status: 'processing', current_company_id: 'B', offers: [{ sender_id: 'A', recipient_id: 'B', status: 'received' }] };
  assert.equal(lotProgress(received, 'A').kind, 'handed_off');
  assert.equal(lotProgress(received, 'B').kind, 'active');
  assert.deepEqual(lotCardText(received, 'A'), { displayStatus: '처리 완료', message: '선별에서 처리 중이에요' });
  assert.deepEqual(lotCardText(received, 'B'), { displayStatus: '처리 중', message: '선별에서 처리 중이에요' });
  assert.equal(lotStatusLabel(received, 'A'), '처리 완료');
  assert.equal(lotStatusLabel(received, 'B'), '처리 중');
  assert.equal(lotCardStatus(received.status), '처리 진행');
  const awaitingReview = { ...received, status: 'review_required' };
  assert.deepEqual(lotCardText(awaitingReview, 'A'), { displayStatus: '처리 완료', message: '선별에서 처리 결과를 확인 중이에요' });
  assert.equal(lotCardText(awaitingReview, 'B').message, '선별에서 처리 결과를 확인해 주세요');
  const stored = { ...received, status: 'stored' };
  assert.deepEqual(lotCardText(stored, 'A'), { displayStatus: '처리 완료', message: '선별에서 산출물을 보관 중이에요' });
  assert.equal(lotCardText(stored, 'B').displayStatus, '보관 중');
  const inTransit = { ...received, status: 'accepted', offers: [
    { sender_id: 'A', recipient_id: 'B', status: 'received' },
    { sender_id: 'B', recipient_id: 'C', status: 'accepted', data: { dispatch: { at: '2026-11-21T00:00:00Z' } } },
  ], companies: { ...received.companies, C: '재생' } };
  assert.deepEqual(lotCardText(inTransit, 'A'), { displayStatus: '처리 완료', message: '선별 → 재생 이동 중이에요' });
  assert.equal(lotCardText(inTransit, 'B').displayStatus, '운송 중');
  const nextReceipt = { ...inTransit, status: 'processing', current_company_id: 'C', offers: [
    { ...inTransit.offers[0], status: 'processed' },
    { ...inTransit.offers[1], status: 'received' },
  ] };
  assert.equal(lotCardText(nextReceipt, 'A').displayStatus, '처리 완료');
  assert.equal(lotCardText(nextReceipt, 'B').displayStatus, '처리 완료');
  assert.equal(lotCardText(nextReceipt, 'C').displayStatus, '처리 중');
  assert.equal(lotCardText({ ...received, status: 'completed' }, 'A').displayStatus, '재활용 완료');
});

test('서버가 확인한 소재·번호·형태를 등록하며 로컬 PP 메뉴로 제한하지 않는다', () => {
  for (const [material, form, code] of [
    ['pp', 'film', '51-03-01'], ['pet', 'bottle', '51-03-01'],
    ['abs', 'flake', '51-03-01'], ['pvc', 'wallpaper', '51-03-03'],
    ['eps', 'ingot', '51-03-06'], ['pa6', 'net', '51-03-08'],
  ]) {
    const context = { status: 'ready', route_input: { material, input_form: form, waste_code: code }, available_forms: [{ value: form }] };
    assert.equal(canRegisterLot(context, form), true);
    assert.equal(canRegisterLot({ ...context, status: 'review_required' }, form), false);
    assert.equal(canRegisterLot({ ...context, available_forms: [] }, form), false);
    assert.equal(canRegisterLot(context, 'different-form'), false);
  }
  assert.equal(canRegisterLot(null, 'scrap'), false);
  assert.equal(canRegisterLot({ status: 'ready' }, 'scrap'), false);
});

test('추가 수지의 입고·완료 이름은 서버 공정 이름을 우선한다', () => {
  assert.equal(stateLabel(lot, 'eps-ingot'), 'EPS 감용 인고트');
  assert.equal(stateLabel(lot, 'pa6-net'), 'PA6 폐어망');
  const updated = { ...lot, output_states: [{ key: 'abs-pellet', label: '검수된 ABS 원료' }] };
  assert.equal(stateLabel(updated, 'abs-pellet'), '검수된 ABS 원료');
  assert.equal(stateLabel(lot, null), '형태 미확인');
});
