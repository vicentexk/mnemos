// ============================================================
// LEONIS 2D — ui2d.ts · Título, criação, HUD pixel, painéis
// ============================================================

import { RACES, WEAPONS, RaceDef, WeaponDef, ZONES, ORES, SKILLS } from './data/defs';
(window as any).SKILLS_CONST = SKILLS;
import { SPR } from './pix';
import { el } from './core';

export class UI2D {
  root: HTMLElement;
  private game: any;
  private hud!: HTMLElement;
  panelWrap!: HTMLElement; panelContent!: HTMLElement;
  dialogEl!: HTMLElement;
  deathEl!: HTMLElement;
  titleEl!: HTMLElement;
  private hpFill!: HTMLElement; stafFill!: HTMLElement;
  private mountWrap!: HTMLElement; mountFill!: HTMLElement; mountLbl!: HTMLElement;
  private lvlRow!: HTMLElement;
  private mmCtx!: CanvasRenderingContext2D;
  private questT!: HTMLElement; questD!: HTMLElement;
  private feedEl!: HTMLElement;
  private promptEl!: HTMLElement;
  private zoneTitleEl!: HTMLElement;
  private lockNote!: HTMLElement;
  private mapModal!: HTMLElement;

  constructor(rootId: string, game: any) {
    this.game = game;
    this.root = document.getElementById(rootId)!;
    this.buildHUD();
    this.buildPanels();
    this.buildDialog();
    this.buildDeath();
    this.buildMapModal();
  }

  // ================= TÍTULO =================
  buildTitle(onNew: () => void, onContinue: () => void, canContinue: boolean) {
    this.titleEl = el('div');
    this.titleEl.className = 'clickable';
    this.titleEl.id = 'title';
    const pano = this.game.titlePanorama() as HTMLCanvasElement;
    const panoCv = document.createElement('canvas');
    panoCv.width = 240 * 4; panoCv.height = 100 * 4;
    const g = panoCv.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(pano, 0, 0, panoCv.width, panoCv.height);
    this.titleEl.appendChild(panoCv);
    const logo = el('div', 'logo');
    logo.innerHTML = `
      <h1>LEONIS</h1>
      <h2>OS QUE VOLTAM</h2>
      <div class="tmenu">
        <button class="btn tbtn" id="t-new">NOVO JOGO</button>
        ${canContinue ? '<button class="btn tbtn sec" id="t-cont">CONTINUAR</button>' : ''}
        <button class="btn tbtn sec" id="t-help">AJUDA</button>
      </div>
      <div class="tfoot">v0.3 · M2D · Sandbox aberto — todas as zonas liberadas. O nível é do conteúdo.</div>`;
    this.titleEl.appendChild(logo);
    this.root.appendChild(this.titleEl);
    this.titleEl.querySelector('#t-new')!.addEventListener('click', onNew);
    const cont = this.titleEl.querySelector('#t-cont');
    if (cont) cont.addEventListener('click', onContinue);
    this.titleEl.querySelector('#t-help')!.addEventListener('click', () => this.showHelp());
  }
  closeTitle() { this.titleEl?.remove(); }

  // ================= INTRO (usa cutscene DOM do index) =================
  introDom() { const e = document.getElementById('intro'); if (e) e.classList.add('on'); return e; }
  introOff() { const e = document.getElementById('intro'); if (e) e.classList.remove('on'); }

  // ================= CRIAÇÃO =================
  buildCreation(cb: (race: RaceDef | null, weapon: WeaponDef | null, nome: string) => void, canContinue: boolean) {
    const cr = el('div');
    cr.id = 'creation';
    cr.className = 'clickable';
    const inner = el('div', 'inner');
    inner.appendChild(el('h1', '', 'LEONIS'));
    inner.appendChild(el('div', 'sub', 'MARCO M2D · SANDBOX DO BRAVO<br>"Tudo o que a humanidade tem, um Leonis trouxe."'));
    inner.appendChild(el('div', 'sect', '— RAÇA —'));
    const raceCards = el('div', 'cards');
    for (const r of RACES) {
      const card = el('div', 'rcard');
      const pt = document.createElement('canvas');
      pt.width = 56; pt.height = 56;
      const g = pt.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      const spr = SPR[`p/${r.id}/d0`];
      if (spr) g.drawImage(spr, 0, 0, spr.width, spr.height, 8, 3, spr.width * 4, spr.height * 4);
      card.appendChild(pt);
      card.appendChild(el('div', 'nm ol', r.nome));
      card.appendChild(el('div', 'bn ol', r.bonusTxt));
      card.appendChild(el('div', 'ds', r.desc));
      card.onclick = () => {
        raceCards.querySelectorAll('.rcard').forEach(x => x.classList.remove('sel'));
        card.classList.add('sel');
        (card as any)._sel = true;
        this.game.selRace = r;
        this.game.audio.sfx('ui');
      };
      raceCards.appendChild(card);
    }
    inner.appendChild(raceCards);

    for (const [fam, label] of [['GUERRA', '— ARMA · FAMÍLIA DE GUERRA —'], ['CAMPO', '— ARMA · FAMÍLIA DE CAMPO —'], ['ESTRANHA', '— ARMA · FAMÍLIA ESTRANHA (AS LOUCAS) —']] as const) {
      inner.appendChild(el('div', 'sect', label));
      const cards = el('div', 'cards');
      for (const w of WEAPONS.filter(w => w.fam === fam)) {
        const card = el('div', 'wcard');
        card.innerHTML = `<div><span class="ico">${w.ico}</span> <span class="nm ol">${w.nome}</span></div><div class="ds">${w.desc}</div>`;
        card.onclick = () => {
          cards.parentElement!.querySelectorAll('.wcard').forEach(x => x.classList.remove('sel'));
          card.classList.add('sel');
          this.game.selWeapon = w;
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

    const btnRow = el('div', 'btnrow');
    const go = el('button', 'btn', 'DESEMBARCAR NO BRAVO');
    go.onclick = () => {
      if (!this.game.selRace || !this.game.selWeapon) { this.toast('Escolha uma raça e uma arma!'); return; }
      cr.remove();
      cb(this.game.selRace, this.game.selWeapon, inp.value.trim());
    };
    btnRow.appendChild(go);
    if (canContinue) {
      const cont = el('button', 'btn sec', 'CONTINUAR (SAVE)');
      cont.style.marginLeft = '10px';
      cont.onclick = () => { cr.remove(); cb(null, null, ''); };
      btnRow.appendChild(cont);
    }
    inner.appendChild(btnRow);
    inner.appendChild(el('div', 'hint center', 'O Bravo é um sandbox: todas as zonas estão abertas — o UMBIGO espera aventureiros Nv.12+. Você decide quando ir.'));
    cr.appendChild(inner);
    this.root.appendChild(cr);
  }

  // ================= HUD =================
  private buildHUD() {
    this.hud = el('div');
    this.hud.id = 'hud';
    this.root.appendChild(this.hud);

    const bottom = el('div'); bottom.id = 'hudbottom';
    bottom.innerHTML = `
      <div class="barwrap"><div class="barfill" id="hpfill"></div></div>
      <div class="barwrap"><div class="barfill" id="stafill"></div></div>
      <div id="mountwrap"><div class="barwrap"><div class="barfill" id="mountfill"></div></div><div id="mountlbl"></div></div>
      <div id="lvlrow"></div>`;
    this.hud.appendChild(bottom);
    this.hpFill = bottom.querySelector('#hpfill')!;
    this.stafFill = bottom.querySelector('#stafill')!;
    this.mountWrap = bottom.querySelector('#mountwrap')!;
    this.mountFill = bottom.querySelector('#mountfill')!;
    this.mountLbl = bottom.querySelector('#mountlbl')!;
    this.lvlRow = bottom.querySelector('#lvlrow')!;

    const mmwrap = el('div'); mmwrap.id = 'minimapwrap';
    const rn = el('div'); rn.id = 'regionname'; rn.className = 'ol';
    const mm = document.createElement('canvas');
    mm.id = 'minimap'; mm.width = 150; mm.height = 150;
    mmwrap.appendChild(rn); mmwrap.appendChild(mm);
    this.hud.appendChild(mmwrap);
    this.mmCtx = mm.getContext('2d')!;

    const qb = el('div'); qb.id = 'questbox'; qb.style.display = 'none';
    qb.innerHTML = `<div class="qt ol" id="qt"></div><div class="qd" id="qd"></div>`;
    this.hud.appendChild(qb);
    this.questT = qb.querySelector('#qt')!;
    this.questD = qb.querySelector('#qd')!;

    this.feedEl = el('div'); this.feedEl.id = 'feed';
    this.hud.appendChild(this.feedEl);

    this.promptEl = el('div'); this.promptEl.id = 'prompt'; this.promptEl.className = 'ol';
    this.hud.appendChild(this.promptEl);

    this.zoneTitleEl = el('div'); this.zoneTitleEl.id = 'zonetitle'; this.zoneTitleEl.className = 'ol';
    this.hud.appendChild(this.zoneTitleEl);

    this.lockNote = el('div'); this.lockNote.id = 'mousenote';
    this.lockNote.innerHTML = '';
    this.hud.appendChild(this.lockNote);
  }

  updateHUD(g: any) {
    this.hpFill.style.width = `${Math.max(0, (g.player.hp / g.player.maxHp) * 100)}%`;
    this.stafFill.style.width = `${Math.max(0, (g.player.sta / g.player.maxSta) * 100)}%`;
    const m = g.mount;
    if (m && m.state === 'domado' && (g.player.mounted || m.hp < m.maxHp)) {
      this.mountWrap.style.display = 'block';
      this.mountFill.style.width = `${(m.hp / m.maxHp) * 100}%`;
      this.mountLbl.textContent = `${m.nome} · ${'♥'.repeat(m.bond)}`;
    } else this.mountWrap.style.display = 'none';
    const res = g.player.res;
    const resTxt = Object.entries(res).filter(([k, v]) => (v as number) > 0)
      .map(([k, v]) => `${ORES[k]?.ico || k}${v}`).join(' ');
    this.lvlRow.innerHTML = `NV.${g.player.nivel} · FORJA ${g.player.ne().toFixed(1)} · <span class="gold">◉${g.player.cobres}</span> ⛓${res['ferro'] || 0} 🌿${res['erva'] || 0} ${g.player.cargas ? `· 📦${g.player.cargas}` : ''} ${resTxt ? `· ${resTxt}` : ''}`;
    this.drawMinimap(g);
  }

  setZoneName(nome: string, lvl: number, cor: string) {
    const rn = document.getElementById('regionname')!;
    rn.innerHTML = `${nome} · <span style="color:${cor}">NV.${lvl}</span>`;
  }

  quest(title: string | null, desc: string) {
    const qb = document.getElementById('questbox')!;
    if (!title) { qb.style.display = 'none'; return; }
    qb.style.display = 'block';
    this.questT.textContent = title;
    this.questD.textContent = desc;
  }

  feed(msg: string, color = '#bfe8ff') {
    const d = el('div', 'ol', msg);
    d.style.color = color;
    this.feedEl.prepend(d);
    while (this.feedEl.children.length > 7) this.feedEl.removeChild(this.feedEl.lastChild!);
    setTimeout(() => { d.style.opacity = '0'; d.style.transition = 'opacity .6s'; setTimeout(() => d.remove(), 700); }, 4000);
  }

  toast(msg: string) {
    const t = el('div', 'toast ol clickable', msg);
    this.root.appendChild(t);
    setTimeout(() => t.remove(), 3400);
  }

  prompt(txt: string | null) {
    if (!txt) { this.promptEl.style.display = 'none'; return; }
    this.promptEl.style.display = 'block';
    this.promptEl.innerHTML = txt;
  }

  zoneTitle(txt: string, sub: string, cor: string) {
    this.zoneTitleEl.innerHTML = `${txt}<div style="font-size:12px;color:${cor};margin-top:8px;">${sub}</div>`;
    this.zoneTitleEl.style.opacity = '1';
    setTimeout(() => { this.zoneTitleEl.style.opacity = '0'; }, 2400);
  }

  dmgNumber(sx: number, sy: number, txt: string, color: string) {
    const d = el('div', 'dmgnum ol', txt);
    d.style.color = color;
    d.style.left = `${sx - 10}px`;
    d.style.top = `${sy}px`;
    this.hud.appendChild(d);
    requestAnimationFrame(() => {
      d.style.transform = `translateY(-34px)`;
      d.style.opacity = '0';
    });
    setTimeout(() => d.remove(), 850);
  }

  vignette() {
    const v = document.getElementById('vignette');
    if (!v) return;
    v.style.boxShadow = 'inset 0 0 140px rgba(200,0,0,.55)';
    setTimeout(() => { v.style.boxShadow = 'inset 0 0 140px rgba(200,0,0,0)'; }, 240);
  }

  private drawMinimap(g: any) {
    const c = this.mmCtx;
    const S = 150;
    const view = 110; // blocos
    const px = g.player.pos.x / 16, py = g.player.pos.y / 16;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, S, S);
    c.save();
    c.beginPath(); c.rect(0, 0, S, S); c.clip();
    const scale = 360;
    const sx = (px - view / 2) / scale * g.world.minimapCv.width;
    const sy = (py - view / 2) / scale * g.world.minimapCv.height;
    const sw = view / scale * g.world.minimapCv.width;
    c.drawImage(g.world.minimapCv, sx, sy, sw, sw, 0, 0, S, S);
    // POIs próximos
    c.font = 'bold 11px monospace';
    c.textAlign = 'center';
    const drawIco = (wx: number, wy: number, ico: string) => {
      const dx = (wx / 16 - px) / view * S + S / 2;
      const dy = (wy / 16 - py) / view * S + S / 2;
      if (dx < -6 || dx > S + 6 || dy < -6 || dy > S + 6) return;
      c.lineWidth = 3; c.strokeStyle = '#000';
      c.strokeText(ico, dx, dy + 4);
      c.fillStyle = '#fff';
      c.fillText(ico, dx, dy + 4);
    };
    drawIco(g.vila.x * 16, g.vila.y * 16, '⌂');
    drawIco(g.pier.x * 16, g.pier.y * 16, '⛵');
    drawIco(g.wreck.x * 16, g.wreck.y * 16, '✖');
    drawIco(g.ronP.x * 16, g.ronP.y * 16, '🐎');
    for (const cp of g.world.camps) drawIco(cp.x, cp.y, '☠');
    // player
    c.save();
    c.translate(S / 2, S / 2);
    c.rotate(g.player.aim + Math.PI / 2);
    c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 5); c.lineTo(0, 2); c.lineTo(-4, 5);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
    c.restore();
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
  private openPanel(html: string) { this.panelContent.innerHTML = html; this.panelWrap.style.display = 'flex'; }

  showForge(g: any) {
    const p = g.player;
    const disc = g.forgeDisc ? g.forgeDisc() : 1;
    const cA = { c: Math.round(15 * p.equip.armaNivel * disc), f: p.equip.armaNivel };
    const cP = { c: Math.round(12 * p.equip.peitoralNivel * disc), f: p.equip.peitoralNivel };
    const oresVenda = Object.entries(p.res).filter(([k, v]) => ORES[k] && (v as number) > 0);
    const totalV = oresVenda.reduce((s, [k, v]) => s + (ORES[k].valor * (v as number)), 0);
    this.openPanel(`
      <h2>⚒️ FORJA DE PORTO-CANZA</h2>
      <p>"Aço bom é o que volta inteiro."</p>
      <div class="stat">Bolsa: <b class="gold">${p.cobres} ◉</b> · ⛓ ${p.res['ferro'] || 0} Ferro-Canza</div>
      <div class="itemrow"><span>${g.player.arma.ico} ${g.player.arma.nome} <b>Nv.${p.equip.armaNivel}</b></span>
        <button class="btn" id="up-arma" ${p.equip.armaNivel >= 10 ? 'disabled' : ''}>FORJAR (${cA.c}◉ ${cA.f}⛓)</button></div>
      <div class="itemrow"><span>🛡️ Couraça <b>Nv.${p.equip.peitoralNivel}</b></span>
        <button class="btn" id="up-peito" ${p.equip.peitoralNivel >= 10 ? 'disabled' : ''}>FORJAR (${cP.c}◉ ${cP.f}⛓)</button></div>
      <div class="itemrow"><span>🪢 Arreio</span><span class="stat">dropa em baús de acampamento</span></div>
      <hr>
      <h2 style="font-size:10px;">MERCADO — VENDER MINÉRIOS</h2>
      ${oresVenda.length ? oresVenda.map(([k, v]) => `<div class="stat">${ORES[k].ico} ${ORES[k].nome} ×${v} — vale <b class="gold">${ORES[k].valor}◉</b> cada</div>`).join('') : '<div class="stat">Nada pra vender. Minere nas veios coloridos das rochas.</div>'}
      ${totalV > 0 ? `<button class="btn sec" id="sell-all">VENDER TUDO (+${totalV}◉)</button>` : ''}
      <div class="hint">Nível de Forja = arma×0.6 + couraça×0.2 + arreio×0.2. Enfrente zonas do SEU nível.</div>`);
    this.panelContent.querySelector('#up-arma')!.addEventListener('click', () => g.forgeUpgrade('arma'));
    this.panelContent.querySelector('#up-peito')!.addEventListener('click', () => g.forgeUpgrade('peitoral'));
    const sell = this.panelContent.querySelector('#sell-all');
    if (sell) sell.addEventListener('click', () => { g.sellAllOres(); this.showForge(g); });
  }

  showStable(g: any) {
    const m = g.mount;
    const info = m && m.state === 'domado'
      ? `<div class="stat">Montaria: <b>${m.nome}</b> · Vínculo <b>${m.bond}</b> ${'♥'.repeat(m.bond)}</div>
         <div class="stat">Vida ${Math.ceil(m.hp)}/${m.maxHp} · Galope rápido</div>`
      : `<div class="stat">Nenhuma montaria.</div><div class="hint">Um Ronceiro ferido foi visto na Savana Profunda… (missão do Brais)</div>`;
    this.openPanel(`
      <h2>🐎 ESTÁBULO DA PASTORA ENÓ</h2>
      <p>"Cuidar da besta é cuidar de quem volta nela."</p>
      ${info}
      <div class="row">
        ${m && m.state === 'domado' ? `<button class="btn" id="heal-m">CURAR (5◉)</button>
        ${m.bond >= 4 ? '<button class="btn sec" id="rename-m">RENOMEAR</button>' : ''}` : ''}
      </div>`);
    const heal = this.panelContent.querySelector('#heal-m');
    if (heal) heal.addEventListener('click', () => { g.stableHeal(); });
    const ren = this.panelContent.querySelector('#rename-m');
    if (ren) ren.addEventListener('click', () => {
      const nome = window.prompt('Novo nome (vínculo 4+):');
      if (nome && nome.trim()) { g.stableRename(nome.trim().slice(0, 14)); this.showStable(g); }
    });
  }

  showAlforje(g: any) {
    const p = g.player;
    const res = Object.entries(p.res).filter(([k, v]) => (v as number) > 0);
    const totalRes = res.length ? res.map(([k, v]) => `<div class="stat">${ORES[k]?.ico || (k === 'erva' ? '🌿' : '•')} ${ORES[k]?.nome || (k === 'erva' ? 'Erva-de-Kurnis' : k)} ×${v}${ORES[k] ? ` <span style="color:#7a8a94">(vale ${ORES[k].valor}◉ cada)</span>` : ''}</div>`).join('') : '<div class="stat" style="color:#7a8a94">Bolsa de minérios vazia.</div>';
    const m = g.mount;
    const mountLine = g.activeMountId && m
      ? `<div class="stat">🐾 Montaria ativa: <b>${m.nome}</b> ${g.activeMountId !== 'ronceiro' || m.state === 'domado' ? (m.state === 'domado' ? '(domada)' : '(missão em curso)') : ''} · Vínculo ${m.bond}♥</div>` : '';
    this.openPanel(`
      <h2>🎒 ALFORJE DE ${p.nome.toUpperCase()}</h2>
      <div class="stat">${p.race.nome} ${p.race.ico} · ${p.arma.ico} <b>${p.arma.nome}</b> Nv.${p.equip.armaNivel}</div>
      <div class="stat">Vida <b>${Math.ceil(p.hp)}/${p.maxHp}</b> · Stamina <b>${Math.ceil(p.sta)}/${p.maxSta}</b> · Nível <b>${p.nivel}</b> (${p.leguas}/${Math.round(50 * Math.pow(p.nivel, 1.5))} léguas)</div>
      <div class="stat">Forja (NE): <b>${p.ne().toFixed(1)}</b> · Dano ≈ <b>${Math.round(p.weaponDamage(false))}</b> / pesado <b>${Math.round(p.weaponDamage(true))}</b></div>
      ${mountLine}
      <div class="stat">★ Perícia: <b>${g.skillPts}</b> ponto(s) — <span style="color:#8fc7ff">K abre a árvore</span></div>
      <hr>
      <h2 style="font-size:10px;">BOLSA</h2>
      <div class="stat">◉ <b>${p.cobres}</b> Cobres · 🍖 <b>${p.res['carne'] || 0}</b> Carne <span style="color:#7a8a94">(R come)</span> · 🌿 <b>${p.res['erva'] || 0}</b> Erva <span style="color:#7a8a94">(F alimenta montaria)</span></div>
      ${totalRes}
      <div class="hint">Tab fecha. Armadura Nv.${p.equip.peitoralNivel} · Arreio Nv.${p.equip.arreioNivel}</div>`);
  }

  showSkills(g: any) {
    const ramos: { id: string; nome: string; cor: string }[] = [
      { id: 'GUERRA', nome: '⚔ GUERRA', cor: '#ff8a7a' },
      { id: 'AGILIDADE', nome: '🌀 AGILIDADE', cor: '#8fc7ff' },
      { id: 'OFICIO', nome: '⚒ OFÍCIO', cor: '#ffe08a' },
      { id: 'VIGOR', nome: '❤ VIGOR', cor: '#8fe08f' }
    ];
    const cols = ramos.map(r => {
      const nodes = (window as any).SKILLS_CONST.filter((s: any) => s.ramo === r.id).map((s: any) => {
        const owned = g.learned.has(s.id);
        const reqOk = !s.req || g.learned.has(s.req);
        const can = !owned && reqOk && g.skillPts >= 1;
        const st = owned ? '<span style="color:#8fe08f">✓ APRENDIDO</span>' : reqOk ? (can ? '<span style="color:#ffe08a">[APRENDER]</span>' : '<span style="color:#7a8a94">sem pontos</span>') : `<span style="color:#7a8a94">🔒 requer ${SKILLS.find(x => x.id === s.req)?.nome || s.req}</span>`;
        return `<div class="sknode ${owned ? 'owned' : reqOk ? 'avail' : 'lock'}" data-sk="${s.id}"><b>${s.nome}</b><div class="ds">${s.desc}</div><div class="st">${st}</div></div>`;
      }).join('');
      return `<div class="skcol"><div class="skhead" style="color:${r.cor}">${r.nome}</div>${nodes}</div>`;
    }).join('');
    this.openPanel(`
      <h2>🌟 ÁRVORE DE PERÍCIAS</h2>
      <div class="stat">Pontos disponíveis: <b style="color:#ffe08a">${g.skillPts}</b> — suba de nível para ganhar mais.</div>
      <div class="skwrap">${cols}</div>
      <div class="hint">Estilo Forager: gaste pontos, vire outra pessoa. Salva junto com a jornada.</div>`);
    this.panelContent.querySelectorAll('.sknode.avail').forEach(nd => {
      nd.addEventListener('click', () => {
        g.learnSkill((nd as HTMLElement).dataset.sk);
        this.showSkills(g);
      });
    });
  }

  showMap(g: any) {
    const rows = ZONES.map(z => `<div class="stat"><b style="color:${g.zoneColor(z.biome)}">${z.nome}</b> — Nível ${z.lvl}</div>`).join('');
    this.openPanel(`
      <h2>🗺️ CARTA-PRIMEIRA (SANDBOX ABERTO)</h2>
      <canvas id="bigmap" width="360" height="360" style="width:432px;height:432px;image-rendering:pixelated;border:3px solid #000;box-shadow:inset 0 0 0 2px #46565f;"></canvas>
      <div class="row">${rows}</div>
      <div class="hint">Todos os caminhos estão abertos. O nível do monstro é o da zona — a Corja não perdoa presunção.</div>`);
    const bm = this.panelContent.querySelector('#bigmap') as HTMLCanvasElement;
    const bg = bm.getContext('2d')!;
    bg.imageSmoothingEnabled = false;
    bg.drawImage(g.world.minimapCv, 0, 0);
    // POIs
    bg.font = 'bold 12px monospace';
    const dot = (x: number, y: number, ico: string) => {
      bg.lineWidth = 3; bg.strokeStyle = '#000';
      bg.strokeText(ico, x - 5, y + 5);
      bg.fillStyle = '#fff';
      bg.fillText(ico, x - 5, y + 5);
    };
    dot(g.vila.x, g.vila.y, '⌂');
    dot(g.pier.x, g.pier.y, '⛵');
    dot(g.wreck.x, g.wreck.y, '✖');
    dot(g.ronP.x, g.ronP.y, '🐎');
    for (const c of g.world.camps) dot(c.x / 16, c.y / 16, '☠');
    // player
    const px = g.player.pos.x / 16, py = g.player.pos.y / 16;
    bg.fillStyle = '#ff4a3a';
    bg.fillRect(px - 2, py - 2, 5, 5);
    bg.strokeStyle = '#000'; bg.strokeRect(px - 2, py - 2, 5, 5);
  }

  showHelp() {
    this.openPanel(`
      <h2>❓ CONTROLES</h2>
      <div class="stat"><b>WASD</b> mover · <b>Mouse</b> mira · <b>Botão Esq.</b> atacar · <b>Dir.</b> pesado</div>
      <div class="stat"><b>Espaço/C</b> esquiva (i-frames) · <b>E</b> interagir/montar · <b>Shift</b> correr/galopar</div>
      <div class="stat"><b>Q</b> Fúria da montaria (v4) · <b>F</b> alimentar montaria (erva) · <b>R</b> comer carne</div>
      <div class="stat"><b>Tab</b> Alforje · <b>K</b> Perícias · <b>M</b> Mapa · <b>F5/F9</b> salvar/carregar · <b>ESC</b> pausa</div>
      <div class="hint">Dica de ouro: zona Nv.5 com Forja 2 = números cinzas = PAREDE. Volte, forje, volte mais forte.</div>`);
  }

  showPause(g: any) {
    this.openPanel(`
      <h2>⏸ PAUSA</h2>
      <div class="row">
        <button class="btn" id="p-cont">CONTINUAR</button>
        <button class="btn sec" id="p-save">SALVAR</button>
        <button class="btn sec" id="p-load">CARREGAR</button>
        <button class="btn sec" id="p-help">CONTROLES</button>
        <button class="btn sec" id="p-som">SOM: ${g.audio.muted ? 'OFF' : 'ON'}</button>
      </div>
      <div class="hint">LEONIS M2D — quem volta, volta trazendo.</div>`);
    this.panelContent.querySelector('#p-cont')!.addEventListener('click', () => { this.closePanel(); g.resume(); });
    this.panelContent.querySelector('#p-save')!.addEventListener('click', () => g.save(true));
    this.panelContent.querySelector('#p-load')!.addEventListener('click', () => { this.closePanel(); g.loadGame(); });
    this.panelContent.querySelector('#p-help')!.addEventListener('click', () => this.showHelp());
    this.panelContent.querySelector('#p-som')!.addEventListener('click', (e) => {
      g.audio.muted = !g.audio.muted;
      (e.target as HTMLElement).textContent = `SOM: ${g.audio.muted ? 'OFF' : 'ON'}`;
    });
  }

  // ================= DIÁLOGO =================
  private buildDialog() {
    this.dialogEl = el('div'); this.dialogEl.id = 'dialog'; this.dialogEl.classList.add('clickable');
    this.root.appendChild(this.dialogEl);
  }
  dialogFace(name: string, face: number, text: string, opts: { label: string; cb?: () => void }[]) {
    const spr = SPR[`face/${face}`];
    let img = '';
    if (spr) {
      const anySpr = spr as any;
      if (!anySpr._url) anySpr._url = spr.toDataURL();
      img = `<img class="dface" src="${anySpr._url}" alt="">`;
    }
    this.dialogEl.innerHTML = `<div class="drow">${img}<div class="dbody"><div class="dn ol">${name}</div><div class="dt">${text}</div></div></div>`;
    for (const o of opts) {
      const d = el('div', 'opt ol', `▸ ${o.label}`);
      d.onclick = () => { this.closeDialog(); if (o.cb) o.cb(); };
      this.dialogEl.appendChild(d);
    }
    this.dialogEl.style.display = 'block';
  }
  dialog(name: string, text: string, opts: { label: string; cb?: () => void }[]) {
    this.dialogEl.innerHTML = `<div class="dn ol">${name}</div><div class="dt">${text}</div>`;
    for (const o of opts) {
      const d = el('div', 'opt ol', `▸ ${o.label}`);
      d.onclick = () => { this.closeDialog(); if (o.cb) o.cb(); };
      this.dialogEl.appendChild(d);
    }
    this.dialogEl.style.display = 'block';
  }
  closeDialog() { this.dialogEl.style.display = 'none'; }

  // ================= MORTE =================
  private buildDeath() {
    this.deathEl = el('div'); this.deathEl.id = 'deathscreen';
    this.deathEl.classList.add('clickable');
    this.deathEl.innerHTML = `
      <h1>VOCÊ CAIU NO BRAVO</h1>
      <p>A carga se perdeu onde você tombou. 30% das léguas se apagaram.<br>O Bravo devolve quem insiste.</p>`;
    const b = el('button', 'btn', 'ACORDAR NA FOGUEIRA');
    b.onclick = () => { this.deathEl.style.display = 'none'; this.game.respawn(); };
    this.deathEl.appendChild(b);
    this.root.appendChild(this.deathEl);
  }

  private buildMapModal() {
    this.mapModal = el('div');
    this.root.appendChild(this.mapModal);
  }
}
