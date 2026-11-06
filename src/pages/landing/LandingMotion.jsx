import { useEffect, useRef, useState } from 'react';

export function Reveal({ as: Element = 'div', children, className = '', delay = 0 }) {
  const elementRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.08 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Element
      ref={elementRef}
      className={`landing-reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </Element>
  );
}

export function MagnetLink({ children, className, href }) {
  const zoneRef = useRef(null);
  const linkRef = useRef(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reducedMotion.matches) return undefined;

    const updatePosition = (event) => {
      const zone = zoneRef.current;
      const link = linkRef.current;
      if (!zone || !link) return;

      const bounds = zone.getBoundingClientRect();
      const deltaX = event.clientX - (bounds.left + bounds.width / 2);
      const deltaY = event.clientY - (bounds.top + bounds.height / 2);
      const nearby = Math.hypot(deltaX, deltaY) < 130;
      const x = nearby ? Math.max(-12, Math.min(12, deltaX * 0.12)) : 0;
      const y = nearby ? Math.max(-10, Math.min(10, deltaY * 0.12)) : 0;

      link.style.setProperty('--magnet-x', `${x}px`);
      link.style.setProperty('--magnet-y', `${y}px`);
    };

    window.addEventListener('pointermove', updatePosition, { passive: true });
    return () => window.removeEventListener('pointermove', updatePosition);
  }, []);

  return (
    <span className="landing-magnet-zone" ref={zoneRef}>
      <a className={`${className} landing-magnet`} href={href} ref={linkRef}>
        {children}
      </a>
    </span>
  );
}
