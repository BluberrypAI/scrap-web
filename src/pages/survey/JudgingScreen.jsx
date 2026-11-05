import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { judgingSteps } from './surveyData.js';

export function JudgingScreen({ onDone, onBerry }) {
  let [n, r] = useState(0);
  useEffect(() => {
    if (n >= judgingSteps.length) {
      let t = window.setTimeout(onDone, 500);
      return () => window.clearTimeout(t);
    }
    let t = window.setTimeout(() => r((e) => e + 1), 1500);
    return () => window.clearTimeout(t);
  }, [n, onDone]);
  let i = judgingSteps[Math.min(n, judgingSteps.length - 1)];
  return (
    useEffect(() => {
      onBerry(i.voice === 'ai' && n < judgingSteps.length ? i.text : null);
    }, [n, i, onBerry]),
    (
      <main className="sv-judging" data-layer-name="Survey-Waiting">
        <div className="sv-wait">
          <div className="sv-wait-head">
            <span className="sv-wait-sys">
              <Icon name="archive" size={28} />
            </span>
            <h1>{i.voice === 'system' ? i.text : '입력 내용을 검토하고 있습니다'}</h1>
          </div>
          <ol className="sv-wait-list" aria-label="진행 상황">
            {judgingSteps.map((e, t) => (
              <li className={t < n ? 'is-done' : t === n ? 'is-active' : ''} key={e.text}>
                <span className="sv-wait-dot">{t < n && <Icon name="check" size={12} />}</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ol>
          <button className="sv-demo-skip" type="button" onClick={onDone}>
            바로 결과 보기 (데모)
            <Icon name="arrow" size={14} />
          </button>
        </div>
      </main>
    )
  );
}
