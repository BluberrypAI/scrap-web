import assert from 'node:assert/strict';
import test from 'node:test';
import { canRegisterLot, stateLabel, formatKg, lotCardStatus, lotCardText, lotProgress, lotTitle, lotToWaste } from './labels.js';

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
