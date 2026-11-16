import { Fragment, useEffect, useRef, useState } from 'react';
import { diagnosisApi as api } from '../lib/client.js';
import { factLabel, getCatalog } from '../lib/normalize.js';
import { STATUS_LABEL } from '../lib/labels.js';
import { useLoad } from '../lib/useLoad.js';
import { navigate } from '../../../lib/router.js';
import { QuestionBody, QuestionOptions } from '../components/QuestionCard.jsx';
import berry from '../../../assets/berry.png';
import Board from '../components/Board.jsx';
import { AutoReadNotes, autoReadNoteRows, unreadReasons, ConflictCard, EvidenceCard, FinalCard, PendingReview, UnsupportedCard } from '../components/BranchCards.jsx';
import AssistBubble from '../components/AssistBubble.jsx';
import BerrySpeech from '../components/BerrySpeech.jsx';
import ReviewDialog from '../components/ReviewDialog.jsx';
import { saveDocumentFile } from '../lib/docStore.js';

const MANUAL_NOTE_NAME = '서류값-직접입력.txt';
/** 직접 적은 서류 값을 사람이 읽을 수 있는 글로 남긴다(서버에는 이 글과 값이 함께 저장된다) */
function manualNote(facts) {
  const show = (v) => (v && typeof v === 'object' ? `${v.hi} 미만` : String(v));
  const lines = Object.entries(facts || {}).map(([k, v]) => `${factLabel(k) || k}: ${show(v)}${getCatalog()[k]?.unit ? ` ${getCatalog()[k].unit}` : ''}`);
  return ['사용자가 서류를 보고 직접 적은 값', ...lines].join('\n');
}

// 검수한 사람 이름. 로그인이 붙으면 사용자 이름으로 바꾼다.
const REVIEWER = '화면 검수';

/** 베리가 하는 말 한 줄(말풍선이나 카드). 얼굴은 채팅창 밖 BerryStage에 하나만 둔다 */
function BerryRow({ children }) {
  return <div className="berry-say">{children}</div>;
}

/** 채팅창 왼쪽의 큰 베리(마스코트). 머리 위 개인 말풍선(BerrySpeech)으로 지금 하는 일을 말한다 */
function BerryStage({ speech, talking }) {
  return (
    <aside className="berry-stage" data-busy={speech?.mode === 'idle' ? 'false' : 'true'} aria-label="문진 도우미 베리">
      <BerrySpeech text={speech?.text} mode={speech?.mode} />
      {/* 말하는 동안 두 장면을 번갈아 보인다: ① 원래 웃는 입 ② 몸 색으로 덮고 벌린 입(반달) */}
      <div className="berry-figure" data-talking={talking ? 'true' : 'false'}>
        <img src={berry} alt="베리" />
        <span className="berry-mouth-cover" aria-hidden="true">
          <svg className="berry-mouth" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M2 8 L98 8 A48 88 0 0 1 2 8 Z" />
          </svg>
        </span>
      </div>
      <strong>베리</strong>
    </aside>
  );
}

export default function DiagnosisChatPage({ id, afterConfirm = null }) {
  const { data, error, loading, reload } = useLoad(() => api.getCase(id), [id]);
  const [conv, setConv] = useState([]);
  const [turn, setTurn] = useState(null);
  const [kase, setKase] = useState(null);
  const [handoff, setHandoff] = useState(null);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(''); // 처리 중 베리 말풍선 문구(SSE 진행 이벤트가 생기면 여기로 넣는다)
  const [talking, setTalking] = useState(false); // 베리 입 움직임
  const [err, setErr] = useState(null);
  const [retry, setRetry] = useState(null);
  const [upload, setUpload] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [resolved, setResolved] = useState([]); // 검수 창에서 직접 적어 반영한 못 읽은 항목
  const [hint, setHint] = useState('');
  const [text, setText] = useState('');
  const composer = useRef(null);
  const chatEnd = useRef(null);
  // 새 말풍선이 쌓이면 대화 영역 맨 아래(최신)로 내린다
  useEffect(() => {
    const box = chatEnd.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [conv.length, busy]);
  // 베리가 새로 말하면(마지막 말풍선이 베리 것) 글 길이만큼 잠깐 입을 움직인다
  useEffect(() => {
    const last = conv[conv.length - 1];
    if (!last || last.role !== 'assistant') return undefined;
    setTalking(true);
    const ms = Math.min(800 + (last.text || '').length * 35, 3500);
    const t = setTimeout(() => setTalking(false), ms);
    return () => clearTimeout(t);
  }, [conv]);

  useEffect(() => {
    if (!data) return;
    setConv(data.conversation);
    setTurn(data.latest_turn);
    setKase(data.case);
    setHandoff(data.handoff);
    setDocs(data.documents || []);
  }, [data]);

  if (error) return <p className="wd-alert" role="alert">{error.message} <a href="/wastes">목록으로</a></p>;
  if (loading && !turn) return <p className="muted">불러오는 중…</p>;
  if (!turn || !kase) return null;

  const confirmed = kase.status === 'CODE_CONFIRMED' || kase.status === 'IN_TRANSIT' || kase.status === 'COMPLETED';

  /** 서버 호출 공통: 잠금, 오류 처리(409 stale → 새로 불러오기, 네트워크 → 다시 보내기) */
  async function run(userText, call, again, doing = '답변을 확인하고 있어요') {
    setBusy(true);
    setStatus(doing);
    setErr(null);
    setRetry(null);
    setConv((c) => [...c, { role: 'user', text: userText }]);
    try {
      const t = await call();
      setTurn(t);
      setKase((k) => ({ ...k, status: t.case_status || k.status }));
      // 질문 턴은 질문 내용(ui.question)을 함께 남겨, 지난 질문도 베리 말풍선에 같은 모양으로 보인다
      setConv((c) => [...c, { role: 'assistant', text: t.message, branch: t.branch, assist: t.assist, question: t.ui?.question || null }]);
      setUpload(false);
      setHint('');
    } catch (e) {
      setConv((c) => c.slice(0, -1));
      setErr(e.message);
      if (e.kind === 'stale') reload();
      else if (e.kind === 'network') setRetry(() => again);
      else if (e.kind === 'conflict') reload();
    } finally {
      setBusy(false);
    }
  }
  const sendReply = (quick_reply, label) => {
    const go = () => run(label, () => api.sendMessage(id, { quick_reply }), go);
    go();
  };
  const sendText = (t) => {
    const go = () => run(t, () => api.sendMessage(id, { text: t }), go);
    go();
    setText('');
  };
  const sendFile = (file, facts) => {
    // 파일 없이 값만 적었으면 적은 값을 글로 남긴 텍스트 파일을 함께 보낸다(API는 서류 파일이 꼭 있어야 한다).
    const f = file || new File([manualNote(facts)], MANUAL_NOTE_NAME, { type: 'text/plain' });
    // 값은 검수 대기 후보로만 저장된다(판정은 그대로). 검수 완료 값만 적용(apply)되어 판정에 쓰인다.
    const go = () => run(file ? `서류 올림: ${f.name}` : '서류 값 직접 입력', () => api.uploadDocument(id, f, facts).then((d) => {
      setDocs((ds) => [...ds.filter((x) => x.id !== d.document.id), d.document]);
      // 원문은 이 브라우저에만 보관해 검수 창에서 비교할 때 쓴다(엔진은 원문을 보관하지 않음)
      saveDocumentFile(d.document.id, d.document.version ?? 1, f);
      // 읽은 값이나 못 읽은 값이 있으면 바로 검수 창을 연다
      if (d.values?.length || (d.document.extracted_facts?.table_read?.items || []).some((i) => i.status !== 'FOUND')) setReviewing(true);
      return d.turn;
    }), go, '성적서 표를 읽고 있어요');
    go();
  };
  /** 검수 완료: 확인한 값을 서류별로 적용(apply)한다. 고친 값은 고친 값으로 */
  const applyReviewed = (entries) => {
    const byDoc = new Map();
    for (const it of entries) byDoc.set(it.doc.id, [...(byDoc.get(it.doc.id) || []), it]);
    const reviewed_at = new Date().toISOString();
    const go = () => run(`서류 값 ${entries.length}개 검수 완료`, async () => {
      let t = null;
      for (const [docId, its] of byDoc) {
        // 읽은 값은 value_id로, 못 읽어 직접 적은 값은 fact_key로 보낸다
        t = await api.applyDocumentValues(id, docId, its.map(({ doc, value, factKey, fixed }) => ({
          ...(value ? { value_id: value.id } : { fact_key: factKey }),
          document_version: doc.version ?? 1, reviewer: REVIEWER, reviewed_at,
          ...(fixed !== undefined ? { value: fixed } : {}),
        })));
      }
      const ids = new Set(entries.filter((i) => i.value).map((i) => i.value.id));
      const keys = new Set(entries.filter((i) => !i.value).map((i) => i.factKey));
      setResolved((r) => [...new Set([...r, ...keys])]);
      setDocs((ds) => ds.map((d) => ({ ...d, values: (d.values || []).map((v) => (ids.has(v.id) ? { ...v, status: 'APPLIED' } : v)) })));
      setReviewing(false);
      return t;
    }, go, '검수한 값으로 다시 판정하고 있어요');
    go();
  };
  async function confirm() {
    setBusy(true);
    setStatus('확정하고 있어요');
    setErr(null);
    try {
      const d = await api.confirm(id, turn.ui.result?.code || turn.ui.result?.outcome || null);
      setKase(d.case);
      setHandoff({ ...d.handoff, confirmed_at: d.verdict?.confirmed_at });
    } catch (e) {
      setErr(e.message);
      if (e.kind === 'stale' || e.kind === 'conflict') reload();
    } finally {
      setBusy(false);
    }
  }
  const onAction = (action, key) => {
    if (action === 'UPLOAD') setUpload(true);
    else setHint(`오른쪽 판정 보드에서 '${key}' 항목을 고치거나 되돌려 주세요.`);
  };

  const pending = docs.flatMap((d) => (d.values || [])
    .filter((v) => v.status === 'UNVERIFIED' && v.document_version === (d.version ?? 1))
    .map((v) => ({ doc: d, value: v })));
  const pendingLabels = Object.fromEntries(pending.map(({ value }) => [value.fact_key, factLabel(value.fact_key) || value.fact_key]));
  const q = turn.ui.question;
  // 서류 카드: 엔진이 서류를 요청했을 때, 또는 사용자가 '서류 올리기'를 눌렀을 때
  const showEvidence = (turn.branch === 'REQUEST_EVIDENCE' && turn.ui.requested_documents.length > 0) || upload;
  const readDocs = docs.filter((d) => d.extracted_facts?.table_read);
  // 서류 값으로 이미 정해진 항목(적용됨)과 검수 창에서 직접 적은 항목은 '못 읽은 값'에서 뺀다
  const resolvedKeys = [...new Set([...resolved, ...docs.flatMap((d) => (d.values || []).filter((v) => v.status === 'APPLIED').map((v) => v.fact_key))])];
  const unread = Object.fromEntries(Object.entries(unreadReasons(readDocs)).filter(([k]) => !resolvedKeys.includes(k)));
  const unreadLeft = Object.keys(unread).length > 0;
  const readLabels = Object.fromEntries(readDocs.flatMap((d) => (d.extracted_facts.table_read.items || []).map((i) => [i.key, factLabel(i.key) || i.key])));
  // 질문이 아닌 단계(판정 확인·서류 요청·값 충돌·판정 불가)는 베리 말풍선 안에 카드로 넣는다
  let card = null;
  let asking = false; // 질문 중: 질문 내용은 베리 말풍선, 선택지는 입력창 바로 위
  if (!confirmed) {
    if (turn.branch === 'FINAL_REVIEW') card = <FinalCard turn={turn} busy={busy} onConfirm={confirm} onRecheck={() => composer.current?.focus()} />;
    else if (turn.branch === 'UNSUPPORTED') card = <UnsupportedCard key={turn.turn_id} message={turn.message} pending={turn.ui.board.pending} unread={unread} disabled={busy} onValues={(v) => sendFile(null, v)} />;
    else if (turn.branch === 'RESOLVE_CONFLICT' && turn.ui.conflicts.length) card = <ConflictCard conflicts={turn.ui.conflicts} disabled={busy} onReply={sendReply} onAction={onAction} />;
    else if (q && !showEvidence) asking = true;
    if (showEvidence) card = <EvidenceCard docs={turn.ui.requested_documents} disabled={busy} onUpload={sendFile} onText={sendText} onClose={upload ? () => setUpload(false) : null} unread={unread} />;
  } else if (turn.ui.result) card = <FinalCard turn={turn} confirmed handoff={handoff} />;

  // 베리 머리 위 말풍선: 처리 중이면 하는 일, 아니면 지금 단계 안내
  let speech;
  if (busy) speech = { mode: 'thinking', text: status || '확인하고 있어요' };
  else if (confirmed) speech = { mode: 'idle', text: '확정됐어요. 기록에서 다시 볼 수 있어요' };
  else if (pending.length > 0) {
    // 표에서 자동으로 읽은 값이 있으면 '읽었어요', 직접 적은 값만 있으면 '받았어요'
    const autoRead = pending.some(({ doc }) => doc.extracted_facts?.table_read);
    speech = { mode: 'idle', text: autoRead ? '성적서에서 값을 읽었어요. 맞는지 확인해 주세요' : '적어 주신 서류 값을 받았어요. 맞는지 확인해 주세요' };
  }
  else if (asking) speech = { mode: 'idle', text: '아래에서 고르거나 편하게 말씀해 주세요' };
  else if (turn.branch === 'FINAL_REVIEW') speech = { mode: 'idle', text: '결과를 보고 맞으면 확정해 주세요' };
  else if (showEvidence && Object.keys(unread).some((k) => turn.ui.requested_documents.some((d) => (d.facts || []).includes(k)))) {
    speech = { mode: 'idle', text: '성적서에서 못 읽은 값이 있어요. 칸에 직접 적어 주세요' };
  } else if (showEvidence) speech = { mode: 'idle', text: '서류를 올려 주시면 값을 읽어 볼게요' };
  else if (turn.branch === 'UNSUPPORTED') speech = { mode: 'idle', text: '남은 값을 적거나 편하게 말씀해 주시면 이어서 할게요' };
  else speech = { mode: 'idle', text: '폐기물 문진을 도와드려요' };

  /** 베리의 말: 질문이면 질문 내용, 아니면 AI가 쓴 문장 */
  const berrySays = (m, i) => {
    const last = i === conv.length - 1;
    const question = last && asking ? q : m.branch === 'ASK_FACT' ? m.question : null;
    if (question) return <QuestionBody question={question} />;
    return <p>{m.text}</p>;
  };

  return (
    <div className="case-layout">
      {/* 제목 줄은 베리·채팅·보드 위에 한 줄로 걸친다 */}
      <div className="case-head row between">
        <h2>문진 <span className="status-badge" data-status={kase.status}>{kase.summary.status_label || STATUS_LABEL[kase.status]}</span></h2>
        <span className="row">
          <a className="button button-small button-quiet" href="/wastes">← 목록</a>
          <a className="button button-small button-quiet" href={`/wastes/case-${id}/history`}>기록</a>
        </span>
      </div>
      <BerryStage speech={speech} talking={talking || speech.mode === 'streaming'} />
      <div className="case-main">
        <div className="chat-col">
          <div className="chat" aria-live="polite">
            {conv.map((m, i) => (
              <Fragment key={i}>
                {m.assist && <BerryRow><AssistBubble a={m.assist} /></BerryRow>}
                {m.role === 'user'
                  ? <p className="bubble user">{m.text}</p>
                  : <BerryRow><div className="bubble assistant">{berrySays(m, i)}</div></BerryRow>}
              </Fragment>
            ))}
            {/* 첫 질문처럼 앞에 베리 말이 없으면 질문을 따로 띄운다 */}
            {asking && !busy && conv[conv.length - 1]?.role !== 'assistant' && (
              <BerryRow><div className="bubble assistant"><QuestionBody question={q} /></div></BerryRow>
            )}
            {card && !busy && <BerryRow>{card}</BerryRow>}
            {/* 올린 서류에서 자동으로 읽은 값 안내도 베리가 말한다(검수 전 후보) */}
            {!confirmed && !busy && autoReadNoteRows(readDocs).length > 0 && <BerryRow><AutoReadNotes docs={readDocs} labels={readLabels} /></BerryRow>}
            <span ref={chatEnd} />
          </div>
          {hint && <p className="wd-alert is-info">{hint}</p>}
          {!confirmed && <PendingReview items={pending} unreadCount={Object.keys(unread).length} labels={pendingLabels} disabled={busy} onReview={() => setReviewing(true)} />}
          {err && <p className="wd-alert" role="alert">{err} {retry && <button type="button" className="button button-small" onClick={retry}>다시 보내기</button>}</p>}
          {/* 선택지는 입력창 바로 위에 띄운다. 골라도 되고 직접 입력해도 된다 */}
          {asking && !busy && <QuestionOptions key={q.key} question={q} disabled={busy} onSend={sendReply} />}
          {confirmed ? (
            <>
              <div className="row">
                <p className="muted">확정된 건입니다. 고치려면 기록에서 다시 여세요.</p>
                <button type="button" className="button button-small button-quiet" onClick={() => navigate(`/wastes/case-${id}/history`)}>기록 보기</button>
              </div>
              {/* 확정 뒤 다음 단계(처리 경로 준비)는 scrap-web이 붙인다 */}
              {afterConfirm?.({ id, kase, result: turn.ui.result, handoff })}
            </>
          ) : (
            <form className="composer" onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendText(text.trim()); }}>
              <textarea ref={composer} className="wd-input" rows={2} disabled={busy} aria-label="메시지" placeholder="자유롭게 입력하거나 위에서 고르세요…"
                value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (text.trim()) sendText(text.trim()); } }} />
              <button type="submit" className="button button-primary" disabled={busy || !text.trim()}>보내기</button>
              {!showEvidence && <button type="button" className="button button-quiet" disabled={busy} onClick={() => setUpload(true)}>서류 올리기</button>}
            </form>
          )}
        </div>
      </div>
      <Board board={turn.ui.board} locked={confirmed || busy} onReply={sendReply} />
      {reviewing && !confirmed && (pending.length > 0 || unreadLeft) && (
        <ReviewDialog items={pending} docs={readDocs} resolvedKeys={resolvedKeys} labels={pendingLabels} busy={busy} onApply={applyReviewed} onClose={() => setReviewing(false)} />
      )}
    </div>
  );
}
