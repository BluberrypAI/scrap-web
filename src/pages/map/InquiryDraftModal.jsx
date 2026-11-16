import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';

export function InquiryDraftModal({ company, onClose }) {
  let [n, r] = useState(`안녕하세요, (주)가천정밀입니다.

폐유(분류번호 06-01-01) 중간처리 가능 여부와 예상 처리 단가를 문의드립니다.
월평균 배출량은 약 8톤이며, 성상분석 결과를 함께 전달드릴 수 있습니다.

확인 후 회신 부탁드립니다.`),
    [i, a] = useState(false);
  return (
    <div className="handler-inquiry-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="handler-inquiry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="handler-inquiry-title"
        data-layer-name="L4-InquiryDraft"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <span>INQUIRY DRAFT</span>
            <h2 id="handler-inquiry-title">업체 문의 초안</h2>
            <p>
              {company.name}
              {' · '}
              {company.location}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>
        <div className="inquiry-body">
          <section className="inquiry-preview">
            <span>작성된 초안 미리보기</span>
            <strong>폐유 처리 가능 여부 및 예상 단가 문의</strong>
            <p>
              {company.name}
              {' 담당자님께 · 월평균 배출량 8톤 기준'}
            </p>
          </section>
          <label>
            제목
            <input type="text" defaultValue="폐유 처리 가능 여부 문의 · (주)가천정밀" />
          </label>
          <label>
            문의 내용 수정
            <textarea rows={9} value={n} onChange={(e) => r(e.target.value)} />
          </label>
          <div className="inquiry-recipient">
            <Icon name="building" size={18} />
            <span>
              <strong>수신 업체</strong>
              {company.name}
            </span>
            <span>
              <strong>허가번호</strong>
              {company.permitNo}
            </span>
          </div>
          <div className={`inquiry-approval${i ? ' is-sent' : ''}`}>
            <span>{i ? <Icon name="check" size={15} /> : '!'}</span>
            <div>
              <strong>
                {i ? '문의 발송이 완료되었어요' : '승인 전에는 업체에 발송되지 않아요'}
              </strong>
              <p>
                {i
                  ? '업체의 답변은 등록된 이메일과 알림으로 안내해 드립니다.'
                  : '초안 내용을 확인한 뒤 승인 후 발송을 눌러 주세요.'}
              </p>
            </div>
          </div>
        </div>
        <footer>
          <button className="button button-quiet" type="button" onClick={onClose}>
            닫기
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => a(true)}
            disabled={i}
          >
            {i ? '발송 완료' : '승인 후 발송'}
          </button>
        </footer>
      </section>
    </div>
  );
}
