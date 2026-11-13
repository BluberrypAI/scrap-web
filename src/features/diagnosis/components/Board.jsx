import { useState } from 'react';
import { OUTCOME_LABEL, PENDING_REASON } from '../lib/labels.js';
import { formatValue } from '../lib/format.js';
import { getCatalog } from '../lib/normalize.js';

function FactRow({ f, locked, onReply }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const e = f.edit || {};
  const badge = f.status === 'EVIDENCED' ? '서류로 확인' : f.source_label;
  const save = () => {
    let v = val;
    if (e.input === 'number' || e.value_type === 'number') v = Number(val);
    else if (e.options) v = e.options.find((o) => String(o.value) === val)?.value;
    if (v === undefined || v === '' || Number.isNaN(v)) return;
    onReply({ key: f.key, kind: 'value', value: v }, `${f.label}: ${v}`);
    setEditing(false);
  };
  return (
    <li className="board-fact">
      <div>
        <span className="muted">{f.label}</span>
        <strong>{f.value_label ?? formatValue(f.value)}</strong>
        <span className={`wd-chip${f.status === 'EVIDENCED' ? ' is-evidence' : f.source_type === 'PROFILE' ? ' is-profile' : ''}`}>{badge}</span>
      </div>
      {f.editable && !locked && !editing && (
        <div className="board-actions">
          <button type="button" className="button button-link" onClick={() => setEditing(true)}>고치기</button>
          <button type="button" className="button button-link" onClick={() => onReply({ key: f.key, kind: 'retract' }, `${f.label}: 모름으로 되돌리기`)}>되돌리기</button>
        </div>
      )}
      {editing && (
        <div className="board-edit">
          {e.options ? (
            <select className="wd-input" aria-label={`${f.label} 값`} value={val} onChange={(ev) => setVal(ev.target.value)}>
              <option value="">선택</option>
              {e.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
            </select>
          ) : (
            <input className="wd-input" type="number" aria-label={`${f.label} 값`} value={val} onChange={(ev) => setVal(ev.target.value)} />
          )}
          <button type="button" className="button button-small button-primary" onClick={save}>저장</button>
          <button type="button" className="button button-small button-quiet" onClick={() => setEditing(false)}>취소</button>
        </div>
      )}
    </li>
  );
}

/** 아직 값이 없는 항목: 값 자리를 비워 두고 왜 비었는지만 표시한다 */
function PendingRow({ x }) {
  return (
    <li className="board-fact is-pending">
      <div>
        <span className="muted">{x.label}</span>
        <strong className="muted">—</strong>
        <span className="wd-chip">{PENDING_REASON[x.reason] || x.reason}</span>
      </div>
    </li>
  );
}

/**
 * 확인된 사실(board.facts)과 확인이 필요한 항목(board.pending)을 한 목록으로 합친다.
 * 순서는 사실 카탈로그 순서(문진 흐름: 소재 → 대상 여부 → 사업장 → 상태·함량)라 값이 차도 자리가 바뀌지 않는다.
 */
function mergeRows(board) {
  const order = Object.keys(getCatalog());
  const rank = (k) => {
    const i = order.indexOf(k);
    return i < 0 ? order.length : i;
  };
  const known = new Set(board.facts.map((f) => f.key));
  return [
    ...board.facts.map((f) => ({ key: f.key, fact: f })),
    ...board.pending.filter((x) => !known.has(x.key)).map((x) => ({ key: x.key, pending: x })),
  ].sort((a, b) => rank(a.key) - rank(b.key));
}

/** 판정 보드(ui.board). 고치기·되돌리기는 onReply(quick_reply, 라벨)로 보낸다 */
export default function Board({ board, locked, onReply }) {
  const p = board.progress;
  const rows = mergeRows(board);
  return (
    <aside className="board wd-card" aria-label="판정 보드">
      <h3>판정 보드</h3>
      {/* 질문 상한(max_questions)은 안전장치라 보이지 않는다 */}
      {p && <p className="muted">질문 {p.questions_asked}개</p>}
      <h4>문진 항목 <span className="muted">(확인 {board.facts.length} / 전체 {rows.length})</span></h4>
      {rows.length === 0 ? <p className="muted">아직 없어요</p> : (
        <ul className="plain">
          {rows.map((r) => (r.fact
            ? <FactRow key={r.key} f={r.fact} locked={locked} onReply={onReply} />
            : <PendingRow key={r.key} x={r.pending} />))}
        </ul>
      )}
      <h4>남은 후보 {board.candidates_count}개</h4>
      {/* 번호 없는 결론(예: 시험 필요)은 코드·이름이 없으므로 결론 이름을 보인다 */}
      <ul className="plain">{board.top_candidates.map((c, i) => <li key={i}>{c.code ? <><strong>{c.code}</strong> {c.name}</> : (OUTCOME_LABEL[c.outcome] || c.outcome || '결론')}</li>)}</ul>
      <h4>필요한 서류</h4>
      {board.documents_needed.length === 0 ? <p className="muted">없어요</p> : (
        <ul className="plain">{board.documents_needed.map((d) => <li key={d.evidence_type}>{d.label} <span className="muted">({d.fact_labels.join(', ')})</span></li>)}</ul>
      )}
    </aside>
  );
}
