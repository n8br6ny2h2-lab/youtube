// Ekonomi: eşya üretimi, statlar, yükseltme, efsun, birleştirme, sandık, ödüller.
import {
  GAME, RARITIES, SLOTS, SLOT_ORDER, BASES, PREFIXES, MAIN, AFFIXES, AFFIX, SETS, HEROES, PETS,
  TALENTS, WEAPON_TYPES, CHESTS, MISSIONS, ACHIEVEMENTS, PASS_XP, PASS_TIERS, DAILY_CHALLENGES,
} from './data.js';
import { today } from './save.js';

let uidc = 0;
export const uid = () => Date.now().toString(36) + (uidc++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export function weighted(entries) {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const [v, w] of entries) { if ((r -= w) <= 0) return v; }
  return entries[entries.length - 1][0];
}
export const fmt = n => {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return n.toLocaleString('tr-TR');
};

// ---------------- Eşyalar ----------------
export function rollAffix(rarity, exclude = []) {
  const pool = AFFIXES.filter(a => (a.minRarity || 0) <= rarity && !exclude.includes(a.id));
  // özel efsunlar nadir gelir
  const a = weighted(pool.map(p => [p, p.special ? 0.35 : 1]));
  const q = rnd(0.55, 1);
  let v = a.base[rarity] * q;
  v = a.int ? a.base[rarity] : Math.max(0.1, Math.round(v * 10) / 10);
  return { id: a.id, v, q: a.int ? 1 : Math.round(q * 100) / 100 };
}

export function genItem(slot, rarity, opt = {}) {
  if (slot === 'any') slot = pick(SLOT_ORDER);
  rarity = Math.max(0, Math.min(5, rarity));
  const base = (opt.base && BASES[slot].find(b => b.id === opt.base)) || pick(BASES[slot]);
  const set = opt.set !== undefined ? opt.set : (rarity >= 3 && Math.random() < 0.3 ? pick(Object.keys(SETS)) : null);
  const affixes = [];
  for (let i = 0; i < RARITIES[rarity].affixes; i++) affixes.push(rollAffix(rarity, affixes.map(a => a.id)));
  return { uid: uid(), slot, base: base.id, rarity, lvl: 1, affixes, set, prefix: pick(PREFIXES), isNew: true };
}

export const baseOf = it => BASES[it.slot].find(b => b.id === it.base) || BASES[it.slot][0];
export const itemIcon = it => baseOf(it).icon;
export const itemName = it => `${it.set ? SETS[it.set].name : it.prefix || ''} ${baseOf(it).name}`.trim();

export function itemMain(it) {
  const m = MAIN[it.slot], r = RARITIES[it.rarity], out = {};
  for (const k in m) {
    out[k] = (k === 'atk' || k === 'hp')
      ? Math.round(m[k] * r.mult * (1 + 0.12 * (it.lvl - 1)))
      : Math.round(m[k] * (1 + 0.4 * it.rarity) * 10) / 10;
  }
  return out;
}

export function affixText(a) {
  const d = AFFIX[a.id];
  return `${d.elem ? d.elem + ' ' : ''}${d.name} +${a.v}${d.unit}`;
}

export const upgradeCost = it => ({
  gold: Math.floor(140 * Math.pow(1.12, it.lvl - 1) * (1 + it.rarity * 0.4)),
  scrolls: Math.ceil((1 + it.lvl / 3) * (1 + it.rarity * 0.5)),
});
export const enchantCost = (it, locks) => ({ runes: 4 + it.rarity * 3, seals: locks * (1 + Math.floor(it.rarity / 2)) });

export function salvageValue(it) {
  let gold = 100 * (it.rarity + 1) * (it.rarity + 1), scrolls = 2 + it.rarity * 3;
  for (let l = 1; l < it.lvl; l++) { const c = upgradeCost({ ...it, lvl: l }); gold += c.gold * 0.8; scrolls += c.scrolls * 0.8; }
  return { gold: Math.floor(gold), scrolls: Math.floor(scrolls), runes: it.rarity >= 2 ? it.rarity * 2 : 0 };
}

export const isEquipped = (save, it) => save.equipped[it.slot] === it.uid;

export function mergeCandidates(save, it) {
  if (it.rarity >= 5) return [];
  return save.inventory.filter(o => o.uid !== it.uid && o.slot === it.slot && o.rarity === it.rarity && !isEquipped(save, o) && !o.lock).slice(0, 2);
}

export function doMerge(save, it) {
  const others = mergeCandidates(save, it);
  if (others.length < 2) return null;
  const ids = new Set(others.map(o => o.uid));
  save.inventory = save.inventory.filter(o => !ids.has(o.uid));
  const lvl = Math.max(it.lvl, ...others.map(o => o.lvl));
  it.rarity += 1;
  it.lvl = Math.min(lvl, RARITIES[it.rarity].maxLvl);
  while (it.affixes.length < RARITIES[it.rarity].affixes) it.affixes.push(rollAffix(it.rarity, it.affixes.map(a => a.id)));
  // eski efsunlar yeni nadirliğe ölçeklenir
  it.affixes = it.affixes.map(a => { const d = AFFIX[a.id]; return { ...a, v: d.int ? d.base[it.rarity] : Math.round(d.base[it.rarity] * a.q * 10) / 10 }; });
  if (it.rarity >= 3 && !it.set && Math.random() < 0.25) it.set = pick(Object.keys(SETS));
  if (it.rarity === 5) save.stats.mythics++;
  return it;
}

export function doEnchant(save, it, locks) {
  const cost = enchantCost(it, locks.length);
  if (save.runes < cost.runes || save.seals < cost.seals || !it.affixes.length) return false;
  save.runes -= cost.runes; save.seals -= cost.seals;
  const kept = it.affixes.filter((_, i) => locks.includes(i)).map(a => a.id);
  it.affixes = it.affixes.map((a, i) => {
    if (locks.includes(i)) return a;
    const n = rollAffix(it.rarity, [...kept]);
    kept.push(n.id);
    return n;
  });
  save.stats.enchants++;
  progress(save, 'enchant');
  return true;
}

// ---------------- Statlar ----------------
export function computeStats(save, heroId = save.hero) {
  const hero = HEROES[heroId];
  const hl = save.heroes[heroId]?.lvl || 1;
  const s = {
    atk: hero.base.atk, hp: hero.base.hp, crit: 5, critDmg: 150, lifesteal: 0, regen: 0, gold: 0, xp: 0,
    burn: 0, freeze: 0, chain: 0, thorns: 0, bossDmg: 0, dodge: 0, dr: 0, multishot: 0, pierce: 0, bounce: 0,
    heal: 0, atkP: 0, hpP: 0, aspdP: 0, moveP: 0, shieldEvery: 0, berserk: 0, spirits: 0,
    wtype: 'bow', sets: {}, setPowers: [], hero: heroId, pet: save.pet, petLvl: save.pet ? (save.pets[save.pet]?.lvl || 1) : 0,
  };
  for (const t of TALENTS) { const l = save.talents[t.id] || 0; for (const k in t.per) s[k] += t.per[k] * l; }
  for (const slot of SLOT_ORDER) {
    const it = save.inventory.find(i => i.uid === save.equipped[slot]);
    if (!it) continue;
    const m = itemMain(it);
    for (const k in m) s[k] += m[k];
    for (const a of it.affixes) s[a.id] += a.v;
    if (slot === 'weapon') s.wtype = baseOf(it).wtype;
    if (it.set) s.sets[it.set] = (s.sets[it.set] || 0) + 1;
  }
  for (const id in s.sets) {
    const n = s.sets[id], set = SETS[id];
    if (n >= 2) for (const k in set.b2) s[k] += set.b2[k];
    if (n >= 4) s.setPowers.push(set.p4);
  }
  for (const k in hero.mods) s[k] += hero.mods[k];
  const wt = WEAPON_TYPES[s.wtype];
  if (s.wtype === 'staff') s.bounce += 1;
  if (s.wtype === 'sword') s.dr += 15;
  const heroMul = 1 + 0.06 * (hl - 1);
  s.atk = Math.round(s.atk * (1 + s.atkP / 100) * heroMul);
  s.hp = Math.round(s.hp * (1 + s.hpP / 100) * heroMul);
  s.aspd = Math.round(wt.aspd * (1 + s.aspdP / 100) * 100) / 100;
  s.move = Math.round(210 * (1 + s.moveP / 100));
  s.crit = Math.min(100, s.crit); s.dodge = Math.min(40, s.dodge); s.dr = Math.min(60, s.dr);
  s.wdmg = wt.dmg; s.range = wt.range;
  const dps = s.atk * wt.dmg * s.aspd * (1 + (s.crit / 100) * (s.critDmg / 100 - 1)) * (1 + s.multishot * 0.6);
  const ehp = s.hp / (1 - s.dr / 100) / (1 - s.dodge / 100);
  s.power = Math.round(dps * 6 + ehp * 0.9 + (s.lifesteal + s.burn + s.freeze + s.chain) * 15 + s.setPowers.length * 400 + s.petLvl * 60);
  return s;
}

// ---------------- Kaynaklar & ödüller ----------------
export function canAfford(save, cost) {
  return Object.entries(cost).every(([k, v]) => (save[k] || 0) >= v);
}
export function pay(save, cost) {
  if (!canAfford(save, cost)) return false;
  for (const [k, v] of Object.entries(cost)) save[k] -= v;
  if (cost.gems) save.spent += cost.gems;
  return true;
}

// Ödül verir; arayüzde göstermek için [{icon, text, rarity?, item?}] döndürür
export function grant(save, rew) {
  const out = [];
  const add = (k, icon, label) => { if (rew[k]) { save[k] = (save[k] || 0) + rew[k]; out.push({ icon, text: `${fmt(rew[k])} ${label}` }); } };
  add('gold', '🪙', 'Altın'); add('gems', '💎', 'Elmas'); add('runes', '🔮', 'Efsun Taşı');
  add('seals', '🔒', 'Kilit Mührü'); add('scrolls', '📜', 'Parşömen');
  if (rew.energy) { save.energy += rew.energy; out.push({ icon: '⚡', text: `${rew.energy} Enerji` }); }
  if (rew.passXp) { save.pass.xp += rew.passXp; out.push({ icon: '🎫', text: `${rew.passXp} Bilet XP` }); }
  for (const spec of rew.items || []) {
    const it = spec.uid ? spec : genItem(spec.slot, spec.rarity, spec);
    save.inventory.push(it);
    if (it.rarity === 5) save.stats.mythics++;
    out.push({ icon: itemIcon(it), text: itemName(it), rarity: it.rarity, item: it });
  }
  if (rew.chest) for (const it of openChest(save, rew.chest, 1, true)) out.push({ icon: itemIcon(it), text: itemName(it), rarity: it.rarity, item: it });
  if (rew.hero && !save.heroes[rew.hero]) { save.heroes[rew.hero] = { lvl: 1, shards: 0 }; out.push({ icon: HEROES[rew.hero].icon, text: `Kahraman: ${HEROES[rew.hero].name}`, rarity: 5 }); }
  for (const [h, n] of Object.entries(rew.shards || {})) {
    if (!save.heroes[h]) save.heroes[h] = { lvl: 1, shards: 0 };
    save.heroes[h].shards += n; out.push({ icon: HEROES[h].icon, text: `${n} ${HEROES[h].name} Parçası` });
  }
  if (rew.pet && !save.pets[rew.pet]) { save.pets[rew.pet] = { lvl: 1 }; if (!save.pet) save.pet = rew.pet; out.push({ icon: PETS[rew.pet].icon, text: `Evcil: ${PETS[rew.pet].name}`, rarity: 4 }); }
  return out;
}

export function openChest(save, type, count = 1, free = false) {
  const c = CHESTS[type];
  if (!free) {
    const cost = count === 10 && c.cost10 ? c.cost10 : Object.fromEntries(Object.entries(c.cost).map(([k, v]) => [k, v * count]));
    if (!pay(save, cost)) return null;
  }
  const items = [];
  for (let i = 0; i < count; i++) {
    let r = weighted(c.rates);
    if (c.pity) {
      save.pity[type] = (save.pity[type] || 0) + 1;
      if (r >= c.pity.rarity) save.pity[type] = 0;
      else if (save.pity[type] >= c.pity.every) { r = c.pity.rarity; save.pity[type] = 0; }
    }
    const it = genItem('any', r);
    if (r === 5) save.stats.mythics++;
    items.push(it); save.inventory.push(it);
  }
  save.stats.chests += count;
  progress(save, 'chest', count);
  return items;
}

// ---------------- Zamanlayıcılar ----------------
export function energyMax(save) { return GAME.energyMax + (save.monthly.until > Date.now() ? 10 : 0); }
export function tickEnergy(save) {
  const max = energyMax(save), now = Date.now();
  if (save.energy >= max) { save.energyTs = now; return 0; }
  const gained = Math.floor((now - save.energyTs) / 1000 / GAME.energyRegenSec);
  if (gained > 0) { save.energy = Math.min(max, save.energy + gained); save.energyTs += gained * GAME.energyRegenSec * 1000; }
  return Math.max(0, GAME.energyRegenSec - Math.floor((now - save.energyTs) / 1000));
}

export function idleReward(save) {
  const hrs = Math.min(GAME.idleCapHours, (Date.now() - save.idleTs) / 3600000);
  const ch = save.maxChapter, mul = save.vip ? 2 : 1;
  return {
    hours: hrs,
    gold: Math.floor(hrs * (300 + ch * 180) * mul),
    scrolls: Math.floor(hrs * (1 + ch * 0.5) * mul),
    runes: Math.floor(hrs * 0.4 * mul),
  };
}

export function dailyReset(save) {
  const d = today();
  if (save.daily.date !== d) {
    const dayNum = Math.floor(Date.now() / 86400000);
    save.daily = { date: d, prog: {}, claimed: [], challenge: '', challengeIdx: dayNum % DAILY_CHALLENGES.length, ads: 0, freeChest: false };
    return true;
  }
  return false;
}

export function progress(save, id, n = 1) {
  if (!save.daily) return;
  save.daily.prog[id] = (save.daily.prog[id] || 0) + n;
}

export function missionsState(save) {
  return MISSIONS.map(m => ({ ...m, prog: Math.min(m.goal, save.daily.prog[m.id] || 0), claimed: save.daily.claimed.includes(m.id) }));
}

export function achievementsState(save) {
  const val = { maxChapter: save.maxChapter, ...save.stats };
  return ACHIEVEMENTS.map(a => ({ ...a, prog: Math.min(a.goal, val[a.stat] || 0), claimed: save.achievements.includes(a.id) }));
}

export const passTier = save => Math.min(PASS_TIERS, Math.floor(save.pass.xp / PASS_XP));

export function loginState(save) {
  const d = today();
  return { canClaim: save.login.last !== d, day: save.login.day % 7 };
}

export function monthlyState(save) {
  const active = save.monthly.until > Date.now();
  return { active, daysLeft: active ? Math.ceil((save.monthly.until - Date.now()) / 86400000) : 0, canClaim: active && save.monthly.last !== today() };
}

// Bölüm sonu ganimeti
export function runLoot(save, res, mods = {}) {
  const ch = res.chapter, mul = (mods.lootMul || 1) * (1 + res.goldBonus / 100) * (save.vip ? 1.25 : 1);
  const gold = Math.floor((res.goldPicked + res.kills * (2 + ch * 0.6) + res.wave * 25 * ch + (res.victory ? 600 * ch : 0)) * mul);
  const rew = { gold, scrolls: Math.floor(res.wave * (1.5 + ch * 0.3) * (mods.lootMul || 1)), runes: res.runes, passXp: 40 + res.wave * 12, items: [] };
  const drops = Math.floor(res.wave / 3) + (res.victory ? 1 : 0);
  for (let i = 0; i < drops; i++) {
    const r = weighted([[0, 40], [1, 35 + ch * 2], [2, 15 + ch * 3], [3, 3 + ch * 1.5], [4, 0.4 + ch * 0.3]]);
    rew.items.push({ slot: 'any', rarity: Math.min(4, r) });
  }
  if (res.victory && ch >= save.maxChapter) rew.gems = 60 + ch * 15; // ilk geçiş
  return rew;
}
