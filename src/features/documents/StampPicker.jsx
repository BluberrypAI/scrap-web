import { useRef, useState } from 'react';

// 도장 이미지를 올려 흰 배경을 투명하게 만들고, 도장 부분만 잘라 PNG로 내보낸다. 어디에도 저장하지 않는다.
const MAX_SIDE = 600;
const MAX_BYTES = 200 * 1024;
const WHITE = 235;

const decodedBytes = (url) => Math.floor(((url.length - url.indexOf(',') - 1) * 3) / 4);

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 열 수 없어요')); };
    img.src = url;
  });
}

async function processStamp(file) {
  const img = await loadImage(file);
  let scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  for (let tries = 0; tries < 6; tries += 1) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        if (px[i + 3] < 8 || (px[i] > WHITE && px[i + 1] > WHITE && px[i + 2] > WHITE)) { px[i + 3] = 0; continue; }
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) throw new Error('도장이 보이지 않아요. 흰 종이에 찍은 도장 사진을 올려 주세요');
    ctx.putImageData(data, 0, 0);
    const cw = x1 - x0 + 1;
    const ch = y1 - y0 + 1;
    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    const png = out.toDataURL('image/png');
    if (decodedBytes(png) <= MAX_BYTES) return png;
    scale *= 0.7;
  }
  throw new Error('이미지가 너무 커요. 더 작은 이미지를 올려 주세요');
}

export function StampPicker({ value, onChange }) {
  const input = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try { onChange(await processStamp(file)); } catch (err) { onChange(''); setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="lf-stamp">
      <input ref={input} type="file" accept="image/png,image/jpeg" onChange={pick} aria-label="도장 이미지 고르기" />
      {busy && <p className="lf-hint">이미지를 다듬는 중…</p>}
      {error && <p className="lf-hint lf-err" role="alert">{error}</p>}
      {value && (
        <div className="lf-stamp-prev">
          <img src={value} alt="다듬은 도장 미리보기" />
          <button type="button" className="lf-mini" onClick={() => input.current?.click()}>다른 이미지</button>
          <button type="button" className="lf-mini" onClick={() => onChange('')}>지우기</button>
        </div>
      )}
      <p className="lf-hint">흰 종이에 찍은 도장 사진(PNG·JPG)을 올리면 흰 배경을 없애고 도장 부분만 남겨요.</p>
    </div>
  );
}
