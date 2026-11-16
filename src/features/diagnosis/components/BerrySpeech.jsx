/**
 * 베리 개인 말풍선: 큰 베리 머리 위에 떠서 "지금 무엇을 하는지"를 말한다. 채팅 기록에는 남지 않는다.
 *
 * mode
 *  - 'idle'      : 기다리는 중. 인사·안내 한 줄
 *  - 'thinking'  : 처리 중. 문장 뒤에 점 세 개가 움직인다(예: "답변을 확인하고 있어요")
 *  - 'streaming' : SSE로 글자가 들어오는 중. 받은 만큼 보여 주고 끝에 커서를 깜빡인다
 *
 * SSE·에이전트 연결 시: 서버가 보내는 진행 이벤트(예: {type:'status', text:'규칙을 확인하고 있어요'})는
 * mode='thinking'으로, 응답 글자 조각(delta)은 이어 붙여 mode='streaming'으로 넘기면 된다.
 * 진행 문구는 서버가 실제로 하는 일만 보낸다(화면이 단계를 지어내지 않는다).
 */
export default function BerrySpeech({ text, mode = 'idle' }) {
  if (!text) return null;
  return (
    <div className="berry-speech" data-mode={mode} role="status" aria-live="polite">
      <span>{text}</span>
      {mode === 'thinking' && (
        <span className="berry-dots" aria-hidden="true"><i /><i /><i /></span>
      )}
      {mode === 'streaming' && <span className="berry-caret" aria-hidden="true" />}
    </div>
  );
}
