import assert from 'node:assert/strict';
import test from 'node:test';
import { formatKg, lotCardStatus, lotTitle, lotToWaste } from './labels.js';

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
  assert.equal(card.message, '받은 인계 요청');
  assert.equal(lotToWaste({ ...lot, current_company_id: 'B' }, 'B').message, '우리 기업이 처리할 차례예요');
});

test('형태 이름과 중량 표시', () => {
  assert.equal(lotTitle(lot), 'PP 사출 잔재·스크랩');
  assert.equal(formatKg(1000), '1,000kg');
  assert.equal(formatKg(null), '-');
});
