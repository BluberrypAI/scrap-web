import assert from 'node:assert/strict';
import test from 'node:test';
import { workflowNotifications } from './notifications.js';

test('인계 알림은 요청을 받은 기업과 최초 배출 기업에게만 표시한다', () => {
  const lot = {
    id: 'lot-1', diagnosis_id: 'case-1', owner_company_id: 'A',
    companies: { A: 'A사', B: 'B사', C: 'C사' },
    data: { handoff: { waste_code: '51-03-01' }, events: [
      { action: '인수 검토 요청', company_id: 'A', at: '2026-11-17T00:00:00Z' },
      { action: '인수 수락', company_id: 'B', at: '2026-11-17T01:00:00Z' },
      { action: '인수 검토 요청', company_id: 'B', at: '2026-11-17T02:00:00Z' },
    ] },
    offers: [
      { sender_id: 'A', recipient_id: 'B', data: { facility: { label: 'B 사업장' } } },
      { sender_id: 'B', recipient_id: 'C', data: { facility: { label: 'C 사업장' } } },
    ],
  };
  assert.deepEqual(workflowNotifications([lot], 'A').map((item) => item.title), ['새 인수 요청', '인수 요청 수락']);
  assert.deepEqual(workflowNotifications([lot], 'B').map((item) => item.title), ['새 인수 요청']);
  assert.deepEqual(workflowNotifications([lot], 'C').map((item) => item.title), ['새 인수 요청']);
  assert.equal(workflowNotifications([lot], 'A')[0].href, '/wastes/case-case-1');
});
