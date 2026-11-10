import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, api, apiFetch } from './api.js';

function json(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(responses) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request: ${url}`);
    return next;
  };
  return calls;
}

test('같은 출처의 /api/v1로 쿠키를 담아 호출한다', async () => {
  const calls = stubFetch([json(200, { id: 'u1', company_id: null })]);

  const me = await api.me();

  assert.equal(me.id, 'u1');
  assert.deepEqual(calls.map((c) => c.url), ['/api/v1/users/me']);
});

test('401이면 토큰을 한 번 재발급하고 원래 요청을 다시 보낸다', async () => {
  const calls = stubFetch([
    json(401, { code: 'AUTH_REQUIRED', message: '로그인이 필요함' }),
    json(204),
    json(200, { id: 'c1' }),
  ]);

  const company = await api.myCompany();

  assert.equal(company.id, 'c1');
  assert.deepEqual(
    calls.map((c) => `${c.method} ${c.url}`),
    ['GET /api/v1/companies/me', 'POST /api/v1/auth/refresh', 'GET /api/v1/companies/me'],
  );
});

test('재발급에 실패하면 401 ApiError를 던진다', async () => {
  stubFetch([json(401, { code: 'AUTH_REQUIRED', message: '로그인이 필요함' }), json(401)]);

  await assert.rejects(api.me(), (error) => error instanceof ApiError && error.status === 401);
});

test('동시에 401을 받아도 재발급 요청은 한 번만 보낸다', async () => {
  const calls = stubFetch([
    json(401, { code: 'AUTH_REQUIRED' }),
    json(401, { code: 'AUTH_REQUIRED' }),
    json(204),
    json(200, { id: 'u1' }),
    json(200, { id: 'c1' }),
  ]);

  await Promise.all([api.me(), api.myCompany()]);

  assert.equal(calls.filter((c) => c.url === '/api/v1/auth/refresh').length, 1);
});

test('서버 오류 형식의 code와 details를 담는다', async () => {
  stubFetch([
    json(422, {
      code: 'VALIDATION_ERROR',
      message: '요청 값이 올바르지 않음',
      details: [{ field: 'body.site_name', message: 'Field required' }],
    }),
  ]);

  await assert.rejects(
    api.createCompany({}),
    (error) =>
      error.status === 422 &&
      error.code === 'VALIDATION_ERROR' &&
      error.details[0].field === 'body.site_name',
  );
});

test('기업 수정은 profile_version을 함께 보낸다', async () => {
  const calls = stubFetch([json(200, { profile_version: 2, changed_fields: ['industry'] })]);

  await api.updateCompany(1, { industry: '금속 가공업' });

  assert.equal(calls[0].method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].body), { industry: '금속 가공업', profile_version: 1 });
});

test('변경 이력은 페이지 번호를 쿼리로 보낸다', async () => {
  const calls = stubFetch([json(200, { items: [], pagingInfo: {} })]);

  await api.companyHistory(2, 10);

  assert.equal(calls[0].url, '/api/v1/companies/me/history?pageNumber=2&pageSize=10');
});

test('204 응답은 null을 돌려준다', async () => {
  stubFetch([json(204)]);
  assert.equal(await apiFetch('/auth/logout', { method: 'POST' }), null);
});

test('소셜 로그인 주소를 만든다', () => {
  assert.equal(api.loginUrl('google'), '/api/v1/auth/google/login');
});
