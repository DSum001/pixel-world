'use strict';
// Computer opponents. Uses full map knowledge (classic Civ-style AI).

function atWarAny(p) { return S.players.some(q => !q.barb && q.alive && q !== p && p.war[q.id]); }
function enemiesOf(p) { return S.players.filter(q => q.alive && q !== p && !q.barb && p.war[q.id]); }

function aiPickResearch(p) {
  const av = availableTechs(p);
  if (!av.length) { p.research = null; return; }
  const war = atWarAny(p), late = ['computers', 'rocketry', 'spaceflight'];
  const home = citiesOf(p)[0] || unitsOf(p)[0], stranded = home && !canSail(p) && landmassSize(regionOf(home.y * S.w + home.x)) < 150;
  const sc = k => {
    let s = -TECHS[k].cost + R() * 30;
    if (Object.values(BLDS).some(b => b.tech === k)) s += 25;
    if (war && Object.values(UNITS).some(u => u.tech === k)) s += 60;
    if (late.includes(k)) s += 200;
    if (stranded && (k === 'sailing' || k === 'pottery')) s += 120; // small island: boats first
    return s;
  };
  av.sort((a, b) => sc(b) - sc(a)); p.research = av[0]; p.rq = [];
}

// per-day caches: income and the best-producing city are asked for many times while one civ plans its day
function aiDay(p) { if (p._aiT !== S.turn) { p._aiT = S.turn; p._inc = null; p._top = null; p._barbs = null; } return p; }
function aiIncome(p) { aiDay(p); return p._inc ?? (p._inc = income(p)); }
function aiTopCity(p, cs) { aiDay(p); if (!p._top || !cs.includes(p._top)) p._top = cs.reduce((a, b) => (cityStats(a).p >= cityStats(b).p ? a : b)); return p._top; }
// barbarians within 6 tiles of this civ's cities, listed once per day
function aiBarbsNear(p) {
  aiDay(p); if (p._barbs) return p._barbs;
  const b = barbP(), home = citiesOf(p);
  return (p._barbs = b ? S.units.filter(o => o.o === b.id && home.some(c => dist(c.x, c.y, o.x, o.y) <= 6)) : []);
}
// a route that could not be found is not searched for again for a few days
function noRoute(u, x, y) { return u._nr && u._nr.x === x && u._nr.y === y && u._nr.t > S.turn; }
function markNoRoute(u, x, y) { u._nr = { x, y, t: S.turn + 4 + Math.floor(R() * 4) }; }
function aiTurn(p) {
  aiDiplomacy(p);
  if (!p.research) aiPickResearch(p);
  aiAssignGarrisons(p);
  for (const u of unitsOf(p)) if (S.units.includes(u)) aiUnit(p, u);
  for (const c of citiesOf(p)) if (!c.q.length) c.q.push(aiChooseBuild(p, c));
  if (p.gold > 250) { const c = citiesOf(p).find(o => { const g = buyCost(o); return g > 0 && g < p.gold - 120; }); if (c) buyItem(c); }
}

function aiDiplomacy(p) {
  for (const q of S.players) {
    if (q === p || q.barb || !q.alive || !p.met[q.id]) continue;
    if (p.war[q.id]) {
      const wt = S.turn - (p.warT[q.id] || 0);
      if ((wt >= 20 && (power(p) < power(q) * 0.7 || wt > 50) && R() < 0.1) || (trait(p) === 'peaceful' && wt >= 10 && R() < 0.15)) {
        if (q.human) { if (!S.offers.some(o => o.from === p.id)) S.offers.push({ from: p.id }); }
        else makePeace(p, q);
      }
    } else if (canDeclare(p, q) && S.turn > 25) {
      const tr = trait(p), near = citiesOf(p).some(a => citiesOf(q).some(b => dist(a.x, a.y, b.x, b.y) <= 14));
      const edge = tr === 'aggressive' ? 1.0 : tr === 'peaceful' ? 1.8 : 1.2, chance = tr === 'aggressive' ? 0.1 : tr === 'peaceful' ? 0.01 : 0.04;
      if (near && power(p) > power(q) * edge && R() < chance) declareWar(p, q);
    }
  }
}

function bestUnit(p, c, pred) {
  let best = null, bs = -1;
  for (const k in UNITS) {
    const d = UNITS[k];
    if (d.cls === 'civ' || k === 'scout' || !canBuildUnit(p, c, k) || !pred(d)) continue;
    const s = d.str + (d.rs || 0) * 0.8;
    if (s > bs) { bs = s; best = k; }
  }
  return best;
}
function landmassSize(r) { let n = 0; for (let i = 0; i < S.map.length; i++) if (regionOf(i) === r) n++; return n; }
function cityTarget(p) { const majors = S.players.filter(q => !q.barb).length; return Math.max(3, Math.min(16, Math.round(S.land / majors / 32))) + (p && trait(p) === 'expansionist' ? 3 : 0); }
function aiChooseBuild(p, c) {
  const cs = citiesOf(p), us = unitsOf(p);
  const queued = id => cs.filter(o => o.q[0] && o.q[0].id === id).length;
  const mil = us.filter(u => !isCiv(u)).length;
  const settlers = us.filter(u => u.type === 'settler').length + queued('settler');
  const workers = us.filter(u => u.type === 'worker').length + queued('worker');
  const war = atWarAny(p);
  const U = k => ({ k: 'u', id: k }), B = k => ({ k: 'b', id: k });
  const defHere = uat(c.x, c.y).some(u => u.o === p.id && !isCiv(u));
  if (canBuildBld(p, c, 'spaceship')) return B('spaceship');
  if (!defHere && mil < cs.length * 2 + 2) return U(bestUnit(p, c, d => !d.rs && d.cls !== 'mounted') || 'warrior');
  if (war && mil < cs.length * 4) return U((R() < 0.3 && bestUnit(p, c, d => !!d.rs)) || bestUnit(p, c, d => !d.rs) || 'warrior');
  if (workers < Math.min(cs.length, 6)) return U('worker');
  if (settlers === 0 && cs.length < cityTarget(p) && c.pop >= 2 && hasSite(p, c)) return U('settler');
  if (mil < cs.length * (trait(p) === 'builder' || trait(p) === 'peaceful' ? 1.1 : 1.5) + 1) return U(bestUnit(p, c, () => true) || 'warrior');
  // the most productive city of a civilization sometimes takes on a world wonder
  const top = aiTopCity(p, cs);
  if (top === c && R() < (trait(p) === 'builder' ? 0.7 : 0.3)) {
    const w = Object.keys(BLDS).filter(k => BLDS[k].wonder && canBuildBld(p, c, k) && !cs.some(o => o.q[0] && o.q[0].id === k)).sort((a, b) => BLDS[a].cost - BLDS[b].cost)[0];
    if (w) return B(w);
  }
  const st = cityStats(c);
  const order = ['monument', 'granary', 'library', 'temple', 'market', 'harbor', 'lighthouse', 'forge', 'barracks', 'stable', 'mint', 'theater', 'academy', 'colosseum', 'aqueduct', 'university', 'workshop', 'observatory', 'cathedral', 'castle', 'bank', 'factory', 'hospital', 'museum', 'stockex', 'powerplant', 'stadium', 'broadcast', 'lab'];
  if (st.unhappy > 0) order.unshift('temple', 'colosseum', 'cathedral');
  if (war) order.unshift('walls');
  if (c.pop < 6) order.splice(order.indexOf('aqueduct'), 1);
  const inc = aiIncome(p);
  if (inc < 3 && p.gold < 60) order.unshift('market', 'bank');
  for (const b of order) if (canBuildBld(p, c, b) && (BLDS[b].up === 0 || inc >= BLDS[b].up + 1 || p.gold > 100)) return B(b);
  if (mil < cs.length * 2.5) return U(bestUnit(p, c, () => true) || 'warrior');
  return { k: R() < 0.5 ? 'w' : 'r' };
}

function siteScore(p, x, y) {
  if (!canFound(p, x, y)) return -1;
  let s = 0;
  fatCross(x, y, (nx, ny) => { const tl = T(nx, ny); if (tl.owner >= 0 && tl.owner !== p.id) return; const v = tileYield(tl, p); s += v[0] * 1.3 + v[1] + v[2] * 0.6 + (tl.res ? 1 : 0); });
  if (T(x, y).t === 'hills') s += 2;
  if (cityDist(x, y) < 4) s -= 6;
  return s;
}
// whether a city still has room to expand nearby; looked up at most every 8 days per city
function hasSite(p, c) {
  if (c._siteT == null || S.turn - c._siteT >= 8) { c._siteT = S.turn; c._site = !!aiFindSite(p, c.x, c.y, canSail(p) ? 16 : 10); }
  return c._site;
}
function aiFindSite(p, ox, oy, r) {
  let best = null, bs = 0;
  const sea = canSail(p), home = regionOf(oy * S.w + ox, sea);
  around(ox, oy, r, (x, y) => { if (regionOf(y * S.w + x, sea) !== home) return; const s = siteScore(p, x, y) - dist(ox, oy, x, y) * 0.8; if (s > bs) { bs = s; best = { x, y }; } });
  return bs > 14 ? best : null;
}

function aiUnit(p, u) {
  if (u.type === 'settler') return aiSettler(p, u);
  if (u.type === 'worker') return aiWorker(p, u);
  return aiMil(p, u);
}
// walk toward (x,y); the route is kept between days and only searched again when the goal changes or it gets blocked
function goTo(u, x, y, stopShort) {
  if (!(u._gx === x && u._gy === y && u.path && u.path.length)) {
    if (noRoute(u, x, y)) { u.path = null; return false; }
    const path = findPath(u, x, y, 6000);
    if (!path) { u.path = null; markNoRoute(u, x, y); return false; }
    u.path = stopShort ? path.slice(0, -stopShort) : path; u._gx = x; u._gy = y;
  }
  followPath(u);
  return true;
}
function aiSettler(p, u) {
  if (!p.everCity && canFound(p, u.x, u.y)) { foundCity(p, u.x, u.y); killUnit(u); return; }
  if (u.tgt && !canFound(p, u.tgt.x, u.tgt.y)) u.tgt = null;
  if (!u.tgt) u.tgt = aiFindSite(p, u.x, u.y, canSail(p) ? 18 : 12);
  if (!u.tgt) { // nowhere to go: join the nearest city
    const c = citiesOf(p).sort((a, b) => dist(a.x, a.y, u.x, u.y) - dist(b.x, b.y, u.x, u.y))[0];
    if (c) { c.pop++; killUnit(u); }
    return;
  }
  if (u.x !== u.tgt.x || u.y !== u.tgt.y) if (!goTo(u, u.tgt.x, u.tgt.y)) { u.tgt = null; return; }
  if (u.x === u.tgt.x && u.y === u.tgt.y && canFound(p, u.x, u.y)) { foundCity(p, u.x, u.y); killUnit(u); }
}

function bestImpFor(p, tl) {
  if (tl.city >= 0) return null;
  for (const k of ['pasture', 'plantation', 'mine', 'lumber', 'farm']) if (!tl.imp && canImprove(tl, k, p)) return k;
  return null;
}
function startTask(u, k) { u.task = { k, left: k === 'road' ? ROAD.turns : IMPR[k].turns }; u.mp = 0; u.path = null; u.fort = 0; }
function aiWorker(p, u) {
  if (u.task) { u.mp = 0; return; }
  const here = T(u.x, u.y);
  if (here.owner === p.id && here.oc >= 0) { const k = bestImpFor(p, here); if (k) { startTask(u, k); return; } }
  const taken = new Set(unitsOf(p).filter(o => o !== u && o.type === 'worker' && o.tgt).map(o => o.tgt.y * S.w + o.tgt.x));
  let tgt = null, bd = 1e9;
  for (const c of citiesOf(p)) for (const i of cityTiles(c)) {
    if (taken.has(i)) continue;
    const tl = S.map[i], k = bestImpFor(p, tl); if (!k) continue;
    const d = dist(u.x, u.y, i % S.w, (i / S.w) | 0) - (tl.res ? 3 : 0);
    if (d < bd) { bd = d; tgt = { x: i % S.w, y: (i / S.w) | 0 }; }
  }
  u.tgt = tgt;
  if (!tgt) { u.fort = 1; return; }
  goTo(u, tgt.x, tgt.y);
  if (u.x === tgt.x && u.y === tgt.y && u.mp > 0) { const k = bestImpFor(p, T(u.x, u.y)); if (k) startTask(u, k); }
}

function aiAssignGarrisons(p) {
  const war = atWarAny(p), mil = unitsOf(p).filter(u => !isCiv(u) && u.type !== 'scout');
  for (const u of mil) if (u.gar != null) { const c = cityById(u.gar); if (!c || c.o !== p.id) u.gar = null; }
  for (const c of citiesOf(p)) {
    const need = war ? 2 : 1; let have = mil.filter(u => u.gar === c.id).length;
    while (have < need) {
      const free = mil.filter(u => u.gar == null && !UNITS[u.type].rs && UNITS[u.type].cls !== 'mounted').sort((a, b) => dist(a.x, a.y, c.x, c.y) - dist(b.x, b.y, c.x, c.y));
      if (!free.length) break;
      free[0].gar = c.id; have++;
    }
  }
}
// best attack from where u stands; returns true if it attacked
function tryAttack(p, u, cautious) {
  if (u.mp <= 0 || isWater(T(u.x, u.y))) return false;
  const d = UNITS[u.type], r = d.rs ? d.rng : 1;
  let best = null, bs = cautious ? 5 : -2;
  around(u.x, u.y, r, (x, y) => {
    if (x === u.x && y === u.y || !hasEnemyAt(u, x, y)) return;
    if (!d.rs && stepKind(u, x, y) !== 'attack') return;
    const pv = previewAttack(u, x, y); if (!pv) return;
    if (pv.ad >= u.hp - 5) return;
    let s = pv.dd - pv.ad * 1.2 + (pv.dd >= pv.hp ? 40 : 0);
    if (pv.city && !d.rs && pv.hp > 110) s -= 20;
    if (s > bs) { bs = s; best = { x, y }; }
  });
  if (!best) return false;
  attack(u, best.x, best.y);
  return true;
}
// ruins and barbarian camps, listed once per turn instead of scanning the map for every unit
let _lure = null, _lureKey = '';
function lureTiles() {
  const key = S.turn + '|' + S.ver + '|' + S.seed;
  if (key !== _lureKey) { _lureKey = key; _lure = []; S.map.forEach((tl, i) => { if (tl.ruin || tl.camp) _lure.push({ x: i % S.w, y: (i / S.w) | 0 }); }); }
  return _lure;
}
function nearest(list, u) { let b = null, bd = 1e9; for (const o of list) { const d = dist(o.x, o.y, u.x, u.y); if (d < bd) { bd = d; b = o; } } return b; }
function aiMil(p, u) {
  if (u.type === 'scout') { if (!tryAttack(p, u, true)) autoExplore(u); return; }
  if (u.gar != null) {
    const c = cityById(u.gar);
    if (!c || c.o !== p.id) { u.gar = null; return; }
    if (tryAttack(p, u, true)) return;
    if (u.x !== c.x || u.y !== c.y) { goTo(u, c.x, c.y); if (u.x === c.x && u.y === c.y) u.fort = 1; }
    else u.fort = 1;
    return;
  }
  if (u.hp < 45) { const c = nearest(citiesOf(p), u); if (c && dist(c.x, c.y, u.x, u.y) > 0) goTo(u, c.x, c.y); return; }
  if (tryAttack(p, u, false)) return;
  const enemies = enemiesOf(p);
  if (enemies.length) {
    const tc = nearest(S.cities.filter(c => enemies.some(e => e.id === c.o)), u);
    if (tc) {
      const d = UNITS[u.type], r = d.rs ? d.rng : 1;
      if (dist(tc.x, tc.y, u.x, u.y) > r) {
        const keep = u._gx === tc.x && u._gy === tc.y && u.path && u.path.length; // march on along yesterday's route
        const path = keep || noRoute(u, tc.x, tc.y) ? null : findPath(u, tc.x, tc.y, 4000);
        if (!keep && !path) markNoRoute(u, tc.x, tc.y);
        if (path) {
          let k = 0; while (k < path.length - 1 && dist(path[k].x, path[k].y, tc.x, tc.y) > r) k++;
          u.path = path.slice(0, k + 1); u._gx = tc.x; u._gy = tc.y;
          const last = u.path[u.path.length - 1]; if (stepKind(u, last.x, last.y) === 'attack') u.path.pop();
        }
        if (u.path && u.path.length) followPath(u);
      }
      tryAttack(p, u, false);
      return;
    }
  }
  // peacetime: clear ruins, camps and barbarians near home
  const goals = [];
  for (const g of lureTiles()) if (dist(g.x, g.y, u.x, u.y) <= 10) goals.push(g);
  for (const o of aiBarbsNear(p)) if (S.units.includes(o)) goals.push(o);
  const g = nearest(goals, u);
  if (g) { goTo(u, g.x, g.y, uat(g.x, g.y).length ? 1 : 0); tryAttack(p, u, false); return; }
  u.fort = 1;
}
