// Kayıt sistemi: localStorage + bütünlük özeti + sürüm göçü.
import { GAME } from './data.js';

const KEY = 'efsun_avcisi_save';
const SALT = 'efs-7c1-ay';

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

export function defaultSave() {
  const now = Date.now();
  return {
    v: 1,
    created: now,
    playerName: 'Avcı' + Math.floor(1000 + Math.random() * 9000),
    gold: 800, gems: 120, runes: 5, seals: 0, scrolls: 10,
    energy: GAME.energyMax, energyTs: now,
    inventory: [], equipped: {},
    hero: 'kaya', heroes: { kaya: { lvl: 1, shards: 0 } },
    pet: null, pets: {},
    talents: {},
    chapter: 1, maxChapter: 1,
    best: {},
    stats: { runs: 0, kills: 0, bossKills: 0, mythics: 0, enchants: 0, upgrades: 0, chests: 0, wins: 0 },
    purchases: {}, txIds: [], spent: 0,
    vip: false,
    monthly: { until: 0, last: '' },
    pass: { season: 1, xp: 0, premium: false, free: [], prem: [] },
    daily: { date: '', prog: {}, claimed: [], challenge: '' },
    login: { day: 0, last: '' },
    achievements: [],
    pity: { diamond: 0, legend: 0 },
    idleTs: now,
    freeChestTs: 0,
    offers: { starterUntil: 0 },
    referral: { code: 'EFSUN-' + Math.random().toString(36).slice(2, 7).toUpperCase(), used: false },
    settings: { sound: true, haptic: true, quality: 'high' },
    tutorial: 0,
    firstBuy: {},
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

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { save: defaultSave(), fresh: true };
    const { d, h } = JSON.parse(raw);
    const tampered = hash(d + SALT) !== h;
    const save = merge(defaultSave(), JSON.parse(d));
    if (tampered) save.tampered = true; // sunucu doğrulamalı sürümde hile şüphesi olarak işaretlenir
    return { save, fresh: false };
  } catch (e) {
    console.warn('Kayıt okunamadı, yeni oyun', e);
    return { save: defaultSave(), fresh: true };
  }
}

let timer = null;
export function persist(save, now = false) {
  const write = () => {
    try {
      const d = JSON.stringify(save);
      localStorage.setItem(KEY, JSON.stringify({ d, h: hash(d + SALT) }));
    } catch (e) { console.warn('Kayıt yazılamadı', e); }
  };
  clearTimeout(timer);
  if (now) write(); else timer = setTimeout(write, 250);
}

export function wipe() { localStorage.removeItem(KEY); }

export function exportSave(save) {
  const d = JSON.stringify(save);
  return btoa(unescape(encodeURIComponent(JSON.stringify({ d, h: hash(d + SALT) }))));
}
export function importSave(code) {
  const { d, h } = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if (hash(d + SALT) !== h) throw new Error('Kod bozuk');
  localStorage.setItem(KEY, JSON.stringify({ d, h }));
}
