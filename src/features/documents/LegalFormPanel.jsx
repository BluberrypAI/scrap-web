import { useEffect, useMemo, useRef, useState } from 'react';
import { legalFormsApi } from './api.js';
import { FORMS, PHYSICAL_STATE_HELP, RECIPIENT_HINT, RECIPIENT_SUGGESTIONS, availableForms, buildBody, fieldsFor, hasSubmit, hintFor, todayString } from './fields.js';
import { SignaturePad } from './SignaturePad.jsx';
import { StampPicker } from './StampPicker.jsx';
import { overlayItems } from './preview.js';
import './documents.css';

// 확정된 문진 건의 법정 서식(제6·12·5호) 작성. 서버에서 칸별 값을 받아 미리 보여 주고 한글(HWPX) 또는 PDF로 내려받는다.
// 파일은 서버에 저장되지 않고 기관에 자동 제출되지 않는다.
// 입력 초안은 사업자등록번호·대표자·전화번호를 담으므로 이 탭(sessionStorage)에만 둔다.
// 탭을 닫으면 지워져 공용 PC의 다음 사용자에게 남지 않는다.
const draftKey = (caseId, kind) => `legal-form-draft:${caseId}:${kind}`;
const emptyDraft = () => ({ company: {}, waste: {}, submit: { date: todayString() } });

function loadDraft(caseId, kind) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey(caseId, kind)) ?? 'null');
    if (saved && typeof saved === 'object') {
      const base = emptyDraft();
      // 서명은 저장하지 않는다 (혹시 남아 있어도 버린다)
      const { signature_png: _s, signer_confirmed: _c, mark_type: _m, ...submit } = saved.submit ?? {};
      return { ...base, ...saved, submit: { ...base.submit, ...submit } };
    }
  } catch { /* 저장소를 못 쓰면 빈 값으로 */ }
  return emptyDraft();
}
function saveDraft(caseId, kind, draft) {
  try { sessionStorage.setItem(draftKey(caseId, kind), JSON.stringify(draft)); } catch { /* 무시 */ }
  // 이전 버전이 localStorage에 남긴 초안은 지운다
  try { localStorage.removeItem(draftKey(caseId, kind)); } catch { /* 무시 */ }
}

function Sheet({ kind, items, layout }) {
  const [W, H] = layout?.page ?? [595, 841];
  return (
    <div className="lf-sheet" style={{ aspectRatio: `${W} / ${H}` }}>
      <img src={`/legal-forms/${kind}.png`} alt="원본 서식 첫 쪽" />
      <div>
        {items.map((it) => (it.cls === 'sign' ? (
          <img key={it.key} className="lf-sign" src={it.src} alt="" style={it.style} />
        ) : (
          <span
            key={it.key}
            className={`lf-ink lf-${it.cls}`}
            data-align={it.align}
            style={{ fontSize: `${it.size}cqw`, ...it.style }}
          >
            {it.parts
              ? it.parts.map((p, i) => (p.value ? <b key={i}>{p.text}</b> : (p.size ? <span key={i} style={{ fontSize: `${p.size}cqw` }}>{p.text}</span> : p.text)))
              : it.text}
          </span>
        )))}
      </div>
    </div>
  );
}

// 미리보기 크게 보기: 화면 가득 띄우고, 확대 단계를 고를 수 있다
function BigPreview({ open, onClose, children }) {
  const ref = useRef(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="lf-big" aria-label="미리보기 크게 보기" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="lf-big-bar">
        <div className="lf-seg" role="group" aria-label="확대">
          {[1, 1.5, 2].map((z) => (
            <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)}>{`${z * 100}%`}</button>
          ))}
        </div>
        <button type="button" className="lf-big-close" onClick={onClose}>닫기</button>
      </div>
      <div className="lf-big-scroll">
        {/* 100% = 한 쪽 전체가 창 높이에 들어가는 크기 (A4 비율) */}
        <div className="lf-big-page" style={{ width: `calc(min(100%, (94vh - 110px) * 0.7075) * ${zoom})` }}>{children}</div>
      </div>
    </dialog>
  );
}

function Field({ field, kind, value, onChange, handoff }) {
  const id = `lf-${kind}-${field.from}-${field.key}`;
  const isCode = field.key === 'waste_code';
  const verdict = handoff?.waste_code ?? handoff?.result?.waste_code;
  const hint = isCode
    ? (!verdict
      ? '업체·관할 기관에 확인한 번호를 입력하세요.'
      : handoff?.review === 'VERIFIED'
        ? `문진 판정: ${verdict} (검토된 규칙 결과). 비우면 이 번호를 써요.`
        : `문진 판정: ${verdict} (검토 전 규칙 결과라 업체·관할 기관에 확인한 뒤 입력하세요). 비우면 분류번호 칸이 빈 채로 나가요.`)
    : hintFor(field, kind);
  const isCheck = field.type === 'checkbox';
  const label = <label htmlFor={id}><span>{field.label}</span>{!isCheck && <em>{field.from === 'company' ? '회사 정보' : '이번 배출'}</em>}</label>;
  let control;
  if (field.options) {
    control = (
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {field.options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    );
  } else if (isCheck) {
    control = <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
  } else {
    control = (
      <input
        id={id}
        type="text"
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        value={value ?? ''}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <div className={`lf-field${isCheck ? ' is-check' : ''}${field.wide ? ' is-wide' : ''}`}>
      {isCheck ? <>{control}{label}</> : <>{label}{control}</>}
      {isCode && verdict && (
        <button type="button" className="lf-mini" onClick={() => onChange(verdict)}>문진 판정 번호 넣기</button>
      )}
      {hint && <p className="lf-hint">{hint}</p>}
      {field.key === 'physical_state' && (
        <details className="lf-help">
          <summary>성질·상태가 뭔가요?</summary>
          <p>{PHYSICAL_STATE_HELP}</p>
        </details>
      )}
    </div>
  );
}

function SubmitGroup({ kind, submit, onField, onMark, mark, markType, onMarkType, confirmed, onConfirm, padKey }) {
  const listId = `lf-recipients-${kind}`;
  return (
    <fieldset className="lf-submit">
      <legend>제출 정보</legend>
      <div className="lf-fields">
        <div className="lf-field">
          <label htmlFor={`lf-${kind}-date`}><span>작성일</span></label>
          <input id={`lf-${kind}-date`} type="date" value={submit.date ?? ''} onChange={(e) => onField('date', e.target.value)} />
        </div>
        <div className="lf-field">
          <label htmlFor={`lf-${kind}-recipient`}><span>받는 기관장</span></label>
          <input id={`lf-${kind}-recipient`} type="text" list={listId} value={submit.recipient ?? ''} onChange={(e) => onField('recipient', e.target.value)} />
          <datalist id={listId}>{RECIPIENT_SUGGESTIONS[kind].map((r) => <option key={r} value={r} />)}</datalist>
          <p className="lf-hint">{RECIPIENT_HINT[kind]}. 비우면 서식에 인쇄된 목록을 그대로 둬요.</p>
        </div>
        <div className="lf-field is-wide">
          <label htmlFor={`lf-${kind}-signer`}><span>신고인(제출인) 이름</span></label>
          <input id={`lf-${kind}-signer`} type="text" value={submit.signer_name ?? ''} onChange={(e) => onField('signer_name', e.target.value)} />
          <p className="lf-hint">비우면 대표자 성명을 써요.</p>
        </div>
      </div>
      <section className="lf-mark" aria-label="서명·날인">
        <h3>서명·날인</h3>
        <div className="lf-seg" role="group" aria-label="서명·날인 방법">
          <button type="button" aria-pressed={markType === 'signature'} onClick={() => onMarkType('signature')}>직접 서명</button>
          <button type="button" aria-pressed={markType === 'seal'} onClick={() => onMarkType('seal')}>도장 이미지</button>
        </div>
        {markType === 'signature'
          ? <SignaturePad key={`${kind}-${padKey}`} onChange={onMark} />
          : <StampPicker key={`${kind}-${padKey}`} value={mark} onChange={onMark} />}
        <div className="lf-frame" data-type={markType} role="img" aria-label={mark ? '서명·날인 자리: 인쇄될 모습' : '서명·날인 자리: 아직 비어 있어요'}>
          <span className="lf-frame-text" aria-hidden="true">(서명 또는 인)</span>
          {mark && <img src={mark} alt="" />}
        </div>
        <label className="lf-confirm">
          <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} />
          <span>신고인 본인(또는 위임받은 사람)이 직접 서명·날인합니다</span>
        </label>
        <p className="lf-hint">서명·날인은 한글 파일과 PDF 모두의 (서명 또는 인) 자리에 들어가요. 서버와 브라우저에 저장되지 않아요. 기관에 따라 직접 서명·날인을 요구할 수 있으니 제출 전에 확인해 주세요.</p>
      </section>
    </fieldset>
  );
}

function FilingGuide({ kind }) {
  if (kind === 'form5') {
    return (
      <details className="lf-filing-guide">
        <summary>수탁확인서는 어떻게 제출하나요?</summary>
        <div className="lf-filing-guide-body">
          <p>위탁할 처리업체에 작성본을 전달하세요. 업체가 수탁자 항목을 확인하고 서명 또는 날인한 확인서를 받으면, 해당하는 배출자 신고나 처리계획 확인 신청에 첨부하세요.</p>
        </div>
      </details>
    );
  }

  const designated = kind === 'form12';

  return (
    <details className="lf-filing-guide">
      <summary>올바로 제출 안내</summary>
      <div className="lf-filing-guide-body">
        <p>올바로에 로그인한 뒤 <strong>기초정보관리 → 인허가 신청·등록</strong>에서 {designated ? '폐기물 처리계획(변경)서(제12호)' : '사업장폐기물배출자 신고서·변경신고서(제6호)'}를 선택하세요.</p>
        <p>{designated ? '폐기물 발생지를 관할하는 시·도 또는 유역·지방환경청에 제출하세요.' : '폐기물 발생지를 관할하는 시·군·구 또는 특별자치시·도에 신고하세요.'}</p>
        <ol>
          <li>상호·사업자등록번호·대표자 정보, 사업장 주소·연락처, 업종과 제조공정을 확인하세요. 주 원료의 사용량과 주 생산품의 생산량은 연간 기준으로 적으세요.</li>
          <li>{designated
            ? '폐기물 종류·분류번호·성질, 배출량(kg/월·톤/년), 배출주기를 입력하세요.'
            : '배출시설계 구분, 폐기물 종류·분류번호·성질, 배출량(톤/월·톤/년)을 입력하세요.'} 운반자·운반량, 자가 또는 위탁 처리 여부, 처리업체·처리방법 번호·연간 처리량을 확인하세요.</li>
          <li>위탁 처리 시 처리업체가 확인한 제5호 서류를 첨부하세요. {designated
            ? '최초 확인 신청 시 분석결과서(제13호)의 제출 대상인지 확인하세요. 변경 신청에는 변경 증빙을 첨부하고, 기존 확인증명서 제출은 접수기관 안내를 확인하세요.'
            : '지정폐기물 여부를 미리 확인해야 하는 경우 분석결과서도 첨부하세요. 변경신고라면 변경 전·후와 변경 사유를 적고, 변경 증빙과 기존 배출자 신고증명서를 첨부하세요.'}</li>
        </ol>
        <a href="https://www.allbaro.or.kr/01_wsf/wsf_emis_intro.vm" target="_blank" rel="noopener noreferrer">올바로 공식 신청 안내 (새 탭)</a>
        <a href={designated ? 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14800000273' : 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14800000193'} target="_blank" rel="noopener noreferrer">정부24 접수기관·제출서류 안내 (새 탭)</a>
      </div>
    </details>
  );
}

export function LegalFormPanel({ caseId, handoff }) {
  const kinds = availableForms(handoff);
  const kindsKey = kinds.join(',');
  const [kind, setKind] = useState(kinds[0] ?? null);
  const [draft, setDraft] = useState(() => (kinds[0] ? loadDraft(caseId, kinds[0]) : emptyDraft()));
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [big, setBig] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [layouts, setLayouts] = useState({});
  // 서명은 메모리에만 둔다 (초안 저장·서버 저장 없음)
  const [signature, setSignature] = useState('');
  const [markType, setMarkType] = useState('signature');
  const [confirmed, setConfirmed] = useState(false);
  const [padKey, setPadKey] = useState(0);
  function clearSignature() { setSignature(''); setConfirmed(false); setMarkType('signature'); setPadKey((n) => n + 1); }
  function changeMarkType(t) { if (t === markType) return; setSignature(''); setConfirmed(false); setMarkType(t); setPadKey((n) => n + 1); }
  const seq = useRef(0);

  // 건·서식 목록이 바뀌면 첫 서식으로 돌아간다
  useEffect(() => {
    const first = kindsKey ? kindsKey.split(',')[0] : null;
    setKind(first);
    setDraft(first ? loadDraft(caseId, first) : emptyDraft());
    setPreview(null);
    setNotice('');
    clearSignature();
  }, [caseId, kindsKey]);

  // 미리보기 칸 위치는 서식마다 한 번만 읽는다
  useEffect(() => {
    if (!kind || layouts[kind]) return;
    let live = true;
    fetch(`/legal-forms/${kind}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (live && json) setLayouts((prev) => ({ ...prev, [kind]: json })); })
      .catch(() => {});
    return () => { live = false; };
  }, [kind, layouts]);

  const body = useMemo(() => (kind
    ? buildBody(kind, { ...draft, submit: { ...draft.submit, signature_png: signature, mark_type: markType, signer_confirmed: confirmed } })
    : null), [kind, draft, signature, markType, confirmed]);

  // 입력이 멈추고 0.4초 뒤 서버에 칸별 값·문제 점검을 묻는다 (늦게 온 옛 응답은 버린다)
  useEffect(() => {
    if (!kind) return undefined;
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const result = await legalFormsApi.preview(caseId, kind, body);
        if (mine !== seq.current) return;
        setPreview(result);
        setError('');
      } catch (e) {
        if (mine !== seq.current) return;
        setPreview(null);
        setError(e.message);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [caseId, kind, body]);

  const layout = kind ? layouts[kind] : null;
  const items = useMemo(() => overlayItems(layout, preview?.edits, signature, markType), [layout, preview, signature, markType]);

  if (!kind) return null;

  function pick(next) {
    if (next === kind) return;
    setKind(next);
    setDraft(loadDraft(caseId, next));
    setPreview(null);
    setError('');
    setNotice('');
    clearSignature();
  }
  function changeSubmit(key, value) {
    setDraft((prev) => {
      const next = { ...prev, submit: { ...prev.submit, [key]: value } };
      saveDraft(caseId, kind, next);
      return next;
    });
    setNotice('');
  }
  function change(field, value) {
    setDraft((prev) => {
      const next = { ...prev, [field.from]: { ...prev[field.from], [field.key]: value } };
      saveDraft(caseId, kind, next);
      return next;
    });
    setNotice('');
  }
  function reset() {
    const next = emptyDraft();
    saveDraft(caseId, kind, next);
    setDraft(next);
    clearSignature();
  }
  async function download(format) {
    setBusy(format); setNotice('');
    try {
      const { blob, filename } = await legalFormsApi.download(caseId, kind, body, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(format === 'pdf'
        ? `${filename} 파일을 받았어요. PDF는 고치기 어려우니, 고칠 내용이 있으면 한글 파일을 받아 주세요.`
        : `${filename} 파일을 받았어요. 한글에서 열어 확인해 주세요.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const needConfirm = Boolean(signature) && !confirmed;
  const problem = preview?.problem || error;
  const status = problem
    ? { cls: 'is-bad', text: problem }
    : needConfirm
      ? { cls: 'is-bad', text: '서명·날인을 넣으려면 "신고인 본인(또는 위임받은 사람)이 직접 서명·날인합니다"에 체크해 주세요.' }
      : { cls: 'is-ok', text: notice || (hasSubmit(kind)
        ? '서식에 넣을 수 있는 값이에요. 생년월일은 받은 파일에 직접 적어 주세요.'
        : '서식에 넣을 수 있는 값이에요. 생년월일·서명·날짜는 업체가 직접 적어요.') };

  return (
    <section className="lf-panel" aria-label="법정 서식 작성">
      <header>
        <h2>작성할 서식 선택</h2>
        <p className="lf-lead">
          판정 결과에 맞는 서식을 한글 파일이나 PDF로 만들어 드려요. 파일은 서버에 저장되지 않고 기관에 자동 제출되지 않아요.
          생년월일은 받은 파일에 직접 적어 주세요. (제5호의 날짜·서명은 업체가 적어요.)
        </p>
      </header>

      <div className="lf-tabs" role="group" aria-label="서식 고르기">
        {kinds.map((k) => (
          <button key={k} type="button" aria-pressed={k === kind} onClick={() => pick(k)}>{FORMS[k].title}</button>
        ))}
      </div>

      <FilingGuide key={kind} kind={kind} />

      <div className="lf-split">
        <form className="lf-inputs" onSubmit={(e) => e.preventDefault()} noValidate>
          <p className="lf-hint">비워 두면 등록한 회사 정보로 채워요.</p>
          <div className="lf-fields">
            {fieldsFor(kind).map((f) => (
              <Field
                key={`${kind}-${f.from}-${f.key}`}
                field={f}
                kind={kind}
                value={draft[f.from]?.[f.key]}
                onChange={(v) => change(f, v)}
                handoff={handoff}
              />
            ))}
          </div>
          {hasSubmit(kind) && (
            <SubmitGroup
              kind={kind}
              submit={draft.submit ?? {}}
              onField={changeSubmit}
              mark={signature}
              markType={markType}
              onMarkType={changeMarkType}
              onMark={(png) => { setSignature(png); if (!png) setConfirmed(false); }}
              confirmed={confirmed}
              onConfirm={setConfirmed}
              padKey={padKey}
            />
          )}
          {preview?.warnings?.length > 0 && (
            <ul className="lf-warnings" aria-label="확인할 내용">
              {preview.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
        </form>

        <aside className="lf-preview" aria-label="예상 파일 미리보기">
          <div className="lf-preview-head">
            <span>미리보기</span>
            <button type="button" onClick={() => setBig(true)}>크게 보기</button>
          </div>
          <button type="button" className="lf-sheet-open" onClick={() => setBig(true)} aria-label="미리보기 크게 보기">
            <Sheet kind={kind} items={items} layout={layout} />
          </button>
          <BigPreview open={big} onClose={() => setBig(false)}>
            <Sheet kind={kind} items={items} layout={layout} />
          </BigPreview>
          <p className="lf-hint">미리보기예요. 파란 글씨가 채워질 값이고, 실제 한글 파일과 줄바꿈이 조금 다를 수 있어요. 첫 쪽만 보여 줘요.</p>
        </aside>
      </div>

      <div className="lf-bar">
        <p role="status" className={status.cls}>{status.text}</p>
        <div className="lf-actions">
          <button type="button" className="is-ghost" onClick={reset}>비우기</button>
          <button type="button" className="is-ghost" onClick={() => download('pdf')} disabled={Boolean(busy) || Boolean(problem) || needConfirm}>
            {busy === 'pdf' ? '만드는 중…' : 'PDF 받기'}
          </button>
          <button type="button" onClick={() => download('hwpx')} disabled={Boolean(busy) || Boolean(problem) || needConfirm}>
            {busy === 'hwpx' ? '만드는 중…' : '한글 파일 받기'}
          </button>
        </div>
      </div>
    </section>
  );
}
