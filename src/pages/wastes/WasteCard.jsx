import { Icon } from '../../components/Icon.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { hasConfirmedCode, statusMessages } from '../../data/wastes.js';
import { scrapTreatment } from '../../features/treatment/index.js';

export function WasteCard({ waste }) {
  return (
    <article className="waste-card-entry">
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
        {/* QR 인계가 시작되면 상태 문구 대신 인계 진행 막대를 보여준다 */}
        <scrapTreatment.LotProgress id={waste.id} fallback={statusMessages[waste.status]} />
      </div>
      <footer className="card-footer">
        <span>마지막 업데이트</span>
        <time>{waste.updatedAt}</time>
        <Icon name="arrow" size={17} />
      </footer>
    </a>
    <a className="waste-card-transport" href={`/wastes/${waste.id}?tab=transport`}
      aria-label={`${waste.name} 운송 탭`}>운송 · QR <Icon name="arrow" size={15} /></a>
    </article>
  );
}
