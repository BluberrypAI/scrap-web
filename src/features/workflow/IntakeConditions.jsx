import { useState } from 'react';
import { workflowApi } from './api.js';

const MATCH_LABELS = {
  material_label_only: '명부에 소재명 표기 · 반입 가능 여부 미확인',
  requested_code_not_material_validated: '분류번호 일치 · 세부 소재 미확인',
  named_material_code_only: '소재 관련 코드 · 허가·반입 가능 여부 미확인',
  broad_category_only: '넓은 소재 분류만 일치 · 세부 소재 미확인',
  code_category_only: '관련 분류군 코드 · 세부 소재 미확인',
  unmapped_codes_require_review: '소재 연결을 확인하지 못한 코드 · 추가 조사 필요',
};

export function IntakeQuestions({ form, busy, onSave, readOnly = false }) {
  const [values, setValues] = useState(() => Object.fromEntries(Object.entries(form?.answers || {}).map(([k, v]) => [k, v.value])));
  if (!form) return null;
  return <details className="wf-card"><summary>이 업체의 반입 확인 · 추가 질문 {form.questions.length}개</summary>
    {form.facts?.map((f, i) => <p key={i}>{f.text} <a href={f.url} target="_blank" rel="noreferrer">{f.publisher} · {f.checked_at || '기존 수집'}</a></p>)}
    <p className="wf-muted">공개 투입 예시는 확정된 반입 규격이 아니에요. 모르면 ‘모름’으로 답해 주세요.</p>
    <div className="wf-form">{form.questions.map(q => <label key={q.key}>{q.label}
      {readOnly ? <span>{form.answers?.[q.key]?.value || '미응답'}</span> : q.choices.length ? <select value={values[q.key] || ''} onChange={e => setValues({ ...values, [q.key]: e.target.value })}>
        <option value="">선택</option>{q.choices.map(v => <option key={v}>{v}</option>)}
      </select> : <input maxLength={600} value={values[q.key] || ''} onChange={e => setValues({ ...values, [q.key]: e.target.value })} />}
      <small className="wf-muted">{q.reason}</small>
    </label>)}</div>
    {!readOnly && <button className="button button-quiet button-small" disabled={busy || !Object.values(values).some(v => v.trim())} onClick={() => onSave(Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim())))}>답변 저장하고 재검토 준비</button>}
    <p className="wf-muted">수치 규격·최소 물량·현재 용량·가격은 업체 확인이 필요해요. 답변 수정 후 AI 검토를 다시 실행해 주세요.</p>
  </details>;
}

export function ConditionalResponse({ offer, busy, onRespond }) {
  const [values, setValues] = useState(() => Object.fromEntries(Object.entries(offer.data.condition_responses || {}).map(([k, v]) => [k, v.text])));
  return <section className="wf-form"><h4>운송 전에 확인할 조건</h4>
    <p className="wf-muted">조건부 수락 상태에서는 QR이 발급되지 않아요. 자료를 보내면 수신 업체가 최종 확인해요.</p>
    {offer.data.conditions.map(c => <label key={c.id}>{c.text}
      {offer.can_respond_conditions ? <textarea maxLength={1000} rows={2} value={values[c.id] || ''} placeholder="검사·샘플·포장·일정 등 확인 내용과 자료 번호" onChange={e => setValues({ ...values, [c.id]: e.target.value })} /> : <span>{offer.data.condition_responses?.[c.id]?.text || '발송기업 자료 제출 대기'}</span>}
    </label>)}
    {offer.can_respond_conditions && <button className="button button-primary" disabled={busy || !offer.data.conditions.every(c => values[c.id]?.trim().length >= 3)} onClick={() => onRespond(values)}>조건 확인 자료 보내기</button>}
  </section>;
}

export function DirectoryCandidates({ lot, transitionKey, onSave }) {
  const [page, setPage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(null);
  async function load(cursor = null) {
    setBusy(true); setError('');
    try { setPage(await workflowApi.directory(lot, transitionKey, cursor)); setCursor(cursor); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <details className="wf-card"><summary>전국 명부에서 이 공정의 업체 더 찾기</summary>
    <p className="wf-muted">폐기물 코드·설비명으로 찾은 조사 대상이에요. 공정 수행 근거와 수신계정 확인 후 인수 요청에 연결할 수 있어요.</p>
    <button className="button button-quiet button-small" disabled={busy} onClick={() => load()}>전국 명부 조회</button>
    {error && <p role="alert">{error}</p>}
    {page && <><p>적재 명부 {page.search_scope.registry_record_count.toLocaleString()}행 · 현재 공정 조사 대상 {page.pagination.total_registry_candidates.toLocaleString()}행</p>
      <ul className="wf-facilities">{page.registry_candidates.map(r => { const p = r.research_packet; return <li className="wf-facility" key={r.listing_id}>
        <strong>{p.name}</strong><p>{p.address}</p>
        <p>{MATCH_LABELS[p.material_match] || '소재 확인 필요'}</p>
        <p className="wf-muted">명부 설비: {p.equipment_mentions?.join(' · ') || '공정 설비명 확인 필요'} · 기준일 {p.as_of || p.as_of_raw || '미상'}</p>
        {p.straight_line_distance_km != null && <p>직선 {p.straight_line_distance_km}km · 도로 거리 미확인</p>}
        <a href={p.source_url} target="_blank" rel="noreferrer">명부 출처</a>
        <p className="wf-muted">{p.next_action}</p>
        <IntakeQuestions form={p.intake_conditions} busy={busy} onSave={async answers => {
          setBusy(true);
          try { const saved = await onSave(r.listing_id, cursor, answers); if (saved) setPage(null); }
          catch (e) { setError(e.message); }
          finally { setBusy(false); }
        }} />
      </li>; })}</ul>
      {page.pagination.has_more && <button className="button button-quiet" disabled={busy} onClick={() => load(page.pagination.next_cursor)}>다음 업체 10곳</button>}
    </>}
    {busy && <p role="status">업체 명부 조회 중…</p>}
    {Object.values(lot.data.directory_inquiries?.[String(lot.data.completed.length)] || {}).filter(i => i.transition_key === transitionKey).map(i => <p key={i.listing_id}><strong>{i.name}</strong> · 질문 답변 저장됨 · 사업장 근거와 수신계정 확인 대기</p>)}
  </details>;
}
