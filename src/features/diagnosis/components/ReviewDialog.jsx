import { useEffect, useMemo, useRef, useState } from 'react';
import { getCatalog } from '../lib/normalize.js';
import { formatValue } from '../lib/format.js';
import { loadDocumentFile } from '../lib/docStore.js';
import { toDocumentValue } from './BranchCards.jsx';

/**
 * 서류 값 검수 창. 왼쪽에 원문, 오른쪽에 자동으로 읽은 값을 두고 하나씩 비교해 확인한다.
 *  - 원문: 이 브라우저에 보관한 파일(PDF·사진·글). 없으면 엔진이 원문에서 읽은 행 글자를 보여 준다.
 *  - 값마다 "맞아요" 또는 "고치기". 확인한 값만 판정에 쓰인다(검수 완료).
 *  - 값을 누르면 왼쪽 원문이 그 값이 있는 쪽으로 이동한다(PDF).
 *  - 좁은 화면에서는 '원문' / '읽은 값' 탭으로 바꿔 본다.
 * @param {{items: {doc: any, value: any}[], labels?: Record<string, string>, busy?: boolean,
 *   onApply: (entries: {doc: any, value: any, fixed?: any}[]) => void, onClose: () => void}} p
 */
export default function ReviewDialog({ items, docs: allDocs = [], resolvedKeys = [], labels = {}, busy, onApply, onClose }) {
  // 검수할 서류: 검수 대기 값이 있거나 자동으로 못 읽은 값이 있는 서류
  const docs = useMemo(() => {
    const m = new Map();
    for (const it of items) if (!m.has(it.doc.id)) m.set(it.doc.id, it.doc);
    for (const d of allDocs) if (!m.has(d.id) && unreadItems(d, resolvedKeys).length) m.set(d.id, d);
    return [...m.values()];
  }, [items, allDocs, resolvedKeys]);
  const [docId, setDocId] = useState(docs[0]?.id);
  const doc = docs.find((d) => d.id === docId) || docs[0];
  const reads = useMemo(() => readItems(doc), [doc]);
  const catalog = getCatalog();
  // 한 줄 = 읽은 값(검수 대기) 또는 읽지 못한 항목. 원문 순서(쪽 → 표 → 행)로 놓는다
  const rows = useMemo(() => {
    const out = items.filter((it) => it.doc.id === doc?.id).map((it) => ({ id: it.value.id, key: it.value.fact_key, item: it, read: reads[it.value.fact_key] }));
    for (const r of unreadItems(doc, resolvedKeys)) out.push({ id: `unread:${doc.id}:${r.key}`, key: r.key, read: r, unread: true, doc });
    return out.sort((a, b) => position(a.read) - position(b.read));
  }, [items, doc, reads, resolvedKeys]);
  const allRows = useMemo(() => docs.flatMap((d) => [
    ...items.filter((it) => it.doc.id === d.id).map((it) => ({ id: it.value.id, key: it.value.fact_key, item: it })),
    ...unreadItems(d, resolvedKeys).map((r) => ({ id: `unread:${d.id}:${r.key}`, key: r.key, unread: true, doc: d })),
  ]), [docs, items, resolvedKeys]);
  const [marks, setMarks] = useState({}); // 줄 id → {state: 'ok'|'fix', mode, input}
  const [active, setActive] = useState(null); // 고른 줄 id
  const [tab, setTab] = useState('values');
  const [err, setErr] = useState('');
  const box = useRef(null);

  useEffect(() => {
    box.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeRow = rows.find((r) => r.id === active);
  const page = activeRow?.read?.page || 1;
  const filled = (m) => (m?.input ?? '').toString().trim() !== '';
  // 읽지 못한 줄은 값을 적으면 확인한 것으로 센다
  const isDone = (r) => (r.unread ? filled(marks[r.id]) : Boolean(marks[r.id]?.state));
  const done = allRows.filter(isDone).length;
  const set = (id, patch) => setMarks((m) => ({ ...m, [id]: { mode: 'eq', input: '', ...m[id], ...patch } }));
  const labelOf = (key) => labels[key] || catalog[key]?.label || key;

  const finish = () => {
    const out = [];
    try {
      for (const r of allRows) {
        const m = marks[r.id];
        if (!isDone(r)) continue;
        const f = catalog[r.key] || { key: r.key, type: 'number' };
        if (r.unread || m.state === 'fix') {
          const v = toDocumentValue(f, { mode: m.mode, value: m.input });
          if (v === null) throw new Error(`${labelOf(r.key)}: 원문 값을 적어 주세요`);
          out.push(r.unread ? { doc: r.doc, factKey: r.key, fixed: v } : { ...r.item, fixed: v });
        } else out.push(r.item);
      }
    } catch (e) {
      setErr(e.message);
      return;
    }
    setErr('');
    onApply(out);
  };

  const unreadCount = rows.filter((r) => r.unread).length;
  return (
    <div className="review-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title" tabIndex={-1} ref={box}>
        <header className="review-head">
          <div>
            <h2 id="review-title">서류 값 검수</h2>
            <p className="muted">원문과 같은 순서로 놓았어요. 한 줄씩 비교하고, 값을 누르면 원문의 그 쪽으로 이동해요. 확인한 값만 판정에 쓰여요.</p>
          </div>
          <button type="button" className="button button-quiet button-small" onClick={onClose} aria-label="검수 창 닫기">닫기</button>
        </header>
        {docs.length > 1 && (
          <div className="review-docs" role="tablist" aria-label="서류 고르기">
            {docs.map((d) => (
              <button key={d.id} type="button" role="tab" aria-selected={d.id === doc.id} className={`wd-chip${d.id === doc.id ? ' is-active' : ''}`} onClick={() => { setDocId(d.id); setActive(null); }}>
                {d.filename}
              </button>
            ))}
          </div>
        )}
        <div className="review-tabs" role="tablist" aria-label="보기 바꾸기">
          <button type="button" role="tab" aria-selected={tab === 'doc'} onClick={() => setTab('doc')}>원문</button>
          <button type="button" role="tab" aria-selected={tab === 'values'} onClick={() => setTab('values')}>읽은 값 ({rows.length})</button>
        </div>
        <div className="review-body" data-tab={tab}>
          <div className="review-pane review-doc" aria-label="원문">
            <DocumentView doc={doc} page={page} reads={reads} activeKey={activeRow?.key} />
          </div>
          <div className="review-pane review-values" aria-label="읽은 값">
            <div className="row between review-values-head">
              <span className="muted">{rows.filter(isDone).length} / {rows.length} 확인{unreadCount ? ` · 못 읽은 값 ${unreadCount}개` : ''}</span>
              <button type="button" className="button button-small button-quiet" disabled={busy}
                onClick={() => rows.forEach((r) => { if (!r.unread && !marks[r.id]?.state) set(r.id, { state: 'ok' }); })}>
                읽은 값 모두 맞아요
              </button>
            </div>
            <ul className="review-list">
              {rows.map((r) => (
                <ReviewRow key={r.id} row={r} mark={marks[r.id] || {}} label={labelOf(r.key)} fact={catalog[r.key] || { key: r.key, type: 'number' }}
                  active={active === r.id} busy={busy} onPick={() => { setActive(r.id); setTab('doc'); }} onMark={(patch) => set(r.id, patch)} />
              ))}
            </ul>
          </div>
        </div>
        {err && <p className="wd-alert" role="alert">{err}</p>}
        <footer className="review-foot">
          <span className="muted">{done === 0 ? '값마다 맞는지 골라 주세요' : `${done}개를 판정에 반영해요. 확인하지 않은 값은 검수 대기로 남아요.`}</span>
          <div className="row">
            <button type="button" className="button button-quiet" onClick={onClose}>나중에 하기</button>
            <button type="button" className="button button-primary" disabled={busy || done === 0} onClick={finish}>검수 완료</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

/** 값 칸(값/미만 + 숫자 + 단위). 고칠 때와 못 읽은 값을 적을 때 함께 쓴다 */
function ValueInput({ label, fact, mark, onMark, placeholder }) {
  if (fact.type !== 'number') {
    return <input className="wd-input" aria-label={label} placeholder={placeholder} value={mark.input || ''} onChange={(e) => onMark({ input: e.target.value })} />;
  }
  return (
    <>
      <select className="wd-input" aria-label={`${label} 값 모양`} value={mark.mode || 'eq'} onChange={(e) => onMark({ mode: e.target.value })}>
        <option value="eq">값</option>
        <option value="lt">미만</option>
      </select>
      <input className="wd-input" inputMode="decimal" aria-label={label} placeholder={placeholder} value={mark.input || ''} onChange={(e) => onMark({ input: e.target.value })} />
      {fact.unit && <span className="muted">{fact.unit}</span>}
    </>
  );
}

/** 검수 창의 한 줄. 원문 항목 이름을 앞에 두어 원문과 바로 맞춰 볼 수 있게 한다 */
function ReviewRow({ row, mark, label, fact, active, busy, onPick, onMark }) {
  const r = row.read || {};
  const raw = (r.item_raw || '').trim();
  const where = [r.page ? `${r.page}쪽` : null, r.cell_ref ? `표${r.cell_ref.table_index + 1} ${r.cell_ref.row + 1}행` : null].filter(Boolean).join(' · ');
  const head = (
    <button type="button" className="review-item-main" onClick={onPick} aria-label={`${raw || label} 원문 위치 보기`}>
      <span className="review-item-label">{raw ? <>원문 &lsquo;{raw}&rsquo;</> : label}</span>
      {raw && <span className="muted small">→ {label}</span>}
      {where && <span className="muted small">{where}</span>}
    </button>
  );
  if (row.unread) {
    return (
      <li className="review-item" data-state={(mark.input || '').toString().trim() ? 'fix' : 'unread'} data-active={active}>
        {head}
        <span className="wd-chip is-review review-item-chip">자동으로 못 읽음</span>
        <div className="review-unread">
          {r.value_raw && <p className="small">원문 결과: <strong>{[r.value_raw, r.unit_raw].filter(Boolean).join(' ')}</strong></p>}
          <p className="small">{unreadReason(r, fact)}</p>
          <div className="doc-value-row">
            <ValueInput label={`${label} 원문 값`} fact={fact} mark={mark} onMark={onMark} placeholder="원문 값" />
          </div>
        </div>
      </li>
    );
  }
  const { value } = row.item;
  const nd = r.below_detection_limit;
  const conv = unitConversion(r);
  return (
    <li className="review-item" data-state={mark.state || 'todo'} data-active={active}>
      {head}
      <div className="review-item-actions">
        <button type="button" className={`button button-small${mark.state === 'ok' ? ' button-primary' : ''}`} aria-pressed={mark.state === 'ok'} disabled={busy}
          onClick={() => onMark({ state: mark.state === 'ok' ? null : 'ok' })}>맞아요</button>
        <button type="button" className={`button button-small${mark.state === 'fix' ? ' button-primary' : ' button-quiet'}`} aria-pressed={mark.state === 'fix'} disabled={busy}
          onClick={() => onMark({ state: mark.state === 'fix' ? null : 'fix' })}>고치기</button>
      </div>
      <div className="review-item-read">
        {nd ? (
          <>
            <span className="review-item-value">불검출{r.unit_raw ? ` (${r.unit_raw})` : ''}</span>
            <span className="muted small">
              판정에는 &lsquo;{formatValue(value.value, value.unit ? ` ${value.unit}` : '')}&rsquo;으로 써요.
              {r.detection_limit_basis === 'stated' ? ' 성적서의 검출한계를 썼어요.' : ' 성적서에 검출한계가 없어 같은 줄의 기준값을 썼어요.'}
            </span>
          </>
        ) : (
          <>
            <span className="review-item-value">{formatValue(value.value, value.unit ? ` ${value.unit}` : '')}</span>
            {r.value_raw ? <span className="muted small">원문 &lsquo;{[r.value_raw, r.unit_raw].filter(Boolean).join(' ')}&rsquo;</span> : <span className="muted small">직접 적은 값</span>}
          </>
        )}
      </div>
      {conv && (
        <p className="review-conv small" role="note">
          원문 단위 &lsquo;{conv.from}&rsquo;를 {conv.to}로 바꿔 계산했어요(×{conv.factor}).
          {nd && r.detection_limit_basis === 'limit_column'
            ? ` 같은 줄 기준값도 ${conv.from}로 보고 바꿨어요. 기준 칸이 ${conv.to} 기준이면 원문 단위가 오타일 수 있어요. 오타라면 '고치기'로 ${conv.to} 값을 적어 주세요.`
            : ' 원문 단위가 맞는지 확인해 주세요.'}
        </p>
      )}
      {mark.state === 'fix' && (
        <div className="doc-value-row review-fix">
          <ValueInput label={`${label} 고칠 값`} fact={fact} mark={mark} onMark={onMark} placeholder="원문 값" />
        </div>
      )}
    </li>
  );
}

/** 못 읽은 이유를 사람이 할 일과 함께 풀어 쓴다. 단위가 다르면 단위를 짚어 준다 */
function unreadReason(r, fact) {
  const unit = (r.unit_raw || '').replace(/\s+/g, '');
  if (unit && fact.unit && unit.toLowerCase() !== fact.unit.replace(/\s+/g, '').toLowerCase()) {
    return `원문 단위가 '${r.unit_raw}'로 적혀 있어요. 이 항목은 ${fact.unit} 기준이라 자동으로 읽지 않았어요. 단위가 오타인지 성적서나 분석기관에 확인한 뒤 ${fact.unit} 값으로 적어 주세요. 불검출이면 '미만'을 고르고 검출한계(없으면 같은 줄 기준값)를 적어 주세요.`;
  }
  return `${r.note || '값을 자동으로 정하지 못했어요.'} 원문을 보고 값을 적어 주세요.`;
}

/** 표 읽기가 단위를 환산했으면 {from, to, factor}. 메모 '단위 환산: mg/mL → mg/L (×1000)'에서 읽는다 */
function unitConversion(r) {
  const m = /단위 환산: (.+?) → (.+?) \(×([\d.e+-]+)\)/.exec(r?.note || '');
  return m ? { from: m[1], to: m[2], factor: m[3] } : null;
}

/** 원문 순서 비교 값(쪽 → 표 → 행). 위치가 없으면 맨 뒤 */
function position(r) {
  if (!r?.page) return Number.MAX_SAFE_INTEGER;
  const c = r.cell_ref || {};
  return r.page * 1e6 + (c.table_index ?? 999) * 1e3 + (c.row ?? 999);
}

/** 서류에서 자동으로 못 읽은 항목(값을 정하지 못한 것). 이미 다른 경로로 정한 항목은 뺀다 */
function unreadItems(doc, resolvedKeys = []) {
  return (doc?.extracted_facts?.table_read?.items || []).filter((i) => i.status !== 'FOUND' && !resolvedKeys.includes(i.key));
}

/** 서류의 자동 읽기 결과: {사실 키: {page, quote, cell_ref, value_raw, unit_raw, note}} */
function readItems(doc) {
  const out = {};
  for (const i of doc?.extracted_facts?.table_read?.items || []) if (!out[i.key]) out[i.key] = i;
  return out;
}

/** 원문 보기. 이 브라우저에 보관한 파일이 있으면 그대로, 없으면 원문에서 읽은 행 글자 */
function DocumentView({ doc, page, reads, activeKey }) {
  const [file, setFile] = useState(undefined); // undefined: 불러오는 중, null: 없음
  const [url, setUrl] = useState(null);
  const [text, setText] = useState(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let alive = true;
    let made = null;
    setFile(undefined);
    setText(null);
    loadDocumentFile(doc?.id, doc?.version).then(async (f) => {
      if (!alive) return;
      setFile(f);
      if (!f) return;
      made = URL.createObjectURL(f.blob);
      setUrl(made);
      if (isText(f)) setText(await f.blob.text());
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [doc?.id, doc?.version]);

  if (file === undefined) return <p className="muted review-empty">원문을 불러오는 중…</p>;
  if (file && isPdf(file)) {
    // #page로 해당 쪽을 연다. key를 바꿔 쪽 이동을 확실히 반영한다
    return <iframe key={page} className="review-pdf" title={`${doc.filename} 원문`} src={`${url}#page=${page}&zoom=page-width&navpanes=0`} />;
  }
  if (file && file.type.startsWith('image/')) {
    return (
      <div className="review-image" data-zoom={zoom}>
        <button type="button" className="button button-small button-quiet review-zoom" onClick={() => setZoom((z) => !z)}>{zoom ? '화면에 맞추기' : '크게 보기'}</button>
        <img src={url} alt={`${doc.filename} 원문`} />
      </div>
    );
  }
  if (file && text !== null) return <pre className="review-text">{text}</pre>;
  // 원문이 이 브라우저에 없음: 엔진이 원문에서 읽은 행을 보여 준다
  const lines = Object.entries(reads).filter(([, r]) => r.quote).sort(([, a], [, b]) => position(a) - position(b));
  return (
    <div className="review-fallback">
      <p className="wd-alert is-info">이 브라우저에는 원문 파일이 없어요(다른 기기에서 올렸거나 저장소를 지웠어요). 대신 원문에서 읽은 줄을 보여 드려요. 정확히 비교하려면 성적서를 직접 펼쳐 보세요.</p>
      {lines.length ? (
        <ul className="review-quotes">
          {lines.map(([k, r]) => <li key={k} data-active={k === activeKey}><span className="muted small">{r.page}쪽</span> {r.quote}</li>)}
        </ul>
      ) : <p className="muted">읽은 줄 정보가 없어요. 직접 적은 값이면 서류를 보며 확인해 주세요.</p>}
    </div>
  );
}

const isPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const isText = (f) => f.type.startsWith('text/') || /\.(txt|csv)$/i.test(f.name);
