import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../hooks/useSession.js';
import { workflowApi } from '../features/workflow/api.js';
import { workflowNotifications } from '../features/workflow/notifications.js';
import { Icon } from './Icon.jsx';
import './NotificationInbox.css';

function readIds(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
}

function relativeTime(value) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return new Date(time).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

export function NotificationInbox() {
  const companyId = useSession().company?.id;
  const storageKey = companyId ? `scrap-notifications-read:${companyId}` : '';
  const [items, setItems] = useState([]);
  const [read, setRead] = useState(() => new Set());
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(false);
  const root = useRef(null);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    try {
      setItems(workflowNotifications(await workflowApi.listLots(), companyId));
      setError(false);
    } catch {
      setError(true);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return undefined;
    setItems([]);
    setRead(readIds(storageKey));
    refresh();
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [companyId, storageKey, refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  function markRead(ids) {
    const next = new Set([...read, ...ids]);
    setRead(next);
    try { localStorage.setItem(storageKey, JSON.stringify([...next].slice(-500))); } catch { /* 저장소를 사용할 수 없어도 이동은 허용 */ }
  }

  if (!companyId) return null;
  const unread = items.filter((item) => !read.has(item.id)).length;
  const visible = filter === 'unread' ? items.filter((item) => !read.has(item.id)) : items;

  return <div className="notification-inbox" ref={root}>
    <button className="notification-trigger" type="button" aria-label={`알림함${unread ? `, 읽지 않은 알림 ${unread}건` : ''}`} aria-expanded={open} aria-controls="workflow-notification-panel" onClick={() => { setOpen(!open); if (!open) refresh(); }}>
      <Icon name="bell" size={21} />
      {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="notification-panel" id="workflow-notification-panel" aria-label="알림함">
      <div className="notification-panel-header">
        <div><span className="notification-eyebrow">WORKFLOW UPDATES</span><h2>알림함 <span>{unread}</span></h2></div>
        <button type="button" className="notification-close" onClick={() => setOpen(false)} aria-label="알림함 닫기"><Icon name="close" size={17} /></button>
      </div>
      <div className="notification-toolbar">
        <div className="notification-filters" role="group" aria-label="알림 보기">
          <button type="button" className={filter === 'all' ? 'selected' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>전체</button>
          <button type="button" className={filter === 'unread' ? 'selected' : ''} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>읽지 않음 {unread}</button>
        </div>
        {unread > 0 && <button type="button" className="notification-mark-all" onClick={() => markRead(items.map((item) => item.id))}>모두 읽음</button>}
      </div>
      <div className="notification-list">
        {error && <p className="notification-error" role="alert">알림을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>}
        {!visible.length && !error && <div className="notification-empty"><Icon name="bell" size={25} /><strong>{filter === 'unread' ? '읽지 않은 알림이 없어요' : '아직 인계 알림이 없어요'}</strong><span>인수 요청과 처리 진행이 여기에 표시됩니다.</span></div>}
        {visible.map((item) => <a className={`notification-item ${read.has(item.id) ? '' : 'unread'}`} href={item.href} key={item.id} onClick={() => markRead([item.id])}>
          <span className="notification-item-icon" data-kind={item.kind}><Icon name={item.kind === 'request' ? 'archive' : item.kind === 'rejected' ? 'close' : 'check'} size={17} /></span>
          <span className="notification-item-content"><span className="notification-item-top"><strong>{item.title}</strong><time dateTime={item.at}>{relativeTime(item.at)}</time></span><span className="notification-item-body">{item.body}</span><small>{item.context}</small></span>
          {!read.has(item.id) && <span className="notification-unread-dot" aria-label="읽지 않음" />}
        </a>)}
      </div>
      <div className="notification-panel-footer">인계 기록에서 확인된 변경 사항만 표시합니다.</div>
    </section>}
  </div>;
}
