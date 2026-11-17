import { useEffect, useState } from 'react';
import { diagnosisApi } from '../diagnosis/lib/client.js';
import { availableForms } from './fields.js';
import { LegalFormPanel } from './LegalFormPanel.jsx';

// 법정 서식 작성 페이지: /wastes/case-<문진 건 ID>/documents
// 확정한 문진 건 화면의 "서류 만들기" 버튼으로 들어온다. 판정(handoff)은 서버에서 다시 읽는다.
export function LegalFormScreen({ caseId }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let live = true;
    setState({ loading: true });
    diagnosisApi
      .getCase(caseId)
      .then((d) => live && setState({ handoff: d.handoff ?? null, status: d.case?.status }))
      .catch((e) => live && setState({ error: e.message || '문진 건을 불러오지 못했어요.' }));
    return () => {
      live = false;
    };
  }, [caseId]);

  const back = `/wastes/case-${caseId}/survey`;
  let body;
  if (state.loading) body = <p className="muted">불러오는 중…</p>;
  else if (state.error) body = <p role="alert">{state.error}</p>;
  else if (!state.handoff || availableForms(state.handoff).length === 0)
    body = (
      <div className="wd-card stack">
        <strong>만들 수 있는 서식이 없어요</strong>
        <p className="muted">문진 결과를 확정하고, 분류번호가 정해진 처리 경로 판정일 때 서식을 만들 수 있어요.</p>
      </div>
    );
  else body = <LegalFormPanel caseId={caseId} handoff={state.handoff} />;

  return (
    <main className="lf-page">
      <nav className="lf-page-nav">
        <a className="button button-quiet button-small" href={back}>← 문진 결과로 돌아가기</a>
      </nav>
      {body}
    </main>
  );
}

// 확정한 문진 건 화면에 두는 이동 버튼. 만들 수 있는 서식이 없으면 그리지 않는다
export function LegalFormLink({ caseId, handoff }) {
  if (!handoff || availableForms(handoff).length === 0) return null;
  return (
    <div className="wd-card stack">
      <strong>신고 서류 만들기</strong>
      <p className="muted">판정 결과와 회사 정보로 배출자 신고서·처리계획서·수탁확인서를 한글 파일이나 PDF로 만들어요.</p>
      <a className="button button-primary" href={`/wastes/case-${caseId}/documents`}>서류 만들기</a>
    </div>
  );
}
