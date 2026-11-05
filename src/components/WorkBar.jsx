export function WorkBar({ waste, saveState, onExit }) {
  return (
    <header className="l3-workbar" data-layer-name="L3-WorkBar">
      <button type="button" onClick={onExit}>
        <span>←</span>나가기
      </button>
      <strong>{waste.name}</strong>
      <span className={saveState === 'saving' ? 'is-saving' : ''}>
        {saveState === 'saving' ? '저장 중...' : '자동 저장됨'}
      </span>
    </header>
  );
}
