import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('보고서에 저장된 분류·업체 선택·인계 근거만 표시한다', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { WorkflowEvidenceReport } = await vite.ssrLoadModule('/src/features/workflow/WorkflowEvidenceReport.jsx');
    const lot = {
      id: 'lot-1', status: 'processing', owner_company_id: 'a', current_company_id: 'b',
      companies: { a: '배출 업체', b: '처리 업체' },
      data: {
        handoff: { waste_code: '51-03-01', facts: { material: { value: 'PE', status: 'CLAIMED' } },
          basis: [{ id: 'B1', ref: '폐기물관리법 시행규칙 별표 4', excerpt: '분류 근거 예시' }] },
        events: [
          { action: '사진 교체', company_id: 'a', at: '2026-11-21T01:00:00Z' },
          { action: 'QR 입고 확인', company_id: 'b', at: '2026-11-21T02:00:00Z' },
        ],
        completed: [],
      },
      offers: [{ id: 'offer-1', sender_id: 'a', recipient_id: 'b', status: 'received', data: {
        facility: { label: '처리 업체 사업장', sources: [{ publisher: '공개 명부', url: 'https://example.com/list' }] },
        option: { label: '선별' }, current: { state_key: 'pe-scrap', mass_kg: 200 },
        ai_review: { process_match: 'matched', process_quote: 'PE 취급 기록' },
      } }],
    };
    const html = renderToStaticMarkup(React.createElement(WorkflowEvidenceReport, { lot }));
    for (const phrase of ['51-03-01', '폐기물관리법 시행규칙 별표 4', '처리 업체 사업장',
      '취급 소재 일치', '공개 명부', 'QR 입고 확인', 'PDF로 내보내기']) assert.match(html, new RegExp(phrase));
    assert.doesNotMatch(html, /사진 교체|처리 건 현황|현재 물량 확인 사항/);
  } finally { await vite.close(); }
});
