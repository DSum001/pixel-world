'use strict';
// Core rules: map, cities, units, combat, turns. No DOM here so tests can run it in node.
var S = null;          // whole game state (saved as JSON)
var VIS = null;        // human visibility this turn (not saved)
var onNotify = null;   // UI hook: (msg, x, y) => void
var onChron = null;     // UI hook: world chronicle entry
var onFx = null;
var onAnim = null;
var onVfx = null;      // UI hook: (kind, x, y) for disaster and blessing effects     // UI hook: (unit, 'atk' | 'hurt') for character animation       // UI hook: floating combat text (x, y, text)

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const FOCUS = { bal: [1.5, 1.2, 0.8], food: [3, 1, 0.5], prod: [1, 3, 0.5], gold: [1, 0.8, 3] };
const MAPSIZES = { small: [60, 38], medium: [84, 52], large: [112, 70], huge: [150, 94] };
const TURN_LIMIT = 300;

function seeded(a) { return () => { let t = (a = (a + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function R() { let t = (S.rs = (S.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function pick(a) { return a[Math.floor(R() * a.length)]; }

function inb(x, y) { return x >= 0 && y >= 0 && x < S.w && y < S.h; }
function T(x, y) { return S.map[y * S.w + x]; }
function dist(a, b, c, d) { return Math.max(Math.abs(a - c), Math.abs(b - d)); }
function around(x, y, r, fn) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (inb(nx, ny)) fn(nx, ny, dx, dy); } }
function fatCross(x, y, fn) { around(x, y, 2, (nx, ny, dx, dy) => { if (Math.abs(dx) + Math.abs(dy) < 4) fn(nx, ny); }); }
function passable(tl) { const d = TERRAIN[tl.t]; return !d.water && !d.block; }
// boats: after Sailing, land units may embark onto water (slow to board, weak while afloat)
function canSail(p) { return !p.barb && !!p.techs.sailing; }
function passFor(p, tl) { const d = TERRAIN[tl.t]; return !d.block && (!d.water || canSail(p)); }
function isWater(tl) { return !!TERRAIN[tl.t].water; }

function P(id) { return S.players[id]; }
function civDef(p) {
  if (p.barb) return BARB;
  if (!p.name) nameCiv(p);
  if (!p._def || p._def.n !== p.name) p._def = { ...CIVS[p.civ], n: p.name };
  return p._def;
}
/* ---------------- invented names ---------------- */
function pickOf(rnd, a) { return a[Math.floor(rnd() * a.length)]; }
function joinName(parts) { const en = parts.map(q => q[0]).join(''); return [en.charAt(0).toUpperCase() + en.slice(1), parts.map(q => q[1]).join('')]; }
// stem of one or two syllables, never the same syllable twice in a row
function stem(rnd, cu, n) { const parts = [pickOf(rnd, cu.syl)]; while (parts.length < n) { const s = pickOf(rnd, cu.syl); if (s !== parts[parts.length - 1]) parts.push(s); } return parts; }
function nameCiv(p) {
  const rnd = seeded(S.seed * 31 + p.id * 977 + 7);
  if (p.cul == null) { // a culture no other civilization uses, when one is left
    const used = new Set(S.players.filter(q => q !== p && q.cul != null).map(q => q.cul)), all = CULTURES.map((c, i) => i), free = all.filter(i => !used.has(i));
    p.cul = pickOf(rnd, free.length ? free : all);
  }
  const cu = CULTURES[p.cul], base = joinName([...stem(rnd, cu, rnd() < 0.25 ? 2 : 1), pickOf(rnd, cu.end)]), title = pickOf(rnd, TITLES);
  p.name = [title[0] + base[0], title[1] + base[1]];
  if (!p.leader) p.leader = newLeader(p, rnd);
}
// a ruler: a personal name from the civilization's own language, and a temperament that steers its choices
function newLeader(p, rnd = R) {
  const cu = CULTURES[p.cul];
  return { n: joinName(stem(rnd, cu, 2)), trait: TRAITS[Math.floor(rnd() * TRAITS.length)], since: S.turn };
}
function trait(p) { return p.leader ? p.leader.trait : null; }
function genCityName(p) {
  civDef(p);
  const cu = CULTURES[p.cul], used = new Set(S.cities.map(c => c.name[0]));
  for (let k = 0; k < 40; k++) {
    const rnd = seeded(S.seed * 17 + p.id * 7919 + p.nameIdx * 31 + k * 104729);
    const parts = stem(rnd, cu, rnd() < 0.15 ? 2 : 1); // mostly two pieces: short, readable names
    parts.push(rnd() < 0.7 ? pickOf(rnd, cu.city) : pickOf(rnd, cu.syl.filter(s => s !== parts[parts.length - 1])));
    const n = joinName(parts); if (!used.has(n[0])) return n;
  }
  const n = joinName(stem(seeded(p.nameIdx), cu, 2)); return [n[0] + ' ' + p.nameIdx, n[1] + ' ' + p.nameIdx];
}
function civName(p) { return nm(civDef(p)); }
function cname(c) { return c.name[LANG === 'th' ? 1 : 0]; }
// id -> city, rebuilt whenever a city is founded or destroyed (or a save is loaded)
let _cid = null, _cidArr = null, _cidN = -1;
function cityById(id) {
  if (_cidArr !== S.cities || _cidN !== S.cities.length) { _cid = new Map(S.cities.map(c => [c.id, c])); _cidArr = S.cities; _cidN = S.cities.length; }
  const c = _cid.get(id);
  if (c && c.id === id) return c;
  return (c === undefined && _cid.size === S.cities.length) ? null : S.cities.find(o => o.id === id) || null;
}
function cityAt(x, y) { const i = T(x, y).city; return i >= 0 ? cityById(i) : null; }
function citiesOf(p) { return S.cities.filter(c => c.o === p.id); }
function unitsOf(p) { return S.units.filter(u => u.o === p.id); }
function isCiv(u) { return UNITS[u.type].cls === 'civ'; }
function hasTech(p, t) { return !!p.techs[t]; }
function techCount(p) { return Object.keys(p.techs).length; }
function barbP() { return S.players.find(p => p.barb); }
function humanP() { const p = S.players[S.hp]; return p && p.human ? p : null; }
function atWar(a, b) { if (a === b) return false; if (a.barb || b.barb) return true; return !!a.war[b.id]; }
function notify(p, msg, x, y) { if (p && p.human && onNotify) onNotify(msg, x, y); }
function vfx(k, x, y) { if (onVfx) onVfx(k, x, y); }
// seasons: 120-day year, 0 hot, 1 rainy, 2 cool (40 days each)
function seasonOf(tn) { return Math.floor((tn % 120) / 40); }
function anim(u, k) { if (onAnim && u) onAnim(u, k); }
function fx(x, y, v) { if (onFx && (!humanP() || VIS[y * S.w + x])) onFx(x, y, String(v)); }
// chronicle of world events; args are [en, th] pairs or plain values
function chron(k, a, x, y) { if (!S.god) return; const e = { t: S.turn, k, a, x, y }; S.chron.push(e); if (S.chron.length > 500) S.chron.shift(); if (onChron) onChron(e); }
function aiMul(p) { return p.human || p.barb ? 1 : { easy: 0.8, normal: 1, hard: 1.25 }[S.diff]; }

// unit grid cache, rebuilt when S.uver changes
// unit grid: tile index -> units there, kept up to date on every add, move and removal
let _ug = null, _ugS = null;
const NO_UNITS = Object.freeze([]);
function resetCaches() { _ug = null; _ugS = null; _reg = null; _cd = null; }
function ugrid() {
  if (!_ug || _ugS !== S) { _ug = new Map(); _ugS = S; for (const u of S.units) gridAdd(u); }
  return _ug;
}
function gridAdd(u) { const k = u.y * S.w + u.x; let a = _ug.get(k); if (!a) _ug.set(k, a = []); a.push(u); }
function gridDel(u) { const k = u.y * S.w + u.x, a = _ug.get(k); if (!a) return; const i = a.indexOf(u); if (i >= 0) a.splice(i, 1); if (!a.length) _ug.delete(k); }
function uat(x, y) {
  return ugrid().get(y * S.w + x) || NO_UNITS;
}
function setPos(u, x, y) { if (_ug && _ugS === S) gridDel(u); u.x = x; u.y = y; if (_ug && _ugS === S) gridAdd(u); S.uver++; }

/* ---------------- map generation ---------------- */
function makeNoise(rand) {
  const v = new Float32Array(65536); for (let i = 0; i < v.length; i++) v[i] = rand();
  const sm = t => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), w = sm(y - yi);
    const g = (a, b) => v[((b & 255) << 8) | (a & 255)];
    const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  return (x, y, oct = 4) => { let s = 0, amp = 1, f = 1, tot = 0; for (let i = 0; i < oct; i++) { s += n(x * f + i * 31, y * f + i * 17) * amp; tot += amp; amp *= 0.5; f *= 2; } return s / tot; };
}
function rank(vals) { const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]); const r = new Float32Array(vals.length); idx.forEach((k, i) => { r[k] = i / Math.max(1, vals.length - 1); }); return r; }

function genMap(w, h, seed, np, landFrac = 0.44, heat = 0) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const rand = seeded(seed + attempt * 7919);
    const ne = makeNoise(rand), nmo = makeNoise(rand), nt = makeNoise(rand);
    const elev = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = x / w - 0.5, ny = y / h - 0.5, d = Math.sqrt(nx * nx + ny * ny * 1.4) * 2;
      elev.push(landFrac < 0.35 ? ne(x / 4.5, y / 4.5, 4) - d * d * 0.25 : ne(x / 8, y / 8, 5) - d * d * 0.45); // islands: finer noise, many landmasses
    }
    const er = rank(elev);
    const map = [];
    const landIdx = [];
    for (let i = 0; i < w * h; i++) {
      const land = er[i] > 1 - landFrac;
      map.push({ t: land ? 'grass' : 'ocean', res: null, imp: null, road: false, owner: -1, oc: -1, city: -1, camp: false, ruin: false });
      if (land) landIdx.push(i);
    }
    const lr = rank(landIdx.map(i => elev[i]));
    const mr = rank(landIdx.map(i => { const x = i % w, y = (i / w) | 0; return nmo(x / 6, y / 6, 4); }));
    landIdx.forEach((i, k) => {
      const x = i % w, y = (i / w) | 0, tl = map[i];
      const lat = Math.abs(y / (h - 1) - 0.5) * 2;
      const temp = heat + 1 - lat * 1.15 + (nt(x / 5, y / 5, 3) - 0.5) * 0.4, m = mr[k];
      let t;
      if (temp < 0.1) t = 'snow';
      else if (temp < 0.27) t = m > 0.6 ? 'forest' : 'tundra';
      else if (m < 0.2 && temp > 0.45) t = 'desert';
      else if (temp > 0.7 && m > 0.66) t = 'jungle';
      else if (m > 0.68) t = 'forest';
      else if (m > 0.36) t = 'grass';
      else t = 'plains';
      if (lr[k] > 0.95) t = 'mountain'; else if (lr[k] > 0.83 || (rand() < 0.05 && t !== 'snow')) t = 'hills';
      tl.t = t;
    });
    for (let i = 0; i < w * h; i++) {
      if (map[i].t !== 'ocean') continue;
      const x = i % w, y = (i / w) | 0; let near = false;
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && !TERRAIN[map[ny * w + nx].t].water) near = true; }
      if (near) map[i].t = 'coast';
    }
    const resKeys = Object.keys(RES);
    for (const tl of map) {
      if (tl.t === 'coast') { if (rand() < 0.12) tl.res = 'fish'; continue; }
      if (TERRAIN[tl.t].water || tl.t === 'mountain') continue;
      if (rand() < 0.14) { const ok = resKeys.filter(r => RES[r].on.includes(tl.t) && r !== 'fish'); if (ok.length) tl.res = ok[Math.floor(rand() * ok.length)]; }
    }
    // largest connected passable landmass
    const reg = new Int32Array(w * h).fill(-1), regN = []; let best = -1, bestN = 0, rid = 0;
    for (let i = 0; i < w * h; i++) {
      if (reg[i] >= 0 || !passable(map[i])) continue;
      const st = [i]; reg[i] = rid; let n = 0;
      while (st.length) { const k = st.pop(); n++; const x = k % w, y = (k / w) | 0; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (reg[j] < 0 && passable(map[j])) { reg[j] = rid; st.push(j); } } }
      regN[rid] = n; if (n > bestN) { bestN = n; best = rid; } rid++;
    }
    const isles = landFrac < 0.35; // islands: civilizations may start on any island big enough to grow on
    const okReg = r => (isles ? regN[r] >= 30 : r === best);
    if (!isles && bestN < w * h * landFrac * 0.45) continue;
    const yieldAt = i => { const tl = map[i], d = TERRAIN[tl.t]; let s = d.y[0] * 1.4 + d.y[1] + d.y[2] * 0.5; if (tl.res) s += 1.5; return s; };
    const cands = [];
    for (let i = 0; i < w * h; i++) {
      const x = i % w, y = (i / w) | 0;
      if (!okReg(reg[i]) || x < 3 || y < 3 || x >= w - 3 || y >= h - 3) continue;
      if (!['grass', 'plains', 'hills'].includes(map[i].t)) continue;
      let s = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dy) > 3) continue; const j = (y + dy) * w + x + dx; s += yieldAt(j); }
      cands.push({ i, x, y, s });
    }
    cands.sort((a, b) => b.s - a.s);
    const good = cands.slice(0, Math.max(np * 4, Math.floor(cands.length * 0.5)));
    if (good.length < np) continue;
    const starts = [good[Math.floor(rand() * Math.min(10, good.length))]];
    while (starts.length < np) {
      let bc = null, bd = -1;
      for (const c of good) { const md = Math.min(...starts.map(s => dist(s.x, s.y, c.x, c.y))); if (md > bd) { bd = md; bc = c; } }
      if (bd < 6) break; starts.push(bc);
    }
    if (starts.length < np) continue;
    for (const s of starts) { map[s.i].res = null; }
    let ruins = 0;
    for (let k = 0; k < 400 && ruins < Math.floor(bestN / 70); k++) {
      const i = Math.floor(rand() * w * h), x = i % w, y = (i / w) | 0;
      if (!okReg(reg[i]) || map[i].ruin) continue;
      if (starts.some(s => dist(s.x, s.y, x, y) < 4)) continue;
      map[i].ruin = true; ruins++;
    }
    return { map, starts };
  }
  throw new Error('map generation failed');
}

/* ---------------- setup ---------------- */
function newPlayer(id, civ, human, barb) {
  return { id, civ, human: !!human, barb: !!barb, alive: true, gold: 10, sci: 0, research: null, rq: [], techs: { agriculture: 1 }, nameIdx: 0, met: {}, war: {}, peaceT: {}, warT: {}, culture: 0, everCity: false, launched: false };
}
// random terrain for a new world (also used for the setup preview)
function genWorld(w, h, seed, np, o) { return genMap(w, h, seed, np, { islands: 0.3, continents: 0.44, pangaea: 0.56 }[o.land || 'continents'], { cold: -0.18, temperate: 0, hot: 0.18 }[o.climate || 'temperate']); }
// an empty world to shape by hand: all ocean, or all grassland
function blankMap(w, h, base) {
  const map = [];
  for (let i = 0; i < w * h; i++) map.push({ t: base === 'land' ? 'grass' : 'ocean', res: null, imp: null, road: false, owner: -1, oc: -1, city: -1, camp: false, ruin: false });
  return { map, starts: [] };
}
function newGame(o) {
  const [w, h] = MAPSIZES[o.size || 'medium'];
  const seed = o.seed != null ? o.seed : Math.floor(Math.random() * 1e9);
  const nAI = Math.min(CIVS.length - 1, Math.max(1, o.ai || 3)), nCiv = o.blank ? 0 : nAI + 1;
  const g = o.blank ? blankMap(w, h, o.blank) : genWorld(w, h, seed, nCiv, o);
  S = { v: 1, w, h, seed, land: g.map.filter(passable).length, rs: seed ^ 0x5bd1e995, turn: 0, map: g.map, players: [], units: [], cities: [], nid: 1, uver: 0, ver: 0, diff: o.diff || 'normal', hp: o.god ? -1 : 0, god: !!o.god, chron: [], winner: null, offers: [], seen: new Array(w * h).fill(0) };
  resetCaches();
  const pool = CIVS.map((c, i) => i).filter(i => i !== (o.civ || 0));
  const civs = nCiv ? [o.civ || 0] : [];
  while (civs.length < nCiv) civs.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  civs.forEach((ci, i) => S.players.push(newPlayer(i, ci, i === 0 && !o.allAI)));
  S.players.forEach(p => civDef(p)); // name every civilization now so cultures are spread out
  S.players.push(newPlayer(S.players.length, -1, false, true));
  S.players.forEach(p => { if (!p.barb) S.players.forEach(q => { if (q !== p && !q.barb) { p.war[q.id] = 0; } }); });
  g.starts.forEach((s, i) => {
    const p = S.players[i];
    addUnit(p, 'settler', s.x, s.y);
    const adj = freeNear(s.x, s.y, false) || s;
    addUnit(p, 'warrior', adj.x, adj.y);
    const adj2 = freeNear(s.x, s.y, false) || s;
    addUnit(p, 'scout', adj2.x, adj2.y);
  });
  S.players.forEach(p => { if (!p.human && !p.barb) aiPickResearch(p); });
  updateVis();
  return S;
}

/* ---------------- units ---------------- */
function addUnit(p, type, x, y) {
  const u = { id: S.nid++, type, o: p.id, x, y, mp: UNITS[type].mv * 3, hp: 100, xp: 0, lvl: 0, fort: 0, sleep: false, path: null, task: null, moved: false, auto: false };
  S.units.push(u); if (_ug && _ugS === S) gridAdd(u); S.uver++; return u;
}
function killUnit(u) { const i = S.units.indexOf(u); if (i >= 0) { S.units.splice(i, 1); if (_ug && _ugS === S) gridDel(u); S.uver++; } }
function freeNear(x, y, civ, r = 2) {
  for (let rr = 1; rr <= r; rr++) {
    let found = null;
    around(x, y, rr, (nx, ny) => { if (found || dist(x, y, nx, ny) !== rr) return; const tl = T(nx, ny); if (!passable(tl) || tl.city >= 0) return; if (uat(nx, ny).length) return; found = { x: nx, y: ny }; });
    if (found) return found;
  }
  return null;
}
function moveCost(fx, fy, tx, ty) {
  const a = T(fx, fy), b = T(tx, ty);
  if (isWater(a) !== isWater(b)) return 6; // boarding or landing ends the move (see stepTo)
  if (isWater(b)) return 3;
  if ((a.road || a.city >= 0) && (b.road || b.city >= 0)) return 1;
  return (TERRAIN[b.t].mv || 1) * 3;
}
function canEnterTerritory(p, tl) {
  if (tl.owner < 0 || tl.owner === p.id || p.barb) return true;
  return atWar(p, P(tl.owner));
}
// what happens if u steps onto (x,y): ok | stack | attack | capture | no
function stepKind(u, x, y) {
  const tl = T(x, y), p = P(u.o), civ = isCiv(u), afloat = isWater(T(u.x, u.y));
  if (!passFor(p, tl)) return 'no';
  const c = tl.city >= 0 ? cityById(tl.city) : null;
  if (c && c.o !== u.o) return !civ && !afloat && atWar(p, P(c.o)) ? 'attack' : 'no';
  const us = uat(x, y);
  const em = us.find(o => o.o !== u.o && !isCiv(o));
  if (em) return !civ && !afloat && atWar(p, P(em.o)) ? 'attack' : 'no';
  const ec = us.find(o => o.o !== u.o);
  if (ec) return !civ && atWar(p, P(ec.o)) ? 'capture' : 'no';
  if (!canEnterTerritory(p, tl)) return 'no';
  if (us.some(o => o !== u && isCiv(o) === civ)) return 'stack';
  return 'ok';
}

function heapPush(h, n) { h.push(n); let i = h.length - 1; while (i > 0) { const pa = (i - 1) >> 1; if (h[pa][0] <= h[i][0]) break; [h[pa], h[i]] = [h[i], h[pa]]; i = pa; } }
function heapPop(h) { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; }

// landmass id per tile, so searches between unconnected land give up at once
let _reg = null, _regKey = '';
// sea = true: regions for units that can sail (land and water joined, only mountains block)
let _regSea = null;
function regionOf(i, sea) {
  const key = (S.tver || 0) + '|' + S.seed + '|' + S.map.length; // only terrain edits change passability
  if (key !== _regKey || !_reg) {
    _regKey = key;
    const flood = ok => {
      const r = new Int32Array(S.map.length).fill(-1); let id = 0;
      for (let i0 = 0; i0 < S.map.length; i0++) {
        if (r[i0] >= 0 || !ok(S.map[i0])) continue;
        const st = [i0]; r[i0] = id;
        while (st.length) { const k = st.pop(), x = k % S.w, y = (k / S.w) | 0; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S.w || ny >= S.h) continue; const j = ny * S.w + nx; if (r[j] < 0 && ok(S.map[j])) { r[j] = id; st.push(j); } } }
        id++;
      }
      return r;
    };
    _reg = flood(passable); _regSea = flood(tl => !TERRAIN[tl.t].block);
  }
  return (sea ? _regSea : _reg)[i];
}
// reusable search buffers; a generation stamp marks which entries belong to the current search
let PF = null;
function pfBuffers() {
  const n = S.map.length;
  if (!PF || PF.n !== n) PF = { n, g: new Float64Array(n), came: new Int32Array(n), stamp: new Uint32Array(n), gen: 0 };
  if (++PF.gen > 4e9) { PF.stamp.fill(0); PF.gen = 1; }
  return PF;
}
// A* path for unit u to (tx,ty). Target may hold an enemy (path ends with the attack step).
function findPath(u, tx, ty, maxN = 9000) {
  if (!inb(tx, ty)) return null;
  const p = P(u.o), w = S.w, h = S.h, start = u.y * w + u.x, goal = ty * w + tx, map = S.map;
  if (start === goal) return [];
  const sea = canSail(p);
  if (!passFor(p, map[goal]) || regionOf(start, sea) !== regionOf(goal, sea)) return null;
  const B = pfBuffers(), gen = B.gen, G = B.g, came = B.came, stamp = B.stamp;
  stamp[start] = gen; G[start] = 0; came[start] = -1;
  const open = [[dist(u.x, u.y, tx, ty), start]];
  let n = 0, found = false;
  while (open.length && n++ < maxN) {
    const k = heapPop(open)[1];
    if (k === goal) { found = true; break; }
    const x = k % w, y = (k / w) | 0, gk = G[k], a = map[k], aRoad = a.road || a.city >= 0, aWet = isWater(a);
    for (let d = 0; d < 8; d++) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nk = ny * w + nx, tl = map[nk];
      if (!passFor(p, tl)) continue;
      if (nk !== goal) {
        if (tl.owner >= 0 && tl.owner !== p.id && !canEnterTerritory(p, tl)) continue;
        if (tl.city >= 0 && cityById(tl.city).o !== u.o) continue;
        const us = uat(nx, ny); if (us.length && us.some(o => o.o !== u.o)) continue;
      }
      const wet = isWater(tl), ng = gk + (wet !== aWet ? 6 : wet ? 3 : aRoad && (tl.road || tl.city >= 0) ? 1 : (TERRAIN[tl.t].mv || 1) * 3);
      if (stamp[nk] !== gen || ng < G[nk]) { stamp[nk] = gen; G[nk] = ng; came[nk] = k; heapPush(open, [ng + 2.5 * Math.max(Math.abs(nx - tx), Math.abs(ny - ty)), nk]); } // weighted toward the usual 3-per-tile step: near-best routes, far fewer tiles searched
    }
  }
  if (!found && !(stamp[goal] === gen)) return null;
  if (!found) return null;
  const path = []; let k = goal;
  while (k !== start) { path.push({ x: k % w, y: (k / w) | 0 }); k = came[k]; }
  return path.reverse();
}
// tiles reachable this turn: Map idx -> remaining mp
function reachable(u) {
  const w = S.w, res = new Map([[u.y * w + u.x, u.mp]]), q = [[u.x, u.y, u.mp]];
  while (q.length) {
    const [x, y, mp] = q.shift();
    if (mp <= 0) continue;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue;
      const k = stepKind(u, nx, ny); if (k === 'no' || k === 'attack') continue;
      const left = Math.max(0, mp - moveCost(x, y, nx, ny)), nk = ny * w + nx;
      if ((res.get(nk) ?? -1) < left) { res.set(nk, left); if (k !== 'capture') q.push([nx, ny, left]); }
    }
  }
  return res;
}
function stepTo(u, x, y, free) {
  const boarding = isWater(T(u.x, u.y)) !== isWater(T(x, y));
  if (!free) u.mp = boarding ? 0 : Math.max(0, u.mp - moveCost(u.x, u.y, x, y));
  setPos(u, x, y); u.moved = true; u.fort = 0; u.sleep = false; u.task = null;
  const p = P(u.o), tl = T(x, y);
  if (!isCiv(u)) for (const o of uat(x, y).slice()) {
    if (o.o !== u.o && isCiv(o)) { notify(P(o.o), t('unitLost', nm(UNITS[o.type])), x, y); o.o = u.o; if (o.type === 'settler') o.type = 'worker'; o.mp = 0; o.path = null; o.task = null; o.auto = false; if (p.barb) killUnit(o); S.uver++; }
  }
  if (tl.ruin && !p.barb) { tl.ruin = false; ruinReward(p, u); }
  if (tl.camp && !isCiv(u) && !p.barb) { tl.camp = false; const g = 25 + Math.floor(R() * 25); p.gold += g; notify(p, t('campCleared', g), x, y); }
  if (p.human) updateVis();
}
function followPath(u) {
  while (u.path && u.path.length && u.mp > 0) {
    const n = u.path[0], k = stepKind(u, n.x, n.y);
    if (k === 'ok' || k === 'capture' || (k === 'stack' && u.path.length > 1)) { stepTo(u, n.x, n.y); u.path.shift(); }
    else if (k === 'attack' && u.path.length === 1 && !UNITS[u.type].rs) { attack(u, n.x, n.y); u.path = null; }
    else u.path = null;
  }
  if (u.path && !u.path.length) u.path = null;
}
// distance from each tile to the nearest city (capped at 7), rebuilt only when the set of cities changes
let _cd = null, _cdKey = '';
function cityDist(x, y) {
  let sum = 0; for (const c of S.cities) sum += c.id * 7 + c.x * 131 + c.y; // changes only when cities do
  const key = S.cities.length + '|' + sum + '|' + S.map.length;
  if (key !== _cdKey || !_cd) {
    _cdKey = key; _cd = new Uint8Array(S.map.length).fill(7);
    for (const c of S.cities) around(c.x, c.y, 6, (nx, ny) => { const i = ny * S.w + nx, d = dist(c.x, c.y, nx, ny); if (d < _cd[i]) _cd[i] = d; });
  }
  return _cd[y * S.w + x];
}
function canFound(p, x, y) {
  const tl = T(x, y);
  if (!passable(tl) || tl.city >= 0 || (tl.owner >= 0 && tl.owner !== p.id)) return false;
  return cityDist(x, y) >= 3;
}
function teleportHome(u) {
  const p = P(u.o), cs = citiesOf(p);
  if (!cs.length) { killUnit(u); return; }
  cs.sort((a, b) => dist(a.x, a.y, u.x, u.y) - dist(b.x, b.y, u.x, u.y));
  for (const c of cs) { const civ = isCiv(u); if (!uat(c.x, c.y).some(o => isCiv(o) === civ)) { setPos(u, c.x, c.y); u.path = null; return; } const f = freeNear(c.x, c.y, civ, 3); if (f) { setPos(u, f.x, f.y); u.path = null; return; } }
  killUnit(u);
}

/* ---------------- yields & cities ---------------- */
function resVisible(r, p) { const d = RES[r]; return !d.tech || !p || hasTech(p, d.tech); }
function tileYield(tl, p) {
  const d = TERRAIN[tl.t], y = [d.y[0], d.y[1], d.y[2]];
  if (tl.res && resVisible(tl.res, p)) { const r = RES[tl.res].y; y[0] += r[0]; y[1] += r[1]; y[2] += r[2]; }
  if (tl.imp) { const r = IMPR[tl.imp].y; y[0] += r[0]; y[1] += r[1]; y[2] += r[2]; }
  return y;
}
function canImprove(tl, imp, p) {
  if (tl.city >= 0 || !passable(tl) || tl.imp === imp) return false;
  const I = IMPR[imp]; if (!hasTech(p, I.tech)) return false;
  const rv = tl.res && resVisible(tl.res, p) ? RES[tl.res] : null;
  if (rv && rv.imp) return rv.imp === imp;
  return I.on.includes(tl.t);
}
function pRes(p) {
  const rv = S.turn + ':' + (S.tver || 0); // recounted once a day (or after terrain edits) instead of after every change
  if (p._rv === rv && p._r) return p._r;
  const r = {};
  for (const tl of S.map) {
    if (tl.owner !== p.id || !tl.res) continue;
    const d = RES[tl.res]; if (d.kind === 'bonus' || !resVisible(tl.res, p)) continue;
    if (tl.city >= 0 || tl.imp === d.imp) r[tl.res] = (r[tl.res] || 0) + 1;
  }
  p._r = r; p._rv = rv; return r;
}
function luxCount(p) { return Object.keys(pRes(p)).filter(k => RES[k].kind === 'lux').length; }
function bldEff(c) { const e = {}; for (const b in c.blds) { const f = BLDS[b].eff; for (const k in f) e[k] = (e[k] || 0) + f[k]; } return e; }
function cityContent(c) {
  const p = P(c.o), e = bldEff(c);
  const base = 4 + (p.human ? { easy: 1, normal: 0, hard: -1 }[S.diff] : 0);
  return base + luxCount(p) + (e.happy || 0) - Math.floor(citiesOf(p).length / 4);
}
function cityTiles(c) { const r = []; fatCross(c.x, c.y, (x, y) => { if (x === c.x && y === c.y) return; const tl = T(x, y); if (tl.oc === c.id) r.push(y * S.w + x); }); return r; }
// a city's output is asked for several times a day (AI planning, the day's yield, townsfolk jobs);
// it is worked out once and reused until the day, the city or the map changes
function cityStats(c) {
  const key = S.turn + '|' + S.ver + '|' + (S.tver || 0) + '|' + c.o + '|' + c.pop + '|' + Object.keys(c.blds).length + '|' + c.focus + '|' + c.bounty + '|' + c.plague + '|' + S.cities.length;
  if (c._sk !== key) { c._sk = key; c._st = cityStatsCalc(c); }
  return c._st;
}
function cityStatsCalc(c) {
  const p = P(c.o), e = bldEff(c);
  let cy = tileYield(T(c.x, c.y), p); cy = [Math.max(2, cy[0]), Math.max(1, cy[1]), cy[2] + 1];
  const content = cityContent(c), unhappy = Math.max(0, c.pop - Math.max(1, content)), workers = c.pop - unhappy;
  const cands = cityTiles(c).map(i => { const tl = S.map[i], y = tileYield(tl, p); if (e.sea && isWater(tl)) y[0] += 1; return { i, y }; });
  const fw = FOCUS[c.focus] || FOCUS.bal, sc = (y, w) => y[0] * w[0] + y[1] * w[1] + y[2] * w[2];
  let f = cy[0], pr = cy[1], g = cy[2];
  const worked = [];
  for (let k = 0; k < workers && cands.length; k++) {
    const w = f < c.pop * 2 + 2 ? [4, 1, 0.5] : fw;
    let bi = 0; for (let j = 1; j < cands.length; j++) if (sc(cands[j].y, w) > sc(cands[bi].y, w)) bi = j;
    const b = cands.splice(bi, 1)[0]; worked.push(b.i); f += b.y[0]; pr += b.y[1]; g += b.y[2];
  }
  f += e.food || 0; pr += e.prod || 0; g += (e.gold || 0) + Math.floor(c.pop / 2); // citizens trade
  // season and events: rains feed crops, winter thins them, sun helps workshops; blessings and plague
  const sea = seasonOf(S.turn), sf = (sea === 1 ? Math.ceil(c.pop / 3) : sea === 2 ? -Math.floor(c.pop / 4) : 0) + (c.bounty > 0 ? 3 : 0);
  f += sf; if (sea === 0) pr = Math.ceil(pr * 1.1);
  pr = Math.floor(pr * (1 + (e.prodP || 0) / 100) * aiMul(p));
  g = Math.floor(g * (1 + (e.goldP || 0) / 100));
  const sci = Math.floor((c.pop + (e.sci || 0)) * (1 + (e.sciP || 0) / 100) * aiMul(p));
  const cul = 1 + (e.cul || 0), eat = c.pop * 2;
  const surplus = c.plague > 0 ? Math.min(0, f - eat) : f - eat; // plague halts growth
  return { f, p: pr, g, sci, cul, eat, surplus, sf, content, unhappy, worked };
}
function growCost(pop) { return Math.floor(15 + 8 * (pop - 1) + Math.pow(pop - 1, 1.5)); }
function popCap(c) { return c.blds.aqueduct ? 40 : 8; }
function borderCost(cl) { return Math.floor(10 + 8 * cl + Math.pow(cl, 1.8) * 2); }
function cityMaxHp(c) { return 200 + (c.blds.walls ? BLDS.walls.eff.hp : 0); }
function cityStr(c) {
  const p = P(c.o);
  let s = 8 + c.pop * 1.5 + techCount(p) * 0.7 + (c.blds.walls ? BLDS.walls.eff.def : 0);
  const gar = uat(c.x, c.y).filter(u => u.o === c.o && !isCiv(u));
  if (gar.length) s += Math.max(...gar.map(u => UNITS[u.type].str)) * 0.3;
  return s;
}
function isCoastal(c) { let r = false; around(c.x, c.y, 1, (x, y) => { if (isWater(T(x, y))) r = true; }); return r; }
function itemCost(it) { return it.k === 'u' ? UNITS[it.id].cost : it.k === 'b' ? BLDS[it.id].cost : 0; }
function itemName(it) { return it.k === 'u' ? nm(UNITS[it.id]) : it.k === 'b' ? nm(BLDS[it.id]) : it.k === 'w' ? t('wealth') : t('researchProj'); }
function canBuildUnit(p, c, type) {
  const d = UNITS[type];
  if (d.tech && !hasTech(p, d.tech)) return false;
  if (d.res && !pRes(p)[d.res]) return false;
  if (d.obs && canBuildUnit(p, c, d.obs)) return false;
  return true;
}
function canBuildBld(p, c, b) {
  const d = BLDS[b];
  if (d.hidden || c.blds[b] || (d.tech && !hasTech(p, d.tech))) return false;
  if (d.coast && !isCoastal(c)) return false;
  if (d.wonder && (S.wonders || []).some(w => w.k === b)) return false;
  if (d.needs && !c.blds[d.needs]) return false;
  if (b === 'spaceship' && (p.launched || S.cities.some(o => o.o === p.id && o !== c && o.q[0] && o.q[0].id === 'spaceship'))) return false;
  return true;
}
function buildOptions(c) {
  const p = P(c.o), r = [];
  for (const k in UNITS) if (canBuildUnit(p, c, k)) r.push({ k: 'u', id: k });
  for (const k in BLDS) if (canBuildBld(p, c, k)) r.push({ k: 'b', id: k });
  r.push({ k: 'w' }, { k: 'r' });
  return r;
}
function buyCost(c) { const it = c.q[0]; if (!it || it.k === 'w' || it.k === 'r' || it.id === 'spaceship') return 0; return Math.max(1, Math.ceil((itemCost(it) - c.prod) * 2 + 10)); }
function buyItem(c) { const p = P(c.o), g = buyCost(c); if (!g || p.gold < g) return false; p.gold -= g; c.prod = itemCost(c.q[0]); if (finishItem(c, c.q[0])) { c.prod = 0; c.q.shift(); } return true; }

function foundCity(p, x, y) {
  const name = genCityName(p); p.nameIdx++;
  const c = { id: S.nid++, name, o: p.id, x, y, pop: 1, food: 0, prod: 0, q: [], blds: {}, cul: 0, cl: 0, hp: 200, focus: 'bal', orig: p.id, isCap: false, founded: S.turn };
  if (!citiesOf(p).length && !p.everCity) { c.blds.palace = 1; c.isCap = true; }
  if (!citiesOf(p).some(o => o.blds.palace)) c.blds.palace = 1;
  const tl = T(x, y); tl.city = c.id; tl.imp = null; tl.road = true; tl.ruin = false; tl.camp = false;
  around(x, y, 1, (nx, ny) => { const o = T(nx, ny); if (o.owner < 0 || (o.owner === p.id && o.oc < 0)) { o.owner = p.id; o.oc = c.id; } });
  tl.owner = p.id; tl.oc = c.id;
  S.cities.push(c); S.ver++; p.everCity = true;
  notify(p, t('cityFounded', cname(c)), x, y);
  if (!p.barb) chron('chFound', [civDef(p).n, c.name], x, y);
  return c;
}
function expandBorder(c) {
  const p = P(c.o); let best = null, bs = -1e9;
  around(c.x, c.y, 3, (x, y) => {
    const tl = T(x, y); if (tl.owner >= 0) return;
    let adj = false; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && T(nx, ny).oc === c.id) adj = true; }
    if (!adj) return;
    const yv = tileYield(tl, p); let s = yv[0] * 1.2 + yv[1] + yv[2] - dist(c.x, c.y, x, y) * 1.5 + (tl.res ? 3 : 0) + (isWater(tl) ? -0.5 : 0);
    if (s > bs) { bs = s; best = { x, y }; }
  });
  if (!best) return false;
  const tl = T(best.x, best.y); tl.owner = p.id; tl.oc = c.id; S.ver++;
  return true;
}
function finishItem(c, it) {
  const p = P(c.o);
  if (it.k === 'u') {
    const d = UNITS[it.id], civ = d.cls === 'civ';
    if (it.id === 'settler' && c.pop < 2) return false;
    let pos = uat(c.x, c.y).some(o => isCiv(o) === civ) ? freeNear(c.x, c.y, civ, 2) : { x: c.x, y: c.y };
    if (!pos) return false;
    const u = addUnit(p, it.id, pos.x, pos.y); u.mp = 0; if (p.autoNew) u.ai = true;
    if (c.blds.barracks && !civ) { u.xp = BLDS.barracks.eff.xp; levelUp(u); }
    if (it.id === 'settler') c.pop--;
  } else if (it.k === 'b') {
    c.blds[it.id] = 1;
    if (BLDS[it.id].wonder) placeWonder(c, it.id);
    if (it.id === 'spaceship') { p.launched = true; chron('chLaunch', [civDef(p).n], c.x, c.y); }
    if (it.id === 'walls') c.hp = cityMaxHp(c);
  }
  notify(p, t('built', cname(c), itemName(it)), c.x, c.y);
  return true;
}
function placeWonder(c, k) {
  let spot = null, bs = -1;
  around(c.x, c.y, 1, (x, y) => { const tl = T(x, y); if (tl.city >= 0 || tl.wonder || !passable(tl)) return; const s = (tl.t === 'mountain' ? -9 : 0) + (tl.res ? 0 : 2) + (tl.imp ? 0 : 1) + R(); if (s > bs) { bs = s; spot = { x, y }; } });
  const at = spot || { x: c.x, y: c.y };
  if (spot) { const tl = T(at.x, at.y); tl.wonder = k; tl.imp = null; S.ver++; }
  (S.wonders = S.wonders || []).push({ k, city: c.id, x: at.x, y: at.y, t: S.turn });
  for (const o of S.cities) if (o !== c) o.q = o.q.filter(q => q.id !== k); // everyone else's work on it is lost
  chron('chWonder', [civDef(P(c.o)).n, BLDS[k].n], c.x, c.y); vfx('bless', at.x, at.y);
}
function cityTurn(c, st) {
  const p = P(c.o);
  c.food += st.surplus;
  const gc = growCost(c.pop);
  if (c.food >= gc) {
    if (c.pop < popCap(c)) { c.food -= gc; c.pop++; notify(p, t('grew', cname(c), c.pop), c.x, c.y); } else c.food = gc;
  } else if (c.food < 0) { if (c.pop > 1) { c.pop--; notify(p, t('starving') + ' ' + cname(c), c.x, c.y); } c.food = 0; }
  const it = c.q[0];
  if (it && it.k === 'w') p.gold += Math.floor(st.p / 2);
  else if (it && it.k === 'r') p.sci += Math.floor(st.p / 2);
  else if (it) {
    c.prod += st.p; const cost = itemCost(it);
    if (c.prod >= cost) { if (finishItem(c, it)) { c.prod -= cost; c.q.shift(); } else c.prod = cost; }
  }
  c.cul += st.cul;
  const bc = borderCost(c.cl);
  if (c.cul >= bc) { c.cul -= bc; c.cl++; if (expandBorder(c) && c.cl % 3 === 0) notify(p, t('borders', cname(c)), c.x, c.y); }
  if (!(S.turn - (c.hit ?? -9) <= 1)) c.hp = Math.min(cityMaxHp(c), c.hp + 20); // sieged cities do not heal
}
function income(p) { let g = 0; for (const c of citiesOf(p)) g += cityStats(c).g; return g - upkeep(p).total; }
function upkeep(p) {
  let b = 0; for (const c of citiesOf(p)) for (const k in c.blds) b += BLDS[k].up;
  const n = unitsOf(p).length, free = 3 + citiesOf(p).length * 2;
  const u = Math.max(0, n - free);
  return { b, u, total: b + u };
}

/* ---------------- research ---------------- */
function techCost(p, t) { return Math.round((trait(p) === 'scholar' ? 0.85 : 1) * TECHS[t].cost * (1.25 + 0.06 * Math.max(0, citiesOf(p).length - 1))); }
function availableTechs(p) { return Object.keys(TECHS).filter(k => !p.techs[k] && TECHS[k].req.every(r => p.techs[r])); }
function techPath(p, target) {
  const out = [], seen = {};
  const visit = k => { if (p.techs[k] || seen[k]) return; seen[k] = 1; TECHS[k].req.forEach(visit); out.push(k); };
  visit(target); return out;
}
function setResearch(p, target) { const path = techPath(p, target); if (!path.length) return; if (p.research !== path[0]) p.sci = Math.min(p.sci, techCost(p, path[0])); p.research = path[0]; p.rq = path.slice(1); }
function learn(p, k) {
  if (p.techs[k]) return;
  p.techs[k] = 1; S.ver++;
  notify(p, t('discovered', nm(TECHS[k])));
  if (TECHS[k].era > (p.era || 0)) { p.era = TECHS[k].era; chron('chEra', [civDef(p).n, ERAS[p.era]]); }
  if (p.research === k) { p.research = null; while (p.rq.length && p.techs[p.rq[0]]) p.rq.shift(); p.research = p.rq.shift() || null; }
}

/* ---------------- combat ---------------- */
function levelUp(u) { const need = [10, 30, 60, 100]; while (u.lvl < 4 && u.xp >= need[u.lvl]) u.lvl++; }
function unitStrength(u, role, vs) {
  const d = UNITS[u.type]; let s = role === 'rng' ? d.rs : d.str; if (!s) return 0.1;
  let m = 1 + 0.15 * u.lvl;
  if (role === 'def') { const tl = T(u.x, u.y); m += (TERRAIN[tl.t].def || 0) / 100; if (u.fort) m += 0.25; if (isWater(tl)) m *= 0.4; } // easy prey while afloat
  if (vs && vs !== 'city' && d.anti && UNITS[vs.type].cls === 'mounted') m += 0.5;
  if (vs === 'city' && d.cls === 'siege') m += 1;
  return s * m * (0.5 + 0.5 * u.hp / 100);
}
function dmgFormula(r) { const f = x => (Math.pow((3 + x) / 4, 4) + 1) / 2; return 30 * (r >= 1 ? f(r) : 1 / f(1 / r)); }
function roll(x) { return Math.max(1, Math.round(x * (0.8 + R() * 0.4))); }
function defenderAt(x, y, att) { const ds = uat(x, y).filter(o => o.o !== att.o && !isCiv(o)); if (!ds.length) return null; return ds.reduce((a, b) => unitStrength(a, 'def', att) >= unitStrength(b, 'def', att) ? a : b); }
function inRange(u, x, y) { const d = UNITS[u.type]; return dist(u.x, u.y, x, y) <= (d.rs ? d.rng : 1); }
// expected damage of u attacking (x,y): {dd, ad, city}
function previewAttack(u, x, y) {
  const d = UNITS[u.type], ranged = !!d.rs, c = cityAt(x, y);
  if (c && c.o !== u.o) { const cs = cityStr(c), as = unitStrength(u, ranged ? 'rng' : 'att', 'city'); return { dd: Math.round(dmgFormula(as / cs)), ad: ranged ? 0 : Math.round(dmgFormula(cs / as)), city: c, hp: c.hp }; }
  const def = defenderAt(x, y, u); if (!def) return null;
  const as = unitStrength(u, ranged ? 'rng' : 'att', def), ds = unitStrength(def, 'def', u);
  return { dd: Math.round(dmgFormula(as / ds)), ad: ranged ? 0 : Math.round(dmgFormula(ds / as)), def, hp: def.hp };
}
function attack(u, x, y) {
  const p = P(u.o), d = UNITS[u.type], ranged = !!d.rs, c = cityAt(x, y);
  u.mp = 0; u.moved = true; u.fort = 0; u.sleep = false; anim(u, 'atk');
  if (c && c.o !== u.o) {
    const cs = cityStr(c), as = unitStrength(u, ranged ? 'rng' : 'att', 'city'), owner = P(c.o);
    const dc = roll(dmgFormula(as / cs)); c.hp -= dc; c.hit = S.turn;
    if (!ranged) { const da = roll(dmgFormula(cs / as)); u.hp -= da; fx(u.x, u.y, -da); }
    fx(x, y, -dc);
    u.xp += 4; levelUp(u);
    if (u.hp <= 0 && c.hp > 0) { notify(p, t('unitLost', nm(d)), u.x, u.y); killUnit(u); return; }
    if (u.hp <= 0) u.hp = 1;
    if (c.hp <= 0 && !ranged) captureCity(u, c); else if (c.hp < 1) c.hp = 1;
    notify(owner, '⚔ ' + cname(c) + ' ' + Math.max(0, c.hp) + '/' + cityMaxHp(c), x, y);
    return;
  }
  const def = defenderAt(x, y, u); if (!def) return;
  const as = unitStrength(u, ranged ? 'rng' : 'att', def), ds = unitStrength(def, 'def', u), dp = P(def.o);
  const dd = roll(dmgFormula(as / ds)); def.hp -= dd; fx(x, y, -dd); anim(def, 'hurt');
  if (!ranged) { const da = roll(dmgFormula(ds / as)); u.hp -= da; fx(u.x, u.y, -da); }
  if (u.hp <= 0 && def.hp <= 0) u.hp = 1;
  u.xp += 5; def.xp += 4; levelUp(u); levelUp(def);
  if (def.hp <= 0) {
    killUnit(def); notify(p, t('unitKilled', nm(UNITS[def.type])), x, y); notify(dp, t('unitLost', nm(UNITS[def.type])), x, y);
    if (!ranged && u.hp > 0 && passFor(p, T(x, y)) && !uat(x, y).some(o => o.o !== u.o && !isCiv(o))) stepTo(u, x, y, true);
  }
  if (u.hp <= 0) { notify(p, t('unitLost', nm(d)), u.x, u.y); notify(dp, t('unitKilled', nm(d)), u.x, u.y); killUnit(u); }
}
function captureCity(u, c) {
  const p = P(u.o), old = P(c.o);
  for (const o of uat(c.x, c.y).slice()) if (o.o !== u.o) killUnit(o);
  if (p.barb) { // barbarians loot instead of holding cities
    c.pop = Math.max(1, c.pop - 1); c.hp = 60; const g = Math.min(old.gold, 30); old.gold -= g;
    notify(old, t('captured', civName(p), cname(c)), c.x, c.y); chron('chRaid', [c.name], c.x, c.y); return;
  }
  const hadPalace = c.blds.palace;
  c.o = p.id; c.pop = Math.max(1, Math.floor(c.pop * 0.75)); c.hp = 60; c.q = []; c.prod = 0; c.food = 0;
  delete c.blds.palace; delete c.blds.spaceship;
  for (const tl of S.map) if (tl.oc === c.id) tl.owner = p.id;
  S.ver++;
  stepTo(u, c.x, c.y, true);
  if (hadPalace) { const rest = citiesOf(old); if (rest.length) rest.sort((a, b) => b.pop - a.pop)[0].blds.palace = 1; }
  if (!citiesOf(p).some(o => o.blds.palace)) c.blds.palace = 1;
  for (const pl of S.players) if (pl.human && (pl === p || pl === old || pl.met[old.id])) notify(pl, t('captured', civName(p), cname(c)), c.x, c.y);
  chron('captured', [civDef(p).n, c.name], c.x, c.y);
  checkEliminated(old);
  checkVictory();
}
function checkEliminated(p) {
  if (p.barb || !p.alive) return;
  if (citiesOf(p).length || unitsOf(p).some(u => u.type === 'settler')) return;
  if (!p.everCity && S.turn < 5) return;
  p.alive = false;
  for (const u of unitsOf(p)) killUnit(u);
  for (const tl of S.map) if (tl.owner === p.id) { tl.owner = -1; tl.oc = -1; }
  for (const pl of S.players) if (pl.human) notify(pl, t('eliminated', civName(p)));
  chron('eliminated', [civDef(p).n]);
  const alive = S.players.filter(q => !q.barb && q.alive); if (alive.length === 1) chron('chUnify', [civDef(alive[0]).n]);
}
function cityBombard(c) {
  const p = P(c.o); let tgt = null, best = 1e9;
  around(c.x, c.y, 2, (x, y) => {
    for (const o of uat(x, y)) if (o.o !== c.o && !isCiv(o) && atWar(p, P(o.o)) && o.hp < best) { best = o.hp; tgt = o; }
  });
  if (!tgt) return;
  const dmg = roll(dmgFormula(cityStr(c) * 0.8 / unitStrength(tgt, 'def', null)));
  tgt.hp -= dmg; fx(tgt.x, tgt.y, -dmg); anim(tgt, 'hurt');
  if (tgt.hp <= 0) { notify(P(tgt.o), t('unitLost', nm(UNITS[tgt.type])), tgt.x, tgt.y); notify(p, t('unitKilled', nm(UNITS[tgt.type])), tgt.x, tgt.y); killUnit(tgt); }
}

/* ---------------- visibility & diplomacy ---------------- */
function updateVis() {
  const p = humanP(); VIS = new Uint8Array(S.w * S.h);
  if (!p) return;
  const mark = (x, y, r) => around(x, y, r, (nx, ny) => { const i = ny * S.w + nx; VIS[i] = 1; S.seen[i] = 1; });
  for (const u of S.units) if (u.o === p.id) mark(u.x, u.y, (UNITS[u.type].sight || 2) + (T(u.x, u.y).t === 'hills' ? 1 : 0));
  for (const c of S.cities) if (c.o === p.id) mark(c.x, c.y, 3);
  for (let i = 0; i < S.map.length; i++) if (S.map[i].owner === p.id) { VIS[i] = 1; S.seen[i] = 1; }
  for (let i = 0; i < S.map.length; i++) {
    if (!VIS[i]) continue; const tl = S.map[i];
    if (tl.owner >= 0 && tl.owner !== p.id) meet(p, P(tl.owner));
    for (const u of uat(i % S.w, (i / S.w) | 0)) if (u.o !== p.id) meet(p, P(u.o));
  }
}
function meet(a, b) {
  if (a === b || a.barb || b.barb || a.met[b.id] || !b.alive) return;
  a.met[b.id] = 1; b.met[a.id] = 1; a.peaceT[b.id] = b.peaceT[a.id] = S.turn;
  notify(a, t('met', civName(b))); notify(b, t('met', civName(a)));
  chron('chMeet', [civDef(a).n, civDef(b).n]);
}
// two AI civilizations meet when any of their units or cities come within 5 tiles;
// everything is bucketed into 6x6 cells so only neighbouring cells are compared
function aiMeetCheck() {
  const majors = S.players.filter(p => !p.barb && p.alive && !p.human);
  if (majors.every(a => majors.every(b => a === b || a.met[b.id]))) return;
  const ok = new Set(majors.map(p => p.id)), C = 6, cw = Math.ceil(S.w / C), cells = new Map();
  const add = o => { if (!ok.has(o.o)) return; const k = ((o.y / C) | 0) * cw + ((o.x / C) | 0); let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(o); };
  for (const u of S.units) add(u); for (const c of S.cities) add(c);
  for (const [k, list] of cells) {
    const cx = k % cw, cy = (k / cw) | 0;
    for (let dy = 0; dy <= 1; dy++) for (let dx = dy ? -1 : 0; dx <= 1; dx++) { // each neighbouring pair of cells once
      const other = dx === 0 && dy === 0 ? list : cells.get((cy + dy) * cw + cx + dx); if (!other || cx + dx < 0 || cx + dx >= cw) continue;
      for (const x of list) for (const y of other) {
        if (x.o === y.o) continue; const a = P(x.o), b = P(y.o);
        if (!a.met[b.id] && dist(x.x, x.y, y.x, y.y) <= 5) meet(a, b);
      }
    }
  }
}
function canDeclare(a, b) { return !a.war[b.id] && S.turn - (a.peaceT[b.id] || 0) >= 10; }
function declareWar(a, b) {
  if (a.war[b.id]) return;
  a.war[b.id] = b.war[a.id] = 1; a.warT[b.id] = b.warT[a.id] = S.turn;
  for (const pl of S.players) if (pl.human && (pl === a || pl === b || (pl.met[a.id] && pl.met[b.id]))) notify(pl, t('warDeclared', civName(a), civName(b)));
  chron('warDeclared', [civDef(a).n, civDef(b).n]);
}
function makePeace(a, b) {
  if (!a.war[b.id]) return;
  a.war[b.id] = b.war[a.id] = 0; a.peaceT[b.id] = b.peaceT[a.id] = S.turn;
  for (const u of S.units.slice()) { const tl = T(u.x, u.y); if ((u.o === a.id && tl.owner === b.id) || (u.o === b.id && tl.owner === a.id)) teleportHome(u); }
  for (const pl of S.players) if (pl.human && (pl === a || pl === b || (pl.met[a.id] && pl.met[b.id]))) notify(pl, t('peaceMade', civName(a), civName(b)));
  chron('peaceMade', [civDef(a).n, civDef(b).n]);
}
function power(p) { let s = 0; for (const u of S.units) if (u.o === p.id && !isCiv(u)) s += (UNITS[u.type].str + (UNITS[u.type].rs || 0) * 0.5) * u.hp / 100; return s + citiesOf(p).length * 5; }
function aiAcceptsPeace(ai, h) {
  const warTurns = S.turn - (ai.warT[h.id] || 0);
  if (warTurns < 5) return false;
  return power(ai) < power(h) * 1.1 || warTurns > 30;
}

/* ---------------- ruins & barbarians ---------------- */
function ruinReward(p, u) {
  const r = R(), cs = citiesOf(p);
  if (r < 0.2) { const av = availableTechs(p).sort((a, b) => TECHS[a].cost - TECHS[b].cost); if (av.length) { learn(p, av[0]); notify(p, t('ruinTech', nm(TECHS[av[0]])), u.x, u.y); return; } }
  if (r < 0.35 && cs.length) { const c = cs.sort((a, b) => dist(a.x, a.y, u.x, u.y) - dist(b.x, b.y, u.x, u.y))[0]; if (c.pop < popCap(c)) { c.pop++; notify(p, t('ruinPop', cname(c)), u.x, u.y); return; } }
  if (r < 0.5 && p.human) { around(u.x, u.y, 7, (x, y) => { S.seen[y * S.w + x] = 1; }); notify(p, t('ruinMap'), u.x, u.y); return; }
  if (r < 0.62) { const f = freeNear(u.x, u.y, false, 2); if (f) { addUnit(p, 'warrior', f.x, f.y); notify(p, t('ruinUnit'), u.x, u.y); return; } }
  const g = 30 + Math.floor(R() * 40); p.gold += g; notify(p, t('ruinGold', g), u.x, u.y);
}
function barbUnitType() {
  const tt = S.turn;
  if (tt < 50) return pick(['warrior', 'warrior', 'archer']);
  if (tt < 110) return pick(['spearman', 'swordsman', 'archer']);
  if (tt < 180) return pick(['pikeman', 'knight', 'swordsman']);
  if (tt < 240) return pick(['musketman', 'knight', 'cannon']);
  return pick(['rifleman', 'musketman']);
}
function barbTurn() {
  const b = barbP(); if (!b) return;
  const camps = []; S.map.forEach((tl, i) => { if (tl.camp) camps.push(i); });
  const maxCamps = Math.floor(S.w * S.h / 450);
  if (S.turn >= 6 && S.turn % 4 === 0 && camps.length < maxCamps && S.turn < 250) {
    for (let k = 0; k < 60; k++) {
      const i = Math.floor(R() * S.map.length), x = i % S.w, y = (i / S.w) | 0, tl = S.map[i];
      if (!passable(tl) || tl.owner >= 0 || tl.ruin || (VIS && VIS[i]) || uat(x, y).length) continue;
      if (cityDist(x, y) < 6) continue;
      tl.camp = true; camps.push(i); break;
    }
  }
  camps.forEach((i, n) => {
    const x = i % S.w, y = (i / S.w) | 0;
    if ((S.turn + n) % 7 !== 0) return;
    let near = 0; around(x, y, 4, (nx, ny) => { near += uat(nx, ny).filter(u => u.o === b.id).length; });
    if (near >= 2) return;
    const pos = uat(x, y).length ? freeNear(x, y, false, 1) : { x, y };
    if (pos) { const u = addUnit(b, barbUnitType(), pos.x, pos.y); u.home = i; }
  });
  for (const u of unitsOf(b)) barbAct(u);
}
function barbAct(u) {
  if (!S.units.includes(u)) return;
  const b = P(u.o);
  // attack anything in reach
  let tgt = null, bs = -1e9;
  around(u.x, u.y, UNITS[u.type].rs ? UNITS[u.type].rng : 1, (x, y) => {
    if (x === u.x && y === u.y) return;
    const pv = (stepKind(u, x, y) === 'attack' || (UNITS[u.type].rs && hasEnemyAt(u, x, y))) ? previewAttack(u, x, y) : null;
    if (pv) { const s = pv.dd - pv.ad * 0.7 + (pv.dd >= pv.hp ? 30 : 0); if (s > bs) { bs = s; tgt = { x, y }; } }
  });
  if (tgt && bs > -5) { attack(u, tgt.x, tgt.y); return; }
  // otherwise head to the nearest non-barbarian thing within 8 tiles
  let best = null, bd = 99;
  for (const c of S.cities) { const d = dist(c.x, c.y, u.x, u.y); if (d < bd && d <= 9) { bd = d; best = c; } }
  for (const o of S.units) { if (o.o === b.id) continue; const d = dist(o.x, o.y, u.x, u.y); if (d < bd && d <= 6) { bd = d; best = o; } }
  if (best) { const path = findPath(u, best.x, best.y, 1500); if (path && path.length > 1) { u.path = path.slice(0, -1); followPath(u); return; } }
  const dirs = DIRS.filter(([dx, dy]) => inb(u.x + dx, u.y + dy) && stepKind(u, u.x + dx, u.y + dy) === 'ok');
  if (dirs.length) { const [dx, dy] = pick(dirs); stepTo(u, u.x + dx, u.y + dy); }
}
function hasEnemyAt(u, x, y) {
  const c = cityAt(x, y); const p = P(u.o);
  if (c && c.o !== u.o && atWar(p, P(c.o))) return true;
  return uat(x, y).some(o => o.o !== u.o && !isCiv(o) && atWar(p, P(o.o)));
}

/* ---------------- turn ---------------- */
function endPlayerTurn(p) {
  if (!p.alive) return;
  let gold = 0, sci = 0;
  for (const c of citiesOf(p)) { const st = cityStats(c); gold += st.g; sci += st.sci; cityTurn(c, st); }
  for (const c of citiesOf(p)) cityBombard(c);
  if (!p.barb) {
    p.gold += gold - upkeep(p).total;
    while (p.gold < 0) {
      const mil = unitsOf(p).filter(u => !isCiv(u)).sort((a, b) => UNITS[a.type].cost - UNITS[b.type].cost);
      const v = mil[0] || unitsOf(p)[0];
      if (!v) { p.gold = 0; break; }
      notify(p, t('disbandDebt', nm(UNITS[v.type])), v.x, v.y); killUnit(v); p.gold += 5;
    }
    p.sci += sci;
    if (!p.research && !p.human) aiPickResearch(p);
    if (p.research && p.sci >= techCost(p, p.research)) { p.sci -= techCost(p, p.research); learn(p, p.research); if (!p.research && !p.human) aiPickResearch(p); }
  }
  for (const u of unitsOf(p)) {
    const tl = T(u.x, u.y);
    if (u.task) {
      if (--u.task.left <= 0) { if (u.task.k === 'road') tl.road = true; else tl.imp = u.task.k; u.task = null; S.ver++; }
    }
    if (!u.moved && u.hp < 100 && !isWater(tl)) u.hp = Math.min(100, u.hp + (tl.city >= 0 && tl.owner === p.id ? 25 : tl.owner === p.id ? 15 : tl.owner < 0 ? 10 : 5));
    u.mp = UNITS[u.type].mv * 3; u.moved = false;
  }
}
function endTurn() {
  if (S.winner && !S.winner.ack) return;
  for (const p of S.players) if (!p.human && !p.barb && p.alive) aiTurn(p);
  barbTurn();
  aiMeetCheck();
  for (const p of S.players) endPlayerTurn(p);
  S.turn++;
  if (S.god) worldEvents();
  checkVictory();
  const h = humanP();
  if (h) for (const u of unitsOf(h)) { if (!S.units.includes(u)) continue; if (u.task) u.mp = 0; else if (u.ai) aiUnit(h, u); else if (u.auto) autoExplore(u); else if (u.path) followPath(u); }
  updateVis();
}
function score(p) {
  const cs = citiesOf(p);
  return cs.length * 8 + cs.reduce((s, c) => s + c.pop * 4, 0) + techCount(p) * 6 + Math.floor(p.culture / 40) + (p.launched ? 500 : 0);
}
function checkVictory() {
  if (S.winner || S.god) return;
  const majors = S.players.filter(p => !p.barb), h = humanP();
  for (const p of majors) if (p.launched) { S.winner = { pid: p.id, kind: 'sci' }; return; }
  const caps = S.cities.filter(c => c.isCap);
  if (caps.length >= 2 && caps.length === majors.filter(m => m.everCity).length) {
    const o = caps[0].o; if (caps.every(c => c.o === o) && majors.every(m => m.id === o || !m.alive || m.everCity)) { S.winner = { pid: o, kind: 'dom' }; return; }
  }
  const alive = majors.filter(p => p.alive);
  if (alive.length === 1 && S.turn > 5) { S.winner = { pid: alive[0].id, kind: 'dom' }; return; }
  if (h && !h.alive) { S.winner = { pid: -1, kind: 'lost' }; return; }
  if (S.turn >= TURN_LIMIT) { const b = alive.sort((a, c) => score(c) - score(a))[0]; S.winner = { pid: b.id, kind: 'score' }; }
}
function yearOf(tn) { return tn <= 100 ? -4000 + tn * 35 : tn <= 200 ? -500 + (tn - 100) * 15 : 1000 + (tn - 200) * 10; }

// moves an exploring unit toward the nearest unexplored tile
function autoExplore(u) {
  const w = S.w, start = u.y * w + u.x, seenFrom = new Map([[start, -1]]), q = [start];
  let goal = -1;
  while (q.length && goal < 0) {
    const k = q.shift(), x = k % w, y = (k / w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const nk = ny * w + nx;
      if (seenFrom.has(nk)) continue;
      const kind = stepKind(u, nx, ny); if (kind === 'no' || kind === 'attack') continue;
      seenFrom.set(nk, k);
      let unexplored = false; around(nx, ny, 1, (ax, ay) => { if (!S.seen[ay * w + ax]) unexplored = true; });
      if (unexplored || T(nx, ny).ruin) { goal = nk; break; }
      q.push(nk);
    }
  }
  if (goal < 0) { u.auto = false; return; }
  const path = findPath(u, goal % w, (goal / w) | 0);
  if (!path) { u.auto = false; return; }
  u.path = path; followPath(u); u.path = null;
}

function saveJSON() { return JSON.stringify(S, (k, v) => (k[0] === '_' ? undefined : v)); }
function loadJSON(s) { S = JSON.parse(s); resetCaches(); updateVis(); }

/* ---------------- world editing (god powers) ---------------- */
function fixWater(x, y) {
  around(x, y, 1, (nx, ny) => {
    const tl = T(nx, ny); if (!isWater(tl)) return;
    let near = false; for (const [dx, dy] of DIRS) if (inb(nx + dx, ny + dy) && !isWater(T(nx + dx, ny + dy))) near = true;
    tl.t = near ? 'coast' : 'ocean'; if (tl.res && !RES[tl.res].on.includes(tl.t)) tl.res = null;
  });
}
function paintTerrain(x, y, t) {
  const tl = T(x, y), water = t === 'ocean' || t === 'coast', wasLand = passable(tl);
  if (tl.city >= 0 && (water || t === 'mountain')) return false;
  tl.t = water ? 'ocean' : t; tl.imp = null;
  if (water || t === 'mountain') { tl.road = false; tl.camp = false; tl.ruin = false; for (const u of uat(x, y).slice()) killUnit(u); }
  if (tl.res && !RES[tl.res].on.includes(tl.t)) tl.res = null;
  fixWater(x, y); S.ver++; S.tver = (S.tver || 0) + 1;
  S.land += (water || t === 'mountain' ? 0 : 1) - (wasLand ? 1 : 0);
  return true;
}
function placeRes(x, y, r) {
  const tl = T(x, y);
  if (!r) { tl.res = null; S.ver++; return true; }
  if (!RES[r].on.includes(tl.t) || tl.city >= 0) return false;
  tl.res = r; tl.imp = null; S.ver++; return true;
}
function placeCamp(x, y) {
  const tl = T(x, y); if (!passable(tl) || tl.city >= 0) return false;
  tl.camp = true; S.ver++; const b = barbP(); if (!uat(x, y).length) { const u = addUnit(b, barbUnitType(), x, y); u.home = y * S.w + x; }
  return true;
}
function addCiv(x, y) {
  const used = new Set(S.players.map(p => p.civ)), free = CIVS.map((c, i) => i).filter(i => !used.has(i));
  if (!free.length) return 'full';
  const tl = T(x, y); if (!passable(tl) || tl.city >= 0 || tl.owner >= 0 || uat(x, y).length) return 'bad';
  const p = newPlayer(S.players.length, free[Math.floor(R() * free.length)], false);
  // newcomers start with the knowledge every living civ already shares
  const alive = S.players.filter(q => !q.barb && q.alive);
  if (alive.length) for (const k in TECHS) if (alive.every(q => q.techs[k])) p.techs[k] = 1;
  for (const q of S.players) if (!q.barb) { p.war[q.id] = 0; q.war[p.id] = 0; }
  S.players.push(p); civDef(p);
  addUnit(p, 'settler', x, y);
  for (const k of ['warrior', 'worker']) { const f = freeNear(x, y, false, 2); if (f) addUnit(p, k, f.x, f.y); }
  aiPickResearch(p);
  chron('chNewCiv', [civDef(p).n], x, y);
  return p;
}
function bless(c) { c.pop = Math.min(popCap(c), c.pop + 2); c.prod += 40; c.hp = cityMaxHp(c); c.food = 0; chron('chBless', [c.name], c.x, c.y); vfx('bless', c.x, c.y); }
function disaster(x, y) {
  around(x, y, 1, (nx, ny) => {
    const tl = T(nx, ny);
    for (const u of uat(nx, ny).slice()) killUnit(u);
    const c = cityAt(nx, ny);
    if (c) { c.pop = Math.max(1, Math.floor(c.pop / 2)); c.hp = Math.max(1, c.hp - 120); c.prod = 0; }
    else { tl.imp = null; tl.road = false; tl.camp = false; }
  });
  S.tver = (S.tver || 0) + 1;
  const ctl = T(x, y); if (ctl.city < 0 && passable(ctl)) { ctl.t = 'hills'; if (ctl.res && !RES[ctl.res].on.includes('hills')) ctl.res = null; }
  S.ver++;
  chron('chDisaster', [], x, y); vfx('meteor', x, y);
}
function nearestRival(p) {
  let best = null, bd = 1e9;
  for (const q of S.players) {
    if (q === p || q.barb || !q.alive) continue;
    for (const a of citiesOf(p)) for (const b of citiesOf(q)) { const d = dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = q; } }
  }
  return best;
}
function incite(p) { const q = nearestRival(p); if (!q) return null; meet(p, q); p.peaceT[q.id] = q.peaceT[p.id] = -99; declareWar(p, q); return q; }
function peaceAll(p) { for (const q of S.players) if (q !== p && !q.barb && p.war[q.id]) makePeace(p, q); }

/* ---------------- seasons, plague, natural disasters ---------------- */
function worldEvents() {
  for (const p of S.players) { // rulers grow old, fall in battle, and are succeeded
    if (p.barb || !p.alive) continue;
    if (!p.leader) p.leader = newLeader(p);
    if (R() < 1 / 500 + (atWarAny(p) ? 1 / 400 : 0)) { const old = p.leader; p.leader = newLeader(p); chron('chSucceed', [old.n, p.leader.n, civDef(p).n]); }
  }
  if (S.turn % 5 === 0) recordHistory();
  // overstretched empires may split; a lone world power is the most fragile of all
  const majors = S.players.filter(p => !p.barb && p.alive);
  for (const p of majors) { const n = citiesOf(p).length; if (n >= 8 && R() < (majors.length === 1 ? 1 / 50 : n >= 20 ? 1 / 50 : n >= 14 ? 1 / 100 : 1 / 400)) { rebellion(p); break; } }
  if (S.turn % 40 === 0) chron('chSeason', [SEASON_N[seasonOf(S.turn)]]);
  for (const c of S.cities) {
    if (c.bounty > 0) c.bounty--;
    if (!(c.plague > 0)) continue;
    c.plague--;
    if (c.plague % 4 === 0 && c.pop > 1) c.pop--;
    if (R() < 0.15) { // sickness travels along to a nearby town
      const near = S.cities.filter(o => o !== c && !(o.plague > 0) && !((o.immune || 0) > S.turn) && dist(o.x, o.y, c.x, c.y) <= 7);
      if (near.length) plague(pick(near));
    }
    if (c.plague === 0) { c.immune = S.turn + 60; chron('chPlagueEnd', [c.name], c.x, c.y); }
  }
  if (S.natural !== false && R() < 1 / 45) naturalEvent();
}
function naturalEvent() {
  const r = R(), land = [], coast = [];
  if (r < 0.3) { const big = S.cities.filter(c => c.pop >= 5 && !(c.plague > 0) && !((c.immune || 0) > S.turn)); if (big.length) plague(pick(big)); return; }
  if (r < 0.5) { const m = []; S.map.forEach((tl, i) => { if (tl.t === 'mountain') m.push(i); }); if (m.length) { const i = pick(m); volcano(i % S.w, (i / S.w) | 0); } return; }
  if (r < 0.75) { S.map.forEach((tl, i) => { if (passable(tl)) land.push(i); }); if (land.length) { const i = pick(land); quake(i % S.w, (i / S.w) | 0); } return; }
  S.map.forEach((tl, i) => { if (tl.t === 'coast') coast.push(i); }); if (coast.length) { const i = pick(coast); tsunami(i % S.w, (i / S.w) | 0); }
}
function hurtUnitsAt(x, y, dmg) { for (const u of uat(x, y).slice()) { u.hp -= dmg; anim(u, 'hurt'); if (u.hp <= 0) killUnit(u); } }
function plague(c) {
  if (!c || c.plague > 0) return false;
  c.plague = 16; chron('chPlague', [c.name], c.x, c.y); vfx('plague', c.x, c.y); return true;
}
function volcano(x, y) {
  const tl = T(x, y); if (isWater(tl) || tl.city >= 0) return false;
  for (const u of uat(x, y).slice()) killUnit(u);
  tl.t = 'mountain'; tl.res = null; tl.imp = null; tl.road = false; tl.camp = false; tl.ruin = false;
  around(x, y, 1, (nx, ny) => {
    if (nx === x && ny === y) return;
    const o = T(nx, ny), c = cityAt(nx, ny); hurtUnitsAt(nx, ny, 50);
    if (c) { c.pop = Math.max(1, c.pop - 2); c.hp = Math.max(1, c.hp - 80); }
    else if (passable(o)) { o.imp = null; o.road = false; if (o.t !== 'mountain' && R() < 0.5) o.t = 'hills'; if (o.res && !RES[o.res].on.includes(o.t)) o.res = null; }
  });
  S.ver++; S.tver = (S.tver || 0) + 1; S.land = S.map.filter(passable).length;
  chron('chVolcano', [], x, y); vfx('volcano', x, y); return true;
}
function quake(x, y) {
  around(x, y, 2, (nx, ny) => {
    const o = T(nx, ny), c = cityAt(nx, ny); hurtUnitsAt(nx, ny, 30);
    if (c) { c.hp = Math.max(1, c.hp - 60); if (c.pop > 1) c.pop--; const b = Object.keys(c.blds).filter(k => k !== 'palace'); for (let k = 0; k < 2 && b.length; k++) delete c.blds[b.splice(Math.floor(R() * b.length), 1)[0]]; }
    else if (passable(o)) { o.road = false; if (R() < 0.5) o.imp = null; }
  });
  S.ver++; chron('chQuake', [], x, y); vfx('quake', x, y); return true;
}
function tsunami(x, y) {
  if (!isWater(T(x, y))) return false;
  around(x, y, 3, (nx, ny) => {
    const o = T(nx, ny); if (isWater(o)) return;
    let shore = false; for (const [dx, dy] of DIRS) if (inb(nx + dx, ny + dy) && isWater(T(nx + dx, ny + dy))) shore = true;
    if (!shore) return;
    for (const u of uat(nx, ny).slice()) killUnit(u);
    const c = cityAt(nx, ny);
    if (c) { c.pop = Math.max(1, c.pop - 2); c.hp = Math.max(1, c.hp - 50); delete c.blds.harbor; }
    else { o.imp = null; o.road = false; o.camp = false; }
  });
  S.ver++; chron('chTsunami', [], x, y); vfx('tsunami', x, y); return true;
}
function lightning(x, y) {
  hurtUnitsAt(x, y, 100); const c = cityAt(x, y); if (c) c.hp = Math.max(1, c.hp - 30);
  vfx('lightning', x, y); return true;
}
function bounty(p) { for (const c of citiesOf(p)) { c.bounty = 20; vfx('bless', c.x, c.y); } chron('chBounty', [civDef(p).n]); }

/* ---------------- history for the statistics screen ---------------- */
function recordHistory() {
  const H = S.hist = S.hist || { t: [], s: {} };
  const land = {}; for (const tl of S.map) if (tl.owner >= 0) land[tl.owner] = (land[tl.owner] || 0) + 1;
  H.t.push(S.turn);
  for (const p of S.players) {
    if (p.barb) continue;
    const a = H.s[p.id] = H.s[p.id] || [];
    while (a.length < H.t.length - 1) a.push([0, 0, 0]); // civilizations born later start at zero
    const cs = citiesOf(p); a.push([cs.reduce((n, c) => n + c.pop, 0), land[p.id] || 0, cs.length]);
  }
  if (H.t.length > 400) { H.t = H.t.filter((_, i) => i % 2 === 0); for (const k in H.s) H.s[k] = H.s[k].filter((_, i) => i % 2 === 0); } // keep it small: halve the resolution
}

// the cities farthest from the capital rise up as a new civilization, at war with their old rulers
function rebellion(p) {
  const used = new Set(S.players.filter(q => q.alive || q.barb).map(q => q.civ)), free = CIVS.map((c, i) => i).filter(i => !used.has(i)); // colours of fallen civilizations can be reused
  const cs = citiesOf(p), cap = cs.find(c => c.blds.palace) || cs[0];
  if (!free.length || cs.length < 4) return null;
  const far = cs.filter(c => c !== cap).sort((a, b) => dist(b.x, b.y, cap.x, cap.y) - dist(a.x, a.y, cap.x, cap.y))[0];
  const group = cs.filter(c => c !== cap && dist(c.x, c.y, far.x, far.y) <= 7).slice(0, Math.floor(cs.length / 2));
  if (group.length < 2) return null;
  const q = newPlayer(S.players.length, free[Math.floor(R() * free.length)], false);
  Object.assign(q.techs, p.techs); q.gold = Math.floor(p.gold / 3); q.everCity = true;
  for (const o of S.players) if (!o.barb) { q.war[o.id] = 0; o.war[q.id] = 0; }
  S.players.push(q); civDef(q);
  const ids = new Set(group.map(c => c.id));
  for (const c of group) { c.o = q.id; c.q = []; c.prod = 0; delete c.blds.palace; }
  group.sort((a, b) => b.pop - a.pop)[0].blds.palace = 1;
  for (const tl of S.map) if (ids.has(tl.oc)) tl.owner = q.id;
  for (const u of S.units) if (u.o === p.id) { const tl = T(u.x, u.y); if (ids.has(tl.oc)) u.o = q.id; }
  S.uver++; S.ver++;
  meet(p, q); p.peaceT[q.id] = q.peaceT[p.id] = -99; declareWar(q, p);
  aiPickResearch(q);
  chron('chRevolt', [civDef(q).n, civDef(p).n], far.x, far.y);
  return q;
}
