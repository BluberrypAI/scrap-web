import { useState } from 'react';
import { diagnosisApi as api } from '../lib/client.js';
import { CATEGORY_LABEL, OUTCOME_LABEL } from '../lib/labels.js';
import { formatDateTime } from '../lib/format.js';
import { useLoad } from '../lib/useLoad.js';
import { navigate } from '../../../lib/router.js';

export default function DiagnosisHistoryPage({ id }) {
  const { data: detail, error, reload } = useLoad(() => api.getCase(id), [id]);
  const { data: trace } = useLoad(() => api.trace(id).catch(() => null), [id]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function reopen() {
    setBusy(true);
    setErr('');
    try {
      await api.reopen(id, reason.trim() || null);
      navigate(`/wastes/case-${id}/survey`);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
      reload();
    }
  }
  if (error) return <p className="wd-alert" role="alert">{error.message}</p>;
  if (!detail) return <p className="muted">불러오는 중…</p>;
  const rows = (trace?.sessions || []).flatMap((s) => s.turns);

  return (
    <div>
      <div className="row between">
        <h2>판정 기록 · {detail.case.summary.title}</h2>
        <a className="button button-small button-quiet" href={`/wastes/case-${id}/survey`}>← 문진으로</a>
      </div>
      <h3>판정 버전</h3>
      {detail.verdicts.length === 0 && <p className="muted">아직 확정한 판정이 없어요.</p>}
      <ul className="plain">
        {detail.verdicts.map((v) => (
          <li key={v.version} className="wd-card">
            <strong>v{v.version}</strong> {v.code ? `${v.code} ${v.name}` : OUTCOME_LABEL[v.outcome] || v.outcome}{' '}
            <span className="muted">{CATEGORY_LABEL[v.category] || v.category} · 확정 {formatDateTime(v.confirmed_at)}</span>
            {v.superseded_at && <div className="muted">대체됨 {formatDateTime(v.reopened_at || v.superseded_at)}{v.reopen_reason ? ` · 사유: ${v.reopen_reason}` : ''}</div>}
          </li>
        ))}
      </ul>
      {detail.case.status === 'CODE_CONFIRMED' && (
        <div className="wd-card">
          <label className="wd-field"><span>다시 열기 사유</span>
            <input className="wd-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예) 시험 결과가 달라졌어요" /></label>
          {err && <p className="wd-alert" role="alert">{err}</p>}
          <button type="button" className="button button-primary" disabled={busy} onClick={reopen}>다시 열기</button>
        </div>
      )}
      <h3>진행 기록</h3>
      {rows.length === 0 && <p className="muted">기록이 없어요.</p>}
      <ol className="plain">
        {rows.map((r) => (
          <li key={r.seq} className="trace-row">
            <span className="muted">{r.seq}. {r.kind} · {formatDateTime(r.recorded_at)}</span>
            {r.payload?.user_input && <div>입력: {r.payload.user_input}</div>}
            {r.payload?.branch && <div>분기: {r.payload.branch} {r.payload.branch_reason && <span className="muted">({r.payload.branch_reason})</span>}</div>}
            <details><summary>자세히</summary><pre className="json">{JSON.stringify(r.payload, null, 2)}</pre></details>
          </li>
        ))}
      </ol>
    </div>
  );
}
