// 다른 기업의 수락·입고·처리 기록을 열린 상세 화면에도 반영한다.
export function startLotSync({ read, apply, canRefresh = () => true, version = () => 0,
  windowTarget = window, documentTarget = document,
  schedule = setInterval, cancel = clearInterval, interval = 5000 }) {
  let stopped = false;
  let pending = false;
  async function refresh() {
    if (stopped || pending || documentTarget.hidden || !canRefresh()) return;
    const requestVersion = version();
    pending = true;
    try {
      const next = await read();
      // 작업 시작 전 보낸 조회가 뒤늦게 도착해 최신 기록을 덮어쓰지 않는다.
      if (!stopped && canRefresh() && version() === requestVersion) apply(next);
    } catch { /* 일시적인 조회 실패로 입력 중인 화면을 지우지 않는다. 다음 주기에 재시도한다. */ }
    finally { pending = false; }
  }
  const timer = schedule(refresh, interval);
  windowTarget.addEventListener('focus', refresh);
  documentTarget.addEventListener('visibilitychange', refresh);
  return () => {
    stopped = true;
    cancel(timer);
    windowTarget.removeEventListener('focus', refresh);
    documentTarget.removeEventListener('visibilitychange', refresh);
  };
}
