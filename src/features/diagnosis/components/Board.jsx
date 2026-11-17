import { useState } from 'react';
import { OUTCOME_LABEL } from '../lib/labels.js';
import { formatValue } from '../lib/format.js';
import { getCatalog } from '../lib/normalize.js';

function FactRow({ f, locked, onReply }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const e = f.edit || {};
  const badge = f.status === 'EVIDENCED' ? '서류로 확인' : f.source_type === 'UTTERANCE' ? '직접 답변' : f.source_label;
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
      <div className="board-fact-main">
        <span className="board-check is-done" aria-label="확인됨">✓</span>
        <span className="board-fact-copy"><span>{f.label}</span><strong>{f.value_label ?? formatValue(f.value)}</strong><small>{badge}</small></span>
        {f.editable && !locked && !editing && (
          <span className="board-actions">
            <button type="button" className="button button-link" onClick={() => setEditing(true)}>고치기</button>
            <button type="button" className="button button-link" onClick={() => onReply({ key: f.key, kind: 'retract' }, `${f.label}: 모름으로 되돌리기`)}>되돌리기</button>
          </span>
        )}
      </div>
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
      <div className="board-fact-main">
        <span className="board-check" aria-label="확인 필요" />
        <span className="board-fact-copy"><span>{x.label}</span><strong>{x.reason === 'NEEDS_EVIDENCE' ? '서류 확인 필요' : x.reason === 'DECLARED_UNKNOWN' ? '추가 확인 필요' : '답변 대기'}</strong></span>
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
  const percent = rows.length ? Math.round(board.facts.length / rows.length * 100) : 0;
  return (
    <aside className="board wd-card" aria-label="판정 보드">
      <h3>판정 보드</h3>
      <section className="board-section board-progress" aria-labelledby="board-progress-title">
        <div className="board-section-head"><h4 id="board-progress-title">진행 상황</h4><strong>{percent}%</strong></div>
        <div className="board-progress-track" role="progressbar" aria-label="문진 항목 확인률" aria-valuenow={board.facts.length} aria-valuemin={0} aria-valuemax={rows.length || 1}><span style={{ width: `${percent}%` }} /></div>
        <p>확인 {board.facts.length} / 전체 {rows.length}{p ? ` · 질문 ${p.questions_asked}개` : ''}</p>
      </section>
      <section className="board-section" aria-labelledby="board-candidates-title">
        <div className="board-section-head"><h4 id="board-candidates-title">남은 분류 후보</h4><span className="board-count">{board.candidates_count}개</span></div>
        {board.top_candidates.length ? <ul className="plain board-candidates">{board.top_candidates.map((c, i) => <li key={i}>{c.code ? <><strong>{c.code}</strong><span>{c.name}</span></> : (OUTCOME_LABEL[c.outcome] || c.outcome || '결론')}</li>)}</ul> : <p className="board-empty">표시할 후보가 없어요</p>}
      </section>
      <section className="board-section" aria-labelledby="board-facts-title">
        <div className="board-section-head"><h4 id="board-facts-title">문진 항목</h4><span className="board-count">{board.facts.length}/{rows.length} 확인</span></div>
        {rows.length === 0 ? <p className="board-empty">아직 없어요</p> : <ul className="plain board-facts">{rows.map((r) => (r.fact ? <FactRow key={r.key} f={r.fact} locked={locked} onReply={onReply} /> : <PendingRow key={r.key} x={r.pending} />))}</ul>}
      </section>
      <section className="board-section" aria-labelledby="board-documents-title">
        <div className="board-section-head"><h4 id="board-documents-title">필요한 서류</h4><span className="board-count">{board.documents_needed.length}건</span></div>
        {board.documents_needed.length === 0 ? <p className="board-empty">현재 필요한 서류가 없어요</p> : <ul className="plain board-documents">{board.documents_needed.map((d) => <li key={d.evidence_type}><strong>{d.label}</strong><span>{d.fact_labels.join(', ')}</span></li>)}</ul>}
      </section>
    </aside>
  );
}
