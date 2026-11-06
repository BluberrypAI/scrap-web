import { Icon } from '../../components/Icon.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { hasConfirmedCode, statusMessages } from '../../data/wastes.js';

export function WasteCard({ waste }) {
  return (
    <a className="waste-card" href={`/wastes/${waste.id}`}>
      <div className="card-topline">
        <span className="waste-category">{waste.category}</span>
        <StatusBadge status={waste.status} />
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
        <p>{statusMessages[waste.status]}</p>
      </div>
      <footer className="card-footer">
        <span>마지막 업데이트</span>
        <time>{waste.updatedAt}</time>
        <Icon name="arrow" size={17} />
      </footer>
    </a>
  );
}
