import berryAvatar from '../../assets/berry.png';

export function BerryDock({ message }) {
  return (
    <div
      className="berry-dock"
      data-speaking={message ? 'true' : 'false'}
      data-layer-name="Agent-Berry"
    >
      <img src={berryAvatar} alt="에이전트 베리" />
      {message && (
        <p className="berry-bubble" role="status">
          <b>베리</b>
          {message}
        </p>
      )}
    </div>
  );
}
