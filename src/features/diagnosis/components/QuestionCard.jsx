import { useState } from 'react';

/**
 * 질문 하나를 두 부분으로 나눠 그린다.
 *  - QuestionBody: 베리 말풍선 안의 질문 내용(질문 문장, 묶음 항목, 왜 필요한지, 확인 방법)
 *  - QuestionOptions: 입력창 바로 위에 뜨는 선택지(버튼·소재 검색·수치 입력)
 * 누르면 onSend(quick_reply, 라벨)을 부른다.
 *  - 선택지 버튼: {key, kind:'value', value} / {key, kind:'none_all'|'expand'|'unknown'}  (value는 kind=value일 때만)
 *  - 수치 직접 입력: {key, kind:'value', value: 숫자}
 */

export function QuestionBody({ question: q }) {
  const g = q.guide || null;
  return (
    <div className="qbody">
      <p className="qbody-title">{q.text}</p>
      {q.input === 'group' && (
        <>
          {q.answered_items.length > 0 && (
            <p className="muted">{q.answered_items.map((a) => `${a.label}: ${a.value_label}`).join(' · ')} 은(는) 확인했어요.</p>
          )}
          <ul className="qcard-items">{q.items.map((i) => <li key={i.key}>{i.label}</li>)}</ul>
        </>
      )}
      {/* 배경 설명(guide.background)은 띄우지 않는다. 보충 설명 자료로만 쓴다 */}
      {g?.reason && (
        <div className="qcard-guide">
          <p><strong>이 답변이 왜 필요한가요?</strong> {g.reason}</p>
        </div>
      )}
      {g?.actions?.length > 0 && (
        <details>
          <summary>이렇게 확인하세요</summary>
          <ol className="qbody-actions">{g.actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
        </details>
      )}
      {q.help && !(g?.actions?.length > 0) && (
        <details>
          <summary>어떻게 확인하나요?</summary>
          <p className="muted">{q.help}</p>
        </details>
      )}
      {q.terms?.length > 0 && (
        <details>
          <summary>용어 설명</summary>
          <dl className="muted">
            {q.terms.map((t) => (
              <div key={t.term}>
                <dt><strong>{t.term}</strong></dt>
                <dd>{t.plain}{t.example ? ` (예: ${t.example})` : ''}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {g?.if_unknown && <p className="muted qcard-unknown">{g.if_unknown}</p>}
    </div>
  );
}

export function QuestionOptions({ question: q, disabled, onSend }) {
  const [filter, setFilter] = useState('');
  const [num, setNum] = useState('');

  const reply = (o) => onSend(o.kind === 'value' ? { key: q.key, kind: 'value', value: o.value } : { key: q.key, kind: o.kind }, o.label);
  const unknown = q.options.find((o) => o.kind === 'unknown') || (q.allow_unknown ? { label: q.input === 'material' ? '목록에 없어요' : '모름', kind: 'unknown' } : null);
  let opts = q.options.filter((o) => o.kind !== 'unknown');
  if (q.input === 'material' && filter.trim()) opts = opts.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const sendNumber = () => {
    const v = Number(num);
    if (num.trim() === '' || Number.isNaN(v)) return;
    onSend({ key: q.key, kind: 'value', value: v }, `${v}${q.measure_unit || ''}`);
    setNum('');
  };
  // 선택지가 많은 질문(소재·분류번호)은 칸을 넓게 쓰고 스크롤한다
  const many = q.input === 'material' || q.input === 'code' || q.input === 'material_group';

  return (
    <div className="qopts" role="group" aria-label="답변 선택지" data-input={q.input}>
      {q.input === 'material' && (
        <input className="wd-input" placeholder="소재 검색" aria-label="소재 검색" value={filter} onChange={(e) => setFilter(e.target.value)} />
      )}
      <div className={`qopts-list${many ? ' is-many' : ''}`}>
        {opts.map((o, i) => (
          <button key={i} type="button" className="qopt" disabled={disabled} onClick={() => reply(o)}>
            {q.input === 'code' ? <><strong>{o.value}</strong> {o.label}</> : o.label}
          </button>
        ))}
        {unknown && (
          <button type="button" className="qopt is-unknown" disabled={disabled} onClick={() => reply(unknown)}>{unknown.label}</button>
        )}
        {q.input === 'material' && opts.length === 0 && <p className="muted">맞는 소재가 없어요.</p>}
      </div>
      {q.input === 'number' && q.allow_free_number && (
        <div className="qcard-number">
          <input className="wd-input" type="number" inputMode="decimal" aria-label="정확한 값" placeholder="정확한 값 입력" value={num}
            onChange={(e) => setNum(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendNumber()} />
          {q.measure_unit && <span>{q.measure_unit}</span>}
          <button type="button" className="button button-primary" disabled={disabled || num.trim() === ''} onClick={sendNumber}>입력</button>
        </div>
      )}
    </div>
  );
}

/** 질문 내용과 선택지를 한 덩어리로 보여 준다(테스트·단독 사용용) */
export default function QuestionCard({ question, disabled, onSend }) {
  return (
    <section className="wd-card qcard" data-input={question.input}>
      <QuestionBody question={question} />
      <QuestionOptions question={question} disabled={disabled} onSend={onSend} />
    </section>
  );
}
