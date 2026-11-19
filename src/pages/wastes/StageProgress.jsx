import './WastesPage.css';

export const journeyStages = [
  { id: 'classification', number: '01', label: '폐기물 분류' },
  { id: 'route', number: '02', label: '업체 연결' },
  { id: 'treatment', number: '03', label: '처리 추적' },
];

export function StageProgress({ current = null }) {
  return (
    <nav className="header-stage-progress" aria-label="자원 경로 진행 단계">
      {journeyStages.map((stage) => {
        return (
          <a
            key={stage.id}
            href="/wastes"
            className={`header-stage-item${current === stage.id ? ' is-active' : ''}`}
            data-stage={stage.number}
            aria-current={current === stage.id ? 'step' : undefined}
          >
            <span className="header-stage-number">{stage.number}</span>
            <span className="header-stage-name">{stage.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
