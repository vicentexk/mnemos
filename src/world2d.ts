// ============================================================
// LEONIS 2D — world2d.ts · Continente sandbox em tiles 16px
// Todas as zonas abertas desde o início (nível é do conteúdo).
// ============================================================

import { ZONES, MAP, POI2, ZoneDef, oreDaZona, ORES } from './data/defs';
import { fbm, mulberry32, dist2d, smoothstep } from './core';
import { SPR, PAL, cv, ctx2 } from './pix';

export const T = MAP.T;      // 16
export const NW = MAP.W;     // 360 tiles
export const NH = MAP.H;

export const enum TERR { WATER = 0, GRASS = 1 }
export const COLL = { NONE: 0, WATER: 1, BLOCK: 2 };

export interface Prop { key: string; x: number; y: number; solid: number; chunk: number; flip?: boolean; }
export interface CampDef { id: string; zone: ZoneDef; lvl: number; x: number; y: number; }
export interface OreNode { id: string; x: number; y: number; ore: string; uses: number; cd: number; }
export interface HerbNode { id: string; x: number; y: number; kind: string; cd: number; }

export interface Building {
  key: string; x: number; y: number; w: number; h: number; solid: boolean;
  tipo: 'casa' | 'forja' | 'estabulo' | 'brais' | 'fogueira' | 'torre' | 'tenda' | 'pali' | 'bau' | 'wreck' | 'carga' | 'porta';
  dados?: any;
}

export class World2D {
  biome = new Uint8Array(NW * NH);   // índice em ZONES
  land = new Uint8Array(NW * NH);
  coll = new Uint8Array(NW * NH);
  camps: CampDef[] = [];
  ores: OreNode[] = [];
  herbs: HerbNode[] = [];
  buildings: Building[] = [];
  props: Prop[] = [];
  cityHouses = 0;
  bossDens: { zone: string; x: number; y: number }[] = [];
  npcSpawns: { x: number; y: number; face: number; nome: string; linhas: string[] }[] = [];
  animals: { x: number; y: number; kind: string }[] = [];
  propsByChunk = new Map<number, Prop[]>();
  minimapCv!: HTMLCanvasElement;
  private chunkCache = new Map<number, HTMLCanvasElement>();
  private rng = mulberry32(20260910);

  constructor() {
    this.genTerrain();
    this.genPOIs();
    this.genProps();
    this.genLife();
    this.genBossDens();
    this.buildMinimap();
  }

  // ---------------- zonas/terreno ----------------
  private zoneAt(tx: number, ty: number): number {
    let best = -1, bs = -1e9;
    for (let i = 0; i < ZONES.length; i++) {
      const z = ZONES[i];
      const jitter = (fbm(tx * 0.05 + i * 7, ty * 0.05, 99) - 0.5) * 26;
      const s = z.r - dist2d(tx, ty, z.cx, z.cy) + jitter;
      if (s > bs) { bs = s; best = i; }
    }
    return best;
  }

  private genTerrain() {
    for (let ty = 0; ty < NH; ty++) {
      for (let tx = 0; tx < NW; tx++) {
        const i = tx + ty * NW;
        // oceano na moldura (costa ruidosa)
        const edge = Math.min(tx, ty, NW - 1 - tx, NH - 1 - ty);
        const coast = 8 + fbm(tx * 0.04, ty * 0.04, 555) * 14;
        const isLand = edge > coast;
        this.land[i] = isLand ? 1 : 0;
        this.biome[i] = this.zoneAt(tx, ty);
        this.coll[i] = isLand ? COLL.NONE : COLL.WATER;
      }
    }
    // lago a leste da vila
    for (let ty = 0; ty < NH; ty++) {
      for (let tx = 0; tx < NW; tx++) {
        const d = dist2d(tx, ty, POI2.lake.x, POI2.lake.y);
        if (d < POI2.lake.r * (0.8 + fbm(tx * 0.1, ty * 0.1, 77) * 0.4)) {
          const i = tx + ty * NW;
          this.land[i] = 0; this.coll[i] = COLL.WATER;
        }
      }
    }
  }

  zoneIndexAt(wx: number, wy: number): number {
    return this.biome[Math.floor(wx / T) + Math.floor(wy / T) * NW] || 0;
  }

  // ---------------- POIs ----------------
  private genPOIs() {
    // ---- CIDADE DO BERÇO (Porto-Canza — uma cidade GRANDE) ----
    const vx = POI2.vila.x * T, vy = POI2.vila.y * T;
    // prédios especiais
    this.bld('b/forge', vx + 5 * T, vy + 1 * T, 40, 30, 'forja');
    this.bld('b/stable', vx - 6 * T, vy + 1 * T, 46, 26, 'estabulo');
    this.bld('b/tower', vx + 11 * T, vy - 9 * T, 20, 38, 'torre');
    this.bld('b/tower', vx - 12 * T, vy + 8 * T, 20, 38, 'torre');
    this.bld('b/tent', vx - 2 * T, vy - 7 * T, 24, 18, 'tenda');
    this.bld('b/tent', vx + 1 * T, vy - 8 * T, 24, 18, 'tenda');
    this.bld('b/tent', vx + 4 * T, vy - 6 * T, 24, 18, 'tenda');
    this.bld('b/banner', vx + 1 * T, vy - 1 * T, 8, 20, 'brais');
    this.bld('b/fire0', vx - 1 * T, vy + 1 * T, 10, 10, 'fogueira', { anim: true });
    this.props.push({ key: 'b/banner', x: vx + 8 * T, y: vy + 4 * T, solid: 0, chunk: this.chunkOf(vx + 8 * T, vy + 4 * T), flip: false });
    this.props.push({ key: 'b/banner', x: vx - 9 * T, y: vy - 4 * T, solid: 0, chunk: this.chunkOf(vx - 9 * T, vy - 4 * T), flip: true });
    this.props.push({ key: 'b/fire0', x: vx + 6 * T, y: vy + 7 * T, solid: 0, chunk: this.chunkOf(vx + 6 * T, vy + 7 * T), flip: false });
    this.props.push({ key: 'b/fire0', x: vx - 7 * T, y: vy + 6 * T, solid: 0, chunk: this.chunkOf(vx - 7 * T, vy + 6 * T), flip: false });
    // bairros: casas em grade ao redor da praça
    const specials: [number, number][] = [[5, 1], [-6, 1], [11, -9], [-12, 8], [1, -7], [2, -8], [4, -6], [1, -1], [-1, 1], [6, 7], [-7, 6], [8, 4], [-9, -4]];
    let casas = 0;
    for (let ox = -17; ox <= 17; ox += 5) {
      for (let oy = -13; oy <= 13; oy += 6) {
        if (Math.abs(ox) <= 6 && Math.abs(oy) <= 8) continue; // praça central
        let busy = false;
        for (const [sx, sy] of specials) if (Math.abs(ox - sx) < 4 && Math.abs(oy - sy) < 4) { busy = true; break; }
        if (busy) continue;
        const wx = vx + ox * T + ((oy / 6) % 2 === 0 ? 0 : 8);
        const wy = vy + oy * T;
        const tx = wx / T, ty = wy / T;
        if (!this.isLandTile(Math.round(tx), Math.round(ty), 3)) continue;
        this.bld('b/house', wx, wy, 44, 34, 'casa');
        casas++;
      }
    }
    this.cityHouses = casas;
    // ---- pier + barco ----
    for (let i = 0; i < 6; i++) this.props.push({ key: 'b/palisade', x: (POI2.pier.x - 3 + i) * T, y: POI2.pier.y * T, solid: 0, chunk: this.chunkOf((POI2.pier.x - 3 + i) * T, POI2.pier.y * T), flip: true });
    this.props[this.props.length - 6].key = 'b/palisade';
    // pranchas visuais do pier via props 'path'? usamos palisade deitada como pranchas (flip)
    // ---- destroço do comboio (quest 1) ----
    const w = POI2.wreck;
    this.bld('b/wreck', w.x * T - 13, w.y * T - 8, 26, 16, 'wreck');
    this.bld('b/carga', w.x * T - 30, w.y * T + 8, 12, 10, 'carga', { idx: 0 });
    this.bld('b/carga', w.x * T + 16, w.y * T + 4, 12, 10, 'carga', { idx: 1 });
    this.bld('b/carga', w.x * T + 2, w.y * T + 22, 12, 10, 'carga', { idx: 2 });
    // ---- ronceiro ferido (quest 2): sem building, entidade no game ----

    // ---- acampamentos: 2 por zona (exceto berço) ----
    let ci = 0;
    for (const z of ZONES) {
      if (z.id === 'berco') continue;
      for (let k = 0; k < 2; k++) {
        let placed = false;
        for (let attempt = 0; attempt < 60 && !placed; attempt++) {
          const a = this.rng() * Math.PI * 2;
          const r = (0.3 + this.rng() * 0.5) * z.r;
          const tx = Math.round(z.cx + Math.cos(a) * r);
          const ty = Math.round(z.cy + Math.sin(a) * r);
          if (tx < 14 || ty < 14 || tx > NW - 14 || ty > NH - 14) continue;
          if (!this.isLandTile(tx, ty, 6)) continue;
          if (dist2d(tx, ty, POI2.vila.x, POI2.vila.y) < 40) continue;
          if (dist2d(tx, ty, POI2.ronceiro.x, POI2.ronceiro.y) < 14) continue;
          const cx = tx * T, cy = ty * T;
          this.camps.push({ id: `c${ci++}`, zone: z, lvl: z.lvl, x: cx, y: cy });
          this.buildCamp(cx, cy, z.lvl);
          placed = true;
        }
      }
    }

    // ---- recursos: minérios + ervas por zona ----
    let oi = 0, hi = 0;
    for (const z of ZONES) {
      const ore = oreDaZona(z.lvl);
      for (let k = 0; k < 3; k++) {
        const p = this.randLandIn(z, 8);
        if (!p) continue;
        this.ores.push({ id: `o${oi++}`, x: p.x * T, y: p.y * T, ore, uses: 3, cd: 0 });
      }
      for (let k = 0; k < 6; k++) {
        const p = this.randLandIn(z, 6);
        if (!p) continue;
        this.herbs.push({ id: `h${hi++}`, x: p.x * T, y: p.y * T, kind: z.biome, cd: 0 });
      }
    }
    // ervas extras perto da vila (tutorial de doma)
    for (let k = 0; k < 8; k++) {
      const a = this.rng() * Math.PI * 2, r = 14 + this.rng() * 20;
      const tx = Math.round(POI2.vila.x + Math.cos(a) * r), ty = Math.round(POI2.vila.y + Math.sin(a) * r);
      if (this.isLandTile(tx, ty, 1) && !this.coll[tx + ty * NW]) {
        this.herbs.push({ id: `h${hi++}`, x: tx * T, y: ty * T, kind: 'savana', cd: 0 });
      }
    }
  }

  private bld(key: string, x: number, y: number, w: number, h: number, tipo: Building['tipo'], dados?: any) {
    this.buildings.push({ key, x, y, w, h, solid: tipo !== 'fogueira' && tipo !== 'brais', tipo, dados });
    if (tipo === 'fogueira') dados!.fx = x + 5;
    if (tipo !== 'fogueira' && tipo !== 'brais' && tipo !== 'wreck' && tipo !== 'carga' && tipo !== 'bau') {
      this.fillRectColl(x, y, w, h);
    } else if (tipo === 'wreck') {
      this.fillRectColl(x + 4, y + 6, 18, 8);
    }
  }

  private fillRectColl(x: number, y: number, w: number, h: number) {
    for (let ty = Math.floor(y / T); ty <= Math.floor((y + h - 1) / T); ty++) {
      for (let tx = Math.floor(x / T); tx <= Math.floor((x + w - 1) / T); tx++) {
        if (tx >= 0 && ty >= 0 && tx < NW && ty < NH) this.coll[tx + ty * NW] = COLL.BLOCK;
      }
    }
  }

  private buildCamp(cx: number, cy: number, _lvl: number) {
    const R = 5; // tiles
    // paliçada com abertura ao sul
    for (let a = 0; a < Math.PI * 2; a += 0.34) {
      const ang = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (ang > 1.25 && ang < 1.9) continue;
      const px = Math.round(cx / T + Math.cos(ang) * R) * T;
      const py = Math.round(cy / T + Math.sin(ang) * R) * T;
      this.props.push({ key: 'b/palisade', x: px, y: py, solid: 1, chunk: this.chunkOf(px, py) });
      this.fillRectColl(px + 2, py + 4, 12, 10);
    }
    // torre
    this.props.push({ key: 'b/tower', x: cx - R * T + 8, y: cy - R * T, solid: 1, chunk: this.chunkOf(cx - R * T + 8, cy - R * T) });
    this.fillRectColl(cx - R * T + 10, cy - R * T + 20, 12, 18);
    // tendas
    for (const [ox, oy] of [[R * T - 24, R * T - 26], [-R * T + 14, R * T - 20]]) {
      this.props.push({ key: 'b/tent', x: cx + ox, y: cy + oy, solid: 1, chunk: this.chunkOf(cx + ox, cy + oy) });
      this.fillRectColl(cx + ox + 2, cy + oy + 6, 18, 9);
    }
    // fogueira do camp (visual)
    this.props.push({ key: 'b/fire0', x: cx - 5, y: cy - 18, solid: 0, chunk: this.chunkOf(cx - 5, cy - 18), flip: false });
    // baú
    this.bld('b/chest', cx + R * T - 28, cy - R * T + 6, 14, 11, 'bau', { open: false, lvl: _lvl });
  }

  // ---------------- vida: lugarejos, NPCs, fauna ----------------
  private genLife() {
    const vx = POI2.vila.x, vy = POI2.vila.y;
    // lugarejos (casas fora da cidade)
    this.hamletAt(250, 112, 1);
    this.hamletAt(139, 104, 1);
    this.hamletAt(283, 152, 1);
    // ---- NPCs da CIDADE ----
    this.npc(vx + 9, vy - 5, 5, 'Corretor Divo', [
      'Minerio bom e minerio VENDIDO. A forja compra tudo: do ferro a aurora.',
      'Cobre da Fera vale o dobro do ferro. Dica da casa.'
    ]);
    this.npc(vx - 5, vy - 4, 2, 'DOMADOR ABERO', [
      'Eu leio feras como voce le mapa. Quer saber de alguma?',
      'Toda montaria tem uma chave. A minha arte e achar a fechadura.'
    ]);
    this.npc(vx + 10, vy + 2, 6, 'Malvina, a Ferreira', [
      'Aco come ferro-Canza e cobre. Traz que eu forjo.',
      'Espada Nv.5 em zona Nv.5 corta certo. O resto e fe.'
    ]);
    this.npc(vx - 4, vy + 12, 15, 'Velho Ruy, o Contador', [
      'Leona nao foi a primeira a sair. Foi a primeira que VOLTOU.',
      'A Corja ja foi gente. Pergunta nao, que eles mordem.'
    ]);
    this.npc(vx + 3, vy + 5, 24, 'Curandeira Yara', [
      'Carne crua cura mais que ferro frio. Come (R).',
      'Erva e para as feras. E para voce tambem, se tiver montaria.'
    ]);
    this.npc(vx - 3, vy - 10, 8, 'Sasa do Mercado', [
      'Tenda de quem? Minha. O resto e emprestado da Corja.',
      'Bau de acampamento so abre LIMPO. Regra daqui.'
    ]);
    this.npc(vx + 13, vy + 3, 0, 'Guarda Tosk', [
      'Berco e seguro. O resto do mundo e plano e cheio de dente.',
      'Role pra lateral, nao pro meio da fera. Ensino isso de graca.'
    ]);
    this.npc(vx - 11, vy + 2, 21, 'Guarda Ilma', [
      'O Umbigo cobra Nv.12. Nao e paredao, e conselho.',
      'Vi gente boa ir e voltar. Vi gente boa so ir.'
    ]);
    this.npc(vx + 2, vy + 9, 17, 'Cartografo Mapo', [
      'M abre a Carta-Primeira. Todo canto, sem trancas. Sandbox.',
      'Descobrir zona da leguas. Ande longe, volte rico.'
    ]);
    this.npc(vx - 8, vy - 7, 12, 'Menina Lila', [
      'Quando eu crescer vou ter UM RONCLUME!',
      'O Domador diz que o Mirage nem existe. Ja existiu.'
    ]);
    this.npc(vx + 7, vy - 2, 14, 'Tato, o Sonhador', [
      'Se eu bebesse menos... mas que seria bom domar o Bufelo, seria.',
      '25 machadadas era o que o velho dava no tronco. Ele domou o bicho.'
    ]);
    this.npc(vx + 12, vy + 8, 4, 'Cozinheira Brasa', [
      'Fogo aceso, panela cheia, porta aberta. Assim se faz cidade.',
      'Carne de fera e forte. 30 de vida num bolinho so.'
    ]);
    this.npc(vx - 14, vy + 5, 11, 'Pescador Urbano', [
      'Tem barco no pier. Mar nao cobra pedagio. Ainda.',
      'Corsaria so respeita quem chega por agua. Palavra do Abero.'
    ]);
    // ---- NPCs dos caminhos ----
    this.npc(vx - 20, vy + 6, 3, 'Pastora Eno', [
      'O Ronceiro do brejo a leste? Fera brava, coracao mole. Erva resolve.',
      'Galope forte cria vinculo. Vinculo cria FURIA.'
    ]);
    this.npc(vx + 18, vy - 3, 18, 'Duda, a Curiosa', [
      'Dizem que o Umbigo do Mundo e uma porta. Porta de QUE, ninguem soube dizer.',
      'A Corja acampa em toda zona. Onde tem fumaca, tem bau.'
    ]);
    this.npc(vx + 10, vy - 18, 3, 'Pastora Eno', [
      'O Ronceiro do brejo a leste? Fera brava, coracao mole. Erva resolve.',
      'Galope forte cria vinculo. Vinculo cria FURIA.'
    ]);
    this.npc(vx - 16, vy + 6, 24, 'Duda, o Curioso', [
      'Dizem que o Umbigo do Mundo e uma porta. Porta de QUE, ninguem soube dizer.',
      'A Corja acampa em toda zona. Onde tem fumaca, tem bau.'
    ]);
    this.npc(vx + 30, vy + 18, 18, 'Malvina, a Ferreira', [
      'Aco come ferro-Canza e cobre. Traz que eu forjo.',
      'Espada Nv.5 em zona Nv.5 corta certo. O resto e fe.'
    ]);
    // viajantes
    this.npc(172, 238, 9, 'Viajante Encapuzado', [
      'Vim de Obsidiana. Nao olhei pra tras. Voce tambem nao deve.'
    ]);
    this.npc(252, 280, 20, 'Pescador Gil', [
      'A agua da Costa das Tormentas engoliu a Grao-Nau. Respeita o mar.',
      'Tem um barco amarrado no pier. E seu por direito de naufragio.'
    ]);
    this.npc(283, 148, 10, 'Cacadora Tlio', [
      'Selva Petroglifa: as pedras falam. Ninguem escuta.'
    ]);
    this.npc(122, 88, 8, 'Nimbo Mercador', [
      'Vidro-Marinho do deserto brilha a noite. Minera com calma.'
    ]);
    this.npc(247, 84, 15, 'Ancia do Banhadol', [
      'O Banhadol engole botas, armas e vaidade. Pega so o necessario.'
    ]);
    // ermitas por zona (dicas de nivel)
    const ermitas: [number, number, number, string, string][] = [
      [150, 210, 7, 'Ermita de Kurnis', 'Savana Nv.1-2 e berco bom. Aprende o ritmo: bater, recuar, comer.'],
      [236, 214, 12, 'Ermita Profunda', 'Kurnis Profundo, Nv.2. Cobre-Fera nas rochas escuras.'],
      [290, 156, 2, 'Ermita da Petroglifa', 'Selva, Nv.3. Ambar-Sonoro canta quando voce chega perto.'],
      [86, 170, 22, 'Ermita da Costa', 'Costa, Nv.4. Tempestade nao avisa. Barco sim: pier ao sul da vila.'],
      [120, 76, 21, 'Ermita de Vidro', 'Deserto, Nv.5. Agua falsa brilha de dia. A verdadeira brilha a noite.'],
      [246, 72, 15, 'Ermita alagada', 'Banhadol, Nv.6. Presa-Fria mora nos monstros grandes.'],
      [176, 28, 0, 'Ermita dos Picos', 'Picos, Nv.8. Aqui a Corja caca em bando. Forja 4+ ou volte.'],
      [66, 30, 16, 'Ermita de Obsidiana', 'Nv.10. Obsidiana Viva corta quem minera com pressa.'],
      [298, 24, 2, 'Voz do Umbigo', 'Nv.12. Tudo leva ate aqui. Todo caminho. Sempre levou.']
    ];
    for (const [tx, ty, face, nome, linha] of ermitas) {
      const p = this.randLandNear(tx, ty, 12);
      if (p) this.npc(p.x, p.y, face, nome, [linha]);
    }
    // fauna
    for (const [fx, fy] of [[190, 250], [162, 228], [252, 92]]) {
      for (let k = 0; k < 4; k++) {
        const p = this.randLandNear(fx + Math.round(this.rng() * 8 - 4), fy + Math.round(this.rng() * 6 - 3), 4);
        if (p) this.animals.push({ x: p.x * T, y: p.y * T, kind: 'flock' });
      }
    }
    for (const [dx, dy] of [[288, 152], [294, 160], [286, 164]]) {
      const p = this.randLandNear(dx, dy, 6);
      if (p) this.animals.push({ x: p.x * T, y: p.y * T, kind: 'deer' });
    }
    for (const [dx, dy] of [[180, 40], [90, 160], [292, 120], [150, 90], [250, 40], [64, 40]]) {
      const p = this.randLandNear(dx, dy, 8);
      if (p) this.animals.push({ x: p.x * T, y: p.y * T, kind: 'bird' });
    }
  }

  private npc(tx: number, ty: number, face: number, nome: string, linhas: string[]) {
    const p = this.randLandNear(tx, ty, 6);
    if (!p) return;
    this.npcSpawns.push({ x: p.x * T, y: p.y * T, face, nome, linhas });
  }

  private hamletAt(tx: number, ty: number, n: number) {
    const base = this.randLandNear(tx, ty, 10);
    if (!base) return;
    let placed = 0;
    for (let k = 0; k < n; k++) {
      for (let att = 0; att < 30; att++) {
        const hx = base.x + Math.round(this.rng() * 10 - 5);
        const hy = base.y + Math.round(this.rng() * 8 - 4);
        if (!this.isLandTile(hx, hy, 4)) continue;
        const wx = hx * T, wy = hy * T;
        let busy = false;
        for (const b of this.buildings) if (Math.abs(b.x - wx) < 60 && Math.abs(b.y - wy) < 50) { busy = true; break; }
        if (busy) continue;
        this.bld('b/house', wx, wy, 44, 34, 'casa');
        placed++;
        break;
      }
    }
    if (placed > 0) {
      const p = this.randLandNear(base.x + 2, base.y + 3, 5);
      if (p) this.props.push({ key: 'b/fire0', x: p.x * T, y: p.y * T, solid: 0, chunk: this.chunkOf(p.x * T, p.y * T), flip: false });
    }
  }

  landNear(tx: number, ty: number, r: number): { x: number; y: number } | null {
    return this.randLandNear(tx, ty, r);
  }

  private randLandNear(tx: number, ty: number, r: number): { x: number; y: number } | null {
    for (let att = 0; att < 40; att++) {
      const x = tx + Math.round(this.rng() * r * 2 - r);
      const y = ty + Math.round(this.rng() * r * 2 - r);
      if (x < 2 || y < 2 || x >= NW - 2 || y >= NW - 2) continue;
      if (this.isLandTile(x, y, 2) && !this.coll[x + y * NW]) return { x, y };
    }
    return null;
  }

  // ---------------- covis de chefe (um por zona) + Porta final ----------------
  private genBossDens() {
    for (const z of ZONES) {
      for (let att = 0; att < 80; att++) {
        const p = this.randLandIn(z, 12);
        if (!p) continue;
        const minVila = z.id === 'berco' ? 26 : 36;
        if (dist2d(p.x, p.y, POI2.vila.x, POI2.vila.y) < minVila) continue;
        if (dist2d(p.x, p.y, POI2.wreck.x, POI2.wreck.y) < 22) continue;
        if (dist2d(p.x, p.y, POI2.ronceiro.x, POI2.ronceiro.y) < 18) continue;
        let nearCamp = false;
        for (const c of this.camps) if (dist2d(p.x * T, p.y * T, c.x, c.y) < 110) { nearCamp = true; break; }
        let nearDen = false;
        for (const d of this.bossDens) if (dist2d(p.x, p.y, d.x / T, d.y / T) < 60) nearDen = true;
        if (nearCamp || nearDen) continue;
        const wx = p.x * T, wy = p.y * T;
        // totem-caveira do covil + ossos
        this.props.push({ key: 'b/skull', x: wx, y: wy, solid: 1, chunk: this.chunkOf(wx, wy), flip: this.rng() > 0.5 });
        this.fillRectColl(wx - 8, wy - 8, 16, 10);
        for (let k = 0; k < 4; k++) {
          const a = this.rng() * Math.PI * 2, r = 14 + this.rng() * 18;
          const bx = Math.round(wx / T + Math.cos(a) * r / T * 2), by = Math.round(wy / T + Math.sin(a) * r / T * 2);
          if (this.isLandTile(bx, by, 1) && !this.coll[bx + by * NW]) {
            this.props.push({ key: 'b/bones', x: bx * T, y: by * T, solid: 0, chunk: this.chunkOf(bx * T, by * T), flip: this.rng() > 0.5 });
          }
        }
        this.bossDens.push({ zone: z.id, x: wx, y: wy });
        break;
      }
    }
    // A PORTA do Umbigo (perto do centro da zona final)
    const uz = ZONES.find(z => z.id === 'umbigo')!;
    const pd = this.randLandNear(uz.cx + 8, uz.cy + 6, 10);
    if (pd) {
      this.bld('b/porta', pd.x * T - 17, pd.y * T - 46, 34, 46, 'porta');
      // guardiões visuais (os monstros da zona já cuidam do resto)
      for (const [ox, oy] of [[-22, 2], [22, 2]]) {
        this.props.push({ key: 'b/skull', x: pd.x * T + ox, y: pd.y * T + oy, solid: 1, chunk: this.chunkOf(pd.x * T + ox, pd.y * T + oy), flip: ox > 0 });
        this.fillRectColl(pd.x * T + ox - 8, pd.y * T + oy - 8, 16, 10);
      }
    }
  }

  private isLandTile(tx: number, ty: number, margin = 0): boolean {
    if (tx < margin || ty < margin || tx > NW - 1 - margin || ty > NH - 1 - margin) return false;
    if (!this.land[tx + ty * NW]) return false;
    for (let dy = -margin; dy <= margin; dy++) {
      for (let dx = -margin; dx <= margin; dx++) {
        const j = (tx + dx) + (ty + dy) * NW;
        if (j >= 0 && j < NW * NH && !this.land[j]) return false;
      }
    }
    return true;
  }

  private randLandIn(z: ZoneDef, margin: number): { x: number; y: number } | null {
    for (let a = 0; a < 40; a++) {
      const ang = this.rng() * Math.PI * 2, r = this.rng() * z.r * 0.85;
      const tx = Math.round(z.cx + Math.cos(ang) * r), ty = Math.round(z.cy + Math.sin(ang) * r);
      if (this.isLandTile(tx, ty, margin) && !this.coll[tx + ty * NW]) return { x: tx, y: ty };
    }
    return null;
  }

  // ---------------- props espalhados ----------------
  private genProps() {
    const dens: Record<string, number> = {
      savana: 0.042, selva: 0.072, costa: 0.048, deserto: 0.030,
      banhadol: 0.058, picos: 0.046, obsidiana: 0.046, umbigo: 0.028
    };
    const keys: Record<string, string[]> = {
      savana: ['t/baobao', 't/baobao', 't/cactus'],
      selva: ['t/petro', 't/petro', 't/mush'],
      costa: ['t/palm', 't/palm', 't/baobao'],
      deserto: ['t/cactus', 't/cactus', 't/dead'],
      banhadol: ['t/dead', 't/mush', 't/dead'],
      picos: ['t/pine', 't/pine', 't/dead'],
      obsidiana: ['t/obs', 't/obs', 't/dead'],
      umbigo: ['t/obs', 't/dead', 't/petro']
    };
    for (let ty = 4; ty < NH - 4; ty++) {
      for (let tx = 4; tx < NW - 4; tx++) {
        const i = tx + ty * NW;
        if (!this.land[i] || this.coll[i]) continue;
        const z = ZONES[this.biome[i]];
        if (dist2d(tx, ty, POI2.vila.x, POI2.vila.y) < 22) continue;
        if (dist2d(tx, ty, POI2.ronceiro.x, POI2.ronceiro.y) < 8) continue;
        if (dist2d(tx, ty, POI2.wreck.x, POI2.wreck.y) < 8) continue;
        let nearCamp = false;
        for (const c of this.camps) if (dist2d(tx * T, ty * T, c.x, c.y) < 110) { nearCamp = true; break; }
        if (nearCamp) continue;
        if (this.rng() > dens[z.biome]) continue;
        const ks = keys[z.biome];
        const key = ks[Math.floor(this.rng() * ks.length)];
        const px = tx * T + Math.floor(this.rng() * 8), py = ty * T + Math.floor(this.rng() * 8);
        const solid = key !== 't/cactus' ? 1 : 1;
        const p: Prop = { key, x: px, y: py, solid, chunk: this.chunkOf(px, py), flip: this.rng() > 0.5 };
        this.props.push(p);
        // sombra de colisão no tronco
        this.coll[tx + ty * NW] = COLL.BLOCK;
      }
    }
    // indexa por chunk
    for (const p of this.props) {
      let arr = this.propsByChunk.get(p.chunk);
      if (!arr) { arr = []; this.propsByChunk.set(p.chunk, arr); }
      arr.push(p);
    }
  }

  chunkOf(wx: number, wy: number): number {
    const cx = Math.floor(wx / T / 24), cy = Math.floor(wy / T / 24);
    return cx + cy * 16;
  }

  // ---------------- render de chunks de terreno ----------------
  private tileColors(bi: number): [string, string] {
    const b = ZONES[bi].biome;
    switch (b) {
      case 'savana': return [PAL.grass1, PAL.gold1];
      case 'selva': return [PAL.selva1, PAL.selva2];
      case 'costa': return [PAL.costa1, PAL.grass1];
      case 'deserto': return [PAL.sand1, PAL.sand2];
      case 'banhadol': return [PAL.murk1, PAL.murk2];
      case 'picos': return [PAL.snow1, PAL.snow2];
      case 'obsidiana': return [PAL.ash1, PAL.ash2];
      case 'umbigo': return [PAL.pale1, PAL.pale2];
    }
    return [PAL.grass1, PAL.grass2];
  }

  private getChunk(ccx: number, ccy: number): HTMLCanvasElement {
    const id = ccx + ccy * 16;
    let c = this.chunkCache.get(id);
    if (c) return c;
    const S = 24 * T; // 384
    c = cv(S, S);
    const g = ctx2(c);
    for (let ly = 0; ly < 24; ly++) {
      for (let lx = 0; lx < 24; lx++) {
        const tx = ccx * 24 + lx, ty = ccy * 24 + ly;
        if (tx >= NW || ty >= NH) continue;
        const i = tx + ty * NW;
        const wx = tx * T, wy = ty * T;
        const px = lx * T, py = ly * T;
        if (!this.land[i]) {
          // água
          g.fillStyle = PAL.water1; g.fillRect(px, py, T, T);
          const n = fbm(wx * 0.3, wy * 0.3, 31);
          g.fillStyle = PAL.water2;
          for (let s = 0; s < 3; s++) {
            const sx = px + ((tx * 7 + s * 5 + ty * 3) % 13), sy = py + ((ty * 5 + s * 7) % 13);
            g.fillRect(sx, sy, 2 + Math.floor(n * 2), 1);
          }
          continue;
        }
        const bi = this.biome[i];
        const [c1, c2] = this.tileColors(bi);
        const v = fbm(wx * 0.45, wy * 0.45, 12345);
        g.fillStyle = v > 0.55 ? c2 : c1;
        g.fillRect(px, py, T, T);
        // speckles
        g.fillStyle = v > 0.55 ? c1 : c2;
        for (let s = 0; s < 3; s++) {
          const sx = px + ((tx * 13 + s * 11 + ty * 7) % 14), sy = py + ((ty * 11 + s * 5) % 14);
          g.fillRect(sx, sy, 1, 1);
        }
        // transição com vizinho de bioma diferente (faixa dithered)
        const nb = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [dx, dy] of nb) {
          const jx = tx + dx, jy = ty + dy;
          if (jx < 0 || jy < 0 || jx >= NW || jy >= NH) continue;
          const j = jx + jy * NW;
          if (!this.land[j]) continue;
          const bj = this.biome[j];
          if (bj === bi) continue;
          const [n1] = this.tileColors(bj);
          g.fillStyle = n1;
          for (let s = 0; s < T; s += 2) {
            if (dx === 1) g.fillRect(px + T - 1, py + s + ((tx + s) % 2), 1, 1);
            if (dx === -1) g.fillRect(px, py + s + ((tx + s) % 2), 1, 1);
            if (dy === 1) g.fillRect(px + s + ((ty + s) % 2), py + T - 1, 1, 1);
            if (dy === -1) g.fillRect(px + s + ((ty + s) % 2), py, 1, 1);
          }
        }
        // agua adjacente: beira de areia
        for (const [dx, dy] of nb) {
          const jx = tx + dx, jy = ty + dy;
          if (jx < 0 || jy < 0 || jx >= NW || jy >= NH) continue;
          if (!this.land[jx + jy * NW]) {
            g.fillStyle = '#cdb478';
            if (dx === 1) g.fillRect(px + T - 2, py, 2, T);
            if (dx === -1) g.fillRect(px, py, 2, T);
            if (dy === 1) g.fillRect(px, py + T - 2, T, 2);
            if (dy === -1) g.fillRect(px, py, T, 2);
          }
        }
      }
    }
    this.chunkCache.set(id, c);
    if (this.chunkCache.size > 80) {
      const first = this.chunkCache.keys().next().value as number;
      this.chunkCache.delete(first);
    }
    return c;
  }

  drawTerrain(g: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number) {
    const c0x = Math.floor(camX / (24 * T)), c1x = Math.floor((camX + vw) / (24 * T));
    const c0y = Math.floor(camY / (24 * T)), c1y = Math.floor((camY + vh) / (24 * T));
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        if (cx < 0 || cy < 0 || cx * 24 >= NW || cy * 24 >= NH) continue;
        g.drawImage(this.getChunk(cx, cy), Math.round(cx * 24 * T - camX), Math.round(cy * 24 * T - camY));
      }
    }
  }

  // ---------------- minimapa ----------------
  private buildMinimap() {
    const c = cv(NW, NH); const g = ctx2(c);
    for (let ty = 0; ty < NH; ty++) {
      for (let tx = 0; tx < NW; tx++) {
        const i = tx + ty * NW;
        if (!this.land[i]) { g.fillStyle = PAL.water1; }
        else {
          const b = ZONES[this.biome[i]].biome;
          g.fillStyle = {
            savana: '#a8c84a', selva: '#3f7a3a', costa: '#58a080', deserto: '#e0cc8a',
            banhadol: '#5a7040', picos: '#dfe8f0', obsidiana: '#454050', umbigo: '#b8b0c8'
          }[b] || '#a8c84a';
        }
        g.fillRect(tx, ty, 1, 1);
      }
    }
    this.minimapCv = c;
  }

  solidAt(wx: number, wy: number): number {
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (tx < 0 || ty < 0 || tx >= NW || ty >= NH) return COLL.WATER;
    return this.coll[tx + ty * NW];
  }

  isWater(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (tx < 0 || ty < 0 || tx >= NW || ty >= NH) return true;
    return !this.land[tx + ty * NW];
  }

  // movimento com colisão por eixo (círculo r contra tiles bloqueados)
  moveEntity(pos: { x: number; y: number }, dx: number, dy: number, r: number, allowWater = false) {
    const tryAxis = (nx: number, ny: number): boolean => {
      for (const [ox, oy] of [[-r, -r * 0.4], [r, -r * 0.4], [-r, r * 0.4], [r, r * 0.4], [0, r * 0.5], [0, -r * 0.5]]) {
        const s = this.solidAt(nx + ox, ny + oy);
        if (s === COLL.BLOCK || (s === COLL.WATER && !allowWater)) return false;
      }
      return true;
    };
    if (dx !== 0 && tryAxis(pos.x + dx, pos.y)) pos.x += dx;
    if (dy !== 0 && tryAxis(pos.x, pos.y + dy)) pos.y += dy;
    pos.x = Math.max(T * 2, Math.min((NW - 2) * T, pos.x));
    pos.y = Math.max(T * 2, Math.min((NH - 2) * T, pos.y));
  }
}

export const biomeLabelColor = (bi: string): string => ({
  savana: '#a8c84a', selva: '#5adf7a', costa: '#5adfd0', deserto: '#ffe08a',
  banhadol: '#9adf5a', picos: '#cfe8ff', obsidiana: '#ff8a5a', umbigo: '#e0d0ff'
}[bi] || '#fff');

void smoothstep;
void ORES;
