import { Icon } from './Icon.jsx';

export function StatusBadge({ status }) {
  const isAnalysis = status === '분석 대기';
  const isComplete = ['완료', '처리 완료', '재활용 완료'].includes(status);
  return (
    <span
      className={`status-badge${isAnalysis ? ' is-analysis' : ''}${isComplete ? ' is-complete' : ''}`}
      data-variant={status}
    >
      {isComplete && <Icon name="check" size={14} />}
      {status}
    </span>
  );
}
