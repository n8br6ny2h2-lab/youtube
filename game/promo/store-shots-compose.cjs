const { chromium } = require('playwright');
const fs = require('fs');
// Kullanım: node promo/store-shots-compose.cjs <ham klasör> store/app-store
// Ham görüntüleri başlık + telefon çerçevesiyle 1320x2868 App Store görseline çevirir.
const SS = process.argv[2], OUT = process.argv[3], G = require('path').join(__dirname, '..');
const shots = [
  ['EFSUN DİYARI', 'SENİ BEKLİYOR', 'Tek parmakla oynanan aksiyon RPG', '#3b1a78', '#1a0b3d'],
  ['SÜRÜLERİ', 'TEMİZLE', 'Sürükle, kaç, saldırı otomatik!', '#7c2d12', '#2a0d05'],
  ['GÜÇLERİNİ', 'EVRİMLEŞTİR', '19 güç, 6 süper evrim', '#86198f', '#2e0838'],
  ['DEV BOSSLARI', 'YEN', 'Kırmızı uyarıdan kaç, ganimeti kap', '#991b1b', '#2b0606'],
  ['SONSUZ', 'ARENA', 'Her 5 dalgada boss, rekorunu kır!', '#b45309', '#2d1503'],
  ['HER AY', 'YENİ SEZON', 'Kalıcı aura ve kostüm yalnızca şampiyonlara', '#1e40af', '#0a1640'],
];
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const font = f => 'data:font/woff2;base64,' + fs.readFileSync(`${G}/fonts/${f}`).toString('base64');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
  for (let i = 0; i < shots.length; i++) {
    const [l1, l2, sub, c1, c2] = shots[i];
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face { font-family: L; src: url(${font('LilitaOne-latin-ext-0.woff2')}) format('woff2'); unicode-range: U+0100-024F; }
      @font-face { font-family: L; src: url(${font('LilitaOne-latin-1.woff2')}) format('woff2'); }
      @font-face { font-family: N; font-weight: 200 1000; src: url(${font('Nunito-latin-ext-2.woff2')}) format('woff2'); unicode-range: U+0100-024F; }
      @font-face { font-family: N; font-weight: 200 1000; src: url(${font('Nunito-latin-3.woff2')}) format('woff2'); }
      html, body { margin: 0; width: 440px; height: 956px; overflow: hidden; }
      body { background: radial-gradient(circle at 50% 18%, ${c1}, ${c2} 75%); position: relative; }
      .rays { position: absolute; inset: 0; background: repeating-conic-gradient(from 0deg at 50% 16%, #ffffff10 0deg 9deg, transparent 9deg 22deg); }
      h1 { position: absolute; top: 28px; left: 0; right: 0; margin: 0; text-align: center; font: 50px/1.0 L; letter-spacing: 1px;
           background: linear-gradient(#fff7c2, #fbbf24 55%, #f59e0b); -webkit-background-clip: text; color: transparent;
           -webkit-text-stroke: 1.6px #2a1206; filter: drop-shadow(0 4px 0 #2a1206) drop-shadow(0 8px 14px #0008); }
      p { position: absolute; top: 140px; left: 10px; right: 10px; margin: 0; text-align: center; font: 900 17px N; color: #fff; text-shadow: 0 2px 0 #0008, 0 0 12px #0006; }
      .ph { position: absolute; left: 43px; top: 188px; width: 340px; height: 736px; padding: 7px; border-radius: 46px; background: #0b0d17; border: 2px solid #3a3f55; box-shadow: 0 20px 40px #000a, inset 0 0 0 1px #000; }
      .ph img { width: 340px; height: 736px; border-radius: 40px; display: block; object-fit: cover; object-position: top; }
    </style></head><body><div class="rays"></div><h1>${l1}<br>${l2}</h1><p>${sub}</p><div class="ph"><img src="${b64(`${SS}/raw${i + 1}.png`)}"></div></body></html>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/screenshot-${i + 1}.png` });
  }
  await b.close();
})();
