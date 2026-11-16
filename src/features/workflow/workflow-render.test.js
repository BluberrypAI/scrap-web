import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('등록한 물량 화면이 실제 렌더되고 현재 보유 기업 위치와 서버 형태명을 전달한다', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { LotPanel } = await vite.ssrLoadModule('/src/features/workflow/LotPanel.jsx');
    const lot = {
      id: 'synthetic', revision: 1, status: 'ready', can_manage: true,
      current_company_id: 'b', owner_company_id: 'a',
      companies: { a: '시험 A', b: '시험 B' }, photos: [], offers: [],
      output_states: [{ key: 'ps-bale', label: 'PS 압축 베일 시험명' }],
      data: { current: { state_key: 'ps-bale', mass_kg: 100, condition: '시험 물량' },
        initial: { material: 'ps' }, handoff: { waste_code: '51-03-01' }, completed: [], events: [],
        recycling: { status: 'unavailable' } },
      review: { version: 'lot-vision-v1', analysis_version: 'isolated-vision-v2',
        origin: { latitude: 37.3, longitude: 126.8 }, origin_label: '시험 B의 사업장',
        results: {}, next_step: { status: 'no_route', options: [] } },
    };
    const markup = renderToStaticMarkup(React.createElement(LotPanel, { lotId: lot.id, initialLot: lot }));
    assert.match(markup, /PS 압축 베일 시험명/);
    assert.match(markup, /시험 B의 사업장/);
    assert.match(markup, /출발 사업장만 표시/);
    assert.match(markup, /이전 방식의 검토/);
    assert.match(markup, /재활용 유형표는 아직 확인되지 않았어요/);
    const followUp = { ...lot, data: { ...lot.data, completed: [{
      facility: '시험 B', output: { state_key: 'ps-bale', mass_kg: 100, evidence: '합성 시험기록' },
    }] } };
    const followUpMarkup = renderToStaticMarkup(React.createElement(LotPanel, { lotId: lot.id, initialLot: followUp }));
    assert.match(followUpMarkup, /최초 분류의 R유형을 자동 적용하지 않으며/);
  } finally {
    await vite.close();
  }
});
