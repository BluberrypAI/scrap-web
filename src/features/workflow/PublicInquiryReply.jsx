import { useEffect, useRef, useState } from 'react';
import { resetSession } from '../../hooks/useSession.js';
import { navigate } from '../../lib/router.js';
import { publicInquiryApi } from './api.js';
import {
  AVAILABILITY_LABELS, inquiryJoinError, inquirySummaryRows, optionalReplyFields,
  REPLY_FILE_ACCEPT, REPLY_FILE_HELP, replyFileError,
} from './inquiry-replies.js';
import { formatDateTime } from './labels.js';
import './workflow.css';

const RATE_LIMIT = '지금은 답장 요청이 많아요. 잠시 후 다시 시도해 주세요.';

export function PublicInquiryReply({ token }) {
  const [inquiry, setInquiry] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [closed, setClosed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const sendingNow = useRef(false);
  const joiningNow = useRef(false);
  const thanks = useRef(null);

  useEffect(() => {
    let active = true;
    publicInquiryApi.read(token).then((value) => {
      if (active) setInquiry(value);
    }).catch((failure) => {
      if (!active) return;
      if (failure.status === 404) setClosed(true);
      else setLoadError(failure.status === 429 ? RATE_LIMIT : '문의 내용을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    });
    return () => { active = false; };
  }, [token, attempt]);

  useEffect(() => {
    if (submitted) thanks.current?.focus();
  }, [submitted]);

  function retry() {
    setLoadError(null);
    setAttempt((value) => value + 1);
  }

  async function join() {
    if (joiningNow.current || sendingNow.current) return;
    joiningNow.current = true;
    setJoining(true);
    setJoinError(null);
    try {
      await publicInquiryApi.join(token);
      resetSession({ discardReturnPath: true });
      navigate('/wastes');
    } catch (failure) {
      if (failure.status === 404) setClosed(true);
      else setJoinError({ status: failure.status, message: inquiryJoinError(failure.status) });
      joiningNow.current = false;
      setJoining(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (sendingNow.current || joiningNow.current) return;
    const body = optionalReplyFields(new FormData(event.currentTarget), ['text', 'contact_name', 'contact_info']);
    const fileError = replyFileError(body.get('file'));
    if (fileError) {
      setError(fileError);
      return;
    }
    setError('');
    sendingNow.current = true;
    setSending(true);
    try {
      await publicInquiryApi.submit(token, body);
      setInquiry((value) => ({ ...value, reply_count: value.reply_count + 1 }));
      setSubmitted(true);
    } catch (failure) {
      if (failure.status === 404) setClosed(true);
      else if (failure.status === 429) setError(RATE_LIMIT);
      else if (failure.status === 422) setError('입력한 내용과 첨부파일을 확인한 뒤 다시 보내 주세요.');
      else if (failure.status === 413) setError('첨부파일은 10MB 이하로 올려 주세요.');
      else setError('답장을 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      sendingNow.current = false;
      setSending(false);
    }
  }

  const full = inquiry && inquiry.reply_count >= inquiry.max_replies;
  const summary = inquiry?.summary;

  return <main className="wf-public-reply">
    <meta name="robots" content="noindex" />
    {closed ? <section className="wf-card">
      <h1>{inquiryJoinError(404)}</h1>
      <p>문의 메일을 보낸 기업에 새 링크를 요청해 주세요.</p>
    </section> : !inquiry ? <section className="wf-card">
      <h1>업체 문의에 답하기</h1>
      {loadError ? <>
        <p role="alert">{loadError}</p>
        <button className="button button-primary" type="button" onClick={retry}>다시 시도</button>
      </> : <p role="status">문의 내용을 불러오고 있어요…</p>}
    </section> : <>
      <section className="wf-card wf-public-inquiry">
        <h1>{inquiry.subject}</h1>
        <dl className={summary ? 'wf-public-inquiry-summary' : undefined}>
          <div><dt>보낸 회사</dt><dd>{inquiry.sender_company_name}</dd></div>
          {inquirySummaryRows(summary).map(([label, value]) =>
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          <div><dt>받는 업체</dt><dd>{inquiry.facility_label}</dd></div>
          <div><dt>답장 기한</dt><dd><time dateTime={inquiry.expires_at}>{formatDateTime(inquiry.expires_at)}</time></dd></div>
        </dl>
        {summary ? <>
          {summary.questions?.length > 0 && <>
            <h2>여쭙는 내용</h2>
            <ol className="wf-public-inquiry-questions">
              {summary.questions.map((question) => <li key={question}>{question}</li>)}
            </ol>
          </>}
          <details className="wf-inquiry-details">
            <summary>상세 문의서 보기</summary>
            <div className="wf-public-inquiry-text">{inquiry.inquiry_text}</div>
          </details>
        </> : <>
          <h2>문의 내용</h2>
          <div className="wf-public-inquiry-text">{inquiry.inquiry_text}</div>
        </>}
      </section>
      {inquiry.joinable && <section className="wf-card wf-public-join">
        <h2>가입 없이 이 서비스에서 이어서 진행하기</h2>
        <p>이 링크로 보낸 회사와 대화하고, 인수 요청을 수락하거나 거절할 수 있어요. QR로 입고를 확인하고 처리 결과도 기록할 수 있어요.</p>
        <p className="wf-muted">링크 참여(미확인) 업체로 표시돼요.</p>
        {joinError?.status === 409 ? <a className="button button-quiet" href="/login">로그인 화면으로</a> : (
          <button className="button button-primary" type="button" onClick={join} disabled={joining || sending}>
            {joining ? '참여하는 중…' : inquiry.joined ? '이어서 진행하기(다시 들어가기)' : '가입 없이 참여하기'}
          </button>
        )}
        {joinError && <p className="wf-alert" role="alert">{joinError.message}</p>}
      </section>}
      <section className="wf-card">
        {submitted ? <>
          <h2 ref={thanks} tabIndex={-1}>답장해 주셔서 고마워요</h2>
          <p>{inquiry.sender_company_name}에서 답장을 확인할 수 있어요.</p>
        </> : <h2>문의에 답하기</h2>}
        <p className="wf-muted">이 답은 참고 정보이며 인수 수락·계약이 아니에요.</p>
        {full ? <p role="status">이 링크에서 보낼 수 있는 답장 {inquiry.max_replies}건을 모두 보냈어요.</p>
          : submitted ? <button type="button" className="button button-quiet" onClick={() => setSubmitted(false)}>다시 답하기</button>
          : <form className="wf-form wf-reply-form" onSubmit={submit}>
            <fieldset disabled={sending || joining}>
              <fieldset className="wf-forms">
                <legend>이 물량을 받을 수 있나요? (필수)</legend>
                {Object.entries(AVAILABILITY_LABELS).map(([value, label]) =>
                  <label className="wf-check" key={value}><input type="radio" name="availability" required value={value} />{label}</label>)}
              </fieldset>
              <label>조건·메모 (선택)<textarea name="text" placeholder="예: 포장 상태를 확인한 뒤 받을 수 있어요." rows={4} maxLength={2000} /></label>
              <label>담당자 이름 (선택)<input name="contact_name" autoComplete="name" maxLength={100} /></label>
              <label>전화번호 또는 이메일 (선택)<input name="contact_info" maxLength={200} /></label>
              <label>첨부파일 (선택)<input type="file" name="file" accept={REPLY_FILE_ACCEPT} /><small>{REPLY_FILE_HELP}</small></label>
              {error && <p className="wf-alert" role="alert">{error}</p>}
              <button type="submit" className="button button-primary">{sending ? '답장 보내는 중…' : '답장 보내기'}</button>
            </fieldset>
          </form>}
      </section>
    </>}
  </main>;
}
