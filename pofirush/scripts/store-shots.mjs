// Mağaza ekran görüntüleri: iPhone 6.9" (1290×2796), iPad 13" (2064×2752) ve Android telefon (1080×1920).
// Yalnızca bazı cihazlar için: ONLY=ipad node scripts/store-shots.mjs
// Kullanım: npm run dev (ayrı terminalde) → node scripts/store-shots.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL = process.env.URL || 'http://localhost:8090/';
const OUT = new globalThis.URL('../store-listing/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const DEVICES = [['ios', 430, 932, 3], ['ipad', 1032, 1376, 2], ['android', 360, 640, 3]].filter(d => !process.env.ONLY || process.env.ONLY.split(',').includes(d[0]));
const browser = await chromium.launch();
for (const lang of ['tr', 'en']) for (const [dev, w, h, dpr] of DEVICES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, locale: lang });
  const p = await ctx.newPage();
  const fresh = async () => {
    await p.goto(URL); await p.waitForTimeout(700);
    await p.evaluate(() => { const S = window.__pofi.save; S.coins = 4820; S.best.classic = 87; S.skins.push('cool', 'king', 'mint', 'berry'); S.skin = 'king'; });
    if (await p.isVisible('#dClaim')) await p.click('#dClaim');
    await p.click('.mode[data-mode="classic"]'); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelectorAll('.toast').forEach(e => e.remove()));
  };
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { localStorage.clear(); sessionStorage.setItem('x', 1); } });
  await fresh();
  await p.screenshot({ path: `${OUT}/${dev}-${lang}-1-menu.jpg`, type: 'jpeg', quality: 90 });
  const shots = [[24, 'shield', 'neon'], [47, 'magnet', 'ice'], [66, '', 'lava'], [91, 'shield', 'space']];
  for (const [i, [score, setup, name]] of shots.entries()) {
    await fresh();
    await p.click('#playBtn'); await p.waitForTimeout(200);
    await p.evaluate(async ([score, setup]) => {
      const g = window.__pofi.game; g.flap(); g.invT = 9999; g.score = score; g.idx = score + 4;
      g.biome = Math.floor(score / 20) % 5; g.biomeFrom = g.biome; g.biomeK = 1;
      if (setup === 'shield') g.shield = true;
      if (setup === 'magnet') g.magnetT = 6;
      document.querySelector('#score').textContent = score;
      for (let i = 0; i < 170; i++) { await new Promise(r => setTimeout(r, 16)); const n = g.pillars.find(q => q.x + 80 > g.bird.x); if (g.bird.y > (n ? n.c + 10 : 300) && g.bird.vy > 0) g.flap(); }
      g.invT = 0; g.paused = true;
    }, [score, setup]);
    await p.evaluate(() => document.querySelectorAll('.toast').forEach(e => e.remove()));
    await p.waitForTimeout(100);
    await p.screenshot({ path: `${OUT}/${dev}-${lang}-${i + 2}-${name}.jpg`, type: 'jpeg', quality: 90 });
  }
  await fresh();
  await p.click('.dock [data-go="skins"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${dev}-${lang}-6-skins.jpg`, type: 'jpeg', quality: 90 });
  await ctx.close();
}
await browser.close();
console.log('✓ store-listing/screenshots');
