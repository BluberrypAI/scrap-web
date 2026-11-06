import { useEffect, useState } from 'react';
import { sharedCaseRequest, storeSharedView } from '../../features/treatment/transport-client.js';
import { navigate } from '../../lib/router.js';

const accounts = [['a', '화성 A 배출공장'], ['b', '화성 B 선별·파쇄'], ['c', '화성 C 펠렛 생산']];

export function TransportInbox() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const response = await fetch('/api/v1/transport/inbox', { cache: 'no-store' });
      setItems(response.ok ? await response.json() : []);
      setStatus(response.ok ? '' : '기업 계정으로 로그인해 주세요.');
    } catch {
      setStatus('운송 서버에 연결하지 못했어요.');
    }
  }
  useEffect(() => { refresh(); }, []);

  async function signIn(key, name) {
    setBusy(true);
    try {
      const result = await fetch('/api/v1/auth/dev-login', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `scrap-hwaseong-${key}@example.com`, name }),
      });
      if (!result.ok) throw new Error();
      await refresh();
    } catch {
      setStatus('시연 계정에 로그인하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function open(item) {
    try {
      const record = storeSharedView(await sharedCaseRequest(item.id));
      navigate(`/wastes/${record.id}?tab=route`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return <main className="waste-detail wt-company-page">
    <a href="/wastes">← 내 폐기물</a>
    <section className="wt-company">
      <h1>공유 인계함</h1>
      {__SCRAP_TRANSPORT_DEV_LOGIN__ && <div className="wt-buttons" aria-label="화성 가상 기업 계정">
        {accounts.map(([key, name]) => <button key={key} type="button" className="button button-quiet"
          disabled={busy} onClick={() => signIn(key, name)}>{name} 계정</button>)}
      </div>}
      {status && <p role="status">{status}</p>}
      {!items.length && !status && <p>공유된 폐기물 카드가 없어요.</p>}
      <ul>{items.map((item) => <li key={item.id}>
        <button type="button" className="button button-quiet" onClick={() => open(item)}>
          {item.name} · {item.can_process ? '처리 담당' : '진행 보기'}
        </button>
      </li>)}</ul>
    </section>
  </main>;
}
