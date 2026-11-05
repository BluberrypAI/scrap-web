import { Icon } from './Icon.jsx';

export function StatusBadge({ status }) {
  let t = status === '분석 대기',
    n = status === '완료';
  return (
    <span
      className={`status-badge${t ? ' is-analysis' : ''}${n ? ' is-complete' : ''}`}
      data-variant={status}
    >
      {t && <Icon name="clock" size={14} />}
      {n && <Icon name="check" size={14} />}
      {status}
    </span>
  );
}
