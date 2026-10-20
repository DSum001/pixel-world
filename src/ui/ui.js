'use strict';
// God-game UI: you shape the world, every civilization is computer-run.
const $ = id => document.getElementById(id);
const cv = $('view'), ctx = cv.getContext('2d'), mini = $('mini'), mctx = mini.getContext('2d');
const UI = { vfx: [], shake: 0, anim: new Map(), disp: new Map(), life: [], sel: null, selCity: null, selTile: null, reach: null, targets: null, path: null, hover: null, fx: [], cityTiles: null, selLife: null, followLife: false };
const ZOOMS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
const SAVE_KEY = 'pixelworld.save.v1';
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
let VW = 0, VH = 0, DPR = 1;
// time: at x1 a day lasts DAY_MS; SPEEDS are multipliers (0 = paused)
const DAY_MS = 10000, SPEEDS = [0, 1, 5, 10, 50, 100];
let SPEED = 2, lastSpeed = 2, tickAcc = 0, lastT = 0, busy = false, lastSave = 0;
// god tools
let TOOL = 'look', BRUSH_T = 'grass', BRUSH_R = 'rice', BRUSH_SIZE = 1, DIS_K = 'meteor', BLESS_K = 'city';
const DIS = { meteor: ['dMeteor', 'hdMeteor', 'meteor'], plague: ['dPlague', 'hdPlague', 'unhappy'], volcano: ['dVolcano', 'hdVolcano', 'fire'], quake: ['dQuake', 'hdQuake', 'def'], tsunami: ['dTsunami', 'hdTsunami', 'wave'], lightning: ['dLightning', 'hdLightning', 'bolt'] };
const BLESS = { city: ['bCity', 'hbCity', 'happy'], bounty: ['bBounty', 'hbBounty', 'food'] };
const TOOLS = ['look', 'terrain', 'res', 'critter', 'civ', 'camp', 'bless', 'disaster'];
let CRIT_K = 'deer';
const TOOL_KEY = { critter: 'tCritter', look: 'tLook', terrain: 'tTerrain', res: 'tRes', civ: 'tCiv', camp: 'tCamp', bless: 'tBless', disaster: 'tDisaster' };
const TOOL_HINT = { critter: 'hCritter', look: 'hLook', terrain: 'hTerrain', res: 'hRes', civ: 'hCiv', camp: 'hCamp', bless: 'hBless', disaster: 'hDisaster' };

LANG = store.get('pixelciv.lang') || 'th';
document.documentElement.lang = LANG;

function toast(msg, x, y) {
  const d = document.createElement('div'); d.textContent = msg;
  if (x != null) d.onclick = () => centerOn(x, y);
  const log = $('log'); log.prepend(d); while (log.children.length > 6) log.lastChild.remove();
}
const chronText = e => t(e.k, ...(e.a || []).map(v => (Array.isArray(v) ? v[LANG === 'th' ? 1 : 0] : v)));
const FOLLOW_KINDS = ['captured', 'chFound', 'chWonder', 'chVolcano', 'chQuake', 'chTsunami', 'chPlague', 'chNewCiv', 'chDisaster', 'chLaunch', 'eliminated', 'chRaid'];
onChron = e => {
  toast(chronText(e), e.x, e.y);
  const now = performance.now();
  if (UI.follow && e.x != null && FOLLOW_KINDS.includes(e.k) && now - (UI.followT || 0) > 4000) { UI.followT = now; UI.camGoal = { x: e.x, y: e.y }; }
};
onAnim = (u, k) => UI.anim.set(u.id, { k, t: performance.now() });
onFx = (x, y, text) => { UI.fx.push({ x, y, text, t: performance.now() }); if (UI.fx.length > 24) UI.fx.shift(); }; // few at a time, even at x100
onVfx = (k, x, y) => { UI.vfx.push({ k, x, y, t: performance.now() }); if (k === 'quake' || k === 'volcano') UI.shake = performance.now() + (k === 'quake' ? 1400 : 700); };

/* ---------- camera ---------- */
// render resolution: device pixels up to 2x; drops to 1x automatically if frames run slow
let RS_MAX = Math.min(2, window.devicePixelRatio || 1), slowFrames = 0, frameAvg = 16;
function resize() { DPR = Math.min(RS_MAX, window.devicePixelRatio || 1); VW = cv.clientWidth; VH = cv.clientHeight; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); }
function ts() { return TS * CAM.z; }
// the map always fills the screen: zoom never goes below "map fits the view", and the camera stops at the map edges
function fitZoom() { return Math.max(VW / (S.w * TS), VH / (S.h * TS)); }
function zoomList() { const f = fitZoom(); return [f, ...ZOOMS.filter(z => z > f * 1.05)]; }
function clampCam() {
  if (CAM.z < fitZoom()) CAM.z = fitZoom();
  const t = ts(); CAM.x = Math.max(0, Math.min(S.w * t - VW, CAM.x)); CAM.y = Math.max(0, Math.min(S.h * t - VH, CAM.y));
}
function centerOn(x, y) { const t = ts(); CAM.x = x * t + t / 2 - VW / 2; CAM.y = y * t + t / 2 - VH / 2; clampCam(); }
function zoomAt(dir, mx = VW / 2, my = VH / 2) {
  const L = zoomList(); let cur = 0; L.forEach((z, k) => { if (Math.abs(z - CAM.z) < Math.abs(L[cur] - CAM.z)) cur = k; });
  const i = Math.max(0, Math.min(L.length - 1, cur + dir)); if (L[i] === CAM.z) return;
  const wx = (CAM.x + mx) / ts(), wy = (CAM.y + my) / ts();
  CAM.z = L[i]; CAM.x = wx * ts() - mx; CAM.y = wy * ts() - my; clampCam();
}
function tileAtScreen(mx, my) { const t = ts(), x = Math.floor((CAM.x + mx) / t), y = Math.floor((CAM.y + my) / t); return inb(x, y) ? { x, y } : null; }

/* ---------- loop ---------- */
function frame(now) {
  const dt = lastT ? Math.min(250, now - lastT) : 0; lastT = now;
  if (S && RS_MAX > 1 && dt) { frameAvg = frameAvg * 0.95 + dt * 0.05; if (++slowFrames > 40 && frameAvg > 32) { RS_MAX = 1; resize(); } } // under ~30 fps: render at 1x
  if (S && SPEED && $('modal').hidden && !busy) {
    tickAcc += dt * SPEEDS[SPEED];
    const n = Math.floor(tickAcc / DAY_MS);
    if (n > 0) { tickAcc = Math.min(tickAcc - n * DAY_MS, DAY_MS - 1); advance(Math.min(n, 3)); } // at most 3 days per frame keeps x100 smooth
  }
  if (S && UI.camGoal) { // glide toward the followed event
    const t = ts(), gx = UI.camGoal.x * t + t / 2 - VW / 2, gy = UI.camGoal.y * t + t / 2 - VH / 2, k = Math.min(1, dt / 350);
    CAM.x += (gx - CAM.x) * k; CAM.y += (gy - CAM.y) * k; clampCam();
    if (Math.abs(gx - CAM.x) < 2 && Math.abs(gy - CAM.y) < 2) UI.camGoal = null;
  }
  if (S) {
    $('tbar').firstChild.style.width = (SPEED ? Math.min(100, tickAcc / DAY_MS * 100) : 0) + '%';
    updateLife(dt / 1000);
    const sh = UI.shake > now ? 3 * CAM.z : 0; // earthquakes rattle the view
    ctx.setTransform(DPR, 0, 0, DPR, (Math.random() - 0.5) * sh * DPR, (Math.random() - 0.5) * sh * DPR);
    drawWorld(ctx, VW, VH, UI);
    drawMini(mctx, mini.width, mini.height, VW, VH);
    if (UI.selLife) lifeTick(now);
  }
  requestAnimationFrame(frame);
}
// run n days, then refresh the screen once
function advance(n) {
  if (busy || !S) return;
  busy = true;
  const t0 = performance.now();
  for (let k = 0; k < n && (k === 0 || performance.now() - t0 < 25); k++) { endTurn(); topUpLife(); } // big worlds at x100 run as fast as the device allows
  busy = false;
  const now = performance.now();
  if (now - lastSave > 20000) { lastSave = now; (window.requestIdleCallback || setTimeout)(() => { if (S) store.set(SAVE_KEY, saveJSON()); }, { timeout: 2000 }); } // autosave when the browser is idle; also saved when the page is hidden
  if (UI.sel && !S.units.includes(UI.sel)) UI.sel = null;
  syncPeople(); refresh();
}
function step() { tickAcc = 0; advance(1); }
function setSpeed(s) { if (s) lastSpeed = s; if (s !== SPEED) tickAcc = Math.min(tickAcc, DAY_MS / 2); SPEED = s; renderClock(); } // drop the leftover x100 backlog so the new speed shows at once
// buttons are built once and only re-highlighted: refresh() runs every day, and rebuilding them at x100 swallowed clicks
function renderClock() {
  const c = $('clock'), labels = SPEEDS.map(m => (m ? '×' + m : '❚❚'));
  if (c.dataset.lang !== LANG || c.children.length !== SPEEDS.length) {
    c.dataset.lang = LANG;
    c.innerHTML = labels.map((l, i) => `<button data-s="${i}" aria-label="${i ? t('speed') + ' ' + l : t('pause')}">${l}</button>`).join('');
    c.querySelectorAll('[data-s]').forEach(b => b.onpointerdown = e => { if (e.button === 0) setSpeed(+b.dataset.s); });
    c.querySelectorAll('[data-s]').forEach(b => b.onclick = e => { if (!e.detail) setSpeed(+b.dataset.s); }); // keyboard activation
  }
  [...c.children].forEach((b, i) => b.classList.toggle('on', SPEED === i));
}

/* ---------- top bar, tools, inspector ---------- */
// world calendar: one turn is one day; a year has 120 days in three 40-day seasons
const YEAR_DAYS = 120, SEASONS = ['seasonHot', 'seasonRain', 'seasonCool'];
function worldDate(tn) { return { day: tn + 1, year: Math.floor(tn / YEAR_DAYS) + 1, season: SEASONS[Math.floor((tn % YEAR_DAYS) / 40)] }; }
function fmtDate(tn) { const d = worldDate(tn); return t('dateLong', d.day, d.year); }
function refresh() {
  if (!S) return;
  const alive = S.players.filter(p => !p.barb && p.alive), pop = S.cities.reduce((a, c) => a + c.pop, 0);
  const lead = alive.slice().sort((a, b) => score(b) - score(a))[0];
  $('top').innerHTML = `
    <span class="stat">${t('day', worldDate(S.turn).day)} <small>${t('yearN', worldDate(S.turn).year)} · ${t(worldDate(S.turn).season)}</small></span>
    <span class="stat" title="${t('civs')}">${iconImg('eye')}${alive.length}</span>
    <span class="stat" title="${t('cities')}">${iconImg('def')}${S.cities.length}</span>
    <span class="stat" title="${t('people')}">${iconImg('pop')}${pop}</span>
    ${lead ? `<span class="stat hidem"><span class="flag" style="background:${civDef(lead).col}"></span>${civName(lead)} <small>${nm({ n: ERAS[lead.era || 0] })}</small></span>` : ''}
    <span class="spacer"></span>
    <button id="bCivs">${t('civs')}<kbd>D</kbd></button><button id="bChron">${t('chronicle')}<kbd>H</kbd></button><button id="bStat">${t('stats')}<kbd>I</kbd></button><button id="bGal">${t('gallery')}<kbd>G</kbd></button><button id="bMenu">${t('menu')}</button><button id="bLang">${t('langBtn')}</button>`;
  $('bCivs').onclick = openCivs; $('bChron').onclick = openChronicle; $('bGal').onclick = openGallery; $('bStat').onclick = openStats; $('bMenu').onclick = openMenu; $('bLang').onclick = toggleLang;
  renderClock();
  $('endBtn').textContent = t('step');
  $('followBtn').textContent = t('follow2'); $('followBtn').classList.toggle('on', !!UI.follow);
  renderTools(); renderPanel();
}
let _toolIcons = null;
function toolIcons() {
  return _toolIcons || (_toolIcons = {
    critter: quadFrame('deer', 'idle', 0).toDataURL(), look: iconURL('eye'), terrain: tileArt('forest', 1, 0).toDataURL(), res: resCanvas('gems').toDataURL(),
    civ: spriteURL('settler', { civ: 0 }), camp: campCv().toDataURL(), bless: iconURL('happy'), disaster: iconURL('meteor'),
  });
}
function renderTools() {
  const ic = toolIcons();
  $('tools').innerHTML = TOOLS.map(k => `<button data-tool="${k}" class="${TOOL === k ? 'on' : ''}" title="${t(TOOL_KEY[k])}"><img alt="" src="${ic[k]}"><span>${t(TOOL_KEY[k])}</span></button>`).join('');
  $('tools').querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { TOOL = b.dataset.tool; clearSel(); refresh(); });
  const pal = $('pal');
  if (TOOL === 'look') { pal.hidden = true; return; }
  pal.hidden = false;
  let sw = '';
  if (TOOL === 'terrain') sw = `<div class="sw">${['grass', 'plains', 'desert', 'tundra', 'snow', 'forest', 'jungle', 'hills', 'mountain', 'ocean'].map(k => `<button data-t="${k}" class="${BRUSH_T === k ? 'on' : ''}"><img alt="" src="${tileArt(k, 0, 0).toDataURL()}">${nm(TERRAIN[k])}</button>`).join('')}</div>
    <div class="seg"><span class="hint">${t('brush')}</span>${[1, 3, 5].map(b => `<button data-b="${b}" class="${BRUSH_SIZE === b ? 'on' : ''}">${b}×${b}</button>`).join('')}</div>`;
  if (TOOL === 'res') sw = `<div class="sw">${Object.keys(RES).map(k => `<button data-r="${k}" class="${BRUSH_R === k ? 'on' : ''}"><img alt="" src="${resCanvas(k).toDataURL()}">${nm(RES[k])}</button>`).join('')}<button data-r="" class="${BRUSH_R === '' ? 'on' : ''}">${t('remove')}</button></div>`;
  let hint = t(TOOL_HINT[TOOL]);
  const kinds = (set, cur, attr) => `<div class="sw">${Object.keys(set).map(k => `<button data-${attr}="${k}" class="${cur === k ? 'on' : ''}"><img alt="" src="${iconURL(set[k][2])}">${t(set[k][0])}</button>`).join('')}</div>`;
  if (TOOL === 'critter') sw = `<div class="sw" style="max-height:44vh;overflow:auto">${[...Object.keys(QUADS).map(k => [k, quadFrame(k, 'idle', 0), QUADS[k].n]), ...Object.keys(SMALL).map(k => [k, smallFrame(k, 0), SMALL_N[k]])].map(([k, cvs, n]) => `<button data-ck="${k}" class="${CRIT_K === k ? 'on' : ''}"><img alt="" src="${cvs.toDataURL()}" style="width:22px;height:18px;object-fit:contain">${nm({ n })}</button>`).join('')}</div>`;
  if (TOOL === 'disaster') { sw = kinds(DIS, DIS_K, 'dk'); hint = t(DIS[DIS_K][1]); }
  if (TOOL === 'bless') { sw = kinds(BLESS, BLESS_K, 'bk'); hint = t(BLESS[BLESS_K][1]); }
  pal.innerHTML = `${sw}<div class="hint">${hint}</div>`;
  pal.querySelectorAll('[data-ck]').forEach(b => b.onclick = () => { CRIT_K = b.dataset.ck; renderTools(); });
  pal.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => { DIS_K = b.dataset.dk; renderTools(); });
  pal.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => { BLESS_K = b.dataset.bk; renderTools(); });
  pal.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { BRUSH_T = b.dataset.t; renderTools(); });
  pal.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { BRUSH_R = b.dataset.r; renderTools(); });
  pal.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { BRUSH_SIZE = +b.dataset.b; renderTools(); });
}
function clearSel() { UI.sel = UI.selCity = UI.selTile = UI.cityTiles = UI.selLife = null; UI.followLife = false; }
function renderPanel() {
  const pn = $('panel');
  if (UI.selLife && !UI.life.includes(UI.selLife)) UI.selLife = null; // eaten, or left the map
  if (UI.selLife) return lifePanel(pn, UI.selLife);
  pn.dataset.life = '';
  if (UI.sel && S.units.includes(UI.sel)) {
    const u = UI.sel, d = UNITS[u.type];
    pn.innerHTML = `<div class="ph"><img class="big" alt="" src="${spriteURL(u.type, P(u.o))}"><div><h3>${nm(d)}</h3><div class="sub">${civName(P(u.o))}${u.lvl ? ' · ' + t('level') + ' ' + u.lvl : ''}</div></div></div>
      <div class="kv">${d.str ? `<span>${iconImg('str')} ${d.str}${d.rs ? ' / ' + d.rs : ''}</span>` : ''}<span>${iconImg('mv')} ${d.mv}</span><span>${iconImg('hp')} ${u.hp}</span></div>`;
  } else if (UI.selCity && cityById(UI.selCity.id)) {
    const c = UI.selCity, st = cityStats(c), it = c.q[0], p = P(c.o);
    const wars = S.players.filter(q => !q.barb && q.alive && p.war[q.id]);
    pn.innerHTML = `<div class="ph"><img class="big" alt="" src="${citySprite(c).toDataURL()}"><div><h3>${cname(c)}</h3><div class="sub"><span class="flag" style="background:${civDef(p).col}"></span> ${civName(p)}${c.blds.palace ? ' · ' + t('capital') : ''}</div></div></div>
      <div class="kv"><span>${iconImg('pop')} ${c.pop}</span><span>${iconImg('def')} ${Math.round(cityStr(c))}</span><span>${iconImg('hp')} ${c.hp}/${cityMaxHp(c)}</span>
      <span>${iconImg('food')} ${st.surplus >= 0 ? '+' : ''}${st.surplus}</span><span>${iconImg('prod')} ${st.p}</span><span>${iconImg('gold')} ${st.g}</span>
      <span>${iconImg('sci')} ${st.sci}</span><span>${iconImg('cul')} ${st.cul}</span><span>${iconImg(st.unhappy ? 'unhappy' : 'happy')} ${c.pop - st.unhappy}/${c.pop}</span></div>
      <div class="hint">${t(SEASONS[seasonOf(S.turn)])}${st.sf ? ` ${iconImg('food')} ${st.sf > 0 ? '+' : ''}${st.sf}` : ''}${c.plague > 0 ? ` · <b style="color:var(--bad)">${t('plagueTag')} ${c.plague}</b>` : ''}${c.bounty > 0 ? ` · <b style="color:var(--gold)">${t('bountyTag')} ${c.bounty}</b>` : ''}</div>
      <div class="hint">${t('building')}: ${it ? itemName(it) + (itemCost(it) ? ` (${c.prod}/${itemCost(it)})` : '') : t('nothing')}</div>
      ${wars.length ? `<div class="hint" style="color:var(--bad)">${t('atWarWith')}: ${wars.map(civName).join(', ')}</div>` : ''}
      <div class="chips" style="margin-top:6px">${Object.keys(c.blds).map(b => `<span class="chip">${nm(BLDS[b])}</span>`).join('')}</div>`;
  } else if (UI.selTile) {
    const { x, y } = UI.selTile, tl = T(x, y), yv = tileYield(tl, null);
    pn.innerHTML = `<div class="ph"><div><h3>${nm(TERRAIN[tl.t])}</h3><div class="sub">${[tl.res ? nm(RES[tl.res]) : '', tl.imp ? nm(IMPR[tl.imp]) : '', tl.road ? nm(ROAD) : '', tl.camp ? t('camp') : '', tl.ruin ? t('ruins') : ''].filter(Boolean).join(' · ') || '&nbsp;'}</div></div></div>
      <div class="kv"><span>${iconImg('food')} ${yv[0]}</span><span>${iconImg('prod')} ${yv[1]}</span><span>${iconImg('gold')} ${yv[2]}</span></div>
      <div class="hint">${t('owner')}: ${tl.owner >= 0 ? civName(P(tl.owner)) : t('none')}</div>`;
  } else pn.innerHTML = '';
}

/* ---------- input ---------- */
function applyTool(x, y, quiet) {
  if (TOOL === 'look') {
    const c = cityAt(x, y), us = uat(x, y);
    clearSel();
    if (c) { UI.selCity = c; UI.cityTiles = cityTiles(c); }
    else if (us.length) UI.sel = us.find(u => !isCiv(u)) || us[0];
    else UI.selTile = { x, y };
  } else if (TOOL === 'terrain') {
    around(x, y, (BRUSH_SIZE - 1) / 2, (nx, ny) => paintTerrain(nx, ny, BRUSH_T));
  } else if (TOOL === 'res') {
    if (!placeRes(x, y, BRUSH_R)) toast(t('cantHere'));
  } else if (TOOL === 'civ') {
    const p = addCiv(x, y);
    if (p === 'full') toast(t('civsFull')); else if (p === 'bad') toast(t('cantHere'));
  } else if (TOOL === 'critter') {
    if (!placeCreature(CRIT_K, x, y)) toast(t('cantHere'));
  } else if (TOOL === 'camp') {
    if (!placeCamp(x, y)) toast(t('cantHere'));
  } else if (TOOL === 'bless') {
    const c = cityAt(x, y); if (!c) toast(t('cantHere')); else if (BLESS_K === 'bounty') bounty(P(c.o)); else bless(c);
  } else if (TOOL === 'disaster') {
    const c = cityAt(x, y);
    const ok = DIS_K === 'meteor' ? (disaster(x, y), true) : DIS_K === 'plague' ? plague(c) : DIS_K === 'volcano' ? volcano(x, y) : DIS_K === 'quake' ? quake(x, y) : DIS_K === 'tsunami' ? tsunami(x, y) : lightning(x, y);
    if (!ok) toast(t('cantHere'));
  }
  LAYER.force = true; // god edits repaint the map at once
  if (quiet) return; // drag painting refreshes once when the stroke ends
  if (TOOL !== 'look') syncPeople();
  refresh();
}
const ptrs = new Map(); let drag = null, pinch = null;
function paintAt(e) {
  const r = cv.getBoundingClientRect(), tl = tileAtScreen(e.clientX - r.left, e.clientY - r.top);
  if (!tl) return; const k = tl.y * S.w + tl.x; if (k === drag.last) return;
  drag.last = k; applyTool(tl.x, tl.y, true);
}
function strokeDone() { syncPeople(); refresh(); }
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) {
    drag = { x: e.clientX, y: e.clientY, cx: CAM.x, cy: CAM.y, moved: false, paint: e.button === 0 && (TOOL === 'terrain' || TOOL === 'res'), last: -1 };
    if (drag.paint && S) paintAt(e);
  } else if (ptrs.size === 2) {
    if (drag && drag.paint) strokeDone();
    const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cx: CAM.x, cy: CAM.y }; drag = null;
  }
});
cv.addEventListener('pointermove', e => {
  if (!S) return;
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size === 2) { // two fingers: pinch zooms, moving both pans
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const z = d / pinch.d > 1.3 ? 1 : d / pinch.d < 0.77 ? -1 : 0;
    if (z) { zoomAt(z, mx, my); Object.assign(pinch, { d, mx, my, cx: CAM.x, cy: CAM.y }); }
    else { CAM.x = pinch.cx - (mx - pinch.mx); CAM.y = pinch.cy - (my - pinch.my); clampCam(); }
    return;
  }
  if (drag && drag.paint) { paintAt(e); return; }
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 7) drag.moved = true; if (drag.moved) { UI.followLife = false; CAM.x = drag.cx - dx; CAM.y = drag.cy - dy; clampCam(); $('tip').style.display = 'none'; } return; }
  if (e.pointerType === 'mouse') hoverAt(e);
});
cv.addEventListener('pointerup', e => {
  ptrs.delete(e.pointerId);
  if (drag && drag.paint) strokeDone();
  else if (drag && !drag.moved && S) {
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, c = TOOL === 'look' ? lifeAt(mx, my, e.pointerType === 'touch' ? 26 : 16) : null;
    if (c) { clearSel(); UI.selLife = c; refresh(); }
    else { const tl = tileAtScreen(mx, my); if (tl) applyTool(tl.x, tl.y); }
  }
  if (ptrs.size < 2) pinch = null; drag = null;
});
cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; pinch = null; });
cv.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; UI.hover = null; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { e.preventDefault(); if (!S) return; const r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
let lastHover = -1, lastHoverTurn = -1;
function hoverAt(e) {
  const r = cv.getBoundingClientRect(), tl = tileAtScreen(e.clientX - r.left, e.clientY - r.top), tip = $('tip');
  if (!tl) { tip.style.display = 'none'; UI.hover = null; return; }
  UI.hover = tl;
  const k = tl.y * S.w + tl.x;
  if (k !== lastHover || S.turn !== lastHoverTurn) { lastHover = k; lastHoverTurn = S.turn; tip.innerHTML = tileTip(tl.x, tl.y); }
  tip.style.display = 'block';
  tip.style.left = Math.min(window.innerWidth - 270, e.clientX + 16) + 'px'; tip.style.top = Math.min(window.innerHeight - 120, e.clientY + 16) + 'px';
}
function tileTip(x, y) {
  const tl = T(x, y), yv = tileYield(tl, null), parts = [nm(TERRAIN[tl.t])];
  if (tl.res) parts.push(nm(RES[tl.res]));
  if (tl.imp) parts.push(nm(IMPR[tl.imp])); if (tl.road) parts.push(nm(ROAD));
  let s = `<b>${parts.join(' · ')}</b><div>${iconImg('food')}${yv[0]} ${iconImg('prod')}${yv[1]} ${iconImg('gold')}${yv[2]}</div>`;
  if (tl.owner >= 0) s += `<div>${t('owner')}: ${civName(P(tl.owner))}</div>`;
  const c = cityAt(x, y); if (c) s += `<div>${cname(c)} (${c.pop})</div>`;
  for (const u of uat(x, y)) s += `<div>${civName(P(u.o))}: ${nm(UNITS[u.type])} ${u.hp}hp</div>`;
  if (tl.camp) s += `<div>${t('camp')}</div>`; if (tl.ruin) s += `<div>${t('ruins')}</div>`;
  return s;
}
mini.addEventListener('pointerdown', e => {
  if (!S) return; const r = mini.getBoundingClientRect(), sc = Math.min(mini.width / S.w, mini.height / S.h);
  centerOn(Math.floor((e.clientX - r.left) * (mini.width / r.width) / sc), Math.floor((e.clientY - r.top) * (mini.height / r.height) / sc));
});
$('zIn').onclick = () => zoomAt(1); $('zOut').onclick = () => zoomAt(-1);
$('endBtn').onclick = () => step();
$('followBtn').onclick = () => { UI.follow = !UI.follow; refresh(); };
document.addEventListener('keydown', e => {
  if (!S || e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { if (!$('modal').hidden) closeModal(); else { TOOL = 'look'; clearSel(); refresh(); } return; }
  if (!$('modal').hidden) return;
  const k = e.key.toLowerCase(), stp = ts() * 3;
  if (k === 'arrowleft') CAM.x -= stp; else if (k === 'arrowright') CAM.x += stp;
  else if (k === 'arrowup') CAM.y -= stp; else if (k === 'arrowdown') CAM.y += stp;
  else if (k === 'enter') step();
  else if (k === 'p' || k === ' ') { e.preventDefault(); setSpeed(SPEED ? 0 : lastSpeed); }
  else if (k >= '1' && k <= '5') setSpeed(+k);
  else if (k === 'd') openCivs();
  else if (k === 'h') openChronicle();
  else if (k === 'g') openGallery();
  else if (k === 'i') openStats();
  else if (k === '+' || k === '=') zoomAt(1);
  else if (k === '-') zoomAt(-1);
  else return;
  clampCam();
});

/* ---------- modals ---------- */
function modal(html, locked) { const m = $('modal'); m.innerHTML = html; m.hidden = false; m.dataset.locked = locked ? '1' : ''; m.onclick = locked ? null : e => { if (e.target === m) closeModal(); }; $('tip').style.display = 'none'; }
function closeModal(force) { const m = $('modal'); if (m.dataset.locked && force !== true) return; m.hidden = true; m.innerHTML = ''; refresh(); }
function openCivs() {
  const list = S.players.filter(p => !p.barb).sort((a, b) => (b.alive - a.alive) || score(b) - score(a));
  const rows = list.map(p => {
    const wars = S.players.filter(q => !q.barb && q.alive && p.war[q.id]);
    const L = p.leader, wn = (S.wonders || []).filter(w => { const c = cityById(w.city); return c && c.o === p.id; }).map(w => nm(BLDS[w.k]));
    return `<tr style="${p.alive ? '' : 'opacity:.5'}"><td><span class="flag" style="background:${civDef(p).col}"></span> <b>${civName(p)}</b>${L && p.alive ? `<div class="hint">${t('ruler')}: ${nm({ n: L.n })} · ${t('trait' + L.trait[0].toUpperCase() + L.trait.slice(1))} · ${t('reign', S.turn - L.since)}</div>` : ''}${wn.length ? `<div class="hint" style="color:var(--gold)">${wn.join(', ')}</div>` : ''}</td>
      <td>${p.alive ? nm({ n: ERAS[p.era || 0] }) : t('fallen')}</td><td>${citiesOf(p).length}</td><td>${citiesOf(p).reduce((a, c) => a + c.pop, 0)}</td><td>${techCount(p)}</td><td>${Math.round(power(p))}</td><td>${score(p)}</td>
      <td>${wars.map(q => `<span class="flag" title="${civName(q)}" style="background:${civDef(q).col}"></span>`).join(' ') || '<span class="peace">—</span>'}</td>
      <td style="white-space:nowrap">${p.alive ? `<button data-f="${p.id}">${t('follow')}</button> <button data-w="${p.id}">${t('incite')}</button> ${wars.length ? `<button data-p="${p.id}">${t('peaceAllBtn')}</button>` : ''}` : ''}</td></tr>`;
  }).join('');
  modal(`<div class="dlg px"><button class="x" id="dx">${t('close')}</button><h2>${t('civs')}</h2>
    <div style="overflow-x:auto"><table class="dip"><tr><th></th><th>${t('era')}</th><th>${t('cities')}</th><th>${t('people')}</th><th>${t('techs')}</th><th>${t('power')}</th><th>${t('score')}</th><th>${t('war')}</th><th></th></tr>${rows}</table></div></div>`);
  $('dx').onclick = closeModal;
  document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { const p = P(+b.dataset.f), c = citiesOf(p).find(o => o.blds.palace) || citiesOf(p)[0], u = unitsOf(p)[0]; closeModal(); if (c) { centerOn(c.x, c.y); clearSel(); UI.selCity = c; UI.cityTiles = cityTiles(c); refresh(); } else if (u) centerOn(u.x, u.y); });
  document.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { if (!incite(P(+b.dataset.w))) toast(t('cantHere')); openCivs(); });
  document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { peaceAll(P(+b.dataset.p)); openCivs(); });
}
function openChronicle() {
  const items = S.chron.slice().reverse().map((e, i) => `<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--edge);cursor:${e.x != null ? 'pointer' : 'default'}" data-i="${S.chron.length - 1 - i}"><small style="min-width:130px;color:var(--muted)">${fmtDate(e.t)}</small><span>${chronText(e)}</span></div>`).join('');
  modal(`<div class="dlg px" style="width:min(640px,100%)"><button class="x" id="hx">${t('close')}</button><h2>${t('chronicle')}</h2><div>${items || `<p class="hint">—</p>`}</div></div>`);
  $('hx').onclick = closeModal;
  document.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const e = S.chron[+b.dataset.i]; if (e.x != null) { closeModal(); centerOn(e.x, e.y); } });
}
// gallery: every role x its actions, animated live
const GAL = { col: '#2e6bd8', skin: 0 };
function openGallery() {
  const folk = ['farmer', 'miner', 'lumberjack', 'builder', 'fisher', 'herder', 'gatherer', 'merchant', 'priest', 'scholar', 'noble'];
  const mil = ['settler', 'scout', 'warrior', 'soldier', 'spearman', 'archer', 'musketeer', 'infantry'];
  // one figure per character, shown doing its own job
  const fig = (data, w, h, label, bg) => `<figure style="margin:0;text-align:center;width:${w}px"><canvas class="gc" ${data} width="${w}" height="${h}" style="background:${bg || '#4e9832'};border:2px solid #000;image-rendering:pixelated;display:block"></canvas><figcaption class="hint" style="margin:3px 0 0">${label}</figcaption></figure>`;
  const grid = items => `<div style="display:flex;gap:10px 8px;flex-wrap:wrap">${items.join('')}</div>`;
  const row = r => fig(`data-r="${r}" data-a="${ROLES[r].work === 'herd' || ROLES[r].work === 'cheer' ? 'walk' : ROLES[r].work}"`, CW * 4, CH * 4, nm(ROLES[r]));
  const cols = [...CIVS.map(c => c.col), '#3a3a3a'];
  modal(`<div class="dlg px" style="width:min(900px,100%)"><button class="x" id="gx">${t('close')}</button><h2>${t('gallery')}</h2>
    <p class="hint">${t('galleryHint')}</p>
    <div class="seg" style="margin:6px 0">${cols.map(c => `<button data-c="${c}" class="${GAL.col === c ? 'on' : ''}" aria-label="${c}" style="width:34px;background:${c}"></button>`).join('')}
      <span class="hint" style="align-self:center;margin-left:8px">${t('skin')}</span>${[0, 1, 2, 3].map(k => `<button data-k="${k}" class="${GAL.skin === k ? 'on' : ''}" style="width:34px;background:${SKINS[k]}"></button>`).join('')}</div>
    <h4>${t('townsfolk')}</h4>${grid(folk.map(row))}<h4>${t('military')}</h4>${grid(mil.map(row))}
    <h4>${t('animals')}</h4>${grid(Object.keys(QUADS).map(k => fig(`data-q="${k}" data-a="${PREDATORS.includes(k) ? 'walk' : 'graze'}"`, QW * 4, QH * 4, nm(QUADS[k]))))}
    <h4>${t('seaSky')}</h4><div style="display:flex;gap:8px;flex-wrap:wrap">${Object.keys(SMALL).map(k => `<figure style="margin:0;text-align:center"><canvas class="gc" data-sm="${k}" width="60" height="42" style="background:${['fish', 'dolphin', 'whale', 'gull'].includes(k) ? '#2f78c0' : k === 'penguin' ? '#e8eef4' : '#4e9832'};border:2px solid #000;image-rendering:pixelated;display:block"></canvas><figcaption class="hint" style="margin:2px 0 0">${nm({ n: SMALL_N[k] })}</figcaption></figure>`).join('')}</div></div>`);
  $('gx').onclick = closeModal;
  document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { GAL.col = b.dataset.c; openGallery(); });
  document.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { GAL.skin = +b.dataset.k; openGallery(); });
  const cvs = [...document.querySelectorAll('canvas.gc')];
  const tick = now => {
    if (!cvs[0].isConnected) return;
    for (const c of cvs) {
      const g = c.getContext('2d'), d = c.dataset; g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
      if (d.r) g.drawImage(charAnim(d.r, d.a, now, 0, GAL.col, GAL.skin), 0, 0, c.width, c.height);
      else if (d.q) { const P = QPOSE[d.a]; g.drawImage(quadFrame(d.q, d.a, Math.floor(now / P.ms) % P.f.length), 0, 0, c.width, c.height); }
      else { const S2 = SMALL[d.sm], ms = d.sm === 'dolphin' ? 450 : d.sm === 'whale' ? 900 : S2.ms, img = smallFrame(d.sm, Math.floor(now / ms) % S2.f.length), sc = Math.min(3, Math.floor(56 / img.width)); g.drawImage(img, (c.width - img.width * sc) / 2, (c.height - img.height * sc) / 2, img.width * sc, img.height * sc); }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
// statistics: one line per civilization over time
let STAT_K = 0;
function openStats() {
  const H = S.hist, keys = ['stPop', 'stLand', 'stCities'];
  modal(`<div class="dlg px" style="width:min(980px,100%)"><button class="x" id="sx">${t('close')}</button><h2>${t('stats')}</h2>
    <div class="seg" style="margin-bottom:8px">${keys.map((k, i) => `<button data-st="${i}" class="${STAT_K === i ? 'on' : ''}">${t(k)}</button>`).join('')}</div>
    ${H && H.t.length > 1 ? `<canvas id="chart" style="width:100%;height:auto;display:block;background:#2c2117;border:2px solid #4a3220"></canvas><div class="chips" id="legend" style="margin-top:8px"></div>` : `<p class="hint">${t('noHistory')}</p>`}</div>`);
  $('sx').onclick = closeModal;
  document.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { STAT_K = +b.dataset.st; openStats(); });
  if (H && H.t.length > 1) drawChart($('chart'), H, STAT_K);
}
function drawChart(cvs, H, k) {
  const W = 900, Hh = 380, dpr = Math.min(2, window.devicePixelRatio || 1), padL = 46, padR = 14, padT = 14, padB = 30;
  cvs.width = W * dpr; cvs.height = Hh * dpr; const g = cvs.getContext('2d'); g.scale(dpr, dpr);
  const players = S.players.filter(p => !p.barb && H.s[p.id]);
  let max = 1; for (const p of players) for (const v of H.s[p.id]) max = Math.max(max, v[k]);
  const step = Math.pow(10, Math.floor(Math.log10(max))), nice = Math.ceil(max / step) * step;
  const X = i => padL + (W - padL - padR) * i / (H.t.length - 1), Y = v => padT + (Hh - padT - padB) * (1 - v / nice);
  g.font = '12px "Bai Jamjuree", sans-serif'; g.fillStyle = '#cbb58c'; g.strokeStyle = 'rgba(203,181,140,.16)'; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const v = nice * i / 4, y = Y(v); g.beginPath(); g.moveTo(padL, y); g.lineTo(W - padR, y); g.stroke(); g.textAlign = 'right'; g.fillText(String(Math.round(v)), padL - 6, y + 4); }
  g.textAlign = 'center'; for (let i = 0; i <= 5; i++) { const j = Math.round((H.t.length - 1) * i / 5); g.fillText(t('day', H.t[j] + 1), X(j), Hh - 10); }
  const order = players.slice().sort((a, b) => H.s[b.id][H.s[b.id].length - 1][k] - H.s[a.id][H.s[a.id].length - 1][k]);
  for (const p of order) {
    const a = H.s[p.id], col = civDef(p).col; g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
    a.forEach((v, i) => { const x = X(i), y = Y(v[k]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    const last = a[a.length - 1]; g.fillStyle = col; g.beginPath(); g.arc(X(a.length - 1), Y(last[k]), 3.5, 0, 7); g.fill();
  }
  $('legend').innerHTML = order.map(p => `<span class="chip"><span class="flag" style="background:${civDef(p).col}"></span> ${civName(p)} · ${H.s[p.id][H.s[p.id].length - 1][k]}</span>`).join('');
}
function openMenu() {
  modal(`<div class="dlg narrow px"><button class="x" id="mx">${t('close')}</button><h2>${t('menu')}</h2>
    <div class="acts" style="flex-direction:column;align-items:stretch">
      <button id="ms">${t('save')}</button><button id="ml">${t('load')}</button><button id="mn" class="gold">${t('newWorld')}</button><button id="mh">${t('help')}</button><button id="mg">${t('gallery')}</button><button id="mnat">${t('natural')}: ${S.natural === false ? t('off') : t('on')}</button><button id="mlang">${t('langBtn')}</button>
    </div></div>`);
  $('mx').onclick = closeModal;
  $('ms').onclick = () => { toast(store.set(SAVE_KEY, saveJSON()) ? t('saved') : '✕'); closeModal(); };
  $('ml').onclick = () => { if (loadSaved()) toast(t('loaded')); else toast(t('noSave')); };
  $('mn').onclick = openNewWorld; $('mh').onclick = openHelp; $('mg').onclick = openGallery; $('mnat').onclick = () => { S.natural = S.natural === false; openMenu(); }; $('mlang').onclick = () => { toggleLang(); openMenu(); };
}
function openHelp() {
  modal(`<div class="dlg px"><button class="x" id="hx">${t('close')}</button><h2>${t('help')}</h2><div class="help">${t('helpGod')}</div></div>`, !S);
  $('hx').onclick = () => (S ? closeModal() : openStart());
}
const NW = { mode: 'random', base: 'ocean', size: 'medium', civs: 5, land: 'continents', climate: 'temperate', seed: Math.floor(Math.random() * 1e9) };
let _prev = { key: '', g: null };
// the world the current settings would create; random terrain is generated once per setting/seed
function previewWorld() {
  const [w, h] = MAPSIZES[NW.size];
  if (NW.mode === 'blank') return blankMap(w, h, NW.base);
  const key = [NW.size, NW.civs, NW.land, NW.climate, NW.seed].join('|');
  if (_prev.key !== key) { let g = null; try { g = genWorld(w, h, NW.seed, NW.civs, { land: NW.land, climate: NW.climate }); } catch (e) { g = null; } _prev = { key, g }; }
  return _prev.g;
}
function drawPreview(c) {
  const [w, h] = MAPSIZES[NW.size], g = previewWorld(), x = c.getContext('2d');
  c.width = w * 2; c.height = h * 2;
  c.style.width = `min(100%, ${(38 * w / h).toFixed(1)}vh)`; // fit both the dialog width and ~38% of the screen height
  x.fillStyle = '#05060c'; x.fillRect(0, 0, c.width, c.height);
  if (!g) return false;
  g.map.forEach((tl, i) => { x.fillStyle = MINI_COL[tl.t]; x.fillRect((i % w) * 2, ((i / w) | 0) * 2, 2, 2); });
  g.starts.forEach((s, i) => { x.fillStyle = '#1a1420'; x.fillRect(s.x * 2 - 2, s.y * 2 - 2, 6, 6); x.fillStyle = '#ffffff'; x.fillRect(s.x * 2 - 1, s.y * 2 - 1, 4, 4); }); // white squares: start positions
  return true;
}
function openNewWorld() {
  const seg = (key, vals, lbl) => `<div class="seg">${vals.map(v => `<button data-k="${key}" data-v="${v}" class="${NW[key] == v ? 'on' : ''}">${lbl ? lbl(v) : v}</button>`).join('')}</div>`;
  const rnd = NW.mode === 'random';
  modal(`<div class="dlg px start" style="width:min(680px,100%)"><div class="logo">${t('worldTitle')}</div><div class="hint">${t('worldSub')}</div>
    <div class="form">
      <span>${t('worldType')}</span>${seg('mode', ['random', 'blank'], v => t(v === 'random' ? 'wtRandom' : 'wtBlank'))}
      <span>${t('mapSize')}</span>${seg('size', ['small', 'medium', 'large', 'huge'], v => t(v))}
      ${rnd ? `<span>${t('civCount')}</span>${seg('civs', [2, 3, 4, 5, 6, 7, 8, 9, 10])}
      <span>${t('landAmt')}</span>${seg('land', ['islands', 'continents', 'pangaea'], v => t(v))}
      <span>${t('climate')}</span>${seg('climate', ['cold', 'temperate', 'hot'], v => t(v))}`
      : `<span>${t('startWith')}</span>${seg('base', ['ocean', 'land'], v => t(v === 'ocean' ? 'baseOcean' : 'baseLand'))}`}
    </div>
    <canvas id="prev" class="px" style="box-sizing:border-box;width:100%;height:auto;image-rendering:pixelated;display:block;margin:4px auto 0" aria-label="preview"></canvas>
    <p class="hint" id="prevNote" style="margin:6px 0 0">${rnd ? '' : t('blankHint')}</p>
    <div class="acts" style="justify-content:center">${rnd ? `<button id="reroll">${t('reroll')}</button>` : ''}<button id="go" class="gold" style="font-size:16px;min-width:160px">${t('newWorld')}</button>${S ? `<button id="back">${t('cancel')}</button>` : ''}<button id="lg">${t('langBtn')}</button></div></div>`, true);
  const ok = drawPreview($('prev'));
  if (!ok) { $('prevNote').textContent = t('previewFail'); $('go').disabled = true; }
  document.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; NW[k] = k === 'civs' ? +b.dataset.v : b.dataset.v; openNewWorld(); });
  if ($('reroll')) $('reroll').onclick = () => { NW.seed = Math.floor(Math.random() * 1e9); openNewWorld(); };
  $('go').onclick = () => {
    if (rnd) newGame({ god: true, allAI: true, size: NW.size, ai: NW.civs - 1, land: NW.land, climate: NW.climate, seed: NW.seed });
    else newGame({ god: true, allAI: true, size: NW.size, blank: NW.base });
    NW.seed = Math.floor(Math.random() * 1e9);
    afterLoad(); store.set(SAVE_KEY, saveJSON());
    if (rnd) setSpeed(2);
    else { setSpeed(0); TOOL = 'terrain'; BRUSH_T = S.map[0].t === 'ocean' ? 'grass' : 'ocean'; BRUSH_SIZE = 5; CAM.z = 2; centerOn(S.w / 2, S.h / 2); refresh(); toast(t('blankStart')); }
  };
  if ($('back')) $('back').onclick = () => closeModal(true);
  $('lg').onclick = () => { toggleLang(); openNewWorld(); };
}
function openStart() {
  const has = !!store.get(SAVE_KEY);
  modal(`<div class="dlg narrow px start"><div class="logo">${t('worldTitle')}</div><p class="hint">${t('worldSub')}</p>
    <div class="acts" style="flex-direction:column;align-items:stretch">${has ? `<button id="sc" class="gold">${t('cont')}</button>` : ''}<button id="sn" class="${has ? '' : 'gold'}">${t('newWorld')}</button><button id="sh">${t('help')}</button><button id="sl">${t('langBtn')}</button></div></div>`, true);
  if ($('sc')) $('sc').onclick = () => { if (!loadSaved()) openNewWorld(); };
  $('sn').onclick = openNewWorld; $('sh').onclick = openHelp; $('sl').onclick = () => { toggleLang(); openStart(); };
}
function toggleLang() { LANG = LANG === 'th' ? 'en' : 'th'; document.documentElement.lang = LANG; store.set('pixelciv.lang', LANG); lastHover = -1; refresh(); }

/* ---------- start / load ---------- */
function afterLoad() {
  ['dock', 'top', 'panel', 'tools'].forEach(id => { $(id).hidden = false; });
  clearSel(); TOOL = 'look'; $('modal').hidden = true; $('modal').dataset.locked = ''; $('modal').innerHTML = ''; $('log').innerHTML = '';
  CAM.z = VW < 720 ? 1 : 2; centerOn(S.w / 2, S.h / 2);
  spawnLife(); refresh();
}
function loadSaved() { const s = store.get(SAVE_KEY); if (!s) return false; try { loadJSON(s); if (!S.god) throw new Error('old save'); } catch (e) { S = null; return false; } afterLoad(); return true; }

window.addEventListener('resize', () => { resize(); if (S) clampCam(); });
const saveNow = () => { if (S) store.set(SAVE_KEY, saveJSON()); };
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
window.addEventListener('pagehide', saveNow);
resize();
// city name plates are cached canvases, so redraw them once the map fonts arrive
document.fonts && Promise.all(['600 16px "Pixelify Sans"', '500 16px "Mitr"', '16px "Silkscreen"'].map(f => document.fonts.load(f))).then(() => _banners.clear()).catch(() => {});
window.claude?.hot?.snapshot?.(() => ({ save: S ? saveJSON() : null, cam: { ...CAM }, speed: SPEED }));
const boot = data => {
  if (data && data.save) { try { loadJSON(data.save); if (!S.god) throw 0; afterLoad(); if (data.cam) Object.assign(CAM, data.cam); setSpeed(data.speed ?? 2); } catch (e) { S = null; openStart(); } }
  else openStart();
  requestAnimationFrame(frame);
};
/* ---------- ambient life: animals and townsfolk wander on their own (visual only, not saved) ---------- */
const LIFE_SPEED = { folk: 0.55 };
const R01 = () => Math.random();
function newAnimal(k, x, y, leader) { return { k, x: x + 0.2 + R01() * 0.6, y: y + 0.35 + R01() * 0.5, tx: 0, ty: 0, state: 'idle', timer: R01() * 4, flip: R01() < 0.5, seed: R01() * 8, leader, born: (S ? S.turn : 0) - Math.floor(R01() * YEAR_DAYS * 5), kills: 0 }; }
// one herd (or school, or butterfly) on tile i if something lives there
function spawnHerdAt(i) {
  const x = i % S.w, y = (i / S.w) | 0, tl = S.map[i];
  let kind = null;
  if (isWater(tl)) { const r = R01(); kind = tl.t === 'ocean' && r < 0.1 ? 'whale' : r < 0.2 ? 'dolphin' : r < 0.45 ? 'fish' : r < 0.53 ? 'shark' : r < 0.6 ? 'jelly' : r < 0.66 ? 'seaturtle' : tl.t === 'coast' && r < 0.72 ? 'flamingo' : null; }
  else if (nearWater(x, y) && R01() < 0.18) kind = pick01(tl.t === 'snow' || tl.t === 'tundra' ? ['seal'] : ['crab', 'turtle']);
  else if (HABITAT[tl.t] && R01() < 0.7) kind = pick01(HABITAT[tl.t]);
  else if (R01() < 0.35) kind = 'butterfly';
  if (!kind || !livesOn(kind, tl, x, y)) return;
  const [lo, hi] = HERD[kind] || [1, 1], n = lo + Math.floor(R01() * (hi - lo + 1));
  let lead = null;
  for (let m = 0; m < n; m++) {
    const nx = x + (m ? Math.round(R01() * 2 - 1) : 0), ny = y + (m ? Math.round(R01() * 2 - 1) : 0);
    if (!inb(nx, ny) || !livesOn(kind, T(nx, ny), nx, ny)) continue;
    const c = newAnimal(kind, nx, ny, lead); lead = lead || c; UI.life.push(c);
  }
}
const pick01 = a => a[Math.floor(R01() * a.length)];
// legendary creatures: rare, one or two per world where they fit
function spawnLegends() {
  const tiles = f => { const r = []; S.map.forEach((tl, i) => { if (f(tl, i)) r.push(i); }); return r; };
  const place = (k, list, n) => { for (let m = 0; m < n && list.length; m++) { const i = pick01(list); UI.life.push(newAnimal(k, i % S.w, (i / S.w) | 0)); } };
  place('dragon', tiles(tl => tl.t === 'mountain'), 1);
  place('serpent', tiles(tl => tl.t === 'ocean'), 1);
  place('unicorn', tiles(tl => tl.t === 'forest' && tl.city < 0), R01() < 0.6 ? 1 : 2);
}
// god tool: a small herd of the chosen creature, if the tile suits it
function placeCreature(k, x, y) {
  if (!livesOn(k, T(x, y), x, y)) return false;
  const [lo, hi] = HERD[k] || [1, 1], n = lo + Math.floor(R01() * (hi - lo + 1)); let lead = null;
  for (let m = 0; m < n; m++) { const nx = x + (m ? Math.round(R01() * 2 - 1) : 0), ny = y + (m ? Math.round(R01() * 2 - 1) : 0); if (!inb(nx, ny) || !livesOn(k, T(nx, ny), nx, ny)) continue; const c = newAnimal(k, nx, ny, lead); c.timer = 0; c.born = S.turn; lead = lead || c; UI.life.push(c); }
  UI.vfx.push({ k: 'bless', x, y, t: performance.now() });
  return true;
}
function spawnLife() {
  UI.life = []; UI.disp.clear();
  for (let k = 0; k < Math.floor(S.w * S.h / 28); k++) spawnHerdAt(Math.floor(R01() * S.map.length));
  for (let k = 0; k < Math.floor(S.w * S.h / 90); k++) { const i = Math.floor(R01() * S.map.length), t = S.map[i].t; UI.life.push(newAnimal(isWater(S.map[i]) ? 'gull' : t === 'jungle' ? 'parrot' : t === 'hills' || t === 'mountain' ? 'eagle' : 'crow', i % S.w, (i / S.w) | 0)); }
  spawnLegends();
  syncPeople();
}
// newly painted land fills with wildlife a little each day, up to about the starting density
function topUpLife() {
  const wild = UI.life.filter(c => (QUADS[c.k] || SMALL[c.k]) && !FLYERS.includes(c.k)).length;
  if (wild >= S.map.length / 22) return;
  for (let k = 0; k < 4; k++) spawnHerdAt(Math.floor(R01() * S.map.length));
}
// animals wander near their herd leader, then graze, stand or lie down for a while
// a predator closes in on its prey; the prey bolts once it notices; a catch ends in a long rest
function findPrey(c) {
  let best = null, bd = 4.5;
  for (const o of UI.life) { if (!PREY[c.k].includes(o.k)) continue; const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
function huntStep(c, dt) {
  const p = c.hunt;
  if (!UI.life.includes(p) || (c.huntT -= dt) <= 0) { c.hunt = null; c.state = 'idle'; c.timer = 2 + R01() * 3; return; }
  const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
  if (d < 0.3) { UI.life.splice(UI.life.indexOf(p), 1); c.kills = (c.kills || 0) + 1; c.hunt = null; c.state = 'rest'; c.timer = 10 + R01() * 8; UI.vfx.push({ k: 'catch', x: p.x, y: p.y, t: performance.now() }); return; }
  const step = Math.min(d, (CRITTER_SPEED[c.k] || 0.4) * 1.9 * dt), nx = c.x + dx / d * step, ny = c.y + dy / d * step;
  if (!FLYERS.includes(c.k) && !livesOn(c.k, T(Math.floor(nx), Math.floor(ny)), Math.floor(nx), Math.floor(ny)) && !livesOn(p.k, T(Math.floor(nx), Math.floor(ny)), Math.floor(nx), Math.floor(ny))) { c.hunt = null; c.state = 'idle'; c.timer = 2; return; }
  c.x = nx; c.y = ny; c.tx = nx; c.ty = ny; c.flip = dx < 0; c.state = 'walk';
  if (d < 3 && !(p.fleeing > 0)) { p.fleeing = 3 + R01() * 2; p.fleeFrom = c; }
}
function fleeStep(c, dt) {
  c.fleeing -= dt;
  const h = c.fleeFrom, dx = c.x - h.x, dy = c.y - h.y, d = Math.hypot(dx, dy) || 1, s = (CRITTER_SPEED[c.k] || 0.3) * 1.7 * dt;
  for (const a of [0, 0.7, -0.7, 1.4, -1.4]) { // straight away, or veer if the way is blocked
    const ca = Math.cos(a), sa = Math.sin(a), vx = (dx * ca - dy * sa) / d, vy = (dx * sa + dy * ca) / d, nx = c.x + vx * s, ny = c.y + vy * s;
    if (!inb(Math.floor(nx), Math.floor(ny)) || !livesOn(c.k, T(Math.floor(nx), Math.floor(ny)), Math.floor(nx), Math.floor(ny))) continue;
    c.x = nx; c.y = ny; c.tx = nx; c.ty = ny; c.flip = vx < 0; c.state = 'walk'; break;
  }
  if (c.fleeing <= 0) { c.fleeFrom = null; c.state = 'idle'; c.timer = 1 + R01() * 2; }
}
function updateAnimal(c, dt) {
  if (c.hunt) return huntStep(c, dt);
  if (c.fleeing > 0 && c.fleeFrom && UI.life.includes(c.fleeFrom)) return fleeStep(c, dt);
  const fly = FLYERS.includes(c.k), swim = ['fish', 'dolphin', 'whale', 'shark', 'jelly', 'seaturtle', 'serpent'].includes(c.k);
  if (c.state === 'walk') {
    const ex = c.tx - c.x, ey = c.ty - c.y, L = Math.hypot(ex, ey), s = (CRITTER_SPEED[c.k] || 0.3) * dt;
    if (L > s) { c.x += ex / L * s; c.y += ey / L * s; if (Math.abs(ex) > 0.01) c.flip = ex < 0; return; }
    c.x = c.tx; c.y = c.ty;
    if (fly || c.k === 'butterfly') { c.timer = 0; c.state = 'idle'; }
    else { const r = R01(), grazer = QUADS[c.k] && !PREDATORS.includes(c.k); c.state = r < (grazer ? 0.55 : 0.3) ? 'graze' : r < 0.85 ? 'idle' : 'rest'; c.timer = c.state === 'rest' ? 6 + R01() * 8 : 2 + R01() * 5; }
    return;
  }
  c.timer -= dt; if (c.timer > 0) return;
  if (PREY[c.k] && R01() < 0.35) { const p = findPrey(c); if (p) { c.hunt = p; c.huntT = 9; return; } }
  const home = c.leader && UI.life.includes(c.leader) ? c.leader : c, r = fly ? 5 : swim ? 2 : home === c ? 2 : 1;
  for (let k = 0; k < 6; k++) {
    const nx = Math.floor(home.x) + Math.round((R01() * 2 - 1) * r), ny = Math.floor(home.y) + Math.round((R01() * 2 - 1) * r);
    if (!inb(nx, ny) || !livesOn(c.k, T(nx, ny), nx, ny)) continue;
    c.tx = nx + 0.2 + R01() * 0.6; c.ty = ny + 0.35 + R01() * 0.5; c.state = 'walk'; return;
  }
  c.timer = 1 + R01() * 2;
}
// townsfolk: one person per worked field (role from what is on the tile) plus specialists from buildings
function fieldRole(tl) {
  if (isWater(tl)) return 'fisher';
  const byImp = { farm: 'farmer', mine: 'miner', lumber: 'lumberjack', pasture: 'herder', plantation: 'gatherer' }[tl.imp];
  if (byImp) return byImp;
  return { forest: 'lumberjack', jungle: 'gatherer', hills: 'miner', tundra: 'herder' }[tl.t] || 'farmer';
}
function cityRoles(c) {
  const out = cityStats(c).worked.slice(0, 4).map(i => ({ role: fieldRole(S.map[i]), tile: i }));
  if (c.blds.palace) out.push({ role: 'noble' });
  if (c.blds.market || c.blds.bank) out.push({ role: 'merchant' });
  if (c.blds.temple || c.blds.cathedral) out.push({ role: 'priest' });
  if (c.blds.library || c.blds.university) out.push({ role: 'scholar' });
  if (c.q[0] && c.q[0].k === 'b') out.push({ role: 'builder', site: true });
  return out;
}
let folkSeq = 0;
function newFolk(c, w) {
  return { k: 'folk', role: w.role, tile: w.tile, site: w.site, home: c.id, x: c.x + 0.3 + Math.random() * 0.4, y: c.y + 0.4 + Math.random() * 0.4, tx: 0, ty: 0,
    state: 'idle', act: 'idle', timer: Math.random() * 3, flip: Math.random() < 0.5, seed: Math.random() * 4, skin: folkSeq++, born: S.turn - Math.floor((16 + Math.random() * 45) * YEAR_DAYS) };
}
// townsfolk are grouped by city in one pass; a city's jobs are only worked out again when it grows,
// builds, starts a new project, the land is reshaped, or every 8 days
function syncPeople() {
  const cities = new Map(S.cities.map(c => [c.id, c])), pools = new Map(), out = [];
  for (const f of UI.life) {
    if (f.k !== 'folk') { out.push(f); continue; }
    if (!cities.has(f.home)) continue; // its city is gone
    let a = pools.get(f.home); if (!a) pools.set(f.home, a = []); a.push(f);
  }
  for (const c of S.cities) {
    const pool = pools.get(c.id) || [], key = c.pop + '|' + Object.keys(c.blds).length + '|' + (c.q[0] ? c.q[0].k : '') + '|' + Math.floor(S.turn / 8) + '|' + (S.tver || 0);
    if (c._rk === key && pool.length === c._rn) { for (const f of pool) out.push(f); continue; }
    const roles = cityRoles(c), used = new Set();
    for (const w of roles) {
      let f = pool.find(o => o.role === w.role && !used.has(o));
      if (f) { f.tile = w.tile; f.site = w.site; } else f = newFolk(c, w);
      used.add(f); out.push(f);
    }
    c._rk = key; c._rn = roles.length;
  }
  UI.life = out;
}
// what a person does while at home in the city
function homeAct(role) {
  const R = ROLES[role];
  if (['merchant', 'priest', 'scholar', 'noble', 'builder'].includes(role)) return R.work;
  return Math.random() < 0.2 ? 'cheer' : 'idle';
}
function walkTo(f, x, y) { f.state = 'walk'; f.tx = x + 0.25 + Math.random() * 0.5; f.ty = y + 0.45 + Math.random() * 0.4; }
function updateFolk(f, dt) {
  const c = cityById(f.home); if (!c) return;
  if (f.state === 'walk') {
    const ex = f.tx - f.x, ey = f.ty - f.y, L = Math.hypot(ex, ey), s = LIFE_SPEED.folk * dt;
    if (L > s) { f.x += ex / L * s; f.y += ey / L * s; if (Math.abs(ex) > 0.01) f.flip = ex < 0; return; }
    f.x = f.tx; f.y = f.ty;
    const atField = f.tile != null && Math.floor(f.x) === f.tile % S.w && Math.floor(f.y) === ((f.tile / S.w) | 0);
    f.state = 'act'; f.act = atField ? ROLES[f.role].work : homeAct(f.role); f.timer = atField ? 5 + Math.random() * 6 : 2.5 + Math.random() * 4;
    if (atField) f.flip = Math.random() < 0.5;
    return;
  }
  f.timer -= dt; if (f.timer > 0) return;
  const atHome = Math.floor(f.x) === c.x && Math.floor(f.y) === c.y;
  if (f.tile != null && atHome) walkTo(f, f.tile % S.w, (f.tile / S.w) | 0);
  else if (!atHome) walkTo(f, c.x, c.y);
  else if (Math.random() < 0.5) walkTo(f, c.x, c.y); // stroll around town
  else { f.state = 'act'; f.act = homeAct(f.role); f.timer = 2 + Math.random() * 3; }
}
function updateLife(dt) {
  for (const c of UI.life) {
    if (c.k === 'folk') updateFolk(c, dt); else updateAnimal(c, dt);
  }
  // animals whose land was painted over or built on leave the map
  if (Math.random() < 0.02) UI.life = UI.life.filter(c => c.k === 'folk' || c.state === 'walk' || livesOn(c.k, T(Math.min(S.w - 1, Math.floor(c.x)), Math.min(S.h - 1, Math.floor(c.y))), Math.floor(c.x), Math.floor(c.y)));
  // draw back-to-front so people lower on screen overlap those behind them
  UI.life.sort((a, b) => a.y - b.y);
}
/* ---------- creature inspector: tap an animal or townsperson to see its stats ---------- */
const LT = {
  hunting: ['Hunting {0}', 'กำลังล่า{0}'], fleeing: ['Fleeing!', 'กำลังหนี!'], flying: ['Flying', 'บิน'], swimming: ['Swimming', 'ว่ายน้ำ'], moving: ['Moving', 'เคลื่อนที่'], resting: ['Resting', 'พักผ่อน'],
  activity: ['Doing', 'กิจกรรม'], diet: ['Diet', 'อาหาร'], hunter: ['Hunter', 'นักล่า'], grazer: ['Plant eater', 'กินพืช'], mythic: ['Legendary', 'สัตว์ในตำนาน'],
  hunts: ['Hunts', 'ล่า'], huntedBy: ['Hunted by', 'ศัตรู'], habitat: ['Habitat', 'ถิ่นอาศัย'], anywhere: ['Anywhere', 'ทุกที่'], shore: ['Shores', 'ชายฝั่ง'],
  speed: ['Speed', 'ความเร็ว'], age: ['Age', 'อายุ'], days: ['{0} days', '{0} วัน'], years: ['{0} yrs', '{0} ปี'], group: ['Group', 'ฝูง'], kills: ['Catches', 'ล่าสำเร็จ'],
  home: ['Home', 'บ้าน'], works: ['Works', 'ทำงานที่'], inTown: ['In town', 'ในเมือง'], standing: ['Standing on', 'อยู่บน'], follow: ['Follow', 'ติดตาม'], following: ['Following', 'กำลังติดตาม'],
};
const lt = (k, ...a) => { let r = LT[k][LANG === 'th' ? 1 : 0]; a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
const SWIMMERS = ['fish', 'dolphin', 'whale', 'shark', 'jelly', 'seaturtle', 'serpent'], LEGENDS = ['dragon', 'serpent', 'unicorn'];
const kindName = k => nm({ n: (QUADS[k] && QUADS[k].n) || SMALL_N[k] || [k, k] });
function lifeName(c) { return c.k === 'folk' ? nm(ROLES[c.role]) : kindName(c.k); }
// screen box of a creature, matching how drawWorld/drawCritter place it (feet at x, y)
function lifeBox(c, lz) {
  const X = c.x * ts() - CAM.x, Y = c.y * ts() - CAM.y;
  if (c.k === 'folk') return { x: X, y: Y - CH * lz / 2, w: CW * lz * 0.6, h: CH * lz };
  if (FLYERS.includes(c.k)) { const alt = c.k === 'dragon' ? 22 : c.k === 'eagle' ? 16 : 10; return { x: X, y: Y - (alt + 4) * lz, w: (c.k === 'dragon' ? 18 : 10) * lz, h: 10 * lz }; }
  if (QUADS[c.k]) return { x: X, y: Y - QH * lz / 2, w: QW * lz * 0.8, h: QH * lz };
  return { x: X, y: Y - 4 * lz, w: 10 * lz, h: 8 * lz };
}
function lifeAt(mx, my, pad) {
  const lz = CAM.z * LIFE_SCALE; if (lz < 0.9) return null; // creatures are not drawn when zoomed far out
  const h = humanP(); let best = null, bd = 1e9;
  for (const c of UI.life) {
    const tx = Math.floor(c.x), ty = Math.floor(c.y); if (!inb(tx, ty) || (h && !VIS[ty * S.w + tx])) continue;
    const b = lifeBox(c, lz), hw = Math.max(b.w, pad) / 2, hh = Math.max(b.h, pad) / 2, dx = Math.abs(mx - b.x), dy = Math.abs(my - b.y);
    if (dx > hw || dy > hh) continue;
    const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function lifeActivity(c) {
  if (c.k === 'folk') return nm(ACTIONS[c.state === 'walk' ? 'walk' : c.act] || ACTIONS.idle);
  if (c.hunt) return lt('hunting', kindName(c.hunt.k));
  if (c.fleeing > 0) return lt('fleeing');
  if (FLYERS.includes(c.k)) return lt('flying');
  if (SWIMMERS.includes(c.k)) return lt('swimming');
  if (QUADS[c.k]) return nm({ n: QPOSE_N[c.state] || QPOSE_N.idle });
  return lt(c.state === 'walk' ? 'moving' : 'resting');
}
function lifeHabitat(k) {
  const ts_ = Object.keys(TERRAIN).filter(t => livesOn(k, { t, city: -1 }, null, null));
  if (ts_.length >= Object.keys(TERRAIN).length - 1) return lt('anywhere');
  const names = ts_.map(t => nm(TERRAIN[t]));
  if (['crab', 'turtle', 'croc', 'seal'].includes(k)) names.push(lt('shore'));
  return [...new Set(names)].join(', ') || '—';
}
const _portrait = new Map();
function lifePortrait(c) {
  const key = c.k === 'folk' ? 'f' + c.role + (c.skin % 4) + c.home : c.k;
  if (_portrait.has(key)) return _portrait.get(key);
  let src;
  if (c.k === 'folk') { const home = cityById(c.home); src = charFrame(c.role, 'idle', 0, home ? civDef(P(home.o)).col : '#c8402e', c.skin); }
  else if (QUADS[c.k]) src = quadFrame(c.k, 'idle', 0);
  else src = smallFrame(c.k, 0, c.k === 'butterfly' ? BUTTERFLY_COLS[Math.floor(c.seed) % 4] : undefined);
  const cv = document.createElement('canvas'), s = Math.max(1, Math.floor(44 / Math.max(src.width, src.height))); cv.width = cv.height = 48;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, (48 - src.width * s) / 2, (48 - src.height * s) / 2, src.width * s, src.height * s);
  const url = cv.toDataURL(); _portrait.set(key, url); return url;
}
function lifeAge(c) { const d = Math.max(0, S.turn - (c.born ?? S.turn)); return d >= YEAR_DAYS ? lt('years', Math.floor(d / YEAR_DAYS)) : lt('days', d); }
function lifeStats(c) {
  const row = (k, v) => `<span style="color:var(--muted)">${k}</span><span>${v}</span>`, tx = Math.floor(c.x), ty = Math.floor(c.y);
  const here = inb(tx, ty) ? nm(TERRAIN[T(tx, ty).t]) : '—';
  if (c.k === 'folk') {
    const home = cityById(c.home), work = c.tile != null ? nm(TERRAIN[S.map[c.tile].t]) + (S.map[c.tile].imp ? ' · ' + nm(IMPR[S.map[c.tile].imp]) : '') : lt('inTown');
    return row(lt('activity'), lifeActivity(c)) + row(lt('home'), home ? cname(home) : '—') + row(lt('works'), work) + row(lt('age'), lifeAge(c)) + row(lt('standing'), here);
  }
  const k = c.k, lead = c.leader && UI.life.includes(c.leader) ? c.leader : c, group = UI.life.filter(o => o === lead || o.leader === lead).length;
  const by = Object.keys(PREY).filter(p => PREY[p].includes(k)).map(kindName);
  let s = row(lt('activity'), lifeActivity(c)) + row(lt('diet'), LEGENDS.includes(k) ? lt('mythic') : PREY[k] || PREDATORS.includes(k) ? lt('hunter') : lt('grazer'));
  if (PREY[k]) s += row(lt('hunts'), PREY[k].map(kindName).join(', '));
  if (by.length) s += row(lt('huntedBy'), by.join(', '));
  s += row(lt('speed'), `<span class="bar" style="display:inline-block;width:80px;vertical-align:middle"><i style="width:${Math.min(100, (CRITTER_SPEED[k] || 0.3) / 1.6 * 100)}%;background:var(--good)"></i></span> ${((CRITTER_SPEED[k] || 0.3) * 10).toFixed(1)}`);
  s += row(lt('age'), lifeAge(c)) + (group > 1 ? row(lt('group'), group) : '') + (PREY[k] ? row(lt('kills'), c.kills || 0) : '');
  s += row(lt('habitat'), lifeHabitat(k)) + row(lt('standing'), here);
  return s;
}
// header and buttons are built once per creature; only the numbers below them change, so clicks are never swallowed
function lifePanel(pn, c) {
  if (pn._life !== c || pn.dataset.life !== LANG) {
    pn._life = c; pn.dataset.life = LANG;
    const home = c.k === 'folk' ? cityById(c.home) : null;
    const sub = c.k === 'folk' ? (home ? `<span class="flag" style="background:${civDef(P(home.o)).col}"></span> ${civName(P(home.o))}` : '') : LEGENDS.includes(c.k) ? `<b style="color:var(--gold)">★ ${lt('mythic')}</b>` : '';
    pn.innerHTML = `<div class="ph"><img class="big" alt="" src="${lifePortrait(c)}"><div><h3>${lifeName(c)}</h3><div class="sub">${sub || '&nbsp;'}</div></div></div>
      <div id="lstats" style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 12px;margin:8px 0"></div>
      <div class="acts"><button id="lfol"></button></div>`;
    $('lfol').onclick = () => { UI.followLife = !UI.followLife; lifeTick(performance.now(), true); };
  }
  $('lstats').innerHTML = lifeStats(c);
  const b = $('lfol'); b.textContent = UI.followLife ? lt('following') : lt('follow'); b.classList.toggle('on', UI.followLife);
}
// every frame while a creature is selected: keep the panel live, follow it, and mark it on the map
function lifeTick(now, force) {
  const c = UI.selLife;
  if (!UI.life.includes(c)) { UI.selLife = null; UI.followLife = false; renderPanel(); return; }
  if (UI.followLife) UI.camGoal = { x: c.x - 0.5, y: c.y - 0.5 };
  if (force || now - (UI.lifeT || 0) > 350) { UI.lifeT = now; renderPanel(); }
  const lz = CAM.z * LIFE_SCALE; if (lz < 0.9) return;
  const b = lifeBox(c, lz), w = Math.max(b.w, 12) / 2 + 3, h = Math.max(b.h, 12) / 2 + 3, k = Math.max(3, lz * 3), bob = Math.floor(now / 300) % 2;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, lz * 0.8);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = b.x + sx * (w + bob), y = b.y + sy * (h + bob); ctx.beginPath(); ctx.moveTo(x, y - sy * k); ctx.lineTo(x, y); ctx.lineTo(x - sx * k, y); ctx.stroke(); }
}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
