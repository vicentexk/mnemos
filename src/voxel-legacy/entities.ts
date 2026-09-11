// ============================================================
// LEONIS — entities.ts · Personagens estilo Cube World + movimento fluido
// (referência: chibi voxel — cabelo em blocos, olhos com brilho,
//  punhos, botas com sola, cinto com fivela)
// ============================================================

import * as THREE from 'three';
import { RaceDef, WeaponDef, POI } from '../data/defs';
import { weaponDamage } from '../systems';
import { World } from './world';
import { Input, clamp, angLerp } from '../core';

// ------------------------------------------------------------
// sombra blob
// ------------------------------------------------------------
export function makeBlobShadow(): THREE.Mesh {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const ctx = cv.getContext('2d')!;
  const grd = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grd.addColorStop(0, 'rgba(0,0,0,0.4)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

const lam = (hex: number) => new THREE.MeshLambertMaterial({ color: hex, side: THREE.DoubleSide });
const box = (w: number, h: number, d: number, mat: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

// paleta de cabelo/túnica por raça (estilo Cube World: cores vivas)
const RACE_STYLE: Record<string, { hair: number; tunic: number; tunicDark: number }> = {
  canzaro:   { hair: 0xe8c83a, tunic: 0x5a4a8a, tunicDark: 0x46386c }, // louro + túnica roxa (homenagem à referência)
  marejante: { hair: 0x2a6a6a, tunic: 0x2f7a6a, tunicDark: 0x24604f },
  barrote:   { hair: 0xb0562a, tunic: 0x8a4a2a, tunicDark: 0x6e3a20 },
  silvario:  { hair: 0x4a8f2a, tunic: 0x3a6a3a, tunicDark: 0x2e522c },
  grevo:     { hair: 0x2a5a1a, tunic: 0x6a4a8a, tunicDark: 0x523a6c },
  nimbo:     { hair: 0xe8e2d0, tunic: 0xb8b2a0, tunicDark: 0x948e7e }
};

// ------------------------------------------------------------
// personagem chibi voxel (ESTILO CUBE WORLD)
// ------------------------------------------------------------
export interface CharParts {
  group: THREE.Group;
  spinner: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group; armR: THREE.Group;
  legL: THREE.Group; legR: THREE.Group;
  weaponAnchor: THREE.Group;
}

export function buildCharacter(race: RaceDef, weapon: WeaponDef): CharParts {
  const group = new THREE.Group();
  const spinner = new THREE.Group();
  group.add(spinner);

  const style = RACE_STYLE[race.id] || RACE_STYLE.canzaro;
  const skin = lam(race.skin);
  const hairM = lam(style.hair);
  const tunicM = lam(style.tunic);
  const tunicD = lam(style.tunicDark);
  const bootM = lam(0x2a2a30);
  const soleM = lam(0x9a9aa2);
  const s = race.escala;
  const W = race.largura;

  // ---- pernas: bota escura + sola clara ----
  const mkLeg = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x * s, 0.66 * s, 0);
    const upper = box(0.27 * W * s, 0.4 * s, 0.3 * s, tunicD);      // calça/túnica baixa
    upper.position.y = -0.2 * s;
    g.add(upper);
    const boot = box(0.29 * W * s, 0.28 * s, 0.32 * s, bootM);      // bota
    boot.position.y = -0.52 * s;
    g.add(boot);
    const sole = box(0.31 * W * s, 0.1 * s, 0.36 * s, soleM);       // sola
    sole.position.set(0, -0.68 * s, 0.02 * s);
    g.add(sole);
    spinner.add(g);
    return g;
  };
  const legL = mkLeg(-0.19 * W);
  const legR = mkLeg(0.19 * W);

  // ---- tronco: túnica + barra inferior + cinto com fivela ----
  const body = box(0.74 * W * s, 0.5 * s, 0.44 * s, tunicM);
  body.position.y = 0.66 * s + 0.25 * s;
  spinner.add(body);
  const skirt = box(0.78 * W * s, 0.26 * s, 0.48 * s, tunicD);      // barra da túnica
  skirt.position.y = 0.62 * s;
  spinner.add(skirt);
  const collar = box(0.4 * W * s, 0.12 * s, 0.46 * s, lam(0x3f8f2f)); // gola
  collar.position.y = 1.13 * s;
  spinner.add(collar);
  const belt = box(0.8 * W * s, 0.14 * s, 0.5 * s, lam(0x3a2a1a));   // cinto
  belt.position.y = 0.86 * s;
  spinner.add(belt);
  const buckle = box(0.16 * s, 0.16 * s, 0.06, lam(0xc8ccd4));       // fivela prata
  buckle.position.set(0, 0.86 * s, 0.26 * s);
  spinner.add(buckle);

  // ---- braços: ombro + braço + PUNHO ----
  const mkArm = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x * s, 1.12 * s, 0);
    const shoulder = box(0.3 * W * s, 0.18 * s, 0.3 * s, tunicM);
    shoulder.position.y = -0.06 * s;
    g.add(shoulder);
    const arm = box(0.24 * W * s, 0.4 * s, 0.26 * s, skin);
    arm.position.y = -0.34 * s;
    g.add(arm);
    const fist = box(0.3 * W * s, 0.22 * s, 0.32 * s, skin);         // punho blocudo
    fist.position.set(0, -0.62 * s, 0.02 * s);
    g.add(fist);
    spinner.add(g);
    return g;
  };
  const armL = mkArm(-(0.38 * W + 0.13));
  const armR = mkArm(0.38 * W + 0.13);

  // ---- cabeça (45% da altura) com cabelo em blocos ----
  const head = new THREE.Group();
  head.position.y = (1.16 + 0.44) * s;
  const hd = box(0.94 * s, 0.86 * s, 0.9 * s, skin);
  head.add(hd);

  // olhos: retângulos escuros adjacentes + brilho (estilo Cube World)
  const eyeM = lam(0x1c2f66);
  const glintM = lam(0xffffff);
  for (const ex of [-0.13, 0.13]) {
    const e = box(0.15 * s, 0.24 * s, 0.05, eyeM);
    e.position.set(ex * s, 0.06 * s, 0.46 * s);
    head.add(e);
    const gl = box(0.05 * s, 0.07 * s, 0.05, glintM);
    gl.position.set(ex * s + 0.03 * s, 0.13 * s, 0.47 * s);
    head.add(gl);
  }
  // sobrancelhas discretas
  for (const ex of [-0.13, 0.13]) {
    const br = box(0.17 * s, 0.05 * s, 0.05, hairM);
    br.position.set(ex * s, 0.22 * s, 0.46 * s);
    head.add(br);
  }
  // orelhas rosadas
  const earM = lam(0xe8a88a);
  for (const ex of [-1, 1]) {
    const ear = box(0.08 * s, 0.2 * s, 0.2 * s, earM);
    ear.position.set(ex * 0.5 * s, 0.02 * s, 0);
    head.add(ear);
  }
  if (race.sapo) {
    const mouth = box(0.52 * s, 0.07 * s, 0.05, lam(0x2a4a1a));
    mouth.position.set(0, -0.26 * s, 0.46 * s);
    head.add(mouth);
  }
  if (race.troncudo) {
    const beard = box(0.56 * s, 0.26 * s, 0.12 * s, hairM);
    beard.position.set(0, -0.38 * s, 0.4 * s);
    head.add(beard);
  }

  // cabelo em blocos (franja + topo + laterais + nuca)
  if (!race.sapo) {
    const top = box(1.0 * s, 0.2 * s, 0.94 * s, hairM);
    top.position.y = 0.5 * s;
    head.add(top);
    const fringe = box(0.98 * s, 0.2 * s, 0.2 * s, hairM);           // franja sobre a testa
    fringe.position.set(0, 0.32 * s, 0.38 * s);
    head.add(fringe);
    const fringe2 = box(0.3 * s, 0.16 * s, 0.14 * s, hairM);         // mecha central caindo
    fringe2.position.set(0.12 * s, 0.22 * s, 0.42 * s);
    head.add(fringe2);
    for (const ex of [-1, 1]) {
      const side = box(0.12 * s, 0.42 * s, 0.62 * s, hairM);         // laterais
      side.position.set(ex * 0.51 * s, 0.18 * s, -0.04 * s);
      head.add(side);
    }
    const back = box(0.98 * s, 0.3 * s, 0.18 * s, hairM);            // nuca
    back.position.set(0, 0.28 * s, -0.4 * s);
    head.add(back);
    const spike = box(0.24 * s, 0.16 * s, 0.24 * s, hairM);          // topete
    spike.position.set(-0.14 * s, 0.66 * s, 0.05 * s);
    head.add(spike);
  }
  if (race.orelhasLongas) {
    for (const ex of [-0.32, 0.32]) {
      const ear = box(0.12 * s, 0.52 * s, 0.1 * s, skin);
      ear.position.set(ex * s, 0.66 * s, -0.05 * s);
      head.add(ear);
    }
  }
  spinner.add(head);

  // asas do Nimbo
  if (race.planador) {
    for (const ex of [-1, 1]) {
      const wing = box(0.52 * s, 0.08 * s, 0.32 * s, lam(0xf0eee4));
      wing.position.set(ex * 0.56 * s, 1.16 * s, -0.24 * s);
      wing.rotation.z = ex * 0.32;
      spinner.add(wing);
    }
  }
  // mochila de carga
  const pack = box(0.52 * s, 0.52 * s, 0.26 * s, lam(0x7a5a34));
  pack.position.set(0, 1.05 * s, -0.36 * s);
  spinner.add(pack);
  const packStrap = box(0.54 * s, 0.08 * s, 0.5 * s, lam(0x4a3a20));
  packStrap.position.set(0, 1.1 * s, 0);
  spinner.add(packStrap);

  // arma na mão direita
  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0, -0.62 * s, 0.08);
  armR.add(weaponAnchor);
  buildWeaponMesh(weapon, weaponAnchor);

  return { group, spinner, head, armL, armR, legL, legR, weaponAnchor };
}

export function buildWeaponMesh(weapon: WeaponDef, parent: THREE.Group) {
  while (parent.children.length) parent.remove(parent.children[0]);
  const c = weapon.cor;
  const add = (m: THREE.Mesh, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m);
  };
  if (weapon.melee) {
    if (weapon.id === 'espada') {
      add(box(0.09, 0.85, 0.22, lam(c)), 0, 0.55, 0.1);
      add(box(0.3, 0.08, 0.26, lam(0x8a6a3a)), 0, 0.12, 0.1);
      add(box(0.09, 0.25, 0.12, lam(0x4a3220)), 0, -0.03, 0.1);
    } else if (weapon.id === 'machado') {
      add(box(0.09, 1.15, 0.14, lam(0x6a4a2a)), 0, 0.4, 0.1);
      add(box(0.5, 0.4, 0.12, lam(c)), 0.16, 0.85, 0.1);
      add(box(0.5, 0.4, 0.12, lam(c)), -0.16, 0.85, 0.1);
    } else if (weapon.id === 'lanca') {
      add(box(0.08, 1.7, 0.1, lam(0x8a6a3a)), 0, 0.6, 0.15);
      add(box(0.1, 0.3, 0.05, lam(c)), 0, 1.55, 0.15);
    } else if (weapon.id === 'foice') {
      add(box(0.08, 1.3, 0.1, lam(0x6a4a2a)), 0, 0.45, 0.1);
      add(box(0.5, 0.12, 0.08, lam(c)), 0.3, 1.05, 0.1, 0, 0, -0.5);
    } else if (weapon.id === 'adagas') {
      add(box(0.07, 0.45, 0.14, lam(c)), 0, 0.3, 0.1);
    }
  } else {
    switch (weapon.proj) {
      case 'bolt':
      case 'arrow':
        add(box(0.07, 1.05, 0.2, lam(0x5a4028)), 0, 0.35, 0.12);
        add(box(0.06, 0.35, 0.06, lam(c)), 0, 0.6, 0.12, 0, 0, 0.6);
        break;
      case 'boomer':
        add(box(0.5, 0.1, 0.12, lam(c)), 0.12, 0.3, 0.12, 0, 0, -0.5);
        add(box(0.5, 0.1, 0.12, lam(c)), -0.12, 0.3, 0.12, 0, 0, 0.5);
        break;
      case 'serra':
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10), lam(c)), 0, 0.3, 0.15, Math.PI / 2);
        break;
      case 'corrente':
        add(box(0.1, 0.5, 0.1, lam(c)), 0, 0.3, 0.12);
        add(box(0.3, 0.22, 0.16, lam(0x4a4e56)), 0, 0.6, 0.12);
        break;
      case 'chicote':
        for (let i = 0; i < 4; i++) add(box(0.07, 0.22, 0.07, lam(c)), 0, 0.1 + i * 0.2, 0.1 + i * 0.05);
        break;
      case 'nota':
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 8), lam(c)), 0, 0.3, 0.14, Math.PI / 2.2);
        break;
    }
  }
}

// ------------------------------------------------------------
// helper de movimento (compartilhado player/montaria)
// ------------------------------------------------------------
export interface MoveCtx { WATER: number; }

export function applyGroundMove(
  pos: THREE.Vector3, vel: THREE.Vector3, dt: number, world: World,
  game: MoveCtx, stepMax: number
): { blocked: boolean } {
  const nx = pos.x + vel.x * dt;
  const nz = pos.z + vel.z * dt;
  const nh = world.heightAt(nx, nz);
  let blocked = false;
  // degrau alto demais = parede (a menos que esteja pulando por cima)
  if (nh - pos.y > stepMax && nh > game.WATER - 0.3) {
    // tenta deslizar em x
    const nhx = world.heightAt(pos.x + vel.x * dt, pos.z);
    const nhz = world.heightAt(pos.x, pos.z + vel.z * dt);
    if (nhx - pos.y <= stepMax) { pos.x += vel.x * dt; blocked = true; }
    else if (nhz - pos.y <= stepMax) { pos.z += vel.z * dt; blocked = true; }
    else { blocked = true; }
  } else {
    pos.x = nx; pos.z = nz;
  }
  return { blocked };
}

// ------------------------------------------------------------
// JOGADOR
// ------------------------------------------------------------
export class Player {
  parts: CharParts;
  pos = new THREE.Vector3();
  visY = 0;
  vel = new THREE.Vector3();
  yaw = 0;
  hp = 100; maxHp = 100;
  sta = 100; maxSta = 100;
  leguas = 0; nivel = 1;
  cobres = 20; ferro = 0; erva = 0; cargas = 0;
  equip = { armaNivel: 1, peitoralNivel: 1, arreioNivel: 0, multArma: 1, multPeitoral: 1 };
  arma: WeaponDef;
  race: RaceDef;
  nome: string;
  cooldown = 0;
  attackT = -1; attackHeavy = false;
  rollT = -1;
  mounted: Mount | null = null;
  onBoat = false;
  dead = false;
  animT = 0;
  hurtT = 0;
  private airT = 0;

  constructor(race: RaceDef, weapon: WeaponDef, nome: string) {
    this.race = race;
    this.arma = weapon;
    this.nome = nome || 'Novo Leonis';
    this.parts = buildCharacter(race, weapon);
    this.maxHp = 100 + (race.hpBonus || 0);
    this.hp = this.maxHp;
    this.maxSta = 100 + (race.staBonus || 0);
    this.sta = this.maxSta;
    this.visY = this.pos.y;
  }

  ne(): number {
    return this.equip.armaNivel * 0.6 + this.equip.peitoralNivel * 0.2 + (this.equip.arreioNivel || 1) * 0.2;
  }

  weaponDamage(heavy: boolean): number {
    let d = weaponDamage(this.arma.dano, this.equip.armaNivel, this.equip.multArma);
    if (heavy) d *= this.arma.heavyMult;
    if (this.mounted && this.mounted.bond >= 3) d *= 1.15;
    if (this.mounted && this.mounted.bond >= 5) d *= 1.05;
    return d;
  }

  update(dt: number, input: Input, world: World, game: any) {
    if (this.dead) return;
    this.animT += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);

    if (this.mounted) { this.updateMounted(dt, input, game); return; }
    if (this.onBoat) { this.sta = clamp(this.sta + 22 * dt, 0, this.maxSta); this.animate(dt, false, false); this.syncMesh(); return; }

    const camYaw = game.camYaw as number;
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -fz, rz = fx;
    let mx = 0, mz = 0;
    if (input.down('KeyW')) { mx += fx; mz += fz; }
    if (input.down('KeyS')) { mx -= fx; mz -= fz; }
    if (input.down('KeyD')) { mx += rx; mz += rz; }
    if (input.down('KeyA')) { mx -= rx; mz -= rz; }
    const moving = mx !== 0 || mz !== 0;
    if (moving) { const l = Math.hypot(mx, mz); mx /= l; mz /= l; }

    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const groundH = world.heightAt(this.pos.x, this.pos.z);
    const inWater = groundH < game.WATER - 0.35 && this.pos.y <= game.WATER + 0.15;
    const grounded = this.pos.y <= groundH + 0.02;

    // ---- esquiva (C): rápida, com impulso firme ----
    if (input.pressed('KeyC') && this.rollT < 0 && this.sta >= 20 && !inWater) {
      this.rollT = 0; this.sta -= 20;
      const dir = moving ? Math.atan2(mx, mz) : this.yaw;
      this.yaw = dir;
      this.vel.x = Math.sin(dir) * 13;
      this.vel.z = Math.cos(dir) * 13;
      game.audio.sfx('swing');
    }

    // ---- ataque (com passinho pra frente estilo CW) ----
    if (this.attackT >= 0) {
      this.attackT += dt / (this.attackHeavy ? this.arma.cd * 1.6 : this.arma.cd);
      if (this.attackT >= 1) this.attackT = -1;
    }
    if (!inWater && this.cooldown <= 0 && this.attackT < 0) {
      if (input.lmbJust && this.sta >= 6) this.tryAttack(false, game, grounded);
      else if (input.rmbJust && this.sta >= 12) this.tryAttack(true, game, grounded);
    }

    // ---- movimento: aceleração seca, controle total no ar (fluidez CW) ----
    const runSpeed = 7.4;
    let drain = 0;
    let speed = runSpeed;
    if (sprint && moving && this.sta > 1) { speed *= 1.45; drain += 10; }
    if (inWater) { speed = this.race.nadador ? 5.2 : 3.9; drain += this.race.nadador ? 2 : 3.5; }

    if (this.rollT >= 0) {
      this.rollT += dt / 0.36;
      const damp = Math.pow(0.001, dt);
      this.vel.x *= damp; this.vel.z *= damp;
      if (this.rollT >= 1) this.rollT = -1;
    } else if (moving) {
      const accel = 1 - Math.pow(1e-8, dt);   // quase instantâneo
      this.vel.x += (mx * speed - this.vel.x) * accel;
      this.vel.z += (mz * speed - this.vel.z) * accel;
      this.yaw = angLerp(this.yaw, Math.atan2(mx, mz), 1 - Math.pow(0.000001, dt));
    } else {
      const stop = Math.pow(1e-9, dt);
      this.vel.x *= stop; this.vel.z *= stop;
      if (Math.abs(this.vel.x) < 0.02) this.vel.x = 0;
      if (Math.abs(this.vel.z) < 0.02) this.vel.z = 0;
    }

    // ---- vertical: pulo responsivo, gravidade firme, planeio do Nimbo ----
    if (inWater) {
      this.vel.y = 0;
      this.pos.y = game.WATER - 0.42;
      this.airT = 0;
    } else {
      if (input.down('Space') && grounded && this.rollT < 0) {
        this.vel.y = 9.4;
        this.airT = 0.001;
      }
      if (!grounded) this.airT += dt;
      const grav = this.vel.y > 2 ? 26 : 23;
      this.vel.y -= grav * dt;
      if (this.race.planador && input.down('Space') && this.vel.y < -2.6) this.vel.y = -2.6;
    }

    // deslocamento horizontal com limite de degrau
    if (!inWater) {
      applyGroundMove(this.pos, this.vel, dt, world, game, 1.15);
    } else {
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
    }
    this.pos.y += this.vel.y * dt;

    this.resolveColliders(world);

    const gh2 = world.heightAt(this.pos.x, this.pos.z);
    if (!inWater && this.pos.y < gh2) {
      if (this.vel.y < -17 && !this.race.planador) {
        const dmg = Math.round((-this.vel.y - 17) * 4);
        if (dmg > 0) this.takeDamage(dmg, game, true);
      }
      this.pos.y = gh2;
      this.vel.y = 0;
    }
    this.pos.x = clamp(this.pos.x, 2, game.SIZE - 2);
    this.pos.z = clamp(this.pos.z, 2, game.SIZE - 2);

    if (drain === 0) this.sta = clamp(this.sta + 26 * dt, 0, this.maxSta);
    else this.sta = clamp(this.sta - drain * dt, 0, this.maxSta);

    this.animate(dt, moving, inWater);
    this.syncMesh(world);
  }

  private tryAttack(heavy: boolean, game: any, grounded: boolean) {
    this.cooldown = this.arma.cd * (heavy ? 1.6 : 1);
    this.sta -= heavy ? 12 : 6;
    this.sta = clamp(this.sta, 0, this.maxSta);
    this.attackT = 0;
    this.attackHeavy = heavy;
    // lunge (passinho de ataque estilo Cube World)
    if (grounded) {
      this.vel.x += Math.sin(this.yaw) * 2.6;
      this.vel.z += Math.cos(this.yaw) * 2.6;
    }
    const dmg = this.weaponDamage(heavy);
    game.playerAttack(this.arma, dmg, heavy);
  }

  private updateMounted(dt: number, input: Input, game: any) {
    const m = this.mounted!;
    const off = new THREE.Vector3(0, 1.85, -0.12).applyAxisAngle(new THREE.Vector3(0, 1, 0), m.yaw);
    this.pos.copy(m.pos).add(off);
    this.pos.y += m.visY - m.pos.y;
    this.visY = this.pos.y;
    this.yaw = m.yaw;
    this.vel.set(0, 0, 0);

    if (this.attackT >= 0) {
      this.attackT += dt / (this.attackHeavy ? this.arma.cd * 1.6 : this.arma.cd);
      if (this.attackT >= 1) this.attackT = -1;
    }
    if (m.bond >= 3 && this.cooldown <= 0 && this.attackT < 0) {
      if (input.lmbJust && this.sta >= 6) this.tryAttack(false, game, false);
      else if (input.rmbJust && this.sta >= 12) this.tryAttack(true, game, false);
    }
    if (input.pressed('KeyQ') && m.bond >= 4) game.mountFuria();
    if (input.pressed('KeyF') && this.erva > 0) game.feedMount();

    const p = this.parts;
    p.legL.rotation.x = -1.2; p.legR.rotation.x = -1.2;
    if (this.attackT >= 0) {
      p.armR.rotation.x = -2.4 * Math.sin(Math.PI * this.attackT);
    } else {
      const bob = Math.sin(this.animT * 8) * 0.05;
      p.armR.rotation.x = bob; p.armL.rotation.x = -bob;
    }
    p.spinner.rotation.x = 0;
    this.syncMesh();
  }

  private resolveColliders(world: World) {
    for (const c of world.colliders) {
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + 0.42;
      if (d < min && d > 0.0001) {
        const push = (min - d) / d;
        this.pos.x += dx * push;
        this.pos.z += dz * push;
      }
    }
  }

  private animate(dt: number, moving: boolean, inWater: boolean) {
    void dt;
    const p = this.parts;
    const t = this.animT;
    if (this.rollT >= 0) {
      p.spinner.rotation.x = this.rollT * Math.PI * 2;
    } else {
      p.spinner.rotation.x = inWater ? 1.1 : 0;
    }
    if (this.attackT >= 0) {
      const a = this.attackT;
      p.armR.rotation.x = -2.6 * Math.sin(Math.PI * a);
      p.armR.rotation.z = this.attackHeavy ? -0.35 : 0;
    } else if (this.rollT < 0) {
      const sw = moving ? 0.62 : 0.05;
      const f = moving ? 11 : 2;
      p.armR.rotation.x = Math.sin(t * f) * sw;
      p.armR.rotation.z = 0;
      p.armL.rotation.x = -Math.sin(t * f) * sw;
    }
    if (inWater) {
      p.legL.rotation.x = Math.sin(t * 7) * 0.55;
      p.legR.rotation.x = -Math.sin(t * 7) * 0.55;
    } else if (this.rollT < 0) {
      // pulo: pernas dobradas no ar
      const airborne = !moving && Math.abs(this.vel.y) > 0.5;
      if (airborne) {
        p.legL.rotation.x = -0.5; p.legR.rotation.x = 0.3;
      } else {
        p.legL.rotation.x = moving ? -Math.sin(t * 11) * 0.85 : 0;
        p.legR.rotation.x = moving ? Math.sin(t * 11) * 0.85 : 0;
      }
    } else {
      p.legL.rotation.x = -0.9; p.legR.rotation.x = -0.9;
    }
    // balanço do corpo ao correr
    p.spinner.position.y = moving && this.rollT < 0 ? Math.abs(Math.sin(t * 11)) * 0.06 : 0;
  }

  syncMesh(world?: World) {
    // suavização visual do terreno (evita "escadinha" em slopes)
    if (world) {
      const gh = world.heightAt(this.pos.x, this.pos.z);
      if (Math.abs(this.pos.y - gh) < 0.05) {
        this.visY += (this.pos.y - this.visY) * 0.5;
      } else {
        this.visY = this.pos.y;
      }
    } else {
      this.visY = this.pos.y;
    }
    this.parts.group.position.set(this.pos.x, this.visY, this.pos.z);
    this.parts.group.rotation.y = this.yaw;
  }

  takeDamage(dmg: number, game: any, raw = false) {
    if (this.dead) return;
    let final = dmg;
    if (!raw) {
      const red = 1 / (1 + 0.08 * Math.max(0, this.equip.peitoralNivel - 1));
      final = Math.max(1, Math.round(dmg * red));
    }
    this.hp -= final;
    this.hurtT = 0.35;
    game.audio.sfx('hurt');
    game.ui.dmgNumber(this.pos, `-${final}`, '#ff8a7a');
    game.ui.vignette();
    if (this.hp <= 0) { this.hp = 0; this.dead = true; game.onPlayerDeath(); }
  }

  heal(n: number) { this.hp = clamp(this.hp + n, 0, this.maxHp); }

  gainLeguas(n: number, game: any) {
    this.leguas += n;
    let need = xpNeed(this.nivel);
    while (this.leguas >= need) {
      this.leguas -= need;
      this.nivel++;
      this.maxHp += 8; this.maxSta += 5;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
      game.audio.sfx('level');
      game.ui.toast(`NÍVEL ${this.nivel}! +8 Vida, +5 Stamina`);
      need = xpNeed(this.nivel);
    }
  }
}

function xpNeed(nivel: number): number { return Math.round(50 * Math.pow(nivel, 1.5)); }

// ------------------------------------------------------------
// MONTARIA — Ronceiro (bloco e rechonchudo, com cascos)
// ------------------------------------------------------------
export class Mount {
  group = new THREE.Group();
  pos = new THREE.Vector3();
  visY = 0;
  yaw = 0;
  velY = 0;
  velXZ = 0;
  state: 'ferido' | 'domado' = 'ferido';
  bond = 0;
  bondXp = 0;
  hp = 80; maxHp = 80;
  nome = 'Brumário';
  private legPhase = 0;
  private gallopSfxT = 0;
  private bodyG!: THREE.Group;
  private legs: THREE.Group[] = [];
  private headG!: THREE.Group;
  private saddleM!: THREE.Mesh;
  private arrowM!: THREE.Mesh;

  constructor(world: World) {
    this.build();
    this.pos.set(POI.ronceiro.x, world.heightAt(POI.ronceiro.x, POI.ronceiro.z), POI.ronceiro.z);
    this.visY = this.pos.y;
    this.syncMesh();
  }

  private build() {
    const body = new THREE.Group();
    const coat = lam(0x8a6248), coatD = lam(0x6a4a34), dark = lam(0x4a3624);
    const hoofM = lam(0x9a9aa2);

    // corpo blocudo
    const torso = box(1.15, 1.0, 2.1, coat);
    torso.position.y = 1.55;
    body.add(torso);
    const belly = box(1.0, 0.3, 1.8, coatD);
    belly.position.y = 1.1;
    body.add(belly);

    // pescoço + cabeça com focinho
    const neck = box(0.55, 0.95, 0.6, coat);
    neck.position.set(0, 2.3, 0.95);
    neck.rotation.x = 0.35;
    body.add(neck);
    const headG = new THREE.Group();
    headG.position.set(0, 2.85, 1.3);
    const head = box(0.6, 0.62, 1.0, coat);
    headG.add(head);
    const snout = box(0.44, 0.4, 0.4, coatD);
    snout.position.set(0, -0.1, 0.62);
    headG.add(snout);
    const nostril = box(0.4, 0.1, 0.05, dark);
    nostril.position.set(0, -0.16, 0.83);
    headG.add(nostril);
    for (const ex of [-0.19, 0.19]) {
      const ear = box(0.15, 0.32, 0.1, dark);
      ear.position.set(ex, 0.45, -0.15);
      headG.add(ear);
      const eyeW = box(0.14, 0.14, 0.05, lam(0xffffff));
      eyeW.position.set(ex, 0.1, 0.51);
      headG.add(eyeW);
      const pupil = box(0.06, 0.09, 0.06, lam(0x1a1a20));
      pupil.position.set(ex, 0.09, 0.53);
      headG.add(pupil);
    }
    body.add(headG);
    this.headG = headG;

    // juba + cauda
    const mane = box(0.34, 0.55, 1.3, dark);
    mane.position.set(0, 2.62, 0.75);
    body.add(mane);
    const tail = box(0.2, 0.7, 0.2, dark);
    tail.position.set(0, 1.75, -1.15);
    tail.rotation.x = -0.6;
    body.add(tail);

    // pernas com pivô no quadril + casco
    for (const [lx, lz] of [[-0.38, 0.78], [0.38, 0.78], [-0.38, -0.78], [0.38, -0.78]]) {
      const legG = new THREE.Group();
      legG.position.set(lx, 1.1, lz);
      const leg = box(0.3, 1.0, 0.32, coat);
      leg.position.y = -0.5;
      legG.add(leg);
      const hoof = box(0.34, 0.16, 0.36, hoofM);
      hoof.position.y = -1.02;
      legG.add(hoof);
      body.add(legG);
      this.legs.push(legG);
    }

    // sela + flecha do ferimento
    this.saddleM = box(0.85, 0.28, 0.95, lam(0x6a4a2a));
    this.saddleM.position.set(0, 2.1, -0.1);
    this.saddleM.visible = false;
    body.add(this.saddleM);
    this.arrowM = box(0.08, 0.08, 0.7, lam(0xd8d0c0));
    this.arrowM.position.set(0.34, 1.75, 0.4);
    this.arrowM.rotation.z = 0.6;
    body.add(this.arrowM);

    this.bodyG = body;
    this.group.add(body);
    const shadow = makeBlobShadow();
    shadow.scale.set(3.6, 2.8, 1);
    shadow.position.y = 0.06;
    this.group.add(shadow);
  }

  tame() {
    this.state = 'domado';
    this.bond = 1;
    this.hp = this.maxHp;
    this.saddleM.visible = true;
    this.arrowM.visible = false;
    this.bodyG.rotation.z = 0;
    this.bodyG.position.y = 0;
  }

  feed(): string | null {
    this.hp = clamp(this.hp + 25, 0, this.maxHp);
    this.bondXp += 5;
    return this.checkBond();
  }

  addBondXp(n: number): string | null {
    if (this.state !== 'domado') return null;
    this.bondXp += n;
    return this.checkBond();
  }

  private checkBond(): string | null {
    const need = [0, 0, 30, 80, 150, 260];
    let up = false;
    while (this.bond < 5 && this.bondXp >= need[this.bond + 1]) { this.bond++; up = true; }
    return up ? `Vínculo com ${this.nome} subiu para ${this.bond}!` : null;
  }

  gallopSpeed(): number { return 14.5 * (this.bond >= 2 ? 1.1 : 1); }

  update(dt: number, input: Input, world: World, game: any) {
    if (this.state === 'ferido') {
      this.bodyG.rotation.z = 0.28;
      this.bodyG.position.y = -0.25;
      this.syncMesh();
      return;
    }
    this.bodyG.rotation.z = 0;
    this.bodyG.position.y = 0;
    const ridden = game.player.mounted === this;
    if (ridden) {
      const camYaw = game.camYaw;
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
      const rx = -fz, rz = fx;
      let mx = 0, mz = 0;
      if (input.down('KeyW')) { mx += fx; mz += fz; }
      if (input.down('KeyS')) { mx -= fx; mz -= fz; }
      if (input.down('KeyD')) { mx += rx; mz += rz; }
      if (input.down('KeyA')) { mx -= rx; mz -= rz; }
      const moving = mx !== 0 || mz !== 0;
      const gallop = (input.down('ShiftLeft') || input.down('ShiftRight')) && moving && game.player.sta > 1;
      let speed = 0;
      if (moving) {
        const l = Math.hypot(mx, mz);
        this.yaw = angLerp(this.yaw, Math.atan2(mx / l, mz / l), 1 - Math.pow(0.0005, dt));
        const target = gallop ? this.gallopSpeed() : 7.6;
        this.velXZ += (target - this.velXZ) * (1 - Math.pow(1e-10, dt));
        speed = this.velXZ;
        this.pos.x += (mx / l) * speed * dt;
        this.pos.z += (mz / l) * speed * dt;
      } else {
        this.velXZ *= Math.pow(1e-12, dt);
        if (this.velXZ < 0.05) this.velXZ = 0;
      }
      if (gallop) {
        game.player.sta = clamp(game.player.sta - 5.5 * dt, 0, game.player.maxSta);
        this.gallopSfxT += dt;
        if (this.gallopSfxT > 0.27) {
          this.gallopSfxT = 0;
          game.audio.sfx('gallop');
          game.mountGallopTick();
        }
      }
      const gh = world.heightAt(this.pos.x, this.pos.z);
      if (input.down('Space') && this.pos.y <= gh + 0.05) this.velY = 8.6;
      this.velY -= 23 * dt;
      this.pos.y += this.velY * dt;
      if (gh < game.WATER - 0.2) {
        this.pos.y = game.WATER - 0.55; this.velY = 0;
      } else if (this.pos.y < gh) { this.pos.y = gh; this.velY = 0; }
      this.legPhase += dt * (speed > 10 ? 15 : speed > 0.2 ? 9 : 1.2);
      // cabeça balança no galope
      this.headG.rotation.x = Math.sin(this.legPhase) * 0.06 * (speed > 0.2 ? 1 : 0.2);
    } else {
      this.velXZ = 0;
      this.velY -= 22 * dt;
      const gh = world.heightAt(this.pos.x, this.pos.z);
      this.pos.y += this.velY * dt;
      if (this.pos.y < gh) { this.pos.y = gh; this.velY = 0; }
      this.legPhase += dt * 1.2;
      this.headG.rotation.x = Math.sin(this.legPhase * 0.3) * 0.04;
    }
    this.animateLegs();
    this.syncMesh();
  }

  private animateLegs() {
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].rotation.x = Math.sin(this.legPhase + (i % 2) * Math.PI + (i > 1 ? 0.5 : 0)) * 0.62;
    }
  }

  syncMesh() {
    const gy = this.group.position.y;
    this.group.position.copy(this.pos);
    this.group.position.y = this.pos.y;
    void gy;
    this.group.rotation.y = this.yaw;
  }
}
