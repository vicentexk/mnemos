// ============================================================
// LEONIS — defs.ts · Dados canônicos do jogo (fonte: PROMPT_MESTRE v2.2)
// ============================================================

export const CONFIG = {
  SEED: 20260910,
  SIZE: 320,          // mundo do M1: 320×320 blocos (fatia da Savana Kurnis)
  WATER_Y: 7,
  REGION: 'SAVANA KURNIS'
};

export const POI = {
  village:  { x: 120, z: 176, flat: 11.5, r: 30 },
  toca:     { x: 208, z: 92,  flat: 12.0, r: 15 },
  acamp:    { x: 252, z: 208, flat: 14.5, r: 16 },
  wreck:    { x: 192, z: 138, flat: 0,    r: 8  },
  ronceiro: { x: 206, z: 112 },
  boat:     { x: 296, z: 172 },
  dock:     { x: 283, z: 172 }
};

// caminho de terra (tint): vila -> destroço -> toca / acamp
export const PATHS: [number, number, number, number][] = [
  [POI.village.x, POI.village.z, POI.wreck.x, POI.wreck.z],
  [POI.wreck.x, POI.wreck.z, POI.toca.x, POI.toca.z],
  [POI.village.x, POI.village.z, POI.acamp.x, POI.acamp.z],
  [POI.wreck.x, POI.wreck.z, POI.dock.x, POI.dock.z]
];

// ------------------------------------------------------------
// RAÇAS (Seção 5.7 do prompt mestre)
// ------------------------------------------------------------
export interface RaceDef {
  id: string; nome: string; ico: string; desc: string;
  bonusTxt: string;
  skin: number;   // cor do corpo
  escala: number; // altura global
  largura: number;
  orelhasLongas?: boolean;
  sapo?: boolean;
  mini?: boolean;       // Nimbo
  troncudo?: boolean;   // Barrote
  nadador?: boolean;    // Marejante
  planador?: boolean;   // Nimbo
  cobreBonus?: number;  // Canzaro
  hpBonus?: number;     // Barrote
  staBonus?: number;    // Silvário/Marejante
}

export const RACES: RaceDef[] = [
  { id: 'canzaro', nome: 'Canzaro', ico: '🧍', desc: 'Neto de náufragos, nascido entre docas. O Leonis típico do Porto-Canza.', bonusTxt: '+10% Cobres em contratos', skin: 0xd8a37a, escala: 1.0, largura: 1.0, cobreBonus: 0.10 },
  { id: 'marejante', nome: 'Marejante', ico: '🌊', desc: 'Sobreviveu gerações na costa do Bravo. Dentes talhados em concha.', bonusTxt: '+Stamina e nado veloz', skin: 0x7fae9c, escala: 1.0, largura: 1.0, nadador: true, staBonus: 25 },
  { id: 'barrote', nome: 'Barrote', ico: '🪵', desc: 'Baixo e troncudo, braços como mastros. Descendente dos carpinteiros da Grão-Nau.', bonusTxt: '+Vida e forja 10% mais barata', skin: 0xc98d5e, escala: 0.9, largura: 1.25, troncudo: true, hpBonus: 30 },
  { id: 'silvario', nome: 'Silvário', ico: '🍃', desc: 'Esguio, de orelhas longas, da borda da Selva Petroglifa.', bonusTxt: 'Corre mais e galopa melhor', skin: 0xe0c093, escala: 1.05, largura: 0.9, orelhasLongas: true, staBonus: 20 },
  { id: 'grevo', nome: 'Grevó', ico: '🐸', desc: 'Povo-sapo baixinho. Viviam no Banhadol ANTES da Grão-Nau — ninguém sabe dizer como.', bonusTxt: 'Mergulho longo; voz que acalma', skin: 0x6fae4f, escala: 0.85, largura: 1.1, sapo: true },
  { id: 'nimbo', nome: 'Nimbo', ico: '☁️', desc: 'Minúsculo e levíssimo, vindo do Arquipélago Suspenso. Quedas escorregam por ele.', bonusTxt: 'Sem dano de queda + planeio (Segure Espaço)', skin: 0xe8e2d0, escala: 0.78, largura: 0.9, mini: true, planador: true }
];

// ------------------------------------------------------------
// ARMAS INICIAIS — 3 famílias (Seção 5.7)
// ------------------------------------------------------------
export type FamName = 'GUERRA' | 'CAMPO' | 'ESTRANHA';
export type ProjKind = 'arrow' | 'bolt' | 'boomer' | 'serra' | 'corrente' | 'chicote' | 'nota';

export interface WeaponDef {
  id: string; nome: string; ico: string; fam: FamName;
  desc: string;
  melee: boolean;
  dano: number;       // base no nível 1
  alcance: number;    // metros (melee)
  arco: number;       // radianos (melee)
  cd: number;         // cooldown do golpe leve (s)
  heavyMult: number;
  proj?: ProjKind;
  projVel?: number;
  projTtl?: number;
  cor: number;
}

export const WEAPONS: WeaponDef[] = [
  // GUERRA
  { id: 'espada',   nome: 'Espada-Escudo',  ico: '🗡️', fam: 'GUERRA', desc: 'Segura: parry e bloqueio. A amiga de quem volta vivo.', melee: true,  dano: 12, alcance: 2.3, arco: 1.9, cd: 0.45, heavyMult: 1.8, cor: 0xd8dde2 },
  { id: 'machado',  nome: 'Machado-de-Bordo', ico: '🪓', fam: 'GUERRA', desc: 'Dano alto, lento, quebra guarda. Ferramenta e sentença.', melee: true,  dano: 17, alcance: 2.4, arco: 2.2, cd: 0.82, heavyMult: 2.0, cor: 0xb08968 },
  { id: 'lanca',    nome: 'Lança',          ico: '🔱', fam: 'GUERRA', desc: 'Alcance longo. A melhor amiga do combate montado.', melee: true,  dano: 13, alcance: 3.3, arco: 1.1, cd: 0.58, heavyMult: 1.9, cor: 0x9a7648 },
  { id: 'besta',    nome: 'Besta-Pesada',   ico: '🏹', fam: 'GUERRA', desc: 'Virote que perfura armadura. Recarga lenta, rancorosa.', melee: false, dano: 16, alcance: 0, arco: 0, cd: 1.15, heavyMult: 1.6, proj: 'bolt', projVel: 46, projTtl: 1.6, cor: 0x6a5648 },
  // CAMPO
  { id: 'arco',     nome: 'Arco-Longo',     ico: '🏹', fam: 'CAMPO', desc: 'Distância e tiro em arco. Para quem atira e anda.', melee: false, dano: 11, alcance: 0, arco: 0, cd: 0.7, heavyMult: 1.9, proj: 'arrow', projVel: 34, projTtl: 2.4, cor: 0x8a6a3a },
  { id: 'foice',    nome: 'Foice',          ico: '🌾', fam: 'CAMPO', desc: 'Varredura em área. Colhe material extra da flora.', melee: true,  dano: 10, alcance: 2.6, arco: 3.1, cd: 0.62, heavyMult: 1.7, cor: 0xc0c8cc },
  { id: 'adagas',   nome: 'Adagas-Gêmeas',  ico: '🔪', fam: 'CAMPO', desc: 'Velocidade cruenta; crítico pelas costas.', melee: true,  dano: 8,  alcance: 1.9, arco: 1.6, cd: 0.28, heavyMult: 1.6, cor: 0xaab4bc },
  { id: 'chicote',  nome: 'Chicote-de-Carga', ico: '🪢', fam: 'CAMPO', desc: 'Puxa itens e inimigos. A logística que morde.', melee: false, dano: 8,  alcance: 0, arco: 0, cd: 0.55, heavyMult: 1.5, proj: 'chicote', projVel: 40, projTtl: 0.22, cor: 0x6a4a2a },
  // ESTRANHA
  { id: 'bumerangue', nome: '⭐ Bumerangue', ico: '🪃', fam: 'ESTRANHA', desc: 'Acerta na ida E na volta. A arma Leonis por excelência: mata e traz a carga.', melee: false, dano: 10, alcance: 0, arco: 0, cd: 0.8, heavyMult: 1.7, proj: 'boomer', projVel: 26, projTtl: 2.2, cor: 0xd8a44a },
  { id: 'serra',    nome: 'Serra-Marinheiro', ico: '⚙️', fam: 'ESTRANHA', desc: 'Disco que ricocheteia em pedra e osso. Nas docas, cortava cordas. Agora corta o resto.', melee: false, dano: 11, alcance: 0, arco: 0, cd: 0.72, heavyMult: 1.7, proj: 'serra', projVel: 30, projTtl: 2.6, cor: 0x9aa8b0 },
  { id: 'corrente', nome: 'Corrente-Âncora', ico: '⚓', fam: 'ESTRANHA', desc: 'Puxa inimigos pra cima do seu aço. Ancora o que não deve fugir.', melee: false, dano: 9,  alcance: 0, arco: 0, cd: 0.85, heavyMult: 1.6, proj: 'corrente', projVel: 42, projTtl: 0.35, cor: 0x707880 },
  { id: 'flauta',   nome: 'Flauta-do-Pastor', ico: '🎶', fam: 'ESTRANHA', desc: 'Dano quase nulo; ACALMA feras e desarma ânimos. Sinergia pura com doma.', melee: false, dano: 2,  alcance: 0, arco: 0, cd: 0.9, heavyMult: 1.2, proj: 'nota', projVel: 30, projTtl: 0.9, cor: 0xcfc3a0 }
];

// ------------------------------------------------------------
// Inimigos da Corja
// ------------------------------------------------------------
export interface CorjaDef { nome: string; lvl: number; hp: number; dmg: number; speed: number; skin: number; tunica: number; escala: number; }
export const CORJA: Record<string, CorjaDef> = {
  farejador: { nome: 'Farejador', lvl: 2, hp: 70,  dmg: 9,  speed: 3.1, skin: 0x7aa393, tunica: 0x454f63, escala: 1.0 },
  cacador:   { nome: 'Caçador',   lvl: 4, hp: 120, dmg: 14, speed: 3.4, skin: 0x6f9a8c, tunica: 0x5a3a3a, escala: 1.12 }
};

// ------------------------------------------------------------
// Itens / gear
// ------------------------------------------------------------
export type Slot = 'arma' | 'peitoral' | 'arreio';
export interface GearItem { slot: Slot; nivel: number; prefixo: string; mult: number; }

export const MATERIAIS = {
  ferro: 'Ferro-Canza',
  erva: 'Erva-de-Kurnis',
  carga: 'Carga Selada'
};

export function rollPrefixo(rng: () => number): { prefixo: string; mult: number } {
  const r = rng();
  if (r < 0.25) return { prefixo: 'de Kurnis', mult: 1.08 };
  if (r < 0.45) return { prefixo: 'da Alvorada', mult: 1.06 };
  if (r < 0.6)  return { prefixo: 'do Banhadol', mult: 1.05 };
  if (r < 0.72) return { prefixo: 'da Corja', mult: 1.04 };
  return { prefixo: 'gasta', mult: 0.95 };
}

export function gearNome(slot: Slot, nivel: number, prefixo: string): string {
  const base = slot === 'arma' ? 'Lâmina' : slot === 'peitoral' ? 'Couraça' : 'Arreio';
  return `${base} ${prefixo} Nv.${nivel}`;
}

// ============================================================
// M2D — dados do jogo 2D top-down (sandbox, zonas abertas)
// ============================================================

export interface ZoneDef {
  id: string; nome: string; lvl: number;
  cx: number; cy: number; r: number;
  biome: BiomeId;
}

export type BiomeId = 'savana' | 'selva' | 'costa' | 'deserto' | 'banhadol' | 'picos' | 'obsidiana' | 'umbigo';

// Sandbox: todas as zonas abertas desde o início; o nível é do conteúdo.
export const ZONES: ZoneDef[] = [
  { id: 'berco',     nome: 'O Berço',             lvl: 1,  cx: 180, cy: 272, r: 40, biome: 'savana' },
  { id: 'kurnis',    nome: 'Savana Kurnis',       lvl: 1,  cx: 148, cy: 212, r: 68, biome: 'savana' },
  { id: 'kurnis2',   nome: 'Kurnis Profundo',     lvl: 2,  cx: 238, cy: 218, r: 62, biome: 'savana' },
  { id: 'selva',     nome: 'Selva Petroglifa',    lvl: 3,  cx: 292, cy: 158, r: 62, biome: 'selva' },
  { id: 'costa',     nome: 'Costa das Tormentas', lvl: 4,  cx: 82,  cy: 172, r: 58, biome: 'costa' },
  { id: 'deserto',   nome: 'Deserto de Vidro',    lvl: 5,  cx: 118, cy: 78,  r: 66, biome: 'deserto' },
  { id: 'banhadol',  nome: 'Banhadol',            lvl: 6,  cx: 248, cy: 76,  r: 58, biome: 'banhadol' },
  { id: 'picos',     nome: 'Picos Ossos',         lvl: 8,  cx: 178, cy: 30,  r: 62, biome: 'picos' },
  { id: 'obsidiana', nome: 'Terras de Obsidiana', lvl: 10, cx: 62,  cy: 34,  r: 54, biome: 'obsidiana' },
  { id: 'umbigo',    nome: 'Umbigo do Mundo',     lvl: 12, cx: 300, cy: 28,  r: 48, biome: 'umbigo' }
];

export const MAP = { W: 360, H: 360, T: 16 };

export interface OreDef { id: string; nome: string; ico: string; valor: number; cor: number; corClara: number; }
// minérios inspirados nas referências pixel do usuário
export const ORES: Record<string, OreDef> = {
  ferro:     { id: 'ferro',     nome: 'Ferro-Canza',    ico: '⛓', valor: 2,  cor: 0x6a5a4a, corClara: 0xc88a4a },
  cobre:     { id: 'cobre',     nome: 'Cobre-Fera',     ico: '🟤', valor: 4,  cor: 0x4a6a6a, corClara: 0x4ac8b8 },
  vidro:     { id: 'vidro',     nome: 'Vidro-Marinho',  ico: '🔷', valor: 6,  cor: 0x4a5a7a, corClara: 0x8ad8f0 },
  ambar:     { id: 'ambar',     nome: 'Âmbar-Sonoro',   ico: '🟠', valor: 8,  cor: 0x7a5a2a, corClara: 0xf0b03a },
  prata:     { id: 'prata',     nome: 'Presa-Fria',     ico: '⚪', valor: 10, cor: 0x6a7480, corClara: 0xe8f0f4 },
  obsidiana: { id: 'obsidiana', nome: 'Obsidiana Viva', ico: '🟣', valor: 16, cor: 0x2e2838, corClara: 0xb06ae8 },
  aurora:    { id: 'aurora',    nome: 'Página-Aurora',  ico: '❄',  valor: 30, cor: 0x3a5a7a, corClara: 0x7ae8ff }
};

export function oreDaZona(lvl: number): string {
  if (lvl <= 2) return 'ferro';
  if (lvl <= 4) return 'cobre';
  if (lvl <= 6) return 'ambar';
  if (lvl <= 8) return 'prata';
  if (lvl <= 10) return 'obsidiana';
  return 'aurora';
}

// POIs fixos da savana (tutorial sandbox)
export const POI2 = {
  vila:     { x: 180, y: 272 },
  pier:     { x: 252, y: 282 },
  lake:     { x: 285, y: 288, r: 26 },
  wreck:    { x: 148, y: 196 },
  ronceiro: { x: 232, y: 198 }
};

// ============================================================
// M2D — MONTARIAS (cada uma com domação específica)
// ============================================================
export interface MountDef {
  id: string; nome: string; ico: string; cor: string;
  como: string;   // como domar (mostrado pelo Domador)
  dica: string;   // flavor
  spd: number;    // multiplicador de galope
  hp: number;
}
export const MOUNTS: MountDef[] = [
  { id: 'ronceiro', nome: 'Ronceiro',    ico: '🐎', cor: '#8a6248', como: 'Missão do Brais: livre-o da Corja e alimente-o com 3 Ervas.',      dica: 'O clássico. Leal como o que volta.',              spd: 1.0,  hp: 80 },
  { id: 'bufelo',   nome: 'Bufelo',      ico: '🐃', cor: '#5a4a3a', como: 'ACERTE 25 golpes PESADOS em feras. A força acalma esse bicho.',   dica: 'Chifres de esmagar pedra. Coração de manteiga.',  spd: 1.1,  hp: 120 },
  { id: 'javalina', nome: 'Javalina',    ico: '🐗', cor: '#6a5248', como: 'ALIMENTE 4 Carnes perto dela. Quem come junto, anda junto.',      dica: 'Come tudo. Inclusive o que você precisava.',      spd: 1.15, hp: 95 },
  { id: 'corsaria', nome: 'Corsária',    ico: '🦌', cor: '#4a6a5a', como: 'Chegue até ela DE BARCO. Mar é o único caminho honrado.',         dica: 'Aprende o balanço das ondas antes do galope.',    spd: 1.2,  hp: 85 },
  { id: 'rocclume', nome: 'Roc-Clume',   ico: '🦅', cor: '#7a8a9a', como: 'VISITE os Picos Ossos e volte ao Domador. Altura impressiona.',   dica: 'Meia-ave, meia-lenda. Atherosaurus menor.',       spd: 1.3,  hp: 90 },
  { id: 'mirage',   nome: 'Mirage',      ico: '🦄', cor: '#b0a0c8', como: 'SOBREVIVA 60s no Umbigo do Mundo e retorne. O terror ensina.',    dica: 'Ninguém sabe se existe. Quem doma, não conta.',   spd: 1.4,  hp: 100 }
];

// arma jogável → família visual no atlas (10 tiers cada)
export const WEAPON_FAM: Record<string, string> = {
  espada: 'longswords', machado: 'battleaxes', lanca: 'spears',
  besta: 'crossbows',   arco: 'bows',          foice: 'sickles',
  adagas: 'daggers',    chicote: 'sling',      bumerangue: 'boomerang',
  serra: 'chakram',     corrente: 'foils',     flauta: 'wands'
};

// árvore de habilidades (estilo Forager) — 4 ramos
export interface SkillDef { id: string; nome: string; desc: string; ramo: 'GUERRA' | 'AGILIDADE' | 'OFICIO' | 'VIGOR'; req?: string; }
export const SKILLS: SkillDef[] = [
  // GUERRA (vermelho)
  { id: 'dano1',  nome: 'Fio Cortante',   desc: '+12% de dano',                        ramo: 'GUERRA' },
  { id: 'dano2',  nome: 'Peso do Bravo',  desc: '+12% de dano (acumula)',              ramo: 'GUERRA', req: 'dano1' },
  { id: 'vida1',  nome: 'Couro Duro',     desc: '+20 de Vida máxima',                  ramo: 'GUERRA' },
  { id: 'vida2',  nome: 'Peito de Canza', desc: '+20 de Vida máxima (acumula)',        ramo: 'GUERRA', req: 'vida1' },
  { id: 'furia',  nome: 'Fúria',          desc: 'Golpes pesados empurram mais longe',  ramo: 'GUERRA', req: 'dano1' },
  // AGILIDADE (azul)
  { id: 'rol1',   nome: 'Rolamento Curto', desc: 'Esquiva mais rápida (recarga -0,35s)', ramo: 'AGILIDADE' },
  { id: 'rol2',   nome: 'Rolamento Longo', desc: 'Esquiva vai mais longe',               ramo: 'AGILIDADE', req: 'rol1' },
  { id: 'vel1',   nome: 'Pés Leves',      desc: '+8% velocidade',                      ramo: 'AGILIDADE' },
  { id: 'vel2',   nome: 'Vento Kurnis',   desc: '+8% velocidade (acumula)',            ramo: 'AGILIDADE', req: 'vel1' },
  { id: 'imã',    nome: 'Ímã de Carga',   desc: 'Atrai drops de longe',                ramo: 'AGILIDADE', req: 'vel1' },
  // OFÍCIO (amarelo)
  { id: 'min1',   nome: 'Pico Fundo',     desc: '+1 uso por veio de minério',          ramo: 'OFICIO' },
  { id: 'col1',   nome: 'Mão Verde',      desc: 'Ervas rendem o dobro',                ramo: 'OFICIO' },
  { id: 'forja1', nome: 'Barganha',       desc: 'Forja 15% mais barata',               ramo: 'OFICIO' },
  { id: 'doma1',  nome: 'Vínculo',        desc: 'Vínculo de montaria sobe 2× mais rápido', ramo: 'OFICIO' },
  { id: 'doma2',  nome: 'Galope Ágil',    desc: '+15% velocidade de galope',           ramo: 'OFICIO', req: 'doma1' },
  // VIGOR (verde)
  { id: 'sta1',   nome: 'Fôlego',         desc: '+20 de Stamina máxima',               ramo: 'VIGOR' },
  { id: 'fole1',  nome: 'Fole Dobrado',   desc: 'Recupera Stamina 50% mais rápido',    ramo: 'VIGOR', req: 'sta1' },
  { id: 'vigor1', nome: 'Sangue Calmo',   desc: 'Regenera Vida fora de combate',       ramo: 'VIGOR' },
  { id: 'vida3',  nome: 'Robustez',       desc: '+20 de Vida máxima',                  ramo: 'VIGOR', req: 'sta1' },
  { id: 'carne1', nome: 'Bom Talho',      desc: 'Carne cura 50 em vez de 30',          ramo: 'VIGOR', req: 'vigor1' }
];

// ============================================================
// CHEFES DE ZONA (M3) + O PORTEIRO (fim de jogo)
// ============================================================
export interface BossDef {
  zone: string; nome: string; kind: string; lvl: number;
  scale: number; cor: string; titulo: string; final?: boolean;
}
export const BOSSES: BossDef[] = [
  { zone: 'berco',     nome: 'Fareja-Mor',           kind: 's', lvl: 1,  scale: 1.9, cor: '#e0d040', titulo: 'O primeiro dente' },
  { zone: 'kurnis',    nome: 'Dente-Velho',          kind: 'f', lvl: 1,  scale: 2.0, cor: '#e07040', titulo: 'Manso só até apanhar' },
  { zone: 'kurnis2',   nome: 'Presa-Corja',          kind: 'a', lvl: 2,  scale: 2.0, cor: '#60c0e0', titulo: 'Flecha que não erra duas vezes' },
  { zone: 'selva',     nome: 'Mãe dos Musgos',       kind: 'T', lvl: 3,  scale: 2.1, cor: '#60e070', titulo: 'A selva tem dentes' },
  { zone: 'costa',     nome: 'Marejante',            kind: 'g', lvl: 4,  scale: 2.1, cor: '#4090e0', titulo: 'Engole navio e navio' },
  { zone: 'deserto',   nome: 'Vidreiro',             kind: 'h', lvl: 5,  scale: 2.0, cor: '#c0e0ff', titulo: 'Uivo que corta vidro' },
  { zone: 'banhadol',  nome: 'Lamaçal Vivo',         kind: 'T', lvl: 6,  scale: 2.3, cor: '#8a9a40', titulo: 'O pântano anda' },
  { zone: 'picos',     nome: 'Atheros, o Pico',      kind: 'T', lvl: 8,  scale: 2.5, cor: '#e8e8f0', titulo: 'Atherosaurus, autêntico' },
  { zone: 'obsidiana', nome: 'Coração de Obsidiana', kind: 'T', lvl: 10, scale: 2.5, cor: '#c060e0', titulo: 'Bate uma vez por século' },
  { zone: 'umbigo',    nome: 'O PORTEIRO',           kind: 'T', lvl: 12, scale: 2.8, cor: '#ff4040', titulo: 'Ninguém atravessa sem pedir licença', final: true }
];

// ============================================================
// PORÕES (dungeons) — buracos escuros com sala, guardas e baú
// ============================================================
export interface DunDef { id: string; nome: string; zone: string; lvl: number; loot: number; cor: string; }
export const DUNGEONS: DunDef[] = [
  { id: 'porao',    nome: 'PORÃO DO NAUFRÁGIO',    zone: 'berco',     lvl: 2,  loot: 2,  cor: '#5a7a94' },
  { id: 'mare',     nome: 'GRUTA DA MARÉ',          zone: 'costa',     lvl: 4,  loot: 4,  cor: '#3a9ad8' },
  { id: 'fossil',   nome: 'JARDIM FÓSSIL',          zone: 'selva',     lvl: 5,  loot: 5,  cor: '#4ac06a' },
  { id: 'fornalha', nome: 'FORNALHA DE OBSIDIANA',  zone: 'obsidiana', lvl: 10, loot: 10, cor: '#c060e0' },
  { id: 'cripta',   nome: 'CRIPTA DO NAVEGANTE',    zone: 'umbigo',    lvl: 12, loot: 10, cor: '#ff5050' }
];
