/** 보충 설명 말풍선(TurnResponse.assist). 질문 카드와 별도이며 판정에는 쓰지 않는다. */
export default function AssistBubble({ a }) {
  if (!a || !a.text) return null;
  return (
    <div className="bubble assistant assist" role="note">
      <p>{a.text}</p>
      {a.review === 'UNVERIFIED' && <span className="wd-chip is-review">검토 전 규칙 · 참고용</span>}
      {a.sources?.length > 0 && (
        <details>
          <summary>근거 보기</summary>
          <ul className="plain">
            {a.sources.map((s) => (
              <li key={s.id}><strong>{s.ref}</strong>{s.excerpt && <> — “{s.excerpt}”</>}</li>
            ))}
          </ul>
        </details>
      )}
      {a.terms?.length > 0 && (
        <details>
          <summary>용어 설명</summary>
          <dl className="muted">
            {a.terms.map((t) => (
              <div key={t.term}><dt><strong>{t.term}</strong></dt><dd>{t.plain}</dd></div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
