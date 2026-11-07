import { Icon } from '../../components/Icon.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import {
  hasConfirmedCode,
  wasteDisplayStatus,
  wasteStatusMessage,
} from '../../data/wastes.js';

export function WasteCard({ waste, step, isNew = false }) {
  const displayStatus = wasteDisplayStatus(waste);
  return (
    <a
      className={`waste-card${isNew ? ' is-new' : ''}`}
      href={`/wastes/${waste.id}`}
      data-step={step}
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
        <Icon name="arrow" size={17} />
      </footer>
    </a>
  );
}
