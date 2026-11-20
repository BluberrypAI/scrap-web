import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { canRegisterLot } from './labels.js';

test('확정 뒤 형태 선택·수정 없이 문진 형태를 쓰고 누락은 문진 연결 대기로 안내한다', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { DiagnosisFormStatus } = await vite.ssrLoadModule('/src/features/workflow/CaseRoutePanel.jsx');
    const context = { status: 'ready', selected_form: 'scrap', selected_form_label: '제조 잔재·스크랩', form_source: 'handoff',
      available_forms: [{ value: 'scrap', label: '제조 잔재·스크랩' }],
      route_input: { waste_code: '51-03-01', material: 'pp', input_form: 'scrap' } };
    const received = renderToStaticMarkup(React.createElement(DiagnosisFormStatus, { context, caseId: 'test' }));
    assert.match(received, /문진에서 받은 형태/);
    assert.match(received, /제조 잔재·스크랩/);
    assert.doesNotMatch(received, /type="radio"|형태 수정|어떤 형태인가요/);
    assert.equal(canRegisterLot(context, context.selected_form), true);
    const missingContext = { ...context, status: 'needs_input', selected_form: null, route_input: null };
    const missing = renderToStaticMarkup(React.createElement(DiagnosisFormStatus, { context: missingContext, missing: true, caseId: 'test' }));
    assert.match(missing, /문진 형태 정보 연결 대기/);
    assert.match(missing, /문진 기록 보기/);
    assert.doesNotMatch(missing, /type="radio"|형태 수정|어떤 형태인가요/);
    assert.equal(canRegisterLot(missingContext, null), false);
  } finally { await vite.close(); }
});
