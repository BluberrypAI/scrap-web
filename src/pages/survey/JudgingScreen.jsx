import { Icon } from '../../components/Icon.jsx';

export function JudgingScreen() {
  return <main className="sv-judging" data-layer-name="Survey-Waiting" role="status">
    <div className="sv-wait">
      <div className="sv-wait-head">
        <span className="sv-wait-sys"><Icon name="archive" size={28} /></span>
        <h1>문진 엔진에서 필요한 질문을 불러오고 있어요</h1>
      </div>
    </div>
  </main>;
}
