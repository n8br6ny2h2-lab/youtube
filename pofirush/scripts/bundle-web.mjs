// Paylaşılabilir web sürümü: tüm oyunu TEK bir HTML dosyasında toplar → dist/pofi-rush.html
// itch.io (HTML5 oyun), GitHub Pages, Netlify'a yüklenebilir veya dosya olarak gönderilebilir; internetsiz açılır.
// Web sürümünde zorunlu reklam yoktur; satın almalar "Test mağazası" olarak çalışır (gerçek ödeme alınmaz).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = await build({ entryPoints: [join(root, 'js/main.js')], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(root, 'css/style.css'), 'utf8');
const icon = 'data:image/svg+xml;base64,' + readFileSync(join(root, 'icon.svg')).toString('base64');
let html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}">`)
  .replace(/<link rel="apple-touch-icon"[^>]*>/, `<link rel="apple-touch-icon" href="${icon}">`)
  .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`)
  .replace(/<script type="module" src="js\/main.js"><\/script>/, () => `<script>${js}</script>`);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/pofi-rush.html'), html);
console.log(`✓ dist/pofi-rush.html (${(html.length / 1024).toFixed(0)} KB)`);
