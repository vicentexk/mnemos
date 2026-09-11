// ============================================================
// LEONIS — world.ts · Terreno voxel, vila, acampamentos, água, minimapa
// ============================================================

import * as THREE from 'three';
import { CONFIG, POI, PATHS } from '../data/defs';
import { fbm, mulberry32, smoothstep, dist2d } from '../core';

export interface Interact {
  id: string;
  tipo: 'npc' | 'forja' | 'estabulo' | 'fogueira' | 'bau' | 'erva' | 'carga' | 'rocha' | 'ronceiro' | 'jangada';
  x: number; y: number; z: number; r: number;
  ativo: boolean;
  cooldownUntil: number;
  dados: any;
}

export interface POIMark { x: number; z: number; ico: string; label: string; }

const N = CONFIG.SIZE;
const WATER = CONFIG.WATER_Y;

// ---------- construtor de geometria voxel mesclada ----------
class GeoBuilder {
  pos: number[] = []; nor: number[] = []; col: number[] = []; idx: number[] = [];
  private v = 0;

  quad(p: number[][], n: number[], c: THREE.Color, shade = 1) {
    const r = c.r * shade, g = c.g * shade, b = c.b * shade;
    for (const pt of p) { this.pos.push(pt[0], pt[1], pt[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(r, g, b); }
    this.idx.push(this.v, this.v + 1, this.v + 2, this.v, this.v + 2, this.v + 3);
    this.v += 4;
  }

  box(x: number, y: number, z: number, w: number, h: number, d: number, c: THREE.Color, shade = 1, rotY = 0) {
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    const rot = (px: number, pz: number): [number, number] => [px * cos - pz * sin, px * sin + pz * cos];
    const hw = w / 2, hd = d / 2;
    const y0 = y, y1 = y + h;
    const cs: [number, number][] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
    const rp = (i: number): [number, number] => { const [rx, rz] = rot(cs[i][0], cs[i][1]); return [x + rx, z + rz]; };
    // laterais (winding consistente p/ FrontSide)
    const side = (i1: number, i2: number, n: number[]) => {
      const [ax, az] = rp(i1); const [bx, bz] = rp(i2);
      this.quad([[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]], n, c, shade * 0.8);
    };
    side(0, 1, [0, 0, -1]);
    side(1, 2, [1, 0, 0]);
    side(2, 3, [0, 0, 1]);
    side(3, 0, [-1, 0, 0]);
    // topo
    const tp = [0, 1, 2, 3].map(i => { const [px, pz] = rp(i); return [px, y1, pz]; });
    this.quad(tp, [0, 1, 0], c, shade);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    return g;
  }
}

export class World {
  group = new THREE.Group();
  heights = new Float32Array(N * N);
  interactables: Interact[] = [];
  meshById: Record<string, THREE.Object3D> = {};
  colliders: { x: number; z: number; r: number }[] = [];
  pois: POIMark[] = [];
  minimap!: HTMLCanvasElement;
  campSpawns: { camp: string; def: string; x: number; z: number }[] = [];
  time = 0;
  boatGroup!: THREE.Group;

  private fireLights: { light: THREE.PointLight; base: number; seed: number }[] = [];
  private clouds!: THREE.InstancedMesh;
  private water!: THREE.Mesh;
  private fireCones: THREE.Mesh[] = [];
  private rng = mulberry32(CONFIG.SEED);

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  // ---------------- geração de altura ----------------
  private genHeights() {
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const base = 6 + fbm(x * 0.016, z * 0.016, CONFIG.SEED) * 12 + fbm(x * 0.055, z * 0.055, CONFIG.SEED + 7) * 4.5;
        let h = base;
        const tOcean = smoothstep(258, 300, x);
        h = lerpN(h, 3, tOcean);
        const tLake = smoothstep(48, 22, dist2d(x, z, 150, 292));
        h = lerpN(h, 3, tLake);
        const tA = smoothstep(POI.acamp.r + 12, POI.acamp.r - 4, dist2d(x, z, POI.acamp.x, POI.acamp.z));
        h = lerpN(h, Math.max(h, 15.5), tA * 0.9);
        this.heights[x + z * N] = h;
      }
    }
    for (const key of ['village', 'toca', 'acamp', 'wreck'] as const) {
      const p = POI[key];
      const target = p.flat || this.heights[Math.floor(p.x) + Math.floor(p.z) * N];
      for (let z = Math.max(0, Math.floor(p.z - p.r - 8)); z < Math.min(N, p.z + p.r + 8); z++) {
        for (let x = Math.max(0, Math.floor(p.x - p.r - 8)); x < Math.min(N, p.x + p.r + 8); x++) {
          const t = smoothstep(p.r + 8, p.r - 6, dist2d(x, z, p.x, p.z));
          const i = x + z * N;
          this.heights[i] = lerpN(this.heights[i], target, t);
        }
      }
    }
    for (let i = 0; i < this.heights.length; i++) this.heights[i] = Math.max(2.6, this.heights[i]);
  }

  heightAt(x: number, z: number): number {
    const cx = Math.max(0, Math.min(N - 1.001, x));
    const cz = Math.max(0, Math.min(N - 1.001, z));
    const x0 = Math.floor(cx), z0 = Math.floor(cz);
    const fx = cx - x0, fz = cz - z0;
    const x1 = Math.min(x0 + 1, N - 1), z1 = Math.min(z0 + 1, N - 1);
    const h00 = this.heights[x0 + z0 * N], h10 = this.heights[x1 + z0 * N];
    const h01 = this.heights[x0 + z1 * N], h11 = this.heights[x1 + z1 * N];
    return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;
  }

  private isPath(x: number, z: number): number {
    for (const [x1, z1, x2, z2] of PATHS) {
      const dx = x2 - x1, dz = z2 - z1;
      const len2 = dx * dx + dz * dz;
      let t = ((x - x1) * dx + (z - z1) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const d = dist2d(x, z, x1 + dx * t, z1 + dz * t);
      if (d < 2.6) return 1 - d / 3.4;
    }
    return 0;
  }

  private colorFor(x: number, z: number, h: number): THREE.Color {
    const c = new THREE.Color();
    if (h < WATER + 0.4) { c.setHex(0xcdb478); return c; }
    const n = fbm(x * 0.09, z * 0.09, CONFIG.SEED + 21);
    if (h > 19) { c.setHex(n > 0.5 ? 0x9a9a92 : 0x8d8d85); return c; }
    const dry = fbm(x * 0.03, z * 0.03, CONFIG.SEED + 33);
    if (dry > 0.62) c.setHex(0xb0a83f);
    else c.setHex(n > 0.52 ? 0x8fc94a : n > 0.4 ? 0x7db83a : 0x6da32f);
    const p = this.isPath(x, z);
    if (p > 0) c.lerp(new THREE.Color(0x9a7648), Math.min(0.85, p));
    const v = (hashGrid(x, z) - 0.5) * 0.06;
    c.r = Math.max(0, c.r + v); c.g = Math.max(0, c.g + v); c.b = Math.max(0, c.b + v);
    return c;
  }

  // ---------------- malha do terreno ----------------
  private buildTerrainMesh() {
    const gb = new GeoBuilder();
    const c = new THREE.Color();
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const h = this.heights[x + z * N];
        const he = x + 1 < N ? this.heights[(x + 1) + z * N] : h;
        const hs = z + 1 < N ? this.heights[x + (z + 1) * N] : h;
        const hw = x > 0 ? this.heights[(x - 1) + z * N] : h;
        const hn = z > 0 ? this.heights[x + (z - 1) * N] : h;
        c.copy(this.colorFor(x, z, h));
        const y = Math.round(h);
        const ye = Math.round(he), ys = Math.round(hs), yw = Math.round(hw), yn = Math.round(hn);
        gb.quad([[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]], [0, 1, 0], c, 1);
        if (yw < y) gb.quad([[x, yw, z], [x, yw, z + 1], [x, y, z + 1], [x, y, z]], [-1, 0, 0], c, 0.78);
        if (ye < y) gb.quad([[x + 1, ye, z + 1], [x + 1, ye, z], [x + 1, y, z], [x + 1, y, z + 1]], [1, 0, 0], c, 0.82);
        if (yn < y) gb.quad([[x + 1, yn, z], [x, yn, z], [x, y, z], [x + 1, y, z]], [0, 0, -1], c, 0.72);
        if (ys < y) gb.quad([[x, ys, z + 1], [x + 1, ys, z + 1], [x + 1, y, z + 1], [x, y, z + 1]], [0, 0, 1], c, 0.86);
      }
    }
    this.group.add(new THREE.Mesh(gb.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }

  // ---------------- props ----------------
  private scatterProps() {
    const gb = new GeoBuilder();
    const trunk = new THREE.Color(0x6b4a2f);
    const leafA = new THREE.Color(0x3f8f2f), leafB = new THREE.Color(0x57ad3a);
    const rockC = new THREE.Color(0x8d8d85);
    let placedTrees = 0;
    for (let attempt = 0; attempt < 900 && placedTrees < 110; attempt++) {
      const x = 8 + Math.floor(this.rng() * (N - 16));
      const z = 8 + Math.floor(this.rng() * (N - 16));
      const h = this.heightAt(x, z);
      if (h < WATER + 1.2 || h > 18.5) continue;
      if (this.isPath(x, z) > 0.1) continue;
      let near = false;
      for (const key of ['village', 'toca', 'acamp', 'wreck'] as const) {
        if (dist2d(x, z, POI[key].x, POI[key].z) < POI[key].r + 5) near = true;
      }
      if (dist2d(x, z, POI.ronceiro.x, POI.ronceiro.z) < 9) near = true;
      if (near) continue;
      const s = 0.8 + this.rng() * 0.6;
      gb.box(x + 0.5, h, z + 0.5, 1.2 * s, 5 * s, 1.2 * s, trunk);
      const lc = this.rng() > 0.5 ? leafA : leafB;
      gb.box(x + 0.5, h + 5 * s, z + 0.5, 4.6 * s, 1.4 * s, 4.6 * s, lc);
      gb.box(x + 0.5, h + 5 * s + 1.4 * s, z + 0.5, 3.4 * s, 1.2 * s, 3.4 * s, leafB);
      gb.box(x + 0.5, h + 5 * s + 2.6 * s, z + 0.5, 2 * s, 1 * s, 2 * s, leafA);
      this.colliders.push({ x: x + 0.5, z: z + 0.5, r: 0.9 * s });
      placedTrees++;
    }
    for (let i = 0; i < 60; i++) {
      const x = 8 + Math.floor(this.rng() * (N - 16));
      const z = 8 + Math.floor(this.rng() * (N - 16));
      const h = this.heightAt(x, z);
      if (h < WATER + 0.5) continue;
      if (this.isPath(x, z) > 0.1) continue;
      const s = 0.6 + this.rng() * 1.1;
      gb.box(x + 0.5, h, z + 0.5, s, s * 0.8, s, rockC, 1, this.rng() * 3);
    }
    const grassC = new THREE.Color(0x5a8f2a);
    for (let i = 0; i < 420; i++) {
      const x = 8 + this.rng() * (N - 16);
      const z = 8 + this.rng() * (N - 16);
      const h = this.heightAt(x, z);
      if (h < WATER + 0.8 || h > 18) continue;
      gb.box(x, h, z, 0.22, 0.55, 0.22, grassC, 1, this.rng() * 3);
    }
    this.group.add(new THREE.Mesh(gb.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }

  // ---------------- vila Porto-Canza ----------------
  private buildVillage() {
    const gb = new GeoBuilder();
    const vx = POI.village.x, vz = POI.village.z;
    const gy = Math.round(this.heightAt(vx, vz));
    const wallC = new THREE.Color(0xc9a86a), roofC = new THREE.Color(0x7a4a2e), woodC = new THREE.Color(0x8a5f38);
    const stoneC = new THREE.Color(0x7d7d76), ironC = new THREE.Color(0x5a5a60);

    const houses: [number, number][] = [[-11, -7], [10, -9], [3, 11]];
    for (const [ox, oz] of houses) {
      const x = vx + ox, z = vz + oz;
      const h = Math.round(this.heightAt(x, z));
      gb.box(x, h, z, 6, 3.4, 5, wallC);
      gb.box(x, h + 3.4, z, 6.8, 0.9, 5.8, roofC);
      gb.box(x, h + 4.3, z, 5, 0.9, 4.1, roofC);
      gb.box(x, h + 5.2, z, 3, 0.9, 2.5, roofC);
      gb.box(x, h + 6.1, z, 1, 0.8, 1, roofC);
      gb.box(x, h, z + 2.55, 1.2, 2.2, 0.2, new THREE.Color(0x4a3018));
      this.colliders.push({ x, z: z + 1, r: 3.4 });
    }

    const fh = Math.round(this.heightAt(vx, vz));
    gb.box(vx, fh, vz, 5, 0.3, 5, stoneC);
    gb.box(vx, fh + 0.3, vz, 1.6, 0.5, 0.5, woodC, 1, 0.5);
    gb.box(vx, fh + 0.3, vz, 0.5, 0.5, 1.6, woodC, 1, 0.2);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 5), new THREE.MeshBasicMaterial({ color: 0xff9a2a }));
    cone.position.set(vx, fh + 1.1, vz);
    this.group.add(cone); this.fireCones.push(cone);
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 5), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    cone2.position.set(vx, fh + 1.25, vz);
    this.group.add(cone2); this.fireCones.push(cone2);
    const fl = new THREE.PointLight(0xff9a3a, 30, 16, 1.8);
    fl.position.set(vx, fh + 2, vz);
    this.group.add(fl);
    this.fireLights.push({ light: fl, base: 30, seed: this.rng() * 10 });
    this.colliders.push({ x: vx, z: vz, r: 1.1 });
    this.interactables.push({ id: 'fogueira', tipo: 'fogueira', x: vx, y: fh, z: vz + 2.2, r: 2.6, ativo: true, cooldownUntil: 0, dados: {} });

    // FORJA
    const gxx = vx + 13, gz = vz + 1;
    const gh = Math.round(this.heightAt(gxx, gz));
    for (const [px, pz] of [[gxx - 2, gz - 2], [gxx + 2, gz - 2], [gxx - 2, gz + 2], [gxx + 2, gz + 2]]) {
      gb.box(px, gh, pz, 0.4, 2.6, 0.4, woodC);
    }
    gb.box(gxx, gh + 2.6, gz, 5.4, 0.4, 5.4, roofC);
    gb.box(gxx, gh, gz + 0.4, 1.4, 0.8, 0.8, ironC);
    gb.box(gxx - 0.3, gh + 0.8, gz + 0.4, 0.5, 0.4, 0.5, ironC);
    gb.box(gxx + 3, gh, gz, 1.6, 2, 1.6, new THREE.Color(0x5a4038));
    gb.box(gxx + 3, gh + 0.6, gz + 0.85, 0.8, 0.7, 0.2, new THREE.Color(0xff7a2a));
    const ffl = new THREE.PointLight(0xff7a2a, 18, 10, 2);
    ffl.position.set(gxx + 3, gh + 1.4, gz + 1.4);
    this.group.add(ffl);
    this.fireLights.push({ light: ffl, base: 18, seed: this.rng() * 10 });
    this.colliders.push({ x: gxx + 3, z: gz, r: 1.3 });
    this.interactables.push({ id: 'forja', tipo: 'forja', x: gxx, y: gh, z: gz + 1.2, r: 2.8, ativo: true, cooldownUntil: 0, dados: {} });

    // ESTÁBULO
    const sx = vx - 13, sz = vz + 6;
    const sh = Math.round(this.heightAt(sx, sz));
    for (let a = 0; a < Math.PI * 2; a += 0.45) {
      const ang = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (ang > 4.2 && ang < 5.2) continue;
      gb.box(sx + Math.cos(a) * 4, sh, sz + Math.sin(a) * 4, 0.3, 1.3, 0.3, woodC);
    }
    for (const [px, pz] of [[sx - 2.5, sz - 2.5], [sx + 2.5, sz - 2.5]]) {
      gb.box(px, sh, pz, 0.4, 3, 0.4, woodC);
    }
    gb.box(sx, sh + 3, sz, 6, 0.4, 3.4, roofC);
    gb.box(sx, sh, sz, 2.2, 0.5, 1, woodC);
    this.interactables.push({ id: 'estabulo', tipo: 'estabulo', x: sx, y: sh, z: sz, r: 3.4, ativo: true, cooldownUntil: 0, dados: {} });

    // Contratador Brais
    const bx = vx + 6, bz = vz + 4;
    const bh = Math.round(this.heightAt(bx, bz));
    gb.box(bx, bh, bz, 1.8, 1, 1, woodC);
    gb.box(bx, bh + 1, bz, 1.6, 0.15, 1, new THREE.Color(0xd8c27a));
    this.colliders.push({ x: bx, z: bz, r: 1 });
    this.interactables.push({ id: 'brais', tipo: 'npc', x: bx, y: bh, z: bz - 1.8, r: 2.4, ativo: true, cooldownUntil: 0, dados: { npc: 'brais' } });

    const geo = gb.build();
    this.group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    this.addLabel('PORTO-CANZA', vx, gy + 9.5, vz, '#ffe9a0', 10);
    this.pois.push({ x: vx, z: vz, ico: '⌂', label: 'Porto-Canza' });
  }

  // ---------------- acampamentos da Corja ----------------
  private buildCamp(name: 'toca' | 'acamp') {
    const gb = new GeoBuilder();
    const p = POI[name];
    const cx = p.x, cz = p.z;
    const gy = Math.round(this.heightAt(cx, cz));
    const woodC = new THREE.Color(0x6a4a2a);
    const darkC = new THREE.Color(0x3a2e22);
    const corjaC = new THREE.Color(0x5a2828);
    const radius = name === 'toca' ? 9 : 11;

    for (let a = 0; a < Math.PI * 2; a += 0.22) {
      const ang = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (ang > 1.35 && ang < 1.8) continue;
      const px = cx + Math.cos(ang) * radius;
      const pz = cz + Math.sin(ang) * radius;
      const hh = Math.round(this.heightAt(px, pz));
      gb.box(px, hh, pz, 0.55, 2.6 + (hashGrid(px, pz) > 0.7 ? 0.5 : 0), 0.55, woodC, 1, a);
      this.colliders.push({ x: px, z: pz, r: 0.5 });
    }
    const tx = cx - radius * 0.55, tz = cz - radius * 0.55;
    const th = Math.round(this.heightAt(tx, tz));
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) gb.box(tx + ox, th, tz + oz, 0.45, 5.5, 0.45, darkC);
    gb.box(tx, th + 5.5, tz, 3.2, 0.4, 3.2, woodC);
    gb.box(tx, th + 5.9, tz, 3.2, 1, 0.25, corjaC);
    this.colliders.push({ x: tx, z: tz, r: 1.6 });
    const bx = cx, bz = cz - 2;
    const bh = Math.round(this.heightAt(bx, bz));
    gb.box(bx, bh, bz, 0.35, 5, 0.35, darkC);
    gb.box(bx + 0.9, bh + 4.2, bz, 1.6, 1.1, 0.15, corjaC);
    this.colliders.push({ x: bx, z: bz, r: 0.6 });
    const tents = name === 'toca' ? [[4, 3], [-4, 4]] : [[5, 3], [-5, 4], [1, -5]];
    for (const [ox, oz] of tents) {
      const txx = cx + ox, tzz = cz + oz;
      const tth = Math.round(this.heightAt(txx, tzz));
      gb.box(txx, tth, tzz, 3, 1.4, 3, darkC);
      gb.box(txx, tth + 1.4, tzz, 1.8, 1.2, 1.8, darkC);
      gb.box(txx, tth + 2.6, tzz, 0.8, 0.8, 0.8, darkC);
      this.colliders.push({ x: txx, z: tzz, r: 1.8 });
    }
    const fh = Math.round(this.heightAt(cx, cz + 1));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1, 5), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
    cone.position.set(cx, fh + 0.9, cz + 1);
    this.group.add(cone); this.fireCones.push(cone);
    const cl = new THREE.PointLight(0xff8a3a, 16, 12, 2);
    cl.position.set(cx, fh + 1.8, cz + 1);
    this.group.add(cl);
    this.fireLights.push({ light: cl, base: 16, seed: this.rng() * 10 });

    const chx = cx + 3, chz = cz - 3;
    const chh = Math.round(this.heightAt(chx, chz));
    gb.box(chx, chh, chz, 1.4, 0.9, 1, new THREE.Color(0x8a5f38));
    gb.box(chx, chh + 0.9, chz, 1.4, 0.35, 1, new THREE.Color(0xd8b45a));
    this.interactables.push({
      id: `bau-${name}`, tipo: 'bau', x: chx, y: chh, z: chz, r: 2.4, ativo: true, cooldownUntil: 0,
      dados: { camp: name, opened: false }
    });
    this.pois.push({ x: cx, z: cz, ico: '☠', label: name === 'toca' ? 'Toca do Farejador' : 'Acampamento da Matilha' });

    const geo = gb.build();
    this.group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));

    const lvl = name === 'toca' ? 2 : 4;
    this.addLabel(`${name === 'toca' ? 'TOCA DO FAREJADOR' : 'ACAMPAMENTO DA MATILHA'} · NV.${lvl}`, cx, gy + 8.5, cz, '#ff9a8a', 8);

    if (name === 'toca') {
      this.campSpawns.push({ camp: 'toca', def: 'farejador', x: cx - 3, z: cz + 2 });
      this.campSpawns.push({ camp: 'toca', def: 'farejador', x: cx + 4, z: cz + 4 });
      this.campSpawns.push({ camp: 'toca', def: 'farejador', x: cx, z: cz - 4 });
    } else {
      this.campSpawns.push({ camp: 'acamp', def: 'cacador', x: cx - 2, z: cz + 1 });
      this.campSpawns.push({ camp: 'acamp', def: 'cacador', x: cx + 5, z: cz - 1 });
      this.campSpawns.push({ camp: 'acamp', def: 'farejador', x: cx - 5, z: cz - 2 });
      this.campSpawns.push({ camp: 'acamp', def: 'farejador', x: cx + 1, z: cz + 5 });
    }
  }

  // ---------------- destroço do comboio ----------------
  private buildWreck() {
    const p = POI.wreck;
    const gy = Math.round(this.heightAt(p.x, p.z));
    const gb = new GeoBuilder();
    const woodC = new THREE.Color(0x6a4a2a);
    const cargaC = new THREE.Color(0xb8935a);
    gb.box(p.x, gy + 0.4, p.z, 3.2, 0.9, 2, woodC, 1, 0.4);
    gb.box(p.x + 1, gy + 1, p.z - 0.4, 1.2, 0.8, 1.6, cargaC, 1, 0.6);
    gb.box(p.x - 1.6, gy, p.z + 1.2, 1.4, 1.4, 0.3, new THREE.Color(0x4a3a22), 1, 0.7);
    gb.box(p.x + 0.6, gy, p.z + 1.6, 1.4, 1.4, 0.3, new THREE.Color(0x4a3a22), 1, 0.2);
    this.group.add(new THREE.Mesh(gb.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    this.addLabel('DESTROÇO DO COMBOIO', p.x, gy + 4.5, p.z, '#e8c8a0', 6);
    this.pois.push({ x: p.x, z: p.z, ico: '✖', label: 'Destroço do Comboio' });

    for (let i = 0; i < 3; i++) {
      const x = p.x + Math.cos(i * 2.1) * 3.4;
      const z = p.z + Math.sin(i * 2.1) * 3.4;
      const gbi = new GeoBuilder();
      const h = Math.round(this.heightAt(x, z));
      gbi.box(x, h, z, 1, 0.8, 1, cargaC);
      gbi.box(x, h + 0.8, z, 1.02, 0.2, 1.02, new THREE.Color(0xd8b45a));
      const mesh = new THREE.Mesh(gbi.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      this.group.add(mesh);
      this.meshById[`carga-${i}`] = mesh;
      this.interactables.push({ id: `carga-${i}`, tipo: 'carga', x, y: h, z, r: 2.2, ativo: true, cooldownUntil: 0, dados: { idx: i } });
    }
  }

  // ---------------- erva-de-kurnis / rochas de minério ----------------
  private buildGatherables() {
    const spots: [number, number][] = [
      [132, 160], [140, 150], [128, 190], [150, 172], [163, 155],
      [175, 145], [185, 128], [200, 128], [212, 122], [168, 185],
      [180, 200], [200, 215], [225, 195], [235, 215], [145, 135], [155, 165]
    ];
    for (let i = 0; i < spots.length; i++) {
      const [x, z] = spots[i];
      const h = Math.round(this.heightAt(x, z));
      if (h < WATER + 0.5) continue;
      const gbi = new GeoBuilder();
      gbi.box(x, h, z, 0.6, 0.5, 0.6, new THREE.Color(0x4f8f2a));
      gbi.box(x, h + 0.5, z, 0.35, 0.4, 0.35, new THREE.Color(0x9fe05a));
      const mesh = new THREE.Mesh(gbi.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      this.group.add(mesh);
      this.meshById[`erva-${i}`] = mesh;
      this.interactables.push({ id: `erva-${i}`, tipo: 'erva', x, y: h, z, r: 2, ativo: true, cooldownUntil: 0, dados: {} });
    }
    const rocks: [number, number][] = [[136, 168], [112, 158], [176, 162], [200, 150]];
    for (let i = 0; i < rocks.length; i++) {
      const [x, z] = rocks[i];
      const h = Math.round(this.heightAt(x, z));
      const gbi = new GeoBuilder();
      gbi.box(x, h, z, 1.8, 1.4, 1.8, new THREE.Color(0x6a6a72));
      gbi.box(x + 0.4, h + 0.6, z - 0.3, 0.5, 0.5, 0.5, new THREE.Color(0xc88a4a));
      gbi.box(x - 0.5, h + 0.3, z + 0.4, 0.4, 0.4, 0.4, new THREE.Color(0xc88a4a));
      const mesh = new THREE.Mesh(gbi.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      this.group.add(mesh);
      this.meshById[`rocha-${i}`] = mesh;
      this.colliders.push({ x, z, r: 1.2 });
      this.interactables.push({ id: `rocha-${i}`, tipo: 'rocha', x, y: h, z, r: 2.6, ativo: true, cooldownUntil: 0, dados: { uses: 3 } });
    }
  }

  // ---------------- jangada + pier ----------------
  private buildBoat(): THREE.Group {
    const gb = new GeoBuilder();
    const woodC = new THREE.Color(0x8a5f38), darkC = new THREE.Color(0x5a3e22);
    for (let i = 0; i < 5; i++) {
      gb.box(0, 0, -1.6 + i * 0.8, 3, 0.4, 0.6, i % 2 ? woodC : darkC);
    }
    gb.box(0, 0.4, 0.2, 0.25, 3.4, 0.25, darkC);
    gb.box(0, 2.6, 1.1, 0.12, 1.4, 1.7, new THREE.Color(0xd8cfa8));
    const boat = new THREE.Mesh(gb.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    const g = new THREE.Group();
    g.add(boat);
    g.position.set(POI.boat.x, WATER - 0.15, POI.boat.z);
    g.rotation.y = Math.PI;
    this.group.add(g);

    const gb2 = new GeoBuilder();
    const dh = Math.round(this.heightAt(POI.dock.x, POI.dock.z));
    for (let i = 0; i < 8; i++) {
      gb2.box(POI.dock.x + i * 1.4, dh - i * 0.35, POI.dock.z, 3, 0.35, 2.2, woodC);
    }
    this.group.add(new THREE.Mesh(gb2.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));

    this.interactables.push({ id: 'jangada', tipo: 'jangada', x: POI.boat.x, y: WATER, z: POI.boat.z, r: 3.4, ativo: true, cooldownUntil: 0, dados: {} });
    this.pois.push({ x: POI.boat.x, z: POI.boat.z, ico: '⛵', label: 'Jangada da Guilda' });
    return g;
  }

  // ---------------- céu, água, nuvens ----------------
  private buildSkyWater() {
    const wgeo = new THREE.PlaneGeometry(N * 1.6, N * 1.6);
    const wmat = new THREE.MeshLambertMaterial({ color: 0x2a7bd4, transparent: true, opacity: 0.82 });
    this.water = new THREE.Mesh(wgeo, wmat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(N * 0.5, WATER, N * 0.5);
    this.group.add(this.water);

    const cgeo = new THREE.BoxGeometry(1, 1, 1);
    const cmat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const count = 26;
    this.clouds = new THREE.InstancedMesh(cgeo, cmat, count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const x = this.rng() * N, z = this.rng() * N;
      const s = 6 + this.rng() * 14;
      m.makeScale(s, 2 + this.rng() * 2, s * 0.7);
      m.setPosition(x, 58 + this.rng() * 22, z);
      this.clouds.setMatrixAt(i, m);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
    this.group.add(this.clouds);
  }

  addLabel(txt: string, x: number, y: number, z: number, color = '#ffffff', scale = 6) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    let size = 30;
    ctx.font = `${size}px "Press Start 2P", monospace`;
    while (ctx.measureText(txt).width > 490 && size > 10) {
      size -= 2;
      ctx.font = `${size}px "Press Start 2P", monospace`;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.strokeText(txt, 256, 40);
    ctx.fillStyle = color;
    ctx.fillText(txt, 256, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    spr.position.set(x, y, z);
    spr.scale.set(scale, scale * (80 / 512), 1);
    this.group.add(spr);
    return spr;
  }

  build() {
    this.genHeights();
    this.buildTerrainMesh();
    this.scatterProps();
    this.buildVillage();
    this.buildCamp('toca');
    this.buildCamp('acamp');
    this.buildWreck();
    this.buildGatherables();
    this.boatGroup = this.buildBoat();
    this.buildSkyWater();
    this.buildMinimap();
    this.pois.push({ x: POI.ronceiro.x, z: POI.ronceiro.z, ico: '🐎', label: 'Ronceiro ferido' });
  }

  update(dt: number) {
    this.time += dt;
    for (const f of this.fireLights) {
      f.light.intensity = f.base * (0.82 + 0.28 * Math.sin(this.time * 11 + f.seed) + 0.1 * Math.sin(this.time * 23 + f.seed * 3));
    }
    for (const c of this.fireCones) {
      c.scale.y = 0.9 + 0.2 * Math.sin(this.time * 13 + c.position.x);
    }
    this.water.position.y = WATER + Math.sin(this.time * 1.1) * 0.06;
    this.clouds.position.x = (this.time * 0.6) % 40;
    for (const it of this.interactables) {
      if (!it.ativo && it.cooldownUntil > 0 && this.time > it.cooldownUntil) {
        if (it.tipo === 'erva') { it.ativo = true; it.cooldownUntil = 0; }
        if (it.tipo === 'rocha' && it.dados.uses <= 0) { it.dados.uses = 3; it.ativo = true; it.cooldownUntil = 0; }
      }
    }
  }

  // ---------------- minimapa ----------------
  private buildMinimap() {
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(N, N);
    const c = new THREE.Color();
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const h = this.heights[x + z * N];
        if (h < WATER) c.setHex(0x2a6ac4);
        else c.copy(this.colorFor(x, z, h));
        const shade = 0.75 + Math.min(0.5, (h - WATER) * 0.03);
        const i = (x + z * N) * 4;
        img.data[i] = Math.min(255, c.r * 255 * shade);
        img.data[i + 1] = Math.min(255, c.g * 255 * shade);
        img.data[i + 2] = Math.min(255, c.b * 255 * shade);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.minimap = cv;
  }
}

function lerpN(a: number, b: number, t: number) { return a + (b - a) * t; }
function hashGrid(x: number, z: number): number {
  let n = (Math.floor(x * 31.7) * 374761393 + Math.floor(z * 27.3) * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
