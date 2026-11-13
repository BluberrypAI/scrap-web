// 날짜·값 표시

/** ISO 8601(+09:00) → "11월 8일 21:59" */
export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** "2026-11-08" → "2026년 11월 8일" */
export function formatDate(s) {
  if (!s) return '';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : String(s);
}

/** 상대 시각: "방금", "3분 전", "어제" … */
export function formatRelative(iso, now = Date.now()) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.round((now - t) / 1000);
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 172800) return '어제';
  return formatDateTime(iso);
}

/** NumRange dict({lo, lo_inc, hi, hi_inc}) → "2 이하" 같은 문장 */
export function formatRange(r, unit = '') {
  if (!r || typeof r !== 'object') return String(r ?? '');
  const u = unit || '';
  const lo = r.lo ?? null;
  const hi = r.hi ?? null;
  if (lo !== null && hi !== null) return `${lo}${u} ${r.lo_inc ? '이상' : '초과'} ${hi}${u} ${r.hi_inc ? '이하' : '미만'}`;
  if (hi !== null) return `${hi}${u} ${r.hi_inc ? '이하' : '미만'}`;
  if (lo !== null) return `${lo}${u} ${r.lo_inc ? '이상' : '초과'}`;
  return '범위 모름';
}

/** 사실 값을 라벨 없이 보여 줄 때 */
export function formatValue(v, unit = '') {
  if (v === true) return '예';
  if (v === false) return '아니오';
  if (v === null || v === undefined) return '모름';
  if (typeof v === 'number') return `${v}${unit || ''}`;
  if (typeof v === 'object' && ('lo' in v || 'hi' in v)) return formatRange(v, unit);
  return String(v);
}

/** 조사 '을/를' */
export function objParticle(word) {
  const s = String(word || '').replace(/[)\]'"’”]+$/, '');
  const ch = s.charCodeAt(s.length - 1);
  if (ch >= 0xac00 && ch <= 0xd7a3) return (ch - 0xac00) % 28 ? '을' : '를';
  return '을(를)';
}
