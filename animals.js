'use strict';
// Wildlife art. Four-legged animals are built from a body plan (size, legs, neck, head, markings) and a pose,
// so every species gets walk, graze, idle and rest frames. Small and water creatures are hand-drawn grids.
const QW = 18, QH = 14, QG = 13; // frame size and ground row for quadrupeds

const QUADS = {
  deer:     { n: ['Deer', 'กวาง'], body: '#a86a3a', belly: '#e8d0a8', bl: 8, bh: 3, leg: 4, neck: 3, head: [3, 2], snout: '#3a2416', tail: '#f0e0c0', antlers: '#ecdcb4', spots: '#f0e0c0', ears: 1 },
  reindeer: { n: ['Reindeer', 'กวางเรนเดียร์'], body: '#8a6a50', belly: '#e8e0d0', bl: 8, bh: 3, leg: 4, neck: 3, head: [3, 2], snout: '#3a2416', tail: '#f0e8dc', antlers: '#d8c8a0', mane: '#f0e8dc', ears: 1 },
  cow:      { n: ['Cow', 'วัว'], body: '#f2eee6', belly: '#e6e0d4', bl: 9, bh: 4, leg: 3, neck: 1, head: [3, 3], snout: '#e8a0a0', patches: '#2a2420', horns: '#f0e8d0', tail: '#2a2420', ears: 1 },
  buffalo:  { n: ['Water buffalo', 'ควาย'], body: '#4a4450', belly: '#5a5460', bl: 9, bh: 4, leg: 3, neck: 1, head: [3, 3], snout: '#2a2430', horns: '#c8c0b0', wideHorns: true, tail: '#2a2430', ears: 1 },
  sheep:    { n: ['Sheep', 'แกะ'], body: '#efebe0', belly: '#d8d2c2', bl: 7, bh: 4, leg: 2, neck: 1, head: [3, 2], headCol: '#3a3030', wool: true, tail: '#efebe0', ears: 1 },
  goat:     { n: ['Goat', 'แพะ'], body: '#d8d0c0', belly: '#ece6da', bl: 7, bh: 3, leg: 3, neck: 2, head: [2, 2], snout: '#8a7a68', curlHorns: '#8a7a60', beard: '#f2ece2', tail: '#a89880' },
  horse:    { n: ['Horse', 'ม้า'], body: '#8a5230', belly: '#9a6038', bl: 9, bh: 3, leg: 4, neck: 3, head: [3, 2], snout: '#3a2010', mane: '#2a1a10', tail: '#2a1a10', ears: 1, blaze: '#f2ece2' },
  camel:    { n: ['Camel', 'อูฐ'], body: '#d2a868', belly: '#e0bc80', bl: 9, bh: 3, leg: 5, neck: 3, head: [3, 2], snout: '#8a6a3a', hump: 2, tail: '#a8844a', ears: 1 },
  elephant: { n: ['Elephant', 'ช้าง'], body: '#8e8e9a', belly: '#7a7a86', bl: 11, bh: 5, leg: 3, legW: 2, neck: 0, head: [4, 4], trunk: true, bigEar: '#76768a', tusk: '#f2ead6', tail: '#6a6a76' },
  tiger:    { n: ['Tiger', 'เสือ'], body: '#e8862a', belly: '#f4ead8', bl: 9, bh: 3, leg: 3, neck: 0, head: [3, 3], snout: '#f4ead8', stripes: '#2a1a10', tail: '#e8862a', longTail: '#2a1a10', ears: 1, paws: true },
  bear:     { n: ['Bear', 'หมี'], body: '#6a4a30', belly: '#7a5a3a', bl: 9, bh: 4, leg: 2, legW: 2, neck: 0, head: [3, 3], snout: '#c8a888', ears: 1, paws: true, hunch: true },
  polar:    { n: ['Polar bear', 'หมีขั้วโลก'], body: '#f4f4ee', belly: '#dfe4e8', bl: 9, bh: 4, leg: 2, legW: 2, neck: 0, head: [3, 3], snout: '#1a1420', ears: 1, paws: true, hunch: true },
  wolf:     { n: ['Wolf', 'หมาป่า'], body: '#8a8a94', belly: '#d8d8de', bl: 7, bh: 3, leg: 3, neck: 1, head: [3, 2], snout: '#2a2a30', longTail: '#5a5a64', bushy: true, ears: 2, paws: true },
  boar:     { n: ['Boar', 'หมูป่า'], body: '#5a4030', belly: '#6a5040', bl: 7, bh: 3, leg: 2, neck: 0, head: [3, 2], snout: '#c89080', smallTusk: '#f2ead6', bristle: '#3a2818', ears: 1, hunch: true },
  pig:      { n: ['Pig', 'หมู'], body: '#f0a8a8', belly: '#f8c4c4', bl: 7, bh: 3, leg: 2, neck: 0, head: [3, 2], snout: '#e07878', tail: '#e07878', ears: 1 },
  lion:     { n: ['Lion', 'สิงโต'], body: '#d8a050', belly: '#ecc888', bl: 9, bh: 3, leg: 3, neck: 0, head: [3, 3], snout: '#5a3a20', lionMane: '#8a4a20', longTail: '#5a3a20', paws: true, ears: 1 },
  zebra:    { n: ['Zebra', 'ม้าลาย'], body: '#f4f4f0', belly: '#f4f4f0', bl: 8, bh: 3, leg: 4, neck: 3, head: [3, 2], snout: '#1a1420', stripes: '#1a1420', mane: '#1a1420', tail: '#1a1420', ears: 1 },
  giraffe:  { n: ['Giraffe', 'ยีราฟ'], body: '#e8b04a', belly: '#f0d090', bl: 6, bh: 3, leg: 5, neck: 4, head: [2, 2], snout: '#8a5a2b', patches: '#9a5a24', horns: '#6a4a24', tail: '#6a4a24', ears: 1 },
  rhino:    { n: ['Rhino', 'แรด'], body: '#9a96a0', belly: '#8a8690', bl: 9, bh: 4, leg: 2, legW: 2, neck: 0, head: [4, 3], snout: '#6a6670', noseHorn: '#ece4d4', ears: 1 },
  moose:    { n: ['Moose', 'มูส'], body: '#5a3a24', belly: '#6a4a30', bl: 9, bh: 4, leg: 4, neck: 1, head: [4, 2], snout: '#3a2416', palm: '#d8c8a0', beard: '#3a2416', ears: 1 },
  yak:      { n: ['Yak', 'จามรี'], body: '#3a2e28', belly: '#3a2e28', bl: 9, bh: 4, leg: 2, neck: 0, head: [3, 3], snout: '#2a2018', horns: '#e8e0d0', wideHorns: true, shaggy: '#2a201a', hunch: true },
  llama:    { n: ['Llama', 'ลามะ'], body: '#f0e6d4', belly: '#e0d4c0', bl: 6, bh: 3, leg: 4, neck: 4, head: [2, 2], snout: '#8a7a68', ears: 2, wool: true, tail: '#e0d4c0' },
  panda:    { n: ['Panda', 'แพนด้า'], body: '#f4f4f0', belly: '#e8e8e4', bl: 8, bh: 4, leg: 2, legW: 2, legCol: '#1a1420', neck: 0, head: [3, 3], snout: '#1a1420', eyePatch: '#1a1420', saddle: '#1a1420', earCol: '#1a1420', ears: 2, paws: true, hunch: true },
  croc:     { n: ['Crocodile', 'จระเข้'], body: '#4a6a38', belly: '#a8b878', bl: 10, bh: 2, leg: 1, neck: 0, head: [5, 2], snout: '#2a3a20', longTail: '#4a6a38', scutes: '#2f4a24', paws: true },
  unicorn:  { n: ['Unicorn', 'ยูนิคอร์น'], body: '#f8f6f2', belly: '#ece8f0', bl: 9, bh: 3, leg: 4, neck: 3, head: [3, 2], snout: '#d8b8c8', rainbow: true, unicornHorn: '#f2c14e', tail: '#c890e0', ears: 1, legend: true },
  fox:      { n: ['Fox', 'จิ้งจอก'], body: '#e0702a', belly: '#f4eee2', bl: 6, bh: 2, leg: 2, neck: 1, head: [3, 2], snout: '#1a1420', longTail: '#f4eee2', bushy: true, ears: 2, paws: true },
};
// pose per action: leg swing per frame, head down, lying down, tail flick
const QPOSE = {
  walk:  { ms: 150, f: [{ s: 1 }, { s: 0 }, { s: -1 }, { s: 0 }] },
  graze: { ms: 520, f: [{ down: 1 }, { down: 1, chew: 1 }] },
  idle:  { ms: 700, f: [{}, { flick: 1 }, {}, { ear: 1 }] },
  rest:  { ms: 900, f: [{ lie: 1 }, { lie: 1, breathe: 1 }] },
};

function shadeA(c, f) { const n = parseInt(c.slice(1), 16), ch = v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0'); return '#' + ch(n >> 16) + ch((n >> 8) & 255) + ch(n & 255); }
function outlineAny(g, w, h, alpha = 170) {
  const d = g.getImageData(0, 0, w, h), a = i => d.data[i * 4 + 3] > 40, out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (a(i)) continue;
    if ((x > 0 && a(i - 1)) || (x < w - 1 && a(i + 1)) || (y > 0 && a(i - w)) || (y < h - 1 && a(i + w))) out.push(i);
  }
  for (const i of out) { d.data[i * 4] = 26; d.data[i * 4 + 1] = 20; d.data[i * 4 + 2] = 32; d.data[i * 4 + 3] = alpha; }
  g.putImageData(d, 0, 0);
}
function drawQuad(g, s, p) {
  const px = (x, y, c) => { if (!c || x < 0 || y < 0 || x >= QW || y >= QH) return; g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const dark = shadeA(s.body, 0.72), light = shadeA(s.body, 1.12), legC = s.legCol || shadeA(s.body, 0.85), hoof = s.paws ? shadeA(s.body, 0.6) : '#2a2018';
  const lie = p.lie ? s.leg - (s.leg > 2 ? 1 : 0) : 0;
  const bot = QG - s.leg + lie + (p.lie ? 0 : 0), top = bot - s.bh - (p.breathe ? 0 : 0) + (p.breathe ? 0 : 0);
  const bx = 2, bw = s.bl, lw = s.legW || 1;
  // legs: far pair darker and swinging opposite the near pair
  const leg = (x, off, col) => { if (p.lie) { px(x, bot, col); for (let k = 1; k < lw; k++) px(x + k, bot, col); return; } for (let y = bot; y <= QG; y++) { const xx = x + Math.round(off * (y - bot) / Math.max(1, QG - bot)); for (let k = 0; k < lw; k++) px(xx + k, y, y === QG ? hoof : col); } };
  const sw = p.s || 0;
  leg(bx + 1, -sw, shadeA(legC, 0.75)); leg(bx + bw - 3, sw, shadeA(legC, 0.75));
  // tail behind the body
  if (s.longTail) {
    const up = p.flick ? -1 : 0, pts = s.bushy ? [[bx - 1, top + 1], [bx - 2, top + 1], [bx - 3, top + 2 + up], [bx - 4, top + 2 + up]] : [[bx - 1, top], [bx - 2, top - 1 + up], [bx - 3, top - 1 + up], [bx - 3, top - 2 + up]];
    pts.forEach(([x, y], i) => { px(x, y, i === pts.length - 1 ? s.longTail : s.body); if (s.bushy) px(x, y + 1, i === pts.length - 1 ? s.longTail : shadeA(s.body, 0.9)); });
  } else { const tx = bx - 1, tc = s.tail || dark; px(tx, top + 1, tc); px(tx - (p.flick ? 1 : 0), top + 2, tc); if (!p.flick && !s.hunch) px(tx, top + 3, shadeA(tc, 0.85)); }
  // body: rounded, lit from above, lighter belly
  for (let y = top; y < bot; y++) for (let x = bx; x < bx + bw; x++) {
    const edge = x === bx || x === bx + bw - 1;
    if ((y === top || y === bot - 1) && edge) continue;
    if (s.hunch && y === top && x > bx + bw / 2) continue;
    px(x, y, y === top ? light : y === bot - 1 ? s.belly : x < bx + 2 ? shadeA(s.body, 0.92) : s.body);
  }
  if (s.hunch) for (let x = bx + 2; x < bx + 6; x++) px(x, top - 1, light);
  if (s.hump) for (let k = 0; k < s.hump; k++) for (let x = bx + 2 + k; x < bx + 6 - k; x++) px(x, top - 1 - k, k === s.hump - 1 ? light : s.body);
  if (s.wool) { for (let x = bx; x < bx + bw; x += 2) px(x, top - 1, s.body); for (let y = top + 1; y < bot - 1; y++) for (let x = bx + ((y + 1) % 2); x < bx + bw; x += 2) px(x, y, shadeA(s.body, 0.93)); }
  if (s.spots) [[3, 1], [5, 1], [7, 1], [4, 2], [6, 2]].forEach(([dx, dy]) => px(bx + dx, top + dy, s.spots));
  if (s.patches) [[2, 1], [3, 1], [3, 2], [6, 0], [7, 0], [6, 1], [5, 3], [8, 2]].forEach(([dx, dy]) => px(bx + dx, top + dy, s.patches));
  if (s.saddle) for (let y = top; y < bot; y++) { px(bx + bw - 3, y, s.saddle); px(bx + bw - 4, y, s.saddle); }
  if (s.scutes) for (let x = bx + 1; x < bx + bw - 1; x += 2) px(x, top - 1, s.scutes);
  if (s.bristle) for (let x = bx + 2; x < bx + 6; x++) px(x, top - 2, s.bristle);
  if (s.shaggy) for (let x = bx; x < bx + bw; x++) if (x % 2 === 0) px(x, bot, s.shaggy);
  if (s.stripes) for (let k = 1; k < bw - 1; k += 2) { px(bx + k, top, s.stripes); px(bx + k, top + 1, s.stripes); px(bx + k + 1, top + 2 - (k % 4 === 1 ? 0 : 1), s.stripes); }
  // near legs over the body edge
  leg(bx + 2, sw, legC); leg(bx + bw - 2, -sw, legC);
  // neck and head
  const [hw, hh] = s.head, down = p.down && !p.lie;
  let hx, hy;
  if (s.neck && !down) {
    for (let k = 0; k <= s.neck; k++) { px(bx + bw - 2, top - k, s.body); px(bx + bw - 1, top - k, k ? s.body : s.body); }
    if (s.mane) for (let k = 0; k <= s.neck; k++) px(bx + bw - 3, top - k + 1, s.mane);
    hx = bx + bw - 1; hy = top - s.neck - 1;
  } else if (down) {
    const nx = bx + bw - 1;
    for (let y = top; y < QG - hh + 1; y++) { px(nx + Math.round((y - top) / 3), y, s.body); px(nx + Math.round((y - top) / 3) - 1, y, s.body); }
    hx = nx + Math.round((QG - hh + 1 - top) / 3); hy = QG - hh + (p.chew ? 0 : 1) - (s.leg <= 2 ? 1 : 0);
  } else { hx = bx + bw - 1; hy = top - (s.hunch ? 0 : 1) + (p.lie ? 1 : 0); }
  if (s.mane && down) px(bx + bw - 2, top - 1, s.mane);
  const hc = s.headCol || s.body;
  for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) { if (y === 0 && x === hw - 1 && hh > 2) continue; px(hx + x, hy + y, y === 0 ? shadeA(hc, 1.1) : hc); }
  px(hx + hw - 1, hy + hh - 1, s.snout || shadeA(hc, 0.7));
  if (s.blaze) px(hx + hw - 2, hy + hh - 2, s.blaze);
  px(hx + hw - 2, hy + (hh > 2 ? 1 : 0), '#1a1420'); // eye
  if (s.ears) { px(hx, hy - 1, shadeA(hc, 0.8)); if (s.ears > 1 || p.ear) px(hx + 1, hy - 1 - (p.ear ? 1 : 0), shadeA(hc, 0.8)); }
  if (s.antlers) { const c = s.antlers; px(hx, hy - 1, c); px(hx, hy - 2, c); px(hx - 1, hy - 3, c); px(hx + 1, hy - 3, c); px(hx + 1, hy - 2, c); px(hx + 2, hy - 4, c); px(hx - 1, hy - 4, c); }
  if (s.horns) { px(hx + (s.wideHorns ? 0 : 1), hy - 1, s.horns); if (s.wideHorns) { px(hx - 1, hy - 1, s.horns); px(hx - 2, hy, s.horns); px(hx + 2, hy - 1, s.horns); } }
  if (s.curlHorns) { px(hx, hy - 1, s.curlHorns); px(hx - 1, hy - 2, s.curlHorns); px(hx - 2, hy - 1, s.curlHorns); }
  if (s.beard) px(hx + hw - 1, hy + hh, s.beard);
  if (s.bigEar) for (let y = 0; y < 3; y++) { px(hx, hy + y, s.bigEar); px(hx + 1, hy + y, y === 1 ? shadeA(s.bigEar, 0.85) : s.bigEar); }
  if (s.noseHorn) { px(hx + hw - 1, hy - 1, s.noseHorn); px(hx + hw - 1, hy - 2, s.noseHorn); px(hx + hw - 2, hy, s.noseHorn); }
  if (s.smallTusk) px(hx + hw - 1, hy + hh, s.smallTusk);
  if (s.lionMane) for (let y = -1; y <= hh; y++) { px(hx - 1, hy + y, s.lionMane); px(hx, hy + y, y < 0 || y === hh ? s.lionMane : shadeA(s.lionMane, 1.15)); if (y < 0 || y === hh) px(hx + 1, hy + y, s.lionMane); }
  if (s.palm) { const c = s.palm; for (let x = -2; x <= 1; x++) px(hx + x, hy - 2, c); px(hx - 2, hy - 3, c); px(hx, hy - 3, c); px(hx + 1, hy - 3, c); px(hx, hy - 1, c); }
  if (s.eyePatch) { px(hx + hw - 2, hy + 1, s.eyePatch); px(hx + hw - 3, hy + 1, s.eyePatch); }
  if (s.earCol) { px(hx, hy - 1, s.earCol); px(hx + 2, hy - 1, s.earCol); }
  if (s.unicornHorn) { px(hx + hw - 2, hy - 1, s.unicornHorn); px(hx + hw - 1, hy - 2, '#fff3a0'); }
  if (s.rainbow) { const rb = ['#e05a5a', '#f2a03a', '#f2e04a', '#5ac85a', '#5a8ae0', '#a05ae0']; for (let k = 0; k <= s.neck + 1; k++) px(bx + bw - 3, top - k + 1, rb[(k + (p.flick ? 1 : 0)) % rb.length]); }
  if (s.trunk) {
    const tx = hx + hw - 1, sway = p.flick ? 1 : 0;
    for (let y = hy + hh; y < QG - (down ? 0 : 1); y++) px(tx + (y > hy + hh + 1 ? sway : 0), y, s.body);
    px(tx + 1 + sway, QG - (down ? 0 : 1), s.body);
    px(tx - 1, hy + hh, s.tusk); px(tx, hy + hh, s.tusk);
  }
}
const _qf = new Map();
function quadFrame(kind, act, fi) {
  const key = kind + act + fi; let cv = _qf.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = QW; cv.height = QH;
  const g = cv.getContext('2d'); drawQuad(g, QUADS[kind], QPOSE[act].f[fi]); outlineAny(g, QW, QH);
  _qf.set(key, cv); return cv;
}

/* ---------- small creatures, birds and sea life (hand-drawn grids) ---------- */
const SMALL_PAL = { q: '#5ab04a', Q: '#3a7a30', a: '#7a5a2a', A: '#b08a48', v: '#d8502e', V: '#a0301e', z: '#8a9a3a', Z: '#5a6a24', t: '#b0703a', T: '#d8a060', R: '#e03a2e', P: '#2e6ae0', Y: '#f8d040', E: '#6a4a2a', U: '#f4f0e8', N: '#f08a2a', i: '#8a8a96', I: '#c8c8d0', j: '#f0a0d0', J: '#c070b0', x: '#f08aa8', X: '#c05a7a', d: '#c0302a', D: '#801818', m: '#2a8a7a', M: '#1a5a50', k: '#1a1420', w: '#f4f4f0', W: '#c8ccd4', y: '#f2c14e', o: '#e8862a', b: '#2a2a38', B: '#5a4a3a', g: '#6a8aa8', G: '#4a6a88', l: '#d8e6f0', s: '#3a4a6a', S: '#5a6a8a', f: '#e8f6ff', r: '#c8402e', p: '#f2a0c8', h: '#c8b090', H: '#a08a68', e: '#1a1420', n: '#e8e0d8', c: '#7ab0d0' };
const SMALL = {
  frog: { ms: 260, f: [['.e..e.', 'qqqqqq', 'qQqqQq', '.qqqq.', 'q....q'], ['.e..e.', 'qqqqqq', '.qQQq.', 'q....q', '......']] },
  turtle: { ms: 420, f: [['..aaaa..', '.aAaaAaq', 'aaaaaaaq', '.q..q...'], ['..aaaa..', '.aAaaAaq', 'aaaaaaaq', '..q..q..']] },
  crab: { ms: 200, f: [['v.....v', 'vv...vv', '.vvevv.', 'vVVVVVv', 'v.v.v.v'], ['.v...v.', 'vv...vv', '.vvevv.', 'vVVVVVv', '.v.v.v.']] },
  snake: { ms: 220, f: [['.zz....zz', 'z..z..zez', '....zz...'], ['....zz.zz', '.zz..zzez', 'z........']] },
  squirrel: { ms: 150, f: [['TT.....', 'TtT..t.', '.Tt.tte', '..tttt.', '..tttt.', '..t..t.'], ['.......', 'TT...t.', 'TtT.tte', '.Ttttt.', '..tttt.', '.t...t.']] },
  owl: { ms: 900, f: [['E...E', 'EEEEE', 'EYEYE', 'EENEE', 'EnnnE', '.EnE.', '.N.N.'], ['E...E', 'EEEEE', 'EkEkE', 'EENEE', 'EnnnE', '.EnE.', '.N.N.']] },
  seal: { ms: 380, f: [['.....iii', '.iiiiiei', 'iIIIIIi.', 'ii....i.'], ['......ii', '..iiiiei', 'iIIIIIi.', '.i...ii.']] },
  flamingo: { ms: 700, f: [['...xx', '...xN', '...x.', '..x..', 'xxxx.', 'Xxxx.', '..x..', '..x..', '..x..'], ['.....', '.....', '...xx', '..xxN', 'xxxx.', 'Xxxx.', '..x..', '..x..', '..x..']] },
  parrot: { ms: 100, f: [['PP.....PP', '.PP...PP.', '.YRRRRRN.', '.........'], ['.........', 'PPPPPPPPP', '...RRRN..', '.........'], ['.........', '...PPP...', '.RRRRRRN.', 'P.......P'], ['.........', 'PPPPPPPPP', '...RRRN..', '.........']] },
  eagle: { ms: 170, f: [['EE.......EE', '.EE.....EE.', '..EEEEEEUN.', '...........'], ['...........', 'EEEEEEEEEEE', '...EEEEUN..', '...........'], ['...........', '....EEE....', '.EEEEEEEUN.', 'E.........E'], ['...........', 'EEEEEEEEEEE', '...EEEEUN..', '...........']] },
  shark: { ms: 300, f: [['...s...', '..ss...', '.sss...', 'fffffff'], ['....s..', '...ss..', '..sss..', '.fffff.']] },
  jelly: { ms: 450, f: [['.jjj.', 'jJjJj', 'jjjjj', 'j.j.j', '.j.j.', 'j.j.j'], ['.jjj.', 'jjJjj', 'jjjjj', '.j.j.', 'j.j.j', '.j.j.']] },
  seaturtle: { ms: 500, f: [['.q....q.', '..aaaa..', '.aAaaAaq', '..aaaa..', '.q....q.'], ['q......q', '..aaaa..', '.aAaaAaq', '..aaaa..', 'q......q']] },
  dragon: { ms: 160, f: [
    ['...dd......dd...', '....dd....dd....', '.....dd..dd.....', '......dddd......', 'D..DDDDDDDDDdde.', '.DDDDDDDDDDDDddN', '..D.....D..D....', '................'],
    ['................', '................', '.ddddd....ddddd.', '....dddddddd....', 'D..DDDDDDDDDdde.', '.DDDDDDDDDDDDddN', '..D.....D..D....', '................'],
    ['................', '................', '................', '......dddd......', 'D..DDDDDDDDDdde.', '.DDDDDDDDDDDDddN', '..D.ddd.D.ddd...', '.....dd....dd...'],
    ['................', '................', '.ddddd....ddddd.', '....dddddddd....', 'D..DDDDDDDDDdde.', '.DDDDDDDDDDDDddN', '..D.....D..D....', '................'],
  ] },
  serpent: { ms: 420, f: [
    ['...mm.....mm....', '..mMMm...mMMm.mm', '.m....m.m....mme', 'ffffffffffffffff'],
    ['.....mm.....mm..', '....mMMm...mMMmm', '...m....m.m...me', 'ffffffffffffffff'],
    ['mm.....mm.......', 'MMm...mMMm....mm', '...m.m....m..mme', 'ffffffffffffffff'],
  ] },
  rabbit: { ms: 120, f: [
    ['....hh..', '....hh..', '...hhhh.', '.hhhhehn', 'Hhhhhhh.', '.hH..hH.'],
    ['....hh..', '...hh...', '..hhhhh.', 'Hhhhhhen', '.hhhhhh.', 'H.....hH'],
    ['........', '....hh..', '...hhhh.', '.hhhhehn', 'Hhhhhhh.', '.hH..hH.'],
  ] },
  penguin: { ms: 260, f: [
    ['..bb..', '.bbbb.', '.bwbey', 'bbwwb.', 'bbwwb.', 'bbwwb.', '.bwwb.', '.y..y.'],
    ['..bb..', '.bbbb.', '.bwbey', '.bwwbb', '.bwwbb', '.bwwbb', '.bwwb.', '..y..y'],
  ] },
  gull: { ms: 110, f: [
    ['ww.....ww', '.Ww...wW.', '..wwwwwy.', '.........'],
    ['.........', 'WwwwwwwwW', '...wwwy..', '.........'],
    ['.........', '...www...', '.wwwwwwy.', 'W.......W'],
    ['.........', 'WwwwwwwwW', '...wwwy..', '.........'],
  ] },
  crow: { ms: 120, f: [
    ['bb.....bb', '.Bb...bB.', '..bbbbby.', '.........'],
    ['.........', 'BbbbbbbbB', '...bbby..', '.........'],
    ['.........', '...bbb...', '.bbbbbby.', 'B.......B'],
    ['.........', 'BbbbbbbbB', '...bbby..', '.........'],
  ] },
  butterfly: { ms: 120, f: [['p.p', 'pkp', '.k.'], ['...', 'pkp', '.k.'], ['.p.', 'pkp', '.k.']] },
  fish: { ms: 220, f: [
    ['.ccc.c.....', 'ccecccc..cc', '.ccc.c.cecc', '.......cc.c'],
    ['.ccc.......', 'cceccc...cc', '.ccc.c.cecc', '........c.c'],
  ] },
  dolphin: { ms: 1, f: [
    ['.......gl.', '.....ggg..', '...gglg...', '.gglll....', 'gl........'],
    ['....g.....', '.gggggggg.', 'gglllllgge', 'g.......l.', '..........'],
    ['gl........', '.gglll....', '...gglg...', '.....ggg..', '.......gl.'],
  ] },
  whale: { ms: 1, f: [
    ['................', '................', '................', '....ssssssss....', '..sSSSSSSSSSSs..', 'fffSSSSSSSSSSfff'],
    ['......f..f......', '.......ff.......', '.......ff.......', '....ssssssss....', '..sSSSSSSSSSSs..', 'fffSSSSSSSSSSfff'],
    ['................', '..s.........s...', '..ss.......ss...', '...ssss.ssss....', '......sss.......', '.....fffff......'],
  ] },
};
const _sf = new Map();
function smallFrame(kind, fi, tint) {
  const key = kind + fi + (tint || ''); let cv = _sf.get(key); if (cv) return cv;
  const rows = SMALL[kind].f[fi], w = rows[0].length, h = rows.length;
  cv = document.createElement('canvas'); cv.width = w + 2; cv.height = h + 2;
  const g = cv.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { if (r[x] === '.') continue; g.fillStyle = tint && r[x] === 'p' ? tint : SMALL_PAL[r[x]]; g.fillRect(x + 1, y + 1, 1, 1); } });
  if (kind !== 'whale' && kind !== 'fish' && kind !== 'butterfly') outlineAny(g, w + 2, h + 2, 150);
  _sf.set(key, cv); return cv;
}

/* ---------- drawing one creature on the map; X,Y = screen position of its feet ---------- */
function drawCritter(ctx, c, X, Y, z, now) {
  const fl = (img, x, y, w, h) => drawFlip(ctx, img, x, y, w, h, c.flip);
  if (QUADS[c.k]) {
    const act = c.state || 'idle', P = QPOSE[act], fi = Math.floor(now / P.ms + c.seed) % P.f.length;
    ctx.fillStyle = 'rgba(10,14,8,.22)'; ctx.fillRect(X - 6 * z, Y - z / 2, 12 * z, z);
    fl(quadFrame(c.k, act, fi), X - (QW / 2) * z, Y - QH * z, QW * z, QH * z);
    return;
  }
  const S = SMALL[c.k]; if (!S) return;
  if (FLYERS.includes(c.k)) { // flying with a shadow on the ground below
    const fi = Math.floor(now / S.ms + c.seed) % 4, img = smallFrame(c.k, fi), alt = ((c.k === 'dragon' ? 22 : c.k === 'eagle' ? 16 : 10) + Math.sin(now / 900 + c.seed) * 2) * z;
    if (c.k === 'dragon' && Math.floor(now / 2600 + c.seed) % 3 === 0) { const dir = c.flip ? -1 : 1; for (let k = 0; k < 7; k++) { const ph = ((now / 300) + k / 7) % 1; ctx.fillStyle = k % 2 ? '#f8a030' : '#fff3a0'; ctx.fillRect(X + dir * (img.width / 2 + ph * 14) * z, Y - alt - (img.height - 5) * z + Math.sin(k * 3 + now / 80) * z, 2 * z, 2 * z); } }
    ctx.fillStyle = 'rgba(10,14,8,.2)'; ctx.fillRect(X - 3 * z, Y, 6 * z, z);
    fl(img, X - (img.width / 2) * z, Y - alt - img.height * z, img.width * z, img.height * z);
    return;
  }
  if (c.k === 'butterfly') { const fi = Math.floor(now / S.ms + c.seed) % 3, img = smallFrame(c.k, fi, BUTTERFLY_COLS[Math.floor(c.seed) % 4]); fl(img, X - 2 * z, Y - (6 + Math.sin(now / 300 + c.seed * 5) * 1.5) * z, img.width * z, img.height * z); return; }
  if (c.k === 'fish' || c.k === 'jelly' || c.k === 'seaturtle') { const fi = Math.floor(now / S.ms + c.seed) % 2, img = smallFrame(c.k, fi); ctx.globalAlpha = 0.75; fl(img, X - 6 * z, Y - 4 * z, img.width * z, img.height * z); ctx.globalAlpha = 1; return; }
  if (c.k === 'dolphin') { // leaps out of the water every few seconds
    const per = 5200, t = ((now + c.seed * 1300) % per) / 1500;
    if (t > 1) { ctx.fillStyle = 'rgba(232,246,255,.35)'; if (Math.floor(now / 400) % 3 === 0) ctx.fillRect(X - 2 * z, Y - z, 4 * z, z); return; }
    const fi = t < 0.38 ? 0 : t < 0.62 ? 1 : 2, img = smallFrame('dolphin', fi), dx = (t - 0.5) * 14 * z * (c.flip ? -1 : 1), dy = Math.sin(Math.PI * t) * 9 * z;
    fl(img, X + dx - (img.width / 2) * z, Y - dy - img.height * z, img.width * z, img.height * z);
    if (t < 0.15 || t > 0.85) { ctx.fillStyle = '#e8f6ff'; const sx = X + (t < 0.5 ? -6 : 6) * z * (c.flip ? -1 : 1); ctx.fillRect(sx - z, Y - 2 * z, z, z); ctx.fillRect(sx + z, Y - 2 * z, z, z); ctx.fillRect(sx, Y - 3 * z, z, z); }
    return;
  }
  if (c.k === 'whale') { // surfaces, spouts, then dives tail-first
    const per = 9000, t = ((now + c.seed * 2000) % per) / per, fi = t < 0.25 ? 0 : t < 0.45 ? 1 : t < 0.6 ? 2 : -1;
    if (fi < 0) return;
    const img = smallFrame('whale', fi); fl(img, X - (img.width / 2) * z, Y - img.height * z + z, img.width * z, img.height * z);
    return;
  }
  const always = ['shark', 'serpent', 'owl', 'flamingo'].includes(c.k), fi = c.state === 'walk' || always ? Math.floor(now / S.ms + c.seed) % S.f.length : 0, img = smallFrame(c.k, fi);
  fl(img, X - (img.width / 2) * z, Y - img.height * z, img.width * z, img.height * z);
}

/* ---------- where each creature lives ---------- */
const BUTTERFLY_COLS = ['#f2a0c8', '#f2c14e', '#7ab0f0', '#f4f4f0'];
const FLYERS = ['gull', 'crow', 'parrot', 'eagle', 'dragon'];
const SMALL_N = { frog: ['Frog', 'กบ'], turtle: ['Turtle', 'เต่า'], crab: ['Crab', 'ปู'], snake: ['Snake', 'งู'], squirrel: ['Squirrel', 'กระรอก'], owl: ['Owl', 'นกฮูก'], seal: ['Seal', 'แมวน้ำ'], flamingo: ['Flamingo', 'นกฟลามิงโก'], parrot: ['Parrot', 'นกแก้ว'], eagle: ['Eagle', 'นกอินทรี'], shark: ['Shark', 'ฉลาม'], jelly: ['Jellyfish', 'แมงกะพรุน'], seaturtle: ['Sea turtle', 'เต่าทะเล'], dragon: ['Dragon', 'มังกร'], serpent: ['Sea serpent', 'งูทะเลยักษ์'], rabbit: ['Rabbit', 'กระต่าย'], penguin: ['Penguin', 'เพนกวิน'], gull: ['Gull', 'นกนางนวล'], crow: ['Crow', 'นกกา'], butterfly: ['Butterfly', 'ผีเสื้อ'], fish: ['Fish', 'ฝูงปลา'], dolphin: ['Dolphin', 'โลมา'], whale: ['Whale', 'วาฬ'] };
const QPOSE_N = { walk: ['Walk', 'เดิน'], graze: ['Graze', 'กินหญ้า'], idle: ['Stand', 'ยืน'], rest: ['Rest', 'นอนพัก'] };
const HABITAT = {
  grass: ['cow', 'horse', 'sheep', 'deer', 'rabbit', 'buffalo', 'pig', 'frog'], plains: ['horse', 'sheep', 'goat', 'rabbit', 'zebra', 'giraffe', 'lion', 'rhino'],
  forest: ['deer', 'bear', 'fox', 'wolf', 'boar', 'moose', 'panda', 'squirrel', 'owl'], jungle: ['elephant', 'tiger', 'buffalo', 'croc', 'boar', 'frog', 'snake'], hills: ['goat', 'sheep', 'llama', 'yak'],
  desert: ['camel', 'camel', 'snake', 'lion'], tundra: ['reindeer', 'fox', 'bear', 'wolf', 'moose', 'yak'], snow: ['polar', 'penguin', 'penguin', 'seal'],
};
const HERD = { wolf: [2, 4], zebra: [3, 5], giraffe: [2, 3], pig: [2, 4], llama: [2, 4], yak: [2, 3], boar: [1, 2], lion: [1, 3], moose: [1, 2], rhino: [1, 2], seal: [2, 4], crab: [2, 3], flamingo: [3, 5], frog: [1, 2], cow: [2, 3], buffalo: [2, 3], sheep: [3, 5], goat: [2, 3], horse: [2, 4], deer: [2, 3], reindeer: [3, 4], camel: [2, 3], elephant: [2, 3], penguin: [3, 5], rabbit: [2, 3] };
const CRITTER_SPEED = { wolf: 0.6, lion: 0.55, zebra: 0.5, giraffe: 0.4, pig: 0.25, boar: 0.4, rhino: 0.3, moose: 0.4, yak: 0.25, llama: 0.35, panda: 0.2, croc: 0.2, unicorn: 0.6, frog: 0.4, turtle: 0.1, crab: 0.3, snake: 0.3, squirrel: 0.7, owl: 0.15, seal: 0.2, flamingo: 0.15, parrot: 1.6, eagle: 1.2, shark: 0.5, jelly: 0.15, seaturtle: 0.25, dragon: 1.1, serpent: 0.35, tiger: 0.6, fox: 0.6, horse: 0.55, deer: 0.55, reindeer: 0.5, rabbit: 0.8, elephant: 0.25, cow: 0.22, buffalo: 0.22, sheep: 0.28, goat: 0.35, camel: 0.3, bear: 0.35, polar: 0.35, penguin: 0.2, gull: 1.4, crow: 1.6, butterfly: 0.5, fish: 0.4 };
// who hunts whom
const PREY = {
  wolf: ['deer', 'reindeer', 'sheep', 'goat', 'rabbit', 'pig'], lion: ['zebra', 'giraffe', 'buffalo', 'deer'], tiger: ['deer', 'buffalo', 'boar', 'pig'],
  bear: ['rabbit', 'deer', 'squirrel'], polar: ['seal', 'penguin'], fox: ['rabbit', 'frog', 'squirrel'], croc: ['zebra', 'buffalo', 'flamingo', 'deer'],
  eagle: ['rabbit', 'snake', 'squirrel'], shark: ['fish', 'seaturtle'],
};
const PREDATORS = ['tiger', 'bear', 'polar', 'fox', 'wolf', 'lion', 'croc'];
function nearWater(x, y) { if (x == null) return false; for (const [dx, dy] of DIRS) if (inb(x + dx, y + dy) && isWater(T(x + dx, y + dy))) return true; return false; }
function livesOn(k, tl, x, y) {
  if (!tl || tl.city >= 0) return false;
  if (k === 'fish' || k === 'dolphin' || k === 'jelly' || k === 'seaturtle' || k === 'shark') return isWater(tl);
  if (k === 'whale' || k === 'serpent') return tl.t === 'ocean';
  if (k === 'flamingo') return tl.t === 'coast';
  if (k === 'crab' || k === 'turtle') return !isWater(tl) && !TERRAIN[tl.t].block && tl.t !== 'snow' && nearWater(x, y);
  if (k === 'croc') return (tl.t === 'jungle' || tl.t === 'grass') && nearWater(x, y) || tl.t === 'jungle';
  if (k === 'unicorn') return tl.t === 'forest' || tl.t === 'grass';
  if (k === 'dragon' || k === 'eagle') return true;
  if (k === 'parrot') return tl.t === 'jungle' || tl.t === 'forest';
  if (k === 'gull' || k === 'crow') return true;
  if (k === 'butterfly') return ['grass', 'plains', 'jungle', 'forest'].includes(tl.t);
  return (HABITAT[tl.t] || []).includes(k);
}
