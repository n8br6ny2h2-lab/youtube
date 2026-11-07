// Gizlilik politikası ve kullanım şartlarındaki {{...}} alanlarını doldurur.
// Kullanım:
//   node scripts/legal-fill.mjs --ad "Ad Soyad veya Şirket" --eposta destek@ornek.com --adres "İl, Türkiye" \
//        --barindirma "Hetzner Online GmbH" --ulke "Almanya"
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => {
  const i = s.indexOf(' '); return [s.slice(0, i).trim(), s.slice(i + 1).trim().replace(/^"|"$/g, '')];
}));
const root0 = join(dirname(fileURLToPath(import.meta.url)), '..');
const { FEATURES } = await import(pathToFileURL(join(root0, 'js/features.js')).href);
// Sunucu yalnızca hesap/bulut açıkken kullanılır; kapalıyken barındırma bilgisi gerekmez
const need = FEATURES.accounts ? ['ad', 'eposta', 'adres', 'barindirma', 'ulke'] : ['ad', 'eposta', 'adres'];
if (!FEATURES.accounts) { args.barindirma ||= 'Bu sürümde sunucu kullanılmıyor'; args.ulke ||= '—'; }
const missing = need.filter(k => !args[k]);
if (missing.length) { console.error('Eksik: ' + missing.map(k => '--' + k).join(' ')); process.exit(1); }
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(args.eposta)) { console.error('E-posta geçersiz'); process.exit(1); }

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const map = { GELISTIRICI: args.ad, EPOSTA: args.eposta, ADRES: args.adres, BARINDIRMA_SAGLAYICISI: args.barindirma, SUNUCU_ULKESI: args.ulke, TARIH: date };
const root = root0;
const VERSION = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
for (const f of ['legal/privacy.html', 'legal/terms.html', 'legal/support.html']) {
  const p = join(root, f);
  let s = readFileSync(p, 'utf8');
  for (const [k, v] of Object.entries(map)) s = s.split(`{{${k}}}`).join(esc(v));
  // Sürüm notu: bu sürümde hangi özellikler var (js/features.js)
  const ACC = FEATURES.accounts || FEATURES.apple;
  const noteTr = !ACC && !FEATURES.ads
    ? '<p class="note"><b>Bu sürümde (v' + VERSION + ')</b> hesap bağlama, bulut kaydı, sıralama ve reklam <b>bulunmaz</b>. Oyun kişisel veri toplamaz ve bize hiçbir veri göndermez; ilerlemen yalnızca cihazında saklanır. Aşağıdaki hesap ve reklam bölümleri bu özellikler eklendiğinde geçerli olacaktır.</p>'
    : '<p class="note">Bu sürümde: ' + [ACC && (FEATURES.accounts ? 'hesap bağlama ve bulut kaydı' : 'Apple ile Giriş ve bulut kaydı (sıralama yok)'), FEATURES.ads && 'ödüllü reklamlar'].filter(Boolean).join(', ') + ' etkindir.</p>';
  const noteEn = !ACC && !FEATURES.ads
    ? '<p class="note"><b>In this version (v' + VERSION + ')</b> there is <b>no</b> account linking, cloud save, leaderboard or advertising. The Game collects no personal data and sends nothing to us; your progress is stored only on your device. The account and advertising sections below apply once those features are added.</p>'
    : '<p class="note">Enabled in this version: ' + [ACC && (FEATURES.accounts ? 'account linking and cloud save' : 'Sign in with Apple and cloud save (no leaderboard)'), FEATURES.ads && 'rewarded ads'].filter(Boolean).join(', ') + '.</p>';
  s = s.replace(/<!--SURUM_NOTU_TR-->[\s\S]*?<!--\/SURUM_NOTU_TR-->/, `<!--SURUM_NOTU_TR-->${noteTr}<!--/SURUM_NOTU_TR-->`)
       .replace(/<!--SURUM_NOTU_EN-->[\s\S]*?<!--\/SURUM_NOTU_EN-->/, `<!--SURUM_NOTU_EN-->${noteEn}<!--/SURUM_NOTU_EN-->`);
  writeFileSync(p, s);
  const left = s.match(/\{\{[A-Z_]+\}\}/g);
  console.log(`${f}: ${left ? 'KALAN ' + [...new Set(left)].join(', ') : 'hazır ✓'}`);
}
// destek e-postası oyuna da yazılsın
const sp = join(root, 'js/services.js');
writeFileSync(sp, readFileSync(sp, 'utf8').replace(/supportEmail: '[^']*'/, `supportEmail: '${args.eposta}'`));
console.log('js/services.js: supportEmail =', args.eposta);
