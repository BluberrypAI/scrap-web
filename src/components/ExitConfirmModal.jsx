import { Icon } from './Icon.jsx';

export function ExitConfirmModal({ waste, onContinue }) {
  return (
    <div className="l3-exit-backdrop" role="presentation" onMouseDown={onContinue}>
      <section
        className="l3-exit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-confirm-title"
        data-layer-name="L3-ExitConfirm"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="exit-save-icon">
          <Icon name="check" size={22} />
        </div>
        <h2 id="exit-confirm-title">지금까지 답변은 저장돼 있어요</h2>
        <p>문진을 나가도 저장된 지점부터 다시 시작할 수 있습니다.</p>
        <div>
          <button className="button button-quiet" type="button" onClick={onContinue}>
            계속 작성하기
          </button>
          <a className="button button-primary" href={`/wastes/${waste.id}`}>
            저장하고 나가기
          </a>
        </div>
      </section>
    </div>
  );
}
