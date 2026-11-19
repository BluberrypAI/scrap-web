import { useEffect, useRef, useState } from 'react';
import { workflowApi } from './api.js';

// 문의서 준비만 수행한다. 외부 발송이나 인수 요청은 하지 않는다.
export function InquiryPacket({ lot, facility, busy }) {
  const [packet, setPacket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  const trigger = useRef(null);
  const closeButton = useRef(null);
  useEffect(() => {
    setPacket(null);
    dialog.current?.close();
  }, [lot.revision, lot.review, facility.capability_key]);
  async function prepare() {
    setLoading(true); setNotice('');
    try {
      const value = await workflowApi.inquiryPacket(lot, facility.capability_key);
      setPacket(value);
      dialog.current?.showModal();
      closeButton.current?.focus();
    } catch (error) { setNotice(error.message); }
    finally { setLoading(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(packet.text); setNotice('문의서를 복사했어요. 보낼 내용을 확인해 주세요.'); }
    catch { setNotice('복사가 안 됐어요. 아래 내용을 선택해 복사하거나 파일로 저장해 주세요.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob(['\uFEFF', packet.text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = packet.filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('문의서를 저장했어요. 업체에 자동 전송되지는 않아요.');
  }
  return <>
    <button ref={trigger} className="button button-quiet button-small" type="button" disabled={busy || loading} onClick={prepare}>
      {loading ? '문의서 준비 중…' : '업체에 보낼 문의서'}
    </button>
    {notice && !packet && <p role="alert">{notice}</p>}
    <dialog ref={dialog} className="wf-inquiry-dialog" aria-label="업체 반입조건 문의서" onClose={() => trigger.current?.focus()}>
      <h2>{facility.label}에 확인할 내용</h2>
      <p>현재 기업명·사업장 주소·물량 설명이 들어 있어요. 보내기 전에 확인해 주세요. 사진은 포함하지 않으며 자동 전송하지 않아요.</p>
      <textarea aria-label="문의서 내용" readOnly value={packet?.text || ''} />
      {notice && <p role="status">{notice}</p>}
      <div className="wf-inquiry-actions">
        <button type="button" onClick={copy} disabled={!packet}>문의서 복사</button>
        <button type="button" onClick={download} disabled={!packet}>텍스트 파일 저장</button>
        <button ref={closeButton} type="button" onClick={() => dialog.current?.close()}>닫기</button>
      </div>
    </dialog>
  </>;
}
