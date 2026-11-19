import './thinking-orb.css';

/** Original canvas animation inspired by the dotted-sphere Thinking Orbs reference.
 * Animation is decorative; setCopy displays real server progress without restarting it.
 */
export function createThinkingOrb(container) {
  const make = (tag, text, parent, className) => {
    const element = document.createElement(tag); if (text) element.textContent = text;
    if (className) element.className = className; parent.append(element); return element;
  };
  const card = make('div', '', container, 'thinking-card');
  const eyebrow = make('p', 'SCRAP IS THINKING', card, 'thinking-eyebrow');
  eyebrow.setAttribute('aria-hidden', 'true');
  const canvas = make('canvas', '', card, 'thinking-canvas'); canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  const size = 236, ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = size * ratio; canvas.height = size * ratio;
  const title = make('h2', '', card, 'thinking-title');
  const description = make('p', '', card, 'thinking-description');
  const promptText = make('blockquote', '', card, 'thinking-prompt');
  const footer = make('div', '', card, 'thinking-footer'); footer.setAttribute('aria-hidden', 'true');
  make('i', '', footer, 'thinking-live'); make('span', '응답을 기다리는 중', footer);
  const clock = make('time', '00:00', footer);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, paused = false, disposed = false, frame = null, timer = null;
  let started = 0, elapsed = 0, lastFrame = 0;

  function draw(time) {
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2 - 2;
    const aura = context.createRadialGradient(cx, cy, 8, cx, cy, 105);
    aura.addColorStop(0, '#ffffffaa'); aura.addColorStop(.7, '#e9ddfa55'); aura.addColorStop(1, '#e9ddfa00');
    context.fillStyle = aura; context.fillRect(0, 0, size, size);
    const dots = [], radius = 70 * (1 + .018 * Math.sin(time * 1.3));
    const turn = time * .24, tilt = -.31;
    function point(x, y, z, color, strength, base = 1) {
      const rx = x * Math.cos(turn) + z * Math.sin(turn);
      const rz = -x * Math.sin(turn) + z * Math.cos(turn);
      const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
      const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
      const perspective = 350 / (350 - depth);
      dots.push({ x: cx + rx * perspective, y: cy + ry * perspective, z: depth, color,
        radius: base * (.78 + (depth + 90) / 170) * perspective, alpha: strength * (.28 + .72 * (depth + 100) / 200) });
    }
    for (let band = 0; band < 16; band++) {
      const latitude = -Math.PI / 2 + (band + .5) * Math.PI / 16;
      const count = Math.round(66 * Math.cos(latitude)) + 6;
      for (let index = 0; index < count; index++) {
        const angle = index / count * Math.PI * 2 + (band % 2 ? .04 : 0);
        const ripple = 1 + .024 * Math.sin(angle * 3 + band * .6 - time * 1.6);
        const scan = .65 + .35 * Math.pow(Math.max(0, Math.cos(angle - time * .9)), 6);
        point(Math.cos(latitude) * Math.cos(angle) * radius * ripple,
          Math.sin(latitude) * radius, Math.cos(latitude) * Math.sin(angle) * radius * ripple,
          '#7053b7', scan, .92);
      }
    }
    const colors = ['#7053b7', '#9b7de0', '#b9a5ed', '#5e43a2'];
    for (let orbit = 0; orbit < 4; orbit++) {
      const lean = .65 + orbit * Math.PI / 3, direction = orbit % 2 ? -1 : 1;
      for (let index = 0; index < 72; index++) {
        const angle = index / 72 * Math.PI * 2;
        const trail = (angle - time * direction * .8 - orbit * 1.7 + 50 * Math.PI) % (2 * Math.PI);
        const orbitRadius = radius * 1.19;
        point(Math.cos(angle) * orbitRadius, Math.sin(angle) * Math.sin(lean) * orbitRadius,
          Math.sin(angle) * Math.cos(lean) * orbitRadius, colors[orbit], .15 + .78 * Math.exp(-trail * 1.6), trail < .24 ? 1.4 : .65);
      }
    }
    dots.sort((a, b) => a.z - b.z).forEach(dot => {
      context.globalAlpha = Math.min(1, Math.max(0, dot.alpha)); context.fillStyle = dot.color;
      context.beginPath(); context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2); context.fill();
    });
    context.globalAlpha = 1;
  }
  function stop() { if (frame !== null) cancelAnimationFrame(frame); frame = null; }
  function animate(now) {
    frame = null;
    if (!visible || disposed || paused || motion.matches || document.hidden) return;
    elapsed += Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
    draw(elapsed); frame = requestAnimationFrame(animate);
  }
  function resume() {
    stop(); if (!visible || disposed) return;
    draw(elapsed);
    if (!paused && !motion.matches && !document.hidden) { lastFrame = performance.now(); frame = requestAnimationFrame(animate); }
  }
  function updateClock() {
    const seconds = Math.floor((performance.now() - started) / 1000);
    clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  document.addEventListener('visibilitychange', resume); motion.addEventListener('change', resume);
  return {
    show({ kind = 'evidence', prompt = '', startedAt = null } = {}) {
      if (disposed) return;
      const copy = {
        solar: ['안건을 살펴보고 있어요.', '수집 근거를 바탕으로 전문가 검토와 반박 응답을 기다리고 있어요.'],
        evidence: ['근거를 살펴보고 있어요.', '수집한 자료와 적용 조건을 대조하고 있어요.'],
        case: ['조건을 다시 살펴보고 있어요.', '이번 로트의 수취 규격과 견적을 대조하고 있어요.'],
      }[kind];
      title.textContent = copy[0]; description.textContent = copy[1]; promptText.textContent = prompt;
      promptText.hidden = !prompt; visible = true; container.hidden = false; container.dataset.kind = kind;
      const previous = startedAt ? Date.now() - Date.parse(startedAt) : 0;
      started = performance.now() - (Number.isFinite(previous) ? Math.max(0, previous) : 0);
      elapsed = .4; updateClock(); clearInterval(timer); timer = setInterval(updateClock, 1000); resume();
    },
    setCopy({ title: heading, description: detail }) { title.textContent = heading; description.textContent = detail; },
    hide() { visible = false; stop(); clearInterval(timer); timer = null; container.hidden = true; },
    setPaused(value) { paused = value; resume(); },
    dispose() {
      disposed = true; visible = false; stop(); clearInterval(timer);
      document.removeEventListener('visibilitychange', resume); motion.removeEventListener('change', resume); container.replaceChildren();
    },
  };
}
