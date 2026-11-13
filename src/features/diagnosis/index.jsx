// 문진 화면 진입점. scrap-diagnosis 참조 화면(web/)의 문진·기록 화면을 scrap-web 경로에 붙인다.
//  - /wastes/case-<엔진 건 ID>/survey  → 문진(베리 | 채팅 | 판정 보드)
//  - /wastes/case-<엔진 건 ID>/history → 판정 기록·다시 열기
import { useEffect, useState } from 'react';
import { scrapTreatment } from '../treatment/index.js';
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

// 처리 경로 데모는 폐합성수지(51-03-*)만 다룬다
const ROUTE_READY = /^51-03-/;

// 확정 뒤: 재질·형태를 받아 처리 경로 카드를 만든다
function RoutePrep({ id, result }) {
  const [input, setInput] = useState(null);
  if (!result?.code || !ROUTE_READY.test(result.code)) {
    return (
      <div className="wd-card">
        <p>이 분류의 처리 경로 안내는 아직 준비 중이에요.</p>
        <a className="button button-quiet" href="/wastes">
          목록으로
        </a>
      </div>
    );
  }
  return (
    <div className="wd-card stack">
      <strong>다음 단계: 처리 경로 준비</strong>
      {input ? (
        <scrapTreatment.Confirm id={`case-${id}`} input={{ ...input, waste_code: result.code }} />
      ) : (
        <scrapTreatment.SurveyMaterial onAnswer={setInput} />
      )}
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
          afterConfirm={({ id, result }) => <RoutePrep id={id} result={result} />}
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
