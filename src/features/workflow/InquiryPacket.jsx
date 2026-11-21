import { useId, useRef, useState } from 'react';
import { workflowApi } from './api.js';
import { inquiryGmailUrl, inquiryMailBody, inquiryMailto, REPLY_LINK_PROMPT, saveDownload, withReplyLink } from './inquiry-replies.js';
import { formatDateTime } from './labels.js';

const LINK_STATUS = {
  none: '아직 발급한 답장 링크가 없어요.',
  expired: '기존 답장 링크가 만료됐어요.',
  revoked: '답장 링크를 중지했어요.',
};

export function InquiryPacket({ lot, facility, busy, issuedLinks }) {
  const [packet, setPacket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [detailNotice, setDetailNotice] = useState('');
  const [includeLink, setIncludeLink] = useState(true);
  const [link, setLink] = useState(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState('');
  const dialog = useRef(null);
  const trigger = useRef(null);
  const mailHelp = useId();
  const key = facility.capability_key;

  async function issueLink() {
    const { status, path, expires_at } = await workflowApi.issueReplyLink(lot.id, key);
    const issued = { status, path, expires_at };
    issuedLinks.set(key, issued);
    setLink(issued);
  }

  async function loadLink({ issueIfInactive = false } = {}) {
    const status = await workflowApi.replyLink(lot.id, key);
    if (!dialog.current?.open) return;
    const remembered = issuedLinks.get(key);
    if (status.status === 'active' && remembered?.expires_at === status.expires_at) {
      setLink(remembered);
    } else {
      issuedLinks.delete(key);
      setLink(status);
      if (issueIfInactive && status.status !== 'active') await issueLink();
    }
  }

  async function updateLink(action, errorText) {
    setLinkBusy(true);
    setLinkError('');
    try {
      await action();
    } catch {
      setLink(null);
      setLinkError(errorText);
    } finally {
      setLinkBusy(false);
    }
  }

  async function prepare() {
    setLoading(true);
    setNotice('');
    setDetailNotice('');
    setIncludeLink(true);
    setLink(null);
    setLinkError('');
    try {
      const value = await workflowApi.inquiryPacket(lot, key);
      if (!dialog.current) return;
      setPacket(value);
      dialog.current.showModal();
      await updateLink(() => loadLink({ issueIfInactive: true }), '답장 링크를 준비하지 못했어요. 다시 시도해 주세요.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function changeLinkInclusion(checked) {
    setIncludeLink(checked);
    if (checked) updateLink(() => loadLink({ issueIfInactive: true }), '답장 링크를 준비하지 못했어요. 다시 시도해 주세요.');
  }

  function regenerateLink() {
    if (link.status === 'active' && !window.confirm('새 링크를 발급하면 이전에 보낸 링크는 사용할 수 없어요. 새 링크를 발급할까요?')) return;
    updateLink(async () => {
      await issueLink();
      setIncludeLink(true);
    }, '새 링크를 발급하지 못했어요. 링크 상태를 다시 확인해 주세요.');
  }

  function revokeLink() {
    if (!window.confirm('이미 메일로 보낸 링크에서도 더 이상 답할 수 없어요. 링크를 중지할까요?')) return;
    updateLink(async () => {
      await workflowApi.revokeReplyLink(lot.id, key);
      issuedLinks.delete(key);
      setLink({ status: 'revoked' });
      setIncludeLink(false);
    }, '링크를 중지하지 못했어요. 링크 상태를 다시 확인해 주세요.');
  }

  const subject = packet?.subject || `${facility.label} 반입 문의`;
  const replyPath = includeLink && link?.status === 'active' ? link.path : null;
  const replyUrl = replyPath ? `${location.origin}${replyPath}` : null;
  const message = inquiryMailBody(packet);
  const body = inquiryMailBody(packet, replyUrl);
  const detailText = withReplyLink(packet?.text || '', replyUrl);
  const mail = inquiryMailto(subject, body);
  const mailReady = Boolean(packet) && !linkBusy;

  async function copy(text, setMessage, success, failure) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(success);
    } catch {
      setMessage(failure);
    }
  }

  function download() {
    saveDownload(new Blob(['\uFEFF', detailText], { type: 'text/plain;charset=utf-8' }), packet.filename);
    setDetailNotice('상세 문의서를 저장했어요.');
  }

  return <>
    <button ref={trigger} className="button button-quiet button-small" type="button" disabled={busy || loading || linkBusy} onClick={prepare}>
      {loading ? '문의서 준비 중…' : '업체에 보낼 문의서'}
    </button>
    {notice && !packet && <p role="alert">{notice}</p>}
    <dialog ref={dialog} className="wf-inquiry-dialog" aria-label="업체에 보낼 메일" onClose={() => {
      setPacket(null);
      setNotice('');
      trigger.current?.focus();
    }}>
      <div className="wf-inquiry-heading">
        <h2>업체에 보낼 메일</h2>
        <button type="button" className="button button-quiet button-small" autoFocus onClick={() => dialog.current?.close()}>닫기</button>
      </div>
      <div className="wf-inquiry-preview">
        <dl>
          <div><dt>받는 사람</dt><dd>메일을 쓸 때 업체 이메일 주소를 입력해 주세요.</dd></div>
          <div><dt>제목</dt><dd><strong>{subject}</strong></dd></div>
        </dl>
        <div className="wf-inquiry-body">
          {replyUrl ? message.trimEnd() : message}
          {replyUrl && <>{`\n\n${REPLY_LINK_PROMPT}\n`}<a href={replyUrl} target="_blank" rel="noopener noreferrer">{replyUrl}</a></>}
        </div>
      </div>
      <div className="wf-inquiry-link" aria-busy={linkBusy}>
        <label className="wf-check">
          <input type="checkbox" checked={includeLink} disabled={linkBusy} onChange={(event) => changeLinkInclusion(event.target.checked)} />
          답장 링크 포함
        </label>
        {linkBusy && <p role="status">답장 링크를 확인하고 있어요…</p>}
        {!linkBusy && link && <>
          {link.status === 'active' ? <>
            <p role="status">답장 기한 <time dateTime={link.expires_at}>{formatDateTime(link.expires_at)}</time></p>
            {includeLink && !link.path && <p>이미 발급된 링크예요. 이번 메일에 주소를 넣으려면 새 링크를 발급해 주세요.</p>}
          </> : <p role="status">{LINK_STATUS[link.status]}</p>}
          <div className="wf-inquiry-actions">
            {link.status === 'active' && <button type="button" className="button button-quiet button-small" onClick={revokeLink}>링크 중지</button>}
            <button type="button" className="button button-quiet button-small" onClick={regenerateLink}>새 링크 발급</button>
          </div>
        </>}
        {!linkBusy && linkError && <>
          <p role="alert">{linkError}</p>
          <button type="button" className="button button-quiet button-small"
            onClick={() => updateLink(loadLink, '답장 링크를 확인하지 못했어요. 다시 시도해 주세요.')}>링크 다시 확인</button>
        </>}
      </div>
      <div className="wf-inquiry-actions">
        <a className="button button-primary button-small" href={mailReady ? inquiryGmailUrl(subject, body) : undefined}
          aria-disabled={!mailReady} target="_blank" rel="noopener noreferrer">Gmail에서 쓰기</a>
        <a className="button button-quiet button-small" href={mailReady ? mail.href : undefined}
          aria-disabled={!mailReady} aria-describedby={mailHelp}>메일 앱에서 열기</a>
        <button type="button" className="button button-quiet button-small" disabled={!mailReady}
          onClick={() => copy(`제목: ${subject}\n\n${body}`, setNotice, '메일 제목과 본문을 복사했어요.', '복사가 안 됐어요. 미리보기에서 내용을 선택해 복사해 주세요.')}>메일 내용 복사</button>
      </div>
      <p id={mailHelp} className="wf-inquiry-mail-help">
        PC에 메일 프로그램이 없으면 열리지 않아요. Gmail에서 쓰기나 복사를 이용해 주세요.
        {mailReady && mail.bodyOmitted && <><br />본문이 길어 메일 앱에는 제목만 들어가요. 메일 내용을 복사해 붙여 넣어 주세요.</>}
      </p>
      {notice && <p role="status">{notice}</p>}
      {packet && <details className="wf-inquiry-details">
        <summary>상세 문의서 (첨부·보관용)</summary>
        <textarea aria-label="상세 문의서 내용" readOnly value={detailText} rows={8} />
        <div className="wf-inquiry-actions">
          <button type="button" className="button button-quiet button-small" disabled={linkBusy}
            onClick={() => copy(detailText, setDetailNotice, '상세 문의서를 복사했어요.', '복사가 안 됐어요. 내용을 선택해 복사하거나 파일로 저장해 주세요.')}>문의서 복사</button>
          <button type="button" className="button button-quiet button-small" onClick={download} disabled={linkBusy}>텍스트 파일 저장</button>
        </div>
        {detailNotice && <p role="status">{detailNotice}</p>}
      </details>}
    </dialog>
  </>;
}
