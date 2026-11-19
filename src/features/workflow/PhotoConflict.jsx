import { useState } from 'react';
import { invalidReviewPhotos } from './review-policy.js';

export function PhotoConflict({ lot, busy, onResolve }) {
  const [condition, setCondition] = useState(lot.data.current.condition);
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const gate = lot.photo_conflict_gate;
  const invalid = invalidReviewPhotos(lot.review);
  if (invalid.length || gate?.invalid_photos?.length) return <section className="wf-card wf-form" role="alert" aria-label="폐기물 사진 다시 등록">
    <h3>폐기물 사진이 아니에요. 실제 물량을 촬영해 주세요.</h3>
    <p>캐릭터·그림·문서처럼 폐기물 상태를 확인할 수 없는 이미지가 있어 검토를 보류했어요.</p>
  </section>;
  if (!gate?.issues?.length) return null;
  const issues = [...new Set(gate.issues.map(i => i.concern))];
  return <section className="wf-card wf-form" aria-label="사진과 상태 설명 확인">
    <h3>{gate.blocked ? '사진과 설명을 확인한 뒤 인수를 요청해 주세요' : '사진·설명 불일치에 대한 확인을 기록했어요'}</h3>
    <ul className="wf-checks">{issues.slice(0, 2).map(text => <li key={text}>{text}</li>)}</ul>
    {issues.length > 2 && <details><summary>다른 업체 검토에서 나온 확인 사항 {issues.length - 2}건</summary><ul>{issues.slice(2).map(text => <li key={text}>{text}</li>)}</ul></details>}
    <p>분류번호는 변경하지 않아요. 재질·발생 공정·유해성에 대한 문진 답변이 다르거나 불확실하면 인수 요청을 멈추고 재문진해 주세요. 사진만으로 재질을 확정할 수는 없어요.</p>
    <a href="/wastes">자원 경로에서 새 폐기물 문진 시작하기</a>
    <p className="wf-muted">새 문진은 별도 건으로 진행되며, 기존 처리 건의 번호를 자동으로 바꾸지 않아요.</p>
    {gate.resolution && <p role="status">확인 사유: {gate.resolution.note} — 업체에도 전달돼요. AI 우려가 해소되거나 반입이 승인됐다는 뜻은 아니에요.</p>}
    <>
      {gate.blocked && <p className="wf-alert" role="status">확인 전에는 모든 업체에 인수 요청을 보낼 수 없어요.</p>}
      <label className="wf-field">현재 상태 설명 수정<textarea aria-label="현재 상태 설명 수정" value={condition} maxLength={1500} onChange={e => setCondition(e.target.value)} /></label>
      <label className="wf-field">확인·수정 사유<textarea aria-label="확인·수정 사유" value={note} maxLength={1000} onChange={e => setNote(e.target.value)} placeholder="사진과 설명이 달라 보이는 이유, 확인한 사실을 10자 이상 적어 주세요" /></label>
      <button className="button button-primary" disabled={!!busy || condition.trim().length < 3 || condition.trim() === lot.data.current.condition || note.trim().length < 10}
        onClick={() => onResolve({ action: 'correct', condition: condition.trim(), note: note.trim() })}>설명 수정 후 다시 검토하기</button>
      <p className="wf-muted">수정 내용을 저장하면 기존 업체 검토가 초기화돼요. 업체 검토를 다시 실행해 주세요.</p>
      <label className="wf-check"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />재질·발생 공정·유해성 답변이 기존 문진과 같고, 사진과 기존 설명을 직접 확인했어요</label>
      <button className="button button-quiet" disabled={!!busy || !checked || note.trim().length < 10 || condition.trim() !== lot.data.current.condition}
        onClick={() => onResolve({ action: 'confirm', note: note.trim(), classification_unchanged: true })}>기존 설명 확인 내용 기록</button>
    </>
  </section>;
}

export function PhotoConflictReceipt({ value }) {
  if (!value) return null;
  return <div className="wf-alert"><strong>발송 기업의 사진·설명 불일치 확인</strong>
    <p>{value.note}</p>
    <ul>{[...new Set((value.issues || []).map(i => i.concern))].map(c => <li key={c}>{c}</li>)}</ul>
    <p className="wf-muted">발송 기업의 확인 기록이며 AI 우려의 해소나 반입 승인이 아니에요. 수신 업체가 최종 확인해 주세요.</p>
  </div>;
}
