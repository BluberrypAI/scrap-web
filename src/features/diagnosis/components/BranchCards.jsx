import { useState } from 'react';
import { CATEGORY_LABEL, DOCUMENT_ACCEPT, EVIDENCE_REFUSE_REPLY, REVIEW_LABEL, ROUTE_ACTION_LABEL } from '../lib/labels.js';
import { formatDateTime, formatValue } from '../lib/format.js';
import { factLabel, getCatalog } from '../lib/normalize.js';

/** 숫자 칸에서 고를 수 있는 값 모양: 그대로 / 미만(불검출이면 검출한계를 적는다) */
const NUMBER_MODES = [
  { value: 'eq', label: '값' },
  { value: 'lt', label: '미만' },
];

/** 입력 칸 하나의 글 → 서버로 보낼 값. 비어 있으면 null, 형식이 틀리면 Error */
export function toDocumentValue(fact, row) {
  const raw = (row.value ?? '').toString().trim();
  if (!raw) return null;
  if (fact?.type === 'number') {
    const n = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(n)) throw new Error(`${fact.label || fact.key}: 숫자만 적어 주세요`);
    return row.mode === 'lt' ? { hi: n, hi_inc: false } : n;
  }
  if (fact?.type === 'bool') return raw === 'true';
  return raw;
}

/** 칸에 적은 값들 → 서버로 보낼 {사실: 값}. 형식이 틀리면 Error */
export function collectValues(rows) {
  const catalog = getCatalog();
  const values = {};
  for (const [k, row] of Object.entries(rows)) {
    const v = toDocumentValue(catalog[k] || { key: k, type: 'number' }, row);
    if (v !== null) values[k] = v;
  }
  return values;
}

/** 올린 서류에서 자동으로 정하지 못한 값의 이유: {사실 키: 메모} */
export function unreadReasons(docs) {
  const out = {};
  for (const d of docs || []) {
    for (const i of d.extracted_facts?.table_read?.items || []) {
      if (i.status !== 'FOUND' && !out[i.key]) out[i.key] = i.note || '자동으로 값을 정하지 못함';
    }
  }
  return out;
}

/** 자동으로 못 읽은 값 안내(왜 못 읽었는지 + 직접 적어 달라는 말) */
function UnreadNotice({ keys, unread }) {
  const shown = keys.filter((k) => unread[k]);
  if (!shown.length) return null;
  return (
    <div className="wd-alert is-info">
      <p><strong>성적서에서 자동으로 읽지 못한 값이 있어요.</strong> 성적서를 보고 아래 칸에 직접 적어 주세요.</p>
      <ul className="plain small">{shown.map((k) => <li key={k}>{factLabel(k) || k}: {unread[k]}</li>)}</ul>
    </div>
  );
}

/** 서류에 적힌 값을 항목별로 적는 칸. 요청 서류의 항목을 먼저 보이고, 다른 항목도 더할 수 있다 */
export function DocumentValuesForm({ keys, rows, setRows, disabled }) {
  const catalog = getCatalog();
  const shown = [...keys, ...Object.keys(rows).filter((k) => !keys.includes(k))];
  const addable = Object.values(catalog)
    .filter((f) => !shown.includes(f.key) && !f.parent && f.key !== 'material_group' && f.key !== 'annex4_code')
    .sort((a, b) => (a.label || a.key).localeCompare(b.label || b.key, 'ko'));
  const set = (k, patch) => setRows((r) => ({ ...r, [k]: { mode: 'eq', value: '', ...r[k], ...patch } }));
  return (
    <div className="doc-values">
      {shown.map((k) => {
        const f = catalog[k] || { key: k, type: 'number' };
        const row = rows[k] || { mode: 'eq', value: '' };
        const label = f.label || k;
        return (
          <div key={k} className="doc-value-row">
            <span className="doc-value-label">{label}</span>
            {f.type === 'number' && (
              <>
                <select className="wd-input" aria-label={`${label} 값 모양`} disabled={disabled} value={row.mode} onChange={(e) => set(k, { mode: e.target.value })}>
                  {NUMBER_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input className="wd-input" type="text" inputMode="decimal" aria-label={label} placeholder="숫자" disabled={disabled}
                  value={row.value} onChange={(e) => set(k, { value: e.target.value })} />
                {f.unit && <span className="muted">{f.unit}</span>}
              </>
            )}
            {f.type === 'bool' && (
              <select className="wd-input" aria-label={label} disabled={disabled} value={row.value} onChange={(e) => set(k, { value: e.target.value })}>
                <option value="">선택</option>
                <option value="true">예</option>
                <option value="false">아니오</option>
              </select>
            )}
            {f.type === 'enum' && (
              <select className="wd-input" aria-label={label} disabled={disabled} value={row.value} onChange={(e) => set(k, { value: e.target.value })}>
                <option value="">선택</option>
                {(f.values || []).map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            )}
          </div>
        );
      })}
      {addable.length > 0 && (
        <select className="wd-input" aria-label="다른 항목 더하기" disabled={disabled} value="" onChange={(e) => e.target.value && set(e.target.value, {})}>
          <option value="">+ 다른 항목 더하기</option>
          {addable.map((f) => <option key={f.key} value={f.key}>{f.label || f.key}</option>)}
        </select>
      )}
      <p className="muted small">서류에 적힌 값만 적어 주세요. 빈 칸은 보내지 않아요. &lsquo;불검출&rsquo;이면 &lsquo;미만&rsquo;을 고르고 검출한계(예: 0.01)를 적어 주세요. 단위가 다르면 칸 옆 단위로 바꿔 적어 주세요.</p>
    </div>
  );
}

/**
 * 서류 올리기 + 서류 값 직접 입력(항목별 칸, 선택). REQUEST_EVIDENCE면 요청 서류 목록과 '서류가 없어요'.
 * docs가 비어 있으면(사용자가 직접 연 경우) 목록 대신 닫기 버튼.
 */
export function EvidenceCard({ docs = [], disabled, onUpload, onText, onClose = null, unread = {} }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState({});
  const [err, setErr] = useState('');
  const keys = [...new Set(docs.flatMap((d) => d.facts || []))];
  const filled = Object.values(rows).some((r) => (r.value ?? '').toString().trim());
  const hasUnread = keys.some((k) => unread[k]);
  const submit = () => {
    let values = {};
    try {
      values = collectValues(rows);
    } catch (e) {
      setErr(e.message);
      return;
    }
    setErr('');
    onUpload(file, Object.keys(values).length ? values : null);
  };
  return (
    <section className="wd-card qcard" aria-label="서류 요청">
      <h3>{docs.length ? '이 서류로 확인할 수 있어요' : '서류 올리기'}</h3>
      {docs.length > 0 && <ul className="plain">{docs.map((d) => <li key={d.evidence_type}><strong>{d.label}</strong> <span className="muted">확인 항목: {d.fact_labels.join(', ')}</span></li>)}</ul>}
      <label className="wd-field"><span>파일 (PDF·사진·텍스트)</span>
        <input type="file" accept={DOCUMENT_ACCEPT} aria-label="서류 파일" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
      {file && <p className="muted">{file.name} · {Math.max(1, Math.round(file.size / 1024))}KB</p>}
      <p className="muted">PDF·사진을 올리면 시험성적서 표의 값을 자동으로 읽어 &lsquo;검수 대기&rsquo;로 넣어요. 사진은 읽는 데 몇 초 걸려요. 검수가 끝난 값만 판정에 쓰여요.</p>
      <UnreadNotice keys={keys} unread={unread} />
      <details open={hasUnread || undefined}>
        <summary>파일 없이 서류 값 직접 적기</summary>
        <DocumentValuesForm keys={keys} rows={rows} setRows={setRows} disabled={disabled} />
      </details>
      {err && <p className="wd-alert" role="alert">{err}</p>}
      <div className="row">
        <button type="button" className="button button-primary" disabled={disabled || (!file && !filled)} onClick={submit}>서류 올리기</button>
        {docs.length > 0 && <button type="button" className="button button-quiet" disabled={disabled} onClick={() => onText(EVIDENCE_REFUSE_REPLY)}>{EVIDENCE_REFUSE_REPLY}</button>}
        {onClose && <button type="button" className="button button-quiet" disabled={disabled} onClick={onClose}>닫기</button>}
      </div>
    </section>
  );
}

/**
 * 검수 대기 안내. 서류에서 읽은 값은 사람이 원문과 비교해 확인해야 판정에 쓰인다.
 * 할 일(원문과 비교해 검수하기)을 앞에 두고, 값 목록은 접어 둔다. 검수는 ReviewDialog에서 한다.
 * @param {{items: {doc: any, value: any}[], labels?: Record<string, string>, disabled?: boolean, onReview?: (() => void)|null}} p
 */
export function PendingReview({ items, unreadCount = 0, labels = {}, disabled, onReview = null }) {
  if (!items.length && !unreadCount) return null;
  return (
    <section className="wd-card qcard pending-review" aria-label="검수 대기">
      <h3>서류 값 확인이 필요해요 <span className="muted">({items.length + unreadCount}개)</span></h3>
      <p>
        서류에서 읽은 값이 원문과 맞는지 확인해 주세요. <strong>확인한 값만 판정에 쓰여요.</strong>
        {unreadCount > 0 && <> 자동으로 못 읽은 값 {unreadCount}개는 원문을 보고 직접 적어 주세요.</>}
      </p>
      {onReview && (
        <div className="row">
          <button type="button" className="button button-primary" disabled={disabled} onClick={onReview}>원문과 비교해 검수하기</button>
        </div>
      )}
      {items.length > 0 && <details>
        <summary>읽은 값 미리 보기</summary>
        <ul className="plain small">
          {items.map(({ doc, value }) => (
            <li key={value.id}>
              <strong>{labels[value.fact_key] || value.fact_key}</strong> = {formatValue(value.value, value.unit ? ` ${value.unit}` : '')}{' '}
              <span className="muted">{doc.filename}</span>
            </li>
          ))}
        </ul>
      </details>}
    </section>
  );
}

const READ_STATUS_LABEL = { AMBIGUOUS: '확인 필요', UNREADABLE: '글자를 못 읽음' };

/**
 * 서류 자동 읽기 결과 중 사람이 알아야 할 것: 값을 정하지 못한 항목, 읽기 오류·경고.
 * 값을 정한 항목은 검수 대기 목록에 이미 있으므로 여기서는 보이지 않는다.
 * @param {{docs: any[], labels?: Record<string, string>}} p
 */
/** 자동 읽기에서 사람이 볼 메모(못 읽은 값·오류·경고)가 있는 서류 */
export function autoReadNoteRows(docs) {
  return docs
    .map((d) => ({ doc: d, tr: d.extracted_facts?.table_read }))
    .filter(({ tr }) => tr && ((tr.items || []).some((i) => i.status !== 'FOUND') || (tr.errors || []).length || (tr.warnings || []).length));
}

export function AutoReadNotes({ docs, labels = {} }) {
  const rows = autoReadNoteRows(docs);
  if (!rows.length) return null;
  return (
    <section className="wd-card qcard" aria-label="자동 읽기 메모">
      <h3>자동으로 정하지 못한 값</h3>
      {rows.map(({ doc, tr }) => (
        <div key={doc.id}>
          <p className="muted">{doc.filename} v{doc.version ?? 1}{tr.backend ? ` · ${tr.source === 'ocr' ? '문서 인식(OCR)으로 읽음' : 'PDF 글자로 읽음'}` : ''}</p>
          <ul className="plain">
            {(tr.errors || []).map((e, i) => <li key={`e${i}`} className="wd-alert">{e.message}</li>)}
            {(tr.items || []).filter((i) => i.status !== 'FOUND').map((i) => (
              <li key={i.key}>
                <strong>{labels[i.key] || i.key}</strong> · {READ_STATUS_LABEL[i.status] || i.status}
                {i.value_raw ? ` · 원문 '${[i.value_raw, i.unit_raw].filter(Boolean).join(' ')}'` : ''}
                {i.note && <div className="muted small">{i.note}</div>}
              </li>
            ))}
            {(tr.warnings || []).map((w, i) => <li key={`w${i}`} className="muted small">{w.message}</li>)}
          </ul>
        </div>
      ))}
      <p className="muted">이 값들은 원문을 보고 직접 입력해 주세요.</p>
    </section>
  );
}

/** RESOLVE_CONFLICT: 서버가 준 choices를 그대로 버튼으로 */
export function ConflictCard({ conflicts, disabled, onReply, onAction }) {
  return (
    <section className="wd-card qcard" aria-label="값 확인">
      <h3>값이 서로 달라요</h3>
      {conflicts.map((c, i) => (
        <div key={i}>
          <p>
            <strong>{c.label}</strong>{' '}
            {c.claimed_label != null && <span className="muted">말씀: {c.claimed_label} · 서류: {c.evidenced_label}</span>}
          </p>
          <div className="qcard-list">
            {c.choices.map((ch, j) => (
              <button key={j} type="button" className="button button-quiet" disabled={disabled}
                onClick={() => (ch.quick_reply ? onReply(ch.quick_reply, ch.label) : onAction(ch.action, ch.key || c.fact))}>{ch.label}</button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/** UNSUPPORTED */
/** 칸으로 적을 수 있는 남은 항목(별표 4 번호 선택처럼 고르는 항목은 대화로 묻는다) */
const NOT_A_VALUE = new Set(['annex4_code', 'material', 'material_group']);

/**
 * 판정 불가. 막다른 길이 되지 않도록 무엇이 남았는지·왜 막혔는지·어떻게 이어 갈지를 함께 보인다.
 *  - 남은 항목마다 자동으로 못 읽은 이유(있으면)
 *  - "서류 값 적기": 남은 항목 칸을 바로 열어 값을 보낸다(onValues)
 *  - 입력창에 편하게 말해도 이어서 진행한다
 */
export function UnsupportedCard({ message, pending, unread = {}, disabled, onValues = null }) {
  const keys = pending.map((p) => p.key).filter((k) => !NOT_A_VALUE.has(k));
  const [open, setOpen] = useState(keys.some((k) => unread[k]));
  const [rows, setRows] = useState({});
  const [err, setErr] = useState('');
  const filled = Object.values(rows).some((r) => (r.value ?? '').toString().trim());
  const send = () => {
    try {
      const values = collectValues(rows);
      setErr('');
      onValues(values);
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <section className="wd-card qcard" aria-label="판정 불가">
      <h3>지금은 판정할 수 없어요</h3>
      <p>{message}</p>
      {pending.length > 0 && (
        <ul className="plain">
          {pending.map((p) => <li key={p.key}>○ {p.label}{unread[p.key] && <div className="muted small">자동으로 못 읽음: {unread[p.key]}</div>}</li>)}
        </ul>
      )}
      {open && onValues && keys.length > 0 && (
        <>
          <UnreadNotice keys={keys} unread={unread} />
          <DocumentValuesForm keys={keys} rows={rows} setRows={setRows} disabled={disabled} />
          {err && <p className="wd-alert" role="alert">{err}</p>}
        </>
      )}
      <p className="muted small">서류가 생기면 값을 적어 주시고, 아니면 아래 입력창에 편하게 말씀하셔도 이어서 진행해요.</p>
      <div className="row">
        {onValues && keys.length > 0 && !open && <button type="button" className="button button-primary" disabled={disabled} onClick={() => setOpen(true)}>서류 값 적기</button>}
        {open && <button type="button" className="button button-primary" disabled={disabled || !filled} onClick={send}>값 보내기</button>}
        <a className="button button-quiet" href="/wastes">목록으로</a>
      </div>
    </section>
  );
}

const MARK = { true: '✔', false: '✗' };

/** FINAL_REVIEW(확정 전) / 인계 요약(확정 후) */
export function FinalCard({ turn, confirmed, handoff, busy, onConfirm, onRecheck }) {
  const [json, setJson] = useState(false);
  const [asking, setAsking] = useState(false); // 확정 전 화면 안 확인(네이티브 confirm은 테마·자동화 불가)
  const r = turn.ui.result;
  const v = turn.verdict;
  const guide = handoff?.route_guidance;
  return (
    <section className="wd-card qcard final" aria-label="판정 결과">
      <div className="row between">
        <h3>{r.code ? <><strong>{r.code}</strong> {r.name}</> : r.conclusion}</h3>
        <span className="wd-chip is-review">{REVIEW_LABEL[r.review] || r.review}</span>
      </div>
      {r.code && <p>{r.conclusion} {r.category && <span className="muted">({CATEGORY_LABEL[r.category] || r.category})</span>}</p>}
      {/* 왜 이 결론인지와 할 일. 번호를 못 정한 결론일수록 이게 먼저 보여야 한다 */}
      {r.reason && (
        <div className="wd-note final-reason" role="note">
          <strong>{r.code ? '판정 이유' : '번호를 정하지 못한 이유'}</strong>
          <p>{r.reason}</p>
        </div>
      )}
      {r.assumptions?.length > 0 && (
        <details className="final-assumptions">
          <summary>참고: 시험이 아니라 답변으로 추정한 내용 ({r.assumptions.length})</summary>
          <ul className="plain">{r.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </details>
      )}
      {v.conditions.length > 0 && (
        <ul className="plain">{v.conditions.map((c, i) => <li key={i}>{MARK[c.satisfied] || '○'} {c.text}</li>)}</ul>
      )}
      {v.rationale.length > 0 && (
        <details><summary>근거 보기</summary><ul className="plain">{v.rationale.map((x, i) => (
          <li key={i}>{typeof x === 'string' ? x : <><strong>{x.ref}</strong>{x.excerpt && <> — “{x.excerpt}”</>}</>}</li>
        ))}</ul></details>
      )}
      {!confirmed && (
        <>
          <p className="muted">{r.next_step}</p>
          {!asking ? (
            <div className="row">
              <button type="button" className="button button-quiet" disabled={busy} onClick={onRecheck}>다시 확인할게요</button>
              <button type="button" className="button button-primary" disabled={busy || !turn.ui.can_confirm} onClick={() => setAsking(true)}>확정</button>
            </div>
          ) : (
            <div className="row" role="alertdialog" aria-label="확정 확인">
              <span>확정하면 판정이 기록되고 다음 단계로 넘어갑니다. 확정할까요?</span>
              <button type="button" className="button button-quiet" disabled={busy} onClick={() => setAsking(false)}>취소</button>
              <button type="button" className="button button-primary" disabled={busy} onClick={() => { setAsking(false); onConfirm(); }}>확정하기</button>
            </div>
          )}
        </>
      )}
      {confirmed && (
        <div className="handoff">
          <h4>다음 단계로 넘기는 내용</h4>
          {guide ? (
            <>
              <p><strong>{ROUTE_ACTION_LABEL[guide.action] || guide.action}</strong></p>
              <p>{guide.summary}</p>
              {guide.notes?.length > 0 && <ul className="plain">{guide.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
            </>
          ) : <p className="muted">인계 정보를 불러오지 못했어요.</p>}
          {handoff?.confirmed_at && <p className="muted">확정 {formatDateTime(handoff.confirmed_at)}</p>}
          <div className="row">
            <button type="button" className="button button-quiet" onClick={() => setJson((x) => !x)}>{json ? '인계 JSON 닫기' : '경로 추천으로 (인계 JSON)'}</button>
            <a className="button button-quiet" href="/wastes">목록으로</a>
          </div>
          {json && <pre className="json">{JSON.stringify(handoff, null, 2)}</pre>}
        </div>
      )}
    </section>
  );
}
