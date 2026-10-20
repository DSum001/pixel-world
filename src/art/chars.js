'use strict';
// Rigged pixel humans. A pose (crouch, feet, arm and tool angles) is rasterized into a 12x16 frame,
// so every role x action combination comes from the same skeleton. Angles: 0 = forward, 90 = down, -90 = up.
const CW = 20, CH = 18, OX = 4, OY = 2; // frame size; body sits at OX/OY so weapons and hats have room
const SKINS = ['#e7b07e', '#c98e5a', '#9a6238', '#f2caa2'];
const HAIR = ['#3a2416', '#1a1420', '#7a4a20', '#c8a060'];
const OUT = '#1a1420', METAL = '#d4d8e4', METAL2 = '#7a8094', WOOD = '#8a5a2b', WOOD2 = '#c08a48';

// shirt 'civ' = the civilization's colour
const ROLES = {
  farmer:     { n: ['Farmer', 'ชาวนา'], shirt: '#d8c48a', pants: '#6a5030', hat: 'straw', tool: 'hoe', work: 'swing' },
  miner:      { n: ['Miner', 'คนงานเหมือง'], shirt: '#7a6a5a', pants: '#3a3a48', hat: 'lamp', tool: 'pick', work: 'swing' },
  lumberjack: { n: ['Lumberjack', 'คนตัดไม้'], shirt: '#b83a2e', pants: '#3a4a6a', hat: 'cap', tool: 'axe', work: 'chop' },
  builder:    { n: ['Builder', 'ช่างก่อสร้าง'], shirt: '#e8964a', pants: '#5a4a3a', hat: 'band', tool: 'hammer', work: 'hammer' },
  fisher:     { n: ['Fisher', 'ชาวประมง'], shirt: '#4a7ab8', pants: '#3a3a3a', hat: 'bucket', tool: 'rod', work: 'fish' },
  herder:     { n: ['Herder', 'คนเลี้ยงสัตว์'], shirt: '#8a9a5a', pants: '#5a4a30', hat: 'hood', tool: 'staff', work: 'herd' },
  gatherer:   { n: ['Gatherer', 'คนเก็บผลผลิต'], shirt: '#c86a9a', pants: '#5a3a4a', hat: 'scarf', tool: null, work: 'gather', basket: true },
  merchant:   { n: ['Merchant', 'พ่อค้า'], shirt: '#7a3fa0', pants: '#3a2a4a', hat: 'turban', tool: 'bag', work: 'trade' },
  priest:     { n: ['Priest', 'นักบวช'], shirt: '#f0e8d0', pants: '#f0e8d0', hat: 'mitre', tool: null, work: 'pray', robe: true },
  scholar:    { n: ['Scholar', 'นักปราชญ์'], shirt: '#2a3a6a', pants: '#2a3a6a', hat: 'square', tool: 'book', work: 'read', robe: true },
  noble:      { n: ['Noble', 'ขุนนาง'], shirt: '#8a1f2b', pants: '#3a1a20', hat: 'crown', tool: null, work: 'cheer', cape: true },
  settler:    { n: ['Settler', 'ผู้บุกเบิก'], shirt: 'civ', pants: '#5a4a3a', hat: 'wide', tool: 'staff', work: 'herd', pack: true },
  scout:      { n: ['Scout', 'หน่วยสอดแนม'], shirt: 'civ', pants: '#4a3a2a', hat: 'feather', tool: 'staff', work: 'herd' },
  warrior:    { n: ['Warrior', 'นักรบ'], shirt: 'civ', pants: '#5a3a20', hat: 'band', tool: 'club', work: 'attack', atk: 'attack' },
  soldier:    { n: ['Swordsman', 'พลดาบ'], shirt: 'civ', pants: '#3a3a48', hat: 'helmet', tool: 'sword', work: 'attack', atk: 'attack' },
  spearman:   { n: ['Spearman', 'พลหอก'], shirt: 'civ', pants: '#3a3a48', hat: 'helmet', tool: 'spear', work: 'thrust', atk: 'thrust' },
  archer:     { n: ['Archer', 'พลธนู'], shirt: 'civ', pants: '#3a4a2a', hat: 'hood', tool: 'bow', work: 'shoot', atk: 'shoot' },
  musketeer:  { n: ['Musketeer', 'ทหารปืนคาบศิลา'], shirt: 'civ', pants: '#2a2a3a', hat: 'tricorn', tool: 'musket', work: 'shoot', atk: 'shoot' },
  infantry:   { n: ['Infantry', 'ทหารราบ'], shirt: '#5d7a3a', pants: '#4a5a30', hat: 'helmetG', tool: 'musket', work: 'shoot', atk: 'shoot', badge: true },
};

const A = (by, fl, fr, af, ab, ta, x) => ({ by, fl, fr, af, ab, ta, x });
const ACTIONS = {
  idle:   { n: ['Idle', 'ยืน'], ms: 520, f: [A(0, 0, 0, 80, 100), A(0, 0, 0, 82, 98), A(1, 0, 0, 84, 96), A(0, 0, 0, 82, 98)] },
  walk:   { n: ['Walk', 'เดิน'], ms: 150, f: [A(0, 2, -1, 50, 130), A(1, 0, 0, 90, 90), A(0, -1, 2, 130, 50), A(1, 0, 0, 90, 90)] },
  swing:  { n: ['Dig', 'ขุด'], ms: 180, f: [A(0, -1, 1, -120, 110, -150), A(0, -1, 1, -50, 110, -60), A(1, -1, 1, 40, 110, 80), A(1, -1, 1, 30, 110, 50)] },
  chop:   { n: ['Chop', 'ฟัน'], ms: 160, f: [A(0, -1, 1, -100, 110, -170), A(0, -1, 1, -30, 110, -80), A(0, -1, 1, 10, 110, 0), A(0, -1, 1, 20, 110, 30)] },
  hammer: { n: ['Hammer', 'ตอก'], ms: 130, f: [A(3, -2, 3, -40, 80, -100), A(3, -2, 3, 40, 80, 30), A(3, -2, 3, -40, 80, -100), A(3, -2, 3, 50, 80, 50)] },
  fish:   { n: ['Fish', 'ตกปลา'], ms: 420, f: [A(0, 0, 0, -110, 100, -130), A(0, 0, 0, -20, 100, -25, 'line'), A(0, 0, 0, 0, 100, -20, 'line'), A(0, 0, 0, 5, 100, -15, 'dip')] },
  herd:   { n: ['Herd', 'ต้อนสัตว์'], ms: 380, f: [A(0, 0, 0, 60, 100, -80), A(0, 0, 0, 40, 100, -60), A(0, 0, 0, 20, 100, -40, 'call'), A(0, 0, 0, 40, 100, -60)] },
  gather: { n: ['Gather', 'เก็บผล'], ms: 270, f: [A(0, 0, 0, 80, 100), A(2, 0, 0, 100, 100), A(3, 0, 0, 110, 110, null, 'fruit'), A(1, 0, 0, 160, 100, null, 'fruit')] },
  trade:  { n: ['Trade', 'ค้าขาย'], ms: 300, f: [A(0, 0, 0, 20, 100), A(0, 0, 0, -30, 100), A(0, 0, 0, 30, 100, null, 'coin'), A(0, 0, 0, 80, 100)] },
  pray:   { n: ['Pray', 'สวดมนต์'], ms: 460, f: [A(0, 0, 0, -60, -120), A(0, 0, 0, -80, -100, null, 'glow'), A(1, 0, 0, 40, 140), A(1, 0, 0, 60, 120)] },
  read:   { n: ['Read', 'อ่านหนังสือ'], ms: 600, f: [A(0, 0, 0, 20, 40), A(0, 0, 0, 20, 40), A(0, 0, 0, 20, 40, null, 'flip'), A(0, 0, 0, 20, 40)] },
  cheer:  { n: ['Cheer', 'โห่ร้อง'], ms: 150, f: [A(1, 0, 0, -60, -120), A(0, 0, 0, -100, -80, null, 'jump'), A(0, 0, 0, -110, -70, null, 'jump'), A(1, 0, 0, -60, -120)] },
  attack: { n: ['Strike', 'ฟันดาบ'], ms: 110, f: [A(0, -1, 1, -120, 110, -150), A(0, 0, 2, -40, 110, -50), A(0, 0, 3, 30, 120, 40), A(0, -1, 1, 70, 110, 70)] },
  thrust: { n: ['Thrust', 'แทงหอก'], ms: 110, f: [A(0, -1, 1, 90, 110, -10), A(0, 0, 2, 30, 100, 0), A(0, 1, 3, 0, 90, 0), A(0, -1, 1, 60, 110, -30)] },
  shoot:  { n: ['Shoot', 'ยิง'], ms: 170, f: [A(0, -1, 1, 0, 30, 0, 'aim'), A(0, -1, 1, 0, 0, 0, 'aim'), A(0, -1, 1, 0, 20, 0, 'fire'), A(0, -1, 1, 20, 70, 20)] },
  hurt:   { n: ['Hurt', 'บาดเจ็บ'], ms: 110, f: [A(0, 0, 0, 130, 60, null, 'hurt'), A(1, -1, 0, 150, 40, null, 'hurt'), A(0, 0, 0, 110, 70), A(0, 0, 0, 90, 100)] },
};
// how each tool hangs when the action does not set its angle
const GEAR = { hoe: { len: 6, hold: -70 }, pick: { len: 5, hold: -60 }, axe: { len: 5, hold: -60 }, hammer: { len: 3, hold: 60 }, rod: { len: 7, hold: -60 }, staff: { len: 7, hold: -85 },
  club: { len: 4, hold: -60 }, sword: { len: 4, hold: 40 }, spear: { len: 8, hold: -88 }, musket: { len: 6, hold: -80 }, bow: { len: 0, hold: 0 }, book: { len: 0 }, bag: { len: 0 } };

function shadeC(c, f) { const n = parseInt(c.slice(1), 16), ch = v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0'); return '#' + ch(n >> 16) + ch((n >> 8) & 255) + ch(n & 255); }
const _cf = new Map();
function charFrame(role, act, fi, civCol, skin) {
  skin = skin % 4; // only four looks exist; keeps the cache small
  const key = role + act + fi + civCol + skin;
  let cv = _cf.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d'); drawRig(g, ROLES[role], ACTIONS[act].f[fi], civCol, skin); outline(g);
  _cf.set(key, cv); return cv;
}
function charAnim(role, act, tms, seed, civCol, skin) {
  const a = ACTIONS[act] || ACTIONS.idle, fi = Math.floor(tms / a.ms + (seed || 0)) % a.f.length;
  return charFrame(role, ACTIONS[act] ? act : 'idle', fi, civCol || '#c8402e', skin || 0);
}
function drawRig(ctx, R, p, civCol, skin) {
  const px = (x, y, c) => { x = Math.round(x) + OX; y = Math.round(y) + OY; if (!c || x < 0 || y < 0 || x >= CW || y >= CH) return; ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  const dir = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
  const ray = (x, y, a, n, colOf) => { const [dx, dy] = dir(a); let ex = x, ey = y; for (let i = 0; i <= n; i++) { ex = Math.round(x + dx * i); ey = Math.round(y + dy * i); px(ex, ey, colOf(i)); } return { x: ex, y: ey }; };
  const shirt = R.shirt === 'civ' ? civCol : R.shirt, pants = R.pants === 'civ' ? civCol : R.pants, sk = SKINS[skin % 4], hair = HAIR[skin % 4];
  const jy = p.x === 'jump' ? 2 : 0, top = 3 + p.by - jy, hipY = top + 8, feet = 15 - jy;
  const sF = { x: 7, y: top + 4 }, sB = { x: 4, y: top + 4 };
  // cape / pack / basket behind the body
  if (R.cape) for (let y = top + 4; y <= Math.min(feet - 1, top + 11); y++) { px(3, y, shadeC(shirt, 0.7)); px(2, y + 1, shadeC(shirt, 0.6)); }
  if (R.pack) { for (let y = top + 4; y <= top + 7; y++) { px(2, y, WOOD); px(3, y, WOOD2); } px(2, top + 3, '#f2c14e'); }
  if (R.basket) { for (let y = top + 5; y <= top + 7; y++) { px(2, y, WOOD2); px(3, y, WOOD); } px(2, top + 4, '#5d8a3a'); px(3, top + 4, '#c8402e'); }
  // back arm
  ray(sB.x, sB.y, p.ab, 3, i => (i < 2 && !R.robe ? shadeC(shirt, 0.75) : i < 3 && R.robe ? shadeC(shirt, 0.75) : shadeC(sk, 0.85)));
  // legs (robes cover them down to the feet)
  const legCol = R.robe ? shirt : pants;
  ray(5, hipY, Math.atan2(feet - hipY, p.fl) * 180 / Math.PI, Math.max(1, Math.hypot(p.fl, feet - hipY)), i => shadeC(legCol, 0.8));
  ray(6, hipY, Math.atan2(feet - hipY, p.fr) * 180 / Math.PI, Math.max(1, Math.hypot(p.fr, feet - hipY)), () => legCol);
  px(5 + p.fl, feet, OUT); px(6 + p.fr, feet, OUT); px(7 + p.fr, feet, OUT);
  if (R.robe) for (let y = hipY; y < feet; y++) { px(4, y, shadeC(shirt, 0.85)); px(5, y, shirt); px(6, y, shirt); px(7, y, shadeC(shirt, 0.9)); }
  // torso + belt
  for (let y = top + 4; y < hipY; y++) for (let x = 4; x <= 7; x++) px(x, y, x === 4 ? shadeC(shirt, 0.85) : shirt);
  for (let x = 4; x <= 7; x++) px(x, hipY - 1, R.shirt === 'civ' ? shadeC(civCol, 0.5) : civCol);
  if (R.badge) px(6, top + 5, civCol);
  // head
  for (let y = top; y < top + 4; y++) for (let x = 4; x <= 7; x++) px(x, y, sk);
  px(4, top, hair); px(5, top, hair); px(6, top, hair); px(7, top, hair); px(4, top + 1, hair); px(4, top + 2, hair);
  px(7, top + 1, OUT);
  if (p.x === 'hurt') { px(6, top + 1, OUT); px(7, top + 1, OUT); px(6, top + 3, OUT); }
  drawHat(px, R.hat, top, civCol);
  // front arm + tool
  const hand = ray(sF.x, sF.y, p.af, 3, i => (i < 2 || (R.robe && i < 3) ? shirt : sk));
  const T = R.tool && GEAR[R.tool], ta = p.ta != null ? p.ta : T ? T.hold : 0;
  if (T) drawTool(px, ray, dir, R.tool, hand, ta, p, sB, feet);
  // effects
  const x = p.x;
  if (x === 'fruit') px(hand.x, hand.y - 1, '#c8402e');
  if (x === 'coin') { px(hand.x, hand.y - 2, '#f2c14e'); px(hand.x + 1, hand.y - 3, '#f2c14e'); }
  if (x === 'glow') { px(5, top - 2, '#fff3a0'); px(6, top - 3, '#fff3a0'); px(3, top - 1, '#fff3a0'); px(8, top - 1, '#fff3a0'); }
  if (x === 'call') { px(9, top, '#ffffff'); px(10, top - 1, '#ffffff'); }
  if (x === 'hurt') for (let y = top + 4; y < hipY; y += 2) px(5 + (y % 3), y, '#ff5a46');
}
// 1px dark outline around the silhouette so figures read on any terrain
function outline(g) {
  const d = g.getImageData(0, 0, CW, CH), a = i => d.data[i * 4 + 3], out = [];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x; if (a(i)) continue;
    if ((x > 0 && a(i - 1)) || (x < CW - 1 && a(i + 1)) || (y > 0 && a(i - CW)) || (y < CH - 1 && a(i + CW))) out.push(i);
  }
  for (const i of out) { d.data[i * 4] = 26; d.data[i * 4 + 1] = 20; d.data[i * 4 + 2] = 32; d.data[i * 4 + 3] = 150; }
  g.putImageData(d, 0, 0);
}
function drawHat(px, h, top, civCol) {
  const row = (y, x0, x1, c) => { for (let x = x0; x <= x1; x++) px(x, y, c); };
  switch (h) {
    case 'straw': row(top - 1, 5, 7, '#e8d070'); row(top, 3, 9, '#c8a848'); break;
    case 'lamp': row(top - 1, 4, 7, '#c8a848'); row(top, 4, 7, '#a88a38'); px(8, top, '#fff3a0'); px(9, top, '#fff3a0'); break;
    case 'cap': row(top - 1, 4, 7, '#c8402e'); row(top, 4, 9, '#8a1f2b'); break;
    case 'band': row(top + 1, 4, 7, civCol); px(3, top + 2, civCol); break;
    case 'bucket': row(top - 1, 4, 7, '#2f5a8a'); row(top, 3, 8, '#4a7ab8'); break;
    case 'hood': row(top - 1, 4, 7, '#5d6a3a'); px(4, top, '#5d6a3a'); px(4, top + 1, '#5d6a3a'); px(4, top + 2, '#5d6a3a'); px(3, top + 1, '#4a5530'); px(3, top + 2, '#4a5530'); px(3, top + 3, '#4a5530'); break;
    case 'scarf': row(top - 1, 4, 7, '#f2a0c8'); row(top, 4, 6, '#f2a0c8'); px(3, top + 1, '#f2a0c8'); px(3, top + 2, '#d07aa8'); break;
    case 'turban': row(top - 2, 5, 6, '#f0e8d0'); row(top - 1, 4, 7, '#f0e8d0'); row(top, 4, 7, '#d8c8a8'); px(6, top - 1, '#c8402e'); break;
    case 'mitre': row(top - 3, 5, 6, '#f0e8d0'); row(top - 2, 5, 6, '#f2c14e'); row(top - 1, 4, 7, '#f0e8d0'); row(top, 4, 7, '#f0e8d0'); break;
    case 'square': row(top - 1, 3, 8, '#1a1420'); row(top, 4, 7, '#2a2a3a'); px(8, top, '#f2c14e'); px(8, top + 1, '#f2c14e'); break;
    case 'crown': px(4, top - 2, '#f2c14e'); px(6, top - 2, '#f2c14e'); px(7, top - 2, '#f2c14e'); row(top - 1, 4, 7, '#f2c14e'); px(5, top - 1, '#c8402e'); break;
    case 'wide': row(top - 1, 5, 7, '#7a5a3a'); row(top, 3, 9, '#5a4028'); break;
    case 'feather': row(top - 1, 4, 7, '#3a5a3a'); px(3, top - 2, '#c8402e'); px(3, top - 3, '#c8402e'); px(2, top - 3, '#e8603e'); break;
    case 'helmet': row(top - 1, 4, 7, METAL); px(4, top, METAL2); px(4, top + 1, METAL2); px(7, top, METAL); row(top - 2, 5, 6, civCol); break;
    case 'helmetG': row(top - 1, 3, 8, '#4a5a30'); row(top, 4, 7, '#5d7a3a'); break;
    case 'tricorn': row(top - 1, 4, 7, '#1a1420'); row(top, 3, 8, '#2a2a3a'); px(5, top - 1, '#f2c14e'); break;
  }
}
function drawTool(px, ray, dir, tool, hand, ta, p, sB, feet) {
  const [dx, dy] = dir(ta), perp = [-dy, dx], h = hand;
  const tip = tool === 'bow' || tool === 'book' || tool === 'bag' ? h : ray(h.x, h.y, ta, GEAR[tool].len, i => (i === 0 ? null : tool === 'sword' ? METAL : tool === 'musket' ? (i < 3 ? WOOD : '#3a3a48') : tool === 'rod' ? '#6a4a24' : WOOD));
  const at = (k, j, c) => px(tip.x + perp[0] * k + dx * j, tip.y + perp[1] * k + dy * j, c);
  switch (tool) {
    case 'hoe': at(1, 0, METAL); at(2, -0.5, METAL2); break;
    case 'pick': at(1, 0, METAL); at(-1, 0, METAL); at(2, -1, METAL2); at(-2, -1, METAL2); break;
    case 'axe': at(1, 0, METAL); at(1, -1, METAL); at(2, -0.5, METAL2); break;
    case 'hammer': at(1, 0, METAL2); at(-1, 0, METAL2); at(0, 1, METAL); break;
    case 'staff': at(0, 1, WOOD2); break;
    case 'club': at(1, 0, WOOD2); at(1, -1, WOOD); at(0, 1, WOOD2); break;
    case 'sword': px(h.x + perp[0], h.y + perp[1], '#f2c14e'); px(h.x - perp[0], h.y - perp[1], '#f2c14e'); at(0, 1, '#ffffff'); break;
    case 'spear': at(0, 1, METAL); at(0, 2, METAL); break;
    case 'musket': if (p.x === 'fire') { at(0, 1, '#fff3a0'); at(0, 2, '#f59a3a'); at(1, 2, '#f59a3a'); at(-1, 2, '#f59a3a'); } break;
    case 'rod':
      if (p.x === 'line' || p.x === 'dip') { const wy = p.x === 'dip' ? feet : feet - 1; for (let y = tip.y + 1; y < wy; y++) px(tip.x + 1, y, '#e8e0c8'); px(tip.x + 1, wy, '#c8402e'); if (p.x === 'dip') { px(tip.x, wy, '#9ad4f0'); px(tip.x + 2, wy, '#9ad4f0'); } }
      break;
    case 'bow': { // limbs curve forward of the hand; the string is pulled back while aiming
      const pull = p.x === 'aim' ? 3 : 0;
      for (let k = -3; k <= 3; k++) { const s = Math.abs(k); px(h.x + (s === 3 ? 0 : 1), h.y + k, s === 0 ? WOOD2 : WOOD); px(h.x - Math.round(pull * (1 - s / 3)), h.y + k, '#e8e0c8'); }
      if (p.x === 'aim') { for (let x = h.x - pull; x <= h.x + 2; x++) px(x, h.y, WOOD2); px(h.x + 3, h.y, METAL); }
      if (p.x === 'fire') { px(h.x + 3, h.y, WOOD2); px(h.x + 4, h.y, WOOD2); px(h.x + 5, h.y, METAL); }
      break;
    }
    case 'book': px(h.x, h.y - 1, '#8a1f2b'); px(h.x + 1, h.y - 1, '#8a1f2b'); px(h.x, h.y - 2, p.x === 'flip' ? '#ffffff' : '#e8e0c8'); px(h.x + 1, h.y - 2, '#e8e0c8'); if (p.x === 'flip') px(h.x + 1, h.y - 3, '#ffffff'); break;
    case 'bag': px(h.x, h.y + 1, '#7a5a3a'); px(h.x + 1, h.y + 1, '#9a7a4a'); px(h.x, h.y + 2, '#7a5a3a'); px(h.x + 1, h.y + 2, '#7a5a3a'); break;
  }
}
// role and action for a unit drawn as a person (null = keep its static sprite)
const UNIT_ROLE = { settler: 'settler', worker: 'builder', scout: 'scout', warrior: 'warrior', archer: 'archer', spearman: 'spearman', pikeman: 'spearman', swordsman: 'soldier', musketman: 'musketeer', rifleman: 'musketeer', infantry: 'infantry' };
const TASK_ROLE = { farm: 'farmer', mine: 'miner', lumber: 'lumberjack', road: 'builder', pasture: 'herder', plantation: 'gatherer' };
function boatCv() {
  if (boatCv.c) return boatCv.c;
  const c = document.createElement('canvas'); c.width = CW; c.height = 5; const x = c.getContext('2d');
  x.fillStyle = '#5a3a20'; x.fillRect(1, 1, 10, 2); x.fillRect(2, 3, 8, 1); x.fillStyle = '#8a5a2b'; x.fillRect(0, 0, 12, 1); x.fillStyle = '#9ad4f0'; x.fillRect(0, 4, 2, 1); x.fillRect(10, 4, 2, 1);
  return (boatCv.c = c);
}
