// js/features.js'teki anahtarlara göre hangi yerel eklentilerin uygulama paketine gireceğini ayarlar.
// `npx cap add/sync` öncesinde çalıştırın: node scripts/features.mjs
// Kapalı özelliğin eklentisi pakete hiç girmez (reklam SDK'sı, izleme izni, Firebase yok).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { FEATURES } = await import(pathToFileURL(join(root, 'js/features.js')).href);

const NOT_PLUGINS = new Set(['@capacitor/core', '@capacitor/cli', '@capacitor/ios', '@capacitor/android', 'firebase']);
const OPTIONAL = { ads: ['@capacitor-community/admob'], accounts: ['@capacitor-firebase/authentication'] };

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const disabled = Object.entries(OPTIONAL).filter(([f]) => !FEATURES[f]).flatMap(([, p]) => p);
const include = Object.keys(pkg.dependencies).filter(d => !NOT_PLUGINS.has(d) && !disabled.includes(d)).sort();

const cfgPath = join(root, 'capacitor.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
cfg.ios = { ...cfg.ios, includePlugins: include };
cfg.android = { ...cfg.android, includePlugins: include };
// Firebase dışarıdaysa onun SPM trait ayarı da gereksiz
const traits = cfg.experimental?.ios?.spm?.packageTraits;
if (traits && !FEATURES.accounts) delete traits['@capacitor-firebase/authentication'];
if (traits && FEATURES.accounts) traits['@capacitor-firebase/authentication'] = ['Google'];
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');

console.log('Özellikler:', JSON.stringify(FEATURES));
console.log('Pakete girecek eklentiler:', include.join(', '));
if (disabled.length) console.log('Dışarıda bırakılan:', disabled.join(', '));
