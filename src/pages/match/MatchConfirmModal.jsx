import { Icon } from '../../components/Icon.jsx';
import { matchCompanies } from './MatchPage.jsx';

export function MatchConfirmModal({ waste, companyIndex, onCancel }) {
  let r = matchCompanies[companyIndex];
  return (
    <div className="match-confirm-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="match-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="match-confirm-icon">
          <Icon name="building" size={23} />
        </span>
        <h2 id="match-confirm-title">{r.name}으로 진행할까요?</h2>
        <p>
          선택한 업체가 처리 단계 2의 중간처리 업체로 등록됩니다.
          <br />
          확정 후에도 처리경로 탭에서 변경할 수 있어요.
        </p>
        <div>
          <button className="button button-quiet" type="button" onClick={onCancel}>
            취소
          </button>
          <a className="button button-primary" href={`/wastes/${waste.id}?tab=처리경로`}>
            확정
          </a>
        </div>
      </section>
    </div>
  );
}
