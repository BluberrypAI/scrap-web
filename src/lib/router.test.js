import assert from 'node:assert/strict';
import test from 'node:test';
import { hashUrlFor } from './router.js';

test('서버가 보낸 일반 경로를 해시 주소로 바꾼다', () => {
  assert.equal(hashUrlFor('/onboarding'), '/#/onboarding');
  assert.equal(hashUrlFor('/login', '?error=oauth_failed'), '/#/login?error=oauth_failed');
  assert.equal(hashUrlFor('/wastes/'), '/#/wastes');
});

test('루트와 index.html은 바꾸지 않는다', () => {
  assert.equal(hashUrlFor('/'), null);
  assert.equal(hashUrlFor(''), null);
  assert.equal(hashUrlFor('/index.html'), null);
});
