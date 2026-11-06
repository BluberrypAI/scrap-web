import { useEffect, useState } from 'react';
import { applyTransportPickup, applyTransportReceipt, loadCase, storeCase, transportLegId } from './treatment-state.js';

const uuid4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let devLogin;

export async function transportRequest(legId, { method = 'GET', data, signal } = {}) {
  if (!uuid4.test(legId)) return { status: 404, value: null };
  const path = `/api/v1/transport/${legId}${method === 'POST' ? '/events' : ''}`;
  const options = { method, signal, cache: 'no-store', credentials: 'same-origin' };
  if (data) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }
  let response = await fetch(path, options);
  if (response.status === 401 && method === 'PUT' && __SCRAP_TRANSPORT_DEV_LOGIN__) {
    devLogin ??= fetch('/api/v1/auth/dev-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'scrap-transport-demo@example.com', name: 'SCRAP 운송 시연' }),
    }).finally(() => { devLogin = null; });
    if ((await devLogin).ok) response = await fetch(path, options);
  }
  return { status: response.status, value: response.ok ? await response.json() : null };
}

function sharedSnapshot(value) {
  const { sharedCaseId, sharedRevision, sharedCanProcess, ...snapshot } = value;
  return snapshot;
}

export function storeSharedView(view) {
  const value = { ...view.snapshot, sharedCaseId: view.id, sharedRevision: view.revision,
    sharedCanProcess: view.can_process };
  if (JSON.stringify(value) !== JSON.stringify(loadCase(value.id))) storeCase(value);
  return value;
}

export async function sharedCaseRequest(id, update, signal) {
  const response = await fetch('/api/v1/transport/cases/' + encodeURIComponent(id), update ? {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
  } : { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('공유 처리 기록을 열거나 저장할 수 없어요. 업체 계정과 최신 기록을 확인해 주세요.');
  return response.json();
}

export async function saveSharedCase(previous, next) {
  const shared = previous.sharedCaseId;
  const caseUpdate = { revision: previous.sharedRevision, snapshot: sharedSnapshot(next) };
  if (next.pending?.legId && !previous.pending) {
    const step = next.pending;
    const response = await transportRequest(step.legId, { method: 'PUT', data: {
      lot: next.id, origin: step.from, destination: step.facility, destination_key: step.facility_key,
      shared_case_id: shared, case_update: caseUpdate,
    } });
    if (!response.value) throw new Error('다음 업체의 공유 계정 또는 최신 기록을 확인해 주세요.');
    return storeSharedView(await sharedCaseRequest(shared));
  }
  return storeSharedView(await sharedCaseRequest(shared, caseUpdate));
}

export function useSharedCase(id) {
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let timer;
    async function sync() {
      try {
        const view = await sharedCaseRequest(id, null, controller.signal);
        const saved = loadCase(view.snapshot.id);
        if (!controller.signal.aborted && view.revision >= (saved?.sharedRevision ?? 0)) storeSharedView(view);
      } catch {
        // The current view remains available while the connection recovers.
      }
      if (!controller.signal.aborted) timer = setTimeout(sync, 2000);
    }
    sync();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [id]);
}

export function useServerTransport(wasteId, pending) {
  const legId = transportLegId(pending);
  const origin = pending?.from;
  const destination = pending?.facility;
  const accepted = pending?.handoff?.status === 'accepted';
  const sharedCaseId = loadCase(wasteId)?.sharedCaseId;
  const [registration, setRegistration] = useState(null);
  useEffect(() => {
    if (!legId || accepted) return;
    if (!uuid4.test(legId)) {
      const saved = loadCase(wasteId);
      if (transportLegId(saved?.pending) === legId) {
        try {
          storeCase({ ...saved, pending: { ...saved.pending, legId: crypto.randomUUID() } });
        } catch {
          setRegistration({ legId, status: 503 });
        }
      }
      return;
    }
    const controller = new AbortController();
    let timer;
    let registered = Boolean(sharedCaseId);
    async function sync() {
      try {
        const snapshot = loadCase(wasteId);
        const first = snapshot && !snapshot.completed.length && pending?.facility_key;
        const { status, value } = await transportRequest(legId, registered ? {
          signal: controller.signal,
        } : { method: 'PUT', signal: controller.signal, data: { lot: wasteId, origin, destination,
          destination_key: pending.facility_key,
          ...(first && {
            case_update: { revision: 0, snapshot: sharedSnapshot(snapshot) } }),
        } });
        if (controller.signal.aborted) return;
        registered = Boolean(value);
        setRegistration({ legId, status });
        if (value?.shared_case_id && !sharedCaseId) {
          const view = await sharedCaseRequest(value.shared_case_id, null, controller.signal);
          if (!controller.signal.aborted) storeSharedView(view);
        }
        if (value?.pickup_at) applyTransportPickup({
          wasteId, legId, actor: value.pickup_actor, respondedAt: value.pickup_at,
        });
        if (value?.receipt_at) {
          applyTransportReceipt({ wasteId, legId, status: 'accepted',
            actor: value.receipt_actor, respondedAt: value.receipt_at });
          return;
        }
      } catch {
        if (!controller.signal.aborted) setRegistration({ legId, status: 503 });
      }
      if (!controller.signal.aborted) timer = setTimeout(sync, 2000);
    }
    sync();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [wasteId, legId, origin, destination, accepted, sharedCaseId, pending?.facility_key]);
  return registration?.legId === legId ? registration.status : null;
}
