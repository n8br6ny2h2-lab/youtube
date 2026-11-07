// Efsun Avcısı — reklam görseli (Instagram akış 4:5, 1080x1350). Gerçek oyun karesi + logo, özellikler, çağrı.
// Kullanım: cd game && python3 -m http.server 8765 &  sonra: node promo/ad-image.cjs store/instagram/efsun-reklam-4x5.png
// Kapanış yazısı: PROMO_CTA="App Store'da ücretsiz" node promo/ad-image.cjs ...
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'store/instagram/efsun-reklam-4x5.png', URL = process.argv[3] || 'http://localhost:8765/';
const CTA = process.env.PROMO_CTA || 'Çok yakında App Store\'da';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 360, height: 450 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000);
  await p.evaluate(async () => {
    const E = await import('/js/economy.js'); const S = __efsun.S; await document.fonts.ready;
    Object.assign(S, { maxChapter: 6, energy: 30, tutorial: 1 }); S.settings.quality = 'high';
    S.inventory = []; S.equipped = {}; S.pets.drake = { lvl: 6 }; S.pet = 'drake'; S.heroes.kaya.lvl = 8;
    for (const [slot, r, set, base] of [['weapon', 5, 'storm', 'bow'], ['helmet', 4, 'dragon'], ['armor', 4, 'dragon'], ['boots', 4, 'dragon'], ['ring', 5, null], ['amulet', 4, 'dragon']]) {
      const it = E.genItem(slot, r, { set, base }); it.lvl = 40; it.isNew = false; S.inventory.push(it); S.equipped[slot] = it.uid; }
    S.cos = { auras: ['awaken'], skins: ['awaken'], titles: ['s1'], aura: 'awaken', skin: 'awaken', title: 's1' };
    document.querySelector('#title [data-m=play]').click();
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    document.querySelectorAll('#modals .modal-wrap, .toast').forEach(m => m.remove());
    __efsun.startBattle(4, { diff: 0 }); const g = __efsun.game;
    g.cfg.onLevelUp = (c, cb) => cb(c[0].id); g.gainXp = () => {}; g.perf.checked = 99; g.cfg.dmgNumbers = false; g.zoom = 0.66;
    const od = g.drop.bind(g); g.drop = (t, ...r) => t === 'chest' ? null : od(t, ...r);
    for (const id of ['orb', 'orb', 'orb', 'orb', 'atk', 'evo_orb', 'blade', 'blade', 'multi', 'multi']) { g.pendingLv++; g.chooseSkill(id); } g.pendingLv = 0;
    g.st.atk = Math.round(g.st.atk * 0.2); g.p.maxHp = g.p.hp = 99999; g.p.inv = 999;
    g.wave = 10; g.waveT = 3; g.spawnBoss(); const bo = g.boss; bo.x = g.p.x + 105; bo.y = g.p.y - 95; bo.maxHp = bo.hp = 1e9; bo.hp = 0.64e9; bo.patterns = ['spiral']; bo.speed = 0; bo.pt = 0.2; g.banner.t = 0;
    for (let i = 0; i < 45; i++) { const a = Math.random() * 6.28, r = 110 + Math.random() * 220; g.spawn(null, { x: g.p.x + Math.cos(a) * r, y: g.p.y + 30 + Math.sin(a) * r * 1.1 }, { portal: false }); }
    document.querySelectorAll('#tut').forEach(e => e.remove());
  });
  // boss sarmal atışı ekrana yayılana kadar bekle
  for (let k = 0; k < 40; k++) { await p.waitForTimeout(120); const ok = await p.evaluate(() => { const g = __efsun.game; g.p.inv = 999; g.banner.t = 0; return g.boss && g.boss.state === 'act' && g.ebullets.length > 30; }); if (ok) break; }
  await p.evaluate(([cta]) => {
    const g = __efsun.game; g.paused = true; for (const e of g.enemies) { e.flash = 0; e.hitS = 0; } g.texts = []; g.p.inv = 0; g.p.hurtT = 0; g.draw(); // parlama, yazı ve yanıp sönme olmadan
    document.getElementById('hud').style.display = 'none';
    const st = document.createElement('style'); st.textContent = `
      #ad{position:fixed;inset:0;z-index:500;pointer-events:none;font-family:'Lilita One',system-ui;color:#fff}
      #ad .top{position:absolute;left:0;right:0;top:0;height:140px;background:linear-gradient(#0b0518f0 0%,#0b051890 60%,transparent);display:flex;flex-direction:column;align-items:center;padding-top:10px}
      #ad .l1{font-size:52px;line-height:.9;background:linear-gradient(#fff7c2,#fbbf24 55%,#f59e0b);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #7c2d12) drop-shadow(0 6px 10px #000a);transform:rotate(-3deg)}
      #ad .l2{font-size:30px;color:#c4b5fd;filter:drop-shadow(0 3px 0 #312e81);transform:rotate(-3deg);margin-top:-4px}
      #ad .tag{margin-top:4px;font:900 13px Nunito,system-ui;color:#fde68a;text-shadow:0 2px 0 #000,0 0 8px #000}
      #ad .bot{position:absolute;left:0;right:0;bottom:0;height:132px;background:linear-gradient(transparent,#0b0518c8 40%,#0b0518f5);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:12px;gap:8px}
      #ad .chips{display:flex;gap:5px}
      #ad .chip{white-space:nowrap;font:900 11.5px Nunito,system-ui;padding:5px 8px;border-radius:12px;background:#ffffff1c;border:1.5px solid #fde68a99;color:#fff;text-shadow:0 1px 2px #000;backdrop-filter:blur(2px)}
      #ad .cta{font-size:19px;padding:8px 20px;border-radius:15px;background:linear-gradient(#22c55e,#15803d);box-shadow:0 5px 0 #14532d,0 0 20px #22c55e66}
      #ad .sm{font:800 9.5px Nunito,system-ui;color:#ddd6fe;opacity:.85}`;
    document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'ad';
    d.innerHTML = `<div class="top"><div class="l1">EFSUN</div><div class="l2">AVCISI</div><div class="tag">Tek parmakla oynanan aksiyon RPG</div></div>
      <div class="bot"><div class="chips"><span class="chip">🧬 6 Evrim</span><span class="chip">🏟️ Sonsuz Arena</span><span class="chip">👑 Aylık Sezon</span></div>
      <div class="cta">${cta}</div><div class="sm">Oyun içi görüntü • Ücretsiz, isteğe bağlı satın almalar</div></div>`;
    document.body.appendChild(d);
  }, [CTA]);
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT });
  console.log('✓', OUT, errs.length ? 'HATALAR: ' + errs.join(' | ') : '');
  await b.close();
})();
