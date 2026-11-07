const { chromium, devices } = require('playwright');
// Kullanım: cd game && python3 -m http.server 8080 &  sonra: node promo/store-shots-capture.cjs <klasör>
// Oyunun 6 sahnesini 390x844 @3x çeker (raw1..6.png). Sonra store-shots-compose.cjs çerçeveler.
const OUT = process.argv[2];
const setup = async (p, fn, arg) => p.evaluate(fn, arg);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const prep = async () => {
    await p.goto('http://localhost:8080/'); await p.waitForTimeout(900);
    await p.evaluate(async () => {
      const E = await import('/js/economy.js'); const S = window.__efsun.S;
      S.playerName = 'Avcı Kerem'; S.tutorial = 1; S.maxChapter = 5; S.stats.runs = 30; S.mail.forEach(m => { m.read = true; m.claimed = true; });
      for (let c = 1; c < 5; c++) S.cleared[c + ':0'] = true;
      for (const slot of ['weapon', 'helmet', 'armor', 'boots', 'ring', 'amulet']) { const it = E.genItem(slot, 4, { set: ['ring', 'amulet'].includes(slot) ? null : 'dragon', base: slot === 'weapon' ? 'bow' : undefined }); it.lvl = 25; it.isNew = false; S.inventory.push(it); S.equipped[slot] = it.uid; }
      S.gems = 2450; S.gold = 184300; S.energy = 30; S.login.last = (await import('/js/save.js')).today();
      S.arena.best = 27; S.stats.arenaBest = 27;
    });
    await p.reload(); await p.waitForTimeout(1200);
  };
  await prep();
  // 1 başlık
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/raw1.png' });
  // 2 sürü + evrimler
  await p.click('#title [data-m=play]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('#modals [data-close]').forEach(b => b.click()));
  await p.evaluate(() => { window.__efsun.startBattle(3, {}); const g = window.__efsun.game;
    const take = id => { g.chooseSkill(id); g.pendingLv = 0; };
    for (let i = 0; i < 4; i++) { g.pendingLv++; take('orb'); } g.pendingLv++; take('atk');
    for (let i = 0; i < 3; i++) { g.pendingLv++; take('blade'); } g.pendingLv++; take('aspd');
    g.pendingLv++; take('evo_orb'); g.pendingLv++; take('evo_blade'); g.pendingLv++; take('multi'); g.pendingLv++; take('multi');
    g.level = 14; g.wave = 6; g.banner.t = 0; g.paused = false; g.choosing = false;
    for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, r = 120 + Math.random() * 260; g.spawn(null, { x: g.p.x + Math.cos(a) * r, y: g.p.y + Math.sin(a) * r }, { portal: false }); }
    g.p.inv = 99; });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { const g = window.__efsun.game; g.banner.t = 0; document.querySelector('#modals .levelup .skill')?.click(); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '/raw2.png' });
  // 3 evrim seçimi (sandık)
  await p.evaluate(() => { const g = window.__efsun.game; g.skills.evo_orb = 0; delete g.skills.evo_orb; g.skills.meteor = 3; g.skills.magnet = 1; delete g.skills.evo_orb; g.nextChest = 1; g.pendingLv = 1; g.levelUp(); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/raw3.png' });
  await p.evaluate(() => { const g = window.__efsun.game; g.paused = true; g.over = true; window.__efsun.game.destroy(); });
  // 4 boss
  await prep();
  await p.click('#title [data-m=play]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('#modals [data-close]').forEach(b => b.click()));
  await p.evaluate(() => { window.__efsun.startBattle(4, {}); const g = window.__efsun.game; g.gainXp = () => {}; g.wave = 10; g.waveT = 3; g.banner.t = 0; g.p.inv = 99;
    g.pendingLv++; g.chooseSkill('bolt'); g.pendingLv++; g.chooseSkill('bolt'); g.pendingLv = 0; g.paused = false; g.choosing = false; g.spawnBoss(); g.banner.t = 0; g.boss.x = g.p.x + 20; g.boss.y = g.p.y - 220; g.boss.age = 0.5; g.boss.maxHp = 1e9; g.boss.hp = 0.72e9; g.boss.patterns = ['spiral', 'radial']; g.boss.speed = 0; g.boss.pt = 0.3;
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, r = 150 + Math.random() * 200; g.spawn(null, { x: g.p.x + Math.cos(a) * r, y: g.p.y + Math.sin(a) * r }, { portal: false }); } });
  for (let k = 0; k < 40; k++) { await p.waitForTimeout(150); const st = await p.evaluate(() => { const g = window.__efsun.game; if (document.querySelector('.levelup .skill')) document.querySelector('.levelup .skill').click(); g.p.inv = 99; g.banner.t = 0; return g.boss && g.boss.state === 'act' && ['radial','spiral','spread'].includes(g.boss.pat) && g.ebullets.length > 45; }); if (st) break; }
  await p.screenshot({ path: OUT + '/raw4.png' });
  await p.evaluate(() => { window.__efsun.game.destroy(); });
  // 5 arena
  await prep();
  await p.click('#title [data-m=play]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('#modals [data-close]').forEach(b => b.click()));
  await p.evaluate(() => { window.__efsun.startBattle(1, { arena: true }); const g = window.__efsun.game; g.p.inv = 99; g.gainXp = () => {};
    for (let i = 0; i < 22; i++) { if (g.boss) { g.boss.dead = true; g.boss = null; g.bossActive = false; } g.nextWave(); }
    ['meteor','meteor','meteor','bolt','frost','frost','diag'].forEach(id => { g.pendingLv++; g.chooseSkill(id); }); g.pendingLv = 0; g.level = 19; g.kills = 1834; g.combo = 0;
    for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, r = 110 + Math.random() * 280; g.spawn(null, { x: g.p.x + Math.cos(a) * r, y: g.p.y + Math.sin(a) * r }, { portal: false }); } });
  for (let k = 0; k < 12; k++) { await p.waitForTimeout(250); await p.evaluate(() => { const g = window.__efsun.game; g.p.inv = 99; g.xp = 0; if (g.choosing) { document.querySelector('.levelup .skill')?.click(); } }); }
  await p.evaluate(() => { const g = window.__efsun.game; g.xp = 0; g.banner = { text: 'Dalga 23', sub: '🏟️ Rekor: Dalga 27', t: 1.6 }; });
  await p.waitForTimeout(700);
  await p.evaluate(() => { const g = window.__efsun.game; if (g.choosing) document.querySelector('.levelup .skill')?.click(); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/raw5.png' });
  await p.evaluate(() => { window.__efsun.game.destroy(); });
  // 6 sezon
  await prep();
  await p.click('#title [data-m=play]'); await p.waitForTimeout(300);
  await p.evaluate(() => { document.querySelectorAll('#modals [data-close]').forEach(b => b.click()); const S = window.__efsun.S; S.season.pts = 810; S.season.claimed = []; S.season.tasks = ['arena20', 'hard3', 'nohit', 'boss30', 'daily5']; S.season.cnt = { arenaBest: 27, hard: 3, nohit: 1, boss: 34, daily: 5, night: 0 }; document.querySelector('#nav [data-tab=quest]').click(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { const h = [...document.querySelectorAll('#screen h3')][0]; document.querySelector('#screen').scrollTo(0, h.offsetTop - 70); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/raw6.png' });
  console.log(errs.join('\n') || 'ok');
  await b.close();
})();
