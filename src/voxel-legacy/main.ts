// ============================================================
// LEONIS — main.ts · Orquestra tudo (Marco M1: Fatia Vertical "Kurnis")
// ============================================================

import * as THREE from 'three';
import { CONFIG, POI, RACES, WEAPONS, rollPrefixo, gearNome } from '../data/defs';
import { Input, AudioSys, saveGame, loadGame, hasSave, clamp, dist2d, mulberry32 } from '../core';
import { World, Interact } from './world';
import { Player, Mount } from './entities';
import { Enemy, NPC, Boat, Proj } from './foes';
import { UI } from './ui';
import { Cutscene } from './cutscene';
import { dmgMult, rollLoot, upgradeCost, gearNome as gearNomeSys } from '../systems';

class Game {
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  world!: World;
  input!: Input;
  audio = new AudioSys();
  ui!: UI;

  player!: Player;
  mount!: Mount;
  enemies: Enemy[] = [];
  npcs: NPC[] = [];
  boat!: Boat;
  projs: Proj[] = [];
  echoes: { mesh: THREE.Mesh; leguas: number }[] = [];

  camYaw = 0; camPitch = 0.4; camDist = 9.2;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camInit = false;
  time = 0;
  state: 'cutscene' | 'creation' | 'play' | 'pause' | 'dead' = 'cutscene';
  cutscene: Cutscene | null = null;
  private creationBuilt = false;

  // progresso
  q1Stage = 0; // 0 fala c/ Brais · 1 coleta · 2 entrega · 3 feita
  q2Stage = 0; // 0 bloqueada · 1 ativa · 2 libertado (alimentar) · 3 domado
  fed = 0;
  clearedCamps = new Set<string>();
  pickedCargas = new Set<number>();
  discovered = new Set<string>();
  ronceiroGuards: Enemy[] = [];
  furiaCd = 0;
  rng = mulberry32(CONFIG.SEED + 5);

  get WATER() { return CONFIG.WATER_Y; }
  get SIZE() { return CONFIG.SIZE; }

  async start() {
    // fontes pixel antes de construir qualquer label
    try {
      await document.fonts.load('12px "Press Start 2P"');
      await document.fonts.load('16px "VT323"');
      await document.fonts.ready;
    } catch { /* segue sem pixel font */ }

    const container = document.getElementById('game')!;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);
    this.input = new Input(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ecdf5);
    this.scene.fog = new THREE.Fog(0xbfe3ff, 90, 250);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);

    const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x7a9a4a, 0.95);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.7);
    sun.position.set(90, 130, 50);
    this.scene.add(sun);

    this.world = new World(this.scene);
    this.world.build();

    this.ui = new UI('ui-root', this);

    this.renderer.domElement.addEventListener('click', () => {
      if (this.state === 'play' && !this.uiOpen()) this.input.requestLock();
      if (this.state === 'cutscene' && this.cutscene) this.cutscene.skip();
    });
    document.addEventListener('pointerlockchange', () => {
      if (!this.input.locked && this.state === 'play' && !this.uiOpen()) {
        this.state = 'pause';
        this.ui.showPause(this);
        this.ui.showLockHint(false);
      }
    });
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.cutscene?.resize(this.camera.aspect);
    });

    // cutscene inicial (pula direto pra criação se há save)
    if (hasSave()) this.showCreation();
    else this.startCutscene();

    this.animate();
  }

  // ------------------------------------------------------------
  // cutscene + criação
  // ------------------------------------------------------------
  private startCutscene() {
    this.state = 'cutscene';
    this.buildCutsceneDom();
    this.cutscene = new Cutscene({
      onSubtitle: (t) => { const el = document.getElementById('cs-sub'); if (el) el.textContent = t; },
      onChapter: (t) => {
        const el = document.getElementById('cs-chapter');
        if (el) { el.textContent = t; el.style.opacity = '1'; setTimeout(() => { if (el) el.style.opacity = '0'; }, 3800); }
      },
      onTitle: (show) => { const el = document.getElementById('cs-title'); if (el) el.style.display = show ? 'block' : 'none'; },
      onFinish: () => this.showCreation(),
      sfx: (n) => this.audio.sfx(n)
    }, window.innerWidth / window.innerHeight);
    const cs = document.getElementById('cutscene');
    if (cs) cs.classList.add('on');
  }

  private buildCutsceneDom() {
    const root = this.ui.root;
    const cs = document.createElement('div');
    cs.id = 'cutscene';
    cs.className = 'clickable';
    cs.innerHTML = `
      <div class="csbar top"></div>
      <div class="csbar bot"></div>
      <div id="cs-chapter" class="px"></div>
      <div id="cs-sub"></div>
      <div id="cs-title">
        <h1>LEONIS</h1>
        <h2>OS QUE VOLTAM</h2>
        <div class="obj">
          EXPLORE O BRAVO · TRAGA O QUE A HUMANIDADE PRECISA<br>
          DOME AS FERAS · COMPLETE A CARTA-PRIMEIRA<br>
          <span style="color:#ffd23a">QUEM VOLTA, VOLTA TRAZENDO.</span>
        </div>
        <button class="btn" id="cs-go">DESEMBARCAR NO BRAVO</button>
      </div>
      <button id="cs-skip">PULAR »</button>`;
    root.appendChild(cs);
    cs.querySelector('#cs-go')!.addEventListener('click', () => { this.cutscene?.skip(); cs.classList.remove('on'); });
    cs.querySelector('#cs-skip')!.addEventListener('click', () => { this.cutscene?.skip(); });
  }

  private showCreation() {
    const cs = document.getElementById('cutscene');
    if (cs) { cs.classList.remove('on'); }
    this.cutscene = null;
    if (this.creationBuilt) { this.state = 'creation'; return; }
    this.creationBuilt = true;
    this.state = 'creation';
    this.ui.buildCreation((race, weapon, nome) => {
      if (race && weapon) this.newGame(race, weapon, nome);
      else this.loadGame();
    }, hasSave());
  }

  // ------------------------------------------------------------
  // início de jogo
  // ------------------------------------------------------------
  newGame(race: typeof RACES[number], weapon: typeof WEAPONS[number], nome: string) {
    this.player = new Player(race, weapon, nome);
    this.scene.add(this.player.parts.group);
    const vx = POI.village.x, vz = POI.village.z + 6;
    this.player.pos.set(vx, this.world.heightAt(vx, vz), vz);
    this.player.visY = this.player.pos.y;
    this.camInit = false;

    this.mount = new Mount(this.world);
    this.scene.add(this.mount.group);

    this.boat = new Boat(this.world.boatGroup);

    this.spawnNPCs();
    this.spawnCamps();
    this.spawnRonceiroGuards();

    this.state = 'play';
    this.audio.startAmbient();
    this.ui.regionTitle('SAVANA KURNIS');
    this.ui.toast('Fale com o Mestre-Guia Brais (banca com mapa, na praça)');
    this.ui.quest('NOTA DE CARGA #1', 'Fale com o Mestre-Guia Brais em Porto-Canza.');
    this.ui.showLockHint(true);
    setTimeout(() => this.ui.showLockHint(this.state === 'play' && !this.input.locked), 2500);
  }

  private spawnNPCs() {
    const vx = POI.village.x, vz = POI.village.z;
    this.npcs.push(new NPC(vx + 6, vz + 2.6, this.world, this.scene, 'Mestre-Guia Brais', 0x3a5a8a));
    this.npcs.push(new NPC(vx - 13, vz + 8, this.world, this.scene, 'Pastora Enó', 0x3a7a4a));
    this.npcs.push(new NPC(vx + 13, vz - 1.5, this.world, this.scene, 'Ferrea, a Forjeira', 0x8a4a3a));
  }

  private spawnCamps() {
    for (const s of this.world.campSpawns) {
      if (this.clearedCamps.has(s.camp)) continue;
      this.enemies.push(new Enemy(s.def, s.x, s.z, this.world, this.scene, s.def === 'cacador' ? 'Caçador' : 'Farejador'));
    }
  }

  private spawnRonceiroGuards() {
    const r = POI.ronceiro;
    if (this.q2Stage >= 2) return;
    for (const [dx, dz] of [[-3, -2], [3, 2]]) {
      const g = new Enemy('farejador', r.x + dx, r.z + dz, this.world, this.scene, 'Farejador');
      g.home.set(r.x, 0, r.z);
      this.enemies.push(g);
      this.ronceiroGuards.push(g);
    }
  }

  spawnAmbush() {
    const w = POI.wreck;
    for (const [dx, dz] of [[-4, 2], [4, -2]]) {
      const e = new Enemy('farejador', w.x + dx, w.z + dz, this.world, this.scene, 'Farejador');
      e.home.set(w.x, 0, w.z);
      this.enemies.push(e);
    }
    this.ui.toast('A Corja emboscou o comboio!');
  }

  // ------------------------------------------------------------
  // loop
  // ------------------------------------------------------------
  private clock = new THREE.Clock();
  private animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());

    // ---------- cutscene ----------
    if (this.state === 'cutscene' && this.cutscene) {
      this.cutscene.update(dt);
      if (this.input.pressed('Escape') || this.input.pressed('Space') || this.input.pressed('Enter')) {
        this.cutscene.skip();
      }
      this.renderer.render(this.cutscene.scene, this.cutscene.camera);
      this.input.endFrame();
      return;
    }

    if ((this.state === 'play' || this.state === 'dead') && this.player) {
      this.time += dt;
      this.world.time = this.time;
      this.world.update(dt);
      if (this.mount) this.mount.update(dt, this.input, this.world, this);
      if (this.player) {
        this.player.update(dt, this.input, this.world, this);
      }
      for (const e of this.enemies) e.update(dt, this.world, this, this.enemies);
      for (const n of this.npcs) n.update(dt, this);
      this.boat.update(dt, this.input, this.world, this);
      if (this.player.onBoat) {
        this.player.pos.set(this.boat.pos.x, this.boat.pos.y + 0.55, this.boat.pos.z);
        this.player.syncMesh();
      }
      for (const p of this.projs) p.update(dt, this.world, this);
      this.projs = this.projs.filter(p => !p.dead);
      this.updateEchoes();
      this.furiaCd = Math.max(0, this.furiaCd - dt);
      // descoberta de POIs
      for (const poi of this.world.pois) {
        const key = `${poi.x},${poi.z}`;
        if (!this.discovered.has(key) && dist2d(this.player.pos.x, this.player.pos.z, poi.x, poi.z) < 20) {
          this.discovered.add(key);
          this.player.gainLeguas(15, this);
          this.ui.feed(`VOCÊ DESCOBRIU: ${poi.label || 'LOCAL'} (+15 léguas)`, '#ffd76a');
          this.audio.sfx('quest');
        }
      }
      // ervas/rochas: visibilidade
      for (const it of this.world.interactables) {
        const mesh = this.world.meshById[it.id];
        if (mesh && (it.tipo === 'erva' || it.tipo === 'rocha' || it.tipo === 'carga' || it.tipo === 'bau')) {
          mesh.visible = it.tipo === 'bau' ? true : it.ativo;
          if (it.tipo === 'bau' && it.dados.opened) mesh.visible = false;
        }
      }
      this.updateCamera(dt, this.input);
      this.handleGlobalKeys();
      this.updatePrompt();
      this.ui.updateHUD(this);
    }
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  };

  private updateCamera(dt: number, input: Input) {
    void dt;
    const sens = 0.0026;
    this.camYaw -= input.mdx * sens;
    this.camPitch = clamp(this.camPitch + input.mdy * sens * 0.85, -0.35, 1.15);
    if (input.wheel) this.camDist = clamp(this.camDist + input.wheel * 0.8, 5, 14);

    let target: THREE.Vector3;
    if (this.player.mounted) {
      target = this.mount.pos.clone().add(new THREE.Vector3(0, 2.7, 0));
    } else if (this.player.onBoat) {
      target = this.player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
    } else {
      target = this.player.pos.clone().add(new THREE.Vector3(0, 1.95, 0));
    }
    const dist = this.camDist + (this.player.mounted ? 2.2 : 0);
    const fx = Math.sin(this.camYaw) * Math.cos(this.camPitch);
    const fz = Math.cos(this.camYaw) * Math.cos(this.camPitch);
    const fy = Math.sin(this.camPitch);
    const desired = new THREE.Vector3(target.x - fx * dist, target.y + fy * dist, target.z - fz * dist);
    const gh = this.world.heightAt(desired.x, desired.z) + 0.6;
    if (desired.y < gh) desired.y = gh;

    // suavização estilo Cube World: segue colado, sem "teleporte"
    if (!this.camInit) {
      this.camPos.copy(desired);
      this.camLook.copy(target);
      this.camInit = true;
    }
    const kPos = 1 - Math.pow(1e-7, dt);
    const kLook = 1 - Math.pow(1e-9, dt);
    this.camPos.lerp(desired, kPos);
    this.camLook.lerp(target, kLook);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  private handleGlobalKeys() {
    const inp = this.input;
    if (inp.pressed('KeyH')) { this.ui.showHelp(); this.input.exitLock(); }
    if (inp.pressed('Tab')) {
      if (this.uiOpen()) this.ui.closePanel();
      else { this.ui.showAlforje(this); this.input.exitLock(); }
    }
    if (inp.pressed('F5')) this.save(true);
    if (inp.pressed('F9')) this.loadGame();
    if (inp.pressed('KeyE')) this.tryInteract();
  }

  resume() {
    this.state = 'play';
    this.ui.closePanel();
    this.ui.closeDialog();
    this.input.requestLock();
  }

  uiOpen(): boolean {
    return this.ui.panelWrap.style.display === 'flex' || this.ui.dialogEl.style.display === 'block';
  }

  // ------------------------------------------------------------
  // combate
  // ------------------------------------------------------------
  playerAttack(weapon: typeof WEAPONS[number], dmg: number, heavy: boolean) {
    const dir = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    this.audio.sfx('swing');
    if (weapon.melee) {
      const reach = weapon.alcance + (this.player.mounted ? 0.6 : 0);
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = e.pos.x - this.player.pos.x, dz = e.pos.z - this.player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > reach + 0.8) continue;
        const ang = Math.atan2(dx, dz);
        let diff = Math.abs(ang - this.camYaw) % (Math.PI * 2);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < weapon.arco / 2) {
          const m = this.dmgMultFor(e.def.lvl);
          e.damage(dmg, this, m.tier >= 2 ? '#b8b8c8' : m.tier === 1 ? '#ffd76a' : '#ffffff');
        }
      }
    } else if (weapon.proj) {
      const origin = this.player.pos.clone().add(new THREE.Vector3(0, 1.5, 0)).addScaledVector(dir, 0.6);
      const proj = new Proj(weapon.proj, origin, dir, weapon, dmg, this.scene);
      this.projs.push(proj);
      if (weapon.proj === 'nota') this.audio.sfx('note');
    }
    void heavy;
  }

  onBoomerCatch() {
    this.player.cooldown = 0.12;
    this.audio.sfx('pickup');
  }

  dmgMultFor(lvl: number) {
    return dmgMult(this.player.ne(), lvl);
  }

  playerDmgPreview(heavy: boolean): number {
    return Math.round(this.player.weaponDamage(heavy));
  }

  armaNome(): string {
    return `${this.player.arma.nome}`;
  }

  onEnemyDead(e: Enemy) {
    const xp = 6 + e.def.lvl * 2;
    const cob = 3 + e.def.lvl;
    this.player.gainLeguas(xp, this);
    this.player.cobres += cob;
    this.ui.feed(`VOCÊ RECEBE ${cob} ◉ CORBES · +${xp} LÉGUAS`, '#ffe9a0');
    this.audio.sfx('coin');
    // guardas do ronceiro
    this.ronceiroGuards = this.ronceiroGuards.filter(g => g !== e);
    if (this.ronceiroGuards.length === 0 && this.q2Stage === 1) {
      this.q2Stage = 2;
      this.ui.toast('A fera está livre da Corja! Aproxime-se com 3 Ervas-de-Kurnis.');
      this.updateQuestTracker();
    }
    // camps
    for (const camp of ['toca', 'acamp']) {
      if (this.clearedCamps.has(camp)) continue;
      const remaining = this.enemies.some(x => !x.dead && this.world.campSpawns.some(s => s.camp === camp && Math.hypot(s.x - x.home.x, s.z - x.home.z) < 1));
      if (!remaining) {
        // garante que todos do camp morreram de fato
        const spawns = this.world.campSpawns.filter(s => s.camp === camp);
        const allDead = spawns.every(s => this.enemies.some(x => x.dead && Math.hypot(s.x - x.home.x, s.z - x.home.z) < 1));
        if (allDead) {
          this.clearedCamps.add(camp);
          this.ui.toast(`${camp === 'toca' ? 'TOCA DO FAREJADOR' : 'ACAMPAMENTO DA MATILHA'} LIMPO! O baú aguarda.`);
          this.audio.sfx('quest');
          this.updateQuestTracker();
          this.save(false);
        }
      }
    }
  }

  mountTakeDamage(dmg: number) {
    const m = this.mount;
    if (!m || m.state !== 'domado') return;
    m.hp -= dmg;
    this.ui.dmgNumber(m.pos, `-${dmg}`, '#ffb46a');
    if (m.hp <= 0) {
      m.hp = m.maxHp;
      if (this.player.mounted) { this.player.mounted = null; }
      m.pos.set(POI.village.x - 13, this.world.heightAt(POI.village.x - 13, POI.village.z + 6), POI.village.z + 6);
      m.syncMesh();
      this.ui.toast(`${m.nome} fugiu ferido para o Estábulo!`);
    }
  }

  mountFuria() {
    if (this.furiaCd > 0 || !this.player.mounted) return;
    this.furiaCd = 8;
    const dir = new THREE.Vector3(Math.sin(this.mount.yaw), 0, Math.cos(this.mount.yaw));
    this.mount.pos.addScaledVector(dir, 9);
    this.audio.sfx('gallop');
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - this.mount.pos.x, e.pos.z - this.mount.pos.z);
      if (d < 4) {
        const dx = e.pos.x - this.mount.pos.x, dz = e.pos.z - this.mount.pos.z;
        const dd = Math.hypot(dx, dz) || 1;
        e.pos.x += (dx / dd) * 3; e.pos.z += (dz / dd) * 3;
        e.damage(15, this, '#ffd76a');
        e.pacify(1.2);
      }
    }
    this.ui.toast('FÚRIA DO RONCEIRO!');
  }

  mountGallopTick() {
    if (!this.mount) return;
    const msg = this.mount.addBondXp(1);
    if (msg) { this.ui.toast(msg); this.audio.sfx('tame'); }
  }

  feedMount() {
    if (this.player.erva > 0 && this.player.mounted) {
      this.player.erva--;
      const msg = this.mount.feed();
      this.audio.sfx('eat');
      this.ui.feed('VOCÊ ALIMENTA A MONTARIA (+25 vida)', '#bfe8ff');
      if (msg) { this.ui.toast(msg); this.audio.sfx('tame'); }
    }
  }

  // ------------------------------------------------------------
  // interação
  // ------------------------------------------------------------
  private nearestInteract(): Interact | null {
    let best: Interact | null = null;
    let bd = 1e9;
    for (const it of this.world.interactables) {
      if (!it.ativo) continue;
      const d = dist2d(this.player.pos.x, this.player.pos.z, it.x, it.z);
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    return best;
  }

  private updatePrompt() {
    if (this.uiOpen() || this.state !== 'play') { this.ui.prompt(null); return; }
    const p = this.player;
    if (p.onBoat) {
      this.ui.prompt('<b>E</b> — Desembarcar na Jangada');
      return;
    }
    if (p.mounted) {
      this.ui.prompt(`<b>E</b> Desmontar · <b>Q</b> Fúria ${this.mount.bond >= 4 ? '' : '(v4)'} · <b>F</b> Alimentar (🌿${p.erva})`);
      return;
    }
    // montar o ronceiro
    if (this.mount && this.mount.state === 'domado' && dist2d(p.pos.x, p.pos.z, this.mount.pos.x, this.mount.pos.z) < 3) {
      this.ui.prompt('<b>E</b> — Montar ' + this.mount.nome);
      return;
    }
    const it = this.nearestInteract();
    if (!it) { this.ui.prompt(null); return; }
    switch (it.tipo) {
      case 'forja': this.ui.prompt('<b>E</b> — Forja de Porto-Canza'); break;
      case 'estabulo': this.ui.prompt('<b>E</b> — Estábulo da Pastora Enó'); break;
      case 'fogueira': this.ui.prompt('<b>E</b> — Descansar na Fogueira (SALVAR)'); break;
      case 'npc': this.ui.prompt('<b>E</b> — Falar com Mestre-Guia Brais'); break;
      case 'bau': {
        const cleared = this.clearedCamps.has(it.dados.camp);
        this.ui.prompt(cleared ? '<b>E</b> — Abrir Baú de Carga Selada' : '🔒 Baú selado — limpe o acampamento primeiro');
        break;
      }
      case 'erva': this.ui.prompt('<b>E</b> — Colher Erva-de-Kurnis'); break;
      case 'carga': this.ui.prompt(this.q1Stage === 1 ? '<b>E</b> — Recolher Carga Selada' : 'Carga do comboio atacado…'); break;
      case 'rocha': this.ui.prompt(it.dados.uses > 0 ? `<b>E</b> — Minerar Ferro-Canza (${it.dados.uses})` : null); break;
      case 'ronceiro': {
        if (this.q2Stage < 1) this.ui.prompt('Um Ronceiro ferido, cercado pela Corja…');
        else if (this.ronceiroGuards.length > 0) this.ui.prompt('⚠️ A Corja cerca a fera. Elimine os guardas!');
        else if (this.q2Stage === 2) this.ui.prompt(`<b>E</b> — Oferecer Erva-de-Kurnis (${this.fed}/3 · 🌿${p.erva})`);
        else this.ui.prompt(null);
        break;
      }
      case 'jangada': this.ui.prompt('<b>E</b> — Embarcar na Jangada'); break;
    }
  }

  private tryInteract() {
    if (this.uiOpen()) return;
    const p = this.player;
    // desembarcar da jangada
    if (p.onBoat) {
      p.onBoat = false;
      this.boat.occupied = false;
      p.pos.copy(this.boat.pos).add(new THREE.Vector3(0, 0.4, 0));
      this.audio.sfx('splash');
      return;
    }
    // desmontar
    if (p.mounted) {
      p.mounted = null;
      p.pos.copy(this.mount.pos);
      return;
    }
    // montar
    if (this.mount && this.mount.state === 'domado' && dist2d(p.pos.x, p.pos.z, this.mount.pos.x, this.mount.pos.z) < 3) {
      p.mounted = this.mount;
      this.audio.sfx('gallop');
      return;
    }
    const it = this.nearestInteract();
    if (!it) return;
    switch (it.tipo) {
      case 'forja': this.input.exitLock(); this.ui.showForge(this); break;
      case 'estabulo': this.input.exitLock(); this.ui.showStable(this); break;
      case 'fogueira': this.fogueiraRest(); break;
      case 'npc': this.input.exitLock(); this.braisDialog(); break;
      case 'bau': this.openChest(it); break;
      case 'erva': this.collectErva(it, false); break;
      case 'carga': this.pickCarga(it); break;
      case 'rocha': this.mineRock(it); break;
      case 'ronceiro': this.ronceiroInteract(it); break;
      case 'jangada': this.boardBoat(); break;
    }
  }

  fogueiraRest() {
    this.player.heal(9999);
    if (this.mount && this.mount.state === 'domado') this.mount.hp = this.mount.maxHp;
    this.save(true);
    this.ui.toast('Você descansa. O fogo guarda sua história. (SALVO)');
    this.audio.sfx('quest');
  }

  collectErva(it: Interact, viaChicote: boolean) {
    this.player.erva++;
    it.ativo = false;
    it.cooldownUntil = this.time + 45;
    this.audio.sfx('pickup');
    this.ui.feed('VOCÊ RECEBE 1 X ERVA-DE-KURNIS', '#bfe8ff');
    if (viaChicote) { const m = this.world.meshById[it.id]; if (m) m.visible = false; }
  }

  mineRock(it: Interact) {
    if (it.dados.uses <= 0) return;
    const n = 1 + (this.rng() > 0.6 ? 1 : 0);
    this.player.ferro += n;
    it.dados.uses--;
    this.audio.sfx('hit');
    this.ui.feed(`VOCÊ RECEBE ${n} X FERRO-CANZA`, '#e8c8a0');
    if (it.dados.uses <= 0) { it.ativo = false; it.cooldownUntil = this.time + 60; }
  }

  pickCarga(it: Interact) {
    if (this.q1Stage !== 1) {
      if (this.q1Stage === 0) this.ui.toast('Aceite o contrato com o Mestre-Guia Brais primeiro.');
      return;
    }
    this.player.cargas++;
    this.pickedCargas.add(it.dados.idx);
    it.ativo = false;
    const m = this.world.meshById[it.id]; if (m) m.visible = false;
    this.audio.sfx('pickup');
    this.ui.feed('VOCÊ RECEBE 1 X CARGA SELADA', '#bfe8ff');
    if (this.player.cargas === 1 && this.pickedCargas.size === 1) this.spawnAmbush();
    if (this.player.cargas >= 3) {
      this.q1Stage = 2;
      this.ui.toast('Toda a carga recuperada! Volte ao Mestre-Guia Brais.');
      this.updateQuestTracker();
    }
  }

  ronceiroInteract(_it: Interact) {
    const m = this.mount;
    if (this.q2Stage < 1) { this.ui.toast('Ele olha pra você… mas a Corja observa. (Fale com Brais)'); return; }
    if (this.ronceiroGuards.length > 0) { this.ui.toast('Elimine os guardas da Corja primeiro!'); return; }
    if (this.q2Stage === 2) {
      if (this.player.erva <= 0) { this.ui.toast('Você precisa de Erva-de-Kurnis (coleha os arbustos verde-claros).'); return; }
      this.player.erva--;
      this.fed++;
      m.feed();
      this.audio.sfx('eat');
      this.ui.feed(`O RONCEIRO COME DA SUA MÃO (${this.fed}/3)`, '#bfe8ff');
      if (this.fed >= 3) {
        m.tame();
        this.q2Stage = 3;
        this.player.gainLeguas(30, this);
        this.ui.toast(`RONCEIRO DOMADO! ${m.nome} agora é seu. Monte com E.`);
        this.ui.regionTitle('PRIMEIRA MONTARIA');
        this.audio.sfx('tame');
        this.updateQuestTracker();
        this.save(false);
      }
    }
  }

  braisDialog() {
    const p = this.player;
    const bonus = 1 + (p.race.cobreBonus || 0);
    if (this.q1Stage === 0) {
      this.ui.dialog('MESTRE-GUIA BRAIS', 'Você chegou na hora errada, recruta. Um comboio nosso foi massacrado a leste, na estrada da savana. A carga está espalhada no destroço — e a Corja farejando por cima. A regra número um: <b>quem volta, volta trazendo.</b> Traga nossa carga de volta.',
        [{ label: 'Aceito a Nota de Carga. (iniciar)', cb: () => { this.q1Stage = 1; this.updateQuestTracker(); this.audio.sfx('quest'); } },
         { label: 'Preciso me preparar antes.', cb: () => {} }]);
    } else if (this.q1Stage === 1) {
      this.ui.dialog('MESTRE-GUIA BRAIS', `A carga está no destroço do comboio, a leste. Siga a trilha de terra. ${p.cargas}/3 recuperadas.`,
        [{ label: 'Estou indo.', cb: () => {} }]);
    } else if (this.q1Stage === 2) {
      const cobres = Math.round(60 * bonus);
      this.ui.dialog('MESTRE-GUIA BRAIS', 'Pelo Bravo… você voltou. E voltou TRAZENDO. Porto-Canza come essa noite — e come por sua causa. Tome seu pagamento. E recruta… tem um Ronceiro ferido cercado pela Corja perto da Toca. Se você o salvar, ele salvará você.',
        [{
          label: `Entregar carga (+${cobres}◉, +40 léguas)`, cb: () => {
            this.player.cargas = 0;
            this.player.cobres += cobres;
            this.player.ferro += 2;
            this.player.gainLeguas(40, this);
            this.q1Stage = 3;
            this.q2Stage = 1;
            this.audio.sfx('quest');
            this.ui.feed(`ENTREGA COMPLETA · +${cobres} COBRES · +2 FERRO-CANZA`, '#ffe9a0');
            this.updateQuestTracker();
            this.save(false);
          }
        }]);
    } else if (this.q2Stage === 3) {
      this.ui.dialog('MESTRE-GUIA BRAIS', 'Um Leonis e sua montaria… Agora sim você é um de nós de verdade. Próximo passo: o Acampamento da Matilha, ao sul. Cuidado — lá tem Caçadores, nível 4. Suba sua forja antes. E ouça: o baú de lá guarda um arreio de verdade.',
        [{ label: 'Vou preparar o cavalo. (fechar)', cb: () => {} }]);
    } else {
      this.ui.dialog('MESTRE-GUIA BRAIS', 'A Toca do Farejador fica ao nordeste, nível 2 — bom pra treinar. A Matilha, ao sul, é nível 4: só volte lá com a forja acesa. Minere Ferro-Canza nas rochas de veios alaranjados.',
        [{ label: 'Entendido. (fechar)', cb: () => {} }]);
    }
  }

  openChest(it: Interact) {
    const camp: string = it.dados.camp;
    if (!this.clearedCamps.has(camp)) {
      this.ui.toast('🔒 O baú só abre com o acampamento limpo.');
      return;
    }
    if (it.dados.opened) return;
    it.dados.opened = true;
    it.ativo = false;
    const lvl = camp === 'toca' ? 2 : 4;
    const loot = rollLoot(lvl, camp, this.rng);
    this.audio.sfx('open');
    for (const g of loot) this.equipOrConvert(g);
    const cob = 8 + lvl * 3;
    this.player.cobres += cob;
    this.player.erva += 2;
    this.ui.feed(`VOCÊ RECEBE ${cob} ◉ COBRES · 2 X ERVA-DE-KURNIS`, '#ffe9a0');
    this.ui.toast('CARGA DA CORJA RECUPERADA! Equipamos o que é bom, o resto virou Cobres.');
    this.save(false);
  }

  equipOrConvert(g: { slot: 'arma' | 'peitoral' | 'arreio'; nivel: number; prefixo: string; mult: number }) {
    const p = this.player;
    const cur = g.slot === 'arma' ? p.equip.armaNivel : g.slot === 'peitoral' ? p.equip.peitoralNivel : p.equip.arreioNivel;
    const nome = gearNomeSys(g.slot, g.nivel, g.prefixo);
    if (g.nivel > cur) {
      if (g.slot === 'arma') { p.equip.armaNivel = g.nivel; p.equip.multArma = g.mult; }
      else if (g.slot === 'peitoral') { p.equip.peitoralNivel = g.nivel; p.equip.multPeitoral = g.mult; }
      else p.equip.arreioNivel = g.nivel;
      this.ui.feed(`VOCÊ EQUIPA: ${nome.toUpperCase()}`, '#8fe08f');
      this.audio.sfx('level');
    } else {
      const cob = g.nivel * 4;
      p.cobres += cob;
      this.ui.feed(`VOCÊ RECEBE ${cob} ◉ (${nome} — repetido)`, '#ffe9a0');
    }
  }

  forgeUpgrade(slot: 'arma' | 'peitoral') {
    const p = this.player;
    const disc = p.race.troncudo ? 0.9 : 1;
    const cost = upgradeCost(slot, slot === 'arma' ? p.equip.armaNivel : p.equip.peitoralNivel);
    const cobres = Math.round(cost.cobres * disc);
    if (p.cobres < cobres || p.ferro < cost.ferro) {
      this.ui.toast(`Faltam materiais: precisa ${cobres}◉ + ${cost.ferro}⛓. (Nv.${slot === 'arma' ? p.equip.armaNivel : p.equip.peitoralNivel})`);
      this.audio.sfx('ui');
      return;
    }
    p.cobres -= cobres; p.ferro -= cost.ferro;
    if (slot === 'arma') p.equip.armaNivel++;
    else p.equip.peitoralNivel++;
    this.audio.sfx('level');
    this.ui.toast(`${slot === 'arma' ? 'LÂMINA' : 'COURAÇA'} FORJADA PARA NV.${slot === 'arma' ? p.equip.armaNivel : p.equip.peitoralNivel}!`);
    this.save(false);
    this.ui.showForge(this);
  }

  stableHeal() {
    if (this.player.cobres < 5) { this.ui.toast('Sem Cobres suficientes (5◉).'); return; }
    this.player.cobres -= 5;
    this.mount.hp = this.mount.maxHp;
    this.audio.sfx('eat');
    this.ui.toast(`${this.mount.nome} curado e alimentado!`);
    this.ui.showStable(this);
  }

  stableRename(nome: string) {
    this.mount.nome = nome;
    this.ui.toast(`A montaria agora atende por ${nome}.`);
    this.ui.showStable(this);
  }

  boardBoat() {
    if (this.player.mounted) return;
    this.player.onBoat = true;
    this.boat.occupied = true;
    this.audio.sfx('splash');
    this.ui.toast('Segure WASD para remar. E para desembarcar.');
  }

  // ------------------------------------------------------------
  // ecos (léguas perdidas na morte)
  // ------------------------------------------------------------
  private updateEchoes() {
    for (const ec of this.echoes) {
      const d = dist2d(this.player.pos.x, this.player.pos.z, ec.mesh.position.x, ec.mesh.position.z);
      ec.mesh.rotation.y += 0.03;
      if (d < 2.2) {
        this.player.gainLeguas(ec.leguas, this);
        this.ui.feed(`ECOS RECUPERADOS: +${ec.leguas} LÉGUAS`, '#aee6ff');
        this.audio.sfx('pickup');
        this.scene.remove(ec.mesh);
        ec.leguas = 0;
      }
    }
    this.echoes = this.echoes.filter(e => e.leguas > 0);
  }

  onPlayerDeath() {
    this.state = 'dead';
    const lost = Math.floor(this.player.leguas * 0.3);
    this.player.leguas -= lost;
    if (lost > 0) {
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0x6ad8ff }));
      mesh.position.copy(this.player.pos).add(new THREE.Vector3(0, 1, 0));
      this.scene.add(mesh);
      this.echoes.push({ mesh, leguas: lost });
    }
    if (this.player.mounted) { this.player.mounted = null; }
    (this.ui as any).deathEl.style.display = 'flex';
    this.input.exitLock();
  }

  respawn() {
    const p = this.player;
    p.dead = false;
    p.hp = p.maxHp;
    p.sta = p.maxSta;
    const vx = POI.village.x, vz = POI.village.z + 3;
    p.pos.set(vx, this.world.heightAt(vx, vz), vz);
    if (this.mount && this.mount.state === 'domado') {
      this.mount.pos.set(vx - 13, this.world.heightAt(vx - 13, POI.village.z + 6), POI.village.z + 6);
      this.mount.hp = this.mount.maxHp;
      this.mount.syncMesh();
    }
    this.state = 'play';
    this.input.requestLock();
    this.ui.toast('O fogo da Fogueira te devolve ao Bravo.');
  }

  // ------------------------------------------------------------
  // quests tracker
  // ------------------------------------------------------------
  updateQuestTracker() {
    if (this.q1Stage === 0) this.ui.quest('NOTA DE CARGA #1', 'Fale com o Mestre-Guia Brais em Porto-Canza.');
    else if (this.q1Stage === 1) this.ui.quest('O COMBOIO ATACADO', `Recupere a carga no destroço, a leste da vila. (${this.player.cargas}/3)`);
    else if (this.q1Stage === 2) this.ui.quest('O COMBOIO ATACADO', 'Volte e entregue a carga ao Mestre-Guia Brais.');
    else if (this.q2Stage === 1) this.ui.quest('O RONCEIRO FERIDO', 'Um Ronceiro ferido está cercado pela Corja, a nordeste, perto da Toca. Elimine os guardas.');
    else if (this.q2Stage === 2) this.ui.quest('O RONCEIRO FERIDO', `Alimente o Ronceiro com 3 Ervas-de-Kurnis. (${this.fed}/3)`);
    else if (this.q2Stage === 3) this.ui.quest('MISSÃO CUMPRIDA (M1)', 'Monte seu Ronceiro, limpe os acampamentos, forge, explore. Quem volta, volta trazendo.');
    else this.ui.quest('EXPLORE O BRAVO', 'Acampamentos: Toca (Nv.2, NE) e Matilha (Nv.4, S). Minere ferro. Erga sua forja.');
  }

  // ------------------------------------------------------------
  // save / load
  // ------------------------------------------------------------
  save(manual: boolean) {
    if (!this.player) return;
    const p = this.player;
    const data = {
      v: 1,
      nome: p.nome, raceId: p.race.id, weaponId: p.arma.id,
      pos: [p.pos.x, p.pos.y, p.pos.z], yaw: p.yaw,
      hp: p.hp, sta: p.sta, leguas: p.leguas, nivel: p.nivel,
      cobres: p.cobres, ferro: p.ferro, erva: p.erva, cargas: p.cargas,
      equip: p.equip,
      q1: this.q1Stage, q2: this.q2Stage, fed: this.fed,
      cleared: [...this.clearedCamps],
      picked: [...this.pickedCargas],
      discovered: [...this.discovered],
      mount: this.mount ? {
        state: this.mount.state, bond: this.mount.bond, bondXp: this.mount.bondXp,
        hp: this.mount.hp, nome: this.mount.nome, pos: [this.mount.pos.x, this.mount.pos.z]
      } : null
    };
    if (saveGame(data)) { if (manual) this.ui.toast('JORNADA SALVA.'); }
    else this.ui.toast('ERRO AO SALVAR.');
  }

  loadGame() {
    const d = loadGame();
    if (!d) { this.ui.toast('Nenhum save encontrado.'); return; }
    // limpa estado dinâmico
    for (const e of this.enemies) this.scene.remove(e.group);
    this.enemies = []; this.ronceiroGuards = [];
    for (const pr of this.projs) pr.dead = true;
    for (const ec of this.echoes) this.scene.remove(ec.mesh);
    this.echoes = [];
    if (this.player) this.scene.remove(this.player.parts.group);
    if (this.mount) this.scene.remove(this.mount.group);

    const race = RACES.find(r => r.id === d.raceId) || RACES[0];
    const weapon = WEAPONS.find(w => w.id === d.weaponId) || WEAPONS[0];
    this.player = new Player(race, weapon, d.nome);
    this.scene.add(this.player.parts.group);
    this.player.pos.set(d.pos[0], d.pos[1], d.pos[2]);
    this.player.visY = this.player.pos.y;
    this.camInit = false;
    Object.assign(this.player.equip, d.equip);
    this.player.hp = d.hp; this.player.sta = d.sta;
    this.player.leguas = d.leguas; this.player.nivel = d.nivel;
    this.player.cobres = d.cobres; this.player.ferro = d.ferro;
    this.player.erva = d.erva; this.player.cargas = d.cargas;
    this.q1Stage = d.q1; this.q2Stage = d.q2; this.fed = d.fed;
    this.clearedCamps = new Set(d.cleared);
    this.pickedCargas = new Set(d.picked);
    this.discovered = new Set(d.discovered);

    this.mount = new Mount(this.world);
    this.scene.add(this.mount.group);
    if (d.mount) {
      if (d.mount.state === 'domado') this.mount.tame();
      this.mount.bond = d.mount.bond; this.mount.bondXp = d.mount.bondXp;
      this.mount.hp = d.mount.hp; this.mount.nome = d.mount.nome;
      this.mount.pos.set(d.mount.pos[0], this.world.heightAt(d.mount.pos[0], d.mount.pos[1]), d.mount.pos[1]);
      this.mount.syncMesh();
    }
    this.boat = new Boat(this.world.boatGroup);
    this.spawnNPCs();
    this.spawnCamps();
    this.spawnRonceiroGuards();

    // aplica flags no mundo
    for (const idx of this.pickedCargas) {
      const it = this.world.interactables.find(i => i.id === `carga-${idx}`);
      if (it) { it.ativo = false; const m = this.world.meshById[it.id]; if (m) m.visible = false; }
    }
    for (const it of this.world.interactables) {
      if (it.tipo === 'bau' && it.dados.opened) { it.ativo = false; }
    }
    this.state = 'play';
    this.ui.closePanel();
    this.input.requestLock();
    this.updateQuestTracker();
    this.ui.toast('Jornada carregada. O Bravo lembra de você.');
  }

  // ------------------------------------------------------------
}

const game = new Game();
game.start();
