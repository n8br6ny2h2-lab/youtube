// Tarayıcıda uçtan uca duman testi: menü, oyun, ölüm, devam, oyun sonu, mağaza, kostümler, görevler, ayarlar.
// Kullanım: npm run dev (ayrı terminalde)  →  npm test   [SHOTS=klasör ile ekran görüntüsü alır]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const URL = process.env.URL || 'http://localhost:8090/';
const SHOTS = process.env.SHOTS || '';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png` }); };
const wait = ms => page.waitForTimeout(ms);

await page.goto(URL);
await wait(1200);
// Günlük ödül penceresi
if (await page.isVisible('#dClaim')) { await shot('01-daily'); await page.click('#dClaim'); }
await wait(300);
await shot('02-menu');

// Oyun: otomatik pilot ile bir süre uç, sonra düş
await page.click('#playBtn');
await wait(300);
await shot('03-ready');
const autopilot = await page.evaluate(async () => {
  const g = window.__pofi.game;
  g.flap();
  let flaps = 0;
  for (let i = 0; i < 1100; i++) {
    await new Promise(r => setTimeout(r, 16));
    if (g.state !== 'play') break;
    const next = g.pillars.find(p => p.x + 66 > g.bird.x - 10);
    const target = next ? next.c + 8 : g.H * 0.45;
    if (g.bird.y > target && g.bird.vy > -80) { g.flap(); flaps++; }
  }
  return { score: g.score, state: g.state, flaps };
});
console.log('Otomatik pilot:', autopilot);
await shot('04-play');
await page.evaluate(() => { const g = window.__pofi.game; g.shield = false; g.invT = 0; if (g.state === 'play') g.die('test'); });
await wait(1600);
await shot('05-after-death');
if (await page.isVisible('#cAd')) { await page.click('#cAd'); await wait(1300); await page.click('#adOk'); await wait(400); await shot('06-revived');
  await page.evaluate(() => { const g = window.__pofi.game; g.flap(); setTimeout(() => g.die('test'), 300); }); await wait(1800); }
await page.waitForSelector('#retry', { timeout: 8000 });
await shot('07-over');
await page.click('#home');
await wait(500);
for (const go of ['skins', 'shop', 'missions', 'records', 'settings']) {
  await page.click(`.dock [data-go="${go}"], .topbar [data-go="${go}"]`);
  await wait(400);
  await shot('08-' + go);
  await page.click('#back');
  await wait(200);
}
// Test mağazası satın alma
await page.click('.dock [data-go="shop"]');
await page.click('[data-buy="pofi_noads"]');
await wait(200);
await page.click('#mOk');
await wait(300);
const save = await page.evaluate(() => window.__pofi.save);
console.log('noads:', save.noads, 'coins:', save.coins, 'runs:', save.stats.runs);
await browser.close();
if (errors.length) { console.error('HATALAR:\n' + errors.join('\n')); process.exit(1); }
if (!save.noads || save.stats.runs < 1) { console.error('Beklenen durum oluşmadı'); process.exit(1); }
console.log('✓ Duman testi geçti');
