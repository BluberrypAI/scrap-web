import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { canRegisterLot } from './labels.js';

test('문진 형태가 있으면 다시 고르지 않고 표시하며 누락된 경우만 선택한다', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { CurrentForm } = await vite.ssrLoadModule('/src/features/workflow/CaseRoutePanel.jsx');
    const context = { status: 'ready', selected_form: 'scrap', form_source: 'conversation',
      form_quote: 'PP 사출 잔재입니다', available_forms: [{ value: 'scrap', label: '제조 잔재·스크랩' }],
      route_input: { waste_code: '51-03-01', material: 'pp', input_form: 'scrap' } };
    const received = renderToStaticMarkup(React.createElement(CurrentForm, { context, value: context.selected_form }));
    assert.match(received, /문진에서 이어받은 현재 형태/);
    assert.match(received, /PP 사출 잔재입니다/);
    assert.match(received, /형태 수정/);
    assert.doesNotMatch(received, /type="radio"|어떤 형태인가요/);
    assert.equal(canRegisterLot(context, context.selected_form), true);
    const missing = renderToStaticMarkup(React.createElement(CurrentForm, { context: { ...context, selected_form: null }, value: null }));
    assert.match(missing, /type="radio"/);
    assert.match(missing, /확인되지 않은 현재 형태만/);
  } finally { await vite.close(); }
});
