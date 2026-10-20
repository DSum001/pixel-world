'use strict';
// Pixel art: every sprite is a 16x16 string grid, drawn once to an offscreen canvas.
const TS = 16;
const PAL = {
  k: '#1a1420', e: '#1a1420', S: '#e7b07e', s: '#b07850', w: '#8a5a2b', W: '#c08a48', m: '#d4d8e4', M: '#7a8094',
  h: '#9a6236', H: '#5e3a1e', g: '#a8a8a8', G: '#6a6a6a', y: '#f2c14e', r: '#c8402e', f: '#f59a3a', o: '#3e5f2a', O: '#5d8a3a',
  b: '#2b2b2b', p: '#f2a0c8', u: '#7a3fa0', l: '#7fd6f0', n: '#e8e0c8',
};
const SPR = {
  man: [
    '................', '................', '......kkkk......', '.....kSSSSk.....', '.....kSeSek.....', '.....kSSSSk.....', '......kkkk......', '.....kcccck.....',
    '....kccddcck....', '...kSkcddckSk...', '...kk.kcck.kk...', '......kddk......', '.....kdkkdk.....', '.....kdk.kdk....', '.....kkk.kkk....', '................'],
  horse: [
    '................', '........kkk.....', '.......kSSSk....', '.......kSeSk....', '........kkk.....', '.......kccck....', '..kk..kcdddck...', '.khhk.kccccck...',
    'khhhhkkkddkkkkk.', 'kHkhhhhhhhhhhhkH', '.k.khhhhhhhhhhkH', '...khhhhhhhhhk.H', '...kHk.....kHk..', '...kHk.....kHk..', '...kk......kk...', '................'],
  catapult: [
    '................', '................', '...........kk...', '..........kggk..', '.........kwkk...', '........kwk.....', '.......kwk......', '......kwk.......',
    '..kkkkwkkkkkk...', '.kWWWWWWWWWWWk..', '.kwwwccwwwwwwk..', '.kkkkkkkkkkkkk..', '..kWWk....kWWk..', '..kwwk....kwwk..', '...kk......kk...', '................'],
  cannon: [
    '................', '................', '................', '................', '.............kk.', '..........kkkMMk', '.......kkkMMMMk.', '.....kkMMMMMkk..',
    '....kMMMMMkk....', '...kMMMkkk......', '..kkkccwk.......', '..kwWWWwk.......', '.kWkkkkWk.......', '.kwk..kwk.......', '..kk...kk.......', '................'],
  tank: [
    '................', '................', '................', '................', '......kkkkk.....', '.....kccccdkkkkk', '.....kccccdMMMMk', '.....kkkkkkkkkkk',
    '..kkkkkkkkkkkk..', '.kccccccccccddk.', '.kddddddddddddk.', 'kbbbbbbbbbbbbbbk', 'kbgbgbgbgbgbgbbk', 'kbbbbbbbbbbbbbbk', '.kkkkkkkkkkkkkk.', '................'],
  city1: [
    '................', '................', '................', '................', '........y.......', '........yc......', '........yc......', '.......kyk......',
    '......krrrk.....', '.....krrrrrk....', '..kkkknnnnnk....', '.krrrrknkknk....', 'krrrrrrknknk....', '.knnnnknnnnk....', '.knkknknnnnk....', '.kkkkkkkkkkk....'],
  city2: [
    '................', '................', '.......y........', '.......yc.......', '.......yc.......', '......kyk.......', '.....krrrk......', '....krrrrrk.....',
    '..kkknnnnnkkkk..', '.krrknknknkrrrk.', 'krrrknnnnnkrrrrk', '.knnknnnnnknnnk.', 'krrrrknknkknknk.', '.knnnkknnnknnnk.', '.knknkknnnknknk.', '.kkkkkkkkkkkkkk.'],
  city3: [
    '.......y........', '.......ycc......', '.......ycc......', '......kkyk......', '......kggk......', '.....kgggGk.....', '.....kgkkgk.....', '..kk.kgggGk.kk..',
    '.krrkkgkkgkkrrk.', 'krrrrkgggGkrrrrk', '.knnkkgggGkknnk.', 'krrrkknnnnkkrrrk', '.knnnknnnnknnnk.', '.knknkknnkkknnk.', '.knnnkknnkknknk.', 'kkkkkkkkkkkkkkkk'],
  camp: [
    '................', '................', '................', '.......k........', '......kHk.......', '.....kHrHk......', '....kHrrrHk.....', '...kHrrrrrHk....',
    '..kHrrrkrrrHk...', '.kHrrrkbkrrrHk..', 'kkkkkkbbbkkkkkk.', '..........f.....', '.........fyf....', '........kwwwk...', '................', '................'],
  ruin: [
    '................', '................', '................', '................', '...kkk....kkk...', '...kgk....kgk...', '...kgk....kGk...', '...kgk.kk.kgk...',
    '...kGk.kg.kgk...', '...kgkkgg.kgk...', '..kkkkkkk.kkkk..', '.kgggGgggGgggk..', '.kkkkkkkkkkkkk..', '................', '................', '................'],
};
// weapon/kit overlays drawn on top of the man sprite: [x, y, palette char]
const KIT = {
  club: [[12, 9, 'w'], [13, 8, 'w'], [13, 7, 'W'], [14, 6, 'W'], [14, 5, 'W'], [13, 6, 'k'], [15, 5, 'k']],
  spear: [[13, 0, 'm'], [13, 1, 'm'], [13, 2, 'w'], [13, 3, 'w'], [13, 4, 'w'], [13, 5, 'w'], [13, 6, 'w'], [13, 7, 'w'], [13, 8, 'w'], [13, 10, 'w'], [13, 11, 'w'], [13, 12, 'w'], [12, 9, 'S']],
  sword: [[13, 3, 'm'], [13, 4, 'm'], [13, 5, 'm'], [13, 6, 'm'], [13, 7, 'm'], [12, 8, 'y'], [13, 8, 'y'], [14, 8, 'y'], [13, 9, 'w'], [14, 4, 'k'], [12, 4, 'k']],
  bow: [[2, 5, 'w'], [1, 6, 'w'], [1, 7, 'w'], [1, 8, 'w'], [1, 9, 'w'], [1, 10, 'w'], [2, 11, 'w'], [2, 6, 'g'], [2, 7, 'g'], [2, 8, 'g'], [2, 9, 'g'], [2, 10, 'g'], [3, 8, 'W']],
  musket: [[15, 2, 'M'], [14, 3, 'M'], [14, 4, 'M'], [13, 5, 'M'], [13, 6, 'M'], [12, 7, 'w'], [12, 8, 'w'], [11, 9, 'w'], [12, 9, 'W']],
  helmet: [[6, 1, 'o'], [7, 1, 'o'], [8, 1, 'o'], [9, 1, 'o'], [5, 2, 'o'], [6, 2, 'O'], [7, 2, 'O'], [8, 2, 'O'], [9, 2, 'O'], [10, 2, 'o']],
  hat: [[5, 2, 'W'], [6, 2, 'W'], [7, 2, 'W'], [8, 2, 'W'], [9, 2, 'W'], [10, 2, 'W'], [4, 3, 'w'], [11, 3, 'w'], [6, 1, 'w'], [7, 1, 'w'], [8, 1, 'w'], [9, 1, 'w']],
  pack: [[1, 7, 'k'], [2, 7, 'k'], [3, 7, 'k'], [1, 8, 'W'], [2, 8, 'W'], [3, 8, 'w'], [1, 9, 'W'], [2, 9, 'w'], [3, 9, 'w'], [1, 10, 'w'], [2, 10, 'w'], [3, 10, 'w'], [1, 11, 'k'], [2, 11, 'k'], [3, 11, 'k'], [2, 6, 'y']],
  pick: [[12, 9, 'w'], [13, 8, 'w'], [14, 7, 'w'], [15, 6, 'w'], [13, 5, 'M'], [14, 5, 'm'], [15, 5, 'M'], [12, 4, 'M'], [15, 7, 'M']],
  lance: [[15, 0, 'm'], [14, 1, 'm'], [14, 2, 'w'], [13, 3, 'w'], [13, 4, 'w'], [12, 5, 'w'], [12, 6, 'w'], [8, 1, 'm'], [9, 1, 'm'], [10, 1, 'm'], [8, 2, 'M'], [10, 2, 'M']],
  staff: [[12, 9, 'w'], [12, 8, 'w'], [12, 7, 'w'], [12, 6, 'w'], [12, 5, 'w'], [12, 10, 'w'], [12, 11, 'w'], [12, 12, 'w'], [12, 13, 'w'], [12, 4, 'W']],
};
const UNIT_ART = {
  settler: ['man', 'pack', 'hat'], worker: ['man', 'pick'], scout: ['man', 'hat', 'staff'], club: ['man', 'club'], bow: ['man', 'bow'],
  spear: ['man', 'spear'], sword: ['man', 'sword'], musket: ['man', 'musket'], infantry: ['man', 'helmet', 'musket'],
  horse: ['horse'], knight: ['horse', 'lance'], catapult: ['catapult'], cannon: ['cannon'], tank: ['tank'],
};
// 8x8 wandering critters, two frames each
function drawFlip(ctx, img, X, Y, w, h, flip) { ctx.drawImage(flip ? flipped(img) : img, X, Y, w, h); }
// smooth on-screen position for a unit that jumped tiles in the rules
function unitDisp(u, ui, dt) {
  let d = ui.disp.get(u.id);
  if (!d) { d = { x: u.x, y: u.y, m: 0, f: false }; ui.disp.set(u.id, d); }
  const ex = u.x - d.x, ey = u.y - d.y, L = Math.hypot(ex, ey);
  if (L > 5) { d.x = u.x; d.y = u.y; }
  else if (L > 0.001) { const s = Math.min(L, dt * 4); d.x += ex / L * s; d.y += ey / L * s; d.m = 0.25; if (Math.abs(ex) > 0.01) d.f = ex < 0; }
  else { d.x = u.x; d.y = u.y; }
  if (d.m > 0) d.m -= dt;
  return d;
}
const RES_ART = { // 6x6 icons
  rice: ['..y...', '.yy.y.', '..yyy.', '.y.y..', '..ww..', '..w...'],
  cattle: ['k....k', 'knnbnk', 'nbnnnn', 'nnnbnn', '.k..k.', '.k..k.'],
  deer: ['w.w...', '.ww...', '.hhhhh', '.hhhh.', '.h..h.', '.h..h.'],
  fish: ['......', '.lll.l', 'llelll', '.lll.l', '......', '......'],
  stone: ['.gg...', 'gGgg..', 'gggGg.', '.ggGgg', 'gGgggG', '......'],
  horses: ['..hh..', '.hhhh.', 'hhe.h.', 'Hh..h.', '..hhh.', '..HHH.'],
  iron: ['......', '.MMMM.', 'MmmmmM', 'MMMMMM', '.kkkk.', '......'],
  oil: ['..b...', '.bb...', '.bbb..', 'bbbbb.', 'bbgbb.', '.bbb..'],
  gold: ['......', '.yy...', 'yyyy..', 'yfyyy.', '.yyyf.', '..ff..'],
  gems: ['.lll..', 'lmllm.', 'llllll', '.llll.', '..ll..', '......'],
  silk: ['.pp...', 'pnnp..', 'pnnnp.', '.pnnp.', '..pp..', '......'],
  spices: ['...o..', '..r...', '.rrr..', '.rrr..', '..rr..', '...r..'],
  wine: ['..o...', '.uu...', 'uuuu..', '.uuu..', '..uu..', '..u...'],
};
const ICON_ART = { // 8x8 UI icons
  food: ['...o....', '..oO....', '.rrrrr..', 'rrrrrrr.', 'rrfrrrr.', 'rrrrrrr.', '.rrrrr..', '..r.r...'],
  prod: ['.MMMM...', 'MmmmmM..', '.MMMMw..', '....w...', '...w....', '..w.....', '.w......', 'w.......'],
  gold: ['..yyyy..', '.yffffy.', 'yfyyyyfy', 'yfyffyfy', 'yfyffyfy', 'yfyyyyfy', '.yffffy.', '..yyyy..'],
  sci: ['..kkk...', '..klk...', '..klk...', '.kllk...', 'kllllk..', 'kllllk..', 'kkkkkk..', '........'],
  cul: ['...u....', '..uuu...', 'uuuuuuu.', '.uuuuu..', '..uuu...', '.uu.uu..', '.u...u..', '........'],
  happy: ['.yyyyy..', 'yyyyyyy.', 'ykyyyky.', 'yyyyyyy.', 'ykyyyky.', 'yykkkyy.', '.yyyyy..', '........'],
  unhappy: ['.rrrrr..', 'rrrrrrr.', 'rkrrrkr.', 'rrrrrrr.', 'rrkkkrr.', 'rkrrrkr.', '.rrrrr..', '........'],
  str: ['......m.', '.....mM.', '....mM..', '...mM...', 'y.mM....', '.yM.....', '.wy.....', 'w..y....'],
  mv: ['..hhh...', '..hhh...', '..hhh...', '..hhhh..', '.hhhhhh.', 'hhhhhhhh', 'HHHHHHHH', '........'],
  hp: ['.rr.rr..', 'rrrrrrr.', 'rfrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'],
  pop: ['..SSS...', '.SeSeS..', '..SSS...', '.ccccc..', 'cccccccc', 'S.ccc.S.', '..c.c...', '..c.c...'],
  fire: ['...r....', '..rf....', '..rff.r.', '.rffyfr.', '.rfyyfr.', 'rfyyyyfr', 'rfyyyyfr', '.rffffr.'],
  wave: ['........', '..lll...', '.lnnll..', 'l...nl..', '....nll.', 'lllllnl.', 'llllllll', '........'],
  bolt: ['....yy..', '...yy...', '..yy....', '.yyyyy..', '...yy...', '..yy....', '.yy.....', '.y......'],
  eye: ['........', '..kkkk..', '.knnnnk.', 'knnllnnk', 'knnlbnnk', '.knnnnk.', '..kkkk..', '........'],
  meteor: ['......ff', '.....fy.', '....fy..', '.rrfy...', 'rrrr....', 'rrbr....', 'rrrr....', '.rr.....'],
  def: ['MMMMMMM.', 'MmmmmmM.', 'MmMMMmM.', 'MmmmmmM.', '.MmmmM..', '..MmM...', '...M....', '........'],
};

function hexA(c, a) { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function shade(c, f) { const n = parseInt(c.slice(1), 16); const ch = v => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => ch(v).toString(16).padStart(2, '0')).join(''); }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function paint(ctx, rows, ox, oy, pal) {
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch === '.') continue; ctx.fillStyle = pal[ch] || PAL[ch] || '#f0f'; ctx.fillRect(ox + x, oy + y, 1, 1); } });
}
const _spr = new Map();
function unitSprite(type, p) {
  const d = civDef(p), key = type + d.col + d.col2;
  if (_spr.has(key)) return _spr.get(key);
  const cv = mkCanvas(TS, TS), ctx = cv.getContext('2d'), pal = { c: d.col, d: d.col2 };
  const art = UNIT_ART[UNITS[type].spr];
  paint(ctx, SPR[art[0]], 0, 0, pal);
  for (const k of art.slice(1)) for (const [x, y, ch] of KIT[k]) { ctx.fillStyle = pal[ch] || PAL[ch]; ctx.fillRect(x, y, 1, 1); }
  _spr.set(key, cv); return cv;
}
// cities are composed from what they hold: houses for people, landmarks for buildings, walls and castle towers
const CITY_PX = 24;
const LANDMARKS = ['cathedral', 'temple', 'university', 'library', 'market', 'factory', 'lighthouse', 'harbor', 'stadium', 'colosseum', 'theater', 'hospital', 'powerplant', 'broadcast', 'lab', 'observatory', 'academy', 'bank', 'museum', 'granary', 'barracks', 'forge', 'workshop', 'stable', 'mint', 'aqueduct', 'monument'];
function cityLot(g, k, x, y, col, roof) {
  const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
  switch (k) {
    case 'house': R(0, 2, 5, 1, roof); R(1, 1, 3, 1, roof); R(2, 0, 1, 1, roof); R(0, 3, 5, 3, '#e8dcc0'); R(2, 4, 1, 2, '#5a3a20'); R(4, 3, 1, 3, '#c8b898'); break;
    case 'tower': R(0, 0, 5, 6, '#9aa0ac'); R(1, 1, 1, 2, '#3a3a48'); R(3, 1, 1, 2, '#3a3a48'); R(0, 0, 5, 1, '#c8ccd8'); break;
    case 'temple': R(0, 2, 5, 1, '#c8402e'); R(1, 1, 3, 1, '#c8402e'); R(2, 0, 1, 1, '#f2c14e'); R(1, 3, 3, 1, '#c8402e'); R(1, 4, 3, 2, '#f0e0b0'); R(2, 5, 1, 1, '#5a3a20'); break;
    case 'cathedral': R(0, 0, 1, 3, '#7a8094'); R(4, 0, 1, 3, '#7a8094'); R(2, 1, 1, 2, '#7a8094'); R(0, 3, 5, 3, '#d8d0c0'); R(2, 3, 1, 1, '#7ab0f0'); R(2, 5, 1, 1, '#5a3a20'); break;
    case 'library': case 'museum': case 'bank': case 'mint': R(0, 1, 5, 1, k === 'bank' || k === 'mint' ? '#f2c14e' : '#c8b890'); R(1, 0, 3, 1, '#c8b890'); R(0, 2, 5, 4, '#ece4d0'); R(0, 2, 1, 4, '#a89870'); R(2, 2, 1, 4, '#a89870'); R(4, 2, 1, 4, '#a89870'); break;
    case 'university': case 'observatory': case 'academy': R(1, 0, 3, 1, '#7a9ac8'); R(0, 1, 5, 1, '#7a9ac8'); R(0, 2, 5, 4, '#e8e0d0'); R(2, 4, 1, 2, '#5a3a20'); if (k === 'observatory') R(3, 0, 2, 1, '#3a3a48'); break;
    case 'market': R(0, 1, 5, 1, '#c8402e'); R(1, 1, 1, 1, '#f4f0e8'); R(3, 1, 1, 1, '#f4f0e8'); R(0, 2, 1, 4, '#8a5a2b'); R(4, 2, 1, 4, '#8a5a2b'); R(1, 4, 3, 2, '#c08a48'); R(2, 3, 1, 1, '#f2c14e'); break;
    case 'granary': R(1, 0, 3, 1, '#c08a48'); R(0, 1, 5, 5, '#e0c070'); R(1, 2, 3, 1, '#b8984a'); R(2, 4, 1, 2, '#5a3a20'); break;
    case 'barracks': R(2, 0, 1, 2, '#5a3a20'); R(3, 0, 2, 1, col); R(0, 3, 5, 1, '#8a6a3a'); R(1, 2, 3, 1, '#8a6a3a'); R(0, 4, 5, 2, '#a88a58'); R(2, 4, 1, 2, '#3a2a18'); break;
    case 'forge': case 'workshop': R(3, 0, 1, 3, '#5a5a6a'); R(3, 0, 1, 1, '#c8c8d0'); R(0, 2, 5, 4, '#8a5a3a'); R(1, 4, 1, 1, '#f59a3a'); R(0, 2, 5, 1, '#5a3a20'); break;
    case 'factory': R(0, 0, 1, 3, '#5a5a6a'); R(2, 1, 1, 2, '#5a5a6a'); R(0, 3, 5, 3, '#8a8a96'); R(1, 4, 3, 1, '#f2c14e'); R(4, 2, 1, 1, '#c8c8d0'); break;
    case 'powerplant': R(0, 1, 4, 5, '#c8ccd4'); R(1, 0, 2, 1, '#e8eef4'); R(0, 3, 4, 1, '#9aa0ac'); R(4, 4, 1, 2, '#8a8a96'); break;
    case 'lighthouse': R(2, 0, 1, 1, '#fff3a0'); R(1, 1, 3, 5, '#f4f4f0'); R(1, 2, 3, 1, '#c8402e'); R(1, 4, 3, 1, '#c8402e'); break;
    case 'harbor': R(0, 4, 5, 1, '#8a5a2b'); R(0, 5, 1, 1, '#5a3a20'); R(4, 5, 1, 1, '#5a3a20'); R(1, 2, 3, 1, '#5a3a20'); R(2, 0, 1, 2, '#e8e0c8'); break;
    case 'stadium': case 'colosseum': case 'theater': R(0, 2, 5, 4, k === 'stadium' ? '#c8ccd4' : '#d8c8a0'); R(1, 3, 3, 2, k === 'stadium' ? '#5a9a3a' : '#a89070'); R(1, 1, 3, 1, k === 'stadium' ? '#c8ccd4' : '#d8c8a0'); break;
    case 'hospital': R(0, 1, 5, 5, '#f4f4f0'); R(2, 2, 1, 3, '#c8402e'); R(1, 3, 3, 1, '#c8402e'); break;
    case 'broadcast': case 'lab': R(2, 0, 1, 4, '#9aa0ac'); R(1, 0, 3, 1, '#c8402e'); R(0, 4, 5, 2, '#8a8a96'); if (k === 'lab') R(3, 1, 2, 1, '#e8eef4'); break;
    case 'stable': R(0, 2, 5, 1, '#8a2a20'); R(1, 1, 3, 1, '#8a2a20'); R(0, 3, 5, 3, '#a83a2a'); R(2, 4, 1, 2, '#e8dcc0'); break;
    case 'aqueduct': R(0, 1, 5, 1, '#a89a80'); R(0, 2, 1, 4, '#a89a80'); R(2, 2, 1, 4, '#a89a80'); R(4, 2, 1, 4, '#a89a80'); R(0, 1, 5, 1, '#7ab0f0'); break;
    case 'monument': R(2, 0, 1, 1, '#f2c14e'); R(2, 1, 1, 4, '#c8c0b0'); R(1, 5, 3, 1, '#8a8070'); break;
  }
}
// building styles by culture, so each people's towns look like their own
const CITY_STYLES = {
  temperate: { wall: '#e8dcc0', side: '#c8b898', roofs: ['#b5482e', '#9a3a26', '#c8643a'], roof: 'gable' },
  desert:    { wall: '#e6c890', side: '#c8a868', roofs: ['#d8b878', '#c8a060', '#e8d8b0'], roof: 'flat' },
  eastern:   { wall: '#efe4cc', side: '#c8bca4', roofs: ['#3a5a3a', '#2e4a6a', '#8a2a20'], roof: 'pagoda' },
  nordic:    { wall: '#8a6a4a', side: '#6a4e34', roofs: ['#4a3a2a', '#3a3a48', '#5a4a34'], roof: 'steep' },
  tropical:  { wall: '#c8a06a', side: '#a8804a', roofs: ['#d8c070', '#c8b060', '#b8a050'], roof: 'thatch' },
  stone:     { wall: '#a8a4a0', side: '#88847e', roofs: ['#6a6a76', '#5a5a66', '#7a6a5a'], roof: 'gable' },
};
const CULTURE_STYLE = ['nordic', 'eastern', 'desert', 'tropical', 'stone', 'temperate', 'nordic', 'tropical', 'eastern', 'tropical', 'desert', 'temperate'];
function styleOf(p) { return CITY_STYLES[CULTURE_STYLE[(p.cul || 0) % CULTURE_STYLE.length]]; }
function house(g, x, y, st, roof, modern, v) {
  const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
  if (modern) { R(0, 0, 5, 6, v % 2 ? '#9aa0ac' : '#b8b0a0'); for (let yy = 1; yy < 6; yy += 2) { R(1, yy, 1, 1, '#7ab0f0'); R(3, yy, 1, 1, '#7ab0f0'); } R(0, 0, 5, 1, '#6a6a76'); return; }
  switch (st.roof) {
    case 'flat': R(0, 2, 5, 4, st.wall); R(0, 1, 5, 1, roof); R(4, 2, 1, 4, st.side); R(1, 4, 1, 2, '#5a3a20'); R(3, 3, 1, 1, '#3a2a18'); if (v % 3 === 0) { R(1, 0, 3, 1, '#e8e0d0'); R(2, -1, 1, 1, '#e8e0d0'); } break;
    case 'pagoda': R(0, 1, 5, 1, roof); R(1, 0, 3, 1, roof); R(-1, 1, 1, 1, roof); R(5, 1, 1, 1, roof); R(-1, 0, 1, 1, roof); R(5, 0, 1, 1, roof); R(1, 2, 3, 4, st.wall); R(2, 4, 1, 2, '#5a3a20'); R(1, 3, 3, 1, '#8a2a20'); break;
    case 'steep': R(2, 0, 1, 1, roof); R(1, 1, 3, 1, roof); R(1, 2, 3, 1, roof); R(0, 3, 5, 1, roof); R(0, 4, 5, 2, st.wall); R(2, 4, 1, 2, '#2a1a10'); break;
    case 'thatch': R(1, 1, 3, 1, roof); R(0, 2, 5, 2, roof); R(1, 0, 3, 1, shade(roof, 1.15)); R(1, 4, 3, 2, st.wall); R(2, 4, 1, 2, '#3a2a18'); break;
    default: R(0, 2, 5, 1, roof); R(1, 1, 3, 1, roof); R(2, 0, 1, 1, roof); R(0, 3, 5, 3, st.wall); R(2, 4, 1, 2, '#5a3a20'); R(4, 3, 1, 3, st.side); if (v % 4 === 1) R(3, 0, 1, 2, '#6a5a50');
  }
}
function citySprite(c) {
  const p = P(c.o), d = civDef(p), st = styleOf(p), modern = (p.era || 0) >= 5, houses = Math.min(10, 1 + Math.ceil(c.pop * 0.8));
  const built = LANDMARKS.filter(k => c.blds[k]), rnd = seeded(c.id * 977 + 13);
  // each city shows its own handful of landmarks, laid out on its own shuffled lots
  const marks = built.slice().sort((a, b) => hashN(c.id * 31 + a.length * 7 + a.charCodeAt(0)) - hashN(c.id * 31 + b.length * 7 + b.charCodeAt(0))).slice(0, Math.min(6, 2 + Math.floor(c.pop / 3)));
  const key = 'cty' + c.id + '|' + houses + d.col + marks.join() + (c.blds.palace ? 'P' : '') + (c.blds.walls ? 'W' : '') + (c.blds.castle ? 'C' : '') + (modern ? 'M' : '') + (p.cul || 0);
  if (_spr.has(key)) return _spr.get(key);
  if (_spr.size > 900) _spr.clear();
  const cv = mkCanvas(CITY_PX, CITY_PX), g = cv.getContext('2d');
  if (c.pop >= 5) { g.fillStyle = st.roof === 'thatch' ? 'rgba(120,96,60,.45)' : 'rgba(150,128,92,.55)'; g.fillRect(2, 8, 20, 15); }
  const cells = []; for (const y of [4, 10, 16]) for (const x of [1, 7, 12, 18]) cells.push({ x: x + Math.floor(rnd() * 2) - (x > 12 ? 1 : 0), y: y + Math.floor(rnd() * 2) });
  let free = [5, 6, 9, 10, 4, 7, 8, 11, 1, 2, 0, 3];
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); if (i > 3 && j > 3) [free[i], free[j]] = [free[j], free[i]]; } // keep the core near the middle, shuffle the rest
  if (c.blds.palace) {
    free = free.filter(i => i !== 1 && i !== 2);
    const X = 7, Y = 2, roof = st.roofs[0]; g.fillStyle = st.wall; g.fillRect(X, Y + 3, 10, 5); g.fillStyle = roof; g.fillRect(X, Y + 2, 10, 1); g.fillRect(X + 1, Y + 1, 8, 1);
    g.fillStyle = st.roof === 'flat' ? '#e8e0d0' : '#f2c14e'; g.fillRect(X + 4, Y - 1, 2, 2); g.fillStyle = d.col; g.fillRect(X + 1, Y - 2, 1, 4); g.fillRect(X + 2, Y - 2, 2, 1); g.fillStyle = '#5a3a20'; g.fillRect(X + 4, Y + 5, 2, 3);
  }
  for (const k of marks) { const i = free.shift(); if (i == null) break; cityLot(g, k, cells[i].x, cells[i].y, d.col, st.roofs[0]); }
  for (let n = 0; n < houses && free.length; n++) { const i = free.shift(), v = Math.floor(rnd() * 12); house(g, cells[i].x, cells[i].y, st, st.roofs[v % st.roofs.length], modern && v % 3 === 0, v); } // a few tower blocks in the modern age
  if (c.blds.walls) { g.fillStyle = st.roof === 'thatch' ? '#8a5a2b' : '#8a8a96'; g.fillRect(0, 22, 24, 2); g.fillRect(0, 9, 1, 15); g.fillRect(23, 9, 1, 15); for (let x = 0; x < 24; x += 3) g.fillRect(x, 21, 2, 1); }
  if (c.blds.castle) { cityLot(g, 'tower', 0, 17, d.col, st.roofs[0]); cityLot(g, 'tower', 19, 17, d.col, st.roofs[0]); }
  const o = mkCanvas(CITY_PX, CITY_PX), og = o.getContext('2d'); og.drawImage(cv, 0, 0); outlineAny(og, CITY_PX, CITY_PX, 120);
  _spr.set(key, o); return o;
}
// outskirts: big cities spill houses onto the land around them
function suburbSprite(c, k) {
  const p = P(c.o), st = styleOf(p), modern = (p.era || 0) >= 5, key = 'sub' + c.id + '|' + k + (modern ? 'M' : '') + (p.cul || 0);
  if (_spr.has(key)) return _spr.get(key);
  const cv = mkCanvas(TS, TS), g = cv.getContext('2d'), rnd = seeded(c.id * 131 + k * 17);
  const spots = [[1, 2], [9, 1], [5, 8], [10, 9], [0, 9]].filter(() => rnd() < 0.75).slice(0, 4);
  for (const [x, y] of spots) { const v = Math.floor(rnd() * 12); house(g, x, y, st, st.roofs[v % st.roofs.length], modern && v % 4 === 0, v); }
  const o = mkCanvas(TS, TS), og = o.getContext('2d'); og.drawImage(cv, 0, 0); outlineAny(og, TS, TS, 110);
  _spr.set(key, o); return o;
}
function artCanvas(rows, scale = 1) { const h = rows.length, w = rows[0].length, cv = mkCanvas(w * scale, h * scale), ctx = cv.getContext('2d'); ctx.scale(scale, scale); paint(ctx, rows, 0, 0, {}); return cv; }
const _icons = {};
function iconURL(k) { if (!_icons[k]) _icons[k] = artCanvas(ICON_ART[k], 2).toDataURL(); return _icons[k]; }
function iconImg(k) { return `<img class="ic" alt="" src="${iconURL(k)}">`; }
function spriteURL(type, p) { const cv = mkCanvas(32, 32), ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(unitSprite(type, p), 0, 0, 32, 32); return cv.toDataURL(); }

/* ---------- terrain tiles ---------- */
const TCOL = {
  ocean: ['#1f4b94', '#23529c', '#2a5ea8'], coast: ['#2f78c0', '#3584c8', '#3f90d2'], grass: ['#58a63a', '#4e9832', '#66b444'],
  plains: ['#a8b04a', '#98a03e', '#b8c058'], desert: ['#e2c878', '#d4b866', '#ecd690'], tundra: ['#8e9a7c', '#7f8a6c', '#a0aa8e'],
  snow: ['#e8eef4', '#d2dce8', '#ffffff'], forest: ['#4e9832', '#468a2c', '#58a63a'], jungle: ['#3c8a30', '#347a2a', '#46983a'],
  hills: ['#9aa04a', '#8a9040', '#aab258'], mountain: ['#8f8a80', '#7f7a72', '#a09a90'],
};
const _tiles = {};
// light comes from the top-left: details get a bright top/left pixel and a dark shadow to the bottom-right
function tileArt(t, v, frame) {
  const key = t + v + (frame || 0);
  if (_tiles[key]) return _tiles[key];
  const cv = mkCanvas(TS, TS), ctx = cv.getContext('2d'), rnd = seeded(v * 977 + t.length * 31 + (frame || 0) * 7), col = TCOL[t];
  // clumpy base noise (pairs of pixels) with a faint top-left to bottom-right light falloff
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const r = rnd(), c = r < 0.66 ? col[0] : r < 0.84 ? col[1] : col[2], lit = 1.04 - (x + y) / (TS * 2) * 0.08;
    ctx.fillStyle = shade(c, lit); ctx.fillRect(x, y, 1, 1);
  }
  const px = (x, y, c) => { if (x < 0 || y < 0 || x >= TS || y >= TS) return; ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  const sh = (x, y, a) => { if (x < 0 || y < 0 || x >= TS || y >= TS) return; ctx.fillStyle = `rgba(16,20,10,${a})`; ctx.fillRect(x, y, 1, 1); };
  const R = n => Math.floor(rnd() * n);
  const tuft = (x, y, base) => { px(x, y, shade(base, 0.7)); px(x + 1, y - 1, shade(base, 0.82)); px(x + 2, y, shade(base, 0.7)); px(x + 1, y - 2, shade(base, 1.18)); };
  const rock = (x, y, c) => { px(x, y, shade(c, 1.2)); px(x + 1, y, c); px(x, y + 1, c); px(x + 1, y + 1, shade(c, 0.7)); sh(x + 2, y + 1, 0.3); sh(x + 1, y + 2, 0.3); sh(x + 2, y + 2, 0.2); };
  if (t === 'ocean' || t === 'coast') {
    const wc = t === 'ocean' ? '#3a72b8' : '#6aaee0', dk = t === 'ocean' ? '#1a4088' : '#2a6cb0';
    for (let i = 0; i < 3; i++) { const x = R(11) + ((frame || 0) * 2) % 3, y = 2 + R(12); px(x, y, wc); px(x + 1, y - 1, wc); px(x + 2, y - 1, wc); px(x + 3, y, wc); px(x + 1, y, dk); px(x + 2, y, dk); }
    for (let i = 0; i < 2; i++) if (rnd() < 0.6) px(R(16), R(16), t === 'ocean' ? '#6a9ad8' : '#c8ecff'); // glints
  } else if (t === 'grass' || t === 'plains') {
    const base = col[0];
    for (let i = 0; i < 6; i++) tuft(R(13) + 1, R(12) + 3, base);
    const flowers = t === 'grass' ? ['#f8e060', '#ffffff', '#f2a0c8', '#c8a0f0'] : ['#e8c850', '#f0e0a0'];
    if (v % 2 === 0) for (let i = 0; i < 3; i++) { const x = R(14) + 1, y = R(13) + 2, f = flowers[R(flowers.length)]; px(x, y, f); sh(x + 1, y + 1, 0.25); }
    if (rnd() < 0.4) rock(R(12) + 2, R(11) + 3, t === 'grass' ? '#8a9078' : '#9a9070');
  } else if (t === 'desert') {
    for (let i = 0; i < 3; i++) { // dunes: lit crest with a shadow below
      const y = 3 + R(10), x = R(8);
      for (let k = 0; k < 7; k++) { const yy = y - (k > 1 && k < 5 ? 1 : 0); px(x + k, yy, '#f6e2a8'); px(x + k, yy + 1, '#c8a858'); if (k > 2) px(x + k, yy + 2, '#bc9c50'); }
    }
    if (v === 1) { const x = 3 + R(9), y = 4 + R(6); for (let k = 0; k < 5; k++) px(x, y + k, k === 0 ? '#7ac060' : '#4e9030'); px(x - 1, y + 2, '#4e9030'); px(x - 1, y + 1, '#4e9030'); px(x + 1, y + 1, '#4e9030'); px(x + 1, y, '#4e9030'); for (let k = 1; k < 4; k++) sh(x + k, y + 5, 0.3); }
    else if (rnd() < 0.5) rock(R(12) + 2, R(10) + 4, '#b09060');
  } else if (t === 'tundra') {
    for (let i = 0; i < 4; i++) { const x = R(13) + 1, y = R(12) + 3; px(x, y, '#5a6a48'); px(x + 1, y - 1, '#6a7a52'); px(x + 2, y, '#5a6a48'); sh(x + 1, y + 1, 0.25); }
    for (let i = 0; i < 2; i++) { const x = R(12) + 1, y = R(12) + 2; px(x, y, '#eef2f6'); px(x + 1, y, '#dfe6ee'); px(x + 2, y, '#eef2f6'); px(x + 1, y + 1, '#b8c4d0'); }
    if (rnd() < 0.6) rock(R(12) + 2, R(11) + 3, '#7a7e78');
  } else if (t === 'snow') {
    for (let i = 0; i < 3; i++) { const y = 3 + R(11), x = R(9); for (let k = 0; k < 6; k++) { px(x + k, y, '#ffffff'); px(x + k, y + 1, k > 0 && k < 5 ? '#b8c8dc' : '#cfdae6'); } }
    for (let i = 0; i < 3; i++) px(R(16), R(16), rnd() < 0.5 ? '#ffffff' : '#a8bcd4');
  } else if (t === 'forest' || t === 'jungle') {
    const dk = t === 'forest' ? '#1f4f22' : '#1c5a24', md = t === 'forest' ? '#2f7a2f' : '#2f8a34', lt = t === 'forest' ? '#4a9a40' : '#62ba50';
    for (let i = 0; i < 6; i++) px(R(16), R(16), shade(col[0], 0.75)); // dark undergrowth
    const spots = [[2, 2], [9, 1], [5, 7], [11, 8], [1, 10], [8, 11]].filter(() => rnd() < 0.85);
    for (const [sx, sy] of spots) { for (let k = 0; k < 4; k++) { sh(sx + 2 + k, sy + 6, 0.32); sh(sx + 3 + k, sy + 5, 0.22); } } // shadows first so trees overlap them
    for (const [sx, sy] of spots) {
      if (t === 'forest') paint(ctx, ['..L..', '.LGd.', '.LGd.', 'LGGGd', 'dGGdd', '..t..'], sx, sy, { d: dk, G: md, L: lt, t: '#5a3a20' });
      else paint(ctx, ['.L.L.', 'LLGGd', 'LGGGd', '.dGd.', '..t..', '..t..'], sx, sy, { d: dk, G: md, L: lt, t: '#6a4a24' });
    }
  } else if (t === 'hills') {
    const hump = (cx, cy, r) => {
      for (let x = -r * 2 + 1; x <= r * 2 + 2; x++) sh(cx + x + 1, cy + 1, 0.28); // ground shadow
      for (let y = -r; y <= 0; y++) for (let x = -r * 2; x <= r * 2; x++) { if ((x * x) / 4 + y * y > r * r) continue; px(cx + x, cy + y, x < -1 ? '#c0c868' : x < 1 ? '#a0a84a' : '#747c32'); }
      px(cx - 1, cy - r, '#dce488'); px(cx, cy - r, '#d0d878');
    };
    hump(5, 9, 3); hump(11, 13, 3); if (rnd() < 0.5) hump(11, 6, 2);
    for (let i = 0; i < 3; i++) tuft(R(13) + 1, R(4) + 12, col[0]);
  } else if (t === 'mountain') {
    const peak = (cx, base, hgt) => {
      for (let x = 1; x <= Math.floor(hgt * 0.9) + 2; x++) sh(cx + x, base, 0.3);
      for (let y = 0; y < hgt; y++) { const half = Math.floor(y * 0.9); for (let x = -half; x <= half; x++) { const snow = y < hgt * 0.3 + (x % 2 ? 1 : 0); px(cx + x, base - hgt + y, snow ? (x <= 0 ? '#ffffff' : '#c8d4e4') : x < 0 ? (x === -half ? '#bcb6ac' : '#a8a29a') : x === 0 ? '#8a847c' : '#6e6862'); } }
      for (let k = 0; k < 2; k++) { const y = base - hgt + Math.floor(hgt * 0.45) + k * 2; px(cx - 1 - k, y, '#7a746c'); px(cx - k, y + 1, '#7a746c'); } // cracks
    };
    peak(6, 15, 12); peak(11, 15, 9);
  }
  _tiles[key] = cv; return cv;
}
// how high each terrain sits; a higher neighbour to the north/west casts a shadow across this tile
const ELEV = { ocean: 0, coast: 0, grass: 1, plains: 1, desert: 1, tundra: 1, snow: 1.1, jungle: 1.4, forest: 1.4, hills: 2, mountain: 3 };
// soft terrain borders, height shadows and shallows; drawn over the base art, under improvements
function shadeTile(g, i, X, Y) {
  const tl = S.map[i], x = i % S.w, y = (i / S.w) | 0, wet = isWater(tl), rnd = seeded(i * 7919 + 13), e0 = ELEV[tl.t];
  const nb = (dx, dy) => (inb(x + dx, y + dy) ? T(x + dx, y + dy) : null);
  const sides = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  // dither the neighbouring land colour into the edge so different terrains blend instead of meeting at a hard line
  if (!wet) for (const [dx, dy] of sides) {
    const o = nb(dx, dy); if (!o || isWater(o) || o.t === tl.t) continue;
    const oc = TCOL[o.t];
    for (let d = 0; d < 3; d++) for (let k = 0; k < TS; k++) {
      if (rnd() > [0.55, 0.28, 0.1][d]) continue;
      const px = dx === 0 ? k : dx < 0 ? d : TS - 1 - d, py = dy === 0 ? k : dy < 0 ? d : TS - 1 - d;
      g.fillStyle = oc[(k + d) % 3]; g.fillRect(X + px, Y + py, 1, 1);
    }
  }
  // height shadows from the north and west
  const shadow = (o, dx, dy) => {
    if (!o) return; const diff = ELEV[o.t] - e0; if (diff <= 0.2) return;
    const a = Math.min(0.45, 0.16 + diff * 0.1), n = diff > 1.5 ? 6 : 4;
    for (let d = 0; d < n; d++) { g.fillStyle = `rgba(10,14,30,${a * (1 - d / n)})`; if (dy) g.fillRect(X, Y + d, TS, 1); else g.fillRect(X + d, Y, 1, TS); }
  };
  shadow(nb(0, -1), 0, -1); shadow(nb(-1, 0), -1, 0);
  const diag = nb(-1, -1); if (diag && ELEV[diag.t] - e0 > 0.2 && !(nb(0, -1) && ELEV[nb(0, -1).t] - e0 > 0.2) && !(nb(-1, 0) && ELEV[nb(-1, 0).t] - e0 > 0.2)) { g.fillStyle = 'rgba(10,14,30,.18)'; g.fillRect(X, Y, 3, 3); }
  if (wet) {
    // shallows: lighter water along any land edge, deeper blue in open ocean
    let shore = false;
    for (const [dx, dy] of sides) {
      const o = nb(dx, dy); if (!o || isWater(o)) continue; shore = true;
      for (let d = 1; d < 5; d++) { g.fillStyle = `rgba(150,215,240,${0.22 * (1 - d / 5)})`; if (dy) g.fillRect(X, dy < 0 ? Y + d : Y + TS - 1 - d, TS, 1); else g.fillRect(dx < 0 ? X + d : X + TS - 1 - d, Y, 1, TS); }
    }
    if (!shore && tl.t === 'ocean') { g.fillStyle = 'rgba(8,20,60,.12)'; g.fillRect(X, Y, TS, TS); }
  } else {
    // land drops into the water: a darker bank along the bottom/right edges that face water
    const s = nb(0, 1), e = nb(1, 0);
    if (s && isWater(s)) { g.fillStyle = 'rgba(40,28,10,.45)'; g.fillRect(X, Y + TS - 2, TS, 2); g.fillStyle = 'rgba(255,240,200,.18)'; g.fillRect(X, Y + TS - 3, TS, 1); }
    if (e && isWater(e)) { g.fillStyle = 'rgba(40,28,10,.3)'; g.fillRect(X + TS - 1, Y, 1, TS); }
  }
}
function drawImp(ctx, tl, x, y, z) {
  const s = z, px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a * s, y + b * s, w * s, h * s); };
  switch (tl.imp) {
    case 'farm': for (let r = 2; r < 15; r += 3) for (let c = 1; c < 15; c += 2) px(c, r, 1, 1, r % 2 ? '#e4d870' : '#b0a040'); break;
    case 'mine': px(5, 8, 6, 6, '#1a1420'); px(4, 7, 8, 1, '#8a5a2b'); px(4, 7, 1, 7, '#8a5a2b'); px(11, 7, 1, 7, '#8a5a2b'); px(6, 13, 4, 1, '#7a8094'); break;
    case 'pasture': for (const r of [3, 12]) px(1, r, 14, 1, '#c08a48'); for (const c of [1, 5, 10, 14]) px(c, 2, 1, 12, '#8a5a2b'); break;
    case 'plantation': for (let r = 3; r < 15; r += 4) for (let c = 2; c < 15; c += 4) { px(c, r, 2, 2, '#2f7a2f'); px(c, r, 1, 1, '#7ac060'); } break;
    case 'lumber': px(3, 11, 10, 2, '#8a5a2b'); px(4, 9, 8, 2, '#c08a48'); px(3, 11, 1, 2, '#e8c890'); px(12, 9, 1, 2, '#e8c890'); break;
  }
}

/* ---------- world drawing ---------- */
var CAM = { x: 0, y: 0, z: 3 };
function tileVariant(i) { return (i * 2654435761 >>> 0) % 4; }
/* ---------- cached terrain layer ---------- */
var LAYER = { a: null, b: null, mini: null, sig: null, key: '', S: null, miniDirty: true };
// everything a tile's static picture depends on, including neighbours (foam, roads, border edges)
function tileSig(i) {
  const tl = S.map[i], x = i % S.w, y = (i / S.w) | 0;
  let s = tl.t + '|' + (tl.wonder || '') + (tl.imp || '') + (tl.road ? 'r' : '') + (tl.res || '') + (tl.camp ? 'c' : '') + (tl.ruin ? 'u' : '') + (tl.city >= 0 ? 'C' : '') + tl.owner;
  for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) { s += '#'; continue; } const o = S.map[ny * S.w + nx]; s += o.t + (isWater(o) ? 'w' : 'l') + (o.road || o.city >= 0 ? 'r' : '') + o.owner; }
  return s;
}
function paintTile(g, i, frame) {
  const tl = S.map[i], x = i % S.w, y = (i / S.w) | 0, X = x * TS, Y = y * TS, z = 1;
  g.clearRect(X, Y, TS, TS);
  g.drawImage(tileArt(tl.t, tileVariant(i), isWater(tl) ? frame : 0), X, Y);
  shadeTile(g, i, X, Y);
  if (isWater(tl)) {
    g.fillStyle = '#9ad4f0';
    if (y > 0 && !isWater(T(x, y - 1))) g.fillRect(X, Y, TS, 1);
    if (y < S.h - 1 && !isWater(T(x, y + 1))) g.fillRect(X, Y + TS - 1, TS, 1);
    if (x > 0 && !isWater(T(x - 1, y))) g.fillRect(X, Y, 1, TS);
    if (x < S.w - 1 && !isWater(T(x + 1, y))) g.fillRect(X + TS - 1, Y, 1, TS);
  }
  if (tl.imp) drawImp(g, tl, X, Y, z);
  if (tl.road && tl.city < 0) {
    g.fillStyle = '#7a5a3a'; let any = false;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const o = T(nx, ny); if (!o.road && o.city < 0) continue; any = true; for (let k = 0; k <= 8; k++) g.fillRect(X + 7 + dx * k, Y + 7 + dy * k, 2, 2); }
    if (!any) g.fillRect(X + 6, Y + 6, 4, 4);
  }
  if (tl.res) { g.fillStyle = 'rgba(10,10,20,.55)'; g.fillRect(X + 9, Y + 9, 7, 7); g.drawImage(resCanvas(tl.res), X + 9.5, Y + 9.5, 6, 6); }
  if (tl.camp) g.drawImage(campCv(), X, Y);
  if (tl.ruin) g.drawImage(ruinCv(), X, Y);
  if (tl.wonder) g.drawImage(wonderCv(tl.wonder), X, Y);
  if (tl.owner >= 0) {
    const col = civDef(P(tl.owner)).col, edge = (nx, ny) => !inb(nx, ny) || T(nx, ny).owner !== tl.owner;
    g.fillStyle = hexA(col, 0.13); g.fillRect(X, Y, TS, TS);
    g.fillStyle = col;
    for (let k = 0; k < TS; k += 4) {
      if (edge(x, y - 1)) g.fillRect(X + k, Y, 2, 2);
      if (edge(x, y + 1)) g.fillRect(X + k, Y + TS - 2, 2, 2);
      if (edge(x - 1, y)) g.fillRect(X, Y + k, 2, 2);
      if (edge(x + 1, y)) g.fillRect(X + TS - 2, Y + k, 2, 2);
    }
  }
}
function updateLayer() {
  const n = S.w * S.h;
  if (LAYER.S !== S || !LAYER.a) {
    LAYER.a = mkCanvas(S.w * TS, S.h * TS); LAYER.b = mkCanvas(S.w * TS, S.h * TS); LAYER.mini = mkCanvas(S.w, S.h);
    LAYER.sig = new Array(n).fill(''); LAYER.S = S; LAYER.key = '';
  }
  const key = S.ver + '|' + S.turn, now = performance.now();
  if (key === LAYER.key) return;
  // at high speed the days change faster than borders and roads need repainting: rescan a few times a second
  if (!LAYER.force && LAYER.key && now - (LAYER.t || 0) < 300) return;
  LAYER.key = key; LAYER.t = now; LAYER.force = false;
  const ga = LAYER.a.getContext('2d'), gb = LAYER.b.getContext('2d'), gm = LAYER.mini.getContext('2d');
  for (let i = 0; i < n; i++) {
    const sg = tileSig(i); if (sg === LAYER.sig[i]) continue;
    LAYER.sig[i] = sg; paintTile(ga, i, 0); paintTile(gb, i, 1);
    const tl = S.map[i]; gm.fillStyle = tl.owner >= 0 ? civDef(P(tl.owner)).col : MINI_COL[tl.t]; gm.fillRect(i % S.w, (i / S.w) | 0, 1, 1);
  }
}
// copies the visible part of a layer to the screen, clipping the source rect to the layer
function blitLayer(ctx, L, W, H, z) {
  let sx = CAM.x / z, sy = CAM.y / z, sw = W / z, sh = H / z, dx = 0, dy = 0;
  if (sx < 0) { dx = -sx * z; sw += sx; sx = 0; } if (sy < 0) { dy = -sy * z; sh += sy; sy = 0; }
  sw = Math.min(sw, L.width - sx); sh = Math.min(sh, L.height - sy);
  if (sw > 0 && sh > 0) ctx.drawImage(L, sx, sy, sw, sh, dx, dy, sw * z, sh * z);
}
const _flip = new WeakMap();
function flipped(img) { let f = _flip.get(img); if (!f) { f = mkCanvas(img.width, img.height); const g = f.getContext('2d'); g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0); _flip.set(img, f); } return f; }
// a small sailing boat for units at sea: layer 0 = mast and sail (behind), 1 = hull and foam (in front)
const _ships = {};
function shipCv(col, col2, layer) {
  const key = col + col2 + layer; if (_ships[key]) return _ships[key];
  const c = mkCanvas(TS, TS), g = c.getContext('2d'), px = (x, y, cl) => { g.fillStyle = cl; g.fillRect(x, y, 1, 1); };
  if (layer === 0) {
    for (let y = 0; y <= 12; y++) px(1, y, '#5a3a20');
    px(2, 0, col2); px(3, 0, col2); px(2, 1, col2);
    for (let y = 2; y <= 10; y++) { const wdt = y < 5 ? y - 1 : 4; for (let x = 2; x < 2 + wdt; x++) px(x, y, x === 1 + wdt ? shade(col, 0.78) : col); }
    for (let x = 2; x < 6; x++) px(x, 6, col2);
  } else {
    for (let x = 0; x < 16; x++) px(x, 11, '#b07a40');
    for (let x = 0; x < 16; x++) px(x, 12, '#7a4a24');
    for (let x = 1; x < 15; x++) px(x, 13, '#6a3e1c');
    for (let x = 2; x < 14; x++) px(x, 14, '#5a3418');
    for (const x of [0, 1, 3, 12, 14, 15]) px(x, 15, '#e8f6ff');
    px(13, 12, col); px(14, 12, col);
    g.fillStyle = 'rgba(26,20,32,.7)'; g.fillRect(0, 10, 16, 1);
  }
  return (_ships[key] = c);
}
/* ---------- seasons and world effects ---------- */
function seasonPhase() { const d = S.turn % 120; return { s: Math.floor(d / 40), d: d % 40 }; }
// winter snow fades in over the first days of the cool season and melts early in the hot one
function snowAlpha() { const p = seasonPhase(); return p.s === 2 ? Math.min(0.9, (p.d + 1) / 4) : p.s === 0 && p.d < 3 ? (3 - p.d) / 4 : 0; }
let _snow = null, _snowKey = '';
function snowLayer() { // white speckle on land, heavier toward the poles and on high ground
  const key = (S.tver || 0) + '|' + S.seed + '|' + S.w;
  if (_snow && _snowKey === key) return _snow;
  _snowKey = key; _snow = mkCanvas(S.w * TS, S.h * TS); const g = _snow.getContext('2d');
  for (let i = 0; i < S.map.length; i++) {
    const tl = S.map[i]; if (isWater(tl)) continue;
    const x = i % S.w, y = (i / S.w) | 0, lat = Math.abs(y / (S.h - 1) - 0.5) * 2;
    let amt = Math.max(0, (lat - 0.25) / 0.6) + ({ mountain: 0.6, hills: 0.25, tundra: 0.4, snow: 0.5 }[tl.t] || 0);
    if (tl.t === 'desert' || tl.t === 'jungle') amt *= 0.2;
    amt = Math.min(1, amt); if (amt <= 0.03) continue;
    // a soft blanket over the tile, with a few drifts and shadows so it still reads as pixel snow
    const rnd = seeded(i * 7 + 3), X = x * TS, Y = y * TS;
    g.fillStyle = `rgba(238,244,250,${(0.35 + amt * 0.5).toFixed(2)})`; g.fillRect(X, Y, TS, TS);
    for (let k = 0; k < 10 * amt; k++) { const dx = Math.floor(rnd() * 13), dy = Math.floor(rnd() * 15); g.fillStyle = '#ffffff'; g.fillRect(X + dx, Y + dy, 3, 1); g.fillStyle = 'rgba(170,190,215,.55)'; g.fillRect(X + dx, Y + dy + 1, 3, 1); }
  }
  return _snow;
}
function hashN(n) { n = Math.imul(n ^ (n >>> 15), 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function drawEffects(ctx, W, H, z, ts, now, ui, sx, sy) {
  const p = seasonPhase();
  // weather over the whole view
  if (p.s === 0) { ctx.fillStyle = 'rgba(255,190,90,.06)'; ctx.fillRect(0, 0, W, H); }
  if (p.s === 1 && hashN(S.turn) < 0.7) { // rain on most rainy-season days
    ctx.fillStyle = 'rgba(40,60,90,.12)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(190,220,255,.45)';
    for (let i = 0; i < 160; i++) { const x = (hashN(i) * W + now * 0.18) % W, y = (hashN(i + 999) * H + now * 0.9) % H; ctx.fillRect(x, y, 1, 7); ctx.fillRect(x - 1, y + 7, 1, 3); }
  }
  if (p.s === 2) {
    ctx.fillStyle = 'rgba(200,220,255,.07)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 110; i++) { const sp = 0.03 + hashN(i + 7) * 0.04, x = (hashN(i) * W + Math.sin(now / 900 + i) * 12) % W, y = (hashN(i + 333) * H + now * sp) % H; const r = hashN(i + 50) < 0.3 ? 3 : 2; ctx.fillRect(x, y, r, r); }
  }
  // plague and blessings hanging over cities
  for (const c of S.cities) {
    if (!(c.plague > 0) && !(c.bounty > 0)) continue;
    const X = sx(c.x), Y = sy(c.y);
    if (X < -ts || Y < -ts || X > W + ts || Y > H + ts) continue;
    for (let k = 0; k < 6; k++) {
      const ph = (now / 1600 + hashN(c.id * 31 + k)) % 1, px = X + (0.15 + hashN(c.id + k * 7) * 0.7) * ts, py = Y + ts * (0.9 - ph * 1.1);
      ctx.fillStyle = c.plague > 0 ? `rgba(140,220,80,${0.8 - ph * 0.7})` : `rgba(255,220,90,${0.9 - ph * 0.8})`;
      ctx.fillRect(px, py, Math.max(2, z), Math.max(2, z));
    }
  }
  // one-off effects
  ui.vfx = ui.vfx.filter(v => now - v.t < ({ catch: 900, volcano: 5000, tsunami: 2600, meteor: 1600, quake: 1500, lightning: 500, plague: 1500, bless: 1400 }[v.k] || 1500));
  for (const v of ui.vfx) {
    const a = now - v.t, cx = sx(v.x) + ts / 2, cy = sy(v.y) + ts / 2;
    if (v.k === 'meteor') {
      if (a < 500) { const f = a / 500, mx = cx + (1 - f) * W * 0.4, my = cy - (1 - f) * H * 0.6; ctx.strokeStyle = 'rgba(255,200,120,.9)'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(mx + 40 * z, my - 60 * z); ctx.lineTo(mx, my); ctx.stroke(); ctx.fillStyle = '#fff3a0'; ctx.fillRect(mx - 2 * z, my - 2 * z, 4 * z, 4 * z); }
      else { const f = (a - 500) / 1100; ctx.strokeStyle = `rgba(255,140,60,${1 - f})`; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.arc(cx, cy, f * ts * 2.2, 0, 7); ctx.stroke(); if (f < 0.3) { ctx.fillStyle = `rgba(255,240,200,${0.6 - f * 2})`; ctx.fillRect(0, 0, W, H); } }
    } else if (v.k === 'volcano') {
      for (let i = 0; i < 26; i++) { // lava blobs on arcs
        const life = 1200, ph = ((a + hashN(i) * life) % life) / life, ang = -Math.PI / 2 + (hashN(i + 9) - 0.5) * 1.6, sp = (1.2 + hashN(i + 3)) * ts;
        const px = cx + Math.cos(ang) * sp * ph, py = cy - ts * 0.3 + Math.sin(ang) * sp * ph + ph * ph * ts * 1.8;
        if (a > 4000) continue;
        ctx.fillStyle = i % 3 ? '#f59a3a' : '#fff3a0'; ctx.fillRect(px, py, 2 * z, 2 * z);
      }
      for (let i = 0; i < 8; i++) { const ph = ((a / 2400) + i / 8) % 1, r = (2 + ph * 6) * z; ctx.fillStyle = `rgba(70,64,72,${0.55 * (1 - ph)})`; ctx.fillRect(cx - r + Math.sin(i * 2 + a / 500) * 6 * z, cy - ts * 0.4 - ph * ts * 2, r * 2, r * 2); }
    } else if (v.k === 'quake') {
      for (let i = 0; i < 18; i++) { const ph = ((a / 700) + hashN(i)) % 1, px = cx + (hashN(i + 4) - 0.5) * ts * 5, py = cy + (hashN(i + 8) - 0.5) * ts * 5 - ph * ts * 0.5; ctx.fillStyle = `rgba(160,130,90,${0.7 * (1 - ph)})`; ctx.fillRect(px, py, 3 * z, 2 * z); }
    } else if (v.k === 'tsunami') {
      const f = a / 2600; for (let r = 0; r < 3; r++) { const rr = Math.max(0, f - r * 0.12) * ts * 4.2; ctx.strokeStyle = `rgba(200,240,255,${(1 - f) * 0.9})`; ctx.lineWidth = (3 - r) * z; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke(); }
    } else if (v.k === 'lightning') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * z; ctx.beginPath(); let px = cx, py = cy; ctx.moveTo(px, py);
      for (let k = 1; k < 9; k++) { px = cx + (hashN(v.t + k) - 0.5) * ts * 1.2; py = cy - k * H / 8; ctx.lineTo(px, py); }
      ctx.stroke(); if (a < 160) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 0, W, H); }
    } else if (v.k === 'catch') { // a little puff where the prey was caught
      const f = a / 900, px = v.x * ts - CAM.x, py = v.y * ts - CAM.y;
      for (let k = 0; k < 6; k++) { const an = k * 1.05; ctx.fillStyle = `rgba(240,230,210,${0.8 - f * 0.8})`; ctx.fillRect(px + Math.cos(an) * f * ts * 0.4, py - ts * 0.15 + Math.sin(an) * f * ts * 0.3, Math.max(1, z), Math.max(1, z)); }
    } else if (v.k === 'plague' || v.k === 'bless') {
      const f = a / 1400; ctx.strokeStyle = v.k === 'plague' ? `rgba(140,220,80,${1 - f})` : `rgba(255,220,90,${1 - f})`; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.arc(cx, cy, f * ts * 1.4, 0, 7); ctx.stroke();
    }
  }
}
// people and animals are drawn smaller than a tile so the land stays readable; units a bit larger
const LIFE_SCALE = 0.5, UNIT_SCALE = 0.72;
function drawWorld(ctx, W, H, ui) {
  const z = CAM.z, ts = TS * z, h = humanP(), tnow = performance.now(), dt = Math.min(0.1, (tnow - (ui.lt || tnow)) / 1000);
  ui.lt = tnow;
  ctx.imageSmoothingEnabled = false;
  if (ui.disp.size > S.units.length + 300) { const ids = new Set(S.units.map(u => u.id)); for (const k of ui.disp.keys()) if (!ids.has(k)) ui.disp.delete(k); }
  ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, W, H);
  const x0 = Math.max(0, Math.floor(CAM.x / ts)), y0 = Math.max(0, Math.floor(CAM.y / ts));
  const x1 = Math.min(S.w - 1, Math.floor((CAM.x + W) / ts)), y1 = Math.min(S.h - 1, Math.floor((CAM.y + H) / ts));
  const frame = Math.floor(performance.now() / 700) % 2;
  const seen = i => !h || S.seen[i], vis = i => !h || VIS[i];
  const sx = x => x * ts - CAM.x, sy = y => y * ts - CAM.y;
  // static terrain comes from a cached layer (one image per water frame); only changed tiles are repainted
  updateLayer();
  blitLayer(ctx, frame ? LAYER.b : LAYER.a, W, H, z);
  const snowA = snowAlpha(); if (snowA > 0) { ctx.globalAlpha = snowA; blitLayer(ctx, snowLayer(), W, H, z); ctx.globalAlpha = 1; }
  // overlays from UI (reachable / targets / path)
  if (ui.reach) for (const [i] of ui.reach) { const x = i % S.w, y = (i / S.w) | 0; if (x < x0 || x > x1 || y < y0 || y > y1) continue; ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(sx(x) + z, sy(y) + z, ts - 2 * z, ts - 2 * z); }
  if (ui.targets) for (const [x, y] of ui.targets) { ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = z; ctx.strokeRect(sx(x) + z, sy(y) + z, ts - 2 * z, ts - 2 * z); }
  if (ui.cityTiles) for (const i of ui.cityTiles) { const x = i % S.w, y = (i / S.w) | 0; ctx.fillStyle = 'rgba(242,193,78,.18)'; ctx.fillRect(sx(x), sy(y), ts, ts); }
  // cities
  for (const c of S.cities) {
    const i = c.y * S.w + c.x; if (!seen(i) || c.x < x0 - 2 || c.x > x1 + 2 || c.y < y0 - 1 || c.y > y1 + 1) continue;
    if (c.pop >= 9) { // outskirts on up to four neighbouring tiles of its own land
      const n = Math.min(4, Math.floor((c.pop - 7) / 2)); let k = 0;
      for (const [dx, dy] of DIRS) {
        if (k >= n) break; const nx = c.x + dx, ny = c.y + dy; if (!inb(nx, ny)) continue;
        const tl = T(nx, ny); if (tl.oc !== c.id || !passable(tl) || tl.city >= 0 || tl.wonder || tl.t === 'mountain' || (hashN(c.id * 8 + k) < 0.15)) continue;
        ctx.drawImage(suburbSprite(c, k), sx(nx), sy(ny), ts, ts); k++;
      }
    }
    ctx.drawImage(citySprite(c), sx(c.x) - 4 * z, sy(c.y) - 7 * z, CITY_PX * z, CITY_PX * z); // a bit larger than its tile
  }
  // wandering animals and townsfolk (too small to read when fully zoomed out, so skipped there)
  const lz = z * LIFE_SCALE;
  if (lz >= 0.9) for (const c of ui.life) {
    const tx = Math.floor(c.x), ty = Math.floor(c.y);
    if (tx < x0 - 1 || tx > x1 + 1 || ty < y0 || ty > y1 || (h && !VIS[ty * S.w + tx])) continue;
    const home = c.home != null ? cityById(c.home) : null;
    if (c.k === 'folk') { // rigged townsperson doing their job
      const X = c.x * ts - CAM.x - (CW / 2) * lz, Y = c.y * ts - CAM.y - (CH - 1) * lz;
      const wet = isWater(T(tx, ty));
      if (wet) ctx.drawImage(boatCv(), X + 4 * lz, Y + 15 * lz, CW * lz * 0.6, 5 * lz * 0.6 + lz);
      drawFlip(ctx, charAnim(c.role, c.state === 'walk' ? 'walk' : c.act, tnow, c.seed, home ? civDef(P(home.o)).col : null, c.skin), X, Y - (wet ? 2 * lz : 0), CW * lz, CH * lz, c.flip);
      continue;
    }
    drawCritter(ctx, c, c.x * ts - CAM.x, c.y * ts - CAM.y, lz, tnow);
  }
  // units
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * S.w + x; if (!vis(i)) continue;
    const us = uat(x, y); if (!us.length) continue;
    const civ = us.filter(isCiv), mil = us.filter(u => !isCiv(u));
    const draw = (u, off, small) => {
      const dp = unitDisp(u, ui, dt), bob = (dp.m > 0 ? Math.floor(tnow / 90) % 2 : Math.floor(tnow / 650 + u.id * 0.37) % 2) * z;
      const afloat = isWater(T(u.x, u.y)), sway = afloat ? Math.round(Math.sin(tnow / 420 + u.id)) * z : 0;
      const X = sx(dp.x) + off * z, Y = sy(dp.y) - (afloat ? 3 * z - sway : 0), d = civDef(P(u.o));
      if (afloat) ctx.drawImage(shipCv(d.col, d.col2, 0), X, Y + 3 * z, ts, ts); // mast and sail behind the crew
      else { ctx.fillStyle = hexA(d.col, 0.9); ctx.fillRect(X + 4 * z, Y + 13 * z, 8 * z, 2 * z); ctx.fillStyle = '#1a1420'; ctx.fillRect(X + 4 * z, Y + 15 * z, 8 * z, z); }
      const sc = (small ? 0.8 : 1) * UNIT_SCALE, w = ts * sc;
      let role = UNIT_ROLE[u.type];
      if (role) { // people are rigged characters; horses, siege and tanks keep their sprites
        if (u.task) role = TASK_ROLE[u.task.k] || role;
        const an = ui.anim.get(u.id), R = ROLES[role], recent = an && tnow - an.t < 520;
        const act = recent ? (an.k === 'hurt' ? 'hurt' : R.atk || 'cheer') : dp.m > 0 ? 'walk' : u.task ? R.work : 'idle';
        const t0 = recent ? tnow - an.t : tnow, cz = z * sc;
        drawFlip(ctx, charAnim(role, act, t0, recent ? 0 : u.id * 0.37, d.col, u.id), X + (ts - CW * cz) / 2, Y + 15.5 * z - (CH - 0.5) * cz, CW * cz, CH * cz, dp.f);
      } else drawFlip(ctx, unitSprite(u.type, P(u.o)), X + (ts - w) / 2, Y + (ts - w) - bob, w, w, dp.f);
      if (afloat) ctx.drawImage(shipCv(d.col, d.col2, 1), X, Y + 3 * z, ts, ts); // hull in front
      if (u.hp < 100) { ctx.fillStyle = '#1a1420'; ctx.fillRect(X + 2 * z, Y, 12 * z, 2 * z); ctx.fillStyle = u.hp > 60 ? '#5ec46a' : u.hp > 30 ? '#f2c14e' : '#e5534b'; ctx.fillRect(X + 2 * z, Y, Math.max(1, 12 * z * u.hp / 100), 2 * z); }
      if (u.fort && !isCiv(u)) { ctx.fillStyle = '#d4d8e4'; ctx.fillRect(X + 13 * z, Y + 3 * z, 3 * z, 3 * z); ctx.fillStyle = '#7a8094'; ctx.fillRect(X + 14 * z, Y + 4 * z, z, z); }
      if (u.task) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(X + 13 * z, Y + 3 * z, 3 * z, 3 * z); }
      if (ui.sel === u && Math.floor(performance.now() / 350) % 2) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = z; ctx.strokeRect(X + z / 2, Y + z / 2, ts - z, ts - z); }
    };
    if (civ.length && mil.length) { draw(civ[0], -4, true); draw(mil[0], 3, false); }
    else draw((mil[0] || civ[0]), 0, false);
    if (us.length > 2) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(sx(x), sy(y) + 3 * z, 2 * z, 2 * z); }
  }
  // fog
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * S.w + x;
    if (!seen(i)) continue;
    if (!vis(i)) { ctx.fillStyle = 'rgba(8,8,20,.45)'; ctx.fillRect(sx(x), sy(y), ts, ts); }
  }
  // unexplored edge softening
  if (h) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * S.w + x; if (S.seen[i]) continue;
    ctx.fillStyle = '#05060c'; ctx.fillRect(sx(x), sy(y), ts, ts);
    ctx.fillStyle = '#0c0e1c'; if ((x + y) % 2 === 0) ctx.fillRect(sx(x) + 6 * z, sy(y) + 6 * z, z, z);
  }
  // path preview
  if (ui.path) {
    ctx.fillStyle = '#ffffff';
    ui.path.forEach((p, k) => { const s = k === ui.path.length - 1 ? 4 : 2; ctx.fillRect(sx(p.x) + (8 - s / 2) * z, sy(p.y) + (8 - s / 2) * z, s * z, s * z); });
  }
  if (ui.hover && ui.sel) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(1, z / 2); ctx.strokeRect(sx(ui.hover.x), sy(ui.hover.y), ts, ts); }
  if (ui.selTile) { ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = z; ctx.strokeRect(sx(ui.selTile.x) + z / 2, sy(ui.selTile.y) + z / 2, ts - z, ts - z); }
  drawEffects(ctx, W, H, z, ts, tnow, ui, sx, sy);
  // city banners on top
  const fs = Math.max(11, Math.round(5.5 * z));
  ctx.font = `${fs}px "Silkscreen","Mitr",sans-serif`; ctx.textBaseline = 'middle';
  for (const c of S.cities) {
    const i = c.y * S.w + c.x; if (!seen(i) || c.x < x0 - 3 || c.x > x1 + 3 || c.y < y0 - 1 || c.y > y1 + 1) continue;
    const bc = cityBanner(c, fs), bw = bc.bw, bh = bc.bh;
    const X = sx(c.x) + ts / 2 - bw / 2, Y = sy(c.y) - bh - 7 * z; // above the taller city art
    ctx.drawImage(bc, X - 2, Y - 2, bw + 4, bh + 4);
    if (c.hp < cityMaxHp(c)) { ctx.fillStyle = '#1a1420'; ctx.fillRect(X, Y + bh, bw, 3); ctx.fillStyle = '#e5534b'; ctx.fillRect(X, Y + bh, bw * c.hp / cityMaxHp(c), 3); }
    if (h && c.o === h.id && c.q[0] && c.q[0].k !== 'w' && c.q[0].k !== 'r') { ctx.fillStyle = '#1a1420'; ctx.fillRect(X, Y - 3, bw, 3); ctx.fillStyle = '#e8964a'; ctx.fillRect(X, Y - 3, bw * Math.min(1, c.prod / itemCost(c.q[0])), 3); }
  }
  // floating combat numbers
  const now = tnow;
  ui.fx = ui.fx.filter(f => now - f.t < 1200);
  ctx.textAlign = 'center';
  for (const f of ui.fx) { const a = 1 - (now - f.t) / 1200; ctx.fillStyle = `rgba(255,90,70,${a})`; ctx.fillText(f.text, sx(f.x) + ts / 2, sy(f.y) + ts * 0.3 - (1 - a) * ts * 0.6); }
}
// banner text is rendered once per name/size/population and reused every frame
const _banners = new Map();
function cityBanner(c, fs) {
  const d = civDef(P(c.o)), name = cname(c), sc = typeof DPR === 'number' ? DPR : 1, key = name + '|' + c.pop + '|' + d.col + '|' + (c.blds.palace ? 1 : 0) + '|' + fs + '|' + sc;
  let cv = _banners.get(key); if (cv) return cv;
  if (_banners.size > 600) _banners.clear();
  const font = `500 ${fs}px "Mitr","Bai Jamjuree",sans-serif`, nfont = `${Math.round(fs * 0.85)}px "Silkscreen",monospace`, m = mkCanvas(1, 1).getContext('2d'); m.font = font;
  const bw = Math.ceil(m.measureText(name).width + fs * 2.2), bh = fs + 6;
  cv = mkCanvas(Math.ceil((bw + 4) * sc), Math.ceil((bh + 4) * sc)); cv.bw = bw; cv.bh = bh;
  const g = cv.getContext('2d'); g.scale(sc, sc); g.translate(2, 2); g.font = font; g.textBaseline = 'middle';
  // a parchment name plate with the civ's colour as the population tab, framed like the HUD
  g.fillStyle = '#2a1a0e'; g.fillRect(-2, -2, bw + 4, bh + 4);
  g.fillStyle = d.col; g.fillRect(0, 0, fs * 1.6, bh); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 0, fs * 1.6, 1);
  g.fillStyle = '#ead8ae'; g.fillRect(fs * 1.6, 0, bw - fs * 1.6, bh); g.fillStyle = 'rgba(120,88,48,.3)'; g.fillRect(fs * 1.6, bh - 2, bw - fs * 1.6, 2);
  g.font = nfont; g.fillStyle = luminance(d.col) > 0.55 ? '#1a1420' : '#ffffff'; g.textAlign = 'center'; g.fillText(String(c.pop), fs * 0.8, bh / 2 + 1);
  g.font = font; g.fillStyle = '#2b1e13'; g.textAlign = 'left'; g.fillText(name, fs * 1.9, bh / 2 + 1);
  if (c.blds.palace) { g.fillStyle = '#b4532a'; g.fillRect(bw - 6, 2, 4, 4); g.fillStyle = '#6e2c14'; g.fillRect(bw - 4, 4, 2, 2); }
  _banners.set(key, cv); return cv;
}
// world wonders, 16x16, drawn from simple shapes
const _won = {};
function wonderCv(k) {
  if (_won[k]) return _won[k];
  const c = mkCanvas(TS, TS), g = c.getContext('2d'), R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  switch (k) {
    case 'pyramid': for (let r = 0; r < 6; r++) { R(2 + r, 14 - r * 2, 12 - r * 2, 2, '#e0c070'); R(8, 14 - r * 2, 6 - r, 2, '#b8984a'); } R(7, 3, 2, 1, '#f2e2a0'); R(1, 15, 14, 1, '#8a6a3a'); break;
    case 'gardens': for (let r = 0; r < 4; r++) { R(1 + r * 2, 13 - r * 3, 14 - r * 4, 3, '#a89a80'); R(1 + r * 2, 13 - r * 3, 14 - r * 4, 1, '#4a9a3a'); R(2 + r * 2, 14 - r * 3, 1, 2, '#2f7a2f'); R(13 - r * 2, 14 - r * 3, 1, 2, '#2f7a2f'); } R(7, 2, 2, 2, '#c8402e'); break;
    case 'grandlib': R(2, 6, 12, 2, '#c8b890'); R(4, 4, 8, 2, '#d8c8a0'); R(6, 3, 4, 1, '#d8c8a0'); R(2, 8, 12, 6, '#e8e0cc'); for (let x = 3; x < 14; x += 2) R(x, 8, 1, 6, '#a89870'); R(7, 11, 2, 3, '#5a3a20'); R(1, 14, 14, 2, '#8a8070'); break;
    case 'colossus': R(5, 12, 6, 4, '#8a8a96'); R(6, 6, 4, 6, '#b07a40'); R(7, 3, 2, 3, '#c08a48'); R(10, 2, 1, 5, '#b07a40'); R(9, 0, 3, 2, '#f59a3a'); R(10, 0, 1, 1, '#fff3a0'); R(5, 7, 1, 4, '#9a6a34'); break;
    case 'greatwall': R(0, 9, 16, 5, '#9a958c'); for (let x = 0; x < 16; x += 3) R(x, 7, 2, 2, '#9a958c'); R(10, 4, 5, 10, '#8a857c'); for (let x = 10; x < 15; x += 2) R(x, 2, 1, 2, '#8a857c'); R(0, 13, 16, 1, '#6a655c'); R(12, 8, 1, 2, '#2a2420'); break;
    case 'suntemple': for (let r = 0; r < 4; r++) R(2 + r * 2, 14 - r * 3, 12 - r * 4, 3, r % 2 ? '#c8a060' : '#b08a48'); R(7, 2, 2, 4, '#b08a48'); R(5, 0, 6, 1, '#f2c14e'); R(6, 1, 4, 1, '#f2c14e'); R(4, 1, 1, 1, '#f8e070'); R(11, 1, 1, 1, '#f8e070'); break;
    case 'startower': R(6, 4, 4, 11, '#c8c0b0'); R(7, 4, 1, 11, '#e0d8c8'); R(5, 2, 6, 3, '#7a8094'); R(6, 1, 4, 1, '#9aa0b4'); R(10, 1, 4, 1, '#3a3a48'); R(4, 14, 8, 2, '#8a8070'); R(7, 9, 2, 2, '#5a3a20'); break;
    case 'irontower': for (let y = 1; y < 15; y++) { const w = Math.round((y / 15) * 6); R(8 - w, y, 1, 1, '#4a4a58'); R(7 + w, y, 1, 1, '#4a4a58'); if (y % 3 === 0) R(8 - w, y, w * 2, 1, '#5a5a6a'); } R(7, 0, 2, 2, '#4a4a58'); R(5, 12, 6, 3, '#2a2a38'); break;
    case 'skylift': R(7, 0, 1, 12, '#c8d0dc'); R(5, 3, 4, 3, '#e8eef4'); R(6, 4, 2, 1, '#7ab0f0'); R(3, 12, 10, 3, '#9aa0b4'); R(5, 10, 6, 2, '#c8ccd8'); R(2, 15, 12, 1, '#5a5a6a'); break;
  }
  const o = mkCanvas(TS, TS), og = o.getContext('2d'); og.drawImage(c, 0, 0); outlineAny(og, TS, TS, 160);
  return (_won[k] = o);
}
function luminance(c) { const n = parseInt(c.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
const _rc = {};
function resCanvas(r) { return _rc[r] || (_rc[r] = artCanvas(RES_ART[r])); }
let _camp, _ruin;
function campCv() { return _camp || (_camp = artCanvas(SPR.camp)); }
function ruinCv() { return _ruin || (_ruin = artCanvas(SPR.ruin)); }

const MINI_COL = { ocean: '#1f4b94', coast: '#2f78c0', grass: '#58a63a', plains: '#a8b04a', desert: '#e2c878', tundra: '#8e9a7c', snow: '#e8eef4', forest: '#2f7a2f', jungle: '#2a6a2a', hills: '#8a9040', mountain: '#7f7a72' };
function drawMini(ctx, W, H, viewW, viewH) {
  const sc = Math.min(W / S.w, H / S.h), h = humanP();
  ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(LAYER.mini, 0, 0, S.w * sc, S.h * sc); // kept current by updateLayer
  for (const c of S.cities) { if (h && !S.seen[c.y * S.w + c.x]) continue; ctx.fillStyle = '#ffffff'; ctx.fillRect(c.x * sc - 1, c.y * sc - 1, sc + 2, sc + 2); }
  const ts = TS * CAM.z;
  ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 1;
  ctx.strokeRect(CAM.x / ts * sc + 0.5, CAM.y / ts * sc + 0.5, viewW / ts * sc, viewH / ts * sc);
  return sc;
}
// small map of a city's surroundings for the city screen
function drawCityMap(cv, c, worked) {
  const ctx = cv.getContext('2d'), z = 2, ts = TS * z; ctx.imageSmoothingEnabled = false;
  cv.width = cv.height = ts * 7;
  ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, cv.width, cv.height);
  const h = humanP();
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const x = c.x + dx, y = c.y + dy; if (!inb(x, y)) continue;
    const i = y * S.w + x, tl = S.map[i], X = (dx + 3) * ts, Y = (dy + 3) * ts;
    if (h && !S.seen[i]) continue;
    ctx.drawImage(tileArt(tl.t, tileVariant(i), 0), X, Y, ts, ts);
    if (tl.imp) drawImp(ctx, tl, X, Y, z);
    if (tl.res && resVisible(tl.res, h)) ctx.drawImage(resCanvas(tl.res), X + 9 * z, Y + 9 * z, 6 * z, 6 * z);
    if (tl.oc !== c.id) { ctx.fillStyle = 'rgba(5,6,12,.55)'; ctx.fillRect(X, Y, ts, ts); }
    if (worked.includes(i)) { ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2; ctx.strokeRect(X + 1, Y + 1, ts - 2, ts - 2); }
  }
  ctx.drawImage(citySprite(c), 3 * ts - 4 * z, 3 * ts - 7 * z, CITY_PX * z, CITY_PX * z);
}
