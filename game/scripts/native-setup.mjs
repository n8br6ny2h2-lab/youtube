// `npx cap add android|ios` sonrası bir kez çalıştırın: node scripts/native-setup.mjs
// Mağaza için gereken yerel ayarları ekler (idempotent — tekrar çalıştırmak güvenli).
// Kimlikleri aşağıdaki NATIVE nesnesinde kendi değerlerinizle değiştirin.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const NATIVE = {
  admobAndroidAppId: 'ca-app-pub-3940256099942544~3347511713', // TEST — kendi kimliğinizle değiştirin
  admobIosAppId: 'ca-app-pub-3940256099942544~1458002511',     // TEST — kendi kimliğinizle değiştirin
  playGamesAppId: '000000000000',                               // Play Console > Play Games Services > Yapılandırma
  googleReversedClientId: 'com.googleusercontent.apps.REPLACE_ME', // GoogleService-Info.plist içindeki REVERSED_CLIENT_ID
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
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
  if (!xml.includes('com.google.android.gms.ads.APPLICATION_ID')) xml = xml.replace(/<application\b([^>]*)>/, m => `${m}\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${NATIVE.admobAndroidAppId}" />`);
  if (!xml.includes('com.google.android.gms.games.APP_ID')) xml = xml.replace(/<application\b([^>]*)>/, m => `${m}\n        <meta-data android:name="com.google.android.gms.games.APP_ID" android:value="@string/game_services_project_id" />`);
  return xml;
});
patch(join(root, 'android/app/src/main/res/values/strings.xml'), xml =>
  xml.includes('game_services_project_id') ? xml : xml.replace('</resources>', `    <string name="game_services_project_id" translatable="false">${NATIVE.playGamesAppId}</string>\n</resources>`));

// ---------------- iOS ----------------
const plist = join(root, 'ios/App/App/Info.plist');
const addKey = (xml, key, valueXml) => xml.includes(`<key>${key}</key>`) ? xml : xml.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${valueXml}\n</dict>\n</plist>\n`);
patch(plist, xml => {
  xml = addKey(xml, 'GADApplicationIdentifier', `<string>${NATIVE.admobIosAppId}</string>`);
  xml = addKey(xml, 'NSUserTrackingUsageDescription', '<string>Reklamları sana daha uygun hale getirmek için kullanılır. İzin vermesen de oyunun tamamını oynayabilirsin.</string>');
  xml = addKey(xml, 'GKGameCenterBadgingDisabled', '<false/>');
  xml = addKey(xml, 'CFBundleURLTypes', `<array><dict><key>CFBundleURLSchemes</key><array><string>${NATIVE.googleReversedClientId}</string></array></dict></array>`);
  xml = addKey(xml, 'SKAdNetworkItems', '<array><dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict></array>');
  // yalnızca dikey ekran
  xml = xml.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/, '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2');
  xml = xml.replace(/(<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>)[\s\S]*?(<\/array>)/, '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>\n\t$2');
  return xml;
});

console.log(changed ? `\n${changed} dosya güncellendi.` : '\nDeğişiklik gerekmedi.');
console.log('Xcode\'da ayrıca: Signing & Capabilities > + Game Center, + Sign in with Apple, + In-App Purchase ekleyin.');
console.log('Firebase: android/app/google-services.json ve ios/App/App/GoogleService-Info.plist dosyalarını koyun.');
