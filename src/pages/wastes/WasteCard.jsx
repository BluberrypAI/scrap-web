import { Icon } from '../../components/Icon.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { hasConfirmedCode, wasteStatusMessage } from '../../data/wastes.js';

export function WasteCard({ waste, isNew = false }) {
  return (
    <a
      className={`waste-card${isNew ? ' is-new' : ''}`}
      href={`/wastes/${waste.id}`}
      aria-label={isNew ? `${waste.name}, 새로 생성된 진행 카드, 처리경로 확인` : undefined}
    >
      <div className="card-topline">
        <span className="waste-category">{waste.category}</span>
        <div className="waste-card-badges">
          {isNew && <span className="waste-new-badge">새로 생성됨</span>}
          <StatusBadge status={waste.routePhase === 'transporting' ? '운송 중'
            : waste.routePhase === 'processing' ? '처리 중' : waste.status} />
        </div>
      </div>
      <div className="card-content">
        <h3>{waste.name}</h3>
        <p>
          {'분류번호 '}
          {hasConfirmedCode(waste) ? waste.code : '미정'}
        </p>
      </div>
      <div className="card-status-line">
        <span aria-hidden="true" />
        <p>{wasteStatusMessage(waste)}</p>
      </div>
      <footer className="card-footer">
        <span>{isNew ? '카드를 눌러 처리경로 확인' : '마지막 업데이트'}</span>
        {!isNew && <time>{waste.updatedAt}</time>}
        <Icon name="arrow" size={17} />
      </footer>
    </a>
  );
}
