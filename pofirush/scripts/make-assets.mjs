// icon.svg'den @capacitor/assets'in beklediği PNG'leri üretir (Playwright/Chromium ile).
// Sonra: npx @capacitor/assets generate  → tüm Android mipmap ve iOS AppIcon/Splash boyutları oluşur.
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets'); mkdirSync(out, { recursive: true });
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { console.log('Playwright yok: assets/ klasöründeki hazır PNG dosyaları kullanılacak.'); process.exit(0); }

const svg = readFileSync(join(root, 'icon.svg'), 'utf8');
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const bgOnly = inner.replace(/<g transform[\s\S]*<\/g>/, '');
const birdOnly = svg.match(/<defs>[\s\S]*?<\/defs>/)[0] + (inner.match(/<g transform[\s\S]*<\/g>/) || [''])[0];
const page = await (await chromium.launch()).newPage();
async function render(file, size, body, bg = 'transparent') {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${bg}">${body}</body></html>`);
  await page.screenshot({ path: join(out, file), omitBackground: bg === 'transparent' });
  console.log('✓', file);
}
const wrap = (content, vb = '0 0 1024 1024', size = '100%') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}" style="display:block">${content}</svg>`;
await render('icon-only.png', 1024, wrap(inner));
await render('icon-background.png', 1024, wrap(bgOnly));
// Uyarlanabilir simge ön katmanı: güvenli alan için %66 ölçekte ortalanır
await render('icon-foreground.png', 1024, wrap(`<g transform="translate(174 174) scale(0.66)">${birdOnly}</g>`));
const splash = dark => wrap(`<rect width="2732" height="2732" fill="${dark ? '#0b0718' : '#1b1035'}"/>
  <g transform="translate(1066 966) scale(0.58)">${svg.match(/<defs>[\s\S]*?<\/defs>/)[0]}<rect width="1024" height="1024" rx="230" fill="url(#bg)"/>${(inner.match(/<g transform[\s\S]*<\/g>/) || [''])[0]}</g>
  <text x="1366" y="1720" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-style="italic" font-size="190" fill="#ffd23f">Pofi <tspan fill="#7ee7ff">RUSH</tspan></text>`, '0 0 2732 2732');
await render('splash.png', 2732, splash(false));
await render('splash-dark.png', 2732, splash(true));
process.exit(0);
