import { useCallback, useEffect, useRef, useState } from 'react';
import { workflowApi } from './api.js';
import {
  optionalReplyFields, REPLY_FILE_ACCEPT, REPLY_FILE_HELP, replyFileError, replyLabels, saveDownload,
} from './inquiry-replies.js';
import { formatDateTime } from './labels.js';

export function InquiryReplies({ lotId, capabilityKey, busy }) {
  const [replies, setReplies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reading = useRef(0);
  const acting = useRef(false);

  const refresh = useCallback(async () => {
    if (acting.current) return;
    const request = ++reading.current;
    setLoading(true);
    setLoadError('');
    try {
      const list = await workflowApi.inquiryReplies(lotId, capabilityKey);
      if (request === reading.current) setReplies(list);
    } catch {
      if (request === reading.current) setLoadError('받은 답장을 불러오지 못했어요. 다시 불러와 주세요.');
    } finally {
      if (request === reading.current) setLoading(false);
    }
  }, [lotId, capabilityKey]);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      reading.current += 1;
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  async function run(label, work, fallback) {
    if (acting.current) return;
    acting.current = true;
    setAction(label);
    setNotice('');
    setError('');
    try {
      await work();
    } catch (failure) {
      setError(failure.status === 422 || failure.status === 413 ? failure.message : fallback);
    } finally {
      acting.current = false;
      setAction('');
    }
  }

  function register(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = optionalReplyFields(new FormData(form), ['text', 'received_on']);
    const file = body.get('file');
    const validation = replyFileError(file) || (!body.has('text') && !file ? '답장 내용을 적거나 파일을 첨부해 주세요.' : '');
    if (validation) {
      setNotice('');
      setError(validation);
      return;
    }
    run('register', async () => {
      const list = await workflowApi.addInquiryReply(lotId, capabilityKey, body);
      reading.current += 1;
      setReplies(list);
      setLoading(false);
      setLoadError('');
      form.reset();
      setNotice('받은 답장을 등록했어요.');
    }, '답장을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  function remove(reply) {
    if (!window.confirm('이 답장과 첨부파일을 삭제할까요?')) return;
    run('delete', async () => {
      await workflowApi.deleteInquiryReply(reply.id);
      reading.current += 1;
      setReplies((list) => list?.filter((item) => item.id !== reply.id));
      setLoading(false);
      setNotice('답장을 삭제했어요.');
    }, '답장을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  function download(reply) {
    run('download', async () => {
      const blob = await workflowApi.inquiryReplyFile(reply.id);
      saveDownload(blob, reply.file.name);
    }, '첨부파일을 내려받지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  const disabled = busy || Boolean(action);
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

  return <section className="facility-detail-section wf-replies" aria-label="받은 답장">
    <div className="wf-replies-heading">
      <h4>받은 답장{replies && ` ${replies.length}건`}</h4>
      <button className="button button-quiet button-small" type="button" onClick={refresh} disabled={disabled || loading}>다시 불러오기</button>
    </div>
    {loading && !replies && <p className="wf-muted" role="status">받은 답장을 불러오는 중이에요…</p>}
    {loadError && <p className="wf-alert" role="alert">{loadError}</p>}
    {!loading && !loadError && replies?.length === 0 && <p className="wf-muted">아직 받은 답장이 없어요.</p>}
    {replies?.length > 0 && <ul className="wf-replies-list">
      {replies.map((reply) => {
        const labels = replyLabels(reply);
        return <li key={reply.id}>
          <div className="wf-reply-meta">
            {reply.received_on
              ? <time dateTime={reply.received_on}>받은 날 {reply.received_on}</time>
              : reply.source === 'vendor_link'
                ? <time dateTime={reply.created_at}>받은 날 {formatDateTime(reply.created_at)}</time>
                : <span>받은 날 미입력</span>}
            {labels.source && <span className="wf-chip">{labels.source}</span>}
            {labels.availability && <span className="wf-chip" data-availability={reply.availability}>{labels.availability}</span>}
          </div>
          {reply.text && <p className="wf-reply-text">{reply.text}</p>}
          {(reply.contact_name || reply.contact_info) && <p>연락처 {[reply.contact_name, reply.contact_info].filter(Boolean).join(' · ')}</p>}
          <div className="wf-actions">
            {reply.file && <button className="button button-quiet button-small" type="button" disabled={disabled}
              onClick={() => download(reply)}>내려받기 · {reply.file.name}</button>}
            <button className="button button-quiet button-small" type="button" disabled={disabled} onClick={() => remove(reply)}>삭제</button>
          </div>
        </li>;
      })}
    </ul>}
    {error && <p className="wf-alert" role="alert">{error}</p>}
    {notice && <p className="wf-muted" role="status">{notice}</p>}
    <details className="facility-detail-more">
      <summary>받은 답장 직접 등록</summary>
      <form className="wf-form wf-reply-form" onSubmit={register}>
        <fieldset disabled={disabled}>
          <label>받은 날 (선택)<input type="date" name="received_on" max={today} /></label>
          <label>답장 내용<textarea name="text" rows={4} maxLength={5000} /></label>
          <label>첨부파일 (선택)<input type="file" name="file" accept={REPLY_FILE_ACCEPT} />
            <small>{REPLY_FILE_HELP}</small>
          </label>
          <button className="button button-primary button-small" type="submit">
            {action === 'register' ? '등록 중…' : '답장 등록'}
          </button>
        </fieldset>
      </form>
    </details>
  </section>;
}
