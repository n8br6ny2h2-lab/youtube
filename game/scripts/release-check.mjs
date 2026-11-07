// Yayın öncesi kontrol: mağazaya yüklemeden önce `npm run release-check`
// ❌ = yükleme engeli, ⚠️ = önerilen, ✅ = hazır
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { FEATURES } = await import(pathToFileURL(join(root, 'js/features.js')).href);
const IOS_ONLY = process.argv.includes('--ios');   // yalnızca App Store'a çıkılıyorsa
const plat = IOS_ONLY ? 'App Store' : 'App Store + Google Play';
console.log(`Kontrol: ${plat} • hesaplar ${FEATURES.accounts ? 'AÇIK' : 'kapalı'} • reklamlar ${FEATURES.ads ? 'AÇIK' : 'kapalı'}\n`);
const read = f => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : '');
const rows = [];
const check = (ok, level, text, fix) => rows.push({ ok, level, text, fix });

const services = read('js/services.js'), data = read('js/data.js'), cap = JSON.parse(read('capacitor.config.json') || '{}');
const native = read('scripts/native-setup.mjs'), pkg = JSON.parse(read('package.json') || '{}');

// --- kimlikler ve yapılandırma
check(cap.appId && cap.appId !== 'com.efsunavcisi.game', 'warn', `Paket kimliği: ${cap.appId}`, 'capacitor.config.json > appId (ör. com.sirketin.efsunavcisi). Mağazaya ilk yüklemeden sonra DEĞİŞTİRİLEMEZ.');
if (FEATURES.ads) check(!/ca-app-pub-3940256099942544/.test(services), 'block', 'AdMob reklam birimi kimlikleri', 'js/services.js > CONFIG.admob: AdMob konsolundaki ödüllü reklam birimi kimliklerini yazın (şu an Google TEST kimlikleri).');
if (FEATURES.ads) check(!/ca-app-pub-3940256099942544/.test(native) && !/ca-app-pub-3940256099942544/.test(JSON.stringify(cap)), 'block', 'AdMob uygulama kimlikleri', 'scripts/native-setup.mjs ve capacitor.config.json > AdMob: kendi uygulama kimliklerinizi yazın.');
if (FEATURES.accounts && !IOS_ONLY) check(!/playGamesAppId: '000000000000'/.test(native), 'block', 'Google Play Oyunlar proje kimliği', 'scripts/native-setup.mjs > playGamesAppId');
if (FEATURES.accounts) check(!/REPLACE_ME/.test(native), 'block', 'Google ile Giriş REVERSED_CLIENT_ID (iOS)', 'scripts/native-setup.mjs > googleReversedClientId');
if (FEATURES.accounts) check(/cloudUrl: 'https:\/\//.test(services), 'warn', 'Bulut kaydı / sıralama sunucusu', "js/services.js > CONFIG.cloudUrl (ör. 'https://api.alanadin.com'). Boşsa bulut kaydı ve sıralama 'yakında' olarak görünür.");
check(/supportEmail: '[^']+@/.test(services), 'block', 'Destek e-postası', 'npm run legal-fill -- ... (ya da js/services.js > supportEmail). Mağazalar destek iletişimi ister.');
check(/validatorUrl: 'https:\/\//.test(services), 'info', 'Makbuz doğrulama sunucusu', 'server/validate.mjs kurup CONFIG.validatorUrl yazın (sahte satın almaları engeller).');
// --- yasal
for (const f of ['legal/privacy.html', 'legal/terms.html', 'legal/support.html']) {
  const left = (read(f).match(/\{\{[A-Z_]+\}\}/g) || []);
  check(!left.length, 'block', `${f} doldurulmuş`, `npm run legal-fill -- --ad "..." --eposta ... --adres "..." --barindirma "..." --ulke "..."  (kalan: ${[...new Set(left)].join(', ')})`);
}
check(false, 'info', 'Gizlilik politikasını herkese açık bir adreste yayınlayın', 'legal/privacy.html dosyasını kendi sitenize/GitHub Pages\'e koyup adresini App Store Connect ve Play Console formlarına yazın.');
// --- dosyalar
if (FEATURES.accounts && !IOS_ONLY) check(existsSync(join(root, 'android/app/google-services.json')), existsSync(join(root, 'android')) ? 'block' : 'info', 'Firebase: android/app/google-services.json', 'Firebase konsolu > Android uygulaması ekle > dosyayı indirin.');
if (FEATURES.accounts || FEATURES.apple) check(existsSync(join(root, 'ios/App/App/GoogleService-Info.plist')), existsSync(join(root, 'ios')) ? 'block' : 'info', 'Firebase: ios/App/App/GoogleService-Info.plist', 'Firebase konsolu > iOS uygulaması ekle > dosyayı Xcode\'a ekleyin.');
check(existsSync(join(root, 'assets/icon-only.png')) && existsSync(join(root, 'assets/splash.png')), 'block', 'Uygulama ikonu ve açılış ekranı kaynakları', 'assets/ klasörü');
const shots = d => (existsSync(join(root, 'store', d)) ? readdirSync(join(root, 'store', d)).filter(f => f.startsWith('screenshot-')).length : 0);
check(shots('app-store') >= 3, 'block', `App Store ekran görüntüleri (${shots('app-store')} adet, 1320×2868)`, 'store/app-store/');
if (!IOS_ONLY) check(shots('google-play') >= 2, 'block', `Google Play ekran görüntüleri (${shots('google-play')} adet, 1080×1920)`, 'store/google-play/');
if (!IOS_ONLY) check(existsSync(join(root, 'store/google-play/feature-graphic.png')), 'block', 'Google Play öne çıkan görsel (1024×500)', 'store/google-play/feature-graphic.png');
// --- kod sağlığı
check(!/initializeForTesting: true/.test(services), 'block', 'Reklamlar test modunda sabitlenmemiş', 'js/services.js');
const inc = cap.ios?.includePlugins || [];
check(FEATURES.ads === inc.includes('@capacitor-community/admob') && (FEATURES.accounts || FEATURES.apple) === inc.includes('@capacitor-firebase/authentication') && !!FEATURES.apple === inc.includes('@capacitor-firebase/firestore'), 'block',
  'Uygulama paketine giren eklentiler özellik anahtarlarıyla uyumlu', 'npm run features');
check(/isNativePlatform/.test(read('js/main.js')) && /this.device && !this.native/.test(services), 'block', 'Telefonda test mağazasına düşme koruması', 'js/services.js > Store.buy');
check(pkg.version === (data.match(/version: '([^']+)'/) || [])[1], 'warn', `Sürüm uyumu: package.json ${pkg.version} / oyun ${(data.match(/version: '([^']+)'/) || [])[1]}`, 'package.json ve js/data.js > GAME.version aynı olmalı; Xcode/Gradle sürüm numarasını da artırın.');

const icon = { block: '❌', warn: '⚠️ ', info: 'ℹ️ ' };
let blockers = 0;
for (const r of rows) {
  if (r.ok) { console.log(`✅ ${r.text}`); continue; }
  if (r.level === 'block') blockers++;
  console.log(`${icon[r.level]} ${r.text}\n     → ${r.fix}`);
}
console.log(blockers ? `\n${blockers} engel var. Bunlar çözülmeden mağazaya yüklemeyin.` : '\nYüklemeye hazır görünüyor. 🚀');
process.exitCode = blockers ? 1 : 0;
