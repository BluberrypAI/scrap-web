export function WorkBar({ waste, saveState, onExit }) {
  return (
    <header className="l3-workbar" data-layer-name="L3-WorkBar">
      <button type="button" onClick={onExit}>
        <span>←</span>나가기
      </button>
      <strong>{waste.name}</strong>
      <span className={saveState === 'saving' ? 'is-saving' : ''}>
        {{ saving: '저장 중…', saved: '자동 저장됨', creating: '문진 준비 중…', draft: '문진 시작 전 · 미저장' }[saveState] || '자동 저장됨'}
      </span>
    </header>
  );
}
