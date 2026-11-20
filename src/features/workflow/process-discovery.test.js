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
    assert.match(html, /취급 소재가 맞는 업체/);
    assert.match(html, /세부 공정·반입조건/);
    assert.doesNotMatch(html, /시험성적서를 제출|이 형태의 반입 근거/);
    const review = { version: 'lot-vision-v1', analysis_version: 'isolated-vision-v2',
      conditions_version: 'intake-questions-v1', recycling_checksum: 'x', reference_checksum: 'x', conditions_checksum: 'x' };
    const facility = { recipient: { name: 'B' } };
    assert.equal(canRequestIntake(review, facility, related), true);
    assert.equal(canRequestIntake(review, facility, { ...related, process_match: 'unverified' }), false);
    assert.equal(canRequestIntake(review, facility, { ...related, finding: 'restriction_mentioned' }), false);
  } finally { await vite.close(); }
});

test('상태별 응답의 공정만 탭과 카드에 표시하고 업체 없는 공정의 빈 탭을 만들지 않는다', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { CandidateBrowser } = await vite.ssrLoadModule('/src/features/workflow/CandidateBrowser.jsx');
    const factory = (key) => ({ facility_key: key, capability_key: key, label: key, region: '경기' });
    const render = options => renderToStaticMarkup(React.createElement(CandidateBrowser, { options }));
    const bottle = render([{ transition_key: 'pet-bottle-to-flake', label: '병 선별·세척', facilities: [factory('BottleSite')] }]);
    const flake = render([
      { transition_key: 'pet-flake-to-chip', label: '플레이크 재생 칩', facilities: [factory('ChipSite')] },
      { transition_key: 'empty', label: '미확보 공정', facilities: [] },
    ]);
    assert.match(bottle, /병 선별·세척/);
    assert.doesNotMatch(bottle, /플레이크 재생 칩/);
    assert.match(flake, /플레이크 재생 칩/);
    assert.doesNotMatch(flake, /병 선별·세척|미확보 공정|BottleSite/);
    assert.match(flake, /다음 공정 1개/);
    const dirty = renderToStaticMarkup(React.createElement(CandidateBrowser, {
      options: [{ transition_key: 'pet-flake-to-chip', label: '플레이크 재생 칩', facilities: [factory('ChipSite')] }],
      reviews: { ChipSite: { lot_review: { status: 'reviewed', concerns: [
        { category: 'cleaning', concern: '진흙 혼입' }, { category: 'drying', concern: '젖은 상태' },
      ] } } },
    }));
    assert.match(dirty, /세척·건조 확인/);
    assert.doesNotMatch(flake, /세척·건조 확인/);
  } finally { await vite.close(); }
});
