// Efsun Avcısı — oyun içerik verisi (tek kaynak). Denge ayarları burada.

export const GAME = {
  name: 'Efsun Avcısı',
  version: '1.0.0',
  energyPerRun: 5,
  energyMax: 30,
  energyRegenSec: 300,
  wavesPerChapter: 10,
  waveLen: 18,
  idleCapHours: 12,
  shareUrl: '',   // mağaza bağlantınız (ör. https://play.google.com/store/apps/details?id=...) — boşsa sayfa adresi
  privacyUrl: '', // oyunun gizlilik politikası adresi — mağazalar zorunlu tutar
};

export const RARITIES = [
  { id: 0, name: 'Sıradan',  color: '#9aa4b2', mult: 1.0, maxLvl: 10, affixes: 0 },
  { id: 1, name: 'Nadir',    color: '#4ade80', mult: 1.5, maxLvl: 20, affixes: 1 },
  { id: 2, name: 'Seçkin',   color: '#38bdf8', mult: 2.2, maxLvl: 30, affixes: 2 },
  { id: 3, name: 'Destansı', color: '#c084fc', mult: 3.3, maxLvl: 40, affixes: 3 },
  { id: 4, name: 'Efsanevi', color: '#fb923c', mult: 5.0, maxLvl: 50, affixes: 4 },
  { id: 5, name: 'Mitik',    color: '#f43f5e', mult: 7.5, maxLvl: 60, affixes: 5 },
];

export const SLOTS = {
  weapon: { name: 'Silah',  icon: '⚔️' },
  armor:  { name: 'Zırh',   icon: '🛡️' },
  helmet: { name: 'Miğfer', icon: '⛑️' },
  boots:  { name: 'Çizme',  icon: '🥾' },
  ring:   { name: 'Yüzük',  icon: '💍' },
  amulet: { name: 'Tılsım', icon: '📿' },
};
export const SLOT_ORDER = ['weapon', 'helmet', 'armor', 'boots', 'ring', 'amulet'];

export const WEAPON_TYPES = {
  bow:   { name: 'Yay',   dmg: 1.0,  aspd: 1.15, range: 640, desc: 'Uzak menzil, hızlı oklar' },
  staff: { name: 'Asa',   dmg: 1.3,  aspd: 0.85, range: 560, desc: 'Hedef takip eden büyü küreleri, +1 sekme' },
  sword: { name: 'Kılıç', dmg: 1.75, aspd: 1.2,  range: 150, desc: 'Yakın dövüş yay vuruşu, %15 hasar azaltma' },
};

export const BASES = {
  weapon: [
    { id: 'bow',   name: 'Yay',   icon: '🏹', wtype: 'bow' },
    { id: 'staff', name: 'Asa',   icon: '🪄', wtype: 'staff' },
    { id: 'sword', name: 'Kılıç', icon: '🗡️', wtype: 'sword' },
  ],
  armor:  [{ id: 'plate', name: 'Zırh', icon: '🛡️' }, { id: 'robe', name: 'Cübbe', icon: '🥋' }],
  helmet: [{ id: 'helm', name: 'Miğfer', icon: '⛑️' }, { id: 'hood', name: 'Başlık', icon: '🎩' }],
  boots:  [{ id: 'boots', name: 'Çizme', icon: '🥾' }, { id: 'shoes', name: 'Pabuç', icon: '👟' }],
  ring:   [{ id: 'ring', name: 'Yüzük', icon: '💍' }, { id: 'band', name: 'Halka', icon: '💠' }],
  amulet: [{ id: 'amulet', name: 'Tılsım', icon: '📿' }, { id: 'eye', name: 'Nazarlık', icon: '🧿' }],
};

// Rastgele sıfat — set dışı eşyalara isim çeşitliliği
export const PREFIXES = ['Avcı', 'Yıldız', 'Kızıl', 'Rüzgâr', 'Kadim', 'Ay', 'Güneş', 'Demir', 'Gölge', 'Kartal', 'Kurt', 'Şimşek'];

// Ana statlar (seviye ve nadirlikle ölçeklenir)
export const MAIN = {
  weapon: { atk: 14 },
  armor:  { hp: 90 },
  helmet: { hp: 55 },
  boots:  { hp: 35, moveP: 4 },
  ring:   { atk: 7, crit: 1 },
  amulet: { atk: 5, hp: 45 },
};
export const STAT_NAMES = {
  atk: 'Saldırı', hp: 'Can', moveP: 'Hareket Hızı', crit: 'Kritik Şansı',
};

// Efsunlar (rastgele ek özellikler). base[nadirlik] = en iyi değer.
export const AFFIXES = [
  { id: 'atkP',      name: 'Saldırı',          unit: '%',     base: [3, 5, 7, 10, 14, 20] },
  { id: 'hpP',       name: 'Can',              unit: '%',     base: [4, 6, 9, 12, 16, 22] },
  { id: 'crit',      name: 'Kritik Şansı',     unit: '%',     base: [2, 3, 4, 6, 8, 11] },
  { id: 'critDmg',   name: 'Kritik Hasarı',    unit: '%',     base: [8, 12, 18, 25, 35, 50] },
  { id: 'aspdP',     name: 'Saldırı Hızı',     unit: '%',     base: [3, 5, 7, 10, 13, 18] },
  { id: 'lifesteal', name: 'Can Çalma',        unit: '%',     base: [1, 1.5, 2, 3, 4, 6] },
  { id: 'moveP',     name: 'Hareket Hızı',     unit: '%',     base: [2, 3, 4, 6, 8, 10] },
  { id: 'gold',      name: 'Altın Kazancı',    unit: '%',     base: [4, 6, 9, 12, 16, 22] },
  { id: 'xp',        name: 'Tecrübe Kazancı',  unit: '%',     base: [4, 6, 9, 12, 16, 22] },
  { id: 'regen',     name: 'Can Yenileme',     unit: '%/sn',  base: [0.2, 0.3, 0.45, 0.6, 0.8, 1.1] },
  { id: 'burn',      name: 'Yakma Şansı',      unit: '%',     base: [3, 5, 7, 10, 13, 18], elem: '🔥' },
  { id: 'freeze',    name: 'Dondurma Şansı',   unit: '%',     base: [2, 4, 6, 8, 11, 15], elem: '❄️' },
  { id: 'chain',     name: 'Şimşek Şansı',     unit: '%',     base: [3, 5, 7, 10, 13, 18], elem: '⚡' },
  { id: 'thorns',    name: 'Diken',            unit: '%',     base: [5, 8, 12, 18, 25, 35] },
  { id: 'bossDmg',   name: 'Boss Hasarı',      unit: '%',     base: [5, 8, 12, 18, 25, 35] },
  { id: 'dodge',     name: 'Kaçınma',          unit: '%',     base: [1, 2, 3, 4, 6, 8] },
  { id: 'dr',        name: 'Hasar Azaltma',    unit: '%',     base: [1, 2, 3, 4, 5, 7] },
  { id: 'multishot', name: 'Çoklu Atış',       unit: ' mermi', base: [1, 1, 1, 1, 1, 2], int: true, minRarity: 4, special: true },
  { id: 'pierce',    name: 'Delici',           unit: ' hedef', base: [1, 1, 1, 1, 1, 2], int: true, minRarity: 3, special: true },
];
export const AFFIX = Object.fromEntries(AFFIXES.map(a => [a.id, a]));

export const SETS = {
  dragon: {
    name: 'Ejder', color: '#ff6b3d', icon: '🐉',
    b2: { burn: 15, atkP: 10 }, d2: '+%15 Yakma, +%10 Saldırı',
    p4: 'fireNova', d4: 'Her 5 sn etrafında ateş patlaması (yakar)',
  },
  frost: {
    name: 'Ayaz', color: '#7dd3fc', icon: '❄️',
    b2: { freeze: 12, hpP: 12 }, d2: '+%12 Dondurma, +%12 Can',
    p4: 'frostNova', d4: 'Her 6 sn yakındaki herkesi dondurur',
  },
  storm: {
    name: 'Fırtına', color: '#facc15', icon: '⚡',
    b2: { chain: 15, aspdP: 12 }, d2: '+%15 Şimşek, +%12 Saldırı Hızı',
    p4: 'stormCall', d4: 'Her 4 sn 5 yıldırım çağırır',
  },
};

export const HEROES = {
  kaya: {
    name: 'Kaya', title: 'Kale Muhafızı', icon: '🦸‍♂️', color: '#60a5fa', base: { atk: 20, hp: 260 },
    passive: '+%20 Can, her 10 sn bir darbeyi engelleyen kalkan',
    mods: { hpP: 20, shieldEvery: 10 }, unlock: { free: true },
  },
  lina: {
    name: 'Lina', title: 'Rüzgâr Okçusu', icon: '🧝‍♀️', color: '#34d399', base: { atk: 23, hp: 210 },
    passive: '+1 Çoklu Atış, +%10 Saldırı Hızı',
    mods: { multishot: 1, aspdP: 10 }, unlock: { gold: 30000 },
  },
  zerk: {
    name: 'Zerk', title: 'Kan Çılgını', icon: '🦹‍♂️', color: '#f87171', base: { atk: 26, hp: 240 },
    passive: '+%6 Can Çalma, canın azaldıkça %80\'e kadar hasar',
    mods: { lifesteal: 6, berserk: 1 }, unlock: { gems: 1200 },
  },
  nyx: {
    name: 'Nyx', title: 'Gölge Cadısı', icon: '🧙‍♀️', color: '#a78bfa', base: { atk: 25, hp: 230 },
    passive: 'Ölen düşmanlardan %18 şansla avcı gölge ruh doğar, +%10 Saldırı',
    mods: { spirits: 18, atkP: 10 }, unlock: { iap: 'kit_nyx' },
  },
};
export const HERO_ORDER = ['kaya', 'lina', 'zerk', 'nyx'];
export const heroLevelCost = lvl => ({ shards: 5 + lvl * 5, gold: 800 * lvl * lvl });

export const PETS = {
  owl:   { name: 'Bilge Baykuş', icon: '🦉', desc: 'Her 1.2 sn en yakın düşmana tüy fırlatır', unlock: { free: true } },
  fox:   { name: 'Ruh Tilkisi',  icon: '🦊', desc: 'Ganimet çeker, her 4 sn %2 can iyileştirir, ruh ateşi atar', unlock: { gems: 900 } },
  drake: { name: 'Yavru Ejder',  icon: '🐲', desc: 'Her 2.5 sn yakan ejder nefesi üfler', unlock: { iap: 'kit_dragon' } },
};
export const petLevelCost = lvl => ({ gold: 1500 * lvl, gems: lvl % 5 === 0 ? 50 : 0 });

export const TALENTS = [
  { id: 'power',   name: 'Güç',          icon: '💪', desc: '+3 Saldırı',            per: { atk: 3 },     max: 200 },
  { id: 'vital',   name: 'Dayanıklılık', icon: '❤️', desc: '+16 Can',               per: { hp: 16 },     max: 200 },
  { id: 'agility', name: 'Çeviklik',     icon: '💨', desc: '+%0.6 Saldırı Hızı',    per: { aspdP: 0.6 }, max: 100 },
  { id: 'fortune', name: 'Şans',         icon: '🍀', desc: '+%0.3 Kritik Şansı',    per: { crit: 0.3 },  max: 100 },
  { id: 'iron',    name: 'Demir Deri',   icon: '🪨', desc: '+%0.4 Hasar Azaltma',   per: { dr: 0.4 },    max: 50 },
  { id: 'greed',   name: 'Açgözlülük',   icon: '💰', desc: '+%2 Altın Kazancı',     per: { gold: 2 },    max: 100 },
  { id: 'wisdom',  name: 'Bilgelik',     icon: '📘', desc: '+%2 Tecrübe Kazancı',   per: { xp: 2 },      max: 100 },
  { id: 'recover', name: 'İyileşme',     icon: '🍖', desc: 'Kalpler +%3 daha çok iyileştirir', per: { heal: 3 }, max: 50 },
];
export const talentCost = lvl => Math.floor(150 * Math.pow(1.14, lvl));

export const CHAPTERS = [
  { name: 'Zümrüt Orman',    bg: '#0f2a20', tile: '#133527', deco: '#1d5a3d', accent: '#4ade80', boss: 'treant' },
  { name: 'Kızıl Çöl',       bg: '#3a1e12', tile: '#432415', deco: '#7a3d1d', accent: '#fb923c', boss: 'scorpion' },
  { name: 'Ayaz Diyarı',     bg: '#11233a', tile: '#152a45', deco: '#2f5c8a', accent: '#7dd3fc', boss: 'frostQueen' },
  { name: 'Gölge Krallığı',  bg: '#1a1029', tile: '#211433', deco: '#3f2763', accent: '#c084fc', boss: 'shadowDragon' },
  { name: 'Volkan Kalbi',    bg: '#2a0d0d', tile: '#341111', deco: '#6b1d12', accent: '#f43f5e', boss: 'magmaTitan' },
];
export const chapterInfo = n => {
  const t = CHAPTERS[(n - 1) % CHAPTERS.length];
  const loop = Math.floor((n - 1) / CHAPTERS.length);
  const tier = ['', ' • Kabus', ' • Cehennem', ' • Kıyamet'][Math.min(loop, 3)] + (loop > 3 ? ' ' + (loop - 2) : '');
  return { ...t, n, title: `${n}. Bölüm: ${t.name}${tier}` };
};

// Sandıklar — oranlar mağazada açıkça gösterilir (yasal şeffaflık)
export const CHESTS = {
  bronze:  { name: 'Bronz Sandık',  icon: '📦', cost: { gold: 2500 },  rates: [[0, 60], [1, 30], [2, 9], [3, 1]] },
  diamond: { name: 'Elmas Sandık',  icon: '🎁', cost: { gems: 150 }, cost10: { gems: 1350 }, rates: [[1, 45], [2, 38], [3, 14], [4, 3]], pity: { every: 30, rarity: 4 } },
  legend:  { name: 'Efsane Sandık', icon: '👑', cost: { gems: 480 }, rates: [[3, 72], [4, 25], [5, 3]], pity: { every: 20, rarity: 5 } },
};

// GERÇEK PARA ÜRÜNLERİ — kimlikler App Store / Google Play konsolundakilerle birebir aynı olmalı.
// price: mağaza fiyatı gelmezse gösterilecek yedek fiyat.
export const PRODUCTS = [
  { id: 'gems_80',    kind: 'gems', type: 'consumable', name: 'Avuç Elmas',   gems: 80,    price: '₺29,99',  icon: '💎' },
  { id: 'gems_500',   kind: 'gems', type: 'consumable', name: 'Kese Elmas',   gems: 500,   price: '₺149,99', icon: '💎' },
  { id: 'gems_1200',  kind: 'gems', type: 'consumable', name: 'Sandık Elmas', gems: 1200,  price: '₺299,99', icon: '💎', tag: 'Popüler' },
  { id: 'gems_2600',  kind: 'gems', type: 'consumable', name: 'Hazine Elmas', gems: 2600,  price: '₺599,99', icon: '💎' },
  { id: 'gems_7000',  kind: 'gems', type: 'consumable', name: 'Ejder Hazinesi', gems: 7000, price: '₺1.499,99', icon: '💎', tag: 'En İyi Değer' },

  { id: 'kit_starter', kind: 'kit', type: 'non_consumable', once: true, name: 'Başlangıç Kiti', icon: '🎒', price: '₺49,99',
    value: '%1000 DEĞER', color: '#22c55e',
    contents: { gems: 300, gold: 15000, runes: 25, scrolls: 40, items: [{ slot: 'weapon', rarity: 3, base: 'bow' }] },
    desc: 'Destansı Yay + 300 💎 + 15.000 🪙 + 25 efsun taşı' },
  { id: 'kit_dragon', kind: 'kit', type: 'non_consumable', once: true, name: 'Ejder Hükümdarı Kiti', icon: '🐲', price: '₺399,99',
    value: '%800 DEĞER', color: '#ff6b3d',
    contents: { gems: 1500, pet: 'drake', items: [
      { slot: 'weapon', rarity: 4, set: 'dragon', base: 'sword' }, { slot: 'armor', rarity: 4, set: 'dragon' },
      { slot: 'helmet', rarity: 4, set: 'dragon' }, { slot: 'boots', rarity: 4, set: 'dragon' }] },
    desc: '4 parça Efsanevi Ejder Seti + Yavru Ejder evcil + 1500 💎' },
  { id: 'kit_enchanter', kind: 'kit', type: 'consumable', limit: 3, name: 'Büyük Efsuncu Kiti', icon: '🔮', price: '₺199,99',
    value: '%600 DEĞER', color: '#a855f7',
    contents: { runes: 200, seals: 40, gems: 300, items: [{ slot: 'ring', rarity: 4 }] },
    desc: '200 efsun taşı + 40 kilit mührü + Efsanevi Yüzük (3 kez alınabilir)' },
  { id: 'kit_nyx', kind: 'kit', type: 'non_consumable', once: true, name: 'Gölge Cadısı Kiti', icon: '🔮', price: '₺299,99',
    value: 'ÖZEL KAHRAMAN', color: '#8b5cf6',
    contents: { hero: 'nyx', shards: { nyx: 60 }, gems: 600, items: [{ slot: 'weapon', rarity: 4, base: 'staff', set: 'storm' }] },
    desc: 'Nyx kahramanı + 60 parça + Efsanevi Fırtına Asası + 600 💎' },
  { id: 'kit_mythic', kind: 'kit', type: 'non_consumable', once: true, name: 'Mitik Savaş Lordu Kiti', icon: '👑', price: '₺999,99',
    value: '%1500 DEĞER', color: '#f43f5e',
    contents: { gems: 3500, runes: 150, seals: 30, scrolls: 300, items: [
      { slot: 'weapon', rarity: 5, set: 'storm' }, { slot: 'ring', rarity: 5 }, { slot: 'amulet', rarity: 5 }] },
    desc: '3 Mitik eşya + 3500 💎 + 150 efsun taşı + 300 parşömen' },

  { id: 'monthly_card', kind: 'sub', type: 'consumable', name: 'Aylık Kart', icon: '📅', price: '₺99,99',
    desc: 'Hemen 300 💎 + 30 gün boyunca her gün 100 💎 (toplam 3300) + enerji sınırı +10' },
  { id: 'vip_noads', kind: 'vip', type: 'non_consumable', once: true, name: 'VIP • Reklamsız', icon: '⭐', price: '₺179,99',
    desc: 'Tüm reklamlar atlanır, ödüller anında alınır, kalıcı +%25 altın, 2× devriye ödülü' },
  { id: 'battle_pass', kind: 'pass', type: 'consumable', name: 'Efsun Bileti (Sezon)', icon: '🎫', price: '₺199,99',
    desc: 'Sezonun premium ödül hattı: Mitik eşya, binlerce elmas, özel sandıklar' },
];
export const PRODUCT = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

export const LOGIN_REWARDS = [
  { gold: 1500 }, { gems: 50 }, { runes: 10 }, { gold: 4000 }, { gems: 100 }, { scrolls: 30 },
  { gems: 150, items: [{ slot: 'any', rarity: 3 }] },
];

export const MISSIONS = [
  { id: 'kills',   name: '400 düşman yok et',   goal: 400, reward: { gems: 20, passXp: 120 } },
  { id: 'runs',    name: '3 savaşa gir',        goal: 3,   reward: { gold: 2000, passXp: 120 } },
  { id: 'boss',    name: '1 boss yen',          goal: 1,   reward: { gems: 30, passXp: 100 } },
  { id: 'upgrade', name: '5 kez ekipman yükselt', goal: 5, reward: { scrolls: 12, passXp: 80 } },
  { id: 'enchant', name: '3 kez efsunla',       goal: 3,   reward: { runes: 6, passXp: 80 } },
  { id: 'chest',   name: '1 sandık aç',         goal: 1,   reward: { gems: 25, passXp: 80 } },
  { id: 'ad',      name: '2 ödüllü video izle', goal: 2,   reward: { gems: 30, passXp: 60 } },
];

export const ACHIEVEMENTS = [
  { id: 'ch3',     name: '3. Bölümü geç',       stat: 'maxChapter', goal: 4,     reward: { gems: 200 } },
  { id: 'ch6',     name: '6. Bölümü geç',       stat: 'maxChapter', goal: 7,     reward: { gems: 500 } },
  { id: 'k5000',   name: '5.000 düşman',        stat: 'kills',      goal: 5000,  reward: { gems: 150 } },
  { id: 'k50000',  name: '50.000 düşman',       stat: 'kills',      goal: 50000, reward: { gems: 600 } },
  { id: 'boss25',  name: '25 boss avı',         stat: 'bossKills',  goal: 25,    reward: { gems: 300 } },
  { id: 'myth',    name: 'Mitik eşya bul',      stat: 'mythics',    goal: 1,     reward: { gems: 500 } },
  { id: 'ench100', name: '100 kez efsunla',     stat: 'enchants',   goal: 100,   reward: { seals: 20 } },
];

// Sezon bileti: 30 kademe, kademe başı 300 XP
export const PASS_TIERS = 30;
export const PASS_XP = 300;
export function passReward(tier, premium) {
  if (!premium) {
    if (tier % 10 === 0) return { items: [{ slot: 'any', rarity: 3 }] };
    return [{ gold: 1000 * tier }, { gems: 20 }, { runes: 5 }, { scrolls: 10 }][tier % 4];
  }
  if (tier === 30) return { items: [{ slot: 'weapon', rarity: 5, set: 'frost' }], gems: 500 };
  if (tier % 10 === 0) return { items: [{ slot: 'any', rarity: 4 }] };
  if (tier % 5 === 0) return { chest: 'legend' };
  return [{ gems: 80 }, { runes: 15, seals: 3 }, { gold: 3000 * tier }, { scrolls: 25, energy: 10 }][tier % 4];
}

export const DAILY_CHALLENGES = [
  { name: 'Kudurmuş Sürü',    desc: 'Düşmanlar %35 daha hızlı',              mods: { enemySpeed: 1.35 } },
  { name: 'Seçkinler Gecesi', desc: 'Seçkin düşman şansı ×4, 2× ganimet',     mods: { eliteMul: 4, lootMul: 2 } },
  { name: 'Cam Top',          desc: 'Canın yarı, hasarın 2×',                mods: { playerHp: 0.5, playerDmg: 2 } },
  { name: 'Boss Yağmuru',     desc: '5., 8. ve 10. dalgada boss',            mods: { extraBoss: true } },
  { name: 'Kalabalık',        desc: 'Düşman sayısı 2×, düşmanlar zayıf',     mods: { spawnMul: 2, enemyHp: 0.6 } },
];
