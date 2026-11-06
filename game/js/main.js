// Efsun Avcısı — uygulama denetleyicisi (menüler, akışlar, mağaza, savaş bağlantısı)
import * as D from './data.js';
import * as E from './economy.js';
import { load, persist, wipe, today, exportSave, importSave } from './save.js';
import { Store, Ads, Sfx, haptic, share } from './services.js';
import { Game, RUN_SKILLS } from './game.js';
import { $, $$, esc, modal, toast, confirmBox, rewardPopup, itemCell, itemStatsHtml, affixRow, bar, closeAllModals } from './ui.js';

const loaded = load();
let S = loaded.save;
const sfx = new Sfx();
const store = new Store();
const ads = new Ads();
let tab = 'battle', questTab = 'daily', invFilter = 'all';
let selCh = S.maxChapter;
let game = null, run = null;

const save = now => persist(S, now);
const play = n => { if (S.settings.sound) sfx.play(n); };
const vib = ms => haptic(S.settings.haptic, ms);
const fmt = E.fmt;
const stats = () => E.computeStats(S);

// ============================================================ BAŞLANGIÇ
async function boot() {
  E.dailyReset(S);
  E.tickEnergy(S);
  sfx.on = S.settings.sound;
  store.onGrant = grantProduct;
  store.onConfirm = testStoreConfirm;
  store.onError = msg => { toast(msg, 'bad'); play('error'); };
  ads.onSimulate = simulateAd;
  await Promise.all([store.init(), ads.init()]);
  render();
  setInterval(tick, 1000);
  document.addEventListener('click', onClick);
  document.addEventListener('visibilitychange', () => { if (document.hidden && game && !game.paused) pauseMenu(); save(true); });
  $('#splash').addEventListener('click', () => {
    sfx.unlock(); play('click');
    $('#splash').classList.add('hide');
    setTimeout(() => $('#splash').remove(), 400);
    if (S.stats.runs === 0) setTimeout(() => toast('İlk savaşın için ⚔️ SAVAŞ\'a dokun!'), 500);
    else if (E.loginState(S).canClaim) setTimeout(loginModal, 400);
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

function tick() {
  const left = E.tickEnergy(S);
  if (E.dailyReset(S)) render();
  const en = $('#en-val'); if (en) en.textContent = `${S.energy}/${E.energyMax(S)}`;
  const et = $('#en-time'); if (et) et.textContent = S.energy >= E.energyMax(S) ? '' : mmss(left);
  for (const el of $$('[data-until]')) el.textContent = countdown(+el.dataset.until - Date.now());
  const idle = $('#idle-amt'); if (idle) idle.textContent = fmt(E.idleReward(S).gold);
}

const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function countdown(ms) {
  if (ms <= 0) return 'Bitti';
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h > 0 ? `${h}s ${m}dk` : `${m}:${String(s % 60).padStart(2, '0')}`;
}

// ============================================================ RENDER
function render() {
  if (game) return;
  $('#top').innerHTML = topHtml();
  const screens = { battle: battleHtml, gear: gearHtml, talent: talentHtml, quest: questHtml, shop: shopHtml };
  $('#screen').innerHTML = screens[tab]();
  $('#screen').dataset.tab = tab;
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const badges = navBadges();
  $$('#nav button').forEach(b => { const n = badges[b.dataset.tab]; b.querySelector('.badge')?.remove(); if (n) b.insertAdjacentHTML('beforeend', `<span class="badge">${n === true ? '!' : n}</span>`); });
  save();
}

function navBadges() {
  const ms = E.missionsState(S).filter(m => m.prog >= m.goal && !m.claimed).length;
  const ach = E.achievementsState(S).filter(a => a.prog >= a.goal && !a.claimed).length;
  const tier = E.passTier(S);
  let pass = 0; for (let t = 1; t <= tier; t++) { if (!S.pass.free.includes(t)) pass++; if (S.pass.premium && !S.pass.prem.includes(t)) pass++; }
  const login = E.loginState(S).canClaim ? 1 : 0;
  const newItems = S.inventory.filter(i => i.isNew).length;
  const freeChest = !S.daily.freeChest;
  return { quest: ms + ach + pass + login + (E.monthlyState(S).canClaim ? 1 : 0), gear: newItems || 0, shop: freeChest ? true : 0 };
}

function topHtml() {
  const st = stats(), h = D.HEROES[S.hero];
  return `<div class="tb-left" data-act="settings">
      <div class="avatar" style="--hc:${h.color}">${h.icon}</div>
      <div><div class="pname">${esc(S.playerName)}${S.vip ? ' <span class="vip">VIP</span>' : ''}</div><div class="power">⚡ ${fmt(st.power)} Güç</div></div>
    </div>
    <div class="tb-res">
      <div class="res" data-act="energy"><span>🔋</span><b id="en-val">${S.energy}/${E.energyMax(S)}</b><small id="en-time"></small></div>
      <div class="res" data-act="tab" data-tab="shop"><span>🪙</span><b>${fmt(S.gold)}</b></div>
      <div class="res gemres" data-act="tab" data-tab="shop"><span>💎</span><b>${fmt(S.gems)}</b><i>+</i></div>
    </div>`;
}

// ------------------------------------------------------------ SAVAŞ EKRANI
function battleHtml() {
  const ch = D.chapterInfo(selCh), st = stats(), h = D.HEROES[S.hero];
  const best = S.best[selCh] || 0;
  const login = E.loginState(S), idle = E.idleReward(S), mc = E.monthlyState(S);
  const dc = D.DAILY_CHALLENGES[S.daily.challengeIdx || 0];
  const starterLive = !S.purchases.kit_starter && S.offers.starterUntil > Date.now();
  const bossName = { treant: 'Yaşlı Kökdev', scorpion: 'Kum Akrebi', frostQueen: 'Ayaz Kraliçesi', shadowDragon: 'Gölge Ejder', magmaTitan: 'Magma Titanı' }[ch.boss];
  return `<div class="home">
    <div class="side left">
      <button class="sidebtn ${login.canClaim ? 'pulse' : ''}" data-act="login"><span>📅</span><small>Giriş</small>${login.canClaim ? '<i class="dot"></i>' : ''}</button>
      <button class="sidebtn" data-act="idle"><span>🏕️</span><small id="idle-amt">${fmt(idle.gold)}</small></button>
      <button class="sidebtn ${S.daily.challenge ? 'done' : 'pulse'}" data-act="daily"><span>🔥</span><small>Mücadele</small></button>
    </div>
    <div class="side right">
      ${!S.purchases.kit_starter ? `<button class="sidebtn offer" data-act="offer" data-id="kit_starter"><span>🎒</span><small>${starterLive ? `<em data-until="${S.offers.starterUntil}">${countdown(S.offers.starterUntil - Date.now())}</em>` : 'Teklif'}</small></button>` : ''}
      <button class="sidebtn" data-act="tab" data-tab="quest" data-qt="pass"><span>🎫</span><small>Bilet</small></button>
      <button class="sidebtn ${mc.canClaim ? 'pulse' : ''}" data-act="${mc.active ? 'monthlyClaim' : 'offer'}" data-id="monthly_card"><span>📆</span><small>${mc.active ? mc.daysLeft + ' gün' : 'Aylık'}</small></button>
    </div>
    <div class="chapter" style="--acc:${ch.accent};--bg:${ch.bg}">
      <div class="ch-nav">
        <button data-act="ch" data-d="-1" ${selCh <= 1 ? 'disabled' : ''}>‹</button>
        <div><div class="ch-title">${ch.title}</div><div class="ch-sub">Boss: ${bossName} • En iyi: ${best >= 10 ? '✅ Temizlendi' : `Dalga ${Math.floor(best)}/10`}</div></div>
        <button data-act="ch" data-d="1" ${selCh >= S.maxChapter ? 'disabled' : ''}>›</button>
      </div>
      <div class="hero-pedestal">
        <div class="hero-glow" style="--hc:${h.color}"></div>
        <div class="hero-emoji">${h.icon}</div>
        ${S.pet ? `<div class="pet-emoji">${D.PETS[S.pet].icon}</div>` : ''}
      </div>
      <div class="hero-label">${h.name} • ${h.title}</div>
      ${bar(best, 10, 'ch-bar')}
    </div>
    <div class="power-big">⚡ ${fmt(st.power)} <small>Önerilen: ${fmt(recommendedPower(selCh))}</small></div>
    <button class="btn play" data-act="play"><span>SAVAŞ</span><small>🔋 ${D.GAME.energyPerRun}</small></button>
    <div class="tip">${tipText()}</div>
  </div>`;
}

const recommendedPower = ch => Math.round(900 * Math.pow(1.33, ch - 1));
function tipText() {
  const tips = ['💡 Eşyaları 3\'leyip birleştir: nadirlik yükselir!', '💡 Efsun kilitle, iyi özellikleri koru.', '💡 4 parça set özel güç açar.', '💡 Boss saldırılarından önce kırmızı alan uyarısı çıkar.', '💡 Devriye ödülün sen yokken birikir.', '💡 Arkadaşını davet et, ikiniz de 💎 kazanın.'];
  return tips[Math.floor(Date.now() / 15000) % tips.length];
}

// ------------------------------------------------------------ EKİPMAN EKRANI
function gearHtml() {
  const st = stats(), h = D.HEROES[S.hero];
  const eq = slot => S.inventory.find(i => i.uid === S.equipped[slot]);
  const slotHtml = slot => {
    const it = eq(slot);
    return it ? itemCell(it, { equipped: false }) : `<div class="item empty" data-act="filter" data-f="${slot}"><div class="ii">${D.SLOTS[slot].icon}</div><div class="il">${D.SLOTS[slot].name}</div></div>`;
  };
  const items = S.inventory.filter(i => !Object.values(S.equipped).includes(i.uid) && (invFilter === 'all' || i.slot === invFilter))
    .sort((a, b) => b.rarity - a.rarity || b.lvl - a.lvl || a.slot.localeCompare(b.slot));
  const sets = Object.entries(st.sets).filter(([, n]) => n >= 2);
  return `<div class="gear">
    <div class="hero-stage" style="--hc:${h.color}">
      <div class="slots">${['weapon', 'helmet', 'armor'].map(slotHtml).join('')}</div>
      <div class="hero-mid" data-act="heroes">
        <div class="hero-emoji big">${h.icon}</div>
        <div class="hname">${h.name} <small>Sv${S.heroes[S.hero].lvl}</small></div>
        <div class="hpow">⚡ ${fmt(st.power)}</div>
        <div class="hchange">Kahraman ›</div>
      </div>
      <div class="slots">${['boots', 'ring', 'amulet'].map(slotHtml).join('')}</div>
    </div>
    <div class="statline" data-act="statsModal">
      <span>⚔️ ${fmt(st.atk)}</span><span>❤️ ${fmt(st.hp)}</span><span>🏹 ${D.WEAPON_TYPES[st.wtype].name}</span><span>🎯 %${st.crit.toFixed(0)}</span><span class="more">Tümü ›</span>
    </div>
    ${sets.length ? `<div class="sets">${sets.map(([id, n]) => `<div class="setb" style="--sc:${D.SETS[id].color}">${D.SETS[id].icon} ${D.SETS[id].name} ${n}/4 <small>${n >= 4 ? 'TAM SET!' : D.SETS[id].d2}</small></div>`).join('')}</div>` : ''}
    <div class="inv-head">
      <div class="filters">${['all', ...D.SLOT_ORDER].map(f => `<button class="${invFilter === f ? 'on' : ''}" data-act="filter" data-f="${f}">${f === 'all' ? 'Tümü' : D.SLOTS[f].icon}</button>`).join('')}</div>
      <div class="row gap sm">
        <button class="btn small purple" data-act="autoMerge">⇧ Otomatik Birleştir</button>
        <button class="btn small grey" data-act="bulkSalvage">♻️ Toplu Parçala</button>
      </div>
    </div>
    <div class="inv-grid">${items.map(i => itemCell(i, { mergeable: E.mergeCandidates(S, i).length >= 2 })).join('') || '<p class="muted center">Çanta boş. Savaşlardan ve sandıklardan eşya kazan!</p>'}</div>
    <p class="muted center small">${S.inventory.length} eşya • 🔮 ${S.runes} efsun taşı • 🔒 ${S.seals} mühür • 📜 ${S.scrolls} parşömen</p>
  </div>`;
}

// ------------------------------------------------------------ GELİŞİM EKRANI
function talentHtml() {
  return `<div class="talents">
    <h3>🌟 Yetenekler <small>Kalıcı güçlendirmeler</small></h3>
    ${D.TALENTS.map(t => {
      const l = S.talents[t.id] || 0, cost = D.talentCost(l), max = l >= t.max;
      const tot = Object.entries(t.per).map(([k, v]) => `+${+(v * l).toFixed(1)}${k === 'atk' || k === 'hp' ? '' : '%'}`).join('');
      return `<div class="trow">
        <div class="ticon">${t.icon}</div>
        <div class="tinfo"><b>${t.name} <small>Sv${l}</small></b><span>${t.desc} • Toplam: ${tot}</span>${bar(l, t.max)}</div>
        <button class="btn small ${S.gold >= cost && !max ? 'gold' : 'grey'}" data-act="talent" data-id="${t.id}" ${max ? 'disabled' : ''}>${max ? 'MAKS' : `🪙 ${fmt(cost)}`}</button>
      </div>`;
    }).join('')}
    <h3>🐾 Evcil Hayvanlar <small>Savaşta yanında savaşır</small></h3>
    ${Object.entries(D.PETS).map(([id, p]) => {
      const own = S.pets[id], cost = own ? D.petLevelCost(own.lvl) : null;
      let btn;
      if (!own) btn = p.unlock.free ? `<button class="btn small green" data-act="petUnlock" data-id="${id}">Ücretsiz Al</button>`
        : p.unlock.gems ? `<button class="btn small blue" data-act="petUnlock" data-id="${id}">💎 ${p.unlock.gems}</button>`
        : `<button class="btn small orange" data-act="offer" data-id="${p.unlock.iap}">Kitte</button>`;
      else btn = `<div class="col gap sm"><button class="btn small ${S.pet === id ? 'grey' : 'green'}" data-act="petEquip" data-id="${id}">${S.pet === id ? 'Kuşanıldı' : 'Kuşan'}</button>
        <button class="btn small gold" data-act="petUp" data-id="${id}">⇧ 🪙${fmt(cost.gold)}${cost.gems ? ` +💎${cost.gems}` : ''}</button></div>`;
      return `<div class="trow ${own ? '' : 'locked'}"><div class="ticon">${p.icon}</div><div class="tinfo"><b>${p.name} ${own ? `<small>Sv${own.lvl}</small>` : ''}</b><span>${p.desc}${own ? ` • Hasar +%${(own.lvl - 1) * 12}` : ''}</span></div>${btn}</div>`;
    }).join('')}
  </div>`;
}

// ------------------------------------------------------------ GÖREVLER EKRANI
function questHtml() {
  const tabs = [['daily', 'Günlük'], ['pass', 'Bilet'], ['ach', 'Başarım'], ['invite', 'Davet']];
  let body = '';
  if (questTab === 'daily') {
    const ls = E.loginState(S), mc = E.monthlyState(S);
    body = `<h3>📅 7 Günlük Giriş</h3>
      <div class="login-strip">${D.LOGIN_REWARDS.map((r, i) => `<div class="lday ${i < ls.day || (i === ls.day && !ls.canClaim) ? 'got' : ''} ${i === ls.day && ls.canClaim ? 'today' : ''}" ${i === ls.day && ls.canClaim ? 'data-act="loginClaim"' : ''}><small>Gün ${i + 1}</small><b>${rewText(r)}</b></div>`).join('')}</div>
      ${mc.active ? `<div class="mcard"><b>📆 Aylık Kart</b> <span>${mc.daysLeft} gün kaldı</span><button class="btn small ${mc.canClaim ? 'green' : 'grey'}" data-act="monthlyClaim" ${mc.canClaim ? '' : 'disabled'}>${mc.canClaim ? '100 💎 Al' : 'Yarın'}</button></div>` : ''}
      <h3>🎯 Günlük Görevler <small data-until="${new Date(new Date().setHours(24, 0, 0, 0)).getTime()}"></small></h3>
      ${E.missionsState(S).map(m => `<div class="qrow ${m.claimed ? 'done' : ''}"><div class="qinfo"><b>${m.name}</b>${bar(m.prog, m.goal)}<small>${m.prog}/${m.goal} • ${rewText(m.reward)}</small></div>
        ${m.id === 'ad' && m.prog < m.goal ? `<button class="btn small blue" data-act="adMission">📺 İzle</button>` : `<button class="btn small ${m.prog >= m.goal && !m.claimed ? 'green pulse' : 'grey'}" data-act="mission" data-id="${m.id}" ${m.prog >= m.goal && !m.claimed ? '' : 'disabled'}>${m.claimed ? '✓' : 'Al'}</button>`}</div>`).join('')}`;
  } else if (questTab === 'pass') {
    const tier = E.passTier(S), into = S.pass.xp - tier * D.PASS_XP;
    body = `<div class="pass-head"><div><b>🎫 Efsun Bileti • Sezon ${S.pass.season}</b><small>Kademe ${tier}/${D.PASS_TIERS}</small>${bar(tier >= D.PASS_TIERS ? 1 : into, tier >= D.PASS_TIERS ? 1 : D.PASS_XP, 'gold')}</div>
      ${S.pass.premium ? '<span class="tag gold">PREMIUM ✓</span>' : `<button class="btn small orange" data-act="buy" data-id="battle_pass">Premium ${store.price('battle_pass')}</button>`}</div>
      <div class="pass-cols"><span>Ücretsiz</span><span></span><span>Premium 👑</span></div>
      <div class="pass">${Array.from({ length: D.PASS_TIERS }, (_, i) => i + 1).map(t => {
        const fr = D.passReward(t, false), pr = D.passReward(t, true), un = t <= tier;
        const fc = S.pass.free.includes(t), pc = S.pass.prem.includes(t);
        return `<div class="ptier ${un ? 'un' : ''}">
          <button class="pcell ${fc ? 'got' : un ? 'ready' : ''}" data-act="passClaim" data-t="${t}" data-p="0" ${un && !fc ? '' : 'disabled'}>${rewText(fr)}</button>
          <div class="pnum">${t}</div>
          <button class="pcell prem ${pc ? 'got' : un && S.pass.premium ? 'ready' : ''}" data-act="passClaim" data-t="${t}" data-p="1" ${un && !pc && S.pass.premium ? '' : 'disabled'}>${S.pass.premium ? '' : '🔒 '}${rewText(pr)}</button>
        </div>`;
      }).join('')}</div>`;
  } else if (questTab === 'ach') {
    body = `<h3>🏆 Başarımlar</h3>${E.achievementsState(S).map(a => `<div class="qrow ${a.claimed ? 'done' : ''}"><div class="qinfo"><b>${a.name}</b>${bar(a.prog, a.goal)}<small>${fmt(a.prog)}/${fmt(a.goal)} • ${rewText(a.reward)}</small></div>
      <button class="btn small ${a.prog >= a.goal && !a.claimed ? 'green pulse' : 'grey'}" data-act="ach" data-id="${a.id}" ${a.prog >= a.goal && !a.claimed ? '' : 'disabled'}>${a.claimed ? '✓' : 'Al'}</button></div>`).join('')}`;
  } else {
    body = `<div class="invite">
      <div class="big-emoji">🤝</div>
      <h3>Arkadaşını Davet Et</h3>
      <p class="muted center">Kodunu paylaş. Arkadaşın kodunu girince <b>ikiniz de 200 💎</b> kazanırsınız!</p>
      <div class="code">${S.referral.code}</div>
      <button class="btn green wide" data-act="refShare">📤 Kodu Paylaş</button>
      ${S.referral.used ? '<p class="muted center">✓ Davet kodu kullanıldı</p>' : `<div class="row gap"><input id="refin" placeholder="Arkadaşının kodu" maxlength="11"><button class="btn blue" data-act="refEnter">Gir</button></div>`}
      <button class="btn purple wide" data-act="shareGame">🎬 Oyunu paylaş (+30 💎, günde 1)</button>
    </div>`;
  }
  return `<div class="quests"><div class="subtabs">${tabs.map(([id, n]) => `<button class="${questTab === id ? 'on' : ''}" data-act="qtab" data-q="${id}">${n}</button>`).join('')}</div>${body}</div>`;
}

function rewText(r) {
  const p = [];
  if (r.gold) p.push(`${fmt(r.gold)}🪙`);
  if (r.gems) p.push(`${r.gems}💎`);
  if (r.runes) p.push(`${r.runes}🔮`);
  if (r.seals) p.push(`${r.seals}🔒`);
  if (r.scrolls) p.push(`${r.scrolls}📜`);
  if (r.energy) p.push(`${r.energy}🔋`);
  if (r.passXp) p.push(`${r.passXp} XP`);
  if (r.chest) p.push(`${D.CHESTS[r.chest].icon} ${D.CHESTS[r.chest].name}`);
  for (const i of r.items || []) p.push(`<span style="color:${D.RARITIES[i.rarity].color}">${D.RARITIES[i.rarity].name} ${i.slot === 'any' ? 'Eşya' : D.SLOTS[i.slot].name}</span>`);
  return p.join(' ');
}

// ------------------------------------------------------------ MAĞAZA EKRANI
function shopHtml() {
  const kits = D.PRODUCTS.filter(p => p.kind === 'kit');
  const gems = D.PRODUCTS.filter(p => p.kind === 'gems');
  const goldAmt = Math.round(10000 * (1 + S.maxChapter * 0.35));
  const owned = p => p.once && S.purchases[p.id];
  const limited = p => p.limit && (S.purchases[p.id] || 0) >= p.limit;
  return `<div class="shop">
    <h3>🔥 Özel Kitler</h3>
    <div class="kits">${kits.map(p => `<div class="kit ${owned(p) || limited(p) ? 'owned' : ''}" style="--kc:${p.color}" data-act="offer" data-id="${p.id}">
      <div class="kv">${p.value}</div><div class="ki">${p.icon}</div><b>${p.name}</b><small>${p.desc}</small>
      <div class="kp">${owned(p) || limited(p) ? '✓ Alındı' : store.price(p.id)}</div>
      ${p.limit ? `<div class="klim">${S.purchases[p.id] || 0}/${p.limit}</div>` : ''}</div>`).join('')}</div>

    <h3>⭐ Abonelik & Bilet</h3>
    ${['monthly_card', 'vip_noads', 'battle_pass'].map(id => { const p = D.PRODUCT[id]; const done = (id === 'vip_noads' && S.vip) || (id === 'battle_pass' && S.pass.premium);
      return `<div class="srow"><div class="si">${p.icon}</div><div class="sinfo"><b>${p.name}</b><small>${p.desc}</small></div><button class="btn small ${done ? 'grey' : 'orange'}" data-act="buy" data-id="${id}" ${done ? 'disabled' : ''}>${done ? '✓ Aktif' : store.price(id)}</button></div>`; }).join('')}

    <h3>🎁 Sandıklar</h3>
    <div class="chests">
      ${Object.entries(D.CHESTS).map(([id, c]) => `<div class="chest c-${id}">
        <button class="odds" data-act="odds" data-id="${id}">%</button>
        <div class="ci">${c.icon}</div><b>${c.name}</b>
        ${c.pity ? `<small>${c.pity.every - (S.pity[id] || 0)} açılışta ${D.RARITIES[c.pity.rarity].name} garanti</small>` : '<small>Başlangıç eşyaları</small>'}
        <button class="btn small ${c.cost.gold ? 'gold' : 'blue'}" data-act="chest" data-id="${id}" data-n="1">${c.cost.gold ? `🪙 ${fmt(c.cost.gold)}` : `💎 ${c.cost.gems}`}</button>
        ${c.cost10 ? `<button class="btn small purple" data-act="chest" data-id="${id}" data-n="10">10× 💎 ${fmt(c.cost10.gems)}</button>` : ''}
        ${id === 'bronze' ? `<button class="btn small ${S.daily.freeChest ? 'grey' : 'green pulse'}" data-act="freeChest" ${S.daily.freeChest ? 'disabled' : ''}>${S.daily.freeChest ? 'Yarın' : '📺 Ücretsiz'}</button>` : ''}
      </div>`).join('')}
    </div>

    <h3>💎 Elmas</h3>
    <div class="gems">${gems.map(p => `<div class="gem" data-act="buy" data-id="${p.id}">
      ${!S.firstBuy[p.id] ? '<div class="x2">İLK ALIM 2×</div>' : ''}${p.tag ? `<div class="gtag">${p.tag}</div>` : ''}
      <div class="gi">${'💎'.repeat(Math.min(3, 1 + gems.indexOf(p) / 2 | 0))}</div><b>${fmt(p.gems)}</b><small>${p.name}</small><div class="kp">${store.price(p.id)}</div></div>`).join('')}</div>

    <h3>🪙 Kaynaklar</h3>
    <div class="srow"><div class="si">🪙</div><div class="sinfo"><b>${fmt(goldAmt)} Altın</b><small>Bölüme göre artar</small></div><button class="btn small blue" data-act="softBuy" data-k="gold">💎 100</button></div>
    <div class="srow"><div class="si">🔋</div><div class="sinfo"><b>30 Enerji</b><small>Hemen savaşa dön</small></div><button class="btn small blue" data-act="softBuy" data-k="energy">💎 60</button></div>
    <div class="srow"><div class="si">🔮</div><div class="sinfo"><b>25 Efsun Taşı</b><small>Efsun yenilemek için</small></div><button class="btn small blue" data-act="softBuy" data-k="runes">💎 120</button></div>
    <div class="srow"><div class="si">🔒</div><div class="sinfo"><b>10 Kilit Mührü</b><small>Efsun kilitlemek için</small></div><button class="btn small blue" data-act="softBuy" data-k="seals">💎 150</button></div>
    <div class="srow"><div class="si">📜</div><div class="sinfo"><b>60 Parşömen</b><small>Ekipman yükseltmek için</small></div><button class="btn small blue" data-act="softBuy" data-k="scrolls">💎 90</button></div>

    <div class="legal">
      <button class="btn small grey" data-act="restore">Satın alımları geri yükle</button>
      <p>Fiyatlara KDV dahildir. Satın alımlar App Store / Google Play hesabınızdan tahsil edilir. Sandık oranları "%" düğmesinde yayımlanır. 18 yaş altı kullanıcılar ebeveyn izniyle satın almalıdır.</p>
    </div>
  </div>`;
}

const SOFT = {
  gold: () => ({ cost: { gems: 100 }, rew: { gold: Math.round(10000 * (1 + S.maxChapter * 0.35)) } }),
  energy: () => ({ cost: { gems: 60 }, rew: { energy: 30 } }),
  runes: () => ({ cost: { gems: 120 }, rew: { runes: 25 } }),
  seals: () => ({ cost: { gems: 150 }, rew: { seals: 10 } }),
  scrolls: () => ({ cost: { gems: 90 }, rew: { scrolls: 60 } }),
};

// ============================================================ TIKLAMALAR
const ACT = {
  tab: d => { tab = d.tab; if (d.qt) questTab = d.qt; play('click'); render(); $('#screen').scrollTop = 0; },
  qtab: d => { questTab = d.q; render(); },
  ch: d => { selCh = Math.max(1, Math.min(S.maxChapter, selCh + +d.d)); play('click'); render(); },
  play: () => startBattle(selCh),
  filter: d => { invFilter = d.f; render(); },
  item: d => openItem(d.uid),
  heroes: () => heroesModal(),
  statsModal: () => statsModal(),
  login: () => loginModal(),
  loginClaim: () => claimLogin(),
  idle: () => idleModal(),
  daily: () => dailyModal(),
  offer: d => offerModal(d.id),
  buy: d => store.buy(d.id),
  chest: d => buyChest(d.id, +d.n),
  freeChest: async () => { if (await watchAd()) { S.daily.freeChest = true; const items = E.openChest(S, 'bronze', 1, true); chestReveal(items); } },
  odds: d => oddsModal(d.id),
  softBuy: d => { const o = SOFT[d.k](); if (!E.pay(S, o.cost)) return noGems(); play('buy'); rewardPopup(E.grant(S, o.rew)); render(); },
  energy: () => energyModal(),
  talent: d => upgradeTalent(d.id),
  petUnlock: d => { const p = D.PETS[d.id]; if (p.unlock.gems && !E.pay(S, { gems: p.unlock.gems })) return noGems(); rewardPopup(E.grant(S, { pet: d.id })); S.pet = d.id; play('legend'); render(); },
  petEquip: d => { S.pet = S.pet === d.id ? null : d.id; render(); },
  petUp: d => { const c = D.petLevelCost(S.pets[d.id].lvl); if (!E.pay(S, c)) return c.gems && S.gems < c.gems ? noGems() : noGold(); S.pets[d.id].lvl++; play('buy'); render(); },
  mission: d => { const m = D.MISSIONS.find(x => x.id === d.id); S.daily.claimed.push(m.id); play('coin'); rewardPopup(E.grant(S, m.reward)); render(); },
  adMission: async () => { if (await watchAd()) { E.progress(S, 'ad'); render(); } },
  ach: d => { const a = D.ACHIEVEMENTS.find(x => x.id === d.id); S.achievements.push(a.id); play('legend'); rewardPopup(E.grant(S, a.reward), 'Başarım!'); render(); },
  passClaim: d => { const t = +d.t, prem = d.p === '1'; (prem ? S.pass.prem : S.pass.free).push(t); play('coin'); rewardPopup(E.grant(S, D.passReward(t, prem))); render(); },
  monthlyClaim: () => { const m = E.monthlyState(S); if (!m.canClaim) return toast(m.active ? 'Bugünkü elmasını aldın' : 'Aylık kart aktif değil'); S.monthly.last = today(); rewardPopup(E.grant(S, { gems: 100 }), 'Aylık Kart'); render(); },
  refShare: () => doShare(`Efsun Avcısı'nda bana katıl! Davet kodum: ${S.referral.code} — ikimiz de 200 💎 kazanalım ⚔️`),
  refEnter: () => {
    const v = ($('#refin')?.value || '').trim().toUpperCase();
    if (!/^EFSUN-[A-Z0-9]{5}$/.test(v)) return toast('Geçersiz kod', 'bad');
    if (v === S.referral.code) return toast('Kendi kodunu giremezsin 🙂', 'bad');
    S.referral.used = true; rewardPopup(E.grant(S, { gems: 200 }), 'Davet Ödülü'); render();
  },
  shareGame: async () => {
    const r = await doShare(`Efsun Avcısı'nda ${S.maxChapter - 1}. bölümü geçtim, gücüm ⚡${fmt(stats().power)}! Beni geçebilir misin?`);
    if (r !== 'cancel' && S.daily.shared !== true) { S.daily.shared = true; rewardPopup(E.grant(S, { gems: 30 }), 'Paylaşım Ödülü'); render(); }
  },
  autoMerge: () => autoMerge(),
  bulkSalvage: () => bulkSalvage(),
  settings: () => settingsModal(),
  restore: async () => { if (await store.restore()) toast('Satın alımlar kontrol ediliyor…'); else toast('Geri yükleme yalnızca mobil uygulamada çalışır'); },
};

function onClick(e) {
  const itemEl = e.target.closest('.item[data-uid]');
  if (itemEl && itemEl.closest('#screen')) { play('click'); return openItem(itemEl.dataset.uid); }
  const a = e.target.closest('[data-act]');
  if (!a || a.disabled) return;
  const fn = ACT[a.dataset.act];
  if (fn) { e.preventDefault(); fn(a.dataset, a); }
}

const noGems = () => { play('error'); toast('Yeterli elmas yok', 'bad'); tab = 'shop'; render(); };
const noGold = () => { play('error'); toast('Yeterli altın yok', 'bad'); };

// ============================================================ EŞYA PENCERESİ
function openItem(uid) {
  const it = S.inventory.find(i => i.uid === uid);
  if (!it) return;
  if (it.isNew) { it.isNew = false; }
  const locks = new Set();
  const m = modal('', { cls: 'itemmodal', onClose: render });
  const draw = () => {
    const r = D.RARITIES[it.rarity], eq = E.isEquipped(S, it);
    const uc = E.upgradeCost(it), maxed = it.lvl >= r.maxLvl;
    const ec = E.enchantCost(it, locks.size);
    const mc = E.mergeCandidates(S, it);
    const cur = stats().power;
    const alt = E.computeStats({ ...S, equipped: { ...S.equipped, [it.slot]: eq ? undefined : it.uid } }).power;
    const delta = alt - cur;
    const set = it.set ? D.SETS[it.set] : null, setN = set ? (stats().sets[it.set] || 0) : 0;
    m.el.innerHTML = `<button class="x" data-close>✕</button>
      <div class="ihead r${it.rarity}" style="--rc:${r.color}">
        <div class="ibig">${E.itemIcon(it)}</div>
        <div><div class="iname" style="color:${r.color}">${esc(E.itemName(it))}</div>
        <div class="isub">${r.name} ${D.SLOTS[it.slot].name}${it.slot === 'weapon' ? ' • ' + D.WEAPON_TYPES[E.baseOf(it).wtype].desc : ''}</div>
        <div class="ilvl">Seviye ${it.lvl}/${r.maxLvl}</div></div>
      </div>
      <div class="istats">${itemStatsHtml(it)}</div>
      ${set ? `<div class="iset-info" style="--sc:${set.color}"><b>${set.icon} ${set.name} Seti (${setN}/4)</b><div class="${setN >= 2 ? 'on' : ''}">2 parça: ${set.d2}</div><div class="${setN >= 4 ? 'on' : ''}">4 parça: ${set.d4}</div></div>` : ''}
      <div class="affixes"><div class="ahead">✨ Efsunlar ${it.affixes.length ? '<small>kilitlemek için 🔓</small>' : ''}</div>
        ${it.affixes.length ? it.affixes.map((a, i) => affixRow(a, i, { lockable: true, locked: locks.has(i) })).join('') : '<p class="muted small">Sıradan eşyaların efsunu yoktur. Birleştirerek nadirliği yükselt!</p>'}
      </div>
      ${!eq && delta !== 0 ? `<div class="delta ${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '▲' : '▼'} ${fmt(Math.abs(delta))} Güç</div>` : ''}
      <div class="ibtns">
        <button class="btn ${eq ? 'grey' : 'green'}" data-i="equip">${eq ? 'Çıkar' : 'Kuşan'}</button>
        <button class="btn gold" data-i="up" ${maxed ? 'disabled' : ''}>${maxed ? 'MAKS SEVİYE' : `⇧ Yükselt<small>🪙${fmt(uc.gold)} 📜${uc.scrolls}</small>`}</button>
        <button class="btn gold" data-i="up5" ${maxed ? 'disabled' : ''}>⇧×5</button>
        <button class="btn purple" data-i="ench" ${it.affixes.length ? '' : 'disabled'}>🔮 Efsunla<small>🔮${ec.runes}${ec.seals ? ` 🔒${ec.seals}` : ''}</small></button>
        <button class="btn blue" data-i="merge" ${mc.length >= 2 ? '' : 'disabled'}>⇧ Birleştir<small>${it.rarity >= 5 ? 'En yüksek' : `${mc.length}/2 aynı eşya`}</small></button>
        <button class="btn red" data-i="salv" ${eq ? 'disabled' : ''}>♻️ Parçala</button>
      </div>`;
  };
  draw();
  m.el.addEventListener('click', async e => {
    const lk = e.target.closest('[data-lock]');
    if (lk) { const i = +lk.dataset.lock; if (locks.has(i)) locks.delete(i); else if (locks.size < it.affixes.length - 1) locks.add(i); else toast('En az 1 efsun açık kalmalı'); play('click'); return draw(); }
    const b = e.target.closest('[data-i]');
    if (!b || b.disabled) return;
    const act = b.dataset.i;
    if (act === 'equip') {
      if (E.isEquipped(S, it)) delete S.equipped[it.slot]; else S.equipped[it.slot] = it.uid;
      play('click'); vib(10); save(); return m.close();
    }
    if (act === 'up' || act === 'up5') {
      let n = act === 'up5' ? 5 : 1, done = 0;
      while (n-- > 0 && it.lvl < D.RARITIES[it.rarity].maxLvl) {
        const c = E.upgradeCost(it);
        if (!E.pay(S, c)) break;
        it.lvl++; done++; S.stats.upgrades++; E.progress(S, 'upgrade');
      }
      if (!done) { play('error'); toast(S.gold < E.upgradeCost(it).gold ? 'Yeterli altın yok' : 'Yeterli parşömen yok', 'bad'); }
      else { play('buy'); vib(12); b.closest('.modal').querySelector('.ihead')?.classList.add('flash'); }
      save(); return draw();
    }
    if (act === 'ench') {
      if (!E.doEnchant(S, it, [...locks])) { play('error'); return toast('Yeterli efsun taşı / mühür yok — Mağazaya bak', 'bad'); }
      play('zap'); vib(15); save(); draw();
      m.el.querySelectorAll('.affix').forEach((el, i) => { if (!locks.has(i)) el.classList.add('roll'); });
      if (it.affixes.some(a => a.q >= 0.97)) { toast('✨ Mükemmel efsun!', 'good'); play('legend'); }
      return;
    }
    if (act === 'merge') {
      const ok = await confirmBox('Birleştir', `2 adet ${D.RARITIES[it.rarity].name} ${D.SLOTS[it.slot].name} bu eşyaya eritilecek ve <b style="color:${D.RARITIES[it.rarity + 1].color}">${D.RARITIES[it.rarity + 1].name}</b> olacak.`, 'Birleştir');
      if (!ok) return;
      E.doMerge(S, it); play(it.rarity >= 4 ? 'legend' : 'level'); vib(40); save();
      rewardPopup([{ icon: E.itemIcon(it), text: E.itemName(it), rarity: it.rarity }], 'Birleştirildi!');
      return draw();
    }
    if (act === 'salv') {
      const v = E.salvageValue(it);
      if (it.rarity >= 3 && !(await confirmBox('Parçala?', `${D.RARITIES[it.rarity].name} eşyayı parçalamak istediğine emin misin?`, 'Parçala'))) return;
      S.inventory = S.inventory.filter(i => i !== it);
      play('coin'); m.close(); rewardPopup(E.grant(S, v), 'Parçalandı');
    }
  });
}

function autoMerge() {
  let merged = [];
  let again = true;
  while (again) {
    again = false;
    for (const it of [...S.inventory].sort((a, b) => a.rarity - b.rarity)) {
      if (!S.inventory.includes(it) || it.rarity >= 3) continue; // Destansı+ elle birleştirilir
      if (E.mergeCandidates(S, it).length >= 2) { E.doMerge(S, it); merged.push(it); again = true; }
    }
  }
  if (!merged.length) return toast('Birleştirilecek 3\'lü yok (Destansı altı)');
  play('level'); vib(30);
  const uniq = [...new Set(merged)];
  rewardPopup(uniq.map(it => ({ icon: E.itemIcon(it), text: E.itemName(it), rarity: it.rarity })), `${merged.length} birleştirme!`);
  render();
}

async function bulkSalvage() {
  const eqIds = Object.values(S.equipped);
  const list = S.inventory.filter(i => i.rarity <= 1 && !eqIds.includes(i.uid));
  if (!list.length) return toast('Parçalanacak Sıradan/Nadir eşya yok');
  if (!(await confirmBox('Toplu Parçala', `${list.length} adet Sıradan ve Nadir eşya parçalanacak.`, 'Parçala'))) return;
  const tot = { gold: 0, scrolls: 0, runes: 0 };
  for (const it of list) { const v = E.salvageValue(it); tot.gold += v.gold; tot.scrolls += v.scrolls; tot.runes += v.runes; }
  S.inventory = S.inventory.filter(i => !list.includes(i));
  play('coin'); rewardPopup(E.grant(S, tot), 'Parçalandı'); render();
}

// ============================================================ PENCERELER
function statsModal() {
  const s = stats();
  const rows = [['⚔️ Saldırı', fmt(s.atk)], ['❤️ Can', fmt(s.hp)], ['⚡ Saldırı Hızı', s.aspd + '/sn'], ['🎯 Kritik Şansı', '%' + s.crit.toFixed(1)], ['💥 Kritik Hasarı', '%' + s.critDmg.toFixed(0)],
    ['🧛 Can Çalma', '%' + s.lifesteal.toFixed(1)], ['💚 Can Yenileme', '%' + s.regen.toFixed(1) + '/sn'], ['🛡️ Hasar Azaltma', '%' + s.dr.toFixed(1)], ['💨 Kaçınma', '%' + s.dodge.toFixed(1)],
    ['👟 Hareket', s.move], ['🔥 Yakma', '%' + s.burn.toFixed(0)], ['❄️ Dondurma', '%' + s.freeze.toFixed(0)], ['⚡ Şimşek', '%' + s.chain.toFixed(0)], ['🌵 Diken', '%' + s.thorns.toFixed(0)],
    ['👑 Boss Hasarı', '%' + s.bossDmg.toFixed(0)], ['🎯 Çoklu Atış', '+' + s.multishot], ['📌 Delici', '+' + s.pierce], ['🔁 Sekme', '+' + s.bounce], ['🪙 Altın', '+%' + s.gold.toFixed(0)], ['📘 Tecrübe', '+%' + s.xp.toFixed(0)]];
  modal(`<h2>Karakter İstatistikleri</h2><div class="statgrid">${rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
    ${s.setPowers.length ? `<p class="center">Aktif set gücü: ${s.setPowers.map(p => Object.values(D.SETS).find(x => x.p4 === p).d4).join(', ')}</p>` : ''}`);
}

function heroesModal() {
  const m = modal('', { cls: 'heroes', onClose: render });
  const draw = () => {
    m.el.innerHTML = `<button class="x" data-close>✕</button><h2>Kahramanlar</h2>${D.HERO_ORDER.map(id => {
      const h = D.HEROES[id], own = S.heroes[id], st = E.computeStats(S, id);
      let btn;
      if (!own) btn = h.unlock.gold ? `<button class="btn small gold" data-h="unlock" data-id="${id}">🪙 ${fmt(h.unlock.gold)}</button>`
        : h.unlock.gems ? `<button class="btn small blue" data-h="unlock" data-id="${id}">💎 ${h.unlock.gems}</button>`
        : `<button class="btn small orange" data-h="iap" data-id="${h.unlock.iap}">Kitte ${store.price(h.unlock.iap)}</button>`;
      else {
        const c = D.heroLevelCost(own.lvl);
        btn = `<div class="col gap sm">${S.hero === id ? '<span class="tag green">Seçili</span>' : `<button class="btn small green" data-h="sel" data-id="${id}">Seç</button>`}
          <button class="btn small gold" data-h="up" data-id="${id}">⇧ ${own.shards}/${c.shards}🧩 🪙${fmt(c.gold)}</button></div>`;
      }
      return `<div class="hrow ${own ? '' : 'locked'}" style="--hc:${h.color}"><div class="hicon">${h.icon}</div>
        <div class="hinfo"><b>${h.name} <small>${h.title}${own ? ` • Sv${own.lvl}` : ''}</small></b><span>${h.passive}</span><small>⚔️${fmt(st.atk)} ❤️${fmt(st.hp)} ⚡${fmt(st.power)}</small></div>${btn}</div>`;
    }).join('')}<p class="muted small center">Kahraman parçaları 🧩 sandıklardan, kitlerden ve Elmas Sandık bonuslarından gelir. Her seviye +%6 saldırı ve can.</p>`;
  };
  draw();
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    const id = b.dataset.id, h = D.HEROES[id];
    if (b.dataset.h === 'sel') { S.hero = id; play('click'); }
    if (b.dataset.h === 'iap') { m.close(); return offerModal(id); }
    if (b.dataset.h === 'unlock') {
      const cost = h.unlock.gold ? { gold: h.unlock.gold } : { gems: h.unlock.gems };
      if (!E.pay(S, cost)) return cost.gems ? (m.close(), noGems()) : noGold();
      S.heroes[id] = { lvl: 1, shards: 0 }; S.hero = id; play('legend'); toast(`${h.name} katıldı!`, 'good');
    }
    if (b.dataset.h === 'up') {
      const own = S.heroes[id], c = D.heroLevelCost(own.lvl);
      if (own.shards < c.shards) { play('error'); return toast('Yeterli kahraman parçası yok', 'bad'); }
      if (!E.pay(S, { gold: c.gold })) return noGold();
      own.shards -= c.shards; own.lvl++; play('level');
    }
    save(); draw();
  });
}

function loginModal() {
  const ls = E.loginState(S);
  const m = modal(`<h2>📅 Günlük Giriş Ödülü</h2><div class="login-strip big">${D.LOGIN_REWARDS.map((r, i) => `<div class="lday ${i < ls.day || (i === ls.day && !ls.canClaim) ? 'got' : ''} ${i === ls.day && ls.canClaim ? 'today' : ''}"><small>Gün ${i + 1}</small><b>${rewText(r)}</b></div>`).join('')}</div>
    <button class="btn green wide" data-x="claim" ${ls.canClaim ? '' : 'disabled'}>${ls.canClaim ? 'Ödülü Al' : 'Yarın tekrar gel!'}</button>`);
  m.el.querySelector('[data-x]').onclick = () => { m.close(); claimLogin(); };
}

function claimLogin() {
  const ls = E.loginState(S); if (!ls.canClaim) return;
  const r = D.LOGIN_REWARDS[ls.day];
  S.login.last = today(); S.login.day = (S.login.day + 1) % 7;
  play('coin'); rewardPopup(E.grant(S, r), `Gün ${ls.day + 1} Ödülü`); render();
}

function idleModal() {
  const r = E.idleReward(S);
  const h = Math.floor(r.hours), mm = Math.floor((r.hours - h) * 60);
  const m = modal(`<h2>🏕️ Devriye Ödülü</h2><p class="muted center">Kahramanın sen yokken ${S.maxChapter}. bölümde devriye geziyor. (En fazla ${D.GAME.idleCapHours} saat${S.vip ? ', VIP 2×' : ''})</p>
    <div class="idle-box"><div>⏱️ ${h}s ${mm}dk</div><div>🪙 ${fmt(r.gold)}</div><div>📜 ${r.scrolls}</div><div>🔮 ${r.runes}</div></div>
    <div class="row gap"><button class="btn green" data-x="claim" ${r.gold > 0 ? '' : 'disabled'}>Topla</button><button class="btn blue" data-x="fast">⚡ Hızlı Devriye (2s)<small>💎 50</small></button></div>`);
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'claim') { S.idleTs = Date.now(); m.close(); play('coin'); rewardPopup(E.grant(S, { gold: r.gold, scrolls: r.scrolls, runes: r.runes })); render(); }
    if (b.dataset.x === 'fast') {
      if (!E.pay(S, { gems: 50 })) { m.close(); return noGems(); }
      const mul = S.vip ? 2 : 1, ch = S.maxChapter;
      m.close(); play('coin'); rewardPopup(E.grant(S, { gold: Math.floor(2 * (300 + ch * 180) * mul), scrolls: Math.floor(2 * (1 + ch * 0.5) * mul) }), 'Hızlı Devriye'); render();
    }
  });
}

function dailyModal() {
  const dc = D.DAILY_CHALLENGES[S.daily.challengeIdx || 0];
  const done = !!S.daily.challenge;
  const ch = Math.max(1, S.maxChapter);
  const m = modal(`<h2>🔥 Günün Mücadelesi</h2><div class="dc"><b>${dc.name}</b><p>${dc.desc}</p><small>Bölüm ${ch} • Herkes için aynı kural — skorunu paylaş!</small></div>
    <p class="center">Ödül (günde 1): <b>150 💎 + Elmas Sandık</b> (5. dalgaya ulaş)</p>
    <button class="btn orange wide" data-x="go" ${done ? 'disabled' : ''}>${done ? '✓ Bugün tamamlandı' : `Başla 🔋${D.GAME.energyPerRun}`}</button>`);
  m.el.querySelector('[data-x]').onclick = () => { m.close(); startBattle(ch, { ...dc.mods, daily: true }); };
}

function energyModal() {
  const m = modal(`<h2>🔋 Enerji</h2><p class="center">${S.energy}/${E.energyMax(S)} • Her ${D.GAME.energyRegenSec / 60} dakikada 1 dolar</p>
    <div class="col gap"><button class="btn blue" data-x="gems">30 Enerji • 💎 60</button>
    <button class="btn green" data-x="ad" ${(S.daily.adEnergy || 0) >= 3 ? 'disabled' : ''}>📺 Reklam izle: +10 Enerji (${3 - (S.daily.adEnergy || 0)}/3)</button>
    <button class="btn orange" data-x="card">📆 Aylık Kart: enerji sınırı +10</button></div>`);
  m.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-x]'); if (!b || b.disabled) return;
    if (b.dataset.x === 'gems') { if (!E.pay(S, { gems: 60 })) { m.close(); return noGems(); } S.energy += 30; play('buy'); }
    if (b.dataset.x === 'ad') { if (await watchAd()) { S.daily.adEnergy = (S.daily.adEnergy || 0) + 1; S.energy += 10; play('coin'); } }
    if (b.dataset.x === 'card') { m.close(); return offerModal('monthly_card'); }
    m.close(); render();
  });
}

function oddsModal(id) {
  const c = D.CHESTS[id], tot = c.rates.reduce((s, r) => s + r[1], 0);
  modal(`<h2>${c.icon} ${c.name} — Olasılıklar</h2>
    <table class="odds-t">${c.rates.map(([r, w]) => `<tr><td style="color:${D.RARITIES[r].color}">${D.RARITIES[r].name}</td><td>%${(w / tot * 100).toFixed(1)}</td></tr>`).join('')}</table>
    ${c.pity ? `<p class="muted center small">Şans koruması: ${c.pity.every} açılışta ${D.RARITIES[c.pity.rarity].name} gelmezse bir sonraki garanti. Sayaç: ${S.pity[id] || 0}/${c.pity.every}</p>` : ''}
    <p class="muted center small">Eşya yuvası rastgeledir (6 yuva eşit olasılık). Destansı ve üstü eşyalarda %30 set şansı.</p>`);
}

function buyChest(id, n) {
  const items = E.openChest(S, id, n);
  if (!items) return D.CHESTS[id].cost.gold ? noGold() : noGems();
  chestReveal(items);
}

function chestReveal(items) {
  const best = Math.max(...items.map(i => i.rarity));
  play(best >= 4 ? 'legend' : 'buy'); vib(best >= 4 ? 80 : 20);
  if (best >= 4) document.body.classList.add('flash-' + best), setTimeout(() => document.body.classList.remove('flash-' + best), 700);
  rewardPopup(items.map(it => ({ icon: E.itemIcon(it), text: E.itemName(it), rarity: it.rarity })), best >= 5 ? '🌟 MİTİK!' : best >= 4 ? '🔥 EFSANEVİ!' : 'Sandık Açıldı');
  render();
}

function offerModal(id) {
  const p = D.PRODUCT[id]; if (!p) return;
  const owned = (p.once && S.purchases[id]) || (p.limit && (S.purchases[id] || 0) >= p.limit);
  const c = p.contents || {};
  const lines = [];
  if (c.hero) lines.push(`${D.HEROES[c.hero].icon} Kahraman: <b>${D.HEROES[c.hero].name}</b> — ${D.HEROES[c.hero].passive}`);
  if (c.pet) lines.push(`${D.PETS[c.pet].icon} Evcil: <b>${D.PETS[c.pet].name}</b> — ${D.PETS[c.pet].desc}`);
  for (const i of c.items || []) lines.push(`${D.BASES[i.slot === 'any' ? 'weapon' : i.slot].find(b => b.id === i.base)?.icon || D.SLOTS[i.slot === 'any' ? 'weapon' : i.slot].icon} <b style="color:${D.RARITIES[i.rarity].color}">${D.RARITIES[i.rarity].name}${i.set ? ' ' + D.SETS[i.set].name : ''} ${D.SLOTS[i.slot]?.name || 'Eşya'}</b>`);
  if (c.gems) lines.push(`💎 <b>${fmt(c.gems)}</b> Elmas`);
  if (c.gold) lines.push(`🪙 <b>${fmt(c.gold)}</b> Altın`);
  if (c.runes) lines.push(`🔮 <b>${c.runes}</b> Efsun Taşı`);
  if (c.seals) lines.push(`🔒 <b>${c.seals}</b> Kilit Mührü`);
  if (c.scrolls) lines.push(`📜 <b>${c.scrolls}</b> Parşömen`);
  for (const [h, n] of Object.entries(c.shards || {})) lines.push(`🧩 <b>${n}</b> ${D.HEROES[h].name} parçası`);
  const isStarter = id === 'kit_starter' && S.offers.starterUntil > Date.now();
  const m = modal(`<div class="offer-head" style="--kc:${p.color || '#f59e0b'}"><div class="kv">${p.value || ''}</div><div class="oi">${p.icon}</div><h2>${p.name}</h2>
    ${isStarter ? `<div class="timer">⏳ Teklif bitiyor: <b data-until="${S.offers.starterUntil}">${countdown(S.offers.starterUntil - Date.now())}</b></div>` : ''}</div>
    ${lines.length ? `<ul class="contents">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : `<p class="center">${p.desc}</p>`}
    <button class="btn orange wide big" data-x="buy" ${owned ? 'disabled' : ''}>${owned ? '✓ Satın alındı' : store.price(id)}</button>
    <p class="muted center small">${store.native ? 'Ödeme mağaza hesabınızdan alınır.' : 'Tarayıcı sürümü: Test Mağazası'}</p>`, { cls: 'offer' });
  m.el.querySelector('[data-x]').onclick = () => { m.close(); store.buy(id); };
}

// ---------------- Satın alma ----------------
function testStoreConfirm(p) {
  return new Promise(res => {
    let done = false;
    const m = modal(`<h2>🧪 Test Mağazası</h2><p class="center"><b>${p.name}</b> • ${store.price(p.id)}</p>
      <p class="muted center small">Bu tarayıcı/demo sürümünde <b>gerçek ödeme alınmaz</b>. Google Play / App Store sürümünde burada resmî ödeme ekranı açılır ve ürün ancak ödeme onaylanınca verilir.</p>
      <div class="row gap"><button class="btn grey" data-x="0">İptal</button><button class="btn green" data-x="1">Test satın al</button></div>`, { onClose: () => { if (!done) res(false); } });
    m.el.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; done = true; res(b.dataset.x === '1'); m.close(); });
  });
}

function grantProduct(id, txId) {
  if (txId && S.txIds.includes(txId)) return;
  const p = D.PRODUCT[id]; if (!p) return;
  if (txId) S.txIds.push(txId);
  if (S.txIds.length > 300) S.txIds = S.txIds.slice(-300);
  S.purchases[id] = (S.purchases[id] || 0) + 1;
  let list = [], title = 'Satın alma başarılı!';
  if (p.kind === 'gems') {
    const first = !S.firstBuy[id];
    S.firstBuy[id] = true;
    list = E.grant(S, { gems: p.gems * (first ? 2 : 1) });
    if (first) title = 'İlk alım 2× bonus!';
  } else if (p.kind === 'kit') {
    list = E.grant(S, p.contents);
    if (p.contents.pet) S.pet = p.contents.pet;
    if (p.contents.hero) S.hero = p.contents.hero;
  } else if (p.kind === 'sub') {
    S.monthly.until = Math.max(Date.now(), S.monthly.until) + 30 * 86400000;
    list = E.grant(S, { gems: 300 });
  } else if (p.kind === 'vip') {
    S.vip = true; list = [{ icon: '⭐', text: 'VIP aktif: reklamsız + %25 altın', rarity: 4 }];
  } else if (p.kind === 'pass') {
    S.pass.premium = true; list = [{ icon: '🎫', text: 'Premium bilet açıldı', rarity: 4 }];
  }
  save(true);
  play('legend'); vib(60);
  rewardPopup(list, title, 'Desteğin için teşekkürler! ❤️');
  render();
}

// ---------------- Reklam ----------------
function simulateAd() {
  return new Promise(res => {
    let s = 3, done = false;
    const m = modal(`<h2>📺 Ödüllü Video</h2><div class="adsim"><div class="adbox">REKLAM<br><small>(test)</small></div><p>Ödül <b id="adc">${s}</b> sn sonra</p></div>`, { closable: false });
    const iv = setInterval(() => {
      s--; const c = m.el.querySelector('#adc'); if (c) c.textContent = s;
      if (s <= 0 && !done) { done = true; clearInterval(iv); m.close(); res(true); }
    }, 1000);
  });
}
async function watchAd() {
  const ok = await ads.rewarded(S.vip);
  if (ok) { S.daily.ads = (S.daily.ads || 0) + 1; E.progress(S, 'ad'); }
  else toast('Reklam yüklenemedi, sonra tekrar dene', 'bad');
  return ok;
}

// ---------------- Paylaşım ----------------
async function doShare(text, blob) {
  const url = D.GAME.shareUrl || (location.protocol.startsWith('http') ? location.href.split('#')[0] : '');
  const r = await share({ title: D.GAME.name, text, url, blob });
  if (r === 'copied') toast('Bağlantı panoya kopyalandı 📋', 'good');
  return r;
}

function shareCard(res) {
  const c = document.createElement('canvas'); c.width = 720; c.height = 1280;
  const x = c.getContext('2d'), th = D.chapterInfo(res.chapter), h = D.HEROES[S.hero];
  const g = x.createLinearGradient(0, 0, 0, 1280); g.addColorStop(0, th.bg); g.addColorStop(1, '#05060a');
  x.fillStyle = g; x.fillRect(0, 0, 720, 1280);
  x.fillStyle = th.accent; x.globalAlpha = 0.15; x.beginPath(); x.arc(360, 520, 300, 0, 7); x.fill(); x.globalAlpha = 1;
  x.textAlign = 'center'; x.fillStyle = '#fde68a'; x.font = '900 72px system-ui'; x.fillText('EFSUN AVCISI', 360, 150);
  x.font = '220px serif'; x.fillText(h.icon, 360, 600);
  x.fillStyle = '#fff'; x.font = '800 54px system-ui'; x.fillText(res.victory ? 'BÖLÜM TEMİZLENDİ!' : `${Math.floor(res.wave)}. DALGA`, 360, 760);
  x.font = '600 38px system-ui'; x.fillStyle = '#cbd5e1'; x.fillText(th.title, 360, 820);
  x.fillStyle = '#fff'; x.font = '700 44px system-ui';
  x.fillText(`💀 ${fmt(res.kills)} düşman   ⏱️ ${mmss(Math.floor(res.time))}`, 360, 920);
  x.fillText(`⚡ ${fmt(stats().power)} Güç`, 360, 990);
  x.fillStyle = th.accent; x.font = '800 40px system-ui'; x.fillText('Beni geçebilir misin? 👀', 360, 1120);
  x.fillStyle = '#94a3b8'; x.font = '500 28px system-ui'; x.fillText('#EfsunAvcısı', 360, 1190);
  return new Promise(r => c.toBlob(r, 'image/png'));
}

// ---------------- Ayarlar ----------------
function settingsModal() {
  const m = modal('', { onClose: render });
  const draw = () => {
    m.el.innerHTML = `<button class="x" data-close>✕</button><h2>⚙️ Ayarlar</h2>
      <div class="setrow"><span>Oyuncu adı</span><input id="pname" value="${esc(S.playerName)}" maxlength="16"></div>
      <div class="setrow"><span>🔊 Ses</span><button class="tgl ${S.settings.sound ? 'on' : ''}" data-s="sound"></button></div>
      <div class="setrow"><span>📳 Titreşim</span><button class="tgl ${S.settings.haptic ? 'on' : ''}" data-s="haptic"></button></div>
      <div class="setrow"><span>🎨 Grafik</span><button class="btn small grey" data-s="quality">${S.settings.quality === 'high' ? 'Yüksek' : 'Pil Tasarrufu'}</button></div>
      <div class="col gap"><button class="btn blue" data-s="export">💾 Kaydı dışa aktar</button><button class="btn blue" data-s="import">📥 Kayıt kodu yükle</button>
      <button class="btn grey" data-s="restore">Satın alımları geri yükle</button>
      ${D.GAME.privacyUrl ? `<a class="btn grey" href="${D.GAME.privacyUrl}" target="_blank" rel="noopener">Gizlilik Politikası</a>` : ''}
      <button class="btn red" data-s="reset">Oyunu sıfırla</button></div>
      <p class="muted center small">${D.GAME.name} v${D.GAME.version} • Kayıt kimliği ${S.created.toString(36)}</p>`;
  };
  draw();
  m.el.addEventListener('change', e => { if (e.target.id === 'pname') { S.playerName = e.target.value.trim().slice(0, 16) || S.playerName; save(); } });
  m.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const k = b.dataset.s;
    if (k === 'sound') { S.settings.sound = !S.settings.sound; sfx.on = S.settings.sound; }
    if (k === 'haptic') S.settings.haptic = !S.settings.haptic;
    if (k === 'quality') S.settings.quality = S.settings.quality === 'high' ? 'low' : 'high';
    if (k === 'export') { const code = exportSave(S); try { await navigator.clipboard.writeText(code); toast('Kayıt kodu panoya kopyalandı', 'good'); } catch (_) { prompt('Kayıt kodun:', code); } }
    if (k === 'import') { const code = prompt('Kayıt kodunu yapıştır:'); if (code) { try { importSave(code); location.reload(); } catch (err) { toast('Kod geçersiz', 'bad'); } } }
    if (k === 'restore') ACT.restore();
    if (k === 'reset') { if (await confirmBox('Emin misin?', 'Tüm ilerleme silinecek. Satın alımlar mağazadan geri yüklenebilir.', 'Sil')) { wipe(); location.reload(); } }
    save(); draw();
  });
}

function upgradeTalent(id) {
  const t = D.TALENTS.find(x => x.id === id), l = S.talents[id] || 0;
  if (l >= t.max) return;
  if (!E.pay(S, { gold: D.talentCost(l) })) return noGold();
  S.talents[id] = l + 1; play('buy'); vib(10); render();
}

// ============================================================ SAVAŞ AKIŞI
function startBattle(chapter, mods = null) {
  if (S.energy < D.GAME.energyPerRun) { play('error'); return energyModal(); }
  if (S.energy >= E.energyMax(S)) S.energyTs = Date.now();
  S.energy -= D.GAME.energyPerRun;
  S.stats.runs++; E.progress(S, 'runs');
  save(true);
  sfx.unlock(); play('click');
  closeAllModals();
  $('#menu').hidden = true; $('#battle').hidden = false;
  run = { mods, rerolls: 1, adDouble: false };
  const st = stats();
  game = new Game($('#cv'), {
    stats: st, chapter, mods: mods || {}, quality: S.settings.quality, heroColor: D.HEROES[S.hero].color,
    sfx: play, haptic: vib, onHud: hud, onLevelUp: levelUpModal, onDeath: deathModal, onEnd: endModal,
    onInput: () => { const t = $('#tut'); if (t) t.remove(); },
  });
  initHud();
  if (S.tutorial === 0) {
    $('#battle').insertAdjacentHTML('beforeend', `<div id="tut"><div class="hand">👆</div><b>Ekranda sürükleyerek hareket et</b><span>Saldırı otomatik! Mermilerden kaç, ganimetleri topla.</span></div>`);
    S.tutorial = 1;
  }
  game.start();
}

let H = {};
function initHud() {
  $('#hud').innerHTML = `<div class="hud-top">
      <div class="hp"><div class="hpfill"></div><span class="hptxt"></span><span class="shield">🔰</span></div>
      <button class="pause" aria-label="Duraklat">❚❚</button>
    </div>
    <div class="hud-row"><div class="lvl">1</div><div class="xp"><div></div></div></div>
    <div class="hud-row small"><span class="wave"></span><div class="wbar"><div></div></div><span class="kills"></span><span class="hgold"></span></div>
    <div class="bossbar" hidden><b></b><div><div></div></div></div>`;
  H = {
    hpfill: $('#hud .hpfill'), hptxt: $('#hud .hptxt'), shield: $('#hud .shield'), lvl: $('#hud .lvl'), xp: $('#hud .xp div'),
    wave: $('#hud .wave'), wbar: $('#hud .wbar div'), kills: $('#hud .kills'), gold: $('#hud .hgold'),
    boss: $('#hud .bossbar'), bossName: $('#hud .bossbar b'), bossFill: $('#hud .bossbar > div > div'),
  };
  $('#hud .pause').onclick = pauseMenu;
}

function hud(d) {
  H.hpfill.style.width = Math.max(0, d.hp / d.maxHp * 100) + '%';
  H.hpfill.classList.toggle('low', d.hp / d.maxHp < 0.3);
  H.hptxt.textContent = `${Math.ceil(d.hp)} / ${d.maxHp}`;
  H.shield.style.display = d.shield > 0 ? '' : 'none';
  H.lvl.textContent = d.level;
  H.xp.style.width = (d.xp / d.xpNeed * 100) + '%';
  H.wave.textContent = `Dalga ${d.wave}/${d.waves}`;
  H.wbar.style.width = Math.min(100, d.waveP * 100) + '%';
  H.kills.textContent = `💀 ${d.kills}`;
  H.gold.textContent = `🪙 ${fmt(d.gold)}`;
  if (d.boss) { H.boss.hidden = false; H.bossName.textContent = d.boss.name; H.bossFill.style.width = Math.max(0, d.boss.hp / d.boss.maxHp * 100) + '%'; }
  else H.boss.hidden = true;
}

function levelUpModal(choices, cb) {
  const m = modal('', { cls: 'levelup', closable: false });
  const draw = list => {
    m.el.innerHTML = `<h2 class="glow">SEVİYE ATLADIN!</h2><p class="muted center">Bir güç seç</p>
      <div class="skills">${list.map(s => `<button class="skill" data-id="${s.id}"><div class="sk-i">${s.icon}</div><b>${s.name}</b><small>${s.desc}</small><div class="stars">${'★'.repeat(s.lvl)}${'☆'.repeat(Math.max(0, Math.min(s.max, 6) - s.lvl))}</div></button>`).join('')}</div>
      ${run.rerolls > 0 ? '<button class="btn blue small" data-r>📺 Yenile</button>' : ''}`;
  };
  draw(choices);
  m.el.addEventListener('click', async e => {
    const s = e.target.closest('.skill');
    if (s) { play('click'); vib(15); m.close(); cb(s.dataset.id); return; }
    if (e.target.closest('[data-r]')) {
      if (await watchAd()) { run.rerolls--; draw(game.skillChoices()); }
    }
  });
}

function pauseMenu() {
  if (!game || game.paused) return;
  game.paused = true;
  const sk = Object.entries(game.skills);
  const m = modal(`<h2>⏸ Duraklatıldı</h2>
    <div class="taken">${sk.length ? sk.map(([id, l]) => `<span>${skillIcon(id)} ×${l}</span>`).join('') : '<p class="muted">Henüz güç seçilmedi</p>'}</div>
    <div class="setrow"><span>🔊 Ses</span><button class="tgl ${S.settings.sound ? 'on' : ''}" data-p="sound"></button></div>
    <div class="col gap"><button class="btn green" data-p="resume">▶ Devam</button><button class="btn red" data-p="quit">Savaştan çık</button></div>`,
  { onClose: () => { if (game && !game.over && !game.choosing) game.paused = false; } });
  m.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    if (b.dataset.p === 'sound') { S.settings.sound = !S.settings.sound; sfx.on = S.settings.sound; b.classList.toggle('on'); save(); }
    if (b.dataset.p === 'resume') m.close();
    if (b.dataset.p === 'quit') { m.close(); if (game) { game.paused = true; game.finish(false); } }
  });
}

const skillIcon = id => RUN_SKILLS.find(s => s.id === id)?.icon || '•';

function deathModal(canRevive, cb) {
  if (!canRevive) return cb(false);
  let done = false;
  const m = modal(`<h2>💀 Yenildin!</h2><p class="center">Bir şans daha? Tüm canınla dirilir, etrafındaki düşmanları dondurursun.</p>
    <div class="col gap"><button class="btn blue" data-d="gems">💎 80 ile Diril</button><button class="btn green" data-d="ad">📺 Reklam izle ve Diril</button><button class="btn grey" data-d="no">Vazgeç</button></div>`, { closable: false });
  m.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-d]'); if (!b || done) return;
    if (b.dataset.d === 'gems') { if (!E.pay(S, { gems: 80 })) { play('error'); return toast('Yeterli elmas yok', 'bad'); } done = true; m.close(); play('level'); cb(true); }
    if (b.dataset.d === 'ad') { if (await watchAd()) { done = true; m.close(); play('level'); cb(true); } }
    if (b.dataset.d === 'no') { done = true; m.close(); cb(false); }
  });
}

function endModal(res) {
  const mods = run?.mods || {};
  const loot = E.runLoot(S, res, mods);
  // ilerleme
  S.stats.kills += res.kills; S.stats.bossKills += res.bossKills;
  E.progress(S, 'kills', res.kills); E.progress(S, 'boss', res.bossKills);
  S.best[res.chapter] = Math.max(S.best[res.chapter] || 0, res.wave);
  let unlocked = false;
  if (res.victory) { S.stats.wins++; if (res.chapter >= S.maxChapter) { S.maxChapter = res.chapter + 1; selCh = S.maxChapter; unlocked = true; } }
  if (mods.daily && !S.daily.challenge && res.waveReached >= 5) { S.daily.challenge = true; loot.gems = (loot.gems || 0) + 150; loot.chest = 'diamond'; }
  const list = E.grant(S, loot);
  save(true);
  play(res.victory ? 'win' : 'lose');
  const m = modal(`<div class="res-head ${res.victory ? 'win' : 'lose'}"><h2>${res.victory ? '🏆 ZAFER!' : '⚔️ Savaş Bitti'}</h2>
      <p>${D.chapterInfo(res.chapter).title}</p>${unlocked ? `<div class="unlock">🔓 ${D.chapterInfo(S.maxChapter).title} açıldı!</div>` : ''}</div>
    <div class="res-stats"><div><b>${Math.floor(res.wave)}</b><small>Dalga</small></div><div><b>${fmt(res.kills)}</b><small>Düşman</small></div><div><b>${res.level}</b><small>Seviye</small></div><div><b>${mmss(Math.floor(res.time))}</b><small>Süre</small></div></div>
    <div class="reward-grid">${list.map((r, i) => `<div class="reward-cell ${r.rarity !== undefined ? 'rar' + r.rarity : ''}" style="animation-delay:${i * 80}ms"><div class="ri">${r.icon}</div><div class="rt">${esc(r.text)}</div></div>`).join('')}</div>
    <div class="col gap">
      <button class="btn blue" data-e="double">📺 2× Altın (+${fmt(loot.gold)} 🪙)</button>
      <div class="row gap"><button class="btn purple" data-e="share">📤 Paylaş</button><button class="btn green" data-e="ok">Devam</button></div>
    </div>`, { closable: false, cls: 'results' });
  m.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-e]'); if (!b || b.disabled) return;
    if (b.dataset.e === 'double') { if (await watchAd()) { E.grant(S, { gold: loot.gold }); b.disabled = true; b.textContent = '✓ 2× alındı'; play('coin'); save(); } }
    if (b.dataset.e === 'share') { const blob = await shareCard(res); doShare(`Efsun Avcısı ${res.chapter}. bölüm: ${res.victory ? 'TEMİZLEDİM' : Math.floor(res.wave) + '. dalga'} 💀${res.kills} ⚡${fmt(stats().power)} — Beni geçebilir misin?`, blob); }
    if (b.dataset.e === 'ok') { m.close(); exitBattle(res); }
  });
}

function exitBattle(res) {
  game?.destroy(); game = null; run = null;
  $('#battle').hidden = true; $('#menu').hidden = false;
  $('#tut')?.remove();
  tab = 'battle'; render();
  // akıllı teklif: ilk yenilgiden sonra başlangıç kiti 48 saatlik indirimle
  if (!res.victory && !S.purchases.kit_starter && !S.offers.starterUntil && S.stats.runs >= 2) {
    S.offers.starterUntil = Date.now() + 48 * 3600000; save();
    setTimeout(() => offerModal('kit_starter'), 400);
  } else if (S.inventory.some(i => i.isNew) && S.stats.runs <= 3) {
    setTimeout(() => toast('🎒 Yeni eşyaların var! Ekipman\'dan kuşan', 'good'), 300);
  }
}

// ============================================================ İLK KURULUM
if (loaded.fresh) {
  // başlangıç eşyaları
  const bow = E.genItem('weapon', 0, { base: 'bow', set: null });
  const arm = E.genItem('armor', 0, { set: null });
  S.inventory.push(bow, arm);
  S.equipped.weapon = bow.uid; S.equipped.armor = arm.uid;
  bow.isNew = arm.isNew = false;
  S.pets.owl = { lvl: 1 }; S.pet = 'owl';
  E.dailyReset(S);
  save(true);
}
boot();

// Hata ayıklama / otomatik test erişimi (yalnızca yerel geliştirmede)
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__efsun = { get S() { return S; }, get game() { return game; }, render, startBattle };
}
