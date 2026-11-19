import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { canRequestIntake } from './review-policy.js';

test('공정 관련 후보는 구체 반입 증빙 문진 없이 문의하고 전역 도로거리순으로 표시한다', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { CandidateBrowser } = await vite.ssrLoadModule('/src/features/workflow/CandidateBrowser.jsx');
    const f = (id, km) => ({ facility_key: id, capability_key: id, label: id, region: '경기', road_distance_status: 'available', road_distance_km: km });
    const related = { status: 'reviewed', finding: 'insufficient', process_match: 'matched',
      process_quote: '이 사업장은 PP 재생 펠렛을 생산합니다.',
      lot_review: { status: 'reviewed', observation_method: 'no_photo', questions: ['허가증과 시험성적서를 제출해 주세요'], concerns: [] } };
    const html = renderToStaticMarkup(React.createElement(CandidateBrowser, { options: [
      { transition_key: 'far', label: '먼 공정', facilities: [f('FarFactory', 80)] },
      { transition_key: 'near', label: '가까운 공정', facilities: [f('NearFactory', 5)] },
    ], reviews: { FarFactory: related, NearFactory: related } }));
    assert.ok(html.indexOf('NearFactory') < html.indexOf('FarFactory'));
    assert.match(html, /공정 관련 업체/);
    assert.doesNotMatch(html, /시험성적서를 제출|이 형태의 반입 근거/);
    const review = { version: 'lot-vision-v1', analysis_version: 'isolated-vision-v2',
      conditions_version: 'intake-questions-v1', recycling_checksum: 'x', reference_checksum: 'x', conditions_checksum: 'x' };
    const facility = { recipient: { name: 'B' } };
    assert.equal(canRequestIntake(review, facility, related), true);
    assert.equal(canRequestIntake(review, facility, { ...related, process_match: 'unverified' }), false);
    assert.equal(canRequestIntake(review, facility, { ...related, finding: 'restriction_mentioned' }), false);
  } finally { await vite.close(); }
});
