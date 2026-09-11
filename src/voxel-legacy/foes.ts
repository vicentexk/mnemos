// ============================================================
// LEONIS — foes.ts · Corja (inimigos), NPCs, Jangada, Projéteis
// ============================================================

import * as THREE from 'three';
import { CORJA, WeaponDef } from '../data/defs';
import { World } from './world';
import { Input, clamp, angLerp } from '../core';
import { makeBlobShadow } from './entities';

const lam = (hex: number) => new THREE.MeshLambertMaterial({ color: hex, side: THREE.DoubleSide });
const box = (w: number, h: number, d: number, mat: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

// ------------------------------------------------------------
// barra de HP (sprite com canvas)
// ------------------------------------------------------------
class HpBar {
  sprite: THREE.Sprite;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;

  constructor() {
    const cv = document.createElement('canvas');
    cv.width = 96; cv.height = 12;
    this.ctx = cv.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.scale.set(1.9, 0.24, 1);
    this.draw(1);
  }
  draw(frac: number) {
    const c = this.ctx;
    c.clearRect(0, 0, 96, 12);
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, 96, 12);
    c.fillStyle = frac > 0.5 ? '#6ac24a' : frac > 0.25 ? '#d8a83a' : '#c23a2a';
    c.fillRect(2, 2, 92 * Math.max(0, frac), 8);
    this.tex.needsUpdate = true;
  }
}

// ------------------------------------------------------------
// INIMIGO — Corja
// ------------------------------------------------------------
export class Enemy {
  group = new THREE.Group();
  pos = new THREE.Vector3();
  yaw = 0;
  hp: number; maxHp: number;
  def = CORJA.farejador;
  dead = false;
  home = new THREE.Vector3();
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'stagger' | 'return' = 'idle';
  private stateT = 0;
  private patrolT = 0;
  private patrolTarget = new THREE.Vector3();
  private atkCd = 0;
  private pacifyT = 0;
  private hpBar: HpBar;
  private armR!: THREE.Group;
  private torso!: THREE.Mesh;
  private legPhase = 0;
  private legs: THREE.Mesh[] = [];
  private windupHit = false;

  constructor(defKey: string, x: number, z: number, world: World, scene: THREE.Scene, label: string) {
    this.def = CORJA[defKey] || CORJA.farejador;
    this.hp = this.maxHp = this.def.hp;
    this.pos.set(x, world.heightAt(x, z), z);
    this.home.copy(this.pos);

    const skin = lam(this.def.skin), tunica = lam(this.def.tunica);
    const s = this.def.escala;
    const g = new THREE.Group();
    // pernas
    for (const lx of [-0.3, 0.3]) {
      const leg = box(0.42 * s, 0.75 * s, 0.45 * s, lam(0x2e2a26));
      leg.position.set(lx * s, 0.38 * s, 0);
      g.add(leg);
      this.legs.push(leg);
    }
    // torso corpulento
    this.torso = box(1.5 * s, 1.25 * s, 0.95 * s, tunica);
    this.torso.position.y = 0.75 * s + 0.62 * s;
    g.add(this.torso);
    // braços (pivô no ombro)
    const mkArm = (x: number) => {
      const a = new THREE.Group();
      a.position.set(x * s, 1.9 * s, 0);
      const b = box(0.45 * s, 1.1 * s, 0.45 * s, skin);
      b.position.y = -0.5 * s;
      a.add(b);
      const fist = box(0.55 * s, 0.4 * s, 0.5 * s, skin);
      fist.position.set(0, -1.15 * s, 0.05);
      a.add(fist);
      g.add(a);
      return a;
    };
    mkArm(-1.0);
    this.armR = mkArm(1.0);
    // clava
    const club = box(0.28 * s, 1.3 * s, 0.28 * s, lam(0x5a4028));
    club.position.set(0, -1.1 * s, 0.15);
    this.armR.add(club);
    const knob = box(0.45 * s, 0.4 * s, 0.45 * s, lam(0x4a3420));
    knob.position.set(0, -1.7 * s, 0.15);
    this.armR.add(knob);
    // cabeça com queixo
    const head = box(0.85 * s, 0.8 * s, 0.82 * s, skin);
    head.position.y = 2.7 * s;
    g.add(head);
    for (const ex of [-0.19, 0.19]) {
      const sclera = box(0.17 * s, 0.16 * s, 0.05, lam(0xf0e8d8));
      sclera.position.set(ex * s, 2.75 * s, 0.43 * s);
      g.add(sclera);
      const pup = box(0.08 * s, 0.1 * s, 0.06, lam(0xc23a2a));
      pup.position.set(ex * s, 2.74 * s, 0.45 * s);
      g.add(pup);
    }
    // dentes (queixo saliente)
    for (let i = -1; i <= 1; i++) {
      const tooth = box(0.12 * s, 0.16 * s, 0.06, lam(0xffffff));
      tooth.position.set(i * 0.16 * s, 2.42 * s, 0.43 * s);
      g.add(tooth);
    }
    // sobrancelha brava
    const brow = box(0.7 * s, 0.12 * s, 0.06, lam(0x1e1a16));
    brow.position.set(0, 2.95 * s, 0.43 * s);
    brow.rotation.z = 0.12;
    g.add(brow);

    this.group.add(g);
    const sh = makeBlobShadow();
    sh.scale.set(3, 2.2, 1);
    sh.position.y = 0.06;
    this.group.add(sh);

    this.hpBar = new HpBar();
    this.hpBar.sprite.position.y = 3.6 * s;
    this.group.add(this.hpBar.sprite);

    const lbl = makeLabel(`${label} Nv.${this.def.lvl}`, '#ffb0a0');
    lbl.position.y = 4.05 * s;
    this.group.add(lbl);

    this.group.position.copy(this.pos);
    scene.add(this.group);
  }

  pacify(sec: number) { this.pacifyT = Math.max(this.pacifyT, sec); this.state = 'idle'; }

  damage(dmg: number, game: any, color = '#ffffff') {
    if (this.dead) return;
    const m = game.dmgMultFor(this.def.lvl);
    const final = Math.max(1, Math.round(dmg * m.atk));
    this.hp -= final;
    this.hpBar.draw(this.hp / this.maxHp);
    game.ui.dmgNumber(this.pos, `${final}`, color);
    game.audio.sfx('hit');
    // knockback leve + interrupção
    if (this.state === 'windup' && Math.random() < 0.3) { this.state = 'stagger'; this.stateT = 0.3; }
    if (game.player) {
      const dx = this.pos.x - game.player.pos.x, dz = this.pos.z - game.player.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.pos.x += (dx / d) * 0.4; this.pos.z += (dz / d) * 0.4;
    }
    if (this.hp <= 0) { this.hp = 0; this.dead = true; game.onEnemyDead(this); }
    else if (this.state === 'idle' || this.state === 'return') this.state = 'chase';
  }

  update(dt: number, world: World, game: any, enemies: Enemy[]) {
    if (this.dead) { this.group.visible = false; return; }
    this.stateT -= dt;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.pacifyT > 0) {
      this.pacifyT -= dt;
      this.wander(dt, world);
      this.sync(world);
      return;
    }
    const p = game.player;
    const dPlayer = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);

    switch (this.state) {
      case 'idle': {
        this.patrolT -= dt;
        if (this.patrolT <= 0) {
          this.patrolT = 3 + Math.random() * 3;
          const a = Math.random() * Math.PI * 2;
          const r = 2 + Math.random() * 5;
          this.patrolTarget.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
        }
        this.walkToward(this.patrolTarget.x, this.patrolTarget.z, this.def.speed * 0.45, dt, world);
        if (!p.dead && !p.mounted && dPlayer < 13) this.state = 'chase';
        if (!p.dead && p.mounted && dPlayer < 15) this.state = 'chase';
        break;
      }
      case 'chase': {
        if (p.dead || dPlayer > 24) { this.state = 'return'; break; }
        if (dPlayer < 2.4 + this.def.escala * 0.4) {
          this.state = 'windup'; this.stateT = 0.55; this.windupHit = false;
          this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
        } else {
          this.walkToward(p.pos.x, p.pos.z, this.def.speed, dt, world);
        }
        break;
      }
      case 'windup': {
        this.armR.rotation.x = -2.2 * (1 - this.stateT / 0.55);
        if (this.stateT <= 0) { this.state = 'attack'; this.stateT = 0.18; }
        break;
      }
      case 'attack': {
        this.armR.rotation.x = 0.8;
        if (!this.windupHit) {
          this.windupHit = true;
          if (dPlayer < 3.2 && !p.dead) {
            const m = game.dmgMultFor(this.def.lvl);
            if (p.mounted) game.mountTakeDamage(Math.max(1, Math.round(this.def.dmg * m.def * 0.7)));
            else p.takeDamage(Math.round(this.def.dmg * m.def), game);
          }
          game.audio.sfx('swing');
        }
        if (this.stateT <= 0) { this.state = 'chase'; this.atkCd = 1.6; }
        break;
      }
      case 'stagger': {
        if (this.stateT <= 0) this.state = 'chase';
        break;
      }
      case 'return': {
        const dh = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
        if (dh < 1) { this.state = 'idle'; this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.5); this.hpBar.draw(this.hp / this.maxHp); }
        else this.walkToward(this.home.x, this.home.z, this.def.speed * 0.8, dt, world);
        break;
      }
    }
    if (this.state !== 'windup' && this.state !== 'attack') {
      this.armR.rotation.x = Math.sin(this.legPhase * 0.5) * 0.25;
    }
    // separação entre inimigos
    for (const o of enemies) {
      if (o === this || o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.4 && d > 0.001) {
        this.pos.x += (dx / d) * (1.4 - d) * 0.5;
        this.pos.z += (dz / d) * (1.4 - d) * 0.5;
      }
    }
    this.legPhase += dt * 6;
    this.sync(world);
  }

  private wander(dt: number, world: World) {
    this.patrolT -= dt;
    if (this.patrolT <= 0) {
      this.patrolT = 2 + Math.random() * 2;
      const a = Math.random() * Math.PI * 2;
      this.patrolTarget.set(this.home.x + Math.cos(a) * 3, 0, this.home.z + Math.sin(a) * 3);
    }
    this.walkToward(this.patrolTarget.x, this.patrolTarget.z, this.def.speed * 0.3, dt, world);
  }

  private walkToward(x: number, z: number, speed: number, dt: number, world: World) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) return;
    this.yaw = angLerp(this.yaw, Math.atan2(dx, dz), 1 - Math.pow(0.002, dt));
    this.pos.x += (dx / d) * speed * dt;
    this.pos.z += (dz / d) * speed * dt;
    void world;
  }

  private sync(world: World) {
    const gh = world.heightAt(this.pos.x, this.pos.z);
    this.pos.y = gh;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].rotation.x = Math.sin(this.legPhase + (i % 2) * Math.PI) * 0.4;
    }
  }
}

export function makeLabel(txt: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 44;
  const ctx = canvas.getContext('2d')!;
  let size = 18;
  ctx.font = `${size}px "Press Start 2P", monospace`;
  while (ctx.measureText(txt).width > 244 && size > 7) {
    size -= 1;
    ctx.font = `${size}px "Press Start 2P", monospace`;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.95)';
  ctx.strokeText(txt, 128, 22);
  ctx.fillStyle = color;
  ctx.fillText(txt, 128, 22);
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(3.6, 3.6 * (44 / 256), 1);
  return spr;
}

// ------------------------------------------------------------
// NPC (visual + face)
// ------------------------------------------------------------
export class NPC {
  group = new THREE.Group();
  pos = new THREE.Vector3();

  constructor(x: number, z: number, world: World, scene: THREE.Scene, label: string, shirtColor: number) {
    this.pos.set(x, world.heightAt(x, z), z);
    const g = new THREE.Group();
    const skin = lam(0xd8a37a);
    for (const lx of [-0.17, 0.17]) {
      const leg = box(0.24, 0.6, 0.28, lam(0x3a3228));
      leg.position.set(lx, 0.3, 0);
      g.add(leg);
    }
    const torso = box(0.68, 0.7, 0.42, lam(shirtColor));
    torso.position.y = 0.95;
    g.add(torso);
    for (const ax of [-0.46, 0.46]) {
      const arm = box(0.22, 0.6, 0.24, skin);
      arm.position.set(ax, 1.0, 0);
      g.add(arm);
    }
    const head = box(0.88, 0.8, 0.84, skin);
    head.position.y = 1.75;
    g.add(head);
    for (const ex of [-0.2, 0.2]) {
      const eye = box(0.15, 0.17, 0.05, lam(0xffffff));
      eye.position.set(ex, 1.8, 0.44);
      g.add(eye);
      const pup = box(0.06, 0.09, 0.06, lam(0x1a1a20));
      pup.position.set(ex, 1.79, 0.46);
      g.add(pup);
    }
    const hair = box(0.92, 0.18, 0.88, lam(0x4a3a26));
    hair.position.y = 2.16;
    g.add(hair);
    this.group.add(g);
    const sh = makeBlobShadow();
    sh.position.y = 0.06;
    this.group.add(sh);
    const lbl = makeLabel(label, '#cfe8ff');
    lbl.position.y = 2.7;
    this.group.add(lbl);
    this.group.position.copy(this.pos);
    scene.add(this.group);
  }

  update(dt: number, game: any) {
    const p = game.player;
    if (p) {
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
      if (dx * dx + dz * dz < 100) {
        this.group.rotation.y = angLerp(this.group.rotation.y, Math.atan2(dx, dz), 1 - Math.pow(0.01, dt));
      }
    }
  }
}

// ------------------------------------------------------------
// JANGADA
// ------------------------------------------------------------
export class Boat {
  group: THREE.Group;
  pos = new THREE.Vector3();
  yaw = Math.PI;
  occupied = false;
  private bobT = 0;
  private splashT = 0;

  constructor(group: THREE.Group) {
    this.group = group;
    this.pos.copy(group.position);
  }

  update(dt: number, input: Input, world: World, game: any) {
    this.bobT += dt;
    const baseY = game.WATER - 0.15 + Math.sin(this.bobT * 2) * 0.08;
    if (this.occupied) {
      const camYaw = game.camYaw;
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
      const rx = -fz, rz = fx;
      let mx = 0, mz = 0;
      if (input.down('KeyW')) { mx += fx; mz += fz; }
      if (input.down('KeyS')) { mx -= fx; mz -= fz; }
      if (input.down('KeyD')) { mx += rx; mz += rz; }
      if (input.down('KeyA')) { mx -= rx; mz -= rz; }
      const moving = mx !== 0 || mz !== 0;
      if (moving) {
        const l = Math.hypot(mx, mz);
        const nx = this.pos.x + (mx / l) * 7 * dt;
        const nz = this.pos.z + (mz / l) * 7 * dt;
        const gh = world.heightAt(nx, nz);
        if (gh < game.WATER - 0.45) {
          this.pos.x = nx; this.pos.z = nz;
          this.yaw = angLerp(this.yaw, Math.atan2(mx / l, mz / l), 1 - Math.pow(0.01, dt));
          this.splashT += dt;
          if (this.splashT > 1.2) { this.splashT = 0; game.audio.sfx('splash'); }
        }
      }
      this.pos.x = clamp(this.pos.x, 4, game.SIZE - 4);
      this.pos.z = clamp(this.pos.z, 4, game.SIZE - 4);
    }
    this.group.position.set(this.pos.x, baseY, this.pos.z);
    this.group.rotation.y = this.yaw;
    this.group.rotation.z = Math.sin(this.bobT * 1.4) * 0.03;
  }
}

// ------------------------------------------------------------
// PROJÉTEIS
// ------------------------------------------------------------
export class Proj {
  mesh: THREE.Group;
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  ttl: number;
  dmg: number;
  kind: string;
  dead = false;
  private hits = new Set<any>();
  private phase: 'out' | 'back' = 'out';
  private bounces = 0;
  private spinT = 0;

  constructor(kind: string, origin: THREE.Vector3, dir: THREE.Vector3, weapon: WeaponDef, dmg: number, scene: THREE.Scene) {
    this.kind = kind;
    this.dmg = dmg;
    this.ttl = weapon.projTtl || 1.5;
    this.pos.copy(origin);
    this.vel.copy(dir).multiplyScalar(weapon.projVel || 30);
    this.mesh = new THREE.Group();
    const c = weapon.cor;
    this.ttl0 = this.ttl;
    if (kind === 'arrow' || kind === 'bolt') {
      const a = box(0.07, 0.07, 0.8, lam(0x8a6a3a));
      const tip = box(0.1, 0.1, 0.14, lam(0xd8dde2));
      tip.position.z = 0.45;
      this.mesh.add(a); this.mesh.add(tip);
    } else if (kind === 'boomer') {
      const a1 = box(0.7, 0.09, 0.14, lam(c));
      a1.rotation.y = 0.45;
      const a2 = box(0.7, 0.09, 0.14, lam(c));
      a2.rotation.y = -0.45;
      this.mesh.add(a1); this.mesh.add(a2);
    } else if (kind === 'serra') {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.09, 12), lam(c));
      disc.rotation.x = Math.PI / 2;
      this.mesh.add(disc);
    } else if (kind === 'corrente') {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), lam(0x4a4e56));
      this.mesh.add(ball);
    } else if (kind === 'chicote') {
      const seg = box(0.09, 0.09, 0.9, lam(c));
      this.mesh.add(seg);
    } else if (kind === 'nota') {
      const n1 = box(0.16, 0.16, 0.16, lam(0xffffff));
      const n2 = box(0.12, 0.12, 0.12, lam(0xfff0a0));
      n2.position.set(0.2, 0.25, 0);
      this.mesh.add(n1); this.mesh.add(n2);
    }
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  update(dt: number, world: World, game: any) {
    if (this.dead) return;
    this.ttl -= dt;
    this.spinT += dt;
    if (this.ttl <= 0) {
      if (this.kind === 'boomer' && this.phase === 'out') { this.turnBack(game); }
      else { this.kill(game); return; }
    }

    if (this.kind === 'boomer') {
      if (this.phase === 'out' && this.ttl < (this.ttl0 * 0.45)) this.turnBack(game);
      if (this.phase === 'back') {
        const target = game.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
        const dir = target.sub(this.pos);
        const d = dir.length();
        if (d < 1.2) { game.onBoomerCatch(); this.kill(game); return; }
        this.vel.copy(dir.normalize().multiplyScalar(26));
      }
      this.mesh.rotation.y += dt * 18;
    }
    if (this.kind === 'arrow') this.vel.y -= 7 * dt;
    if (this.kind === 'serra') {
      this.mesh.rotation.z += dt * 30;
      this.vel.y = 0;
    }
    if (this.kind === 'nota') this.mesh.rotation.y += dt * 6;

    this.pos.addScaledVector(this.vel, dt);

    // terreno
    const gh = world.heightAt(this.pos.x, this.pos.z);
    if (this.pos.y < gh + 0.15) {
      if (this.kind === 'serra' && this.bounces < 2) {
        this.bounces++;
        this.pos.y = gh + 0.2;
        this.vel.x = -this.vel.x * 0.85;
        this.vel.z += (Math.random() - 0.5) * 6;
        game.audio.sfx('swing');
      } else {
        this.kill(game); return;
      }
    }
    if (this.pos.y < game.WATER - 0.5) { this.kill(game); return; }

    // acertos
    const enemies: Enemy[] = game.enemies;
    for (const e of enemies) {
      if (e.dead || this.hits.has(e)) continue;
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      const dy = Math.abs(e.pos.y + 1.2 - this.pos.y);
      if (d < 1.3 && dy < 2.2) {
        this.hits.add(e);
        if (this.kind === 'corrente') {
          // puxa o inimigo
          const px = game.player.pos.x, pz = game.player.pos.z;
          const dx = px - e.pos.x, dz = pz - e.pos.z;
          const dd = Math.hypot(dx, dz) || 1;
          const pull = Math.min(5, dd - 1.5);
          if (pull > 0) { e.pos.x += (dx / dd) * pull; e.pos.z += (dz / dd) * pull; }
          e.damage(this.dmg, game, '#ffd76a');
          game.audio.sfx('hit');
          this.kill(game); return;
        }
        if (this.kind === 'nota') {
          e.pacify(4);
          e.damage(this.dmg, game, '#aee6ff');
          continue;
        }
        if (this.kind === 'chicote') {
          e.damage(this.dmg, game, '#e8c8a0');
          this.kill(game); return;
        }
        const m = game.dmgMultFor(e.def.lvl);
        e.damage(this.dmg, game, m.tier >= 2 ? '#b8b8c8' : m.tier === 1 ? '#ffd76a' : '#ffffff');
        if (this.kind !== 'boomer' && this.kind !== 'serra') { this.kill(game); return; }
      }
    }
    // chicote: puxa ervas
    if (this.kind === 'chicote') {
      for (const it of game.world.interactables) {
        if (it.tipo === 'erva' && it.ativo && Math.hypot(it.x - game.player.pos.x, it.z - game.player.pos.z) < 7) {
          game.collectErva(it, true);
          this.kill(game); return;
        }
      }
    }

    this.mesh.position.copy(this.pos);
    if (this.kind === 'arrow' || this.kind === 'bolt' || this.kind === 'chicote') {
      this.mesh.lookAt(this.pos.clone().add(this.vel));
    }
  }

  private ttl0 = 2;

  private turnBack(game: any) {
    this.phase = 'back';
    this.hits.clear();
    void game;
  }

  private kill(game: any) {
    this.dead = true;
    game.scene.remove(this.mesh);
  }
}

void clamp;
