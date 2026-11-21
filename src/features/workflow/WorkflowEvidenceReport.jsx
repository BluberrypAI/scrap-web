import { handoffHistoryEvents } from './history.js';
import { formatDateTime, formatKg, LOT_STATUS, OFFER_STATUS, REVIEW_FINDING, stateLabel } from './labels.js';
import { RecyclingTypes } from './RecyclingTypes.jsx';
import './WorkflowEvidenceReport.css';

const FACT_LABELS = [
  ['material', '재질'],
  ['input_form', '배출 당시 형태'],
  ['physical_state', '물리적 상태'],
  ['generation_process', '발생 공정'],
];

function factValue(fact) {
  const value = fact?.value;
  if (value == null || value === '') return null;
  return Array.isArray(value) ? value.join(', ') : String(value);
}

function SourceLink({ source }) {
  if (!source?.url || !/^https?:\/\//i.test(source.url)) return null;
  return <a href={source.url} target="_blank" rel="noopener noreferrer">
    {[source.publisher, source.locator].filter(Boolean).join(' · ') || '공개 자료 열기'}
  </a>;
}

export function WorkflowEvidenceReport({ lot }) {
  const handoff = lot.data?.handoff || {};
  const facts = FACT_LABELS.map(([key, label]) => [label, factValue(handoff.facts?.[key])]).filter(([, value]) => value);
  const events = handoffHistoryEvents(lot.data?.events);
  const offers = lot.offers || [];
  const companies = lot.companies || {};
  const diagnosisId = lot.diagnosis_id || handoff.case_id;

  return <article className="wf-report" aria-label="분류·업체 선택·인수인계 근거 보고서">
    <header className="wf-report-head">
      <div><span>SCRAP · 처리 경로 기록</span><h2>분류·업체 선택·인수인계 보고서</h2>
        <p>현재 상태 {LOT_STATUS[lot.status] || lot.status}</p></div>
      <button className="button button-primary wf-report-print" type="button" onClick={() => window.print()}>PDF로 내보내기</button>
    </header>
    <p className="wf-report-caution">이 보고서는 서비스에 저장된 문진·업체 검토·인계 기록을 정리한 자료입니다. 업체 허가나 법정 인계서의 확인을 대신하지 않습니다.</p>

    <section className="wf-report-section" aria-labelledby="wf-report-classification">
      <div className="wf-report-section-head"><span>01</span><h3 id="wf-report-classification">분류코드와 근거</h3></div>
      <dl className="wf-report-facts">
        <div><dt>최초 분류번호</dt><dd>{handoff.waste_code || '확인되지 않음'}</dd></div>
        <div><dt>최초 배출 업체</dt><dd>{companies[lot.owner_company_id] || '확인되지 않음'}</dd></div>
        {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {facts.length === 0 && <p className="wf-report-empty">분류에 사용한 문진 사실이 이 처리 건에 저장돼 있지 않습니다.</p>}
      {handoff.basis?.length > 0 ? <div className="wf-report-basis"><h4>판정에 적용된 근거 조문</h4>
        <ul>{handoff.basis.map((basis, index) => <li key={basis.id || index}><strong>{basis.ref || '조문 확인 필요'}</strong>
          {basis.excerpt && <p>{basis.excerpt}</p>}</li>)}</ul>
      </div> : <p className="wf-report-empty">이 처리 건에 저장된 분류 근거 조문은 없습니다. 판정 기록을 확인해 주세요.</p>}
      {handoff.evidence?.length > 0 && <p className="wf-report-footnote">문진 근거 자료: {handoff.evidence.map((item) => item.document_id).filter(Boolean).join(', ')}</p>}
      {diagnosisId && <a href={`/wastes/case-${diagnosisId}/history`}>분류 판정 기록 보기</a>}
      {lot.data?.recycling && <div className="wf-report-recycling"><RecyclingTypes assessment={lot.data.recycling} compact /></div>}
    </section>

    <section className="wf-report-section" aria-labelledby="wf-report-facilities">
      <div className="wf-report-section-head"><span>02</span><h3 id="wf-report-facilities">각 업체 선택 근거</h3></div>
      {offers.length === 0 ? <p className="wf-report-empty">아직 인수를 요청한 업체가 없습니다.</p> :
        <ol className="wf-report-offers">{offers.map((offer, index) => {
          const facility = offer.data?.facility || {};
          const review = offer.data?.ai_review || {};
          const sources = [review.process_source, review.source, ...(facility.sources || [])]
            .filter((source) => source?.url && /^https?:\/\//i.test(source.url));
          const uniqueSources = sources.filter((source, i) => sources.findIndex((item) => item.url === source.url && item.locator === source.locator) === i);
          return <li key={offer.id || index}>
            <header><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{facility.label || companies[offer.recipient_id] || '업체명 확인 필요'}</h4>
              <p>{companies[offer.sender_id] || '발송 업체'} → {companies[offer.recipient_id] || '수신 업체'} · {OFFER_STATUS[offer.status] || offer.status}</p></div></header>
            <dl className="wf-report-facts">
              <div><dt>선택한 공정</dt><dd>{offer.data?.option?.label || '기록 없음'}</dd></div>
              <div><dt>보낸 물량</dt><dd>{offer.data?.current ? `${stateLabel(lot, offer.data.current.state_key)} · ${formatKg(offer.data.current.mass_kg)}` : '기록 없음'}</dd></div>
              <div><dt>AI 검토 결과</dt><dd>{review.process_match === 'matched' ? '취급 소재 일치' : review.process_match === 'mismatch' ? '공정 불일치' : REVIEW_FINDING[review.finding] || '기록 없음'}</dd></div>
              <div><dt>업체 인수 결정</dt><dd>{OFFER_STATUS[offer.status] || offer.status}</dd></div>
            </dl>
            {(review.process_quote || review.quote) && <blockquote><span>AI 검토에 인용된 내용</span>{review.process_quote || review.quote}</blockquote>}
            {uniqueSources.length > 0 && <div className="wf-report-sources"><strong>공개 자료</strong>{uniqueSources.map((source, i) => <SourceLink key={`${source.url}-${i}`} source={source} />)}</div>}
            {uniqueSources.length === 0 && <p className="wf-report-empty">저장된 공개 근거 링크 없음</p>}
          </li>;
        })}</ol>}
      <p className="wf-report-footnote">AI 검토는 공개 자료와 입력한 물량의 대조 결과입니다. 실제 인수 여부는 수신 업체의 결정 기록을 확인해 주세요.</p>
    </section>

    <section className="wf-report-section" aria-labelledby="wf-report-handoff">
      <div className="wf-report-section-head"><span>03</span><h3 id="wf-report-handoff">인수인계·처리 기록</h3></div>
      {lot.data?.completed?.length > 0 && <div className="wf-report-completed"><h4>기록된 처리 결과</h4>
        {lot.data.completed.map((step, index) => <p key={step.offer_id || index}>
          <strong>{step.facility || companies[step.company_id] || '처리 업체'}</strong>
          {step.output && ` · ${stateLabel(lot, step.output.state_key)} ${formatKg(step.output.mass_kg)}`}
          {step.output?.evidence && ` · 근거 ${step.output.evidence}`}
        </p>)}
      </div>}
      {events.length === 0 ? <p className="wf-report-empty">기록된 인수인계가 없습니다.</p> :
        <ol className="wf-report-events">{events.map((event, index) => <li key={`${event.at}-${event.action}-${index}`}>
          <time dateTime={event.at}>{formatDateTime(event.at)}</time>
          <strong>{event.action}</strong>
          <span>{companies[event.company_id] || '업체 확인 필요'}{event.facility && ` · ${event.facility}`}</span>
          {(event.note || event.reference || event.intended_use) && <p>
            {[event.note, event.reference && `근거 ${event.reference}`, event.intended_use && `용도 ${event.intended_use}`].filter(Boolean).join(' · ')}
          </p>}
        </li>)}</ol>}
    </section>
  </article>;
}
