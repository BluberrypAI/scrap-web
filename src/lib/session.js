// 로그인 상태(계정 + 기업 정보)를 불러오고, 화면이 어디로 가야 하는지 정한다.
// 화면에서는 hooks/useSession.js를 통해 쓴다.
import { ApiError, api } from './api.js';

// status: 'signed-out'(로그인 전), 'onboarding'(기업 등록 전), 'ready'(사용 가능)
export async function loadSession(client = api) {
  let user;
  try {
    user = await client.me();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'signed-out', user: null, company: null };
    }
    throw error;
  }
  if (!user.company_id) return { status: 'onboarding', user, company: null };
  return { status: 'ready', user, company: await client.myCompany() };
}

// 로그인이 필요한 화면에서 이동할 경로. 머물러도 되면 null.
export function redirectFor(session, path) {
  if (session.status === 'signed-out') return path === '/login' ? null : '/login';
  if (session.status === 'onboarding') return path === '/onboarding' ? null : '/onboarding';
  if (path === '/onboarding' || path === '/login') return '/wastes';
  return null;
}
