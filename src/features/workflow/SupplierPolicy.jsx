import { useEffect, useState } from 'react';
import { workflowApi } from './api.js';
import './workflow.css';

const labels = { materials_forms: '받는 재질·형태', contamination: '오염·수분 조건', packaging: '포장·운송 조건', schedule: '반입 일정·협의 방법' };
export function SupplierPolicySummary({ value }) {
  if (!value) return <p className="wf-muted">업체가 직접 등록한 반입조건이 아직 없어요. 문의로 확인해 주세요.</p>;
  const p = value.policy;
  return <details className="wf-card"><summary>업체 직접 등록한 반입조건 · {value.version}차</summary>
    <p>업체의 안내이며 허가 인증이나 이번 물량의 수락을 뜻하지 않아요.</p>
    <p>{p.accepting_inquiries ? '반입 문의 가능' : '새 반입 문의 일시 중단'}</p>
    <dl>{Object.entries(labels).map(([k, label]) => <div key={k}><dt><strong>{label}</strong></dt><dd>{p[k]}</dd></div>)}</dl>
    <p>물량: {p.min_mass_kg ?? '최소 미정'} ~ {p.max_mass_kg ?? '최대 미정'} kg · 실제 반입량은 업체 확인 필요</p>
    <ul>{p.required_checks.map(c => <li key={c}>{c}</li>)}</ul>
  </details>;
}

function PolicyForm({ site }) {
  const [saved, setSaved] = useState(site.current);
  const [draft, setDraft] = useState(site.current?.policy || { accepting_inquiries: true, materials_forms: '', contamination: '', packaging: '', schedule: '', min_mass_kg: '', max_mass_kg: '', required_checks: [] });
  const [checks, setChecks] = useState(draft.required_checks.join('\n'));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  return <form className="wf-card wf-form" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const value = await workflowApi.saveSupplierPolicy({ facility_key: site.facility_key, expected_version: saved?.version || 0,
        policy: { ...draft, min_mass_kg: draft.min_mass_kg === '' || draft.min_mass_kg == null ? null : Number(draft.min_mass_kg),
          max_mass_kg: draft.max_mass_kg === '' || draft.max_mass_kg == null ? null : Number(draft.max_mass_kg),
          required_checks: checks.split('\n').map(s => s.trim()).filter(Boolean) } });
      setSaved(value); setMessage(`반입조건 ${value.version}차 저장 완료`);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }}>
    <h2>{site.label}</h2>{site.synthetic && <p>시험 계정에 연결한 가상 사업장입니다. 실제 업체의 조건이 아닙니다.</p>}
    <p>업체가 직접 안내하는 조건이에요. 허가 확인과 개별 물량의 최종 수락은 별도로 진행합니다.</p>
    <label className="wf-check"><input type="checkbox" checked={draft.accepting_inquiries} onChange={e => change('accepting_inquiries', e.target.checked)} />새 반입 문의 받기</label>
    {Object.entries(labels).map(([k, label]) => <label key={k}>{label}<textarea required minLength={3} maxLength={600} rows={2} value={draft[k]} onChange={e => change(k, e.target.value)} /></label>)}
    <label>최소 물량(kg, 모르면 비움)<input type="number" min="0" max="1000000000" step="any" value={draft.min_mass_kg ?? ''} onChange={e => change('min_mass_kg', e.target.value)} /></label>
    <label>최대 물량(kg, 모르면 비움)<input type="number" min="0.001" max="1000000000" step="any" value={draft.max_mass_kg ?? ''} onChange={e => change('max_mass_kg', e.target.value)} /></label>
    <label>수락 전 필수 확인 조건 (한 줄에 하나, 최대 12개)<textarea rows={3} maxLength={7200} value={checks} onChange={e => setChecks(e.target.value)} /></label>
    <p>필수 조건이 있으면 문의를 받은 뒤 조건부 수락으로 안내하고, 제출된 답변을 확인해야 최종 수락할 수 있어요.</p>
    <button className="button button-primary" disabled={busy}>{busy ? '저장 중…' : '반입조건 저장'}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}

export function SupplierPolicyPanel() {
  const [sites, setSites] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { workflowApi.supplierPolicies().then(setSites).catch(e => setError(e.message)); }, []);
  return <section aria-label="우리 사업장 반입조건"><h1>우리 사업장 반입조건</h1>
    {error ? <p role="alert">{error}</p> : sites === null ? <p>불러오는 중…</p> : sites.length ? sites.map(site => <PolicyForm key={site.facility_key} site={site} />)
      : <p>현재 기업 계정에 연결된 처리 사업장이 없어요. 사업장 연결 확인 후 조건을 등록할 수 있습니다.</p>}
  </section>;
}

export function InquiryConversation({ lot, offer, me, busy, onSend, readOnly = false }) {
  const [text, setText] = useState('');
  const messages = offer.data.messages || [];
  const recipient = lot.companies[offer.recipient_id] || '수신 업체';
  const sender = lot.companies[offer.sender_id] || '발송 업체';
  const sendMessage = async () => {
    if (busy || text.trim().length < 3 || !onSend) return;
    if (await onSend(text.trim())) setText('');
  };
  return <section className="wf-inquiry" aria-label="업체와 메시지">
    <header className="wf-inquiry-header">
      <span className="wf-inquiry-avatar" aria-hidden="true">{(me === offer.recipient_id ? sender : recipient).slice(0, 1)}</span>
      <div><h4>반입 협의 메시지</h4><p>{sender} ↔ {recipient}</p></div>
      <span className="wf-inquiry-count">메시지 {messages.length}개</span>
    </header>
    <div className="wf-inquiry-body">
    {messages.length ? <ol className="wf-inquiry-messages" aria-label="주고받은 메시지">
      {messages.map((m, i) => <li key={i} className={m.company_id === me ? 'is-mine' : ''}>
        <span className="wf-inquiry-message-avatar" aria-hidden="true">{(lot.companies[m.company_id] || '업').slice(0, 1)}</span>
        <div className="wf-inquiry-message-content"><div className="wf-inquiry-message-meta"><strong>{m.company_id === me ? '우리 기업' : lot.companies[m.company_id] || '참여 기업'}</strong><time dateTime={m.at}>{new Date(m.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div>
          <p>{m.text}</p></div>
      </li>)}
    </ol> : <p className="wf-inquiry-empty">{readOnly ? '주고받은 메시지가 없어요.' : '아직 메시지가 없어요. 반입 일정이나 필요한 자료를 물어보세요.'}</p>}
    </div>
    {!readOnly && <div className="wf-inquiry-composer">
      <label className="wf-inquiry-sr-only" htmlFor={`wf-inquiry-input-${offer.id}`}>반입 협의 메시지</label>
      <div className="wf-inquiry-composer-field"><textarea id={`wf-inquiry-input-${offer.id}`} rows={1} maxLength={1000} placeholder="반입 조건이나 일정을 문의하세요" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendMessage(); } }} />
        <button type="button" disabled={busy || text.trim().length < 3} onClick={sendMessage} aria-label="메시지 보내기">보내기 <span aria-hidden="true">↗</span></button></div>
    </div>}
  </section>;
}
