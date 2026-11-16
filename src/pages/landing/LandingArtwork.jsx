import { useRef, useState } from 'react';

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

export function LandingArtwork() {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  const handlePointerMove = (event) => {
    if (drag.current) {
      setRotation({
        x: clamp(drag.current.x - (event.clientY - drag.current.pointerY) * 0.25, 30),
        y: clamp(drag.current.y + (event.clientX - drag.current.pointerX) * 0.25, 30),
      });
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setRotation({
      x: clamp(((bounds.top + bounds.height / 2 - event.clientY) / bounds.height) * 24, 12),
      y: clamp(((event.clientX - bounds.left - bounds.width / 2) / bounds.width) * 24, 12),
    });
  };

  const handlePointerDown = (event) => {
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: rotation.x,
      y: rotation.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="landing-artwork" data-layer-name="SCRAP-Compass">
      <div
        className="landing-compass"
        role="img"
        tabIndex={0}
        aria-label="SCRAP 나침반 로고. 마우스로 드래그하거나 방향키로 기울일 수 있습니다."
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          if (!drag.current) setRotation({ x: 0, y: 0 });
        }}
        onKeyDown={(event) => {
          const movement = {
            ArrowUp: { x: 5, y: 0 },
            ArrowDown: { x: -5, y: 0 },
            ArrowLeft: { x: 0, y: -5 },
            ArrowRight: { x: 0, y: 5 },
          }[event.key];
          if (movement) {
            event.preventDefault();
            setRotation((current) => ({
              x: clamp(current.x + movement.x, 30),
              y: clamp(current.y + movement.y, 30),
            }));
          } else if (event.key === 'Escape') {
            setRotation({ x: 0, y: 0 });
          }
        }}
        style={{ transform: `perspective(900px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        <img src="/images/scrap-compass-3d.png" alt="" draggable="false" />
      </div>
    </div>
  );
}
