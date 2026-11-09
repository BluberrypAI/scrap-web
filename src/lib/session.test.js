import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from './api.js';
import { loadSession, redirectFor } from './session.js';

const user = { id: 'u1', email: 'a@x.com', name: 'A', provider: 'google' };

test('로그인하지 않았으면 signed-out', async () => {
  const session = await loadSession({
    me: async () => {
      throw new ApiError(401, { code: 'AUTH_REQUIRED' });
    },
  });
  assert.equal(session.status, 'signed-out');
});

test('기업이 없으면 onboarding이고 기업을 조회하지 않는다', async () => {
  const session = await loadSession({
    me: async () => ({ ...user, company_id: null }),
    myCompany: async () => assert.fail('기업 조회를 하면 안 됨'),
  });
  assert.equal(session.status, 'onboarding');
  assert.equal(session.user.id, 'u1');
});

test('기업이 있으면 ready와 기업 정보를 돌려준다', async () => {
  const session = await loadSession({
    me: async () => ({ ...user, company_id: 'c1' }),
    myCompany: async () => ({ id: 'c1', company_name: '(주)가천정밀' }),
  });
  assert.equal(session.status, 'ready');
  assert.equal(session.company.company_name, '(주)가천정밀');
});

test('401이 아닌 오류는 그대로 던진다', async () => {
  await assert.rejects(
    loadSession({
      me: async () => {
        throw new ApiError(500, { code: 'INTERNAL_ERROR' });
      },
    }),
    (error) => error.status === 500,
  );
});

test('상태에 따라 이동할 화면을 정한다', () => {
  assert.equal(redirectFor({ status: 'signed-out' }, '/wastes'), '/login');
  assert.equal(redirectFor({ status: 'onboarding' }, '/wastes'), '/onboarding');
  assert.equal(redirectFor({ status: 'onboarding' }, '/onboarding'), null);
  assert.equal(redirectFor({ status: 'ready' }, '/onboarding'), '/wastes');
  assert.equal(redirectFor({ status: 'ready' }, '/login'), '/wastes');
  assert.equal(redirectFor({ status: 'ready' }, '/data'), null);
});
