import berryAvatar from '../../assets/berry.png';
import { Icon } from '../../components/Icon.jsx';

export function AgentNote({ mode, text }) {
  return mode === 'idle' ? (
    <div className="sv-agent" data-mode="idle" />
  ) : (
    <div className="sv-agent" data-mode={mode} aria-live="polite">
      {mode === 'ai' ? (
        <>
          <img className="sv-agent-avatar" src={berryAvatar} alt="" data-layer-name="Agent-Berry" />
          <p>
            <b>베리</b>
            {text}
          </p>
        </>
      ) : (
        <>
          <span className="sv-agent-lookup">
            <Icon name="archive" size={16} />
          </span>
          <p>{text}</p>
        </>
      )}
    </div>
  );
}
