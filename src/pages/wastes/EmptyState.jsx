import { Icon } from '../../components/Icon.jsx';

export function EmptyState({ onCreate }) {
  return (
    <section className="empty-state" data-layer-name="L1-Home-Empty" data-variant="empty">
      <div className="empty-illustration" aria-hidden="true">
        <Icon name="archive" size={36} />
        <span />
      </div>
      <h2>아직 등록된 폐기물이 없어요</h2>
      <p>
        폐기물을 등록하면 AI가 분류를 돕고
        <br />
        적합한 처리업체를 찾아드려요.
      </p>
      <button className="button button-primary" type="button" onClick={onCreate}>
        <Icon name="plus" size={18} />새 폐기물 문진
      </button>
    </section>
  );
}
