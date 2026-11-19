// 미리보기: 빈 서식 그림 위에 겹쳐 그릴 항목을 만든다 (화면 없이 계산만 하는 순수 함수).
// layout: public/legal-forms/{kind}.json  {page:[W,H], slots, groups}
// edits: 서버 preview의 edits[]  위치 단위는 pt → 쪽 너비/높이 대비 %로 바꾼다.
// signature: 그린 서명 또는 도장 PNG(data URL), markType: 'signature'|'seal'. 있을 때만 op:'sign' 자리에 그림을 올린다
// 반환 항목: {key, cls: 'tick'|'set'|'append'|'at'|'line'|'sign', text, size, style, align?, parts?, src?}
//   size는 쪽 너비 대비 cqw, parts는 line에서 [{text, value, size?}] (value=true이면 넣은 값, 파란 글씨, size는 뒤에 붙는 글자 크기)
const pct = (v, of) => `${(v / of) * 100}%`;
const START = '\u0001';
const END = '\u0002';

export function overlayItems(layout, edits, signature, markType = 'signature') {
  if (!layout?.page) return [];
  const [W, H] = layout.page;
  const { slots = {}, groups = {} } = layout;
  const cqw = (size) => (size / W) * 100;
  const out = [];
  const lines = {};
  for (const [i, e] of (edits || []).entries()) {
    const p = slots[e.slot];
    if (!p) continue;
    if (p.group) { (lines[p.group] ??= []).push(e); continue; }
    const [bx0, by0, bx1, by1] = p.box;
    // 서명 자리: 서명·도장 그림이 있을 때만, 칸 가운데에 실제 파일(PDF)과 같은 크기로.
    // 서명 높이 1cm(폭 최대 4cm), 도장 1.6cm(폭 최대 2cm). 그림 비율은 그대로 둔다
    if (e.op === 'sign' || p.sign) {
      if (e.op !== 'sign' || !signature) continue;
      const PT_PER_CM = 72 / 2.54;
      const [hCm, wMaxCm] = markType === 'seal' ? [1.6, 2] : [1, 4];
      out.push({
        key: `${e.slot}:${i}`, cls: 'sign', text: '', src: signature, size: 0,
        style: {
          left: pct((bx0 + bx1) / 2, W), top: pct((by0 + by1) / 2, H),
          height: pct(hCm * PT_PER_CM, H), maxWidth: pct(wMaxCm * PT_PER_CM, W),
          transform: 'translate(-50%, -50%)',
        },
      });
      continue;
    }
    // 측정한 칸에 그대로 쓰는 글자(선 다시 그리기·덮기 없음)
    if (e.place === 'at' || p.at) {
      out.push({ key: `${e.slot}:${i}`, cls: 'at', text: e.show, size: cqw(p.size), style: { left: pct(bx0, W), top: pct(by0, H) } });
      continue;
    }
    if (!p.cell) {
      out.push({ key: `${e.slot}:${i}`, cls: 'tick', text: '√', size: cqw(p.size), style: { left: pct(bx0, W), top: pct(by0, H) } });
      continue;
    }
    const [cx0, cy0, cx1, cy1] = p.cell;
    if (e.op === 'set') {
      out.push({
        key: `${e.slot}:${i}`, cls: 'set', text: e.show, size: cqw(p.size), align: p.align,
        style: { left: pct(cx0 + 1, W), top: pct(cy0 + 1, H), width: pct(cx1 - cx0 - 2, W), height: pct(cy1 - cy0 - 2, H) },
      });
    } else {
      // 칸 이름 뒤에 이어 쓰기: 첫 줄은 이름 뒤, 다음 줄은 칸 왼쪽 끝에서 시작 (들여쓰기로 흉내)
      const pad = 4;
      out.push({
        key: `${e.slot}:${i}`, cls: 'append', text: e.show, size: cqw(p.size),
        style: { left: pct(cx0 + pad, W), top: pct(by0, H), width: pct(cx1 - cx0 - 2 * pad, W), textIndent: `${((bx0 - cx0 - pad) / W) * 100}cqw` },
      });
    }
  }
  // 줄 중간에 끼워 넣는 값: 서버가 준 규칙(pattern)으로 바꾼 글줄(run)만 덮고 다시 그린다
  for (const [g, es] of Object.entries(lines)) {
    const L = groups[g];
    if (!L) continue;
    let text = L.orig;
    for (const e of es) {
      if (e.pattern) {
        let re;
        try { re = new RegExp(e.pattern); } catch { continue; }
        text = text.replace(re, () => `${e.before ?? ''}${START}${e.show}${END}${e.after ?? ''}`);
      } else if (e.op === 'set' && e.show) {
        text = `${START}${e.show}${END}`;
      }
    }
    const [rx0, ry0, rx1, ry1] = L.run ?? L.box;
    const [, , cx1] = L.cell;
    const right = L.align === 'right';
    const style = right
      ? { right: pct(W - rx1, W), top: pct(ry0, H), maxWidth: pct(rx1 - L.cell[0] - 2, W), textAlign: 'right' }
      : { left: pct(rx0, W), top: pct(ry0, H), maxWidth: pct(cx1 - rx0 - 2, W) };
    style.minWidth = pct(rx1 - rx0, W); // 값이 들어가면 줄이 짧아져도 원래 글줄은 끝까지 가린다
    style.minHeight = pct(ry1 - ry0, H);
    const parts = text.split(/([^]*)/).filter(Boolean)
      .map((t) => (t.startsWith(START) ? { text: t.slice(1, -1), value: true } : { text: t, value: false }));
    // 글줄 뒤에 붙어 있던 말(예: 귀하)은 새 글자 바로 뒤에 다시 쓴다
    if (L.tail && !right) {
      const tb = L.tail_box;
      const tsize = tb ? (tb[3] - tb[1]) * 0.85 : L.size;
      parts.push({ text: L.tail, value: false, size: cqw(tsize) });
      if (tb) style.minWidth = pct(Math.max(tb[2], rx1) - rx0, W);
    }
    out.push({ key: `line:${g}`, cls: 'line', text: '', size: cqw(L.size), style, parts });
  }
  return out;
}
