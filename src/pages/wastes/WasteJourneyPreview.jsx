import { lazy, Suspense } from 'react';
import berry from '../../assets/berry.png';
import { hasConfirmedCode, wasteStatusMessage } from '../../data/wastes.js';
import { getTreatmentCase } from '../../features/treatment/treatment-state.js';
import { readFieldChecks } from '../../features/tracking/field-checks.js';
import { wasteJourneyState } from './waste-journey-state.js';

const JourneyScene = lazy(() => import('./WasteJourneyScene.jsx'));
const messages = {
  '문진 중': '문진을 마저 진행해 주세요!',
  후보: '분류 후보를 함께 확인해요.',
  '분석 대기': '분석 결과를 기다리고 있어요.',
  확정: '처리업체의 확인을 기다리고 있어요.',
  완료: '자원의 다음 여정을 마쳤어요!',
};

export function WasteJourneyPreview({ waste, active }) {
  const berryOnly = !hasConfirmedCode(waste);
  const journey = wasteJourneyState(waste, getTreatmentCase(waste), readFieldChecks(waste.id));
  const message = messages[waste.status] || wasteStatusMessage(waste);
  return <>
    <header className="waste-journey-heading">
      <span>분류 코드 {hasConfirmedCode(waste) ? waste.code : '미정'}</span>
      <strong>{waste.name}</strong>
    </header>
    <div className={`waste-journey-map${berryOnly ? ' is-berry-only' : ''}${waste.status === '문진 중' ? ' is-survey' : ''}`}>
      {active && <Suspense fallback={<span className="waste-journey-loading">풍경을 불러오는 중…</span>}>
        <JourneyScene journey={journey} />
      </Suspense>}
      <div className="waste-journey-guide">
        <img src={berry} alt="" />
        <p>{message}</p>
      </div>
    </div>
  </>;
}
