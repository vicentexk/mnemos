// ============================================================
// LEONIS — systems.ts · Fórmulas de balance (PROMPT_MESTRE §5.1)
// ============================================================

import { CONFIG } from './data/defs';

// NE = arma×0.6 + peitoral×0.2 + arreio×0.2
export function calcNE(armaNivel: number, peitoralNivel: number, arreioNivel: number): number {
  const a = arreioNivel > 0 ? arreioNivel : 1;
  return armaNivel * 0.6 + peitoralNivel * 0.2 + a * 0.2;
}

// Regra da Diferença de Nível
export function dmgMult(ne: number, alvoLvl: number): { atk: number; def: number; skull: boolean; tier: 0 | 1 | 2 | 3 } {
  const N = Math.floor(alvoLvl - ne + 1e-6);
  if (N <= 0) return { atk: 1.0, def: 1.0, skull: false, tier: 0 };
  if (N <= 2) return { atk: 0.85, def: 1.2, skull: false, tier: 1 };
  if (N <= 5) {
    const t = (N - 2) / 3; // 0..1
    return { atk: lerpN(0.5, 0.25, t), def: lerpN(1.75, 2.5, t), skull: false, tier: 2 };
  }
  return { atk: 0.10, def: 3.0, skull: true, tier: 3 };
}

export interface GearItemS { slot: 'arma' | 'peitoral' | 'arreio'; nivel: number; prefixo: string; mult: number; }

export function gearNome(slot: string, nivel: number, prefixo: string): string {
  const base = slot === 'arma' ? 'Lâmina' : slot === 'peitoral' ? 'Couraça' : 'Arreio';
  return `${base} ${prefixo} Nv.${nivel}`;
}

// arma: dano = base × (1 + 0.15×(nv−1)) × mult prefixo
export function weaponDamage(baseDano: number, nivel: number, mult: number): number {
  return baseDano * (1 + 0.15 * (nivel - 1)) * mult;
}

// defesa peitoral: reduz dano recebido
export function armorReduction(peitoralNivel: number): number {
  return 1 / (1 + 0.08 * Math.max(0, peitoralNivel - 1));
}

export function upgradeCost(slot: string, nivelAtual: number): { cobres: number; ferro: number } {
  const n = nivelAtual;
  if (slot === 'peitoral') return { cobres: Math.round(12 * n), ferro: n };
  return { cobres: Math.round(15 * n), ferro: n };
}

export const barroteForgeDiscount = 0.9;

// Léguas → nível
export function xpForLevel(nivel: number): number {
  return Math.round(50 * Math.pow(nivel, 1.5));
}
export function levelBonuses(nivel: number): { hp: number; sta: number } {
  return { hp: (nivel - 1) * 8, sta: (nivel - 1) * 5 };
}

// loot de baú por nível do camp
export function rollLoot(campLvl: number, campName: string, rng: () => number): GearItemS[] {
  const out: GearItemS[] = [];
  const pref = (m: number) => m;
  const p = (base: number) => base + (rng() - 0.5) * 0.08;
  if (campName === 'toca') {
    out.push({ slot: 'arma', nivel: rng() > 0.5 ? campLvl + 1 : campLvl, prefixo: rng() > 0.5 ? 'de Kurnis' : 'da Corja', mult: pref(p(1.05)) });
    out.push({ slot: 'peitoral', nivel: Math.max(1, campLvl - 1), prefixo: 'de Kurnis', mult: pref(p(1.02)) });
  } else {
    out.push({ slot: 'arreio', nivel: campLvl, prefixo: 'da Matilha', mult: pref(p(1.06)) });
    out.push({ slot: 'peitoral', nivel: campLvl, prefixo: 'de Kurnis', mult: pref(p(1.04)) });
    if (rng() > 0.5) out.push({ slot: 'arma', nivel: campLvl + 1, prefixo: 'da Alvorada', mult: pref(p(1.08)) });
  }
  return out;
}

export const START = { x: CONFIG.SIZE * 0.5, z: CONFIG.SIZE * 0.5 };

function lerpN(a: number, b: number, t: number) { return a + (b - a) * t; }
