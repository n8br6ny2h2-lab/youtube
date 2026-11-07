// `npx cap add android|ios` sonrası bir kez çalıştırın: node scripts/native-setup.mjs
// Mağaza için gereken yerel ayarları ekler (idempotent — tekrar çalıştırmak güvenli).
// Kimlikleri aşağıdaki NATIVE nesnesinde kendi değerlerinizle değiştirin.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NATIVE = {
  admobAndroidAppId: 'ca-app-pub-3940256099942544~3347511713', // TEST — kendi kimliğinizle değiştirin
  admobIosAppId: 'ca-app-pub-3940256099942544~1458002511',     // TEST — kendi kimliğinizle değiştirin
  playGamesAppId: '000000000000',                               // Play Console > Play Games Services > Yapılandırma
  googleReversedClientId: 'com.googleusercontent.apps.REPLACE_ME', // GoogleService-Info.plist içindeki REVERSED_CLIENT_ID
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { FEATURES } = await import(pathToFileURL(join(root, 'js/features.js')).href);
console.log('Özellikler:', JSON.stringify(FEATURES));
const FIREBASE = FEATURES.accounts || FEATURES.apple; // Firebase (giriş) kullanan her mod
let changed = 0;
const patch = (file, fn) => {
  if (!existsSync(file)) return console.log('atlandı (yok):', file);
  const before = readFileSync(file, 'utf8'), after = fn(before);
  if (after !== before) { writeFileSync(file, after); changed++; console.log('güncellendi:', file); }
  else console.log('zaten hazır:', file);
};

// ---------------- Android ----------------
patch(join(root, 'android/app/src/main/AndroidManifest.xml'), xml => {
  if (!xml.includes('android:screenOrientation')) xml = xml.replace(/<activity\b/, '<activity\n            android:screenOrientation="portrait"');
  if (!xml.includes('POST_NOTIFICATIONS')) xml = xml.replace('</manifest>', '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n</manifest>');
  if (FEATURES.ads && !xml.includes('com.google.android.gms.ads.APPLICATION_ID')) xml = xml.replace(/<application\b([^>]*)>/, m => `${m}\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${NATIVE.admobAndroidAppId}" />`);
  if (FEATURES.accounts && !xml.includes('com.google.android.gms.games.APP_ID')) xml = xml.replace(/<application\b([^>]*)>/, m => `${m}\n        <meta-data android:name="com.google.android.gms.games.APP_ID" android:value="@string/game_services_project_id" />`);
  return xml;
});
if (FEATURES.accounts) patch(join(root, 'android/app/src/main/res/values/strings.xml'), xml =>
  xml.includes('game_services_project_id') ? xml : xml.replace('</resources>', `    <string name="game_services_project_id" translatable="false">${NATIVE.playGamesAppId}</string>\n</resources>`));

// ---------------- iOS ----------------
const plist = join(root, 'ios/App/App/Info.plist');
const addKey = (xml, key, valueXml) => xml.includes(`<key>${key}</key>`) ? xml : xml.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${valueXml}\n</dict>\n</plist>\n`);
patch(plist, xml => {
  if (FEATURES.ads) {
    xml = addKey(xml, 'GADApplicationIdentifier', `<string>${NATIVE.admobIosAppId}</string>`);
    xml = addKey(xml, 'NSUserTrackingUsageDescription', '<string>Reklamları sana daha uygun hale getirmek için kullanılır. İzin vermesen de oyunun tamamını oynayabilirsin.</string>');
    xml = addKey(xml, 'SKAdNetworkItems', '<array><dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict></array>');
  }
  if (FEATURES.accounts) {
    xml = addKey(xml, 'GKGameCenterBadgingDisabled', '<false/>');
    xml = addKey(xml, 'CFBundleURLTypes', `<array><dict><key>CFBundleURLSchemes</key><array><string>${NATIVE.googleReversedClientId}</string></array></dict></array>`);
  }
  // yalnızca dikey ekran
  xml = xml.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/, '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2');
  xml = xml.replace(/(<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>)[\s\S]*?(<\/array>)/, '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>\n\t$2');
  return xml;
});


// ---------------- Sürüm numaraları (package.json + BUILD_NUMBER) ----------------
const pkgVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const build = process.env.BUILD_NUMBER || '1';

// ---------------- Android: Google / Play Oyunlar girişi + sürüm ----------------
if (FEATURES.accounts) patch(join(root, 'android/variables.gradle'), g => g.includes('rgcfaIncludeGoogle') ? g
  : g.replace(/ext \{/, "ext {\n    rgcfaIncludeGoogle = true\n    androidxCredentialsVersion = '1.3.0'"));
patch(join(root, 'android/app/build.gradle'), g => g
  .replace(/versionCode \d+/, `versionCode ${build}`)
  .replace(/versionName "[^"]*"/, `versionName "${pkgVersion}"`));

// ---------------- iOS: yetkiler, Firebase dosyası, sadece iPhone, sürüm ----------------
const ent = join(root, 'ios/App/App/App.entitlements');
if (FIREBASE && existsSync(join(root, 'ios/App/App')) && !existsSync(ent)) {
  writeFileSync(ent, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.applesignin</key>
\t<array><string>Default</string></array>${FEATURES.accounts ? `
\t<key>com.apple.developer.game-center</key>
\t<true/>` : ''}
</dict>
</plist>
`); changed++; console.log('oluşturuldu:', ent);
}
patch(plist, xml => addKey(xml, 'ITSAppUsesNonExemptEncryption', '<false/>'));
const hasFirebasePlist = existsSync(join(root, 'ios/App/App/GoogleService-Info.plist'));
patch(join(root, 'ios/App/App.xcodeproj/project.pbxproj'), p => {
  if (FIREBASE && !p.includes('CODE_SIGN_ENTITLEMENTS')) p = p.replace(/(\t+)INFOPLIST_FILE = App\/Info\.plist;/g, '$1CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n$1INFOPLIST_FILE = App/Info.plist;');
  p = p.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = 1;');
  p = p.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${pkgVersion};`).replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);
  // GoogleService-Info.plist dosyasını projeye ve "Copy Bundle Resources" adımına kaydet
  if (FIREBASE && hasFirebasePlist && !p.includes('GoogleService-Info.plist')) {
    const F = 'E5F0A1B2C3D4E5F6A7B8C901', B = 'E5F0A1B2C3D4E5F6A7B8C902';
    p = p.replace('/* End PBXBuildFile section */', `\t\t${B} /* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = ${F} /* GoogleService-Info.plist */; };\n/* End PBXBuildFile section */`);
    p = p.replace('/* End PBXFileReference section */', `\t\t${F} /* GoogleService-Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "GoogleService-Info.plist"; sourceTree = "<group>"; };\n/* End PBXFileReference section */`);
    p = p.replace(/(\t+)(\w+) \/\* capacitor\.config\.json \*\/,\n/, (m, tab) => `${m}${tab}${F} /* GoogleService-Info.plist */,\n`);
    p = p.replace(/(\t+)(\w+) \/\* capacitor\.config\.json in Resources \*\/,\n/, (m, tab) => `${m}${tab}${B} /* GoogleService-Info.plist in Resources */,\n`);
  }
  return p;
});

console.log(changed ? `\n${changed} dosya güncellendi.` : '\nDeğişiklik gerekmedi.');
if (FIREBASE) {
  console.log('Yetkiler (Apple ile Giriş' + (FEATURES.accounts ? ', Game Center' : '') + ') App.entitlements ile eklendi; Xcode otomatik imzalamada bunları App ID\'ye kendisi işler.');
  console.log('Firebase: android/app/google-services.json ve ios/App/App/GoogleService-Info.plist dosyalarını koyun.');
}
