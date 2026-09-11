// ============================================================
// LEONIS 2D — pix.ts · Fábrica de pixel art procedural
// ------------------------------------------------------------
// REGISTRO DE SPRITES: tudo vive em SPR{}. Quando o usuário
// entregar spritesheets reais (armas/armaduras), basta
// sobrescrever as chaves correspondentes em SPR (loader em
// pix.loadExternal()) — o resto do jogo não muda.
// ============================================================

export const SPR: Record<string, HTMLCanvasElement> = {};

// ---------- paleta ----------
const OUT = '#1a1420';
export const PAL = {
  grass1: '#8fc94a', grass2: '#7db83a', grassD: '#5f9a2e',
  gold1: '#cdb45a', gold2: '#b89a42',
  sand1: '#e8d49a', sand2: '#d8c486',
  selva1: '#3f7a3a', selva2: '#35683a',
  costa1: '#68b090', costa2: '#58a080',
  murk1: '#4a5f3a', murk2: '#3e5232',
  snow1: '#eef4f8', snow2: '#d0dde8',
  ash1: '#454050', ash2: '#373242',
  pale1: '#cfc8d8', pale2: '#b8b0c8',
  water1: '#2a6ac4', water2: '#2460b4', water3: '#3a7ad4',
  path1: '#9a7648', path2: '#8a663c',
  wood1: '#8a5f38', wood2: '#6a4526', woodD: '#4a3018',
  stone1: '#8d8d92', stone2: '#6f6f76', stoneD: '#52525a',
  leaf1: '#3f8f2f', leaf2: '#57ad3a', leafD: '#2e6f24',
  metal1: '#c8ccd4', metal2: '#8a92a0',
  red1: '#c23a2a', red2: '#8a2620',
  orange: '#ff8a2a', gold: '#ffd23a', cyan: '#7ae8ff',
  skin: '#d8a37a', hair: '#e8c83a',
  tunic1: '#5a4a8a', tunic2: '#46386c'
};

export function cv(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
export function ctx2(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  return x;
}
type Painter = (x: number, y: number, w?: number, h?: number) => void;
function P(g: CanvasRenderingContext2D, col: string): Painter {
  return (x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
}

// desenha sprite de string-map: chars mapeiam pra cores
function fromMap(rows: string[], map: Record<string, string>, key: string) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = cv(w, h); const g = ctx2(c);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      const col = map[ch];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  }
  SPR[key] = c;
  return c;
}

// clarear/escurecer cor hex (#rrggbb)
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// contorno 1px ao redor da silhueta — legibilidade em qualquer bioma
export function outline(key: string) {
  const src = SPR[key];
  if (!src) return;
  const w = src.width, h = src.height;
  let data: Uint8ClampedArray;
  try {
    data = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  } catch { return; }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : data[(x + y * w) * 4 + 3];
  const c = cv(w + 2, h + 2); const g = ctx2(c);
  g.fillStyle = OUT;
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (at(x, y) > 8) continue;
      if (at(x - 1, y) > 8 || at(x + 1, y) > 8 || at(x, y - 1) > 8 || at(x, y + 1) > 8) g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  g.drawImage(src, 1, 1);
  SPR[key] = c;
}

// ============================================================
// PERSONAGENS mini — 4 direções, 2 frames de passo, COM CONTORNO
// ============================================================
// chars: H=hair h=hair-hi S=skin E=eye T=tunic t=tunic-shade B=belt L=leg K=boot

const MAP_PLAYER = (hair: string, skin: string, tunic: string, tunicD: string): Record<string, string> => ({
  H: hair, h: shade(hair, 1.28), S: skin, E: OUT, T: tunic,
  t: shade(tunic, 0.82), B: '#3a2a1a', L: tunicD, K: '#2a2a30'
});

// frente — parado
const D0 = [
  '..HHHH..',
  '.HHHHHH.',
  '.HhhhhH.',
  '.HSSSSH.',
  '.SESSES.',
  '..SSSS..',
  '.TTTTTT.',
  '.StTTtS.',
  '.TBBBBT.',
  '..L..L..',
  '..K..K..'
];
// frente — passo (pernas abrem; bounce de 1px é aplicado no draw)
const D1 = [
  '..HHHH..',
  '.HHHHHH.',
  '.HhhhhH.',
  '.HSSSSH.',
  '.SESSES.',
  '..SSSS..',
  '.TTTTTT.',
  '.StTTtS.',
  '.TBBBBT.',
  '.L....L.',
  '.K....K.'
];
// costas
const U0 = [
  '..HHHH..',
  '.HHHHHH.',
  '.HHHHHH.',
  '.HHHHHH.',
  '..HHHH..',
  '.TTTTTT.',
  '.StTTtS.',
  '.TBBBBT.',
  '..L..L..',
  '..K..K..'
];
// perfil direita — parado (flip horizontal = esquerda)
const R0 = [
  '..HHHH..',
  '.HHHHHH.',
  '.HHhhSS.',
  '.HHHSSE.',
  '..HSSS..',
  '.TTTTT..',
  '.tTTTtS.',
  '.TBBBT..',
  '..L..L..',
  '..K..K..'
];
// perfil — passo
const R1 = [
  '..HHHH..',
  '.HHHHHH.',
  '.HHhhSS.',
  '.HHHSSE.',
  '..HSSS..',
  '.TTTTT..',
  '.tTTTtS.',
  '.TBBBT..',
  '..LL....',
  '..KK....'
];

export function buildCharacterSprites(race: RaceLike) {
  const m = MAP_PLAYER(race.hair2d, race.skinHex, race.tunic2d, race.tunicD2d);
  const id = race.id;
  let d0 = D0, d1 = D1, u0 = U0, r0 = R0, r1 = R1;
  if (id === 'nimbo') { // minúsculo: encolhe o tronco
    d0 = d0.filter((_, i) => i !== 3); d1 = d1.filter((_, i) => i !== 3);
    u0 = u0.filter((_, i) => i !== 3);
    r0 = r0.filter((_, i) => i !== 4); r1 = r1.filter((_, i) => i !== 4);
  }
  if (id === 'barrote') { // troncudo: ombros largos
    d0 = [...d0.slice(0, 6), 'STTTTTTS', 'StTTTTtS', ...d0.slice(8)];
    d1 = [...d1.slice(0, 6), 'STTTTTTS', 'StTTTTtS', ...d1.slice(8)];
  }
  fromMap(d0, m, `p/${id}/d0`);
  fromMap(d1, m, `p/${id}/d1`);
  fromMap(u0, m, `p/${id}/u0`);
  fromMap(r0, m, `p/${id}/r0`);
  fromMap(r1, m, `p/${id}/r1`);
  if (id === 'silvario') { // orelhas compridas
    for (const k of ['d0', 'd1', 'u0']) {
      const c = SPR[`p/${id}/${k}`]; const g = ctx2(c);
      P(g, race.hair2d)(0, 1, 1, 3); P(g, shade(race.hair2d, 0.8))(0, 4, 1, 1);
      P(g, race.hair2d)(c.width - 1, 1, 1, 3); P(g, shade(race.hair2d, 0.8))(c.width - 1, 4, 1, 1);
    }
  }
  if (id === 'grevo') { // olhos-bolha de sapo no topo da cabeça
    for (const k of ['d0', 'd1']) {
      const c = SPR[`p/${id}/${k}`]; const g = ctx2(c);
      P(g, OUT)(1, 2, 2, 2); P(g, '#ffdf6a')(1, 2, 2, 1);
      P(g, OUT)(5, 2, 2, 2); P(g, '#ffdf6a')(5, 2, 2, 1);
    }
  }
  if (id === 'marejante') { // chapéu de pescador
    const c = SPR[`p/${id}/d0`]; const g = ctx2(c);
    P(g, '#8a4a2a')(0, 0, 8, 1); P(g, '#a85a32')(2, 1, 4, 1);
    P(g, '#6a3820')(0, 1, 1, 1); P(g, '#6a3820')(7, 1, 1, 1);
  }
  for (const k of ['d0', 'd1', 'u0', 'r0', 'r1']) outline(`p/${id}/${k}`);
}

export interface RaceLike { id: string; hair2d: string; skinHex: string; tunic2d: string; tunicD2d: string; }

// ============================================================
// CORJA (inimigos)
// ============================================================
const M_CORJA_S = { C: '#454f63', D: '#343c4c', S: '#7aa393', E: '#ff4a3a', W: '#e8e0d0', K: '#2a2a30', R: '#5a2828' };
const M_CORJA_L = { C: '#5a3a3a', D: '#442c2c', S: '#6f9a8c', E: '#ff4a3a', W: '#e8e0d0', K: '#2a2a30', R: '#5a2828', M: '#8a8a92' };

const CORJA_S0 = [
  '..CCCC..',
  '.CCCCCC.',
  '.CESSEC.',
  '.CSSSSC.',
  '.CCCCCC.',
  'CCDCCDCC',
  '.CCCCCC.',
  '.KK..KK.'
];
const CORJA_S1 = [
  '..CCCC..',
  '.CCCCCC.',
  '.CESSEC.',
  '.CSSSSC.',
  '.CCCCCC.',
  'CCDCCDCC',
  '.CCCCCC.',
  '..KKKK..'
];
const CORJA_L0 = [
  'M..CCCC..M',
  '.CCCCCCCC.',
  'MCCECCECCM',
  '.CCSSSSCC.',
  '.CCCCCCCC.',
  'CCCDCCDCCC',
  '.CCCCCCCC.',
  '.KK....KK.'
];
const CORJA_L1 = [
  'M..CCCC..M',
  '.CCCCCCCC.',
  'MCCECCECCM',
  '.CCSSSSCC.',
  '.CCCCCCCC.',
  'CCCDCCDCCC',
  '.CCCCCCCC.',
  '..KKKKKK..'
];

// ============================================================
// RONCEIRO (montaria, 16×11)
// ============================================================
const M_RONC = { C: '#8a6248', D: '#6a4a34', M: '#4a3624', E: '#1a1a20', W: '#f0f0f0', H: '#9a9aa2', S: '#6a4a2a' };
const RONC0 = [
  '.DD.............',
  '.CC.DD.....DD...',
  '.CCCCCCC.DDCC...',
  '.CCCCCCCNCCCE...',
  '.SCCCCCCCCCCC...',
  '.SSCCCCCCCC.....',
  '..CC.CC..CC.....',
  '..CC.CC..CC.....',
  '..HH.HH..HH.....'
];
const RONC1 = [
  '.DD.............',
  '.CC.DD.....DD...',
  '.CCCCCCC.DDCC...',
  '.CCCCCCCNCCCE...',
  '.SCCCCCCCCCCC...',
  '.SSCCCCCCCC.....',
  '..CC..CC.CC.....',
  '..CC..CC.CC.....',
  '..HH..HH.HH.....'
];

// ============================================================
// ÁRVORES / PROPS (por bioma)
// ============================================================
function treeBaobao(key: string) {
  const c = cv(22, 26); const g = ctx2(c);
  const t1 = P(g, PAL.wood1), t2 = P(g, PAL.wood2), l1 = P(g, PAL.leaf1), l2 = P(g, PAL.leaf2), l3 = P(g, PAL.leafD);
  t1(8, 16, 6, 9); t2(8, 16, 2, 9); P(g, OUT)(8, 24, 6, 1);
  l3(4, 8, 14, 8); l1(3, 4, 16, 7); l2(5, 2, 12, 5); l1(7, 0, 8, 3);
  l2(6, 6, 3, 2); l2(14, 5, 3, 2); P(g, OUT)(3, 15, 16, 1); P(g, OUT)(3, 0, 8, 1);
  SPR[key] = c;
}
function treePetro(key: string) {
  const c = cv(16, 26); const g = ctx2(c);
  const s1 = P(g, PAL.stone1), s2 = P(g, PAL.stone2), cy = P(g, PAL.cyan);
  s2(5, 8, 6, 17); s1(6, 8, 3, 16); P(g, OUT)(5, 24, 6, 1);
  s1(3, 4, 10, 6); s2(4, 2, 8, 4); P(g, OUT)(4, 1, 8, 1);
  cy(6, 11, 1, 2); cy(8, 14, 1, 3); cy(6, 18, 1, 2); cy(9, 9, 1, 1);
  SPR[key] = c;
}
function treePalm(key: string) {
  const c = cv(20, 24); const g = ctx2(c);
  const t = P(g, PAL.wood2), l = P(g, PAL.leaf1), l2 = P(g, PAL.leaf2);
  t(9, 10, 3, 13); P(g, OUT)(9, 22, 3, 1);
  l(4, 8, 6, 2); l(11, 8, 6, 2); l2(6, 5, 8, 3); l(2, 10, 4, 2); l(15, 10, 4, 2);
  P(g, '#b88a3a')(9, 8, 2, 2);
  SPR[key] = c;
}
function treePine(key: string) {
  const c = cv(16, 26); const g = ctx2(c);
  const d = P(g, '#2e5a44'), w = P(g, PAL.snow1), t = P(g, PAL.wood2);
  t(7, 20, 3, 5);
  d(6, 16, 5, 4); w(6, 16, 5, 1);
  d(4, 10, 9, 6); w(4, 10, 9, 1);
  d(6, 4, 5, 6); w(6, 4, 5, 1);
  P(g, OUT)(7, 24, 3, 1);
  SPR[key] = c;
}
function treeCactus(key: string) {
  const c = cv(10, 16); const g = ctx2(c);
  const g1 = P(g, '#5a9a3a'), g2 = P(g, '#4a8a2e');
  g2(4, 2, 3, 13); g1(5, 2, 1, 12);
  g2(1, 6, 3, 2); g1(1, 4, 2, 4); g2(7, 8, 3, 2); g1(8, 6, 2, 4);
  P(g, OUT)(4, 14, 3, 1);
  SPR[key] = c;
}
function treeDead(key: string) {
  const c = cv(16, 20); const g = ctx2(c);
  const t = P(g, '#4a4038'), t2 = P(g, '#5a5048');
  t(7, 8, 2, 11); t2(7, 8, 1, 11);
  t(3, 5, 2, 4); t2(12, 6, 2, 3); t(5, 3, 2, 3); P(g, OUT)(7, 18, 2, 1);
  SPR[key] = c;
}
function rockObsidian(key: string) {
  const c = cv(14, 16); const g = ctx2(c);
  const b = P(g, '#241f30'), e = P(g, '#4a3a5a'), p = P(g, '#b06ae8');
  b(3, 6, 8, 9); e(4, 4, 6, 3); b(5, 1, 4, 4);
  p(6, 8, 1, 3); p(9, 11, 1, 2);
  P(g, OUT)(3, 14, 8, 1);
  SPR[key] = c;
}
function mushGiant(key: string) {
  const c = cv(18, 18); const g = ctx2(c);
  const s = P(g, '#e8e0d0'), cap = P(g, '#c23a2a'), dot = P(g, '#f0f0e8');
  s(7, 9, 4, 8); cap(2, 3, 14, 6); cap(4, 1, 10, 3);
  dot(5, 4, 2, 2); dot(10, 2, 2, 2); dot(13, 5, 2, 2);
  P(g, OUT)(7, 16, 4, 1);
  SPR[key] = c;
}

// ---------- rocha de minério (16×12) ----------
export function buildOreSprite(key: string, oreCol: string, oreHi: string) {
  const c = cv(16, 12); const g = ctx2(c);
  const s1 = P(g, PAL.stone1), s2 = P(g, PAL.stone2), o = P(g, oreCol), h = P(g, oreHi);
  s2(1, 4, 14, 7); s1(2, 3, 11, 6); s2(3, 2, 8, 2);
  o(4, 5, 2, 2); h(4, 5, 1, 1);
  o(9, 7, 2, 2); h(9, 7, 1, 1);
  o(6, 9, 2, 1);
  P(g, OUT)(1, 10, 14, 1);
  SPR[key] = c;
}

// ---------- erva (8×9) ----------
export function buildHerbSprite(key: string, col: string, hi: string) {
  const c = cv(8, 9); const g = ctx2(c);
  P(g, col)(3, 4, 2, 4); P(g, hi)(3, 4, 1, 3);
  P(g, col)(1, 2, 2, 2); P(g, col)(5, 2, 2, 2);
  P(g, hi)(1, 2, 1, 1); P(g, hi)(6, 2, 1, 1);
  P(g, col)(3, 0, 2, 2); P(g, hi)(3, 0, 1, 1);
  SPR[key] = c;
}

// ---------- prédios da vila ----------
function houseSprite(key: string) {
  const c = cv(44, 38); const g = ctx2(c);
  const w = P(g, '#c9a86a'), w2 = P(g, '#b8945a'), r = P(g, '#a84a2e'), r2 = P(g, '#8a3a24'), d = P(g, PAL.woodD);
  w(4, 18, 36, 16); w2(4, 18, 4, 16);
  r(2, 10, 40, 8); r2(4, 6, 36, 5); r(8, 3, 28, 4); r2(12, 0, 20, 3);
  d(18, 24, 8, 10); P(g, PAL.gold)(24, 29, 1, 1);
  P(g, '#7ac4e8')(8, 22, 6, 6); P(g, OUT)(8, 22, 6, 1); P(g, OUT)(10, 22, 1, 6);
  P(g, OUT)(30, 22, 6, 1); P(g, '#7ac4e8')(30, 22, 6, 6); P(g, OUT)(32, 22, 1, 6);
  P(g, OUT)(4, 33, 36, 1);
  SPR[key] = c;
}
function forgeSprite(key: string) {
  const c = cv(40, 34); const g = ctx2(c);
  const s = P(g, PAL.stone2), s2 = P(g, PAL.stone1), r = P(g, '#5a4438'), a = P(g, PAL.metal2), f = P(g, PAL.orange);
  s(2, 12, 36, 18); s2(4, 12, 10, 16);
  r(2, 6, 36, 6); P(g, OUT)(2, 5, 36, 1);
  a(24, 20, 8, 4); P(g, PAL.metal1)(24, 20, 8, 1);
  f(8, 22, 6, 5); P(g, PAL.gold)(9, 23, 4, 2);
  P(g, OUT)(2, 29, 36, 1);
  SPR[key] = c;
}
function stableSprite(key: string) {
  const c = cv(46, 30); const g = ctx2(c);
  const f = P(g, PAL.wood1), f2 = P(g, PAL.wood2), r = P(g, '#8a5a2e');
  for (let i = 0; i < 6; i++) { f(2 + i * 8, 14, 4, 12); f2(2 + i * 8, 14, 1, 12); }
  r(0, 6, 46, 8); P(g, OUT)(0, 5, 46, 1);
  P(g, '#8a6248')(18, 18, 10, 6); P(g, PAL.woodD)(18, 18, 10, 1);
  P(g, OUT)(2, 25, 42, 1);
  SPR[key] = c;
}
function towerSprite(key: string) {
  const c = cv(20, 42); const g = ctx2(c);
  const s = P(g, PAL.wood2), s2 = P(g, PAL.wood1), r = P(g, PAL.red1);
  s(3, 8, 14, 32); s2(3, 8, 5, 32);
  P(g, OUT)(6, 14, 3, 5);
  r(1, 2, 18, 7); P(g, OUT)(1, 1, 18, 1);
  P(g, OUT)(3, 39, 14, 1);
  SPR[key] = c;
}
function tentSprite(key: string) {
  const c = cv(22, 16); const g = ctx2(c);
  const t = P(g, '#3a2e22'), r = P(g, PAL.red1);
  t(1, 5, 20, 10); t(4, 2, 14, 4); t(8, 0, 6, 3);
  r(8, 8, 6, 7);
  P(g, OUT)(1, 14, 20, 1);
  SPR[key] = c;
}
function palisadeSprite(key: string) {
  const c = cv(16, 18); const g = ctx2(c);
  for (let i = 0; i < 3; i++) {
    P(g, PAL.wood1)(i * 5 + 1, 2, 4, 15);
    P(g, PAL.wood2)(i * 5 + 1, 2, 1, 15);
    P(g, PAL.woodD)(i * 5 + 1, 1, 4, 2);
  }
  P(g, OUT)(1, 16, 14, 1);
  SPR[key] = c;
}
function fireSprite(key: string, f: number) {
  const c = cv(10, 10); const g = ctx2(c);
  P(g, PAL.wood2)(1, 7, 8, 2); P(g, PAL.wood1)(2, 7, 4, 1);
  P(g, PAL.orange)(f ? 3 : 2, 3, 5, 4);
  P(g, PAL.gold)(f ? 4 : 3, 4, 3, 2);
  P(g, '#fff0a0')(f ? 4 : 4, 5, 2, 1);
  SPR[key] = c;
}
function chestSprite(key: string, open: boolean) {
  const c = cv(14, 11); const g = ctx2(c);
  P(g, PAL.wood1)(1, open ? 4 : 3, 12, open ? 6 : 7);
  P(g, PAL.wood2)(1, open ? 4 : 3, 12, 2);
  P(g, PAL.gold)(6, open ? 5 : 5, 2, 2);
  if (open) P(g, '#000')(2, 5, 10, 2);
  P(g, OUT)(1, open ? 9 : 9, 12, 1);
  SPR[key] = c;
}
function boatSprite(key: string) {
  const c = cv(26, 18); const g = ctx2(c);
  P(g, PAL.wood1)(2, 8, 22, 6); P(g, PAL.wood2)(2, 8, 22, 2);
  P(g, PAL.wood2)(4, 14, 18, 2);
  P(g, PAL.woodD)(11, 1, 2, 9);
  P(g, '#e8e0cc')(13, 2, 8, 7); P(g, '#c8bca0')(13, 2, 2, 7);
  P(g, OUT)(2, 15, 22, 1);
  SPR[key] = c;
}
function bannerSprite(key: string) {
  const c = cv(8, 20); const g = ctx2(c);
  P(g, PAL.woodD)(3, 0, 2, 20);
  P(g, '#3a5a8a')(0, 2, 6, 8); P(g, '#4a6aa0')(0, 2, 2, 8);
  P(g, PAL.gold)(1, 4, 3, 1);
  SPR[key] = c;
}
function wreckSprite(key: string) {
  const c = cv(26, 16); const g = ctx2(c);
  P(g, PAL.wood2)(2, 6, 20, 6); P(g, PAL.wood1)(2, 6, 20, 2);
  P(g, '#b8935a')(6, 2, 8, 5); P(g, '#d8b45a')(6, 2, 8, 1);
  P(g, PAL.woodD)(18, 10, 6, 3);
  P(g, OUT)(2, 11, 20, 1);
  SPR[key] = c;
}
function cargaSprite(key: string) {
  const c = cv(12, 10); const g = ctx2(c);
  P(g, '#b8935a')(1, 2, 10, 7); P(g, '#d8b45a')(1, 2, 10, 2);
  P(g, PAL.woodD)(5, 2, 2, 7);
  P(g, OUT)(1, 8, 10, 1);
  SPR[key] = c;
}

// ---------- itens/ícones (12×12) ----------
function coinSprite(key: string) {
  const c = cv(8, 8); const g = ctx2(c);
  P(g, '#c8921a')(1, 1, 6, 6); P(g, PAL.gold)(2, 2, 4, 4); P(g, '#fff0a0')(2, 2, 2, 2);
  P(g, OUT)(1, 6, 6, 1);
  SPR[key] = c;
}
function meatSprite(key: string) {
  const c = cv(10, 8); const g = ctx2(c);
  P(g, '#8a3a2a')(2, 1, 6, 5); P(g, '#c25a3a')(3, 2, 4, 3); P(g, '#e8e0d0')(1, 4, 3, 3);
  SPR[key] = c;
}

// ============================================================
// PANORAMA DO TÍTULO + CENAS DA INTRO
// ============================================================
export function buildTitlePanorama(): HTMLCanvasElement {
  const W = 240, H = 100;
  const c = cv(W, H); const g = ctx2(c);
  // céu
  const bands = ['#8ecdf5', '#9ed6f8', '#aedff9', '#c2e8fa'];
  for (let i = 0; i < 4; i++) P(g, bands[i])(0, i * 14, W, 14);
  P(g, bands[3])(0, 56, W, H - 56);
  // sol
  P(g, '#fff0a0')(196, 10, 12, 12); P(g, '#ffe27a')(198, 12, 8, 8);
  // nuvens
  const cl = P(g, '#ffffff');
  cl(30, 14, 16, 4); cl(34, 11, 8, 3); cl(120, 24, 20, 4); cl(126, 21, 10, 3); cl(80, 8, 12, 3);
  // montanhas distantes
  const m1 = P(g, '#7aa8c8');
  for (let i = 0; i < W; i++) {
    const h = 18 + Math.round(10 * Math.sin(i * 0.05) + 6 * Math.sin(i * 0.13 + 2));
    m1(i, 58 - h, 1, h);
  }
  // planalto savana
  P(g, '#a8c84a')(0, 62, W, H - 62);
  P(g, '#98bc3e')(0, 62, W, 3);
  // árvores silhueta
  for (const [tx, ty, s] of [[20, 62, 2], [60, 62, 3], [150, 62, 2], [205, 62, 3], [110, 62, 2]] as [number, number, number][]) {
    P(g, '#6a4526')(tx, ty - 10 * s, 2 * s, 10 * s);
    P(g, '#3f8f2f')(tx - 4 * s, ty - 16 * s, 10 * s, 7 * s);
    P(g, '#57ad3a')(tx - 2 * s, ty - 18 * s, 6 * s, 3 * s);
  }
  // viajantes minúsculos (2px!)
  for (const [px, py] of [[92, 84], [96, 86], [132, 90]]) {
    P(g, '#1a1420')(px, py - 5, 2, 5);
    P(g, '#e8c83a')(px, py - 6, 2, 2);
  }
  // casinhas da vila distante
  for (const [hx, hy] of [[46, 80], [150, 84], [190, 76]]) {
    P(g, '#8a5f38')(hx, hy, 10, 6); P(g, '#c23a2a')(hx - 1, hy - 3, 12, 3); P(g, '#1a1420')(hx + 4, hy + 2, 2, 4);
  }
  // passaros no ceu
  for (const [bx, by] of [[60, 20], [140, 12], [170, 30], [100, 34]]) {
    P(g, '#3a4a5a')(bx, by, 3, 1); P(g, '#3a4a5a')(bx + 4, by + 1, 2, 1);
  }
  // rebanho distante
  for (const [sx, sy] of [[126, 88], [132, 90], [137, 87], [120, 91]]) P(g, '#f0ead8')(sx, sy, 3, 2);
  // trilha de terra serpenteante (dithered)
  const tr = P(g, '#9a7648');
  for (let i = 0; i <= 34; i++) {
    const tx = 96 + Math.round(10 * Math.sin(i * 0.28));
    tr(tx, 66 + i, 2, 1);
    if (i % 3 === 0) tr(tx + 2, 66 + i, 1, 1);
  }
  return c;
}

// ============================================================
// BOOT
// ============================================================
export function buildAllSprites(races: RaceLike[]) {
  for (const r of races) buildCharacterSprites(r);
  // corja
  fromMap(CORJA_S0, M_CORJA_S, 'e/s0');
  fromMap(CORJA_S1, M_CORJA_S, 'e/s1');
  fromMap(CORJA_L0, M_CORJA_L, 'e/l0');
  fromMap(CORJA_L1, M_CORJA_L, 'e/l1');
  for (const k of ['e/s0', 'e/s1', 'e/l0', 'e/l1']) outline(k);
  // ronceiro
  fromMap(RONC0, M_RONC, 'm/0');
  fromMap(RONC1, M_RONC, 'm/1');
  outline('m/0'); outline('m/1');
  selaRonceiro();
  outline('m/s0'); outline('m/s1');
  // árvores
  treeBaobao('t/baobao'); treePetro('t/petro'); treePalm('t/palm');
  treePine('t/pine'); treeCactus('t/cactus'); treeDead('t/dead');
  rockObsidian('t/obs'); mushGiant('t/mush');
  // prédios
  houseSprite('b/house'); forgeSprite('b/forge'); stableSprite('b/stable');
  towerSprite('b/tower'); tentSprite('b/tent'); palisadeSprite('b/palisade');
  fireSprite('b/fire0', 0); fireSprite('b/fire1', 1);
  chestSprite('b/chest', false); chestSprite('b/chestO', true);
  boatSprite('b/boat'); bannerSprite('b/banner'); wreckSprite('b/wreck'); cargaSprite('b/carga');
  // itens
  coinSprite('i/coin'); meatSprite('i/meat');
  // aldeoes + fauna + inimigos especiais + covis
  buildVillagerSprites();
  buildAnimalSprites();
  buildEnemyKindSprites();
  buildDenSprites();
  buildDungeonSprites();
  // fallbacks do atlas externo: garante que nada fique invisível se a folha não carregar
  const FBT: Record<string, string> = {
    't/green': 't/baobao', 't/apple': 't/baobao', 't/deadbig': 't/dead', 't/mushP': 't/mush',
    't/tent': 't/petro', 't/root': 't/petro', 't/skulltotem': 't/dead',
    'r/ruin1': 't/dead', 'r/ruin2': 't/dead',
    'b/porta2': 'b/porta', 'd/hole2': 'd/hole', 'b/chest2': 'b/chest',
    'e/goblin0': 'e/s0', 'e/goblin1': 'e/s1', 'e/golem0': 'e/T0', 'e/golem1': 'e/T1',
    'e/fogo0': 'e/g0', 'e/fogo1': 'e/g1', 'e/espinho0': 'e/f0', 'e/espinho1': 'e/f1'
  };
  for (const [nk, ok] of Object.entries(FBT)) if (!SPR[nk] && SPR[ok]) SPR[nk] = SPR[ok];
}

function selaRonceiro() {
  // versão com sela (domado): copia e adiciona sela marrom
  for (const k of ['0', '1']) {
    const src = SPR[`m/${k}`];
    const c = cv(src.width, src.height + 1); const g = ctx2(c);
    g.drawImage(src, 0, 0);
    P(g, '#6a4a2a')(6, 4, 5, 2); P(g, '#8a6248')(6, 4, 5, 1);
    SPR[`m/s${k}`] = c;
  }
}

export function flipH(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = cv(src.width, src.height); const g = ctx2(c);
  g.translate(src.width, 0); g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

// carrega spritesheet externo e recorta em chaves do registro
// (pipeline pra quando o usuário mandar as armas/armaduras)
export function loadExternal(key: string, img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number) {
  const c = cv(sw, sh); const g = ctx2(c);
  g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  SPR[key] = c;
}

// armas: sprite lateral pequena por arma (rotacionada no swing em jogo)
// aldeao (NPC): tronco marrom-neutro, mesmo chassi do heroi
export function buildVillagerSprites() {
  const m: Record<string, string> = { H: '#4a3826', h: '#5c4832', S: '#d8a37a', E: OUT, T: '#6a5a4a', t: '#57483c', B: '#3a2a1a', L: '#54463a', K: '#2a2a30' };
  fromMap(D0, m, 'v/d0'); fromMap(D1, m, 'v/d1'); fromMap(U0, m, 'v/u0');
  fromMap(R0, m, 'v/r0'); fromMap(R1, m, 'v/r1');
  for (const k of ['v/d0', 'v/d1', 'v/u0', 'v/r0', 'v/r1']) outline(k);
}

// fauna: rebanho, veado, passaro (2 frames)
export function buildAnimalSprites() {
  for (const f of [0, 1]) {
    const rows = f === 0 ? ['.WWWWW.', 'WWWWWWK', '.W.W.W.'] : ['.WWWWW.', 'WWWWWWK', 'W.W..W.'];
    fromMap(rows, { W: '#e8e2d0', K: OUT }, `a/flock${f}`);
    outline(`a/flock${f}`);
  }
  for (const f of [0, 1]) {
    const rows = f === 0 ? ['..A..A..', '..AAAA..', '...AA...', '..AAAA..', '..AA.A..', '..A..A..']
      : ['..A..A..', '..AAAA..', '...AA...', '..AAAA..', '..AA..A.', '.A....A.'];
    fromMap(rows, { A: '#8a6248' }, `a/deer${f}`);
    outline(`a/deer${f}`);
  }
  for (const f of [0, 1]) {
    const rows = f === 0 ? ['..KK..', '.KKKK.'] : ['.KKKK.', 'K.KK..'];
    fromMap(rows, { K: '#2a2a30' }, `a/bird${f}`);
  }
}

// variantes de montaria: recolor do Ronceiro por espécie
export function buildMountVariants(defs: { id: string; cor: string }[]) {
  for (const d of defs) {
    if (d.id === 'ronceiro') continue;
    const m = { ...M_RONC, C: d.cor, D: shade(d.cor, 0.76), M: shade(d.cor, 0.6) };
    fromMap(RONC0, m, `mt/${d.id}/0`);
    fromMap(RONC1, m, `mt/${d.id}/1`);
    outline(`mt/${d.id}/0`); outline(`mt/${d.id}/1`);
    for (const k of ['0', '1']) {
      const src = SPR[`mt/${d.id}/${k}`];
      const c = cv(src.width, src.height + 1); const g = ctx2(c);
      g.drawImage(src, 0, 0);
      P(g, '#6a4a2a')(6, 4, 5, 2); P(g, '#8a6248')(6, 4, 5, 1);
      SPR[`mts/${d.id}/${k}`] = c;
      outline(`mts/${d.id}/${k}`);
    }
  }
}

// inimigos com peculiaridade (recolors/novos)
const M_BAT = { C: '#4a6a4a', D: '#3a523a', S: '#8fae7a', E: '#ffd23a', W: '#e8e0d0', K: '#2a2a30', R: '#2a4a2a' };
const A0 = ['..CCCC..', '.CCCCCC.', '.CESSEC.', '.CSSSSC.', '..SSSS..', '.TTTTTTW', '.TTBTTTW', '.TTTTTTW', '..L..L.W', '..K..K..'];
const A1 = ['..CCCC..', '.CCCCCC.', '.CESSEC.', '.CSSSSC.', '..SSSS..', '.TTTTTTW', '.TTBTTTW', '.TTTTTTW', '..LL...W', '..KK....'];
const M_ARQ = { C: '#3a5a6a', S: '#d8a37a', E: '#ff4a3a', T: '#2e4450', t: '#263842', B: '#3a2a1a', L: '#263842', K: '#2a2a30', W: '#8a6248' };
const T0 = [
  '..CCCCCCCC..',
  '.CCCCCCCCCC.',
  '.CSEESSEESC.',
  '.CSSSSSSSSC.',
  '..SSSSSSSS..',
  '.TTTTTTTTTT.',
  'TTTBTTTTBTTT',
  'TTTTTTTTTTTT',
  '.TTtTTTTtTT.',
  '..LLL..LLL..',
  '..KKK..KKK..'
];
const T1 = [
  '..CCCCCCCC..',
  '.CCCCCCCCCC.',
  '.CSEESSEESC.',
  '.CSSSSSSSSC.',
  '..SSSSSSSS..',
  '.TTTTTTTTTT.',
  'TTTBTTTTBTTT',
  'TTTTTTTTTTTT',
  '.TTtTTTTtTT.',
  '.LLL....LLL.',
  '.KKK....KKK.'
];
const M_BRU = { C: '#6a4a3a', S: '#c98d5e', E: '#ff4a3a', T: '#7a3a2a', t: '#5e2c20', B: '#3a2a1a', L: '#4a3624', K: '#2a2a30' };
const G0 = [
  '..HH..HH..',
  '.HHHHHHH..',
  '.FFFFFFFF.',
  'HCFFFFFFE.',
  '.FFFFFFFF.',
  '.CC....CC.',
  '.KK....KK.'
];
const G1 = [
  '..HH..HH..',
  '.HHHHHHH..',
  '.FFFFFFFF.',
  'HCFFFFFFE.',
  '.FFFFFFFF.',
  '.CCC...CC.',
  '.KK....KKK'
];
const M_GUN = { H: '#d8c8a8', F: '#e8dcc8', C: '#8a6248', E: '#1a1a20', K: '#6a4a34' };
const M0 = ['..CCCC...', '.CCCCCC..', '.CEEEEC..', '.CCCCCC..', '.RRRRRR.W', 'RRRRRRRRW', 'RRsRRsRW.', '.RRRRRR..', '.RRRRRR..', '..KKKK...'];
const M1 = ['..CCCC...', '.CCCCCC..', '.CEEEEC..', '.CCCCCC..', '.RRRRRR.W', 'RRRRRRRRW', 'RRsRRsRW.', '.RRRRRR..', '.RRRRRR..', '.KK..KK..'];
const M_MIR = { C: '#4a3a5a', E: '#ffd23a', R: '#5a4a72', s: '#c8b8e8', W: '#8a6248', K: '#2a2a30' };
const H0 = [
  'K........',
  'KK..CCC..',
  'KCCECCCC.',
  'CWWCCCCC.',
  '.CCCCCCC.',
  '.CC...CC.',
  '.CK...CK.'
];
const H1 = [
  'K........',
  'KK..CCC..',
  'KCCECCCC.',
  'CWWCCCCC.',
  '.CCCCCCC.',
  '.CCC..CC.',
  '.CK...KKK'
];
const M_UIV = { C: '#5a5a64', W: '#e8e0d0', E: '#ffd23a', K: '#2a2a30' };

export function buildEnemyKindSprites() {
  fromMap(CORJA_S0, M_BAT, 'e/f0'); fromMap(CORJA_S1, M_BAT, 'e/f1');
  outline('e/f0'); outline('e/f1');
  fromMap(A0, M_ARQ, 'e/a0'); fromMap(A1, M_ARQ, 'e/a1');
  outline('e/a0'); outline('e/a1');
  fromMap(T0, M_BRU, 'e/T0'); fromMap(T1, M_BRU, 'e/T1');
  outline('e/T0'); outline('e/T1');
  fromMap(G0, M_GUN, 'e/g0'); fromMap(G1, M_GUN, 'e/g1');
  outline('e/g0'); outline('e/g1');
  fromMap(M0, M_MIR, 'e/m0'); fromMap(M1, M_MIR, 'e/m1');
  outline('e/m0'); outline('e/m1');
  fromMap(H0, M_UIV, 'e/h0'); fromMap(H1, M_UIV, 'e/h1');
  outline('e/h0'); outline('e/h1');
}

// props de covil: totem-caveira, ossos, A PORTA
export function buildDenSprites() {
  const skull = () => {
    const c = cv(16, 18); const g = ctx2(c);
    const W = P(g, '#e8e0d0'), D = P(g, '#b8b0a0'), O = P(g, OUT), H = P(g, '#4a3624');
    // chifres
    H(1, 0, 2, 2); H(13, 0, 2, 2); H(0, 2, 2, 3); H(14, 2, 2, 3);
    // cranio
    W(3, 3, 10, 8); W(4, 11, 8, 2);
    D(3, 9, 10, 2);
    O(5, 6, 3, 2); O(9, 6, 3, 2); // olhos
    O(6, 12, 1, 1); O(8, 12, 1, 1); O(10, 12, 1, 1); // dentes
    // pica
    O(4, 14, 8, 3); P(g, '#2a2a30')(5, 15, 6, 2);
    SPR['b/skull'] = c;
    outline('b/skull');
  };
  skull();
  // ossos espalhados
  const bones = () => {
    const c = cv(12, 5); const g = ctx2(c);
    const W = P(g, '#d8d0c0');
    W(1, 2, 7, 1); W(0, 1, 2, 1); W(0, 3, 2, 1); W(8, 1, 2, 1); W(8, 3, 2, 1);
    W(10, 0, 1, 2); W(11, 3, 1, 2);
    SPR['b/bones'] = c;
  };
  bones();
  // A PORTA do Umbigo
  const porta = () => {
    const c = cv(34, 46); const g = ctx2(c);
    const FR = P(g, '#2e2838'), FR2 = P(g, '#3e3650'), IN = P(g, '#0c0a14');
    const GL = P(g, '#b06ae8'), GL2 = P(g, '#8a4ac0');
    // marco
    FR(2, 8, 30, 38); FR2(4, 6, 26, 4); FR2(2, 4, 30, 4);
    // vão
    IN(6, 12, 22, 34);
    // arco decorativo
    GL(2, 4, 4, 2); GL(28, 4, 4, 2); GL(15, 0, 4, 4);
    GL2(6, 8, 2, 2); GL2(26, 8, 2, 2);
    // runas no vão
    GL(10, 18, 2, 2); GL(16, 24, 2, 2); GL(22, 18, 2, 2);
    GL2(13, 32, 2, 2); GL2(19, 38, 2, 2);
    // degraus
    P(g, '#52525a')(0, 42, 34, 4); P(g, '#454550')(2, 40, 30, 2);
    SPR['b/porta'] = c;
    outline('b/porta');
  };
  porta();
}

// sprites de porão: buraco, cristal, tocha, pilar
export function buildDungeonSprites() {
  { // buraco de entrada
    const c = cv(24, 14); const g = ctx2(c);
    const O = P(g, OUT), R = P(g, '#3a3630'), D = P(g, '#0c0a10'), L = P(g, '#55504a');
    O(1, 4, 22, 10); R(2, 4, 20, 8); L(2, 4, 20, 2);
    D(4, 7, 16, 6); D(6, 6, 12, 2);
    R(3, 2, 4, 2); R(17, 2, 4, 2);
    SPR['d/hole'] = c;
  }
  for (let f = 0; f < 2; f++) { // cristal de saída (pulsa)
    const c = cv(12, 22); const g = ctx2(c);
    const O = P(g, OUT), C = P(g, '#7ae0d0'), C2 = P(g, '#3aa890'), W = P(g, '#e8f8f0');
    O(4, 0, 4, 2); O(3, 2, 6, 3); O(2, 5, 8, 8); O(3, 13, 6, 3); O(4, 16, 4, 2);
    C(4, 2, 4, 2); C(3, 5, 6, 7); C2(4, 14, 4, 2); C2(3, 12, 6, 2);
    W(4, 4 + f, 2, 3); W(6, 8, 1, 2);
    O(1, 18, 10, 4); P(g, '#52525a')(2, 19, 8, 2);
    SPR[`d/crystal${f}`] = c;
  }
  { // tocha
    const c = cv(8, 18); const g = ctx2(c);
    const O = P(g, OUT), W2 = P(g, '#6a4a2a'), F = P(g, '#ffb43a'), F2 = P(g, '#ff7828');
    O(3, 8, 2, 10); W2(3, 8, 2, 10);
    F(2, 2, 4, 5); F2(3, 4, 2, 3);
    O(2, 1, 4, 1);
    SPR['d/torch'] = c;
  }
  { // pilar
    const c = cv(12, 26); const g = ctx2(c);
    const O = P(g, OUT), S1 = P(g, '#4a545c'), S2 = P(g, '#39434a'), L = P(g, '#5c666e');
    O(0, 0, 12, 5); S1(1, 1, 10, 3); L(1, 1, 10, 1);
    O(2, 5, 8, 17); S1(3, 5, 6, 17); S2(3, 8, 2, 14);
    O(0, 22, 12, 4); S1(1, 23, 10, 2);
    SPR['d/pilar'] = c;
    outline('d/pilar');
  }
}

// tint de chefe: cópia do sprite do kind com cor por cima
export function buildBossTint(kind: string, cor: string, zone: string) {
  const src = SPR[`e/${kind}0`];
  if (!src) return;
  const c = cv(src.width, src.height); const g = ctx2(c);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.42;
  g.fillStyle = cor;
  g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  SPR[`boss/${zone}`] = c;
}

// atlas de armas do usuário (famílias × 10 tiers)
// atlas externo do usuário (folhas integradas): registra sprites 1:1, sem blur
export function buildExternalSheet(img: HTMLImageElement) {
  const man = (window as any).EXTERNA_MANIFEST as Record<string, [number, number, number, number]>;
  if (!man) return;
  for (const [key, [x, y, w, h]] of Object.entries(man)) {
    const c = cv(w, h);
    const g = ctx2(c);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, x, y, w, h, 0, 0, w, h);
    SPR[key] = c;
  }
}

export function loadWeaponAtlas(img: HTMLImageElement, famByWeapon: Record<string, string>, manifest: Record<string, [number, number]>, cell: number) {
  for (const [wid, fam] of Object.entries(famByWeapon)) {
    for (let t = 0; t < 10; t++) {
      const pos = manifest[`${fam}_${t}`];
      if (!pos) continue;
      const c = cv(cell, cell); const g = ctx2(c);
      g.drawImage(img, pos[0], pos[1], cell, cell, 0, 0, cell, cell);
      SPR[`w/${wid}/${t}`] = c;
    }
  }
}

export function buildWeaponSprites() {
  const mk = (key: string, w: number, h: number, fn: (g: CanvasRenderingContext2D) => void) => {
    const c = cv(w, h); const g = ctx2(c); fn(g); SPR[key] = c;
  };
  const M = PAL.metal1, M2 = PAL.metal2, W1 = PAL.wood1, W2 = PAL.wood2, O = OUT, GD = PAL.gold;

  mk('w/espada', 11, 4, g => {
    P(g, M)(3, 1, 7, 1); P(g, M2)(3, 2, 6, 1);
    P(g, O)(2, 0, 1, 4); P(g, GD)(0, 1, 2, 2);
  });
  mk('w/machado', 11, 5, g => {
    P(g, W2)(0, 3, 8, 1);
    P(g, M)(6, 0, 4, 4); P(g, M2)(8, 1, 2, 2); P(g, O)(9, 0, 1, 4);
  });
  mk('w/lanca', 13, 3, g => {
    P(g, W2)(0, 1, 10, 1); P(g, W1)(0, 1, 10, 1);
    P(g, M)(10, 0, 2, 3); P(g, M2)(11, 1, 1, 1);
  });
  mk('w/besta', 10, 6, g => {
    P(g, W1)(2, 3, 7, 2); P(g, W2)(2, 4, 7, 1);
    P(g, M)(0, 0, 10, 1); P(g, O)(0, 1, 1, 4); P(g, O)(9, 1, 1, 4);
    P(g, M2)(4, 1, 5, 1);
  });
  mk('w/arco', 6, 11, g => {
    P(g, W1)(3, 0, 1, 11); P(g, W2)(2, 1, 1, 2); P(g, W2)(4, 8, 1, 2);
    P(g, O)(4, 1, 1, 9);
  });
  mk('w/foice', 11, 6, g => {
    P(g, W2)(0, 4, 7, 1);
    P(g, M)(5, 0, 5, 1); P(g, M)(7, 1, 3, 1); P(g, M2)(9, 2, 1, 2);
  });
  mk('w/adagas', 7, 3, g => {
    P(g, M)(2, 0, 5, 1); P(g, M2)(2, 1, 4, 1); P(g, W2)(0, 1, 2, 1);
  });
  mk('w/chicote', 9, 7, g => {
    P(g, W2)(0, 0, 2, 2);
    P(g, '#6a4a2a')(2, 2, 1, 1); P(g, '#6a4a2a')(3, 3, 1, 1);
    P(g, '#6a4a2a')(4, 4, 1, 1); P(g, '#8a6248')(5, 5, 2, 1);
  });
  mk('w/bumerangue', 8, 5, g => {
    P(g, '#d8a44a')(0, 0, 2, 1); P(g, '#d8a44a')(1, 1, 2, 1); P(g, '#d8a44a')(2, 2, 3, 1);
    P(g, '#d8a44a')(0, 4, 2, 1); P(g, '#d8a44a')(1, 3, 2, 1);
    P(g, '#f0c878')(2, 2, 1, 1);
  });
  mk('w/serra', 7, 7, g => {
    P(g, M)(2, 0, 3, 7); P(g, M)(0, 2, 7, 3);
    P(g, M2)(1, 1, 1, 1); P(g, M2)(5, 1, 1, 1); P(g, M2)(1, 5, 1, 1); P(g, M2)(5, 5, 1, 1);
    P(g, O)(3, 3, 1, 1);
  });
  mk('w/corrente', 9, 6, g => {
    P(g, M2)(0, 1, 2, 2); P(g, M2)(2, 2, 2, 2); P(g, M2)(4, 1, 2, 2);
    P(g, M)(6, 1, 3, 3); P(g, M2)(7, 2, 1, 1);
  });
  mk('w/flauta', 9, 3, g => {
    P(g, W1)(0, 0, 8, 2); P(g, W2)(0, 1, 8, 1);
    P(g, O)(2, 0, 1, 1); P(g, O)(4, 0, 1, 1); P(g, GD)(8, 0, 1, 2);
  });
}
