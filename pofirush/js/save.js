// Kayıt: localStorage + (telefonda) Capacitor Preferences yedeği, bütünlük özeti ve sürüm birleştirme.
const KEY = 'pofirush_save_v1';
const SALT = 'p0f1-r$h-7';

export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dayDiff(a, b) {
  if (!a || !b) return Infinity;
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
}

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

export function defaultSave() {
  return {
    v: 1,
    created: Date.now(),
    coins: 0,
    skin: 'pofi',
    skins: ['pofi'],
    best: { classic: 0, hardcore: 0, daily: 0 },
    dailyBest: { date: '', score: 0 },
    records: { classic: [], hardcore: [], daily: [] }, // en iyi 10: {s, d}
    stats: { runs: 0, total: 0, coins: 0, perfects: 0, bestCombo: 0, powerups: 0, dailyDays: 0, hardBest: 0 },
    noads: false, doubler: false,
    purchases: {}, txIds: [],
    login: { day: 0, last: '', claimed: '' },
    missions: { date: '', list: [] },
    ach: [],
    ads: { date: '', free: 0, lastInter: 0, deathsSince: 0 },
    offer: { starterUntil: 0, shown: false },
    rate: { asked: false, good: 0 },
    settings: { sound: true, music: true, haptics: true, lang: '', hq: true },
    tutorial: true,
  };
}

function merge(def, obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj === undefined ? def : obj;
  const out = { ...def };
  for (const k of Object.keys(obj)) {
    out[k] = (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) ? merge(def[k], obj[k]) : obj[k];
  }
  return out;
}

const Prefs = () => window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.Preferences : null;

function parse(raw) {
  if (!raw) return null;
  try {
    const { d, h } = JSON.parse(raw);
    const s = merge(defaultSave(), JSON.parse(d));
    if (hash(d + SALT) !== h) s.tampered = true;
    return s;
  } catch (e) { return null; }
}

export async function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* gizli mod */ }
  let s = parse(raw);
  // iOS WebView depolamayı temizleyebilir: Preferences (UserDefaults / SharedPreferences) yedeğinden kurtar
  const P = Prefs();
  if (P) {
    try {
      const { value } = await P.get({ key: KEY });
      const b = parse(value);
      if (b && (!s || (b.stats.runs > s.stats.runs))) s = b;
    } catch (e) { /* yok say */ }
  }
  return s || defaultSave();
}

let timer = null;
export function persist(save, now = false) {
  const write = () => {
    const d = JSON.stringify(save);
    const raw = JSON.stringify({ d, h: hash(d + SALT) });
    try { localStorage.setItem(KEY, raw); } catch (e) { /* dolu */ }
    Prefs()?.set({ key: KEY, value: raw }).catch(() => {});
  };
  clearTimeout(timer);
  if (now) write(); else timer = setTimeout(write, 300);
}

export async function wipe() {
  try { localStorage.removeItem(KEY); } catch (e) { /* */ }
  await Prefs()?.remove({ key: KEY }).catch(() => {});
}
