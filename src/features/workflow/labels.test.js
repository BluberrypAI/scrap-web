import assert from 'node:assert/strict';
import test from 'node:test';
import { canRegisterLot, formatKg, lotCardStatus, lotCardText, lotProgress, lotTitle, lotToWaste } from './labels.js';

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
  assert.match(card.name, /테스트정밀/);
  assert.equal(card.message, '상대 기업 응답 대기');
  assert.equal(lotToWaste({ ...lot, current_company_id: 'B' }, 'B').message, '우리 기업이 처리할 차례예요');
});

test('형태 이름과 중량 표시', () => {
  assert.equal(lotTitle(lot), 'PP 사출 잔재·스크랩');
  assert.equal(formatKg(1000), '1,000kg');
  assert.equal(formatKg(null), '-');
});

test('우리 몫이 끝났는지: 받는 쪽 입고 확인 뒤에만 전달 완료', () => {
  const base = { ...lot, status: 'accepted', current_company_id: 'A', offers: [{ sender_id: 'A', recipient_id: 'B', status: 'accepted' }] };
  assert.equal(lotProgress(base, 'A').kind, 'active');
  const received = { ...base, status: 'processing', current_company_id: 'B', offers: [{ sender_id: 'A', recipient_id: 'B', status: 'received' }] };
  assert.equal(lotProgress(received, 'A').kind, 'handed_off');
  assert.equal(lotProgress(received, 'B').kind, 'active');
  assert.deepEqual(lotCardText(received, 'A'), { displayStatus: '전달 완료', message: '처리 추적 중' });
  assert.equal(lotCardText(received, 'B').message, '우리 기업이 처리할 차례예요');
  assert.equal(lotProgress({ ...received, status: 'completed' }, 'A').kind, 'completed');
});

test('인계 등록은 문진·처리경로가 함께 지원하는 재질·형태만', () => {
  assert.equal(canRegisterLot('pp', 'scrap'), true);
  assert.equal(canRegisterLot('pe', 'film'), true);
  assert.equal(canRegisterLot('aluminium', 'can'), true);
  assert.equal(canRegisterLot('pp', 'film'), false);
  assert.equal(canRegisterLot('pet', 'bottle'), false);
});
