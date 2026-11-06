// Gizlilik politikası ve kullanım şartlarındaki {{...}} alanlarını doldurur.
// Kullanım:
//   node scripts/legal-fill.mjs --ad "Ad Soyad veya Şirket" --eposta destek@ornek.com --adres "İl, Türkiye" \
//        --barindirma "Hetzner Online GmbH" --ulke "Almanya"
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => {
  const i = s.indexOf(' '); return [s.slice(0, i).trim(), s.slice(i + 1).trim().replace(/^"|"$/g, '')];
}));
const need = ['ad', 'eposta', 'adres', 'barindirma', 'ulke'];
const missing = need.filter(k => !args[k]);
if (missing.length) { console.error('Eksik: ' + missing.map(k => '--' + k).join(' ')); process.exit(1); }
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(args.eposta)) { console.error('E-posta geçersiz'); process.exit(1); }

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const map = { GELISTIRICI: args.ad, EPOSTA: args.eposta, ADRES: args.adres, BARINDIRMA_SAGLAYICISI: args.barindirma, SUNUCU_ULKESI: args.ulke, TARIH: date };
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['legal/privacy.html', 'legal/terms.html']) {
  const p = join(root, f);
  let s = readFileSync(p, 'utf8');
  for (const [k, v] of Object.entries(map)) s = s.split(`{{${k}}}`).join(esc(v));
  writeFileSync(p, s);
  const left = s.match(/\{\{[A-Z_]+\}\}/g);
  console.log(`${f}: ${left ? 'KALAN ' + [...new Set(left)].join(', ') : 'hazır ✓'}`);
}
// destek e-postası oyuna da yazılsın
const sp = join(root, 'js/services.js');
writeFileSync(sp, readFileSync(sp, 'utf8').replace(/supportEmail: '[^']*'/, `supportEmail: '${args.eposta}'`));
console.log('js/services.js: supportEmail =', args.eposta);
