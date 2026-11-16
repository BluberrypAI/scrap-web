// 문진 화면 진입점. scrap-diagnosis 참조 화면(web/)의 문진·기록 화면을 scrap-web 경로에 붙인다.
//  - /wastes/case-<엔진 건 ID>/survey  → 문진(베리 | 채팅 | 판정 보드)
//  - /wastes/case-<엔진 건 ID>/history → 판정 기록·다시 열기
import { useEffect, useState } from 'react';
import './diagnosis.css';
import { diagnosisApi } from './lib/client.js';
import DiagnosisChatPage from './pages/DiagnosisChatPage.jsx';
import DiagnosisHistoryPage from './pages/DiagnosisHistoryPage.jsx';

export { diagnosisApi };

// 질문 항목 이름·단위(카탈로그)를 한 번 불러 둔다. 못 불러와도 화면은 서버가 준 라벨로 그린다
let catalogLoad = null;
function useCatalog() {
  const [ready, setReady] = useState(catalogLoad === 'done');
  useEffect(() => {
    if (ready) return undefined;
    let live = true;
    catalogLoad ??= diagnosisApi.catalogFacts().finally(() => {
      catalogLoad = 'done';
    });
    Promise.resolve(catalogLoad).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [ready]);
  return ready;
}

// 확정 뒤: 처리 경로 화면(문진 연계 공정·업체 후보, PP는 기업 간 인계)으로 넘어간다
function RoutePrep({ id, handoff }) {
  const guide = handoff?.route_guidance;
  return (
    <div className="wd-card stack">
      <strong>다음 단계: 처리 경로</strong>
      {guide?.summary && <p className="muted">{guide.summary}</p>}
      <a className="button button-primary" href={`/wastes/case-${id}`}>
        처리 경로 보기
      </a>
    </div>
  );
}

export function DiagnosisCaseScreen({ caseId }) {
  const ready = useCatalog();
  return (
    <main className="dx dx-screen">
      {ready ? (
        <DiagnosisChatPage
          key={caseId}
          id={caseId}
          afterConfirm={({ id, handoff }) => <RoutePrep id={id} handoff={handoff} />}
        />
      ) : (
        <p className="muted">불러오는 중…</p>
      )}
    </main>
  );
}

export function DiagnosisHistoryScreen({ caseId }) {
  const ready = useCatalog();
  return (
    <main className="dx dx-screen">
      {ready ? <DiagnosisHistoryPage key={caseId} id={caseId} /> : <p className="muted">불러오는 중…</p>}
    </main>
  );
}
