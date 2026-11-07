// Efsun Avcısı — Instagram Reels/Hikâye tanıtım videoları (1080x1920, 30 FPS)
// Oyunun saatini dışarıdan ilerletip her kareyi tek tek çeker (takılmasız, kare kaybı yok).
// Kullanım: node promo/capture.cjs <video-adı> <çıktı-klasörü> [oyun-adresi]
//   video-adı: boss | guc | kombo | hikaye (15 sn Instagram hikâyesi: evrim, boss, arena, sezon)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const NAME = process.argv[2], OUT = process.argv[3], URL = process.argv[4] || 'http://localhost:8765/';
const CTA = process.env.PROMO_CTA || 'App Store\'da ücretsiz';
const FPS = 30, DT = 1000 / FPS;
// Ölçek: 3 → 1080x1920, 6 → 2160x3840 (4K). Oyun tuvali de bu yoğunlukta çizilir (büyütme yok).
const SCALE = +process.env.PROMO_SCALE || 3;
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

// ---------------- sayfaya enjekte edilen sanal saat + yazı katmanı ----------------
function harness() {
  let vt = 0; const cbs = [];
  performance.now = () => vt;
  window.requestAnimationFrame = cb => { cbs.push(cb); return cbs.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = ms => { vt += ms; const l = cbs.splice(0); for (const cb of l) { try { cb(vt); } catch (e) { console.error(e); } } };
  window.__vt = () => vt;

  const css = `
  #promo{position:fixed;inset:0;z-index:300;pointer-events:none;font-family:'Lilita One',system-ui,sans-serif}
  #promo .cap{position:absolute;left:0;right:0;text-align:center;padding:0 18px;color:#fff;line-height:1.02;
    -webkit-text-stroke:7px #1a0b05;paint-order:stroke fill;text-shadow:0 6px 0 #1a0b05,0 0 30px rgba(0,0,0,.6);transform-origin:50% 50%}
  #promo .cap.gold{color:#fde047}
  #promo .cap.top{top:150px}#promo .cap.mid{top:40%}#promo .cap.bottom{top:340px}
  #promo .end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:104px;gap:10px;
    background:radial-gradient(circle at 50% 40%,#5b21b6 0%,#1e0b3a 55%,#07040f 100%)}
  #promo .end .l1{font-size:54px;line-height:.9;background:linear-gradient(#fde68a,#f59e0b);-webkit-background-clip:text;background-clip:text;color:transparent;
    filter:drop-shadow(0 5px 0 #7c2d12);transform:rotate(-3deg)}
  #promo .end .l2{font-size:34px;color:#c4b5fd;filter:drop-shadow(0 4px 0 #312e81);transform:rotate(-3deg);margin-top:-6px}
  #promo .end canvas{width:180px;height:190px}
  #promo .end .cta{margin-top:2px;padding:10px 22px;border-radius:16px;background:linear-gradient(#22c55e,#15803d);color:#fff;font-size:22px;box-shadow:0 6px 0 #14532d}
  #promo .end .sm{font-family:Nunito,system-ui;font-weight:800;color:#e9d5ff;font-size:15px;opacity:.9}
  #promo .end .sm2{font-family:Nunito,system-ui;font-weight:900;color:#fde68a;font-size:17px;text-shadow:0 2px 0 #1a0b05}
  #promo .flash{position:absolute;inset:0;background:#fff}`;
  addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'promo'; document.body.appendChild(d);
  });
  const back = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  // caps: [{t0,t1,text,pos,size,cls}]  end: {t0, cta}  flash: [t]
  window.__promo = { caps: [], end: null, flashes: [],
    render(t) {
      const root = document.getElementById('promo'); if (!root) return;
      let html = '';
      for (const c of this.caps) {
        if (t < c.t0 || t > c.t1) continue;
        const k = (t - c.t0), out = c.t1 - t;
        const s = k < 0.28 ? Math.max(0.01, back(k / 0.28)) : 1 + Math.sin(k * 5) * 0.015;
        const o = Math.min(1, out / 0.18);
        const rot = (c.rot || 0) + (k < 0.28 ? (1 - k / 0.28) * -8 : 0);
        html += `<div class="cap ${c.pos || 'top'} ${c.cls || ''}" style="font-size:${c.size || 46}px;opacity:${o};transform:scale(${s}) rotate(${rot}deg)">${c.text}</div>`;
      }
      for (const f of this.flashes) if (t >= f && t < f + 0.25) html += `<div class="flash" style="opacity:${0.85 * (1 - (t - f) / 0.25)}"></div>`;
      if (this.end && t >= this.end.t0) {
        const k = t - this.end.t0, o = Math.min(1, k / 0.25), s = k < 0.35 ? back(k / 0.35) : 1;
        html += `<div class="end" style="opacity:${o}"><div style="transform:scale(${s});display:flex;flex-direction:column;align-items:center;gap:10px">
          <div class="l1">EFSUN</div><div class="l2">AVCISI</div><canvas id="endcv" class="hero-cv" data-hero="kaya" data-w="sword" data-pet="drake" data-color="#fde68a"></canvas>
          ${this.end.skin ? '<div class="sm2">👑 Her ay yeni sezon • Kalıcı kostüm</div>' : ''}
          <div class="cta" style="transform:scale(${1 + Math.max(0, Math.sin(k * 6)) * 0.05})">${this.end.cta}</div>
          <div class="sm">Tek parmakla aksiyon RPG • Oyun içi görüntüler</div></div></div>`;
      }
      root.innerHTML = html;
      if (this.end && t >= this.end.t0 && window.__art) {
        const cv = document.getElementById('endcv'); const dpr = devicePixelRatio;
        cv.width = 180 * dpr; cv.height = 190 * dpr; const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(90, 172, 50, 12, 0, 0, 7); x.fill();
        const cyc = t % 2.2, atk = cyc < 0.35 ? 1 - cyc / 0.35 : 0;
        if (this.end.skin) window.__art.drawAura(x, this.end.skin, 82, 134 + 15 * 2.7, 2.7, t);
        window.__art.drawHero(x, 'kaya', 82, 134, 2.7, { t, walk: 0, moving: false, aim: -0.25, atk, hurt: 0, wtype: 'sword', skin: this.end.skin || null });
        window.__art.drawPet(x, 'drake', 146, 52, 2.1, t, false);
      }
    } };
}

// ---------------- yardımcılar ----------------
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true });
  await ctx.addInitScript(s => { window.EFSUN_MAX_DPR = s; }, SCALE);
  await ctx.addInitScript(harness);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1200);
  await p.evaluate(async () => { window.__art = await import('/js/art.js'); window.__E = await import('/js/economy.js'); window.__D = await import('/js/data.js'); await document.fonts.ready; });
  const cdp = await ctx.newCDPSession(p);

  let T = 0, F = 0; const events = []; let realStart = Date.now();
  const ev = (type, at = T) => events.push({ t: +at.toFixed(3), type });
  const shot = async () => {
    await p.evaluate(t => window.__promo.render(t), T);
    await p.screenshot({ path: path.join(OUT, 'frames', String(F).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 97 });
    F++;
    if (F === 20) { const ms = (Date.now() - realStart) / 20; await cdp.send('Animation.setPlaybackRate', { playbackRate: Math.min(1, DT / ms) }); }
  };
  // n kare oyna; drive(i) her karede sayfada çalışır (hareket, sahneleme)
  const play = async (sec, drive) => {
    const n = Math.round(sec * FPS);
    for (let i = 0; i < n; i++) {
      await p.evaluate(([dt, src, i, T]) => { if (src) (0, eval)(src)(i, T); window.__step(dt); }, [DT, drive ? `(${drive})` : null, i, T]);
      T += 1 / FPS; await shot();
    }
  };
  const cap = (t0, dur, text, opt = {}) => { ev('whoosh', t0); return p.evaluate(c => window.__promo.caps.push(c), { t0, t1: t0 + dur, text, ...opt }); };
  const flash = t => p.evaluate(t => window.__promo.flashes.push(t), t);
  const clean = () => p.evaluate(() => document.querySelectorAll('#modals .modal-wrap, .toast').forEach(m => m.remove()));

  // zengin ama ulaşılabilir bir geç oyun profili
  const lateGame = () => p.evaluate(() => {
    const S = __efsun.S, E = __E;
    S.settings.quality = 'high';
    Object.assign(S, { playerName: 'EfsunUstası', gems: 4820, gold: 286400, runes: 140, maxChapter: 6, energy: 30 });
    S.stats.runs = 40; S.tutorial = 1; const d = new Date(); S.login.last = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    for (const m of S.mail) { m.read = true; m.claimed = true; }
    for (const h of ['lina', 'zerk', 'nyx']) S.heroes[h] = { lvl: 4, shards: 0 }; S.heroes.kaya.lvl = 8;
    S.pets.drake = { lvl: 6 }; S.pet = 'drake'; S.talents = { power: 45, vital: 40, agility: 25, fortune: 20, iron: 15 };
    S.inventory = []; S.equipped = {};
    for (const [slot, r, set, base] of [['weapon', 5, 'storm', 'sword'], ['helmet', 4, 'dragon'], ['armor', 4, 'dragon'], ['boots', 4, 'dragon'], ['ring', 5, null], ['amulet', 4, 'dragon']]) {
      const it = E.genItem(slot, r, { set, base }); it.lvl = 30 + r * 4; it.isNew = false; S.inventory.push(it); S.equipped[slot] = it.uid;
    }
    __efsun.render();
    const t = document.querySelector('#title [data-m=play]'); if (t && !document.getElementById('title').hidden) t.click();
  }).then(() => p.waitForTimeout(700)).then(() => p.evaluate(() => document.querySelectorAll('#modals .modal-wrap, .toast').forEach(m => m.remove())));
  const startBattle = (ch, wave, extra) => p.evaluate(([ch, wave, extra]) => {
    __efsun.startBattle(ch, { diff: 0 });
    const g = __efsun.game; g.zoom = 0.96; g.perf.checked = 99; g.cfg.quality = 'high'; g.wave = wave; g.waveT = 2; g.banner.t = 0;
    window.__luOrig = g.cfg.onLevelUp; g.cfg.onLevelUp = (c, cb) => cb(c[0].id);
    Object.assign(g.st, extra || {});
    g.p.maxHp = Math.max(g.p.maxHp, 9800); g.p.hp = g.p.maxHp;
    document.querySelectorAll('#tut').forEach(e => e.remove());
  }, [ch, wave, extra]);
  // yumuşak hareket: dairesel + ara sıra yön değişimi (klavye girdisiyle)
  const circleDrive = `(i, T) => { const g = __efsun.game; if (!g) return; const k = g.input.keys, a = T * 1.3;
    const dx = Math.cos(a), dy = Math.sin(a * 0.8); k.a = dx < -0.35; k.d = dx > 0.35; k.w = dy < -0.35; k.s = dy > 0.35; }`;

  // ================================================================ VİDEOLAR
  if (NAME === 'boss') {
    await lateGame(); await clean();
    await startBattle(4, 9, { orbs: 2, blades: 2, bolt: 2, multishot: 2, diag: 1 });
    await p.evaluate(() => { const g = __efsun.game; g.st.atk = Math.round(g.st.atk * 0.35); for (let i = 0; i < 45; i++) g.spawn(); });
    await cap(0.05, 2.6, 'Bu boss\'u<br>yenebilir misin? 😱', { pos: 'top', size: 44, cls: 'gold' });
    await play(2.7, circleDrive);
    // boss gelir
    await p.evaluate(() => { const g = __efsun.game; g.wave = 10; g.waveT = 3; g.bossSpawned = false; g.bossActive = false; g.spawnBoss();
      const b = g.boss; b.x = g.p.x + 10; b.y = g.p.y - 260; b.maxHp = b.hp = g.baseDmg() * 260; g.banner.t = 2.2; });
    ev('boss'); await flash(T);
    await play(2.4, circleDrive);
    // kırmızı uyarı: yere vuruş — oyuncu kaçar
    await p.evaluate(() => { const g = __efsun.game, b = g.boss; b.state = 'tele'; b.pat = 'slam'; b.tt = 0.75; b.tx = g.p.x; b.ty = g.p.y; g.fx.push({ type: 'tele', x: g.p.x, y: g.p.y, r: 130, t: 0, life: 0.75 }); });
    await cap(T, 1.6, 'KIRMIZI ALANDAN<br>KAÇ! 🏃', { pos: 'bottom', size: 36 });
    await play(1.6, `(i) => { const k = __efsun.game.input.keys; k.a = true; k.s = i > 6; k.d = k.w = false; }`);
    ev('boom', T - 0.85);
    await play(3.2, circleDrive);
    await cap(T, 2.0, 'Neredeyse… 🔥', { pos: 'top', size: 46 });
    await p.evaluate(() => { const b = __efsun.game.boss; if (b) b.hp = b.maxHp * 0.08; });
    await play(1.6, circleDrive);
    await p.evaluate(() => { const g = __efsun.game, b = g.boss; if (b && !b.dead) { b.hp = 1; g.hitEnemy(b, g.baseDmg() * 3); } });
    ev('boom'); ev('win', T + 0.2); await flash(T);
    await cap(T + 0.3, 2.4, 'ZAFER! 🏆', { pos: 'mid', size: 72, cls: 'gold' });
    await play(3.0);
    await p.evaluate(([t, cta]) => { window.__promo.end = { t0: t, cta }; }, [T, CTA]); ev('end');
    await play(3.2);
  }

  if (NAME === 'guc') {
    await lateGame();
    // başlangıç: sıradan eşyalar, düşük güç
    await p.evaluate(() => { const S = __efsun.S, E = __E; S.inventory = []; S.equipped = {};
      for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet']) { const it = E.genItem(slot, slot === 'weapon' ? 1 : 0, { base: slot === 'weapon' ? 'sword' : undefined, set: null }); it.lvl = 3; it.isNew = false; S.inventory.push(it); S.equipped[slot] = it.uid; }
      // aynı yuvalar için güçlü eşyalar çantada (önceki sandıklardan)
      for (const [slot, r, set] of [['helmet', 4, 'dragon'], ['armor', 4, 'dragon'], ['boots', 4, 'dragon'], ['amulet', 4, 'dragon'], ['ring', 5, null]]) { const it = E.genItem(slot, r, { set }); it.lvl = 36; it.isNew = false; S.inventory.push(it); }
      S.pity.legend = 19; // şans koruması: sıradaki Efsane Sandık Mitik garanti (oyunun gerçek kuralı)
      S.talents = { power: 10, vital: 10 }; __efsun.render(); });
    await p.waitForTimeout(300); await clean();
    await p.evaluate(() => document.querySelector('#nav button[data-tab=gear]').click()); await p.waitForTimeout(200);
    const pow0 = await p.evaluate(() => __E.computeStats(__efsun.S).power);
    await cap(0.05, 2.4, `Güç: ${pow0.toLocaleString('tr-TR')} 😐`, { pos: 'mid', size: 54 });
    await play(2.4);
    await p.evaluate(() => document.querySelector('#nav button[data-tab=shop]').click());
    await p.evaluate(() => { const el = document.querySelector('.chest.c-legend'); el.scrollIntoView({ block: 'center' }); });
    await cap(T, 1.6, 'Efsane Sandık… 🤞', { pos: 'top', size: 44 });
    await play(1.6);
    await p.evaluate(() => document.querySelector('[data-act=chest][data-id=legend]').click());
    ev('legend'); await flash(T);
    await cap(T + 0.2, 2.2, 'MİTİK! 🌟', { pos: 'top', size: 70, cls: 'gold' });
    await play(2.6);
    await clean();
    await p.evaluate(() => document.querySelector('#nav button[data-tab=gear]').click());
    await cap(T, 1.8, 'Tek tuşla<br>en iyisini giy ⚡', { pos: 'top', size: 40 });
    await play(1.2);
    await p.evaluate(() => document.querySelector('[data-act=autoEquip]').click()); ev('level');
    const pow1 = await p.evaluate(() => __E.computeStats(__efsun.S).power);
    await cap(T + 0.5, 2.4, `Güç: ${pow1.toLocaleString('tr-TR')} 🚀`, { pos: 'top', size: 50, cls: 'gold' });
    await play(3.0);
    await clean();
    await startBattle(3, 8, { orbs: 2, meteor: 2, bolt: 1 });
    await p.evaluate(() => { const g = __efsun.game; for (let i = 0; i < 50; i++) g.spawn(); });
    await cap(T, 3.6, 'Şimdi hepsi<br>tek vuruş 💥', { pos: 'top', size: 44 });
    await play(4.0, circleDrive);
    await p.evaluate(([t, cta]) => { window.__promo.end = { t0: t, cta }; }, [T, CTA]); ev('end');
    await play(3.2);
  }

  if (NAME === 'kombo') {
    await lateGame(); await clean();
    await startBattle(5, 9, { orbs: 3, blades: 4, bolt: 3, frost: 2, meteor: 2, multishot: 3, diag: 2, rear: 1 });
    await p.evaluate(() => { const g = __efsun.game; g.st.atk = Math.round(g.st.atk * 0.25); g.st.setPowers = ['fireNova', 'stormCall']; for (let i = 0; i < 85; i++) g.spawn(); });
    await cap(0.05, 2.6, 'Ekranda<br>90 düşman… 😳', { pos: 'top', size: 46 });
    const horde = `(i, T) => { ${circleDrive.slice(circleDrive.indexOf('{') + 1, circleDrive.lastIndexOf('}'))}; const gm = __efsun.game; if (gm.enemies.length < 75) for (let j = 0; j < 6; j++) gm.spawn(); }`;
    await play(4.5, horde);
    await cap(T, 2.5, 'Durmadan<br>KOMBO 🔥', { pos: 'bottom', size: 48, cls: 'gold' });
    await play(3.5, horde);
    // seviye atlama: gerçek güç seçim penceresi
    const hasModal = await p.evaluate(() => { const g = __efsun.game; g.choosing = false; g.pendingLv = 0; g.cfg.onLevelUp = window.__luOrig; g.skills = { orb: 3, blade: 2, bolt: 3, multi: 3 }; g.gainXp(g.xpNeed - g.xp + 1); return !!document.querySelector('.levelup'); });
    if (hasModal) { ev('level'); await cap(T, 2.6, 'Hangisini seçerdin? 👇', { pos: 'top', size: 36, cls: 'gold' }); await play(2.6);
      await p.evaluate(() => document.querySelector('.levelup .skill')?.click()); }
    await p.evaluate(() => { const g = __efsun.game; g.cfg.onLevelUp = (c, cb) => cb(c[0].id); });
    const combo = await p.evaluate(() => __efsun.game.maxCombo);
    await cap(T, 3.0, `${Math.max(300, combo)}+ KOMBO 🤯`, { pos: 'mid', size: 62, cls: 'gold' });
    await play(3.2, horde);
    await p.evaluate(([t, cta]) => { window.__promo.end = { t0: t, cta }; }, [T, CTA]); ev('end');
    await play(3.2);
  }

  if (NAME === 'hikaye') {
    // 15,0 sn: sürü (3,0) → evrim (2,6) → boss (3,2) → arena (2,8) → kapanış (3,4)
    await lateGame(); await clean();
    await startBattle(3, 6, { multishot: 2, diag: 1 });
    await p.evaluate(() => { const g = __efsun.game; g.st.atk = Math.round(g.st.atk * 0.3);
      for (const id of ['orb', 'orb', 'orb', 'orb', 'atk', 'blade', 'blade']) { g.pendingLv++; g.chooseSkill(id); } g.pendingLv = 0;
      g.gainXp = () => {}; const od = g.drop.bind(g); g.drop = (t, ...r) => t === 'chest' ? null : od(t, ...r); // evrim sahnesinden önce sandık düşmesin
      for (let i = 0; i < 70; i++) g.spawn(); });
    const horde = `(i, T) => { ${circleDrive.slice(circleDrive.indexOf('{') + 1, circleDrive.lastIndexOf('}'))}; const gm = __efsun.game; if (gm.enemies.length < 70) for (let j = 0; j < 5; j++) gm.spawn(); }`;
    await cap(0.05, 2.85, '90 düşman.<br>Tek parmak ☝️', { pos: 'top', size: 48, cls: 'gold' });
    await play(3.0, horde);
    // gerçek hazine sandığı penceresi: hazır evrim kesin çıkar
    await p.evaluate(() => { const g = __efsun.game; g.cfg.onLevelUp = window.__luOrig; g.nextChest = 1; g.pendingLv = 1; g.levelUp(); });
    ev('level');
    await play(1.2);
    await p.evaluate(() => { document.querySelector('.levelup .skill.evo, .levelup .skill')?.click(); __efsun.game.cfg.onLevelUp = (c, cb) => cb(c[0].id); });
    ev('legend'); await flash(T);
    await cap(T + 0.05, 1.35, 'Güçlerini<br>EVRİMLEŞTİR 🧬', { pos: 'mid', size: 44, cls: 'gold' });
    await play(1.4, horde);
    // boss: sarmal mermi deseni
    await p.evaluate(() => { const g = __efsun.game; g.wave = 10; g.waveT = 3; g.bossSpawned = false; g.bossActive = false; g.spawnBoss();
      const b = g.boss; b.x = g.p.x + 10; b.y = g.p.y - 135; b.maxHp = b.hp = g.baseDmg() * 400; b.patterns = ['spiral', 'radial']; b.speed = 0; b.pt = 0.5; g.banner.t = 0; });
    ev('boss'); await flash(T);
    await cap(T + 0.2, 2.9, 'Dev bosslar 🐉', { pos: 'bottom', size: 52 });
    await play(3.2, circleDrive);
    // arena: dalga 23, yeni rekor
    await p.evaluate(() => { __efsun.game.destroy(); __efsun.S.energy = 30; __efsun.startBattle(1, { arena: true }); const g = __efsun.game;
      g.zoom = 0.96; g.perf.checked = 99; g.cfg.quality = 'high'; g.cfg.onLevelUp = (c, cb) => cb(c[0].id); g.gainXp = () => {};
      g.p.maxHp = Math.max(g.p.maxHp, 9800); g.p.hp = g.p.maxHp; document.querySelectorAll('#tut').forEach(e => e.remove());
      for (let i = 0; i < 22; i++) { if (g.boss) { g.boss.dead = true; g.boss = null; g.bossActive = false; } g.nextWave(); }
      for (const id of ['meteor', 'meteor', 'bolt', 'bolt', 'frost', 'blade', 'blade']) { g.pendingLv++; g.chooseSkill(id); } g.pendingLv = 0;
      g.st.atk = Math.round(g.st.atk * 0.5); g.healP = () => {};
      for (let i = 0; i < 65; i++) g.spawn(); g.banner = { text: 'Dalga 23', sub: '🔥 YENİ REKOR!', t: 2.2 }; });
    await cap(T, 2.7, 'Sonsuz<br>ARENA 🏟️', { pos: 'bottom', size: 50, cls: 'gold' });
    await play(2.8, horde);
    await p.evaluate(([t, cta]) => { window.__promo.end = { t0: t, cta, skin: 'awaken' }; }, [T, CTA]); ev('end');
    await play(3.4);
  }

  fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify({ name: NAME, fps: FPS, frames: F, duration: +(F / FPS).toFixed(3), events }, null, 1));
  console.log(`${NAME}: ${F} kare (${(F / FPS).toFixed(1)} sn), ${events.length} ses olayı, gerçek süre ${((Date.now() - realStart) / 1000).toFixed(0)} sn`);
  if (errs.length) console.log('HATALAR:', errs.join('\n'));
  await b.close();
})();
