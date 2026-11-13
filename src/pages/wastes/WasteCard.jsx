import { useState } from 'react';
import { WasteJourneyPreview } from './WasteJourneyPreview.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import {
  hasConfirmedCode,
  wasteDisplayStatus,
  wasteStatusMessage,
} from '../../data/wastes.js';

export function WasteCard({ waste, step, isNew = false }) {
  const [flipped, setFlipped] = useState(false);
  const displayStatus = wasteDisplayStatus(waste);
  return (
    <article className={`waste-flip-card${flipped ? ' is-flipped' : ''}`}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setFlipped(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setFlipped(false); }}
      onKeyDown={(event) => { if (event.key === 'Escape') setFlipped(false); }}
    >
      <div className="waste-flip-inner">
        <a
          className={`waste-card waste-card-front${isNew ? ' is-new' : ''}`}
          href={`/wastes/${waste.id}`}
          data-step={step}
          inert={flipped}
          aria-hidden={flipped}
          aria-label={`${waste.name}, 현재 상태 ${displayStatus}`}
        >
          <div className="card-topline">
            <span className="waste-card-step">STEP {step}</span>
            <div className="waste-card-badges">
              {isNew && <span className="waste-new-badge">새로 생성됨</span>}
              <span className="waste-category">{waste.category}</span>
            </div>
          </div>
          <div className="card-content">
            <span className="waste-card-label">폐기물</span>
            <h3>{waste.name}</h3>
            <p>
              {'분류번호 '}
              {hasConfirmedCode(waste) ? waste.code : '미정'}
            </p>
          </div>
          <div className="waste-card-state">
            <div>
              <span>현재 상태</span>
              <StatusBadge status={displayStatus} />
            </div>
            <p>{wasteStatusMessage(waste)}</p>
          </div>
          <footer className="card-footer">
            <span>마지막 업데이트</span>
            <time>{waste.updatedAt}</time>
          </footer>
        </a>
        <a className="waste-card-back" href={`/wastes/${waste.id}${waste.status === '문진 중' ? '/survey' : '?tab=route'}`}
          data-step={step}
          inert={!flipped} aria-hidden={!flipped}
          aria-label={`${waste.name}, ${displayStatus}, ${wasteStatusMessage(waste)}`}
        >
          <WasteJourneyPreview waste={waste} active={flipped} />
        </a>
      </div>
      <button className="waste-flip-toggle" type="button" aria-pressed={flipped}
        aria-label={`${waste.name} 진행 보기`} onClick={() => setFlipped(!flipped)}>
        {flipped ? '↶ 정보 보기' : '↻ 진행 보기'}
      </button>
    </article>
  );
}
