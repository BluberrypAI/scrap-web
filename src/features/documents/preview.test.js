import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { overlayItems } from './preview.js';

const layout = JSON.parse(readFileSync(new URL('../../../public/legal-forms/form6.json', import.meta.url), 'utf8'));
const slotsOf = (pred) => Object.entries(layout.slots).filter(([, p]) => pred(p));

test('칸이 없는 자리는 체크(√)로 그린다', () => {
  const [slot, p] = slotsOf((s) => !s.cell && !s.group)[0];
  const [item] = overlayItems(layout, [{ slot, op: 'set', show: '1' }]);
  assert.equal(item.cls, 'tick');
  assert.equal(item.text, '√');
  assert.equal(item.style.left, `${(p.box[0] / layout.page[0]) * 100}%`);
});

test('set은 칸 전체를 덮고 append는 이어 쓴다', () => {
  const [slot, p] = slotsOf((s) => s.cell && !s.group)[0];
  const [a] = overlayItems(layout, [{ slot, op: 'set', show: '값' }]);
  assert.equal(a.cls, 'set');
  assert.equal(a.text, '값');
  assert.equal(a.align, p.align);
  const [b] = overlayItems(layout, [{ slot, op: 'append', show: '값' }]);
  assert.equal(b.cls, 'append');
  assert.match(b.style.textIndent, /cqw$/);
});

test('줄 안에 끼우는 값은 서버 pattern으로 바꿔 값 부분을 표시한다', () => {
  const [slot, p] = slotsOf((s) => s.group)[0];
  const orig = layout.groups[p.group].orig;
  const pattern = orig.slice(0, 3).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const items = overlayItems(layout, [{ slot, op: 'sub', show: 'XYZ', pattern, before: '<', after: '>' }]);
  const line = items.find((i) => i.cls === 'line');
  assert.ok(line);
  assert.ok(line.parts.map((x) => x.text).join('').startsWith('<XYZ>'));
  assert.deepEqual(line.parts.find((x) => x.value), { text: 'XYZ', value: true });
});

test('모르는 칸·빈 입력·깨진 pattern은 건너뛴다', () => {
  assert.deepEqual(overlayItems(layout, [{ slot: 'nope', op: 'set', show: 'a' }]), []);
  assert.deepEqual(overlayItems(null, [{ slot: '1', show: 'a' }]), []);
  const [slot] = slotsOf((s) => s.group)[0];
  const items = overlayItems(layout, [{ slot, op: 'sub', show: 'a', pattern: '(' }]);
  assert.ok(items.every((i) => !i.parts.some((x) => x.value)));
});

const pctOf = (v, of) => `${(v / of) * 100}%`;

test('place:at은 칸 위치에 글자만 놓고 덮지 않는다', () => {
  const [slot, p] = slotsOf((s) => s.box && !s.cell && !s.group && !s.sign)[0];
  const [item] = overlayItems(layout, [{ slot, op: 'set', show: '홍길동', place: 'at' }]);
  assert.equal(item.cls, 'at');
  assert.equal(item.text, '홍길동');
  assert.equal(item.style.left, pctOf(p.box[0], layout.page[0]));
  assert.equal(item.style.top, pctOf(p.box[1], layout.page[1]));
});

test('서명 자리는 서명 그림이 있을 때만 가운데에 그린다', () => {
  const p = layout.slots['86.0'];
  const edit = { slot: '86.0', op: 'sign', show: '(서명)' };
  assert.deepEqual(overlayItems(layout, [edit]), []);
  const [item] = overlayItems(layout, [edit], 'data:image/png;base64,AAAA');
  assert.equal(item.cls, 'sign');
  assert.equal(item.src, 'data:image/png;base64,AAAA');
  // 실제 파일과 같은 크기: 서명 높이 1cm, 폭 최대 4cm (비율 유지)
  const cm = 72 / 2.54;
  assert.equal(item.style.height, pctOf(1 * cm, layout.page[1]));
  assert.equal(item.style.maxWidth, pctOf(4 * cm, layout.page[0]));
  assert.equal(item.style.width, undefined, '폭을 정하지 않아 그림 비율이 유지된다');
  assert.equal(item.style.left, pctOf((p.box[0] + p.box[2]) / 2, layout.page[0]));
  const [seal] = overlayItems(layout, [edit], 'data:image/png;base64,AAAA', 'seal');
  assert.equal(seal.style.height, pctOf(1.6 * cm, layout.page[1]));
});

test('서명 칸은 체크(√)로 그리지 않는다', () => {
  assert.deepEqual(overlayItems(layout, [{ slot: '86.0', op: 'set', show: 'x' }]), []);
});

test('줄은 글줄(run)만 덮고, 뒤의 귀하는 새 글자 뒤에 다시 쓴다', () => {
  const g = layout.groups['87:1'];
  const [slot] = slotsOf((s) => s.group === '87:1')[0];
  const [item] = overlayItems(layout, [{ slot, op: 'sub', show: '화성시장', pattern: '^.*$', before: '', after: '' }]);
  assert.equal(item.cls, 'line');
  assert.equal(item.style.left, pctOf(g.run[0], layout.page[0]));
  assert.equal(item.style.top, pctOf(g.run[1], layout.page[1]));
  const last = item.parts.at(-1);
  assert.equal(last.text, '귀하');
  assert.equal(last.value, false);
  assert.ok(Math.abs(last.size - ((g.tail_box[3] - g.tail_box[1]) * 0.85 / layout.page[0]) * 100) < 1e-9);
  assert.deepEqual(item.parts.find((x) => x.value), { text: '화성시장', value: true });
});
