// Yayın öncesi kontrol: App Store / Google Play'e göndermeden önce çalıştırın →  npm run preflight
// ❌ = gönderim reddedilir veya gelir oluşmaz (mutlaka düzeltin) · ⚠ = önerilir · ✅ = tamam
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => readFileSync(join(root, f), 'utf8');
const has = f => existsSync(join(root, f));
let errors = 0, warns = 0;
const ok = m => console.log('✅ ' + m);
const bad = m => { errors++; console.log('❌ ' + m); };
const warn = m => { warns++; console.log('⚠  ' + m); };
const check = (cond, good, fail, level = 'error') => (cond ? ok(good) : level === 'error' ? bad(fail) : warn(fail));

const { GAME, ADS, PRODUCTS } = await import(pathToFileURL(join(root, 'js/config.js')).href);
const pkg = JSON.parse(rd('package.json'));
const cap = JSON.parse(rd('capacitor.config.json'));
const TEST = '3940256099942544';

console.log('\n— Uygulama kimliği ve sürüm');
check(cap.appId !== 'com.pofirush.game', `Paket adı: ${cap.appId}`, 'capacitor.config.json → appId hâlâ örnek değer (com.pofirush.game). Kendi alan adınıza göre değiştirin', 'warn');
check(/^\d+\.\d+\.\d+$/.test(pkg.version) && pkg.version === GAME.version, `Sürüm ${pkg.version} (package.json = config.js)`, `Sürüm uyuşmuyor: package.json ${pkg.version}, config.js ${GAME.version}`);

console.log('\n— Reklamlar (AdMob)');
check(!ADS.testing, 'ADS.testing = false', 'js/config.js → ADS.testing = true (yayında false olmalı)');
const units = [ADS.android.rewarded, ADS.android.interstitial, ADS.ios.rewarded, ADS.ios.interstitial];
check(!units.some(u => u.includes(TEST)), 'Reklam birimi kimlikleri gerçek', 'js/config.js → ADS içinde Google TEST reklam birimleri var (gelir oluşmaz)');
if (has('ios/App/App/Info.plist')) {
  const pl = rd('ios/App/App/Info.plist');
  check(!pl.includes(TEST), 'iOS AdMob uygulama kimliği gerçek', 'Info.plist → GADApplicationIdentifier TEST kimliği. ADMOB_APP_ID_IOS=... npm run patch');
}
if (has('android/app/src/main/res/values/strings.xml')) check(!rd('android/app/src/main/res/values/strings.xml').includes(TEST), 'Android AdMob uygulama kimliği gerçek', 'strings.xml → admob_app_id TEST kimliği. ADMOB_APP_ID_ANDROID=... npm run patch');

console.log('\n— Bağlantılar ve yasal metinler');
check(!/example\.com/.test(GAME.privacyUrl), 'Gizlilik politikası adresi girilmiş', 'js/config.js → GAME.privacyUrl örnek adres (Apple ve Google zorunlu tutar)');
check(!/example\.com/.test(GAME.termsUrl), 'Kullanım koşulları adresi girilmiş', 'js/config.js → GAME.termsUrl örnek adres', 'warn');
check(!/example\.com/.test(GAME.supportEmail), 'Destek e-postası girilmiş', 'js/config.js → GAME.supportEmail örnek adres');
check(!/id0{6,}/.test(GAME.iosUrl), 'App Store bağlantısı girilmiş', 'js/config.js → GAME.iosUrl hâlâ id0000000000 (App Store Connect\'te uygulama açılınca gelen sayısal kimliği yazın; puanlama ve paylaşım bunu kullanır)', 'warn');
check(!/\[(E-POSTA|ŞİRKET|ADRES|EMAIL|COMPANY|ADDRESS)/.test(rd('store-listing/privacy-policy.md')), 'Gizlilik politikası şablonu doldurulmuş', 'store-listing/privacy-policy.md içindeki [E-POSTA] / [ŞİRKET] alanları boş', 'warn');

console.log('\n— Satın alma');
const svc = rd('js/services.js');
check(/VALIDATOR_URL = '.+'/.test(svc), 'Makbuz doğrulama sunucusu bağlı', 'js/services.js → VALIDATOR_URL boş (hileli satın almalara karşı önerilir)', 'warn');
ok(`${PRODUCTS.length} ürün tanımlı: ${PRODUCTS.map(p => p.id).join(', ')} → App Store Connect'te aynı kimliklerle açılmalı`);
check(rd('js/main.js').includes("t('restore')"), '"Satın alımları geri yükle" düğmesi var', 'Geri yükleme düğmesi yok (Apple 3.1.1)');

console.log('\n— iOS projesi');
if (!has('ios/App/App/Info.plist')) warn('ios/ klasörü yok → macOS\'ta: npm run native:init');
else {
  const pl = rd('ios/App/App/Info.plist');
  for (const [k, d] of [['NSUserTrackingUsageDescription', 'ATT izin metni'], ['GADApplicationIdentifier', 'AdMob uygulama kimliği'], ['SKAdNetworkItems', 'SKAdNetwork'], ['ITSAppUsesNonExemptEncryption', 'Şifreleme beyanı'], ['UIRequiresFullScreen', 'iPad tam ekran']]) check(pl.includes(`<key>${k}</key>`), d, `Info.plist → ${k} yok (npm run patch)`);
  check(!pl.includes('UIInterfaceOrientationLandscape'), 'Yalnız dikey ekran', 'Info.plist yatay yönleri içeriyor (npm run patch)');
  check(has('ios/App/App/PrivacyInfo.xcprivacy') && rd('ios/App/App.xcodeproj/project.pbxproj').includes('PrivacyInfo.xcprivacy in Resources'), 'Gizlilik bildirimi (PrivacyInfo.xcprivacy) projede', 'PrivacyInfo.xcprivacy yok veya Xcode hedefine eklenmemiş (npm run patch) — Apple bunsuz yüklemeyi reddeder');
  const iconDir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
  const icons = has(iconDir) ? readdirSync(join(root, iconDir)).filter(f => f.endsWith('.png')) : [];
  if (!icons.length) bad('iOS uygulama simgesi yok (npm run assets)');
  else {
    // PNG renk tipi baytı: 2 = RGB (alfa yok), 6 = RGBA. App Store simgesinde alfa kanalı olamaz.
    const alpha = icons.filter(f => { const b = readFileSync(join(root, iconDir, f)); return b[25] === 6 || b[25] === 4; });
    check(!alpha.length, `Uygulama simgesi alfa kanalsız (${icons.length} dosya)`, `Simgede alfa kanalı var: ${alpha.join(', ')} (App Store reddeder)`);
  }
}

console.log('\n— Mağaza görselleri');
const shots = has('store-listing/screenshots') ? readdirSync(join(root, 'store-listing/screenshots')) : [];
const size = f => { const b = readFileSync(join(root, 'store-listing/screenshots', f)); if (b[0] === 0x89) return [b.readUInt32BE(16), b.readUInt32BE(20)]; for (let i = 2; i < b.length;) { const m = b[i + 1], l = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + l; } return [0, 0]; };
for (const [pre, w, h, name] of [['ios-', 1290, 2796, 'iPhone 6.9"'], ['ipad-', 2064, 2752, 'iPad 13"'], ['android-', 1080, 1920, 'Android']]) {
  const list = shots.filter(f => f.startsWith(pre));
  const wrong = list.filter(f => { const [a, b] = size(f); return a !== w || b !== h; });
  check(list.length >= 3 && !wrong.length, `${name}: ${list.length} görüntü, ${w}×${h}`, `${name} ekran görüntüleri eksik/yanlış boyut (${wrong.join(', ') || 'yok'}) → node scripts/store-shots.mjs`);
}

console.log('\n— Kod ve içerik');
const all = ['js/main.js', 'js/engine.js', 'js/config.js', 'js/i18n.js', 'js/services.js', 'store-listing/listing.md'].map(rd).join('\n');
check(!/flappy/i.test(all), 'Başka oyunun adı geçmiyor', '"Flappy" ifadesi var — Apple 4.1/2.3.7 (yanıltıcı meta veri) nedeniyle reddeder');
try { for (const f of readdirSync(join(root, 'js'))) execFileSync(process.execPath, ['--check', join(root, 'js', f)]); ok('JavaScript söz dizimi temiz'); } catch (e) { bad('JavaScript söz dizimi hatası: ' + e.message.split('\n')[0]); }

console.log(`\n${errors ? `❌ ${errors} engelleyici sorun` : '✅ Engelleyici sorun yok'} · ⚠ ${warns} uyarı\n`);
process.exit(errors ? 1 : 0);
