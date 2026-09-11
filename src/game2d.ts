// ============================================================
// LEONIS 2D — game2d.ts · Sandbox do Bravo (top-down pixel)
// Estados: title → intro → creation → play
// ============================================================

import * as defs from './data/defs';
import { RACES, WEAPONS, RaceDef, WeaponDef, ZONES, ORES, POI2, MOUNTS, SKILLS, WEAPON_FAM, MountDef, BOSSES, DUNGEONS } from './data/defs';
import { buildBossTint } from './pix';
import { Input, AudioSys, saveGame, loadGame, hasSave, clearSave, clamp, dist2d, mulberry32 } from './core';
import { World2D, COLL } from './world2d';
import { SPR, buildAllSprites, buildTitlePanorama, buildOreSprite, buildHerbSprite, buildWeaponSprites, buildMountVariants, loadWeaponAtlas, PAL } from './pix';
import { UI2D } from './ui2d';
import { dmgMult, rollLoot, upgradeCost, gearNome as gearNomeSys } from './systems';

const T = 16;

// paleta 2D por raça (cabelo, pele, túnica, túnica-sombra)
const RACE_PAL: Record<string, { hair: string; skin: string; tunic: string; tunicD: string }> = {
  canzaro: { hair: '#e8c83a', skin: '#d8a37a', tunic: '#5a4a8a', tunicD: '#46386c' },
  marejante: { hair: '#2a6a6a', skin: '#7fae9c', tunic: '#2f7a6a', tunicD: '#24604f' },
  barrote: { hair: '#b0562a', skin: '#c98d5e', tunic: '#8a4a2a', tunicD: '#6e3a20' },
  silvario: { hair: '#4a8f2a', skin: '#e0c093', tunic: '#3a6a3a', tunicD: '#2e522c' },
  grevo: { hair: '#2a5a1a', skin: '#6fae4f', tunic: '#6a4a8a', tunicD: '#523a6c' },
  nimbo: { hair: '#e8e2d0', skin: '#e8e2d0', tunic: '#b8b2a0', tunicD: '#948e7e' }
};

// ============================================================
// ENTIDADES
// ============================================================
class Player2D {
  pos = { x: 0, y: 0 };
  vel = { x: 0, y: 0 };
  aim = 0;
  dir: 'd' | 'u' | 's' = 'd';
  flip = false;
  animT = 0;
  hp = 100; maxHp = 100;
  sta = 100; maxSta = 100;
  leguas = 0; nivel = 1;
  cobres = 20;
  cargas = 0;
  res: Record<string, number> = { ferro: 0, erva: 0, carne: 0 };
  equip = { armaNivel: 1, peitoralNivel: 1, arreioNivel: 1, multArma: 1, multPeitoral: 1 };
  arma!: WeaponDef; race!: RaceDef; nome = 'Leonis';
  cooldown = 0; swingT = -1; swingHeavy = false; swingHit = new Set<any>();
  rollT = -1; rollDir = { x: 1, y: 0 }; rollCd = 0; lastHurt = -99;
  mounted = false;
  onBoat = false;
  dead = false;
  hurtT = 0;

  ne(): number { return this.equip.armaNivel * 0.6 + this.equip.peitoralNivel * 0.2 + this.equip.arreioNivel * 0.2; }
  weaponDamage(heavy: boolean): number {
    let d = this.arma.dano * (1 + 0.15 * (this.equip.armaNivel - 1)) * this.equip.multArma;
    if (heavy) d *= this.arma.heavyMult;
    if (this.mounted) d *= 1.15;
    return d;
  }
}

interface Enemy2D {
  id: number; kind: string; elite: boolean; boss: boolean; bkey: string; scale: number; lvl: number; nome: string;
  pos: { x: number; y: number }; home: { x: number; y: number };
  hp: number; maxHp: number;
  state: 'idle' | 'chase' | 'windup' | 'hit' | 'return' | 'charge';
  stT: number; animT: number; frame: number;
  pacify: number; dead: boolean; deadT: number; fade: number;
  dmg: number; speed: number; camp: string | null; guard: boolean;
  mad: boolean; buff: number; shootCd: number; chargeCd: number;
  chargeT: number; chargeDx: number; chargeDy: number; tired: number; howlCd: number;
  den: string;
}

interface Proj2D {
  kind: string; x: number; y: number; vx: number; vy: number;
  ttl: number; dmg: number; weapon: WeaponDef; phase: string;
  hits: Set<number>; bounces: number; rot: number; tier: number; hostile?: boolean;
}

interface Npc {
  id: string; nome: string; face: number;
  x: number; y: number; hx: number; hy: number;
  animT: number; frame: number; stT: number;
  linhas: string[]; li: number;
}

interface Pickup { kind: string; val: number; x: number; y: number; vx: number; vy: number; t: number; got?: boolean; }

// tipos de fera — cada um com uma peculiaridade
const KINDS: Record<string, { nome: string; hp: number; dmg: number; speed: number }> = {
  s: { nome: 'Farejador', hp: 70,  dmg: 9,  speed: 30 },
  f: { nome: 'Batedor',   hp: 80,  dmg: 10, speed: 26 },
  a: { nome: 'Arqueiro',  hp: 60,  dmg: 11, speed: 24 },
  T: { nome: 'Bruto',     hp: 170, dmg: 20, speed: 20 },
  g: { nome: 'Gundu',     hp: 110, dmg: 16, speed: 26 },
  m: { nome: 'Miroo',     hp: 90,  dmg: 6,  speed: 26 },
  h: { nome: 'Uivo',      hp: 100, dmg: 12, speed: 32 }
};
function compDe(lvl: number): string[] {
  if (lvl <= 1) return ['s', 's', 'f'];
  if (lvl <= 2) return ['s', 'f', 'a'];
  if (lvl <= 3) return ['T', 's', 'a'];
  if (lvl <= 5) return ['g', 'T', 'a', 'h'];
  return ['m', 'h', 'g', 'T'];
}

// ============================================================
// GAME
// ============================================================
class Game2D {
  canvas!: HTMLCanvasElement;
  g!: CanvasRenderingContext2D;
  ui!: UI2D;
  input!: Input;
  audio = new AudioSys();
  world!: World2D;
  Z = 4;

  state: 'boot' | 'title' | 'intro' | 'creation' | 'play' | 'pause' | 'dead' = 'boot';
  selRace: RaceDef | null = null;
  selWeapon: WeaponDef | null = null;
  titlePano!: HTMLCanvasElement;

  player = new Player2D();
  mount = {
    pos: { x: POI2.ronceiro.x * T, y: POI2.ronceiro.y * T },
    state: 'ferido' as 'ferido' | 'domado' | 'selvagem', bond: 0, bondXp: 0,
    hp: 80, maxHp: 80, nome: 'Brumário',
    animT: 0, frame: 0, fed: 0,
    kind: 'ronceiro', def: MOUNTS[0] as MountDef
  };
  penBeasts: { id: string; x: number; y: number }[] = [];
  enemies: Enemy2D[] = [];
  projs: Proj2D[] = [];
  pickups: Pickup[] = [];
  npcs: Npc[] = [];
  boat = { x: (POI2.pier.x + 1) * T, y: (POI2.pier.y + 2) * T, boarded: false };

  camX = 0; camY = 0; camInit = false;
  time = 0;
  mouseWorld = { x: 0, y: 0 };

  q1 = 0; q2 = 0;
  runStats = { heavy: 0, fedJav: 0, boated: false, visitedPicos: false, umbigoT: 0 };
  bossesKilled: Set<string> = new Set<string>();
  won = false;
  q3 = 0;
  densDone: Set<string> = new Set<string>();
  tele: { t: number; mid: boolean; to: { x: number; y: number } | null; den: string | null } | null = null;
  rings: { x: number; y: number; t: number }[] = [];
  learned: Set<string> = new Set<string>();
  skillPts = 0;
  activeMountId = 'ronceiro';
  mountStates: Record<string, { state: 'selvagem' | 'pronto' | 'domado'; bond: number; bondXp: number; hp: number }> = {};
  chestsOpened = new Set<string>();
  discovered = new Set<string>();
  curZone = -1;
  eid = 1;
  rng = mulberry32(777);
  furiaCd = 0;
  introBeat = 0; introT = 0;
  private clock = new Clock2D();
  private gallopSfxT = 0;
  private mountBondT = 0;

  get vila() { return POI2.vila; }
  get pier() { return POI2.pier; }
  get wreck() { return POI2.wreck; }
  get ronP() { return POI2.ronceiro; }

  // ------------------------------------------------------------
  async start() {
    window.addEventListener('error', (ev) => this.fatalErr(ev.message));
    window.addEventListener('unhandledrejection', (ev: any) => this.fatalErr(String(ev?.reason?.message || ev?.reason || 'erro desconhecido')));
    try {
      await Promise.race([
        Promise.all([document.fonts.load('12px "Press Start 2P"'), document.fonts.load('16px "VT323"'), document.fonts.ready]),
        new Promise(r => setTimeout(r, 2500))
      ]);
    } catch { /* segue sem esperar fonte */ }

    try {
    this.canvas = document.getElementById('game2d') as HTMLCanvasElement;
    this.g = this.canvas.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
    this.input = new Input();
    this.world = new World2D();
    this.titlePano = buildTitlePanorama();

    // sprites de personagens por raça
    buildAllSprites(RACES.map(r => ({
      id: r.id,
      hair2d: RACE_PAL[r.id]?.hair || '#e8c83a',
      skinHex: RACE_PAL[r.id]?.skin || '#d8a37a',
      tunic2d: RACE_PAL[r.id]?.tunic || '#5a4a8a',
      tunicD2d: RACE_PAL[r.id]?.tunicD || '#46386c'
    })));
    buildWeaponSprites();
    buildMountVariants(MOUNTS.filter(m => m.id !== 'ronceiro').map(m => ({ id: m.id, cor: m.cor })));

    // sprites de minério/erva por tipo
    for (const [k, o] of Object.entries(ORES)) {
      buildOreSprite(`ore/${k}`, cssHex(o.cor), cssHex(o.corClara));
    }
    buildHerbSprite('herb/savana', '#4f8f2a', '#9fe05a');
    buildHerbSprite('herb/selva', '#2a7a5a', '#5adf9a');
    buildHerbSprite('herb/costa', '#2a8a8a', '#7ae8d8');
    buildHerbSprite('herb/deserto', '#b89a3a', '#f0d86a');
    buildHerbSprite('herb/banhadol', '#5a6a2a', '#a8c84a');
    buildHerbSprite('herb/picos', '#7a8a9a', '#d0e0f0');
    buildHerbSprite('herb/obsidiana', '#7a3a9a', '#c88af0');
    buildHerbSprite('herb/umbigo', '#8a7a9a', '#e0d0ff');

    this.ui = new UI2D('ui-root', this);

    // atlas de portraits (recortes da referencia do usuario)
    const pim = new Image();
    pim.onload = () => {
      for (let i = 0; i < 25; i++) {
        const c = document.createElement('canvas');
        c.width = 48; c.height = 48;
        c.getContext('2d')!.drawImage(pim, (i % 5) * 48, Math.floor(i / 5) * 48, 48, 48, 0, 0, 48, 48);
        SPR[`face/${i}`] = c;
      }
      this.spawnNpcs();
    };
    pim.onerror = () => { this.spawnNpcs(); }; // sem retrato, NPC sem face
    pim.src = 'img/portraits.png';

    // atlas de armas (famílias × 10 tiers) — via script tag (funciona em file:// pro .exe)
    const ws = document.createElement('script');
    ws.src = 'img/weapons.manifest.js';
    ws.onload = () => {
      const man = (window as any).WEAPONS_MANIFEST;
      const wim = new Image();
      wim.onload = () => loadWeaponAtlas(wim, WEAPON_FAM, man, 48);
      wim.src = 'img/weapons.png';
    };
    document.head.appendChild(ws);

    // barco: primeira água navegável perto do pier
    outer: for (let r = 2; r < 24; r++) {
      for (let a = 0; a < Math.PI * 2; a += 0.25) {
        const x = Math.round(POI2.pier.x + Math.cos(a) * r) * T;
        const y = Math.round(POI2.pier.y + Math.sin(a) * r) * T;
        if (this.world.isWater(x, y)) { this.boat.x = x; this.boat.y = y; break outer; }
      }
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // intro overlay hooks
    const introEl = document.getElementById('intro');
    introEl?.querySelector('#intro-skip')?.addEventListener('click', () => this.endIntro());
    introEl?.querySelector('#intro-go')?.addEventListener('click', () => this.endIntro());

    // título
    this.state = 'title';
    this.ui.buildTitle(
      () => this.startIntro(),
      () => this.loadGame(),
      hasSave()
    );

    this.loop();
    } catch (err: any) {
      this.fatalErr(err?.message || String(err));
      // fallback: nunca deixa tela morta — vai direto pra criação
      try {
        this.state = 'creation';
        this.ui.buildCreation((race, weapon, nome) => {
          if (race && weapon) this.newGame(race, weapon, nome);
          else this.loadGame();
        }, false);
      } catch { /* */ }
    }
  }

  private resize() {
    this.Z = window.innerWidth < 900 ? 3 : 4;
    this.canvas.width = Math.ceil(window.innerWidth / this.Z);
    this.canvas.height = Math.ceil(window.innerHeight / this.Z);
    this.g = this.canvas.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
  }

  titlePanorama() { return this.titlePano; }

  private errBox: HTMLElement | null = null;
  private errCount = 0;
  fatalErr(msg: string) {
    this.errCount++;
    if (!this.errBox) {
      this.errBox = document.createElement('div');
      this.errBox.style.cssText = 'position:fixed;left:8px;bottom:8px;max-width:74vw;background:rgba(60,0,0,.92);color:#ffb4a8;border:2px solid #ff4a3a;padding:8px 12px;font:14px monospace;z-index:999;white-space:pre-wrap;';
      document.body.appendChild(this.errBox);
    }
    this.errBox.textContent = `ERRO: ${msg} (x${this.errCount})`;
  }
  zoneColor(bi: string): string {
    return ({ savana: '#a8c84a', selva: '#5adf7a', costa: '#5adfd0', deserto: '#ffe08a', banhadol: '#9adf5a', picos: '#cfe8ff', obsidiana: '#ff8a5a', umbigo: '#e0d0ff' } as any)[bi] || '#fff';
  }

  // ------------------------------------------------------------
  // INTRO
  // ------------------------------------------------------------
  private startIntro() {
    this.ui.closeTitle();
    this.state = 'intro';
    this.introBeat = 0; this.introT = 0;
    const e = document.getElementById('intro');
    if (e) { e.classList.add('on'); e.classList.remove('finished'); }
    this.setIntroChap('I · O MAR TRAIDOR');
    this.setIntroSub('O mar engoliu a Grão-Nau. Dois mil chegaram vivos às praias do Bravo.');
  }
  private setIntroSub(t: string) { const e = document.getElementById('intro-sub'); if (e) e.textContent = t; }
  private setIntroChap(t: string) {
    const e = document.getElementById('intro-chap');
    if (e) { e.textContent = t; e.style.opacity = '1'; setTimeout(() => { if (e) e.style.opacity = '0'; }, 3600); }
  }
  private endIntro() {
    this.ui.introOff();
    this.state = 'creation';
    this.ui.buildCreation((race, weapon, nome) => {
      if (race && weapon) this.newGame(race, weapon, nome);
      else this.loadGame();
    }, hasSave());
  }

  private drawIntro() {
    const g = this.g;
    const W = this.canvas.width, H = this.canvas.height;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const b = this.introBeat;
    const s = Math.max(2, Math.floor(H / 108));
    const sw = 192 * s, sh = 108 * s;
    const ox = Math.floor((W - sw) / 2), oy = Math.floor((H - sh) / 2);
    const px = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(ox + x * s, oy + y * s, w * s, h * s); };
    const t = this.introT;

    if (b === 0) {
      // tempestade
      px(0, 0, 192, 108, '#0a1420');
      if (Math.random() < 0.04) px(0, 0, 192, 108, '#3a5a7a');
      px(0, 70, 192, 38, '#0a2233');
      for (let i = 0; i < 6; i++) {
        const wy = 72 + i * 6;
        for (let x = 0; x < 192; x += 8) {
          px(x, wy + Math.round(Math.sin(t * 3 + x * 0.3 + i) * 1.5), 5, 1, '#16405e');
        }
      }
      // navio afundando
      const sink = Math.min(1, t / 6);
      const sy = Math.round(sink * 14);
      px(78, 48 + sy, 36, 10, '#4a3620');
      px(78, 52 + sy, 36, 6, '#382816');
      px(94, 30 + sy + Math.round(Math.sin(t * 0.7) * 1), 3, 20, '#382816');
      px(97, 33 + sy, 12, 12, '#8a8478');
      // chuva
      g.fillStyle = '#6a8ab0';
      for (let i = 0; i < 90; i++) {
        const rx = (i * 37 + Math.floor(t * 160)) % 192;
        const ry = (i * 53 + Math.floor(t * 190)) % 70;
        g.fillRect(ox + rx * s, oy + ry * s, 1 * s, 2 * s);
      }
    } else if (b === 1) {
      // praia à noite
      px(0, 0, 192, 108, '#0e1216');
      px(0, 60, 192, 48, '#22301c');
      px(0, 56, 192, 6, '#4a4438');
      px(0, 20, 192, 36, '#16241a');
      for (const [ex, ey] of [[30, 26], [80, 22], [140, 27]]) {
        if (Math.sin(t * 0.8 + ex) > -0.7) {
          px(ex, ey, 2, 1, '#ffb43a'); px(ex + 4, ey, 2, 1, '#ffb43a');
        }
        px(ex - 4, ey - 6, 12, 6, '#0c0e10');
      }
      for (const [fx, fy] of [[60, 70], [110, 74]]) {
        px(fx, fy, 4, 3, Math.sin(t * 9) > 0 ? '#ff8a2a' : '#e06a1a');
        px(fx + 1, fy + 1, 2, 2, '#ffd23a');
      }
      for (let i = 0; i < 6; i++) {
        const sx = 40 + i * 18 + Math.sin(i * 3) * 4;
        px(sx, 66 + (i % 2) * 4, 2, 5, '#1a1420');
        px(sx, 65 + (i % 2) * 4, 2, 2, '#9a8468');
      }
    } else {
      // amanhecer — Leona volta
      const k = Math.min(1, t / 5);
      const sky = k > 0.5 ? '#8ecdf5' : '#2a3438';
      px(0, 0, 192, 50, sky);
      px(0, 50, 192, 58, k > 0.5 ? '#8fc94a' : '#31421f');
      px(90, 50, 12, 58, '#9a7648');
      px(150, Math.round(30 - k * 14), 8, 8, '#fff0a0');
      const lx = t < 4 ? 20 + t * 12 : 20 + (8 - Math.min(8, t)) * 12 + 48;
      const dir = t < 4 ? -1 : 1;
      px(Math.round(lx), 70, 3, 7, '#1a1420');
      px(Math.round(lx), 68, 3, 3, t < 4 ? '#2a1a10' : '#e8c83a');
      if (t >= 4) {
        px(Math.round(lx - 8 * dir), 72, 4, 5, '#8a6248');
        px(Math.round(lx - 8 * dir) + (dir > 0 ? -1 : 4), 71, 1, 1, '#1a1420');
      }
    }
  }

  private updateIntro(dt: number) {
    this.introT += dt;
    const durs = [7, 7, 8.5];
    if (this.introBeat < 2 && this.introT > durs[this.introBeat]) {
      this.introBeat++; this.introT = 0;
      if (this.introBeat === 1) { this.setIntroChap('II · O BRAVO'); this.setIntroSub('Feras, fome e inverno cobraram metade no primeiro ano. O que sobrou se encurralou no Berço.'); }
      if (this.introBeat === 2) { this.setIntroChap('III · A PRIMEIRA VOLTA'); this.setIntroSub('Então Leona fez o que ninguém: saiu — e VOLTOU. Trouxe sementes, aço e uma fera ao lado. Nasceram os LEONIS.'); }
    }
    if (this.introBeat === 2 && this.introT > durs[2]) {
      document.getElementById('intro')?.classList.add('finished');
    }
    if (this.input.pressed('Escape') || this.input.pressed('Space') || this.input.pressed('Enter')) this.endIntro();
  }

  // ------------------------------------------------------------
  // NOVO JOGO
  // ------------------------------------------------------------
  newGame(race: RaceDef, weapon: WeaponDef, nome: string) {
    const p = this.player;
    p.race = race; p.arma = weapon; p.nome = nome || 'Leonis';
    p.maxHp = 100 + (race.hpBonus || 0); p.hp = p.maxHp;
    p.maxSta = 100 + (race.staBonus || 0); p.sta = p.maxSta;
    p.leguas = 0; p.nivel = 1; p.cobres = 20; p.cargas = 0;
    p.res = { ferro: 0, erva: 0, carne: 1 };
    p.equip = { armaNivel: 1, peitoralNivel: 1, arreioNivel: 1, multArma: 1, multPeitoral: 1 };
    p.dead = false; p.mounted = false; p.onBoat = false;
    p.pos.x = POI2.vila.x * T; p.pos.y = (POI2.vila.y + 6) * T;
    this.mount.pos.x = POI2.ronceiro.x * T; this.mount.pos.y = POI2.ronceiro.y * T;
    this.mount.state = 'ferido'; this.mount.bond = 0; this.mount.bondXp = 0;
    this.mount.fed = 0; this.mount.hp = this.mount.maxHp; this.mount.nome = 'Brumário';
    this.q1 = 0; this.q2 = 0;
    this.projs = []; this.pickups = [];
    this.mountStates = {}; this.activeMountId = 'ronceiro';
    this.learned = new Set<string>(); this.skillPts = 0;
    this.runStats = { heavy: 0, fedJav: 0, boated: false, visitedPicos: false, umbigoT: 0 };
    this.bossesKilled = new Set<string>(); this.won = false; this.q3 = 0; this.densDone = new Set<string>(); this.tele = null;
    this.initMountStates();
    this.mount.kind = 'ronceiro'; this.mount.def = MOUNTS[0];
    this.mount.maxHp = MOUNTS[0].hp; this.mount.hp = MOUNTS[0].hp;
    this.spawnEnemies();
    this.state = 'play';
    this.audio.startAmbient();
    this.updateQuest();
    this.ui.toast('Bem-vindo ao Bravo. Sandbox aberto: M abre o mapa.');
    this.camInit = false;
  }

  private spawnEnemies() {
    this.enemies = [];
    this.eid = 1;
    for (const camp of this.world.camps) {
      const n = camp.lvl >= 6 ? 4 : 3;
      const comp = compDe(camp.lvl);
      for (let i = 0; i < n; i++) {
        const kind = comp[i % comp.length];
        const elite = i === 0 && camp.lvl >= 4;
        const a = (i / n) * Math.PI * 2;
        this.addEnemy(kind, camp.lvl, camp.x + Math.cos(a) * 30, camp.y + Math.sin(a) * 24, camp.id, false, elite);
      }
    }
    if (this.q2 < 2) {
      this.addEnemy('s', 2, POI2.ronceiro.x * T - 24, POI2.ronceiro.y * T, null, true);
      this.addEnemy('f', 2, POI2.ronceiro.x * T + 24, POI2.ronceiro.y * T, null, true);
    }
    this.spawnBosses();
  }

  private addEnemy(kind: string, lvl: number, x: number, y: number, camp: string | null, guard: boolean, elite = false): Enemy2D {
    const st = KINDS[kind];
    const mult = (1 + (lvl - 1) * 0.35) * (elite ? 1.5 : 1);
    const e: Enemy2D = {
      id: this.eid++, kind, elite, boss: false, bkey: '', scale: 1, lvl, nome: st.nome, den: '',
      pos: { x, y }, home: { x, y },
      hp: Math.round(st.hp * mult), maxHp: Math.round(st.hp * mult),
      state: 'idle', stT: 0, animT: 0, frame: 0,
      pacify: 0, dead: false, deadT: 0, fade: 0,
      dmg: Math.round(st.dmg * (1 + (lvl - 1) * 0.3) * (elite ? 1.25 : 1)), speed: st.speed,
      camp, guard,
      mad: false, buff: 0, shootCd: 0, chargeCd: 0,
      chargeT: 0, chargeDx: 0, chargeDy: 0, tired: 0, howlCd: 0
    };
    this.enemies.push(e);
    return e;
  }

  // ------------------------------------------------------------
  // LOOP
  // ------------------------------------------------------------
  private loop = () => {
    requestAnimationFrame(this.loop);
    try {
      const dt = Math.min(0.05, this.clock.get());
      const g = this.g, W = this.canvas.width, H = this.canvas.height;

      if (this.state === 'pause' && this.input.pressed('Escape')) this.resume();

      if (this.state === 'title') {
        g.fillStyle = '#0c1114'; g.fillRect(0, 0, W, H);
        const s = Math.max(1, Math.floor(H / 100));
        const pw = 240 * s, ph = 100 * s;
        g.drawImage(this.titlePano, Math.floor((W - pw) / 2), Math.floor((H - ph) / 2), pw, ph);
        // Enter/Espaço também começam (não depende do mouse)
        if (this.input.pressed('Enter') || this.input.pressed('Space')) this.startIntro();
      } else if (this.state === 'intro') {
        this.updateIntro(dt);
        this.drawIntro();
      } else if (this.state === 'creation') {
        g.fillStyle = '#10171c'; g.fillRect(0, 0, W, H);
      } else if (this.state === 'play' || this.state === 'dead' || this.state === 'pause') {
        if (this.state === 'play') {
          this.time += dt;
          this.updatePlay(dt);
        }
        this.render();
      }
    } catch (err: any) {
      this.fatalErr(err?.message || String(err));
    } finally {
      this.input.endFrame();
    }
  };

  // ------------------------------------------------------------
  // UPDATE
  // ------------------------------------------------------------
  private updatePlay(dt: number) {
    const inp = this.input, p = this.player, w = this.world;
    this.mouseWorld.x = this.camX + inp.mx / this.Z;
    this.mouseWorld.y = this.camY + inp.my / this.Z;
    p.aim = Math.atan2(this.mouseWorld.y - p.pos.y, this.mouseWorld.x - p.pos.x);

    // pausa / painéis
    if (inp.pressed('Escape')) {
      if (this.uiOpen()) this.resume();
      else { this.state = 'pause'; this.ui.showPause(this); return; }
    }
    if (inp.pressed('KeyH')) { this.ui.showHelp(); return; }
    if (inp.pressed('Tab')) { this.uiOpen() ? this.ui.closePanel() : this.ui.showAlforje(this); return; }
    if (inp.pressed('KeyM')) { this.uiOpen() ? this.ui.closePanel() : this.ui.showMap(this); return; }
    if (inp.pressed('KeyK')) { this.uiOpen() ? this.ui.closePanel() : this.ui.showSkills(this); return; }
    if (inp.pressed('F5')) this.save(true);
    if (inp.pressed('F9')) this.loadGame();
    if (this.uiOpen()) return;

    // zona atual
    const zi = w.zoneIndexAt(p.pos.x, p.pos.y);
    if (zi !== this.curZone) {
      this.curZone = zi;
      const z = ZONES[zi];
      const diff = z.lvl - p.ne();
      const cor = diff <= 1 ? '#8fe08f' : diff <= 3 ? '#ffd76a' : '#ff8a7a';
      this.ui.setZoneName(z.nome.toUpperCase(), z.lvl, cor);
      this.ui.zoneTitle(z.nome.toUpperCase(), z.lvl >= 10 ? 'TERRA LETAL — recue se sábio' : `CONTEÚDO NÍVEL ${z.lvl}`, cor);
      if (!this.discovered.has(z.id)) {
        this.discovered.add(z.id);
        this.gainLeguas(15);
        this.audio.sfx('quest');
      }
      if (z.id === 'picos') this.runStats.visitedPicos = true;
    }
    if (ZONES[zi]?.id === 'umbigo' && !p.dead) {
      const before = this.runStats.umbigoT;
      this.runStats.umbigoT += dt;
      if (before < 60 && this.runStats.umbigoT >= 60) {
        this.ui.toast('60s no UMBIGO sobrevividos! O Domador precisa saber.');
        this.audio.sfx('quest');
      }
    }

    // itens
    if (inp.pressed('KeyR') && (p.res['carne'] || 0) > 0) {
      p.res['carne']--;
      const cura = this.hasSkill('carne1') ? 50 : 30;
      p.hp = clamp(p.hp + cura, 0, p.maxHp);
      this.audio.sfx('eat');
      this.ui.feed(`VOCÊ COME CARNE (+${cura} VIDA)`, '#e8c8a0');
    }
    p.hurtT = Math.max(0, p.hurtT - dt);
    if (this.hasSkill('vigor1') && this.time - p.lastHurt > 5 && p.hp > 0) {
      p.hp = Math.min(p.maxHp, p.hp + 1.2 * dt);
    }

    // ---- movimento ----
    let mx = 0, my = 0;
    if (inp.down('KeyW')) my -= 1;
    if (inp.down('KeyS')) my += 1;
    if (inp.down('KeyA')) mx -= 1;
    if (inp.down('KeyD')) mx += 1;
    const moving = mx !== 0 || my !== 0;
    if (moving) { const l = Math.hypot(mx, my); mx /= l; my /= l; }

    const sprint = inp.down('ShiftLeft') || inp.down('ShiftRight');
    let drain = 0;

    if (p.onBoat) {
      this.updateBoat(dt, mx, my, moving);
      p.sta = clamp(p.sta + 20 * dt, 0, p.maxSta);
      this.updateCamera(dt);
      this.updateCommon(dt);
      return;
    }

    if (this.player.mounted) {
      // ---- montado ----
      const spd = (sprint ? 118 : 62) * this.mount.def.spd * (this.hasSkill('doma2') ? 1.15 : 1);
      if (moving) {
        w.moveEntity(p.pos, mx * spd * dt, my * spd * dt, 4);
        p.animT += dt * (sprint ? 2.4 : 1.4);
        drain += sprint ? 5 : 0;
        this.mount.animT += dt * (sprint ? 2.4 : 1.4);
        if (sprint) {
          this.mountBondTick(dt);
          this.gallopSfx(dt);
        }
      } else p.animT = 0;
      this.mount.pos.x = p.pos.x; this.mount.pos.y = p.pos.y + 2;
      this.furiaCd = Math.max(0, this.furiaCd - dt);
      if (inp.pressed('KeyQ') && this.mount.bond >= 4 && this.furiaCd <= 0) this.mountFuria();
      if (inp.pressed('KeyF') && p.res['erva'] > 0) this.feedMount();
      if (inp.pressed('KeyE')) {
        this.player.mounted = false;
        this.mount.pos.x = p.pos.x + 12; this.mount.pos.y = p.pos.y + 6;
      }
      if (drain === 0) p.sta = clamp(p.sta + 20 * dt, 0, p.maxSta);
      else p.sta = clamp(p.sta - drain * dt, 0, p.maxSta);
    } else {
      // ---- a pé ----
      p.rollCd = Math.max(0, p.rollCd - dt);
      if ((inp.pressed('Space') || inp.pressed('KeyC')) && p.rollT < 0 && p.rollCd <= 0 && p.sta >= 20) {
        p.rollT = 0; p.sta -= 20;
        p.rollCd = this.hasSkill('rol1') ? 0.55 : 0.9;
        const d = moving ? { x: mx, y: my } : { x: Math.cos(p.aim), y: Math.sin(p.aim) };
        p.rollDir = d;
        this.audio.sfx('swing');
      }
      let spd = 52 * (1 + (this.hasSkill('vel1') ? 0.08 : 0) + (this.hasSkill('vel2') ? 0.08 : 0));
      if (sprint && moving && p.sta > 1) { spd *= 1.5; drain += 10; }
      if (p.rollT >= 0) {
        p.rollT += dt / 0.34;
        const dist = 95 + (this.hasSkill('rol2') ? 30 : 0);
        w.moveEntity(p.pos, p.rollDir.x * dist * dt, p.rollDir.y * dist * dt, 4);
        if (p.rollT >= 1) p.rollT = -1;
      } else if (moving) {
        w.moveEntity(p.pos, mx * spd * dt, my * spd * dt, 4);
        p.animT += dt * (spd > 60 ? 2.6 : 1.6);
      } else p.animT = 0;
      if (drain === 0) p.sta = clamp(p.sta + 24 * (this.hasSkill('fole1') ? 1.5 : 1) * dt, 0, p.maxSta);
      else p.sta = clamp(p.sta - drain * dt, 0, p.maxSta);

      // ronceiro ferido (missão)
      if (this.mount.state === 'ferido' && this.q2 === 2 && inp.pressed('KeyE') &&
        dist2d(p.pos.x, p.pos.y, this.mount.pos.x, this.mount.pos.y) < 20) {
        this.feedRonceiro();
      } else if (this.mount.state === 'domado' && inp.pressed('KeyE') &&
        dist2d(p.pos.x, p.pos.y, this.mount.pos.x, this.mount.pos.y) < 20) {
        this.player.mounted = true;
        this.audio.sfx('gallop');
      } else {
        this.tryInteractKey();
      }
    }

    // ---- ataque ----
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.swingT >= 0) {
      p.swingT += dt / (p.swingHeavy ? p.arma.cd * 1.5 : p.arma.cd);
      if (p.swingT >= 1) { p.swingT = -1; p.swingHit.clear(); }
    }
    if (p.swingT < 0 && p.cooldown <= 0 && p.rollT < 0) {
      if (inp.lmb && p.sta >= 6) this.tryAttack(false);
      else if (inp.rmb && p.sta >= 12) this.tryAttack(true);
    }

    this.updateCamera(dt);
    this.updateEnemies(dt);
    this.updateProjs(dt);
    this.updatePickups(dt);
    this.updateCommon(dt);
    this.updateTele(dt);
    this.updateBossBar();
  }

  private updateBossBar() {
    let target: Enemy2D | null = null;
    let bd = null;
    for (const e of this.enemies) {
      if (!e.boss || e.dead) continue;
      if (dist2d(e.pos.x, e.pos.y, this.player.pos.x, this.player.pos.y) < 160) {
        target = e;
        bd = BOSSES.find(b => b.nome === e.nome) || null;
        break;
      }
    }
    if (target && bd) this.ui.bossBar(target.nome, bd.cor, target.hp / target.maxHp);
    else this.ui.bossBar(null);
  }

  private initMountStates() {
    for (const d of MOUNTS) {
      if (!this.mountStates[d.id]) this.mountStates[d.id] = { state: 'selvagem', bond: 0, bondXp: 0, hp: d.hp };
    }
    if (!this.penBeasts.length) {
      const b = this.world.landNear(POI2.vila.x - 9, POI2.vila.y + 5, 4);
      const j = this.world.landNear(POI2.vila.x + 9, POI2.vila.y + 6, 4);
      if (b) this.penBeasts.push({ id: 'bufelo', x: b.x * T, y: b.y * T });
      if (j) this.penBeasts.push({ id: 'javalina', x: j.x * T, y: j.y * T });
    }
  }

  mountStatus(id: string): 'selvagem' | 'pronto' | 'domado' {
    const st = this.mountStates[id];
    if (!st) return 'selvagem';
    if (st.state === 'domado') return 'domado';
    switch (id) {
      case 'bufelo': return this.runStats.heavy >= 25 ? 'pronto' : 'selvagem';
      case 'javalina': return this.runStats.fedJav >= 4 ? 'pronto' : 'selvagem';
      case 'corsaria': return this.runStats.boated ? 'pronto' : 'selvagem';
      case 'rocclume': return this.runStats.visitedPicos ? 'pronto' : 'selvagem';
      case 'mirage': return this.runStats.umbigoT >= 60 ? 'pronto' : 'selvagem';
      default: return 'selvagem';
    }
  }

  private activateMount(id: string) {
    const prev = this.activeMountId;
    if (prev !== id) {
      this.mountStates[prev] = {
        state: 'domado', bond: this.mount.bond, bondXp: this.mount.bondXp, hp: Math.max(1, this.mount.hp)
      };
      this.player.mounted = false;
    }
    const d = MOUNTS.find(m => m.id === id)!;
    const st = this.mountStates[id];
    this.activeMountId = id;
    this.mount.kind = id;
    this.mount.def = d;
    this.mount.nome = id === 'ronceiro' && st.state !== 'domado' ? 'Brumário' : d.nome;
    this.mount.state = st.state === 'domado' ? 'domado' : (id === 'ronceiro' ? 'ferido' : 'selvagem');
    this.mount.bond = st.bond; this.mount.bondXp = st.bondXp;
    this.mount.maxHp = d.hp; this.mount.hp = Math.max(1, st.hp);
    const pen = this.world.landNear(POI2.vila.x - 7, POI2.vila.y + 4, 5);
    if (pen) { this.mount.pos.x = pen.x * T; this.mount.pos.y = pen.y * T; }
    this.ui.toast(`${d.ico} ${d.nome.toUpperCase()} — sua montaria ativa!`);
    this.audio.sfx('tame');
  }

  keeperDialog() {
    const stWord = (id: string) => {
      const s = this.mountStatus(id);
      return s === 'domado' ? 'DOMADA' : s === 'pronto' ? '★ PRONTA!' : 'selvagem';
    };
    this.ui.dialogFace('DOMADOR ABERO', 2, 'Cada fera tem uma chave. Qual te interessa?',
      MOUNTS.map(d => ({
        label: `${d.ico} ${d.nome} — ${stWord(d.id)}`,
        cb: () => this.mountDetail(d)
      })).concat([{ label: 'FECHAR', cb: () => { } }]));
  }

  private mountDetail(d: MountDef) {
    const s = this.mountStatus(d.id);
    const prog: Record<string, string> = {
      bufelo: `Golpes pesados: ${Math.min(25, this.runStats.heavy)}/25`,
      javalina: `Carnes dadas: ${Math.min(4, this.runStats.fedJav)}/4 (E perto dela no curral)`,
      corsaria: this.runStats.boated ? 'Você já veio por mar.' : 'Embarque no pier (E no barco).',
      rocclume: this.runStats.visitedPicos ? 'Você viu os Picos.' : 'Descubra os Picos Ossos e volte.',
      mirage: `Sobrevivência no Umbigo: ${Math.floor(Math.min(60, this.runStats.umbigoT))}s/60s`,
      ronceiro: this.q2 >= 3 ? 'Domado pela erva e pela paciência.' : 'Missão do Brais: livre-o e alimente-o (3 ervas).'
    };
    const opts: { label: string; cb?: () => void }[] = [];
    if (s === 'pronto') opts.push({ label: `★ DOMAR ${d.nome.toUpperCase()} AGORA`, cb: () => {
      this.mountStates[d.id] = { state: 'domado', bond: 1, bondXp: 0, hp: d.hp };
      this.ui.zoneTitle(d.nome.toUpperCase(), 'DOMADA — ' + d.dica, '#8fe08f');
      this.gainLeguas(25);
      this.activateMount(d.id);
      this.save(false);
    } });
    if (s === 'domado' && this.activeMountId !== d.id) opts.push({ label: `MONTAR ${d.nome.toUpperCase()}`, cb: () => this.activateMount(d.id) });
    opts.push({ label: 'VOLTAR', cb: () => this.keeperDialog() });
    this.ui.dialogFace('DOMADOR ABERO', 2, `<b>${d.nome}</b>: ${d.como}<br><i>${d.dica}</i><br><span style="color:#8fe08f">${prog[d.id] || ''}</span>`, opts);
  }

  private addBoss(zone: string, lvl: number, x: number, y: number): Enemy2D {
    const bd = BOSSES.find(b => b.zone === zone)!;
    const st = KINDS[bd.kind];
    const mult = (1 + (lvl - 1) * 0.35) * 6;
    const e: Enemy2D = {
      id: this.eid++, kind: bd.kind, elite: false, boss: true, bkey: `boss/${zone}`, den: '',
      scale: bd.scale, lvl, nome: bd.nome,
      pos: { x, y }, home: { x, y },
      hp: Math.round(st.hp * mult), maxHp: Math.round(st.hp * mult),
      state: 'idle', stT: 0, animT: 0, frame: 0,
      pacify: 0, dead: false, deadT: 0, fade: 0,
      dmg: Math.round(st.dmg * (1 + (lvl - 1) * 0.3) * 1.5), speed: st.speed * 0.9,
      camp: null, guard: false,
      mad: false, buff: 0, shootCd: 0, chargeCd: 0,
      chargeT: 0, chargeDx: 0, chargeDy: 0, tired: 0, howlCd: 0
    };
    buildBossTint(bd.kind, bd.cor, zone);
    this.enemies.push(e);
    return e;
  }

  private spawnBosses() {
    for (const bd of BOSSES) {
      if (this.bossesKilled.has(bd.zone)) continue;
      const den = this.world.bossDens.find(d => d.zone === bd.zone);
      if (den) this.addBoss(bd.zone, bd.lvl, den.x, den.y - 10);
    }
  }

  private spawnNpcs() {
    if (this.npcs.length) return;
    let i = 1;
    for (const s of this.world.npcSpawns) {
      this.npcs.push({
        id: `n${i++}`, nome: s.nome, face: s.face,
        x: s.x, y: s.y, hx: s.x, hy: s.y,
        animT: 0, frame: 0, stT: 0, linhas: s.linhas, li: 0
      });
    }
  }

  private updateNpcs(dt: number) {
    for (const n of this.npcs) {
      n.animT += dt;
      n.stT -= dt;
      if (n.stT <= 0) {
        n.stT = 1.5 + this.rng() * 2;
        n.frame ^= 1;
        const a = this.rng() * Math.PI * 2;
        const pos = { x: n.x, y: n.y };
        this.world.moveEntity(pos, Math.cos(a) * 5, Math.sin(a) * 5, 4);
        if (Math.hypot(pos.x - n.hx, pos.y - n.hy) < 30) { n.x = pos.x; n.y = pos.y; }
      }
    }
  }

  private interactBeast(b: { id: string; x: number; y: number }) {
    if (b.id === 'javalina') {
      if ((this.player.res['carne'] || 0) > 0) {
        this.player.res['carne']--;
        this.runStats.fedJav++;
        this.audio.sfx('eat');
        this.ui.feed(`A JAVALINA DEVORA A CARNE (${this.runStats.fedJav}/4)`, '#e8c8a0');
        if (this.runStats.fedJav >= 4) this.ui.toast('A JAVALINA está pronta! Fale com o DOMADOR ABERO.');
      } else this.ui.toast('Sem carne. Cace feras (elas dropam).');
    } else {
      this.ui.toast(`Golpes pesados: ${this.runStats.heavy}/25 — treine nas feras (botão direito)`);
    }
  }

  private tryInteractKey() {
    if (this.input.pressed('KeyE')) this.tryInteract();
  }

  private gallopSfx(dt: number) {
    this.gallopSfxT += dt;
    if (this.gallopSfxT > 0.28) { this.gallopSfxT = 0; this.audio.sfx('gallop'); }
  }
  private mountBondTick(dt: number) {
    this.mountBondT += dt;
    if (this.mountBondT > 1) {
      this.mountBondT = 0;
      this.mount.bondXp += this.hasSkill('doma1') ? 2 : 1;
      this.checkBond();
    }
  }
  private checkBond() {
    const need = [0, 0, 30, 80, 150, 260];
    const m = this.mount;
    if (m.state !== 'domado') return;
    let up = false;
    while (m.bond < 5 && m.bondXp >= need[m.bond + 1]) { m.bond++; up = true; }
    if (up) { this.ui.toast(`Vínculo com ${m.nome}: ${m.bond} ♥`); this.audio.sfx('tame'); }
  }

  private tryAttack(heavy: boolean) {
    const p = this.player;
    p.cooldown = p.arma.cd * (heavy ? 1.5 : 1);
    p.sta = clamp(p.sta - (heavy ? 12 : 6), 0, p.maxSta);
    p.swingT = 0; p.swingHeavy = heavy; p.swingHit.clear();
    this.audio.sfx('swing');
    let dmg = p.weaponDamage(heavy);
    dmg *= 1 + (this.hasSkill('dano1') ? 0.12 : 0) + (this.hasSkill('dano2') ? 0.12 : 0);
    if (p.arma.melee) {
      const reach = p.arma.alcance * 4.5 + 8;
      const arc = p.arma.arco;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = e.pos.x - p.pos.x, dy = e.pos.y - p.pos.y;
        const d = Math.hypot(dx, dy);
        if (d > reach) continue;
        const ang = Math.atan2(dy, dx);
        let diff = Math.abs(ang - p.aim) % (Math.PI * 2);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < arc / 2 + 0.35) this.hitEnemy(e, dmg, heavy);
      }
    } else if (p.arma.proj) {
      const kind = p.arma.proj;
      const speed = (p.arma.projVel || 120) * 2.6;
      const vx = Math.cos(p.aim) * speed, vy = Math.sin(p.aim) * speed;
      this.projs.push({
        kind, x: p.pos.x + Math.cos(p.aim) * 6, y: p.pos.y - 4 + Math.sin(p.aim) * 6,
        vx, vy, ttl: p.arma.projTtl || 1.2, dmg, weapon: p.arma, phase: 'out',
        hits: new Set<number>(), bounces: 0, rot: p.aim, tier: clamp(p.equip.armaNivel - 1, 0, 9)
      });
      if (kind === 'nota') this.audio.sfx('note');
    }
  }

  private hitEnemy(e: Enemy2D, dmg: number, heavy: boolean) {
    void heavy;
    const m = dmgMult(this.player.ne(), e.lvl);
    const final = Math.max(1, Math.round(dmg * m.atk));
    e.hp -= final;
    const sx = (e.pos.x - this.camX) * this.Z, sy = (e.pos.y - this.camY) * this.Z - 20;
    this.ui.dmgNumber(sx, sy, `${final}`, m.tier >= 2 ? '#b8b8c8' : m.tier === 1 ? '#ffd76a' : '#ffffff');
    this.audio.sfx('hit');
    if (heavy) this.runStats.heavy++;
    const dx = e.pos.x - this.player.pos.x, dy = e.pos.y - this.player.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    const kb = heavy ? (this.hasSkill('furia') ? 20 : 11) : 6;
    this.world.moveEntity(e.pos, (dx / d) * kb, (dy / d) * kb, 3);
    if (e.kind === 'f') e.mad = true;
    if (e.state === 'idle' || e.state === 'return') e.state = 'chase';
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      e.deadT = e.camp ? 45 : 9999;
      e.fade = 0.6;
      this.onEnemyDead(e);
    }
  }

  private onEnemyDead(e: Enemy2D) {
    const xp = e.boss ? 40 + e.lvl * 8 : 5 + e.lvl * 2;
    this.gainLeguas(xp);
    if (e.boss) {
      const bd = BOSSES.find(b => b.nome === e.nome)!;
      this.bossesKilled.add(bd.zone);
      if (bd.zone === 'berco' && this.q3 === 0) { this.q3 = 1; this.malvinaRevela(); }
      else if (this.bossesKilled.size >= 10) this.ui.zoneTitle('AS DEZ SIGILAS CANTAM', 'A PORTA do Umbigo está aberta…', '#ffd23a');
      this.skillPts++;
      this.audio.sfx('tame');
      this.ui.zoneTitle(`${bd.nome.toUpperCase()} DERROTADO`, bd.final ? '…a porta está aberta.' : '+1 PONTO DE PERÍCIA · zona limpa', '#8fe08f');
      this.ui.feed(`CHEFE DERROTADO: ${bd.nome} (+1★)`, '#8fe08f');
      for (let k = 0; k < 3; k++) this.dropPickup('coin', 15 + e.lvl * 4, e.pos.x + (k - 1) * 8, e.pos.y);
      const z = ZONES[this.world.zoneIndexAt(e.pos.x, e.pos.y)];
      this.dropPickup('ore:' + defs.oreDaZona(z.lvl + 2), 2, e.pos.x + 12, e.pos.y + 6);
      this.dropPickup('meat', 2, e.pos.x - 12, e.pos.y + 6);
      // equipamento garantido acima do atual
      const loot = rollLoot(Math.max(1, z.lvl + 2), 'x', this.rng);
      const p = this.player;
      for (const gg of loot) {
        const cur = gg.slot === 'arma' ? p.equip.armaNivel : gg.slot === 'peitoral' ? p.equip.peitoralNivel : p.equip.arreioNivel;
        if (gg.nivel > cur) {
          if (gg.slot === 'arma') { p.equip.armaNivel = gg.nivel; p.equip.multArma = gg.mult; }
          else if (gg.slot === 'peitoral') { p.equip.peitoralNivel = gg.nivel; p.equip.multPeitoral = gg.mult; }
          else p.equip.arreioNivel = gg.nivel;
          this.ui.feed(`SPOILA DO CHEFE: ${gg.slot.toUpperCase()} NV.${gg.nivel}`, '#8fe08f');
        }
      }
      if (bd.final) this.victory();
      this.save(false);
      return;
    }
    const coins = 2 + Math.floor(this.rng() * 3) + e.lvl;
    this.dropPickup('coin', coins, e.pos.x, e.pos.y);
    if (this.rng() < 0.3) {
      const z = ZONES[this.world.zoneIndexAt(e.pos.x, e.pos.y)];
      this.dropPickup('ore:' + defs.oreDaZona(z.lvl), 1, e.pos.x + 4, e.pos.y);
    }
    if (this.rng() < 0.35) this.dropPickup('meat', 1, e.pos.x - 4, e.pos.y);
    if (e.guard) {
      const guards = this.enemies.filter(x => x.guard && !x.dead);
      if (guards.length === 0 && this.q2 === 1) {
        this.q2 = 2;
        this.ui.toast('A fera está livre! Alimente com 3 Ervas (E perto dela).');
        this.updateQuest();
      }
    }
    this.audio.sfx('coin');
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) {
        e.deadT -= dt;
        if (e.fade > 0) e.fade = Math.max(0, e.fade - dt);
        // respawn de camps (45s)
        if (e.camp && e.deadT <= 0) {
          e.dead = false; e.fade = 0;
          e.hp = e.maxHp;
          e.pos.x = e.home.x; e.pos.y = e.home.y;
          e.state = 'idle';
        }
        continue;
      }
      e.animT += dt;
      e.stT -= dt;
      e.shootCd -= dt; e.chargeCd -= dt; e.howlCd -= dt;
      if (e.buff > 0) e.buff -= dt;
      if (e.tired > 0) e.tired -= dt;
      if (e.pacify > 0) { e.pacify -= dt; continue; }
      const d = dist2d(p.pos.x, p.pos.y, e.pos.x, e.pos.y);
      const aggro = e.boss ? 110 : this.player.mounted ? 90 : 74;
      const spdOf = (k: Enemy2D) => {
        let s = k.speed * (k.boss && k.hp < k.maxHp * 0.35 ? 1.35 : 1);
        if (k.kind === 's') {
          let near = 0;
          for (const o of this.enemies) if (!o.dead && o !== k && o.kind === 's' && dist2d(o.pos.x, o.pos.y, k.pos.x, k.pos.y) < 70) near++;
          if (near >= 1) s *= 1.35;
        }
        if (k.kind === 'f' && k.mad) s *= 1.6;
        if (k.buff > 0) s *= 1.35;
        return s;
      };
      const enraged = e.boss && e.hp < e.maxHp * 0.35;
      const windupOf = (k: string) => (k === 'T' ? 0.9 : k === 'g' ? 0.6 : 0.5);
      const spdMul = enraged ? 1.35 : 1;
      switch (e.state) {
        case 'idle': {
          if (e.stT <= 0) {
            e.stT = 1.2 + this.rng() * 1.6;
            e.frame ^= 1;
            const a = this.rng() * Math.PI * 2;
            this.world.moveEntity(e.pos, Math.cos(a) * 6, Math.sin(a) * 6, 3);
          }
          if (e.kind === 'h' && e.howlCd <= 0 && d < aggro * 0.8) {
            e.howlCd = 8;
            for (const o of this.enemies) if (!o.dead && dist2d(o.pos.x, o.pos.y, e.pos.x, e.pos.y) < 70) o.buff = 4;
            this.ui.dmgNumber((e.pos.x - this.camX) * this.Z, (e.pos.y - this.camY) * this.Z - 24, '~', '#aee6ff');
          }
          if (!p.dead && (d < aggro || e.mad)) { e.state = 'chase'; }
          break;
        }
        case 'chase': {
          if (p.dead || (d > aggro * (e.boss ? 3.5 : 2.1) && !e.mad)) { e.state = 'return'; break; }
          if (e.kind === 'a') {
            if (d < 26) {
              const dx = (e.pos.x - p.pos.x) / d, dy = (e.pos.y - p.pos.y) / d;
              this.world.moveEntity(e.pos, dx * spdOf(e) * dt, dy * spdOf(e) * dt, 3);
            } else if (d <= 80) {
              if (e.shootCd <= 0) {
                e.shootCd = 2.2;
                const dx = (p.pos.x - e.pos.x) / d, dy = (p.pos.y - e.pos.y) / d;
                this.enemyArrow(e, dx, dy);
              }
              e.frame = Math.floor(e.animT * 4) % 2;
            } else {
              const dx = (p.pos.x - e.pos.x) / d, dy = (p.pos.y - e.pos.y) / d;
              this.world.moveEntity(e.pos, dx * spdOf(e) * dt, dy * spdOf(e) * dt, 3);
            }
            break;
          }
          if (e.kind === 'm') {
            let wounded: Enemy2D | null = null;
            for (const o of this.enemies) if (!o.dead && o !== e && o.hp < o.maxHp && dist2d(o.pos.x, o.pos.y, e.pos.x, e.pos.y) < 46) { wounded = o; break; }
            if (wounded) {
              wounded.hp = Math.min(wounded.maxHp, wounded.hp + 14 * dt);
              if (Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) {
                this.ui.dmgNumber((wounded.pos.x - this.camX) * this.Z, (wounded.pos.y - this.camY) * this.Z - 20, '+', '#8fe08f');
              }
            }
            if (d < 40) {
              const dx = (e.pos.x - p.pos.x) / d, dy = (e.pos.y - p.pos.y) / d;
              this.world.moveEntity(e.pos, dx * spdOf(e) * dt, dy * spdOf(e) * dt, 3);
            } else if (d > 90) {
              const dx = (p.pos.x - e.pos.x) / d, dy = (p.pos.y - e.pos.y) / d;
              this.world.moveEntity(e.pos, dx * spdOf(e) * 0.7 * dt, dy * spdOf(e) * 0.7 * dt, 3);
            }
            break;
          }
          if (e.kind === 'g' && e.chargeCd <= 0 && d < 70 && d > 16 && e.tired <= 0) {
            e.state = 'windup'; e.stT = windupOf('g'); break;
          }
          const reach = e.boss ? 24 : e.kind === 'T' ? 16 : 14;
          if (d < reach) { e.state = 'windup'; e.stT = enraged ? windupOf(e.kind) * 0.7 : windupOf(e.kind); }
          else {
            const dx = (p.pos.x - e.pos.x) / d, dy = (p.pos.y - e.pos.y) / d;
            this.world.moveEntity(e.pos, dx * spdOf(e) * dt, dy * spdOf(e) * dt, 3);
            e.frame = Math.floor(e.animT * 4) % 2;
          }
          break;
        }
        case 'windup': {
          if (e.stT <= 0) {
            if (e.kind === 'g') {
              e.state = 'charge'; e.chargeT = 0.5; e.chargeCd = 4;
              const dd = Math.max(1, d);
              e.chargeDx = (p.pos.x - e.pos.x) / dd; e.chargeDy = (p.pos.y - e.pos.y) / dd;
              break;
            }
            e.state = 'hit'; e.stT = 0.2;
            const reach = e.boss ? 30 : e.kind === 'T' ? 26 : 18;
            if (e.boss) this.rings.push({ x: e.pos.x, y: e.pos.y, t: 0 }); // slam em área
            if (d < reach && !p.dead) {
              const m = dmgMult(this.player.ne(), e.lvl);
              const dmg = Math.max(1, Math.round(e.dmg * (e.boss ? 1.3 : 1) * m.def));
              this.onPlayerDamage(dmg);
            }
          }
          break;
        }
        case 'charge': {
          e.chargeT -= dt;
          this.world.moveEntity(e.pos, e.chargeDx * 160 * dt, e.chargeDy * 160 * dt, 3);
          e.frame = Math.floor(e.animT * 12) % 2;
          if (dist2d(p.pos.x, p.pos.y, e.pos.x, e.pos.y) < 11 && !p.dead) {
            const m = dmgMult(this.player.ne(), e.lvl);
            this.onPlayerDamage(Math.max(1, Math.round(e.dmg * 1.3 * m.def)));
            e.chargeT = 0;
          }
          if (e.chargeT <= 0) { e.state = 'chase'; e.tired = 1.2; e.stT = 0.4; }
          break;
        }
        case 'hit': {
          if (e.stT <= 0) { e.state = 'chase'; e.stT = 0.9; }
          break;
        }
        case 'return': {
          const dh = dist2d(e.pos.x, e.pos.y, e.home.x, e.home.y);
          if (dh < 6) { e.state = 'idle'; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.5); e.mad = false; }
          else {
            const dx = (e.home.x - e.pos.x) / dh, dy = (e.home.y - e.pos.y) / dh;
            this.world.moveEntity(e.pos, dx * e.speed * 0.8 * dt, dy * e.speed * 0.8 * dt, 3);
          }
          break;
        }
      }
    }
  }

  private enemyArrow(e: Enemy2D, dx: number, dy: number) {
    this.projs.push({
      kind: 'earrow', x: e.pos.x, y: e.pos.y - 4,
      vx: dx * 95, vy: dy * 95, ttl: 1.3,
      dmg: Math.max(1, Math.round(e.dmg * 0.9)), weapon: this.player.arma, phase: 'out',
      hits: new Set<number>(), bounces: 0, rot: Math.atan2(dy, dx), tier: 0, hostile: true
    });
    this.audio.sfx('swing');
  }

  private mountDamage(dmg: number) {
    const m = this.mount;
    m.hp -= dmg;
    this.ui.dmgNumber((m.pos.x - this.camX) * this.Z, (m.pos.y - this.camY) * this.Z - 26, `-${dmg}`, '#ffb46a');
    if (m.hp <= 0) {
      m.hp = m.maxHp;
      this.player.mounted = false;
      m.pos.x = (POI2.vila.x - 14) * T; m.pos.y = (POI2.vila.y + 4) * T;
      this.ui.toast(`${m.nome} fugiu ferido para o Estábulo!`);
    }
  }

  private updateProjs(dt: number) {
    const p = this.player;
    for (const pr of this.projs) {
      pr.ttl -= dt;
      if (pr.kind === 'boomer') {
        if (pr.phase === 'out' && pr.ttl <= 0.45) { pr.phase = 'back'; pr.hits.clear(); }
        if (pr.phase === 'back') {
          const dx = p.pos.x - pr.x, dy = p.pos.y - pr.y;
          const d = Math.hypot(dx, dy);
          if (d < 8) { p.cooldown = Math.min(p.cooldown, 0.1); this.audio.sfx('pickup'); pr.ttl = -1; }
          else { pr.vx = (dx / d) * 150; pr.vy = (dy / d) * 150; }
        }
        pr.rot += dt * 16;
      }
      if (pr.kind === 'serra') pr.rot += dt * 24;
      if (pr.ttl <= 0) continue;
      const nx = pr.x + pr.vx * dt, ny = pr.y + pr.vy * dt;
      const solid = this.world.solidAt(nx, ny);
      if (solid === COLL.BLOCK || solid === COLL.WATER) {
        if (pr.kind === 'serra' && pr.bounces < 2) {
          pr.bounces++;
          pr.vx = -pr.vx; pr.vy += (this.rng() - 0.5) * 40;
          this.audio.sfx('swing');
        } else { pr.ttl = -1; continue; }
      } else { pr.x = nx; pr.y = ny; }
      if (pr.hostile) {
        if (!p.dead && dist2d(pr.x, pr.y, p.pos.x, p.pos.y - 3) < 8) {
          this.onPlayerDamage(pr.dmg);
          pr.ttl = -1;
        }
        continue;
      }
      for (const e of this.enemies) {
        if (e.dead || pr.hits.has(e.id)) continue;
        if (dist2d(pr.x, pr.y, e.pos.x, e.pos.y - 4) < 9) {
          pr.hits.add(e.id);
          if (pr.kind === 'corrente') {
            const dx = p.pos.x - e.pos.x, dy = p.pos.y - e.pos.y;
            const dd = Math.hypot(dx, dy) || 1;
            const pull = Math.min(24, dd - 10);
            if (pull > 0) this.world.moveEntity(e.pos, (dx / dd) * pull, (dy / dd) * pull, 3);
            this.hitEnemy(e, pr.dmg, false);
            pr.ttl = -1; break;
          }
          if (pr.kind === 'nota') { e.pacify = 4; this.hitEnemy(e, pr.dmg, false); continue; }
          this.hitEnemy(e, pr.dmg, false);
          if (pr.kind !== 'boomer' && pr.kind !== 'serra') { pr.ttl = -1; break; }
        }
      }
      if (pr.kind === 'chicote') {
        for (const h of this.world.herbs) {
          if (h.cd > this.time) continue;
          if (dist2d(pr.x, pr.y, h.x, h.y) < 10) {
            this.pickHerb(h);
            pr.ttl = -1; break;
          }
        }
      }
    }
    this.projs = this.projs.filter(x => x.ttl > 0);
  }

  private dropPickup(kind: string, val: number, x: number, y: number) {
    const a = this.rng() * Math.PI * 2;
    this.pickups.push({ kind, val, x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, t: 0 });
  }

  private updatePickups(dt: number) {
    const p = this.player;
    for (const pk of this.pickups) {
      pk.t += dt;
      pk.x += pk.vx * dt; pk.y += pk.vy * dt;
      pk.vx *= Math.pow(0.01, dt); pk.vy *= Math.pow(0.01, dt);
      const d = dist2d(pk.x, pk.y, p.pos.x, p.pos.y);
      if (pk.t > 0.4 && d < (this.hasSkill('imã') ? 60 : 30)) {
        pk.x += (p.pos.x - pk.x) * 8 * dt;
        pk.y += (p.pos.y - pk.y) * 8 * dt;
      }
      if (pk.t > 0.3 && d < 9) {
        this.collectPickup(pk);
        pk.got = true;
      }
    }
    this.pickups = this.pickups.filter(x => !x.got);
  }

  private collectPickup(pk: Pickup) {
    const p = this.player;
    if (pk.kind === 'coin') { p.cobres += pk.val; this.ui.feed(`VOCÊ RECEBE ${pk.val} ◉ COBRES`, '#ffe9a0'); }
    else if (pk.kind === 'meat') { p.res['carne'] = (p.res['carne'] || 0) + pk.val; this.ui.feed('VOCÊ RECEBE CARNE DE FERA', '#e8c8a0'); }
    else if (pk.kind.startsWith('ore:')) {
      const ore = pk.kind.slice(4);
      p.res[ore] = (p.res[ore] || 0) + pk.val;
      this.ui.feed(`VOCÊ RECEBE ${pk.val} X ${(ORES[ore]?.nome || ore).toUpperCase()}`, '#e8c8a0');
    }
    this.audio.sfx('coin');
  }

  private updateCommon(dt: number) {
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter(r => r.t < 0.45);
    this.updateNpcs(dt);
    for (const h of this.world.herbs) if (h.cd > 0 && this.time > h.cd + 45) h.cd = 0;
    for (const o of this.world.ores) if (o.cd > 0 && this.time > o.cd + 60) { o.cd = 0; o.uses = 3; }
    const mnt = this.mount;
    if (mnt.state === 'domado' && !this.player.mounted && !this.player.onBoat && this.state === 'play') {
      const d = dist2d(mnt.pos.x, mnt.pos.y, this.player.pos.x, this.player.pos.y);
      if (d > 26 && d < 320) {
        const dx = (this.player.pos.x - mnt.pos.x) / d, dy = (this.player.pos.y - mnt.pos.y) / d;
        this.world.moveEntity(mnt.pos, dx * 78 * dt, dy * 78 * dt, 4);
        mnt.animT += dt;
      }
    }
  }

  private updateBoat(dt: number, mx: number, my: number, moving: boolean) {
    const b = this.boat;
    if (moving) {
      const nx = b.x + mx * 64 * dt, ny = b.y + my * 64 * dt;
      if (this.world.isWater(nx, ny)) { b.x = nx; b.y = ny; }
    }
    this.player.pos.x = b.x; this.player.pos.y = b.y;
    if (this.input.pressed('KeyE')) {
      for (let r = 1; r < 6; r++) {
        for (let a = 0; a < Math.PI * 2; a += 0.4) {
          const lx = b.x + Math.cos(a) * r * 8, ly = b.y + Math.sin(a) * r * 8;
          if (!this.world.isWater(lx, ly) && this.world.solidAt(lx, ly) !== COLL.BLOCK) {
            b.boarded = false;
            this.player.onBoat = false;
            this.player.pos.x = lx; this.player.pos.y = ly;
            this.audio.sfx('splash');
            return;
          }
        }
      }
    }
  }

  private updateCamera(dt: number) {
    void dt;
    const p = this.player;
    const vw = this.canvas.width, vh = this.canvas.height;
    const tx = p.pos.x - vw / 2 + (this.mouseWorld.x - p.pos.x) * 0.1;
    const ty = p.pos.y - vh / 2 + (this.mouseWorld.y - p.pos.y) * 0.1;
    const cx = clamp(tx, 0, defs.MAP.W * T - vw);
    const cy = clamp(ty, 0, defs.MAP.H * T - vh);
    if (!this.camInit) { this.camX = cx; this.camY = cy; this.camInit = true; }
    this.camX += (cx - this.camX) * (1 - Math.pow(1e-8, 1 / 60));
    this.camY += (cy - this.camY) * (1 - Math.pow(1e-8, 1 / 60));
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  private render() {
    const g = this.g;
    const vw = this.canvas.width, vh = this.canvas.height;
    g.fillStyle = PAL.water1;
    g.fillRect(0, 0, vw, vh);
    const camX = Math.round(this.camX), camY = Math.round(this.camY);
    this.world.drawTerrain(g, camX, camY, vw, vh);

    type Item = { y: number; fn: () => void };
    const list: Item[] = [];

    // prédios
    for (const b of this.world.buildings) {
      if (b.x + b.w < camX - 16 || b.x > camX + vw + 16 || b.y + b.h < camY - 16 || b.y > camY + vh + 16) continue;
      if (b.tipo === 'carga' && b.dados.picked) continue;
      let key = b.key;
      if (b.tipo === 'fogueira') key = `b/fire${Math.floor(this.time * 6) % 2}`;
      if (b.tipo === 'dcrystal') key = `d/crystal${Math.floor(this.time * 3) % 2}`;
      if (b.tipo === 'bau' && b.dados.open) key = 'b/chestO';
      const bx = b.x, by = b.y;
      list.push({
        y: by + b.h, fn: () => {
          const spr = SPR[key];
          if (spr) g.drawImage(spr, Math.round(bx - camX), Math.round(by - camY));
        }
      });
    }
    // props
    for (const [chunk, props] of this.world.propsByChunk) {
      const ccx = (chunk % 16) * 24 * T, ccy = Math.floor(chunk / 16) * 24 * T;
      if (ccx > camX + vw + 40 || ccy > camY + vh + 40 || ccx + 24 * T < camX - 40 || ccy + 24 * T < camY - 40) continue;
      for (const pr of props) {
        const spr = SPR[pr.key];
        if (!spr) continue;
        const prx = pr.x, pry = pr.y, pkey = pr.key, pflip = !!pr.flip;
        list.push({
          y: pry, fn: () => {
            const s2 = pflip ? flipCache(pkey) : spr;
            g.drawImage(s2, Math.round(prx - s2.width / 2 - camX), Math.round(pry - s2.height - camY));
          }
        });
      }
    }
    // minérios e ervas
    for (const o of this.world.ores) {
      if (o.cd > 0) continue;
      if (o.x < camX - 20 || o.x > camX + vw + 20 || o.y < camY - 20 || o.y > camY + vh + 20) continue;
      const ox = o.x, oy = o.y, okey = `ore/${o.ore}`;
      list.push({
        y: oy, fn: () => {
          const s = SPR[okey];
          if (s) g.drawImage(s, Math.round(ox - 8 - camX), Math.round(oy - 10 - camY));
        }
      });
    }
    for (const h of this.world.herbs) {
      if (h.cd > 0) continue;
      if (h.x < camX - 12 || h.x > camX + vw + 12 || h.y < camY - 12 || h.y > camY + vh + 12) continue;
      const hx = h.x, hy = h.y, hkey = `herb/${h.kind}`;
      list.push({
        y: hy, fn: () => {
          const s = SPR[hkey] || SPR['herb/savana'];
          if (s) g.drawImage(s, Math.round(hx - 4 - camX), Math.round(hy - 8 - camY));
        }
      });
    }
    // barco
    if (!this.boat.boarded) {
      const bx = this.boat.x, by = this.boat.y;
      list.push({
        y: by + 6, fn: () => {
          const s = SPR['b/boat'];
          if (s) g.drawImage(s, Math.round(bx - 13 - camX), Math.round(by - 12 - camY + Math.sin(this.time * 2) * 1.5));
        }
      });
    }
    // inimigos
    for (const e of this.enemies) {
      if (e.pos.x < camX - 24 || e.pos.x > camX + vw + 24 || e.pos.y < camY - 24 || e.pos.y > camY + vh + 24) continue;
      const ex = e.pos.x, ey = e.pos.y;
      list.push({ y: ey, fn: () => this.drawEnemy(g, e, ex, ey, camX, camY) });
    }
    // ronceiro (companheiro / montado)
    {
      const mx = this.mount.pos.x, my = this.mount.pos.y;
      list.push({
        y: this.player.mounted ? my - 4 : my, fn: () => {
          const f0 = Math.floor(this.mount.animT * 4) % 2;
          const key = this.mount.kind === 'ronceiro'
            ? (this.mount.state === 'domado' ? `m/s${f0}` : 'm/0')
            : (this.mount.state === 'domado' ? `mts/${this.mount.kind}/${f0}` : `mt/${this.mount.kind}/${f0}`);
          let spr = SPR[key] || SPR['m/0'];
          if (!spr) return;
          const flip = this.mouseWorld.x < mx;
          const s2 = flip ? flipCache(key) : spr;
          g.drawImage(s2, Math.round(mx - s2.width / 2 - camX), Math.round(my - s2.height + 2 - camY));
          if (this.mount.state === 'ferido') {
            g.fillStyle = '#ff4a3a';
            g.fillRect(Math.round(mx - camX - 1), Math.round(my - camY - s2.height - 2), 2, 2);
          }
        }
      });
    }
    // curral (montarias selvagens visíveis)
    for (const pb of this.penBeasts) {
      if (pb.x < camX - 24 || pb.x > camX + vw + 24 || pb.y < camY - 24 || pb.y > camY + vh + 24) continue;
      if (this.mountStates[pb.id]?.state === 'domado') continue;
      const px2 = pb.x, py2 = pb.y, pid = pb.id;
      list.push({
        y: py2, fn: () => {
          const spr = SPR[`mt/${pid}/0`];
          if (!spr) return;
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(Math.round(px2 - 5 - camX), Math.round(py2 - camY) - 1, 10, 2);
          g.drawImage(spr, Math.round(px2 - spr.width / 2 - camX), Math.round(py2 - spr.height - camY));
        }
      });
    }
    // fauna
    for (const an of this.world.animals) {
      if (an.x < camX - 16 || an.x > camX + vw + 16 || an.y < camY - 16 || an.y > camY + vh + 16) continue;
      const ax = an.x, ay = an.y, ak = an.kind;
      list.push({
        y: ay, fn: () => {
          const f = Math.floor(this.time * 2 + ax * 0.13) % 2;
          const spr = SPR[`a/${ak}${f}`];
          if (!spr) return;
          g.fillStyle = 'rgba(0,0,0,0.2)';
          g.fillRect(Math.round(ax - 2 - camX), Math.round(ay - camY) - 1, 4, 1);
          g.drawImage(spr, Math.round(ax - spr.width / 2 - camX), Math.round(ay - spr.height - camY));
        }
      });
    }
    // NPCs
    for (const n of this.npcs) {
      if (n.x < camX - 20 || n.x > camX + vw + 20 || n.y < camY - 24 || n.y > camY + vh + 20) continue;
      const nn = n;
      list.push({
        y: nn.y, fn: () => {
          const flip = this.mouseWorld.x < nn.x;
          const spr = SPR[flip ? 'v/r0' : `v/r${nn.frame}`] || SPR['v/d0'];
          if (!spr) return;
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(Math.round(nn.x - 3 - camX), Math.round(nn.y - camY) - 1, 6, 2);
          g.drawImage(spr, Math.round(nn.x - spr.width / 2 - camX), Math.round(nn.y - spr.height - camY));
          // placa de nome perto
          if (dist2d(this.player.pos.x, this.player.pos.y, nn.x, nn.y) < 70) {
            g.fillStyle = 'rgba(10,14,18,0.75)';
            const tw = nn.nome.length * 4 + 6;
            const tx0 = Math.round(nn.x - tw / 2 - camX), ty0 = Math.round(nn.y - camY) - spr.height - 10;
            g.fillRect(tx0, ty0, tw, 9);
            g.fillStyle = '#ffe08a';
            g.font = '8px "VT323", monospace';
            g.textAlign = 'center';
            g.fillText(nn.nome, Math.round(nn.x - camX), ty0 + 8);
            g.textAlign = 'left';
          }
        }
      });
    }
    // jogador
    list.push({ y: this.player.pos.y, fn: () => this.drawPlayer(g, camX, camY) });
    // projéteis
    for (const pr of this.projs) {
      const prr = pr;
      list.push({ y: prr.y + 1, fn: () => this.drawProj(g, prr, camX, camY) });
    }
    // pickups
    for (const pk of this.pickups) {
      const pkk = pk;
      list.push({
        y: pkk.y, fn: () => {
          const bob = Math.sin(pkk.t * 6) * 1.5;
          if (pkk.kind === 'coin') { const s = SPR['i/coin']; if (s) g.drawImage(s, Math.round(pkk.x - 4 - camX), Math.round(pkk.y - 8 - camY + bob)); }
          else if (pkk.kind === 'meat') { const s = SPR['i/meat']; if (s) g.drawImage(s, Math.round(pkk.x - 5 - camX), Math.round(pkk.y - 7 - camY + bob)); }
          else if (pkk.kind.startsWith('ore:')) { const s = SPR[`ore/${pkk.kind.slice(4)}`]; if (s) g.drawImage(s, Math.round(pkk.x - 8 - camX), Math.round(pkk.y - 10 - camY + bob)); }
        }
      });
    }

    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.fn();

    // ondas de choque dos chefes
    for (const r of this.rings) {
      const a = Math.max(0, 1 - r.t / 0.45);
      g.strokeStyle = `rgba(255,120,80,${a})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(Math.round(r.x - camX), Math.round(r.y - camY), Math.round(8 + r.t * 140), 0, Math.PI * 2);
      g.stroke();
    }
    g.lineWidth = 1;

    // fade de teleporte (porões)
    if (this.tele) {
      const a = this.tele.mid ? Math.max(0, 1 - (this.tele.t - 0.3) / 0.45) : Math.min(1, this.tele.t / 0.3);
      g.fillStyle = `rgba(4,4,8,${Math.min(1, a)})`;
      g.fillRect(0, 0, vw, vh);
    }

    // mira
    if (this.state === 'play' && !this.uiOpen()) {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      const mx = Math.round(this.mouseWorld.x - camX), my = Math.round(this.mouseWorld.y - camY);
      g.fillRect(mx - 3, my, 2, 1); g.fillRect(mx + 2, my, 2, 1);
      g.fillRect(mx, my - 3, 1, 2); g.fillRect(mx, my + 2, 1, 2);
    }

    this.ui.updateHUD(this);
    this.updatePrompt();
  }

  private drawPlayer(g: CanvasRenderingContext2D, camX: number, camY: number) {
    const p = this.player;
    if (p.onBoat) {
      const s = SPR['b/boat'];
      if (s) g.drawImage(s, Math.round(p.pos.x - 13 - camX), Math.round(p.pos.y - 12 - camY + Math.sin(this.time * 2) * 1.5));
    }
    const adx = Math.cos(p.aim), ady = Math.sin(p.aim);
    if (Math.abs(ady) > 0.5) p.dir = ady < 0 ? 'u' : 'd';
    else { p.dir = 's'; p.flip = adx < 0; }
    const frame = (p.animT * 2 % 1) > 0.5 ? 1 : 0;
    let key = p.dir === 'u' ? `p/${p.race.id}/u0` : p.dir === 's' ? `p/${p.race.id}/r${frame}` : `p/${p.race.id}/d${frame}`;
    let spr = SPR[key] || SPR[`p/${p.race.id}/d0`];
    if (!spr) return;
    if (p.dir === 's' && p.flip) spr = flipCache(key);
    const bob = p.rollT >= 0 ? 2 : frame ? -1 : 0;
    const rideOff = p.mounted ? -3 : 0;
    const sx = Math.round(p.pos.x - spr.width / 2 - camX);
    const sy = Math.round(p.pos.y - spr.height - camY - bob + rideOff);
    if (!p.mounted) {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(sx + 1, Math.round(p.pos.y - camY) - 1, spr.width - 2, 2);
    }
    if (p.hurtT > 0 && Math.floor(p.hurtT * 20) % 2 === 0) g.globalAlpha = 0.55;
    g.drawImage(spr, sx, sy);
    g.globalAlpha = 1;
    // arma
    if (p.swingT >= 0 && p.swingT < 1) {
      const ang = p.aim + (-1.4 + 2.8 * p.swingT) * (p.swingHeavy ? 0.8 : 1);
      this.drawWeaponAt(g, p.arma, p.pos.x - camX, p.pos.y - 5 - camY, ang);
    } else if (p.arma.proj && (p.arma.proj === 'boomer' || p.arma.proj === 'serra')) {
      this.drawWeaponAt(g, p.arma, p.pos.x - camX, p.pos.y - 5 - camY, p.aim + Math.PI / 2 + Math.sin(this.time * 2) * 0.1);
    }
  }

  private drawWeaponAt(g: CanvasRenderingContext2D, arma: WeaponDef, x: number, y: number, ang: number) {
    const tier = clamp(this.player.equip.armaNivel - 1, 0, 9);
    const s = SPR[`w/${arma.id}/${tier}`] || SPR[`w/${arma.id}`];
    if (!s) return;
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.rotate(ang);
    g.drawImage(s, 2, -Math.floor(s.height / 4), Math.floor(s.width / 2), Math.floor(s.height / 2));
    g.restore();
  }

  private drawEnemy(g: CanvasRenderingContext2D, e: Enemy2D, wx: number, wy: number, camX: number, camY: number) {
    if (e.dead && e.fade <= 0) return;
    const key = e.boss && SPR[e.bkey] ? e.bkey : `e/${e.kind}${e.frame}`;
    const spr = SPR[key];
    if (!spr) return;
    const p = this.player;
    const flip = p.pos.x < wx;
    const s2 = flip ? flipCache(key) : spr;
    const sc = e.scale * (e.elite ? 1.18 : 1);
    const dw = Math.round(s2.width * sc), dh = Math.round(s2.height * sc);
    const sx = Math.round(wx - dw / 2 - camX);
    const sy = Math.round(wy - dh - camY);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(sx + 1, Math.round(wy - camY) - 1, dw - 2, 2);
    if (e.dead) {
      g.globalAlpha = Math.max(0, Math.min(1, e.fade * 1.7));
      g.drawImage(s2, sx, sy + 3, dw, dh);
      g.globalAlpha = 1;
      return;
    }
    const shake = e.state === 'windup' ? Math.round(Math.sin(this.time * 40) * 1) : 0;
    // aura de chefe
    if (e.boss) {
      const pul = 0.25 + 0.12 * Math.sin(this.time * 5);
      g.fillStyle = `rgba(255,80,50,${pul})`;
      g.beginPath();
      g.ellipse(sx + dw / 2, Math.round(wy - camY) - 1, dw * 0.62, 5, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.drawImage(s2, sx + shake, sy, dw, dh);
    if (e.boss) {
      g.fillStyle = '#ffd23a';
      g.font = 'bold 9px monospace';
      g.textAlign = 'center';
      g.fillText('♛', sx + dw / 2, sy - 5);
      g.textAlign = 'left';
    }
    if (e.buff > 0 && Math.floor(this.time * 4) % 2 === 0) {
      g.fillStyle = '#aee6ff';
      g.font = 'bold 7px monospace';
      g.fillText('~', sx + dw - 2, sy - 2);
    }
    if (e.state === 'windup') {
      g.fillStyle = '#ff4a3a';
      g.font = 'bold 7px monospace';
      g.fillText('!', sx + s2.width / 2 - 1, sy - 3);
    }
    if (e.pacify > 0) {
      g.fillStyle = '#aee6ff';
      g.font = 'bold 7px monospace';
      g.fillText('~', sx + s2.width / 2 - 1, sy - 3);
    }
    const d = dist2d(p.pos.x, p.pos.y, wx, wy);
    if (e.hp < e.maxHp || d < 60) {
      const m = dmgMult(this.player.ne(), e.lvl);
      g.fillStyle = '#000';
      g.fillRect(sx, sy - 6, dw, 3);
      g.fillStyle = m.tier >= 3 ? '#8a8a92' : m.tier >= 2 ? '#c8b840' : e.hp / e.maxHp > 0.5 ? '#6ac24a' : '#c23a2a';
      g.fillRect(sx + 1, sy - 5, Math.max(1, Math.round((dw - 2) * e.hp / e.maxHp)), 1);
      if (m.tier >= 3) {
        g.fillStyle = '#ff8a7a';
        g.font = 'bold 6px monospace';
        g.fillText('☠', sx + s2.width + 1, sy - 3);
      }
    }
  }

  private drawProj(g: CanvasRenderingContext2D, pr: Proj2D, camX: number, camY: number) {
    const x = Math.round(pr.x - camX), y = Math.round(pr.y - camY);
    g.save();
    g.translate(x, y);
    g.rotate(pr.kind === 'boomer' || pr.kind === 'serra' ? pr.rot : Math.atan2(pr.vy, pr.vx));
    switch (pr.kind) {
      case 'arrow': case 'bolt':
        g.fillStyle = '#8a6a3a'; g.fillRect(-5, 0, 9, 1);
        g.fillStyle = '#e8e8f0'; g.fillRect(4, 0, 2, 1);
        break;
      case 'earrow':
        g.fillStyle = '#4a3a3a'; g.fillRect(-5, 0, 9, 1);
        g.fillStyle = '#ff6a5a'; g.fillRect(4, 0, 2, 1);
        break;
      case 'boomer': {
        const ts = SPR[`w/${pr.weapon.id}/${pr.tier}`];
        if (ts) g.drawImage(ts, -5, -5, 10, 10);
        else { g.fillStyle = '#d8a44a'; g.fillRect(-3, -2, 6, 1); g.fillRect(-3, 1, 6, 1); g.fillRect(-4, -1, 1, 2); g.fillRect(3, -1, 1, 2); }
        break;
      }
      case 'serra': {
        const ts = SPR[`w/${pr.weapon.id}/${pr.tier}`];
        if (ts) g.drawImage(ts, -6, -6, 12, 12);
        else { g.fillStyle = '#9aa8b0'; g.fillRect(-4, -1, 8, 2); g.fillRect(-1, -4, 2, 8); g.fillStyle = '#fff'; g.fillRect(0, -1, 1, 1); }
        break;
      }
      case 'corrente':
        g.fillStyle = '#4a4e56'; g.fillRect(-2, -2, 4, 4);
        g.fillStyle = '#707880'; g.fillRect(-1, -1, 2, 2);
        break;
      case 'chicote':
        g.fillStyle = '#6a4a2a'; for (let i = 0; i < 4; i++) g.fillRect(-6 + i * 3, 0, 2, 1);
        break;
      case 'nota':
        g.fillStyle = '#fff'; g.fillRect(-2, -2, 3, 3);
        g.fillStyle = '#ffe08a'; g.fillRect(1, 0, 2, 2);
        break;
    }
    g.restore();
  }

  // ------------------------------------------------------------
  // INTERAÇÃO
  // ------------------------------------------------------------
  private uiOpen(): boolean {
    return this.ui.panelWrap.style.display === 'flex' || this.ui.dialogEl.style.display === 'block';
  }
  resume() { this.state = 'play'; this.ui.closePanel(); this.ui.closeDialog(); }

  private nearInteract(): { tipo: string; a?: any } | null {
    const p = this.player;
    const px = p.pos.x, py = p.pos.y;
    for (const b of this.world.buildings) {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const r = Math.max(b.w, b.h) / 2 + 14;
      if (dist2d(px, py, cx, cy) < r) {
        if (b.tipo === 'forja') return { tipo: 'forja' };
        if (b.tipo === 'estabulo') return { tipo: 'estabulo' };
        if (b.tipo === 'fogueira') return { tipo: 'fogueira' };
        if (b.tipo === 'brais') return { tipo: 'brais' };
        if (b.tipo === 'carga') {
          if (b.dados.picked) continue;
          return { tipo: 'carga', a: b };
        }
        if (b.tipo === 'bau') {
          const campId = this.campOfChest(b);
          if (!this.campCleared(campId)) return { tipo: 'bau_lock' };
          if (b.dados.open) return null;
          return { tipo: 'bau', a: b };
        }
      }
    }
    for (const n of this.npcs) if (dist2d(px, py, n.x, n.y) < 16) return { tipo: 'npc', a: n };
    for (const b of this.penBeasts) if (dist2d(px, py, b.x, b.y) < 16) return { tipo: 'beast', a: b };
    for (const b of this.world.buildings) {
      if (b.tipo !== 'porta') continue;
      if (dist2d(px, py, b.x + b.w / 2, b.y + b.h) < 40) return { tipo: 'porta' };
    }
    for (const dn of this.world.dens) if (dist2d(px, py, dn.x, dn.y) < 18) return { tipo: 'dhole', a: dn };
    for (const b of this.world.buildings) {
      if (b.tipo === 'dbau' && dist2d(px, py, b.x + b.w / 2, b.y + b.h) < 20) {
        if (b.dados.open) return null;
        return { tipo: 'dbau', a: b };
      }
      if (b.tipo === 'dcrystal' && dist2d(px, py, b.x + b.w / 2, b.y + b.h) < 18) return { tipo: 'dout', a: b };
    }
    if (dist2d(px, py, this.boat.x, this.boat.y) < 20 && !p.onBoat) return { tipo: 'boat' };
    for (const o of this.world.ores) if (o.cd <= 0 && dist2d(px, py, o.x, o.y) < 14) return { tipo: 'ore', a: o };
    for (const h of this.world.herbs) if (h.cd <= 0 && dist2d(px, py, h.x, h.y) < 12) return { tipo: 'herb', a: h };
    if (this.mount.state === 'domado' && !this.player.mounted && dist2d(px, py, this.mount.pos.x, this.mount.pos.y) < 20) return { tipo: 'mount' };
    return null;
  }

  private campOfChest(b: any): string {
    for (const c of this.world.camps) {
      if (dist2d(b.x, b.y, c.x, c.y) < 110) return c.id;
    }
    return this.world.camps[0]?.id || '';
  }
  private campCleared(id: string): boolean {
    return !this.enemies.some(e => e.camp === id && !e.dead);
  }

  private updatePrompt() {
    if (this.state !== 'play' || this.uiOpen()) { this.ui.prompt(null); return; }
    const p = this.player;
    if (p.onBoat) { this.ui.prompt('<b>E</b> DESEMBARCAR'); return; }
    if (this.player.mounted) { this.ui.prompt(`<b>E</b> DESMONTAR · <b>Q</b> FÚRIA ${this.mount.bond >= 4 ? '' : '(V4)'} · <b>F</b> ALIMENTAR`); return; }
    if (this.mount.state === 'ferido' && this.q2 === 2 && dist2d(p.pos.x, p.pos.y, this.mount.pos.x, this.mount.pos.y) < 20) {
      this.ui.prompt(`<b>E</b> OFERECER ERVA 🌿 (${this.mount.fed}/3)`); return;
    }
    const n = this.nearInteract();
    if (!n) { this.ui.prompt(null); return; }
    switch (n.tipo) {
      case 'forja': this.ui.prompt('<b>E</b> FORJA'); break;
      case 'estabulo': this.ui.prompt('<b>E</b> ESTÁBULO'); break;
      case 'fogueira': this.ui.prompt('<b>E</b> FOGUEIRA — DESCANSAR & SALVAR'); break;
      case 'brais': this.ui.prompt('<b>E</b> FALAR COM BRAIS'); break;
      case 'npc': this.ui.prompt(`<b>E</b> FALAR COM ${n.a.nome.toUpperCase()}`); break;
      case 'porta': {
        const aberta = this.bossesKilled.has('umbigo');
        this.ui.prompt(aberta ? '<b>E</b> ATRAVESSAR A PORTA' : `☠ O PORTEIRO te encara… (${this.bossesKilled.size}/10 Sigilas)`);
        break;
      }
      case 'dhole': {
        const d = DUNGEONS.find(dd => dd.id === n.a.id)!;
        this.ui.prompt(`<b>E</b> DESCER: ${d.nome} (Nv.${d.lvl})`);
        break;
      }
      case 'dbau': this.ui.prompt('<b>E</b> ABRIR BAÚ DO PORÃO'); break;
      case 'dout': this.ui.prompt('<b>E</b> SUBIR PRA SUPERFÍCIE'); break;
      case 'beast': {
        const id = n.a.id as string;
        this.ui.prompt(id === 'javalina' ? '<b>E</b> DAR CARNE 🍖 À JAVALINA' : 'BUFELO — treine pesado contra feras (RMB)');
        break;
      }
      case 'carga': this.ui.prompt(this.q1 === 1 ? '<b>E</b> RECOLHER CARGA DO COMBOIO' : 'CARGA DO COMBOIO… (fale com Brais)'); break;
      case 'bau': this.ui.prompt('<b>E</b> ABRIR BAÚ DE CARGA'); break;
      case 'bau_lock': this.ui.prompt('🔒 LIMPE O ACAMPAMENTO PRIMEIRO'); break;
      case 'boat': this.ui.prompt('<b>E</b> EMBARCAR'); break;
      case 'ore': this.ui.prompt(`<b>E</b> MINERAR (${n.a.uses})`); break;
      case 'herb': this.ui.prompt('<b>E</b> COLHER ERVA'); break;
      case 'mount': this.ui.prompt(`<b>E</b> MONTAR ${this.mount.nome.toUpperCase()}`); break;
    }
  }

  private tryInteract() {
    const n = this.nearInteract();
    if (!n) return;
    switch (n.tipo) {
      case 'forja': this.ui.showForge(this); break;
      case 'estabulo': this.ui.showStable(this); break;
      case 'fogueira': this.rest(); break;
      case 'brais': this.braisDialog(); break;
      case 'npc': {
        const npc = n.a as Npc;
        if (npc.nome.includes('DOMADOR')) { this.keeperDialog(); break; }
        this.ui.dialogFace(npc.nome, npc.face, npc.linhas[npc.li % npc.linhas.length], [{ label: 'ATE LOGO', cb: () => { } }]);
        npc.li++;
        this.audio.sfx('ui');
        break;
      }
      case 'beast': this.interactBeast(n.a); break;
      case 'dhole': this.enterDungeon(n.a.id); break;
      case 'dbau': this.openDungeonChest(n.a); break;
      case 'dout': this.exitDungeon(n.a.dados.den); break;
      case 'porta': {
        if (this.bossesKilled.has('umbigo')) {
          if (!this.won) this.victory();
          else this.ui.toast('A porta já é sua. O Bravo é infinito pra quem voltou.');
        } else {
          this.ui.dialogFace('A PORTA', 0, 'Ela não trava. Ela apenas <b>espera</b>. O PORTEIRO é a última pergunta — e ele já viu você chegando.', [{ label: 'FECHAR', cb: () => { } }]);
        }
        break;
      }
      case 'carga': this.pickCarga(n.a); break;
      case 'bau': this.openChest(n.a); break;
      case 'boat':
        this.boat.boarded = true;
        this.player.onBoat = true;
        this.runStats.boated = true;
        this.audio.sfx('splash');
        break;
      case 'ore': this.mineOre(n.a); break;
      case 'herb': this.pickHerb(n.a); break;
      case 'mount':
        this.player.mounted = true;
        this.audio.sfx('gallop');
        break;
    }
  }

  rest() {
    this.player.hp = this.player.maxHp;
    this.player.sta = this.player.maxSta;
    this.mount.hp = this.mount.maxHp;
    this.save(false);
    this.ui.toast('Você descansa junto ao fogo. (SALVO)');
    this.audio.sfx('quest');
  }

  private pickCarga(b: any) {
    const p = this.player;
    if (this.q1 !== 1) { this.ui.toast('A carga pertence ao comboio. Fale com Brais primeiro.'); return; }
    b.dados.picked = true;
    p.cargas++;
    this.audio.sfx('pickup');
    this.ui.feed(`VOCÊ RECUPERA UMA CARGA (${p.cargas}/3)`, '#ffe9a0');
    if (p.cargas === 1) this.spawnAmbush();
    if (p.cargas >= 3) {
      this.q1 = 2;
      this.ui.toast('CARGA COMPLETA! Leve ao Brais.');
      this.updateQuest();
    }
  }

  private spawnAmbush() {
    const wx = POI2.wreck.x * T, wy = POI2.wreck.y * T;
    this.addEnemy('s', 2, wx + 28, wy + 14, null, false);
    this.addEnemy('s', 2, wx - 26, wy + 18, null, false);
    this.ui.toast('⚠ A CORJA FECHA O CERCO!');
    this.audio.sfx('hurt');
  }

  private feedRonceiro() {
    const p = this.player;
    if ((p.res['erva'] || 0) <= 0) { this.ui.toast('Sem ervas. Colha as brilhantes.'); return; }
    p.res['erva']--;
    this.mount.fed++;
    this.mount.hp = clamp(this.mount.hp + 30, 0, this.mount.maxHp);
    this.audio.sfx('eat');
    if (this.mount.fed >= 3) {
      this.mount.state = 'domado';
      this.mount.bond = 1;
      this.mountStates['ronceiro'] = { state: 'domado', bond: 1, bondXp: 0, hp: this.mount.hp };
      this.q2 = 3;
      this.gainLeguas(30);
      this.audio.sfx('tame');
      this.ui.zoneTitle('PRIMEIRA MONTARIA', 'Brumário, o Ronceiro — seu para sempre. E para GALOPAR.', '#8fe08f');
      this.ui.feed('VOCÊ DOMA: BRUMÁRIO, O RONCEIRO', '#8fe08f');
      this.updateQuest();
      this.save(false);
    } else {
      this.ui.feed(`O RONCEIRO ACEITA A ERVA (${this.mount.fed}/3)`, '#bfe8ff');
    }
  }

  braisDialog() {
    const p = this.player;
    const bonus = 1 + (p.race.cobreBonus || 0);
    if (this.q1 === 0) {
      this.ui.dialogFace('MESTRE-GUIA BRAIS', 13, 'Você chegou na hora errada, recruta. Um comboio foi massacrado a noroeste. A carga está espalhada — e a Corja farejando. A regra número um: <b>quem volta, volta trazendo.</b>',
        [{ label: 'ACEITO A NOTA DE CARGA', cb: () => { this.q1 = 1; this.updateQuest(); this.audio.sfx('quest'); } },
        { label: 'PRECISO ME PREPARAR', cb: () => { } }]);
    } else if (this.q1 === 1) {
      this.ui.dialogFace('MESTRE-GUIA BRAIS', 13, `A carga está no destroço, a noroeste da vila. ${p.cargas}/3 recuperadas.`,
        [{ label: 'ESTOU INDO', cb: () => { } }]);
    } else if (this.q1 === 2) {
      const cob = Math.round(60 * bonus);
      this.ui.dialogFace('MESTRE-GUIA BRAIS', 13, 'Pelo Bravo… você voltou. E voltou TRAZENDO. Tome seu pagamento. E recruta: um Ronceiro ferido está cercado pela Corja a leste. Salve-o, e ele salvará você.',
        [{
          label: `ENTREGAR CARGA (+${cob}◉ · +40 LÉGUAS)`, cb: () => {
            p.cargas = 0;
            p.cobres += cob;
            p.res['ferro'] = (p.res['ferro'] || 0) + 2;
            this.gainLeguas(40);
            this.q1 = 3; this.q2 = 1;
            this.audio.sfx('quest');
            this.ui.feed(`ENTREGA COMPLETA · +${cob} COBRES · +2 FERRO`, '#ffe9a0');
            this.updateQuest();
          }
        }]);
    } else {
      this.ui.dialogFace('MESTRE-GUIA BRAIS', 13, 'Sandbox aberto, recruta: todas as trilhas do Bravo estão abertas. Minere, forje, dome. O Umbigo espera os Nv.12+. E leve carne — R come.',
        [{ label: 'ENTENDIDO', cb: () => { } }]);
    }
  }

  private openChest(b: any) {
    if (b.dados.open) return;
    b.dados.open = true;
    const lvl = b.dados.lvl || 2;
    this.audio.sfx('open');
    const loot = rollLoot(lvl, lvl >= 4 ? 'x' : 'toca', this.rng);
    const p = this.player;
    for (const gg of loot) {
      const cur = gg.slot === 'arma' ? p.equip.armaNivel : gg.slot === 'peitoral' ? p.equip.peitoralNivel : p.equip.arreioNivel;
      const nome = gearNomeSys(gg.slot, gg.nivel, gg.prefixo);
      if (gg.nivel > cur) {
        if (gg.slot === 'arma') { p.equip.armaNivel = gg.nivel; p.equip.multArma = gg.mult; }
        else if (gg.slot === 'peitoral') { p.equip.peitoralNivel = gg.nivel; p.equip.multPeitoral = gg.mult; }
        else p.equip.arreioNivel = gg.nivel;
        this.ui.feed(`VOCÊ EQUIPA: ${nome.toUpperCase()}`, '#8fe08f');
        this.audio.sfx('level');
      } else {
        p.cobres += gg.nivel * 4;
        this.ui.feed(`+${gg.nivel * 4} ◉ (${nome} repetido)`, '#ffe9a0');
      }
    }
    const cob = 8 + lvl * 3;
    p.cobres += cob;
    const z = ZONES[this.world.zoneIndexAt(b.x, b.y)];
    const ore = defs.oreDaZona(z.lvl);
    p.res[ore] = (p.res[ore] || 0) + 2;
    p.res['carne'] = (p.res['carne'] || 0) + 1;
    this.ui.feed(`VOCÊ RECEBE ${cob} ◉ · 2 ${(ORES[ore]?.nome || ore).toUpperCase()} · CARNE`, '#ffe9a0');
    this.ui.toast('CARGA DA CORJA RECUPERADA!');
  }

  private mineOre(o: any) {
    if (o.uses <= 0) return;
    const p = this.player;
    const q = 1 + (this.hasSkill('min1') ? 1 : 0);
    p.res[o.ore] = (p.res[o.ore] || 0) + q;
    o.uses--;
    this.audio.sfx('hit');
    this.ui.feed(`VOCÊ RECEBE ${q} X ${(ORES[o.ore]?.nome || o.ore).toUpperCase()}`, '#e8c8a0');
    if (o.uses <= 0) o.cd = this.time;
  }

  private pickHerb(h: any) {
    const p = this.player;
    const q = this.hasSkill('col1') ? 2 : 1;
    p.res['erva'] = (p.res['erva'] || 0) + q;
    h.cd = this.time;
    this.audio.sfx('pickup');
    this.ui.feed(`VOCÊ RECEBE ${q} X ERVA-DE-KURNIS`, '#bfe8ff');
  }

  sellAllOres() {
    const p = this.player;
    let total = 0;
    for (const [k, v] of Object.entries(p.res)) {
      if (ORES[k] && (v as number) > 0) {
        total += ORES[k].valor * (v as number);
        p.res[k] = 0;
      }
    }
    if (total > 0) {
      p.cobres += total;
      this.audio.sfx('coin');
      this.ui.toast(`MINÉRIOS VENDIDOS: +${total} ◉`);
    }
  }

  forgeDisc(): number {
    return (this.player.race?.troncudo ? 0.9 : 1) * (this.hasSkill('forja1') ? 0.85 : 1);
  }

  forgeUpgrade(slot: 'arma' | 'peitoral') {
    const p = this.player;
    const disc = this.forgeDisc();
    const cost = upgradeCost(slot, slot === 'arma' ? p.equip.armaNivel : p.equip.peitoralNivel);
    const cobres = Math.round(cost.cobres * disc);
    if (p.cobres < cobres || (p.res['ferro'] || 0) < cost.ferro) {
      this.ui.toast(`FALTAM MATERIAIS: ${cobres}◉ + ${cost.ferro}⛓`);
      this.audio.sfx('ui');
      return;
    }
    p.cobres -= cobres;
    p.res['ferro'] -= cost.ferro;
    if (slot === 'arma') p.equip.armaNivel++; else p.equip.peitoralNivel++;
    this.audio.sfx('level');
    this.ui.toast(`${slot === 'arma' ? 'LÂMINA' : 'COURAÇA'} NV.${slot === 'arma' ? p.equip.armaNivel : p.equip.peitoralNivel}!`);
    this.save(false);
    this.ui.showForge(this);
  }

  stableHeal() {
    if (this.player.cobres < 5) { this.ui.toast('SEM COBRES (5◉)'); return; }
    this.player.cobres -= 5;
    this.mount.hp = this.mount.maxHp;
    this.audio.sfx('eat');
    this.ui.toast(`${this.mount.nome} CURADO!`);
  }
  stableRename(nome: string) { this.mount.nome = nome; this.ui.toast(`A MONTARIA ATENDE POR ${nome.toUpperCase()}`); }

  feedMount() {
    const p = this.player;
    if (p.res['erva'] > 0) {
      p.res['erva']--;
      this.mount.hp = clamp(this.mount.hp + 25, 0, this.mount.maxHp);
      this.mount.bondXp += 5;
      this.checkBond();
      this.audio.sfx('eat');
      this.ui.feed('VOCÊ ALIMENTA A MONTARIA (+25)', '#bfe8ff');
    }
  }

  mountFuria() {
    this.furiaCd = 8;
    this.audio.sfx('gallop');
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2d(e.pos.x, e.pos.y, this.player.pos.x, this.player.pos.y) < 30) {
        const dx = e.pos.x - this.player.pos.x, dy = e.pos.y - this.player.pos.y;
        const d = Math.hypot(dx, dy) || 1;
        this.world.moveEntity(e.pos, (dx / d) * 18, (dy / d) * 18, 3);
        this.hitEnemy(e, 15 + this.mount.bond * 3, true);
        e.pacify = 1.2;
      }
    }
    this.ui.toast('FÚRIA DO RONCEIRO!');
  }

  hasSkill(id: string): boolean { return this.learned.has(id); }

  learnSkill(id: string) {
    const def = SKILLS.find(s => s.id === id);
    if (!def || this.learned.has(id)) return;
    if (def.req && !this.learned.has(def.req)) { this.ui.toast('REQUER: ' + def.req); return; }
    if (this.skillPts < 1) { this.ui.toast('SEM PONTOS DE PERÍCIA'); return; }
    this.skillPts--;
    this.learned.add(id);
    this.recomputeMax();
    this.audio.sfx('level');
    this.ui.toast(`PERÍCIA: ${def.nome.toUpperCase()} — ${def.desc}`);
    this.save(false);
  }

  recomputeMax() {
    const p = this.player;
    const vida = (this.hasSkill('vida1') ? 20 : 0) + (this.hasSkill('vida2') ? 20 : 0) + (this.hasSkill('vida3') ? 20 : 0);
    p.maxHp = 100 + (p.race?.hpBonus || 0) + (p.nivel - 1) * 8 + vida;
    p.maxSta = 100 + (p.race?.staBonus || 0) + (p.nivel - 1) * 5 + (this.hasSkill('sta1') ? 20 : 0);
    p.hp = Math.min(p.hp, p.maxHp);
    p.sta = Math.min(p.sta, p.maxSta);
  }

  gainLeguas(n: number) {
    const p = this.player;
    p.leguas += n;
    let need = Math.round(50 * Math.pow(p.nivel, 1.5));
    while (p.leguas >= need) {
      p.leguas -= need;
      p.nivel++;
      this.skillPts++;
      this.recomputeMax();
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
      this.audio.sfx('level');
      this.ui.toast(`NÍVEL ${p.nivel}! +1 PONTO DE PERÍCIA (K)`);
      need = Math.round(50 * Math.pow(p.nivel, 1.5));
    }
  }

  // ------------------------------------------------------------
  // DANO / MORTE
  // ------------------------------------------------------------
  onPlayerDamage(dmg: number) {
    const p = this.player;
    if (p.dead || p.rollT >= 0) return; // esquiva = i-frames
    const red = 1 / (1 + 0.08 * Math.max(0, p.equip.peitoralNivel - 1));
    this.applyPlayerDamage(Math.max(1, Math.round(dmg * red)));
  }

  private applyPlayerDamage(dmg: number) {
    const p = this.player;
    if (p.dead) return;
    p.hp -= dmg;
    p.hurtT = 0.3;
    p.lastHurt = this.time;
    this.ui.dmgNumber((p.pos.x - this.camX) * this.Z, (p.pos.y - this.camY) * this.Z - 18, `-${dmg}`, '#ff8a7a');
    this.ui.vignette();
    this.audio.sfx('hurt');
    if (p.hp <= 0) {
      p.hp = 0; p.dead = true;
      const lost = Math.floor(p.leguas * 0.3);
      p.leguas -= lost;
      this.player.mounted = false;
      this.state = 'dead';
      this.ui.deathEl.style.display = 'flex';
    }
  }

  // ---------------- porões ----------------
  private startTele(x: number, y: number, den: string | null) {
    this.enemies = this.enemies.filter(e => !e.den);
    this.tele = { t: 0, mid: false, to: { x, y }, den };
    this.audio.sfx('ui');
  }

  enterDungeon(id: string) {
    const d = DUNGEONS.find(dd => dd.id === id)!;
    const r = this.world.denRects[id];
    if (!r) return;
    this.startTele((r.ox + 4) * T, (r.oy + 4) * T, id);
    this.ui.zoneTitle(d.nome, `Nv.${d.lvl} · limpe a sala e abra o baú`, d.cor);
  }

  exitDungeon(id: string) {
    const den = this.world.dens.find(dd => dd.id === id);
    if (den) this.startTele(den.x, den.y + 10, null);
  }

  private updateTele(dt: number) {
    const t = this.tele;
    if (!t) return;
    t.t += dt;
    if (!t.mid && t.t >= 0.3) {
      t.mid = true;
      this.enemies = this.enemies.filter(e => !e.den);
      this.player.pos.x = t.to!.x;
      this.player.pos.y = t.to!.y;
      if (t.den) this.spawnDungeonGuards(t.den);
    }
    if (t.t >= 0.75) this.tele = null;
  }

  private spawnDungeonGuards(id: string) {
    const d = DUNGEONS.find(dd => dd.id === id)!;
    const r = this.world.denRects[id];
    if (!r) return;
    const mix: Record<string, string[]> = {
      porao: ['s', 's', 'f'], mare: ['g', 's', 'a', 'f'], fossil: ['T', 'm', 's', 'a'],
      fornalha: ['T', 'h', 'g', 'a'], cripta: ['T', 'h', 'g', 'm']
    };
    const kinds = mix[id] || ['s', 'f', 'a'];
    const n = 7 + Math.floor(d.lvl / 3);
    for (let k = 0; k < n; k++) {
      const gx = (r.ox + 5 + this.rng() * (r.W - 10)) * T;
      const gy = (r.oy + 5 + this.rng() * (r.H - 10)) * T;
      const e = this.addEnemy(kinds[k % kinds.length], d.lvl, gx, gy, null, false);
      e.den = id;
    }
    const gg = this.addEnemy(kinds[0], d.lvl, (r.ox + r.W - 6) * T, (r.oy + r.H - 6) * T, null, true, true);
    gg.den = id;
  }

  private openDungeonChest(b: any) {
    if (b.dados.open) return;
    b.dados.open = true;
    const d = DUNGEONS.find(dd => dd.id === b.dados.den)!;
    this.densDone.add(d.id);
    this.audio.sfx('open');
    const loot = rollLoot(d.loot, 'x', this.rng);
    const p = this.player;
    for (const gg of loot) {
      const cur = gg.slot === 'arma' ? p.equip.armaNivel : gg.slot === 'peitoral' ? p.equip.peitoralNivel : p.equip.arreioNivel;
      if (gg.nivel > cur) {
        if (gg.slot === 'arma') { p.equip.armaNivel = gg.nivel; p.equip.multArma = gg.mult; }
        else if (gg.slot === 'peitoral') { p.equip.peitoralNivel = gg.nivel; p.equip.multPeitoral = gg.mult; }
        else p.equip.arreioNivel = gg.nivel;
        this.ui.feed(`SPOILA DO PORÃO: ${gg.slot.toUpperCase()} NV.${gg.nivel}`, d.cor);
        this.audio.sfx('level');
      } else p.cobres += gg.nivel * 5;
    }
    const cob = 20 + d.loot * 6;
    p.cobres += cob;
    const ore = defs.oreDaZona(d.lvl);
    p.res[ore] = (p.res[ore] || 0) + 3;
    p.res['erva'] = (p.res['erva'] || 0) + 2;
    this.ui.feed(`+${cob} ◉ · 3 ${(ORES[ore]?.nome || ore).toUpperCase()} · 2 ERVAS`, '#ffe9a0');
    this.ui.feed(`PORÃO LIMPO: ${d.nome} (${this.densDone.size}/${DUNGEONS.length})`, d.cor);
    this.save(false);
  }

  private malvinaRevela() {
    this.ui.dialogFace('MALVINA', 6,
      'O totem cantou — ouviu daqui!<br>O <b>Fareja-Mor</b> guardava uma <b>Sigila</b>: selo do velho Bravo.<br><br>Cada zona tem seu Guardião, cada Guardião, uma Sigila. São <b>dez</b> — sem as dez, a PORTA do Umbigo é só pedra.<br>E os <b>porões</b> escuros (◘ no mapa) guardam ferro dos afogados. Descanso pra quem caça guardiões.<br><br>Vá, Leonis. Junte as dez cantorias e mande o Porteiro dormir.',
      [{ label: 'PELAS DEZ', cb: () => { } }]);
    this.audio.sfx('ui');
  }

  victory() {
    const bd = BOSSES.find(b => b.final)!;
    this.ui.showVictory({
      nome: this.player.nome,
      nivel: this.player.nivel,
      chefes: `${this.bossesKilled.size}/${BOSSES.length}`,
      salas: `${this.densDone.size}/${DUNGEONS.length}`,
      tempo: `${Math.floor(this.time / 60)}min ${Math.floor(this.time % 60)}s`,
      cobres: this.player.cobres
    }, bd.nome);
    this.audio.sfx('level');
  }

  respawn() {
    const p = this.player;
    p.dead = false;
    p.hp = p.maxHp; p.sta = p.maxSta;
    p.pos.x = POI2.vila.x * T; p.pos.y = (POI2.vila.y + 6) * T;
    if (this.mount.state === 'domado') {
      this.mount.pos.x = (POI2.vila.x - 14) * T;
      this.mount.pos.y = (POI2.vila.y + 4) * T;
      this.mount.hp = this.mount.maxHp;
    }
    this.boat.boarded = false; p.onBoat = false;
    this.state = 'play';
  }

  updateQuest() {
    if (this.q1 === 0) this.ui.quest('NOTA DE CARGA #1', 'Fale com o Mestre-Guia Brais na vila (estandarte azul).');
    else if (this.q1 === 1) this.ui.quest('O COMBOIO ATACADO', `Recupere a carga no destroço, a noroeste. (${this.player.cargas}/3)`);
    else if (this.q1 === 2) this.ui.quest('O COMBOIO ATACADO', 'Entregue a carga ao Brais.');
    else if (this.q2 === 1) this.ui.quest('O RONCEIRO FERIDO', 'Elimine os guardas da Corja perto da fera (a leste).');
    else if (this.q2 === 2) this.ui.quest('O RONCEIRO FERIDO', `Alimente o Ronceiro com ervas. (${this.mount.fed}/3)`);
    else if (this.q3 === 0) this.ui.quest('O TOTEM CANTOR', 'Derrote o FAREJA-MOR no covil ♛ ao norte do Berço.');
    else if (this.bossesKilled.size < 10) this.ui.quest('AS DEZ SIGILAS', `Guardiões: ${this.bossesKilled.size}/10 ♛ · Porões: ${this.densDone.size}/5 ◘`);
    else if (!this.won) this.ui.quest('A PORTA', 'As dez Sigilas cantam. Atravesse A PORTA no Umbigo.');
    else this.ui.quest('O BRAVO É SEU', 'Sandbox eterno: guardiões, porões, montarias. Obrigado por jogar!');
  }

  // ------------------------------------------------------------
  // SAVE / LOAD
  // ------------------------------------------------------------
  save(manual: boolean) {
    const p = this.player;
    const data = {
      v: 'm2d-2',
      skills: [...this.learned], pts: this.skillPts,
      bossesKilled: [...this.bossesKilled], won: this.won,
      q3: this.q3, densDone: [...this.densDone],
      activeMountId: this.activeMountId,
      mountStates: this.mountStates,
      runStats: this.runStats,
      nome: p.nome, raceId: p.race.id, weaponId: p.arma.id,
      pos: [p.pos.x, p.pos.y], hp: p.hp, sta: p.sta,
      leguas: p.leguas, nivel: p.nivel, cobres: p.cobres, res: p.res, equip: p.equip, cargas: p.cargas,
      q1: this.q1, q2: this.q2, fed: this.mount.fed,
      mount: {
        state: this.mount.state, bond: this.mount.bond, bondXp: this.mount.bondXp,
        hp: this.mount.hp, nome: this.mount.nome, pos: [this.mount.pos.x, this.mount.pos.y]
      },
      discovered: [...this.discovered],
      chests: [...this.world.buildings.filter(b => (b.tipo === 'bau' || b.tipo === 'dbau') && b.dados.open).map(b => `${b.x},${b.y}`)]
    };
    if (saveGame(data)) { if (manual) this.ui.toast('JORNADA SALVA.'); }
    else this.ui.toast('ERRO AO SALVAR.');
  }

  loadGame() {
    const d: any = loadGame();
    if (!d || d.v !== 'm2d-2') {
      if (d) { clearSave(); this.ui.toast('Save antigo incompatível — novo jogo.'); }
      else this.ui.toast('NENHUM SAVE.');
      if (this.state === 'title') this.startIntro();
      return;
    }
    this.ui.closeTitle();
    const race = RACES.find(r => r.id === d.raceId) || RACES[0];
    const weapon = WEAPONS.find(w => w.id === d.weaponId) || WEAPONS[0];
    this.newGame(race, weapon, d.nome);
    const p = this.player;
    p.pos.x = d.pos[0]; p.pos.y = d.pos[1];
    Object.assign(p.equip, d.equip);
    p.res = d.res || {};
    p.hp = d.hp; p.sta = d.sta; p.leguas = d.leguas; p.nivel = d.nivel;
    p.maxHp = 100 + (race.hpBonus || 0) + (d.nivel - 1) * 8;
    p.maxSta = 100 + (race.staBonus || 0) + (d.nivel - 1) * 5;
    p.cobres = d.cobres; p.cargas = d.cargas || 0;
    this.q1 = d.q1; this.q2 = d.q2;
    if (this.q2 >= 2) this.enemies = this.enemies.filter(e => !e.guard);
    this.mount.fed = d.fed || 0;
    // perícias + montarias + rastreadores
    this.learned = new Set<string>(d.skills || []);
    this.skillPts = d.pts || 0;
    this.bossesKilled = new Set<string>(d.bossesKilled || []);
    this.won = !!d.won;
    this.q3 = d.q3 || 0;
    this.densDone = new Set<string>(d.densDone || []);
    if (this.bossesKilled.has('berco') && this.q3 === 0) this.q3 = 1;
    this.runStats = { heavy: 0, fedJav: 0, boated: false, visitedPicos: false, umbigoT: 0, ...(d.runStats || {}) };
    this.mountStates = {};
    this.initMountStates();
    for (const [k, v] of Object.entries(d.mountStates || {})) {
      if (this.mountStates[k]) (this.mountStates as any)[k] = v;
    }
    if (this.q2 >= 3) this.mountStates['ronceiro'] = { state: 'domado', bond: 1, bondXp: 0, hp: MOUNTS[0].hp };
    this.recomputeMax();
    const amId = d.activeMountId || 'ronceiro';
    if (amId !== 'ronceiro' && this.mountStates[amId]?.state === 'domado') this.activateMount(amId);
    if (d.mount) {
      if (d.mount.state === 'domado') this.tameSilent();
      this.mount.bond = d.mount.bond; this.mount.bondXp = d.mount.bondXp;
      this.mount.hp = d.mount.hp; this.mount.nome = d.mount.nome;
      this.mount.pos.x = d.mount.pos[0]; this.mount.pos.y = d.mount.pos[1];
    }
    for (const key of d.chests || []) {
      const [x, y] = key.split(',').map(Number);
      const b = this.world.buildings.find(bb => (bb.tipo === 'bau' || bb.tipo === 'dbau') && bb.x === x && bb.y === y);
      if (b) b.dados.open = true;
    }
    this.discovered = new Set(d.discovered || []);
    this.updateQuest();
    this.ui.toast('JORNADA CARREGADA. O Bravo lembra de você.');
  }

  private tameSilent() {
    this.mount.state = 'domado';
    this.mount.bond = Math.max(1, this.mount.bond);
    this.mount.hp = this.mount.maxHp;
    this.mountStates['ronceiro'] = { state: 'domado', bond: this.mount.bond, bondXp: this.mount.bondXp, hp: this.mount.hp };
  }
}

// flip cache global
const flipCacheMap = new Map<string, HTMLCanvasElement>();
function flipCache(key: string): HTMLCanvasElement {
  let c = flipCacheMap.get(key);
  if (c) return c;
  const src = SPR[key];
  if (!src) return document.createElement('canvas');
  c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!;
  g.translate(src.width, 0); g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  flipCacheMap.set(key, c);
  return c;
}
function cssHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

// clock sem three.js
class Clock2D {
  private last = performance.now();
  get(): number {
    const now = performance.now();
    const d = (now - this.last) / 1000;
    this.last = now;
    return d;
  }
}

// boot
const game = new Game2D();
game.start();
(window as any).__leonis = game;
