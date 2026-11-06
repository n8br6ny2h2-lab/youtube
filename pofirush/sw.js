// Çevrimdışı oynanabilirlik (yalnızca web/PWA sürümü; telefon uygulamasında dosyalar zaten pakette)
const V = 'pofirush-v1.0.0';
const FILES = ['./', 'index.html', 'css/style.css', 'icon.svg', 'manifest.webmanifest',
  'js/main.js', 'js/engine.js', 'js/config.js', 'js/i18n.js', 'js/save.js', 'js/services.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
