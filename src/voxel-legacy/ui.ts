// ============================================================
// LEONIS — ui.ts · Criação de personagem, HUD estilo CW, painéis
// ============================================================

import * as THREE from 'three';
import { RACES, WEAPONS, RaceDef, WeaponDef, CONFIG } from '../data/defs';
import { el } from '../core';

export class UI {
  root: HTMLElement;
  private game: any;
  private hud!: HTMLElement;
  panelWrap!: HTMLElement; panelContent!: HTMLElement;
  dialogEl!: HTMLElement;
  deathEl!: HTMLElement;
  private hpFill!: HTMLElement; stafFill!: HTMLElement;
  private mountWrap!: HTMLElement; mountFill!: HTMLElement; mountLbl!: HTMLElement;
  private lvlRow!: HTMLElement;
  private mmCtx!: CanvasRenderingContext2D;
  private questT!: HTMLElement; questD!: HTMLElement;
  private feedEl!: HTMLElement;
  private promptEl!: HTMLElement;
  private regionTitleEl!: HTMLElement;
  private vignetteEl!: HTMLElement;
  private lockHint!: HTMLElement;
  private creationEl!: HTMLElement;
  private toastsEl!: HTMLElement;
  private selRace: RaceDef | null = null;
  private selWeapon: WeaponDef | null = null;

  constructor(rootId: string, game: any) {
    this.game = game;
    this.root = document.getElementById(rootId)!;
    this.buildHUD();
    this.buildPanels();
    this.buildDialog();
    this.buildDeath();
    this.buildToasts();
  }

  // ================= HUD =================
  private buildHUD() {
    this.hud = el('div');
    this.hud.id = 'hud';
    this.root.appendChild(this.hud);

    // rodapé: barras
    const bottom = el('div'); bottom.id = 'hudbottom';
    bottom.innerHTML = `
      <div class="barwrap"><div class="barfill" id="hpfill"></div></div>
      <div class="barwrap"><div class="barfill" id="stafill"></div></div>
      <div id="mountwrap"><div class="barwrap"><div class="barfill" id="mountfill"></div></div><div id="mountlbl" class="ol" style="color:#ffd76a;font-size:11px;font-weight:bold;text-align:center;"></div></div>
      <div id="lvlrow"><span id="lvltxt"></span><span id="skullwarn" class="ol"></span></div>`;
    this.hud.appendChild(bottom);
    this.hpFill = bottom.querySelector('#hpfill')!;
    this.stafFill = bottom.querySelector('#stafill')!;
    this.mountWrap = bottom.querySelector('#mountwrap')!;
    this.mountFill = bottom.querySelector('#mountfill')!;
    this.mountLbl = bottom.querySelector('#mountlbl')!;
    this.lvlRow = bottom.querySelector('#lvlrow')!;
    const skull = bottom.querySelector('#skullwarn')!; this.lvlRow = this.lvlRow; void skull;

    // minimapa
    const mmwrap = el('div'); mmwrap.id = 'minimapwrap';
    const rn = el('div'); rn.id = 'regionname'; rn.className = 'ol uppercase'; rn.textContent = CONFIG.REGION;
    const mm = document.createElement('canvas');
    mm.id = 'minimap'; mm.width = 168; mm.height = 168;
    mmwrap.appendChild(rn); mmwrap.appendChild(mm);
    this.hud.appendChild(mmwrap);
    this.mmCtx = mm.getContext('2d')!;

    // quest tracker
    const qb = el('div'); qb.id = 'questbox'; qb.style.display = 'none';
    qb.innerHTML = `<div class="qt ol" id="qt"></div><div class="qd ol" id="qd"></div>`;
    this.hud.appendChild(qb);
    this.questT = qb.querySelector('#qt')!;
    this.questD = qb.querySelector('#qd')!;

    // feed de loot
    this.feedEl = el('div'); this.feedEl.id = 'feed';
    this.hud.appendChild(this.feedEl);

    // prompt de interação
    this.promptEl = el('div'); this.promptEl.id = 'prompt'; this.promptEl.className = 'ol';
    this.hud.appendChild(this.promptEl);

    // título de região
    this.regionTitleEl = el('div'); this.regionTitleEl.id = 'regiontitle'; this.regionTitleEl.className = 'ol uppercase';
    this.hud.appendChild(this.regionTitleEl);

    // vignette + lock hint
    this.vignetteEl = el('div'); this.vignetteEl.id = 'vignette';
    this.hud.appendChild(this.vignetteEl);
    this.lockHint = el('div'); this.lockHint.id = 'lockhint';
    this.lockHint.innerHTML = `<div class="ol">CLIQUE PARA ASSUMIR O CONTROLE</div>`;
    this.hud.appendChild(this.lockHint);
  }

  updateHUD(g: any) {
    this.hpFill.style.width = `${Math.max(0, (g.player.hp / g.player.maxHp) * 100)}%`;
    this.stafFill.style.width = `${Math.max(0, (g.player.sta / g.player.maxSta) * 100)}%`;
    const m = g.mount;
    if (m && m.state === 'domado' && (g.player.mounted || m.hp < m.maxHp)) {
      this.mountWrap.style.display = 'block';
      this.mountFill.style.width = `${(m.hp / m.maxHp) * 100}%`;
      this.mountLbl.textContent = `${m.nome} · vínculo ${'♥'.repeat(m.bond)}`;
    } else this.mountWrap.style.display = 'none';
    const ne = g.player.ne().toFixed(1);
    this.lvlRow.innerHTML = `<span class="ol">LEONIS NV.${g.player.nivel} · FORJA NV.${ne} · <span class="gold ol">◉${g.player.cobres}</span> ⛓${g.player.ferro} 🌿${g.player.erva}${g.player.cargas ? ` · 📦${g.player.cargas}` : ''}</span><span class="ol" id="skullwarn"></span>`;
    this.drawMinimap(g);
  }

  quest(title: string | null, desc: string) {
    const qb = document.getElementById('questbox')!;
    if (!title) { qb.style.display = 'none'; return; }
    qb.style.display = 'block';
    this.questT.textContent = title;
    this.questD.textContent = desc;
  }

  feed(msg: string, color = '#bfe8ff') {
    const d = el('div', 'ol uppercase', msg);
    d.style.color = color;
    this.feedEl.prepend(d);
    while (this.feedEl.children.length > 8) this.feedEl.removeChild(this.feedEl.lastChild!);
    setTimeout(() => { d.style.opacity = '0'; d.style.transition = 'opacity .6s'; setTimeout(() => d.remove(), 700); }, 4200);
  }

  toast(msg: string) {
    const t = el('div', 'toast ol uppercase clickable', msg);
    this.root.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  prompt(txt: string | null) {
    if (!txt) { this.promptEl.style.display = 'none'; return; }
    this.promptEl.style.display = 'block';
    this.promptEl.innerHTML = txt;
  }

  regionTitle(txt: string) {
    this.regionTitleEl.textContent = txt;
    this.regionTitleEl.style.opacity = '1';
    setTimeout(() => { this.regionTitleEl.style.opacity = '0'; }, 2600);
  }

  vignette() {
    this.vignetteEl.style.boxShadow = 'inset 0 0 140px rgba(200,0,0,.55)';
    setTimeout(() => { this.vignetteEl.style.boxShadow = 'inset 0 0 140px rgba(200,0,0,0)'; }, 260);
  }

  dmgNumber(worldPos: THREE.Vector3, txt: string, color: string) {
    const g = this.game;
    const v = worldPos.clone(); v.y += 2.2; v.project(g.camera);
    if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const d = el('div', 'dmgnum ol', txt);
    d.style.color = color;
    d.style.left = `${x - 10}px`; d.style.top = `${y}px`;
    this.hud.appendChild(d);
    requestAnimationFrame(() => {
      d.style.transform = `translateY(-46px)`;
      d.style.opacity = '0';
    });
    setTimeout(() => d.remove(), 900);
  }

  showLockHint(show: boolean) { this.lockHint.style.display = show ? 'flex' : 'none'; }

  private drawMinimap(g: any) {
    const c = this.mmCtx;
    const S = 168;
    const view = 130; // blocos visíveis
    const px = g.player.pos.x, pz = g.player.pos.z;
    const src = g.world.minimap;
    c.clearRect(0, 0, S, S);
    c.save();
    c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); c.clip();
    const sx = (px - view / 2) / g.SIZE * src.width;
    const sz = (pz - view / 2) / g.SIZE * src.height;
    const sw = view / g.SIZE * src.width;
    c.drawImage(src, sx, sz, sw, sw, 0, 0, S, S);
    // POIs
    for (const p of g.world.pois) {
      const dx = (p.x - px) / view * S + S / 2;
      const dz = (p.z - pz) / view * S + S / 2;
      if (dx < -8 || dx > S + 8 || dz < -8 || dz > S + 8) continue;
      c.font = 'bold 13px sans-serif';
      c.textAlign = 'center';
      c.lineWidth = 3; c.strokeStyle = '#000';
      c.strokeText(p.ico, dx, dz + 5);
      c.fillStyle = '#fff';
      c.fillText(p.ico, dx, dz + 5);
    }
    // montaria
    if (g.mount && g.mount.state === 'domado' && !g.player.mounted) {
      const dx = (g.mount.pos.x - px) / view * S + S / 2;
      const dz = (g.mount.pos.z - pz) / view * S + S / 2;
      c.font = 'bold 12px sans-serif'; c.textAlign = 'center';
      c.strokeText('🐎', dx, dz + 5); c.fillText('🐎', dx, dz + 5);
    }
    // seta do jogador
    c.translate(S / 2, S / 2);
    c.rotate(-g.camYaw + Math.PI);
    c.fillStyle = '#fff';
    c.strokeStyle = '#000'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(0, 3); c.lineTo(-5, 6);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  }

  // ================= CRIAÇÃO =================
  buildCreation(cb: (race: RaceDef | null, weapon: WeaponDef | null, nome: string) => void, canContinue: boolean) {
    this.creationEl = el('div'); this.creationEl.id = 'creation'; this.creationEl.classList.add('clickable');
    const inner = el('div', 'inner');
    inner.appendChild(el('h1', 'uppercase', 'LEONIS'));
    inner.appendChild(el('div', 'sub', 'OS QUE VOLTAM — Marco M1 · Fatia Vertical "Kurnis"<br>"Tudo o que a humanidade tem, um Leonis trouxe."'));
    inner.appendChild(el('div', 'sect uppercase', '— Escolha sua raça —'));
    const raceCards = el('div', 'cards');
    for (const r of RACES) {
      const card = el('div', 'rcard');
      card.innerHTML = `<div class="ico">${r.ico}</div><div class="nm ol">${r.nome}</div><div class="bn ol">${r.bonusTxt}</div><div class="ds">${r.desc}</div>`;
      card.onclick = () => {
        this.selRace = r;
        raceCards.querySelectorAll('.rcard').forEach(x => x.classList.remove('sel'));
        card.classList.add('sel');
        this.game.audio.sfx('ui');
      };
      raceCards.appendChild(card);
    }
    inner.appendChild(raceCards);

    for (const fam of ['GUERRA', 'CAMPO', 'ESTRANHA'] as const) {
      inner.appendChild(el('div', 'sect uppercase',
        fam === 'GUERRA' ? '— Arma inicial · Família de Guerra —' :
        fam === 'CAMPO' ? '— Arma inicial · Família de Campo —' :
        '— Arma inicial · Família Estranha (as LOUCAS) —'));
      const cards = el('div', 'cards');
      for (const w of WEAPONS.filter(w => w.fam === fam)) {
        const card = el('div', 'wcard');
        card.innerHTML = `<div><span class="ico">${w.ico}</span> <span class="nm ol">${w.nome}</span></div><div class="ds">${w.desc}</div>`;
        card.onclick = () => {
          this.selWeapon = w;
          cards.parentElement!.querySelectorAll('.wcard').forEach(x => x.classList.remove('sel'));
          card.classList.add('sel');
          this.game.audio.sfx('ui');
        };
        cards.appendChild(card);
      }
      inner.appendChild(cards);
    }

    const nameRow = el('div', 'namerow');
    const inp = document.createElement('input');
    inp.placeholder = 'Seu nome de Leonis…';
    inp.maxLength = 18;
    nameRow.appendChild(inp);
    inner.appendChild(nameRow);

    const btnRow = el('div', 'center');
    btnRow.style.marginTop = '14px';
    const go = el('button', 'btn', 'DESEMBARCAR NO BRAVO');
    go.onclick = () => {
      if (!this.selRace || !this.selWeapon) {
        this.toast('Escolha uma raça e uma arma!');
        return;
      }
      this.creationEl.remove();
      cb(this.selRace, this.selWeapon, inp.value.trim());
    };
    btnRow.appendChild(go);
    if (canContinue) {
      const cont = el('button', 'btn sec', 'CONTINUAR JORNADA (save)');
      cont.style.marginLeft = '10px';
      cont.onclick = () => { this.creationEl.remove(); cb(null, null, ''); };
      btnRow.appendChild(cont);
    }
    inner.appendChild(btnRow);
    inner.appendChild(el('div', 'hint center', 'Dica: o Bravo perdoa ninguém. Comece pelos contratos da vila, colete erva-de-kurnis e NUNCA ataque acampamento acima do seu nível de forja.'));
    this.creationEl.appendChild(inner);
    this.root.appendChild(this.creationEl);
  }

  // ================= PAINÉIS =================
  private buildPanels() {
    this.panelWrap = el('div', 'panelwrap clickable');
    this.panelContent = el('div', 'panel');
    this.panelWrap.appendChild(this.panelContent);
    this.root.appendChild(this.panelWrap);
    this.panelWrap.addEventListener('click', (e) => { if (e.target === this.panelWrap) this.closePanel(); });
  }

  closePanel() { this.panelWrap.style.display = 'none'; }

  private openPanel(html: string) {
    this.panelContent.innerHTML = html;
    this.panelWrap.style.display = 'flex';
  }

  showForge(g: any) {
    const p = g.player;
    const raceDisc = p.race.troncudo ? 0.9 : 1;
    const armaCusto = { cobres: Math.round(15 * p.equip.armaNivel * raceDisc), ferro: p.equip.armaNivel };
    const peitoCusto = { cobres: Math.round(12 * p.equip.peitoralNivel * raceDisc), ferro: p.equip.peitoralNivel };
    this.openPanel(`
      <h2>⚒️ FORJA DE PORTO-CANZA</h2>
      <p>"Aço bom é o que volta inteiro." — a forja da guilda.</p>
      <div class="stat">Sua bolsa: <b class="gold">${p.cobres} Cobres</b> · <b>${p.ferro} Ferro-Canza</b></div>
      <div class="itemrow"><span>🗡️ ${g.armaNome()} <b>Nv.${p.equip.armaNivel}</b></span>
        <button class="btn" id="up-arma" ${p.equip.armaNivel >= 10 ? 'disabled' : ''}>Forjar (${armaCusto.cobres}◉ + ${armaCusto.ferro}⛓)</button></div>
      <div class="itemrow"><span>🛡️ Couraça <b>Nv.${p.equip.peitoralNivel}</b></span>
        <button class="btn" id="up-peito" ${p.equip.peitoralNivel >= 10 ? 'disabled' : ''}>Forjar (${peitoCusto.cobres}◉ + ${peitoCusto.ferro}⛓)</button></div>
      <div class="itemrow"><span>🪢 Arreio</span><span class="stat">Receita de Reduto+ (saqueie o Acampamento da Matilha)</span></div>
      <div class="hint">Nível de Forja = arma×0.6 + couraça×0.2 + arreio×0.2 — é ele que enfrenta o nível dos inimigos.</div>
      <div class="hint">ESC ou clique fora para fechar.</div>`);
    this.panelContent.querySelector('#up-arma')!.addEventListener('click', () => { g.forgeUpgrade('arma'); });
    this.panelContent.querySelector('#up-peito')!.addEventListener('click', () => { g.forgeUpgrade('peitoral'); });
  }

  showStable(g: any) {
    const m = g.mount;
    const info = m && m.state === 'domado'
      ? `<div class="stat">Montaria: <b>${m.nome}</b> 🐎 · Vínculo <b>${m.bond}</b> ${'♥'.repeat(m.bond)}</div>
         <div class="stat">Vida: ${Math.ceil(m.hp)}/${m.maxHp} · Galope: ${m.gallopSpeed().toFixed(1)} blocos/s</div>
         ${m.bond >= 4 ? '' : '<div class="hint">Renomear no vínculo 4. Galope e alimente para fortalecer o vínculo.</div>'}`
      : `<div class="stat">Nenhuma montaria registrada.</div><div class="hint">Dizem que um Ronceiro ferido foi visto perto da Toca do Farejador…</div>`;
    this.openPanel(`
      <h2>🐎 ESTÁBULO DA PASTORA ENÓ</h2>
      <p>"Cuidar da besta é cuidar de quem volta nela."</p>
      ${info}
      <div class="row">
        ${m && m.state === 'domado' ? `<button class="btn" id="heal-m">Curar montaria (5◉)</button>` : ''}
        ${m && m.state === 'domado' && m.bond >= 4 ? `<button class="btn sec" id="rename-m">Renomear</button>` : ''}
      </div>
      <div class="hint">Montarias NUNCA morrem: se feridas, fogem para cá.</div>`);
    const heal = this.panelContent.querySelector('#heal-m');
    if (heal) heal.addEventListener('click', () => g.stableHeal());
    const ren = this.panelContent.querySelector('#rename-m');
    if (ren) ren.addEventListener('click', () => {
      const nome = window.prompt('Novo nome da montaria (vínculo 4+):');
      if (nome && nome.trim()) g.stableRename(nome.trim().slice(0, 14));
    });
  }

  showAlforje(g: any) {
    const p = g.player;
    const m = g.dmgMultFor(999);
    void m;
    this.openPanel(`
      <h2>🎒 ALFORJE</h2>
      <div class="stat">Leonis: <b>${p.nome}</b> · ${p.race.nome} ${p.race.ico}</div>
      <div class="stat">Vida <b>${Math.ceil(p.hp)}/${p.maxHp}</b> · Stamina <b>${Math.ceil(p.sta)}/${p.maxSta}</b> · Nível <b>${p.nivel}</b> (${p.leguas} léguas)</div>
      <div class="stat">Nível de Forja (NE): <b>${p.ne().toFixed(1)}</b> = arma ${p.equip.armaNivel}×0.6 + couraça ${p.equip.peitoralNivel}×0.2 + arreio ${(p.equip.arreioNivel || 1)}×0.2</div>
      <div class="stat">Arma: ${g.armaNome()} · dano ≈ <b>${g.playerDmgPreview(false)}</b> (pesado ${g.playerDmgPreview(true)})</div>
      <hr style="border-color:#3a5a4a;margin:8px 0;">
      <div class="stat">◉ <b>${p.cobres}</b> Cobres · ⛓ <b>${p.ferro}</b> Ferro-Canza · 🌿 <b>${p.erva}</b> Erva-de-Kurnis · 📦 <b>${p.cargas}</b> Carga Selada</div>
      <div class="hint">Tab fecha. Combata com LMB/RMB, esquiva com C, interaja com E.</div>`);
  }

  showHelp() {
    this.openPanel(`
      <h2>❓ CONTROLES</h2>
      <div class="stat"><b>WASD</b> mover · <b>Mouse</b> câmera · <b>Shift</b> correr/galopar</div>
      <div class="stat"><b>Espaço</b> pular · <b>C</b> esquiva (i-frames) · <b>E</b> interagir/montar</div>
      <div class="stat"><b>LMB</b> golpe leve · <b>RMB</b> golpe pesado · <b>Q</b> Fúria da montaria (vínculo 4)</div>
      <div class="stat"><b>F</b> alimentar montaria (erva) · <b>Tab</b> Alforje · <b>H</b> ajuda · <b>F5</b> salvar · <b>F9</b> carregar</div>
      <div class="stat"><b>ESC</b> pausa</div>
      <div class="hint">Regra do Bravo: inimigo acima do seu nível de Forja bate MUITO mais e toma pouco. Veja os números: amarelo = cuidado; apagado = parede.</div>`);
  }

  showPause(g: any) {
    this.openPanel(`
      <h2>⏸ PAUSA</h2>
      <div class="row">
        <button class="btn" id="p-cont">Continuar</button>
        <button class="btn sec" id="p-save">Salvar</button>
        <button class="btn sec" id="p-load">Carregar</button>
        <button class="btn sec" id="p-help">Controles</button>
        <button class="btn sec" id="p-som">Som: ${g.audio.muted ? 'OFF' : 'ON'}</button>
      </div>
      <div class="hint">LEONIS M1 "Kurnis" — quem volta, volta trazendo.</div>`);
    this.panelContent.querySelector('#p-cont')!.addEventListener('click', () => { this.closePanel(); g.resume(); });
    this.panelContent.querySelector('#p-save')!.addEventListener('click', () => { g.save(true); });
    this.panelContent.querySelector('#p-load')!.addEventListener('click', () => { this.closePanel(); g.loadGame(); });
    this.panelContent.querySelector('#p-help')!.addEventListener('click', () => this.showHelp());
    this.panelContent.querySelector('#p-som')!.addEventListener('click', (e) => {
      g.audio.muted = !g.audio.muted;
      (e.target as HTMLElement).textContent = `Som: ${g.audio.muted ? 'OFF' : 'ON'}`;
    });
  }

  // ================= DIÁLOGO =================
  private buildDialog() {
    this.dialogEl = el('div'); this.dialogEl.id = 'dialog'; this.dialogEl.classList.add('clickable');
    this.root.appendChild(this.dialogEl);
  }

  showDialog(name: string, text: string, opts: { label: string; cb?: () => void; dis?: boolean }[]) {
    this.dialogEl.innerHTML = `<div class="dn ol uppercase">${name}</div><div class="dt">${text}</div>`;
    for (const o of opts) {
      const d = el('div', 'opt ol uppercase', `▸ ${o.label}`);
      if (o.dis) d.classList.add('dis');
      else d.onclick = () => { this.closeDialog(); if (o.cb) o.cb(); };
      this.dialogEl.appendChild(d);
    }
    this.dialogEl.style.display = 'block';
  }

  dialog(name: string, text: string, opts: { label: string; cb?: () => void; dis?: boolean }[]) {
    this.showDialog(name, text, opts);
  }

  private buildToasts() {
    this.toastsEl = el('div');
    this.toastsEl.style.cssText = 'position:absolute;top:60px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;';
    this.root.appendChild(this.toastsEl);
  }

  closeDialog() { this.dialogEl.style.display = 'none'; }

  // ================= MORTE =================
  private buildDeath() {
    this.deathEl = el('div'); this.deathEl.id = 'deathscreen'; this.deathEl.classList.add('clickable');
    this.deathEl.innerHTML = `
      <h1 class="uppercase ol">VOCÊ CAIU NO BRAVO</h1>
      <p class="ol">A carga se perdeu onde você tombou. 30% das léguas se apagaram.<br>Mas o Bravo devolve quem insiste.</p>`;
    const b = el('button', 'btn', 'ACORDAR NA FOGUEIRA');
    b.onclick = () => { this.deathEl.style.display = 'none'; this.game.respawn(); };
    this.deathEl.appendChild(b);
    this.root.appendChild(this.deathEl);
  }
}
