// ============================================================
// LEONIS — cutscene.ts · Intro: "A Grão-Nau" (4 cenas, skippável)
// ============================================================

import * as THREE from 'three';
import { mulberry32 } from '../core';

const lam = (hex: number) => new THREE.MeshLambertMaterial({ color: hex, side: THREE.DoubleSide });
const box = (w: number, h: number, d: number, mat: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

export interface CutsceneHooks {
  onSubtitle: (txt: string) => void;
  onChapter: (txt: string) => void;
  onTitle: (show: boolean) => void;
  onFinish: () => void;
  sfx: (name: string) => void;
}

interface Beat {
  dur: number;
  chapter: string;
  sub: string;
}

const BEATS: Beat[] = [
  { dur: 8.0, chapter: 'I · O MAR TRAIDOR',   sub: 'O mar engoliu a Grão-Nau. Dois mil chegaram vivos às praias do Bravo.' },
  { dur: 8.0, chapter: 'II · O BRAVO',        sub: 'Feras, fome e inverno cobraram metade no primeiro ano. O que sobrou se encurralou no Berço.' },
  { dur: 9.0, chapter: 'III · A PRIMEIRA VOLTA', sub: 'Então Leona fez o que ninguém: saiu — e VOLTOU. Trouxe sementes, aço e uma fera ao lado. Nasceram os LEONIS.' },
  { dur: 999, chapter: 'IV · SÉCULOS DEPOIS', sub: 'A guilda reabre as rotas. Sua vez de voltar trazendo.' }
];

export class Cutscene {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private hooks: CutsceneHooks;
  private t = 0;
  private beat = 0;
  private beatT = 0;
  finished = false;

  // cena 1
  private ship!: THREE.Group;
  private rain!: THREE.InstancedMesh;
  private rainVel: number[] = [];
  private water1!: THREE.Mesh;
  private hemi1!: THREE.HemisphereLight;
  private flashT = 0;
  private g1 = new THREE.Group();

  // cena 2
  private g2 = new THREE.Group();
  private feras: THREE.Group[] = [];
  private fires: THREE.PointLight[] = [];
  private hemi2!: THREE.HemisphereLight;

  // cena 3
  private g3 = new THREE.Group();
  private leona!: THREE.Group;
  private filhote!: THREE.Group;
  private sun3!: THREE.DirectionalLight;
  private hemi3!: THREE.HemisphereLight;

  // câmera
  private camFrom = new THREE.Vector3();
  private camTo = new THREE.Vector3();
  private lookFrom = new THREE.Vector3();
  private lookTo = new THREE.Vector3();

  constructor(hooks: CutsceneHooks, aspect: number) {
    this.hooks = hooks;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 400);
    this.buildBeat1();
    this.buildBeat2();
    this.buildBeat3();
    this.applyBeat(0, true);
  }

  // ---------------- cena 1: naufrágio ----------------
  private buildBeat1() {
    const s = this.g1;
    this.scene.add(s);
    this.hemi1 = new THREE.HemisphereLight(0x8aa8cc, 0x0a1420, 0.5);
    s.add(this.hemi1);
    const moon = new THREE.DirectionalLight(0xaac8e8, 0.7);
    moon.position.set(-30, 50, -20);
    s.add(moon);

    // mar
    this.water1 = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 24, 24), new THREE.MeshLambertMaterial({ color: 0x0a2233 }));
    this.water1.rotation.x = -Math.PI / 2;
    s.add(this.water1);

    // Grão-Nau
    const ship = new THREE.Group();
    const wood = lam(0x4a3620), woodD = lam(0x382816), sailM = lam(0x8a8478);
    const hull = box(6, 2.4, 16, wood);
    hull.position.y = 1;
    ship.add(hull);
    const keel = box(4, 1.2, 14, woodD);
    keel.position.y = -0.4;
    ship.add(keel);
    const deck = box(5, 0.5, 14, woodD);
    deck.position.y = 2.3;
    ship.add(deck);
    for (const [mx, mz] of [[0, -4], [0, 3]]) {
      const mast = box(0.6, 12, 0.6, woodD);
      mast.position.set(mx, 8, mz);
      ship.add(mast);
      const sail = box(0.2, 5, 7, sailM);
      sail.position.set(mx + 0.5, 9.5, mz);
      sail.rotation.y = 0.2;
      ship.add(sail);
    }
    const crow = box(1.2, 1, 1.2, wood);
    crow.position.set(0, 13.5, -4);
    ship.add(crow);
    this.ship = ship;
    s.add(ship);

    // chuva
    const rainGeo = new THREE.BoxGeometry(0.06, 1.4, 0.06);
    const rainMat = new THREE.MeshBasicMaterial({ color: 0x6a8ab0, transparent: true, opacity: 0.55 });
    const N = 260;
    this.rain = new THREE.InstancedMesh(rainGeo, rainMat, N);
    const m = new THREE.Matrix4();
    const rng = mulberry32(7);
    for (let i = 0; i < N; i++) {
      m.setPosition((rng() - 0.5) * 90, rng() * 40, (rng() - 0.5) * 90);
      this.rain.setMatrixAt(i, m);
      this.rainVel.push(26 + rng() * 14);
    }
    s.add(this.rain);
  }

  // ---------------- cena 2: o Bravo ----------------
  private buildBeat2() {
    const s = this.g2;
    this.scene.add(s);
    this.hemi2 = new THREE.HemisphereLight(0x5a6a7a, 0x1a1410, 0.55);
    s.add(this.hemi2);

    // praia / terreno escuro
    const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 2, 120), lam(0x22301c));
    ground.position.set(0, -1, 0);
    s.add(ground);
    const sand = new THREE.Mesh(new THREE.BoxGeometry(200, 2, 26), lam(0x4a4438));
    sand.position.set(0, -0.6, 44);
    s.add(sand);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 40), new THREE.MeshLambertMaterial({ color: 0x0a1e30 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.1, 66);
    s.add(water);

    // sobreviventes (figuras acachapadas)
    const rng = mulberry32(11);
    for (let i = 0; i < 7; i++) {
      const fig = new THREE.Group();
      const c = rng() > 0.5 ? 0x4a4038 : 0x3a3430;
      const bodyM = box(0.5, 0.55, 0.4, lam(c));
      bodyM.position.y = 0.5;
      fig.add(bodyM);
      const headM = box(0.42, 0.4, 0.4, lam(0x9a8468));
      headM.position.y = 0.98;
      fig.add(headM);
      fig.position.set(-14 + i * 4.5 + rng() * 2, 0.1, 34 + rng() * 6);
      fig.rotation.y = rng() * 6;
      s.add(fig);
    }

    // feras colossais na crista (silhuetas com olhos acesos)
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Group();
      const black = lam(0x0c0e10);
      const torso = box(6, 7, 10, black);
      torso.position.y = 8;
      f.add(torso);
      const head = box(4.4, 4, 4.6, black);
      head.position.set(0, 12.5, 6);
      f.add(head);
      for (const ex of [-1.2, 1.2]) {
        const eye = box(0.55, 0.35, 0.2, new THREE.MeshBasicMaterial({ color: 0xffb43a }));
        eye.position.set(ex, 12.9, 8.35);
        f.add(eye);
      }
      for (const [lx, lz] of [[-2.4, -3.5], [2.4, -3.5], [-2.4, 3.5], [2.4, 3.5]]) {
        const leg = box(1.7, 5, 1.9, black);
        leg.position.set(lx, 2.5, lz);
        f.add(leg);
      }
      const horn = box(0.7, 2.6, 0.7, black);
      horn.position.set(-1.4, 15.5, 6);
      horn.rotation.z = 0.3;
      f.add(horn);
      f.position.set(-34 + i * 30, 9, -46 - i * 6);
      f.rotation.y = 0.35;
      s.add(f);
      this.feras.push(f);
    }

    // fogueiras dos sobreviventes
    for (const [fx, fz] of [[-10, 38], [8, 36]]) {
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 5), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
      fire.position.set(fx, 0.9, fz);
      s.add(fire);
      const l = new THREE.PointLight(0xff8a3a, 26, 22, 1.8);
      l.position.set(fx, 2, fz);
      s.add(l);
      this.fires.push(l);
    }
  }

  // ---------------- cena 3: Leona ----------------
  private buildBeat3() {
    const s = this.g3;
    this.scene.add(s);
    this.hemi3 = new THREE.HemisphereLight(0x8898a8, 0x2a3418, 0.6);
    s.add(this.hemi3);
    this.sun3 = new THREE.DirectionalLight(0xffd8a0, 0.4);
    this.sun3.position.set(-40, 20, 30);
    s.add(this.sun3);

    const ground = new THREE.Mesh(new THREE.BoxGeometry(220, 2, 140), lam(0x4a6a2a));
    ground.position.set(0, -1, 0);
    s.add(ground);
    // trilha
    const path = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 140), lam(0x8a6a40));
    path.position.set(0, 0.05, 0);
    s.add(path);

    // Leona: vaga vermelha, mochila
    const leona = new THREE.Group();
    const skin = lam(0xd8a37a);
    for (const lx of [-0.2, 0.2]) {
      const leg = box(0.26, 0.66, 0.3, lam(0x3a3228));
      leg.position.set(lx, 0.33, 0);
      leona.add(leg);
    }
    const torso = box(0.74, 0.72, 0.46, lam(0x8a2a2a));
    torso.position.y = 1.02;
    leona.add(torso);
    for (const ax of [-0.5, 0.5]) {
      const arm = box(0.24, 0.62, 0.26, skin);
      arm.position.set(ax, 1.06, 0);
      leona.add(arm);
    }
    const head = box(0.94, 0.86, 0.9, skin);
    head.position.y = 1.85;
    leona.add(head);
    const hair = box(1.0, 0.5, 0.96, lam(0x2a1a10));
    hair.position.y = 2.1;
    leona.add(hair);
    const scarf = box(0.8, 0.16, 0.5, lam(0xd84a2a));
    scarf.position.y = 1.42;
    leona.add(scarf);
    const pack = box(0.6, 0.6, 0.3, lam(0x6a4a2a));
    pack.position.set(0, 1.1, -0.4);
    leona.add(pack);
    this.leona = leona;
    s.add(leona);

    // filhote ao lado
    const filhote = new THREE.Group();
    const coat = lam(0x8a6248);
    const fTorso = box(0.8, 0.7, 1.4, coat);
    fTorso.position.y = 1;
    filhote.add(fTorso);
    const fHead = box(0.5, 0.5, 0.7, coat);
    fHead.position.set(0, 1.6, 0.85);
    filhote.add(fHead);
    for (const [lx, lz] of [[-0.26, 0.5], [0.26, 0.5], [-0.26, -0.5], [0.26, -0.5]]) {
      const leg = box(0.22, 0.7, 0.24, coat);
      leg.position.set(lx, 0.35, lz);
      filhote.add(leg);
    }
    this.filhote = filhote;
    s.add(filhote);
  }

  // ---------------- beats ----------------
  private applyBeat(b: number, instant = false) {
    this.beat = b;
    this.beatT = 0;
    this.g1.visible = b === 0;
    this.g2.visible = b === 1;
    this.g3.visible = b === 2;
    this.hooks.onTitle(b === 3);
    const beat = BEATS[b];
    this.hooks.onChapter(beat.chapter);
    this.hooks.onSubtitle(beat.sub);

    const t = instant ? 1 : 0;
    if (b === 0) {
      this.scene.background = new THREE.Color(0x0a1420);
      this.scene.fog = new THREE.Fog(0x0a1420, 30, 130);
      this.camFrom.set(24, 9, 34); this.camTo.set(10, 12, 26);
      this.lookFrom.set(0, 8, 0); this.lookTo.set(0, 6, 0);
      this.hooks.sfx('splash');
    } else if (b === 1) {
      this.scene.background = new THREE.Color(0x0e1216);
      this.scene.fog = new THREE.Fog(0x0e1216, 40, 150);
      this.camFrom.set(0, 4, 52); this.camTo.set(0, 6, 44);
      this.lookFrom.set(0, 8, 30); this.lookTo.set(0, 10, -20);
      this.hooks.sfx('hurt');
    } else if (b === 2) {
      this.scene.background = new THREE.Color(0x2a3438);
      this.scene.fog = new THREE.Fog(0x2a3438, 50, 180);
      this.camFrom.set(9, 3.4, -8); this.camTo.set(7, 4, 10);
      this.lookFrom.set(0, 1.6, 6); this.lookTo.set(0, 2, -4);
      this.hooks.sfx('quest');
    } else if (b === 3) {
      this.scene.background = new THREE.Color(0x8ecdf5);
      this.scene.fog = new THREE.Fog(0x8ecdf5, 60, 220);
      this.camFrom.set(16, 6, 18); this.camTo.set(14, 7, 16);
      this.lookFrom.set(0, 2, 0); this.lookTo.set(0, 2.4, 0);
      this.hooks.onSubtitle('A guilda reabre as rotas. Sua vez de voltar trazendo.');
      this.hooks.sfx('tame');
    }
    if (instant) {
      const k = t;
      this.camera.position.lerpVectors(this.camFrom, this.camTo, k);
    }
  }

  skip() {
    if (this.beat < 3) this.enterBeat(3);
    else this.finish();
  }

  private enterBeat(b: number) {
    this.applyBeat(b);
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.hooks.onFinish();
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number) {
    this.t += dt;
    this.beatT += dt;
    const b = this.beat;

    if (b < BEATS.length - 1 && this.beatT > BEATS[b].dur) {
      this.enterBeat(b + 1);
    }

    // câmera: pan suave do beat
    const k = Math.min(1, this.beatT / (BEATS[b].dur * 0.85));
    const e = k * k * (3 - 2 * k);
    this.camera.position.lerpVectors(this.camFrom, this.camTo, e);
    const look = new THREE.Vector3().lerpVectors(this.lookFrom, this.lookTo, e);
    this.camera.lookAt(look);

    if (b === 0) this.updateBeat1(dt);
    else if (b === 1) this.updateBeat2(dt);
    else if (b === 2) this.updateBeat3(dt);
    else this.updateBeat4(dt);
  }

  private updateBeat1(dt: number) {
    // navio afundando
    const k = Math.min(1, this.beatT / BEATS[0].dur);
    const e = k * k;
    this.ship.position.y = -e * 6;
    this.ship.rotation.z = e * 0.55;
    this.ship.rotation.x = e * 0.2;
    this.ship.position.x = Math.sin(this.t * 0.7) * 1.2;
    // mar ondulando
    const pos = (this.water1.geometry as THREE.PlaneGeometry).attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.25 + this.t * 2) * 0.5 + Math.cos(y * 0.2 + this.t * 1.4) * 0.4);
    }
    pos.needsUpdate = true;
    this.water1.geometry.computeVertexNormals();
    // chuva
    const m = new THREE.Matrix4();
    for (let i = 0; i < this.rain.count; i++) {
      this.rain.getMatrixAt(i, m);
      let y = m.elements[13] - this.rainVel[i] * dt;
      if (y < 0) y = 40;
      m.elements[13] = y;
      this.rain.setMatrixAt(i, m);
    }
    this.rain.instanceMatrix.needsUpdate = true;
    // relâmpago
    this.flashT -= dt;
    if (this.flashT <= 0 && Math.random() < 0.012) {
      this.flashT = 0.14;
      this.hooks.sfx('open');
    }
    const flash = this.flashT > 0;
    (this.scene.background as THREE.Color).setHex(flash ? 0x4a6a8a : 0x0a1420);
    this.hemi1.intensity = flash ? 1.4 : 0.5;
  }

  private updateBeat2(dt: number) {
    for (let i = 0; i < this.fires.length; i++) {
      this.fires[i].intensity = 26 * (0.8 + 0.3 * Math.sin(this.t * 10 + i * 3));
    }
    // feras: respirar
    for (let i = 0; i < this.feras.length; i++) {
      this.feras[i].scale.y = 1 + Math.sin(this.t * 1.6 + i) * 0.02;
    }
    void dt;
  }

  private updateBeat3(dt: number) {
    // Leona caminhando pro Bravo, depois voltando com o filhote
    const T = this.beatT;
    if (T < 4.2) {
      // indo
      this.leona.position.set(0, 0.1, 8 - T * 2.4);
      this.leona.rotation.y = Math.PI;
      this.filhote.visible = false;
      this.sun3.intensity = 0.35;
      (this.scene.background as THREE.Color).setHex(0x2a3438);
    } else {
      // voltando (transição dura = corte cinematográfico)
      const k = Math.min(1, (T - 4.2) / 4);
      this.leona.position.set(0, 0.1, -14 + k * 20);
      this.leona.rotation.y = 0;
      this.filhote.visible = true;
      this.filhote.position.set(1.6, 0.1, this.leona.position.z - 2.4);
      this.filhote.rotation.y = 0;
      // amanhecer
      const warm = Math.min(1, (T - 4.2) / 4.4);
      (this.scene.background as THREE.Color).setHex(0x2a3438).lerp(new THREE.Color(0x8ecdf5), warm);
      this.sun3.intensity = 0.35 + warm * 1.1;
      this.hemi3.intensity = 0.6 + warm * 0.5;
      if (!this.dawnSfx && T > 4.4) { this.dawnSfx = true; this.hooks.sfx('level'); }
    }
    // bob de caminhada
    this.leona.position.y = 0.1 + Math.abs(Math.sin(this.t * 8)) * 0.07;
    this.filhote.position.y = 0.1 + Math.abs(Math.sin(this.t * 10)) * 0.05;
    void dt;
  }
  private dawnSfx = false;

  private updateBeat4(dt: number) {
    // plano calmo atrás do título
    void dt;
  }
}
