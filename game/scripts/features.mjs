// js/features.js'teki anahtarlara göre hangi yerel eklentilerin uygulama paketine gireceğini ayarlar.
// `npx cap add/sync` öncesinde çalıştırın: node scripts/features.mjs
// Bir anahtarı açmak için: node scripts/features.mjs --on apple   (js/features.js dosyasını günceller)
// Kapalı özelliğin eklentisi pakete hiç girmez (reklam SDK'sı, izleme izni, Firebase yok).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const featPath = join(root, 'js/features.js');
const on = process.argv.indexOf('--on');
if (on > 0) {
  const key = process.argv[on + 1];
  const src = readFileSync(featPath, 'utf8');
  if (!new RegExp(`\\b${key}: (true|false)`).test(src)) { console.error('Bilinmeyen özellik:', key); process.exit(1); }
  writeFileSync(featPath, src.replace(new RegExp(`\\b${key}: false`), `${key}: true`));
  console.log(`Özellik açıldı: ${key}`);
}
const { FEATURES } = await import(pathToFileURL(featPath).href + '?t=' + Date.now());

const NOT_PLUGINS = new Set(['@capacitor/core', '@capacitor/cli', '@capacitor/ios', '@capacitor/android', 'firebase']);
// eklenti → onu gerektiren özellikler (biri açıksa eklenti pakete girer)
const OPTIONAL = {
  '@capacitor-community/admob': ['ads'],
  '@capacitor-firebase/authentication': ['accounts', 'apple'],
  '@capacitor-firebase/firestore': ['apple'],
};

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const disabled = Object.entries(OPTIONAL).filter(([, fs]) => !fs.some(f => FEATURES[f])).map(([p]) => p);
const include = Object.keys(pkg.dependencies).filter(d => !NOT_PLUGINS.has(d) && !disabled.includes(d)).sort();

const cfgPath = join(root, 'capacitor.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
cfg.ios = { ...cfg.ios, includePlugins: include };
cfg.android = { ...cfg.android, includePlugins: include };
// Google ile Giriş yalnızca "accounts" modunda; Apple için ek SPM trait gerekmez
const traits = cfg.experimental?.ios?.spm?.packageTraits;
if (traits && !FEATURES.accounts) delete traits['@capacitor-firebase/authentication'];
if (traits && FEATURES.accounts) traits['@capacitor-firebase/authentication'] = ['Google'];
// Firebase giriş sağlayıcıları: yalnızca Apple modunda sadece apple.com
if (cfg.plugins?.FirebaseAuthentication) cfg.plugins.FirebaseAuthentication.providers = FEATURES.accounts ? ['apple.com', 'gc.apple.com', 'google.com', 'playgames.google.com'] : ['apple.com'];
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');

console.log('Özellikler:', JSON.stringify(FEATURES));
console.log('Pakete girecek eklentiler:', include.join(', '));
if (disabled.length) console.log('Dışarıda bırakılan:', disabled.join(', '));
