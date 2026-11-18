import { useEffect, useRef, useState } from 'react';

// 손으로 서명하는 칸 (마우스·펜·터치). 투명 배경 PNG로 내보낸다. 어디에도 저장하지 않는다.
const WIDTH = 360;
const HEIGHT = 120;

// 획이 있는 부분만 잘라(여백 조금) PNG로. 빈 여백까지 보내면 서식에 서명이 작게 찍힌다
function trimmed(src) {
  const { width: w, height: h } = src;
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return src.toDataURL('image/png');
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04) + 2;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

export function SignaturePad({ onChange }) {
  const canvas = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = WIDTH * dpr;
    c.height = HEIGHT * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1d2321';
  }, []);

  const point = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * WIDTH, ((e.clientY - r.top) / r.height) * HEIGHT];
  };
  function down(e) {
    e.preventDefault();
    canvas.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const ctx = canvas.current.getContext('2d');
    const [x, y] = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y); // 점만 찍어도 보이게
    ctx.stroke();
    dirty.current = true;
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvas.current.getContext('2d');
    const [x, y] = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) {
      setEmpty(false);
      onChange(trimmed(canvas.current));
    }
  }
  function clear() {
    const c = canvas.current;
    c.getContext('2d').clearRect(0, 0, WIDTH, HEIGHT);
    dirty.current = false;
    setEmpty(true);
    onChange('');
  }

  return (
    <div className="lf-pad">
      <canvas
        ref={canvas}
        style={{ width: WIDTH, height: HEIGHT, maxWidth: '100%' }}
        aria-label="서명하는 칸. 마우스나 손가락으로 그려 주세요"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <button type="button" className="is-ghost" onClick={clear} disabled={empty}>지우기</button>
    </div>
  );
}
