import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('사진 불일치 화면은 수정·확인 및 재문진 안내와 수신자 확인 기록을 제공한다', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { PhotoConflict, PhotoConflictReceipt } = await vite.ssrLoadModule('/src/features/workflow/PhotoConflict.jsx');
    const issues = [{ concern: '여러 색 조각 관찰과 흰색만 있다는 설명 불일치' }];
    const lot = { data: { current: { condition: '흰색 조각만 있습니다' } }, photo_conflict_gate: { blocked: true, issues } };
    const html = renderToStaticMarkup(React.createElement(PhotoConflict, { lot }));
    assert.match(html, /인수 요청을 보낼 수 없어요/);
    assert.match(html, /분류번호는 변경하지 않아요/);
    assert.match(html, /재문진/);
    assert.match(html, /disabled="">기존 설명 확인 내용 기록/);
    assert.match(html, /disabled="">설명 수정 후 다시 검토하기/);
    const note = { note: '실물과 사진을 대조한 시험 확인 사유', issues };
    const receipt = renderToStaticMarkup(React.createElement(PhotoConflictReceipt, { value: note }));
    assert.match(receipt, /실물과 사진을 대조한 시험 확인 사유/);
    assert.match(receipt, /여러 색 조각/);
    assert.match(receipt, /수신 업체가 최종 확인/);
  } finally { await vite.close(); }
});

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

test('최신 인계 UI가 조건부·QR·실제 산출물·완료 단계의 행동과 근거를 보존한다', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { LotPanel } = await vite.ssrLoadModule('/src/features/workflow/LotPanel.jsx');
    const current = { state_key: 'pp-scrap', mass_kg: 1000, condition: '합성 시험 물량' };
    const base = { id: 'synthetic', revision: 1, status: 'accepted', can_manage: true,
      current_company_id: 'a', owner_company_id: 'a', companies: { a: '시험 A', b: '시험 B' },
      photos: [], offers: [], output_states: [{ key: 'pp-pellet', label: '재생 펠렛' }],
      data: { current, initial: { material: 'pp' }, handoff: { waste_code: '51-03-01' }, completed: [], events: [] } };
    const offer = { id: 'handoff', status: 'accepted', sender_id: 'a', recipient_id: 'b', can_issue_qr: true,
      data: { current, facility: { label: 'B 시험사업장' } } };
    const render = (lot, props = {}) => renderToStaticMarkup(React.createElement(LotPanel, { lotId: lot.id, initialLot: lot, ...props }));
    // 최신 UI는 인수 요청 카드에서 발급한다. 별도 헤더 영역에 의존하지 않는다.
    const accepted = render({ ...base, offers: [offer] });
    assert.match(accepted, /시험 B의 입고를 기다리고 있어요/);
    assert.match(accepted, /입고 QR 발급/);
    const conditional = render({ ...base, status: 'conditional', offers: [{
      ...offer, status: 'conditional', can_issue_qr: false, can_respond_conditions: true,
      data: { ...offer.data, conditions: [{ id: 'pack', text: '밀봉 상태 확인' }] },
    }] });
    assert.match(conditional, /조건 확인 자료 보내기/);
    assert.doesNotMatch(conditional, />입고 QR 발급</);
    const processing = render({ ...base, status: 'processing', current_company_id: 'b' });
    assert.match(processing, /실제 산출물/);
    assert.doesNotMatch(processing, /업체 검토 시작/);
    const output = { state_key: 'pp-pellet', mass_kg: 900, condition: '합성 펠렛', evidence: 'TEST-OUTPUT' };
    const done = { ...base, status: 'completed', can_manage: false, current_company_id: 'b',
      data: { ...base.data, current: output, completed: [{ facility: 'B 시험사업장', output }],
        events: [{ action: '처리 완료 확인', company_id: 'b', at: '2026-11-17T00:00:00Z', reference: 'TEST-FINISH', intended_use: '시험용 원료' }] } };
    assert.match(render(done), /900/);
    assert.match(render(done), /처리 완료 확인/);
    assert.doesNotMatch(render(done), /입고 QR 발급|업체 검토 시작/);
    const evidence = render(done, { view: 'info' });
    assert.match(evidence, /TEST-FINISH/);
    assert.match(evidence, /시험용 원료/);
    assert.match(evidence, /TEST-OUTPUT/);
    assert.match(evidence, /최초 분류의 R유형을 자동 적용하지 않으며/);
  } finally {
    await vite.close();
  }
});
