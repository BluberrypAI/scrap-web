import { Icon } from '../../components/Icon.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { progressSteps, stageIndex, statusMessages } from '../../data/wastes.js';
import { scrapTreatment } from '../../features/treatment/index.js';

export function WasteCard({ waste }) {
  let t = stageIndex(waste.status);
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
          {waste.code}
        </p>
      </div>
      <div className="card-progress" aria-label={`진행 단계 ${t + 1}/${progressSteps.length}`}>
        <ol>
          {progressSteps.map((e, n) => (
            <li className={n < t ? 'is-done' : n === t ? 'is-current' : ''} key={e}>
              <span />
              <small>{e}</small>
            </li>
          ))}
        </ol>
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
