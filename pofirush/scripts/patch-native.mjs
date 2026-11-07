// `npx cap add android/ios` sonrası yerel projeleri yayına hazır hale getirir (tekrar çalıştırmak güvenlidir):
//  • AdMob uygulama kimliği (Android manifest + iOS Info.plist)
//  • iOS: ATT izin metni, SKAdNetwork, yalnız dikey ekran, tam ekran, şifreleme beyanı,
//         Apple gizlilik bildirimi (PrivacyInfo.xcprivacy) — dosyayı yazar ve Xcode projesine ekler
//  • Android: yalnız dikey ekran, sürüm numarası package.json'dan
//
// YAYIN ÖNCESİ: aşağıdaki iki AdMob UYGULAMA kimliğini (~ içeren) kendi kimliklerinizle değiştirin
// veya ortam değişkeni verin:  ADMOB_APP_ID_ANDROID=... ADMOB_APP_ID_IOS=... npm run patch
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const ANDROID_APP_ID = process.env.ADMOB_APP_ID_ANDROID || 'ca-app-pub-3940256099942544~3347511713'; // Google TEST
const IOS_APP_ID = process.env.ADMOB_APP_ID_IOS || 'ca-app-pub-3940256099942544~1458002511';         // Google TEST
const ATT_TEXT = 'Your data is used to show you more relevant ads and keep the game free. / Verileriniz daha ilgili reklamlar göstermek ve oyunu ücretsiz tutmak için kullanılır.';
// Google'ın SKAdNetwork kimliği. Aracılık (mediation) ağları kullanırsanız onların kimliklerini de ekleyin:
// https://developers.google.com/admob/ios/quick-start#update_your_infoplist
const SKAD = ['cstr6suwn9.skadnetwork'];

const versionCode = (() => { const [a, b, c] = pkg.version.split('.').map(Number); return a * 10000 + b * 100 + c; })();
let changed = 0;
const edit = (file, fn) => {
  if (!existsSync(file)) return false;
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  if (after !== before) { writeFileSync(file, after); changed++; console.log('✓ güncellendi:', file.replace(root + '/', '')); }
  return true;
};

// ---------------- Android ----------------
const A = join(root, 'android/app/src/main');
if (edit(join(A, 'AndroidManifest.xml'), s => {
  if (!s.includes('com.google.android.gms.ads.APPLICATION_ID')) {
    s = s.replace(/(<application[^>]*>)/, `$1\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />`);
  }
  if (!s.includes('android:screenOrientation')) s = s.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"');
  return s;
})) {
  edit(join(A, 'res/values/strings.xml'), s => {
    if (s.includes('name="admob_app_id"')) return s.replace(/<string name="admob_app_id">[^<]*<\/string>/, `<string name="admob_app_id">${ANDROID_APP_ID}</string>`);
    return s.replace('</resources>', `    <string name="admob_app_id">${ANDROID_APP_ID}</string>\n</resources>`);
  });
  edit(join(root, 'android/app/build.gradle'), s => s
    .replace(/versionCode \d+/, `versionCode ${versionCode}`)
    .replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`));
} else console.log('android/ yok — önce: npx cap add android');

// ---------------- iOS ----------------
const plist = join(root, 'ios/App/App/Info.plist');
const setKey = (s, key, valueXml) => {
  const re = new RegExp(`\\s*<key>${key}</key>\\s*(<string>[^<]*</string>|<true/>|<false/>|<array>[\\s\\S]*?</array>)`);
  const entry = `\n\t<key>${key}</key>\n\t${valueXml}`;
  if (re.test(s)) return s.replace(re, entry);
  const i = s.lastIndexOf('</dict>');
  return s.slice(0, i) + entry.slice(1) + '\n' + s.slice(i);
};
if (!edit(plist, s => {
  s = setKey(s, 'GADApplicationIdentifier', `<string>${IOS_APP_ID}</string>`);
  s = setKey(s, 'NSUserTrackingUsageDescription', `<string>${ATT_TEXT}</string>`);
  s = setKey(s, 'SKAdNetworkItems', `<array>\n${SKAD.map(id => `\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>${id}</string>\n\t\t</dict>`).join('\n')}\n\t</array>`);
  s = setKey(s, 'UISupportedInterfaceOrientations', '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>');
  s = setKey(s, 'UISupportedInterfaceOrientations~ipad', '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>\n\t</array>');
  s = setKey(s, 'UIRequiresFullScreen', '<true/>');
  s = setKey(s, 'CFBundleLocalizations', '<array>\n\t\t<string>en</string>\n\t\t<string>tr</string>\n\t</array>'); // App Store'da TR + EN görünür
  s = setKey(s, 'ITSAppUsesNonExemptEncryption', '<false/>');
  s = setKey(s, 'CFBundleShortVersionString', `<string>${pkg.version}</string>`);
  s = setKey(s, 'CFBundleVersion', `<string>${versionCode}</string>`);
  return s;
})) console.log('ios/ yok — önce (macOS): npx cap add ios');

// ---------------- iOS gizlilik bildirimi (App Store zorunlu) ----------------
// Uygulamanın kendi kodu: UserDefaults (Capacitor Preferences ile kayıt yedeği) → gerekçe CA92.1.
// Toplanan veri: satın alma geçmişi (makbuz doğrulama, kimliğe bağlı değil, izleme yok).
// Reklam kimliği / izleme bildirimleri Google Mobile Ads SDK'nın kendi PrivacyInfo dosyasından gelir.
const PRIVACY = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyTrackingDomains</key>
	<array/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>CA92.1</string>
			</array>
		</dict>
	</array>
	<key>NSPrivacyCollectedDataTypes</key>
	<array>
		<dict>
			<key>NSPrivacyCollectedDataType</key>
			<string>NSPrivacyCollectedDataTypePurchaseHistory</string>
			<key>NSPrivacyCollectedDataTypeLinked</key>
			<false/>
			<key>NSPrivacyCollectedDataTypeTracking</key>
			<false/>
			<key>NSPrivacyCollectedDataTypePurposes</key>
			<array>
				<string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
`;
const iosApp = join(root, 'ios/App/App');
if (existsSync(iosApp)) {
  const pf = join(iosApp, 'PrivacyInfo.xcprivacy');
  if (!existsSync(pf) || readFileSync(pf, 'utf8') !== PRIVACY) { writeFileSync(pf, PRIVACY); changed++; console.log('✓ yazıldı: ios/App/App/PrivacyInfo.xcprivacy'); }
  const pbx = join(root, 'ios/App/App.xcodeproj/project.pbxproj');
  try {
    const xcode = createRequire(import.meta.url)('xcode');
    const proj = xcode.project(pbx); proj.parseSync();
    if (!readFileSync(pbx, 'utf8').includes('PrivacyInfo.xcprivacy')) {
      const groups = proj.hash.project.objects.PBXGroup;
      const appGroup = Object.keys(groups).find(k => groups[k].path === 'App' || groups[k].name === 'App');
      proj.addResourceFile('PrivacyInfo.xcprivacy', {}, appGroup);
      const out = proj.writeSync().replace(/(\/\* PrivacyInfo\.xcprivacy \*\/ = )\{isa = PBXFileReference;[^}]*\}/,
        '$1{isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; }');
      writeFileSync(pbx, out); changed++;
      console.log('✓ Xcode projesine eklendi: PrivacyInfo.xcprivacy');
    }
  } catch (e) { console.log('⚠ PrivacyInfo.xcprivacy Xcode projesine eklenemedi; Xcode\'da App klasörüne sürükleyip "App" hedefini işaretleyin.', e.message); }
}

console.log(changed ? `Bitti (${changed} dosya).` : 'Zaten güncel.');
if (ANDROID_APP_ID.includes('3940256099942544') || IOS_APP_ID.includes('3940256099942544')) console.log('⚠ AdMob TEST uygulama kimlikleri kullanılıyor — yayından önce kendi kimliklerinizi girin.');
