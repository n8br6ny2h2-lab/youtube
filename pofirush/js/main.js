// Uygulama akışı: menüler, oyun döngüsü bağlantıları, ekonomi, mağaza, reklam kuralları, günlük sistemler.
import { GAME, ADS, PRODUCTS, SKINS, BIOMES, TUNING, LOGIN_REWARDS, MISSION_POOL, ACHIEVEMENTS, CONTINUE_COINS } from './config.js';
import { t, setLang, getLang, detectLang, LANGS } from './i18n.js';
import { load, persist, wipe, today, dayDiff } from './save.js';
import { Game, drawBird, seedFromString, mulberry32 } from './engine.js';
import { Store, Ads, Audio, haptic, share, isNative, platform, plugin, openUrl } from './services.js';

const $ = s => document.querySelector(s);
const screen = $('#screen');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.floor(n).toLocaleString(getLang() === 'tr' ? 'tr-TR' : 'en-US');
const coinIc = '<span class="coin-ic"></span>';
const skinById = id => SKINS.find(s => s.id === id) || SKINS[0];

let S, game, store, ads, audio;
let mode = 'classic';
let view = 'menu';
let panel = null;           // açık panel adı
let shopTab = 'premium';
let recTab = 'classic';
let previewSkin = null;
let lastRun = null;

// ---------------------------------------------------------------- Açılış
boot();
async function boot() {
  S = await load();
  if (!S.login.streak) S.login.streak = 0;
  setLang(S.settings.lang || detectLang());
  audio = new Audio();
  audio.sfxOn = S.settings.sound; audio.musicOn = S.settings.music;

  game = new Game($('#game'), hooks);
  game.hq = S.settings.hq; game.resize();
  game.setSkin(skinById(S.skin));

  store = new Store();
  store.onGrant = grant;
  store.onError = msg => toast(esc(msg));
  store.onConfirm = p => dialog({ test: t('testStore'), title: t('p_' + p.id), text: `${t('p_' + p.id + 'D') !== 'p_' + p.id + 'D' ? t('p_' + p.id + 'D') + '<br><br>' : ''}${t('testStoreD')}<br><b>${esc(p.price)}</b>`, ok: t('confirmBuy'), cancel: t('no') });
  ads = new Ads();
  ads.onSimulate = kind => simulateAd(kind);
  ads.onBusy = busy => { if (busy) { audio.stopMusic(); audio.suspend(); } else { audio.resume(); } };

  setupInput();
  setupNative();
  refreshDaily();
  showMenu();

  store.init().then(() => { if (panel === 'shop') renderPanel(); });
  setTimeout(() => ads.init(), 800);
  if (!isNative() && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (S.login.claimed !== today()) setTimeout(showDailyReward, 700);
  window.__pofi = { game, get save() { return S; } }; // test ve hata ayıklama için
}

const hooks = {
  t,
  sfx: (n, a) => audio.play(n, a),
  haptic: k => haptic(S.settings.haptics, k),
  start: () => { $('#tapHint').classList.add('hidden'); maybeMusic(); },
  score: (s) => {
    const el = $('#score'); el.textContent = s; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    audio.intensity = Math.min(1, s / 60);
    if (s === S.best[mode] + 1 && S.best[mode] >= 5) { toast(t('newBest')); audio.play('best'); }
  },
  coin: n => { $('#hudCoins b').textContent = n; },
  power: () => { powKey = ''; },
  biome: id => { const b = $('#biomeBanner'); b.textContent = t('biome_' + id); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); },
  death: info => onDeath(info),
  tick: () => updatePowers(),
};

function setupInput() {
  const unlock = () => { audio.unlock(); };
  document.addEventListener('pointerdown', unlock, { capture: true });
  const flap = e => {
    if (view !== 'play') return;
    e.preventDefault();
    game.flap();
  };
  $('#game').addEventListener('pointerdown', flap);
  $('#hud').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; flap(e); });
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { audio.unlock(); if (view === 'play') { e.preventDefault(); game.flap(); } else if (view === 'menu' && !panel) startRun(); }
    if (e.code === 'Escape' || e.code === 'KeyP') onBack();
  });
  $('#pauseBtn').addEventListener('click', () => pauseGame());
  window.addEventListener('resize', () => game.resize());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (view === 'play' && game.state === 'play') pauseGame(); audio.suspend(); persist(S, true); }
    else audio.resume();
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
}

function setupNative() {
  if (!isNative()) return;
  plugin('StatusBar')?.hide?.().catch(() => {});
  setTimeout(() => plugin('SplashScreen')?.hide?.().catch(() => {}), 300);
  const App = plugin('App');
  App?.addListener?.('backButton', () => onBack());
  App?.addListener?.('pause', () => { if (view === 'play' && game.state === 'play') pauseGame(); audio.suspend(); persist(S, true); });
  App?.addListener?.('resume', () => audio.resume());
}

async function onBack() {
  if (!$('#modal').classList.contains('hidden')) { closeModal(false); return; }
  if (view === 'play') { if (game.state === 'play' || game.state === 'ready') pauseGame(); return; }
  if (view === 'pause') { resumeGame(); return; }
  if (view === 'continue') { $('#cNo')?.click(); return; }
  if (panel) { showMenu(); return; }
  if (view === 'over') { showMenu(); return; }
  if (view === 'menu' && isNative() && await dialog({ title: t('exitQ'), ok: t('yes'), cancel: t('no') })) plugin('App')?.exitApp?.();
}

function maybeMusic() { if (S.settings.music) { audio.musicOn = true; audio.startMusic(); } }

// ---------------------------------------------------------------- Menü
function showMenu() {
  view = 'menu'; panel = null;
  $('#hud').classList.add('hidden');
  game.paused = false;
  game.reset(mode, mode === 'daily' ? dailySeed() : null);
  game.setSkin(skinById(S.skin));
  const offer = starterActive();
  const missionDot = S.missions.list.some(m => m.prog >= m.goal && !m.claimed) || S.login.claimed !== today();
  screen.innerHTML = `
  <div class="menu">
    <div class="topbar">
      <button class="pill" data-go="settings" aria-label="${t('settings')}">⚙️</button>
      <button class="pill plus" data-go="shop" data-tab="coins">${coinIc}<span>${fmt(S.coins)}</span></button>
    </div>
    <div class="logo"><h1>Pofi<span>RUSH</span></h1></div>
    <div class="spacer"></div>
    <div class="best-line">${t('best')}: <b>${fmt(S.best[mode])}</b>${mode === 'daily' ? ` · ${t('daily')}: <b>${S.dailyBest.date === today() ? S.dailyBest.score : 0}</b>` : ''}</div>
    <div class="modes">
      ${['classic', 'hardcore', 'daily'].map(m => `<button class="mode ${m === mode ? 'on' : ''}" data-mode="${m}">${t(m)}<small>${t(m + 'D')}</small></button>`).join('')}
    </div>
    <button class="btn big green" id="playBtn">▶ ${t('play')}</button>
    ${offer ? `<button class="offer-chip" data-go="shop" data-tab="premium">🎁 ${t('p_pofi_starter')} · <span class="cd" data-until="${S.offer.starterUntil}"></span></button>` : ''}
    <div class="dock">
      <button data-go="skins"><i>🐤</i>${t('skins')}</button>
      <button data-go="shop" data-tab="premium"><i>🛒</i>${t('shop')}</button>
      <button data-go="missions"><i>🎯</i>${t('missions')}${missionDot ? '<span class="dot"></span>' : ''}</button>
      <button data-go="records"><i>🏆</i>${t('ranks')}</button>
    </div>
  </div>`;
  screen.querySelector('#playBtn').onclick = () => { click(); startRun(); };
  screen.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { click(); mode = b.dataset.mode; showMenu(); });
  bindGo();
  tickCountdowns();
}

function bindGo() {
  screen.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    click();
    if (b.dataset.tab) shopTab = b.dataset.tab;
    openPanel(b.dataset.go);
  });
}
function click() { audio.play('click'); haptic(S.settings.haptics, 'light'); }

function dailySeed() { return seedFromString('pofi-daily-' + today()); }

// ---------------------------------------------------------------- Oyun
function startRun() {
  audio.unlock();
  view = 'play'; panel = null;
  screen.innerHTML = '';
  game.paused = false;
  game.reset(mode, mode === 'daily' ? dailySeed() : null);
  game.setSkin(skinById(S.skin));
  $('#hud').classList.remove('hidden');
  $('#pauseBtn').classList.remove('hidden');
  $('#score').textContent = '0';
  $('#hudCoins b').textContent = '0';
  showTapHint();
  powKey = '';
}

function showTapHint() {
  const h = $('#tapHint');
  h.innerHTML = `<span class="hand">👆</span>${t('tap')}`;
  h.classList.remove('hidden');
}

function pauseGame() {
  if (view !== 'play') return;
  view = 'pause'; game.paused = true;
  audio.stopMusic();
  $('#pauseBtn').classList.add('hidden');
  screen.innerHTML = `
  <div class="cont">
    <h2>${t('paused')}</h2>
    <button class="btn big green" id="resume">▶ ${t('resume')}</button>
    <button class="btn ghost" id="quit">${t('home')}</button>
  </div>`;
  $('#resume').onclick = () => { click(); resumeGame(); };
  $('#quit').onclick = async () => {
    click();
    if ((game.state === 'play' || game.state === 'ready') && game.score > 0) {
      if (!await dialog({ title: t('quitQ'), ok: t('yes'), cancel: t('no') })) return;
      game.paused = false; game.state = 'dead';
      finishRun({ score: game.score, coins: game.coins, perfects: game.perfects, bestCombo: game.bestCombo, powerups: game.powerups }, true);
      return;
    }
    showMenu();
  };
}

function resumeGame() {
  if (game.state !== 'play') { view = 'play'; screen.innerHTML = ''; game.paused = false; $('#pauseBtn').classList.remove('hidden'); return; }
  // 3-2-1 geri sayım: duraklatıp hile yapmayı ve sürpriz ölümleri önler
  screen.innerHTML = '<div class="cont"><div class="ring"><span id="cd">3</span></div></div>';
  let n = 3; audio.play('count', 0);
  const iv = setInterval(() => {
    n--;
    if (n <= 0) {
      clearInterval(iv); screen.innerHTML = ''; view = 'play'; game.paused = false;
      $('#pauseBtn').classList.remove('hidden'); audio.play('count', 1); maybeMusic(); return;
    }
    $('#cd').textContent = n; audio.play('count', 0);
  }, 600);
}

let powKey = '', powLast = 0;
function updatePowers() {
  if (view !== 'play') return;
  const now = performance.now(); if (now - powLast < 90) return; powLast = now;
  const items = [];
  if (game.shield) items.push(['🛡️', t('shield'), -1]);
  if (game.magnetT > 0) items.push(['🧲', t('magnet'), game.magnetT / 7]);
  if (game.slowT > 0) items.push(['⏳', t('slow'), game.slowT / 4]);
  const key = items.map(i => i[0]).join('');
  const el = $('#powers');
  if (key !== powKey) { powKey = key; el.innerHTML = items.map(([ic, , f]) => `<div class="pw">${ic}${f >= 0 ? '<i><b></b></i>' : ''}</div>`).join(''); }
  const bars = el.querySelectorAll('.pw i b'); let k = 0;
  for (const it of items) if (it[2] >= 0) { const b = bars[k++]; if (b) b.style.width = Math.max(0, it[2] * 100) + '%'; }
}

// ---------------------------------------------------------------- Ölüm, devam, oyun sonu
function onDeath(info) {
  audio.stopMusic();
  $('#pauseBtn').classList.add('hidden');
  if (!info.continued && info.score >= 5) showContinue(info);
  else finishRun(info);
}

function showContinue(info) {
  view = 'continue';
  const canPay = S.coins >= CONTINUE_COINS;
  const C = 2 * Math.PI * 52;
  screen.innerHTML = `
  <div class="cont">
    <h2>${t('continueQ')}</h2>
    <div class="ring"><svg width="120" height="120"><circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,.15)" stroke-width="10" fill="none"/>
      <circle id="ringC" cx="60" cy="60" r="52" stroke="#ffd23f" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><span id="ringN">5</span></div>
    <button class="btn big pink" id="cAd">▶ ${t('watchAd')}</button>
    <button class="btn blue" id="cPay" ${canPay ? '' : 'disabled'}>${coinIc} ${t('payCoins', { n: CONTINUE_COINS })}</button>
    <button class="btn ghost" id="cNo">${t('noThanks')}</button>
  </div>`;
  let left = 5, stopped = false;
  const start = performance.now();
  let paused = 0, pauseAt = 0;
  const iv = setInterval(() => {
    if (stopped) return;
    const el = (performance.now() - start - paused) / 1000;
    left = 5 - el;
    const r = $('#ringC'); if (!r) return clearInterval(iv);
    r.style.strokeDashoffset = String(C * Math.min(1, el / 5));
    $('#ringN').textContent = Math.max(0, Math.ceil(left));
    if (left <= 0) { clearInterval(iv); finishRun(info); }
  }, 50);
  const done = ok => { clearInterval(iv); if (ok) doRevive(); else finishRun(info); };
  $('#cAd').onclick = async () => {
    click(); stopped = true; pauseAt = performance.now();
    const ok = await ads.rewarded();
    if (ok) return done(true);
    toast(t('adFail')); paused += performance.now() - pauseAt; stopped = false;
  };
  $('#cPay').onclick = () => { if (S.coins < CONTINUE_COINS) return; click(); S.coins -= CONTINUE_COINS; persist(S); done(true); };
  $('#cNo').onclick = () => { click(); done(false); };
}

function doRevive() {
  game.revive();
  view = 'play'; screen.innerHTML = '';
  $('#pauseBtn').classList.remove('hidden');
  showTapHint();
}

function finishRun(info, quit = false) {
  const score = info.score;
  const mult = S.doubler ? 2 : 1;
  const earned = info.coins * mult;
  S.coins += earned;
  const st = S.stats;
  st.runs++; st.total += score; st.coins += info.coins; st.perfects += info.perfects; st.powerups += info.powerups;
  st.bestCombo = Math.max(st.bestCombo, info.bestCombo);
  const prevBest = S.best[mode];
  const isNew = score > prevBest;
  if (isNew) S.best[mode] = score;
  if (mode === 'hardcore') st.hardBest = Math.max(st.hardBest, score);
  if (mode === 'daily') {
    if (S.dailyBest.date !== today()) { S.dailyBest = { date: today(), score: 0 }; st.dailyDays++; }
    S.dailyBest.score = Math.max(S.dailyBest.score, score);
  }
  if (score > 0) {
    const rec = S.records[mode];
    rec.push({ s: score, d: today() }); rec.sort((a, b) => b.s - a.s); rec.length = Math.min(rec.length, 10);
  }
  // Görevler
  for (const m of S.missions.list) {
    if (m.claimed) continue;
    if (m.id === 'score') m.prog = Math.max(m.prog, score);
    if (m.id === 'runs') m.prog++;
    if (m.id === 'coins') m.prog += info.coins;
    if (m.id === 'perfect') m.prog += info.perfects;
    if (m.id === 'total') m.prog += score;
    if (m.id === 'power') m.prog += info.powerups;
    if (m.id === 'hard' && mode === 'hardcore') m.prog = Math.max(m.prog, score);
    m.prog = Math.min(m.prog, m.goal);
  }
  checkAchievements();
  // Skorla açılan kostümler
  for (const s of SKINS) if (s.how === 'score' && Math.max(...Object.values(S.best)) >= s.need) unlockSkin(s.id);
  // Reklam sayaçları ve teklifler
  S.ads.deathsSince++;
  if (st.runs >= 3 && !S.offer.shown && !S.purchases.pofi_starter && !S.noads) { S.offer.shown = true; S.offer.starterUntil = Date.now() + 48 * 3600e3; setTimeout(showStarterOffer, 1200); }
  if (score >= 15) S.rate.good++;
  persist(S, true);
  lastRun = { info, earned, doubled: false, isNew, score, mode };
  if (isNew && prevBest > 0) audio.play('best');
  showOver(quit);
  const offerNow = S.offer.shown && st.runs === 3;
  if (isNative() && !S.rate.asked && S.rate.good >= 3 && !offerNow) { S.rate.asked = true; persist(S); setTimeout(askRate, 1100); }
}

function medalFor(score) { let m = null; for (const x of TUNING.medals) if (score >= x.at) m = x; return m; }

function showOver() {
  view = 'over';
  $('#hud').classList.add('hidden');
  const r = lastRun, m = medalFor(r.score);
  const nextM = TUNING.medals.find(x => x.at > r.score);
  screen.innerHTML = `
  <div class="over">
    <h2>${r.isNew ? t('newBest') : t('gameOver')}</h2>
    <div class="result">
      <div class="medal ${m ? '' : 'none'}" style="${m ? `background:radial-gradient(circle at 35% 30%, #fff 0 8%, ${m.color} 30%, ${m.color})` : ''}">${m ? t('medal_' + m.id) : (nextM ? nextM.at : '')}</div>
      <div class="stats">
        <div>${t('score')} <b>${r.score}</b></div>
        <div>${t('best')} ${r.isNew ? `<span class="newbest">NEW</span>` : ''}<b class="gold">${S.best[r.mode]}</b></div>
      </div>
    </div>
    <div class="earn">${coinIc} <span id="earnN">+${fmt(r.earned)}</span>${S.doubler ? ' <small>(×2)</small>' : ''}</div>
    <div class="actions">
      <button class="btn big green" id="retry">↻ ${t('retry')}</button>
      ${r.earned > 0 ? `<button class="btn pink" id="dbl">▶ ${t('double')}</button>` : ''}
      <div class="line">
        <button class="btn ghost" id="home">⌂ ${t('home')}</button>
        <button class="btn blue" id="shareBtn">↗ ${t('share')}</button>
      </div>
    </div>
  </div>`;
  $('#retry').onclick = async () => { click(); await maybeInterstitial(); startRun(); };
  $('#home').onclick = async () => { click(); await maybeInterstitial(); showMenu(); };
  $('#shareBtn').onclick = () => { click(); shareScore(r.score); };
  const dbl = $('#dbl');
  if (dbl) dbl.onclick = async () => {
    click(); dbl.disabled = true;
    if (await ads.rewarded()) {
      S.coins += r.earned; r.earned *= 2; r.doubled = true; persist(S, true);
      $('#earnN').textContent = '+' + fmt(r.earned); dbl.remove(); toast(t('doubled')); audio.play('buy');
    } else { toast(t('adFail')); dbl.disabled = false; }
  };
}

async function maybeInterstitial() {
  if (S.noads) return;
  const a = S.ads;
  if (S.stats.runs < ADS.interstitialAfterRuns || a.deathsSince < ADS.interstitialEvery) return;
  if (Date.now() - a.lastInter < ADS.interstitialMinGapSec * 1000) return;
  if (await ads.interstitial()) { a.deathsSince = 0; a.lastInter = Date.now(); persist(S); }
}

// ---------------------------------------------------------------- Paylaşım kartı (TikTok / Instagram / WhatsApp)
async function shareScore(score) {
  const cv = document.createElement('canvas'); cv.width = 720; cv.height = 1280;
  const c = cv.getContext('2d');
  const B = BIOMES[Math.floor(score / 20) % BIOMES.length];
  const g = c.createLinearGradient(0, 0, 0, 1280); g.addColorStop(0, B.sky[0]); g.addColorStop(1, B.sky[1]);
  c.fillStyle = g; c.fillRect(0, 0, 720, 1280);
  c.textAlign = 'center';
  c.font = 'italic 900 110px system-ui, sans-serif'; c.fillStyle = '#ffd23f'; c.fillText('Pofi', 360, 210);
  c.font = 'italic 900 80px system-ui, sans-serif'; c.fillStyle = '#7ee7ff'; c.fillText('RUSH', 360, 290);
  drawBird(c, skinById(S.skin), 360, 560, -0.2, 0.6, 7);
  c.font = '900 240px system-ui, sans-serif'; c.fillStyle = '#fff'; c.fillText(String(score), 360, 980);
  const m = medalFor(score);
  c.font = '800 44px system-ui, sans-serif'; c.fillStyle = m ? m.color : '#ffffff'; c.fillText(m ? t('medal_' + m.id) + ' · ' + t(lastRun?.mode || mode) : t(lastRun?.mode || mode), 360, 1060);
  c.font = '700 40px system-ui, sans-serif'; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText(getLang() === 'tr' ? 'Beni geçebilir misin?' : 'Can you beat me?', 360, 1160);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const url = isNative() ? (platform() === 'ios' ? GAME.iosUrl : GAME.androidUrl) : (GAME.webUrl || location.href.split('#')[0]);
  const res = await share({ title: GAME.name, text: t('shareText', { n: score }), url, blob });
  if (res === 'copied') toast(t('copied'));
  if (res === 'fail') {
    // Paylaşım menüsü ve pano engelliyse (ör. gömülü sayfa) metni seçilebilir olarak göster
    const msg = `${t('shareText', { n: score })} ${url}`;
    dialog({ title: t('share'), text: `<textarea id="shareTxt" readonly style="width:100%;height:84px;border-radius:12px;border:0;padding:10px;font:inherit;font-size:14px;background:rgba(255,255,255,.1);color:#fff;resize:none">${esc(msg)}</textarea>`, ok: t('close') });
    const ta = $('#shareTxt'); if (ta) { ta.focus(); ta.select(); }
  }
}

// ---------------------------------------------------------------- Paneller
function openPanel(name) { panel = name; view = 'menu'; previewSkin = null; renderPanel(); }

function renderPanel() {
  const titles = { shop: t('shop'), skins: t('skins'), missions: t('missions'), settings: t('settings'), records: t('ranks') };
  const body = { shop: shopHtml, skins: skinsHtml, missions: missionsHtml, settings: settingsHtml, records: recordsHtml }[panel]();
  const sc = screen.querySelector('.scroll')?.scrollTop || 0;
  screen.innerHTML = `
  <div class="panel">
    <div class="panel-head"><button class="back" id="back">‹</button><h2>${titles[panel]}</h2>
      <div class="pill">${coinIc}<span>${fmt(S.coins)}</span></div></div>
    ${body}
  </div>`;
  const s = screen.querySelector('.scroll'); if (s) s.scrollTop = sc;
  $('#back').onclick = () => { click(); showMenu(); };
  ({ shop: bindShop, skins: bindSkins, missions: bindMissions, settings: bindSettings, records: bindRecords })[panel]();
  bindGo();
  tickCountdowns();
}

// --- Mağaza
const ICONS = { pofi_noads: '🚫', pofi_starter: '🎁', pofi_doubler: '✖️2', pofi_legends: '👑', pofi_coins_s: '💰', pofi_coins_m: '🧰', pofi_coins_l: '🏦' };
function owned(id) { return !!S.purchases[id]; }
function starterActive() { return !owned('pofi_starter') && S.offer.starterUntil > Date.now(); }

function prodRow(p, hero = false) {
  const isOwned = p.type !== 'consumable' && (owned(p.id) || (p.id === 'pofi_noads' && S.noads) || (p.id === 'pofi_doubler' && S.doubler));
  const coins = p.grants.coins && p.tag === 'coins' ? `${fmt(p.grants.coins)} ${t('coins').toLowerCase()}` : t('p_' + p.id + 'D');
  const badge = p.badge === 'popular' ? t('popular') : p.badge === 'best' ? t('bestValue') : hero ? t('limited') : '';
  return `<div class="prod ${hero ? 'hero' : ''}">
    ${badge ? `<div class="badge">${badge}</div>` : ''}
    <div class="ic">${ICONS[p.id]}</div>
    <div class="info"><b>${t('p_' + p.id)}</b><small>${coins}</small>${hero ? `<small class="cd" data-until="${S.offer.starterUntil}" style="display:block;color:#ffd23f"></small>` : ''}</div>
    <button class="btn sm ${isOwned ? 'ghost' : hero ? 'pink' : 'green'}" data-buy="${p.id}" ${isOwned ? 'disabled' : ''}>${isOwned ? '✓ ' + t('owned') : esc(store.price(p.id))}</button>
  </div>`;
}

function shopHtml() {
  resetAdDay();
  const left = ADS.freeCoinAdsPerDay - S.ads.free;
  const P = id => PRODUCTS.find(p => p.id === id);
  const prem = `
    ${starterActive() ? prodRow(P('pofi_starter'), true) : ''}
    ${prodRow(P('pofi_noads'))}${prodRow(P('pofi_doubler'))}${prodRow(P('pofi_legends'))}`;
  const coins = `
    <div class="prod"><div class="ic">🎬</div><div class="info"><b>${t('freeCoins')} +${ADS.freeCoinAdReward}</b><small>${t('freeLeft', { n: Math.max(0, left) })}</small></div>
      <button class="btn sm pink" id="freeAd" ${left > 0 ? '' : 'disabled'}>▶ ${t('watch')}</button></div>
    ${PRODUCTS.filter(p => p.tag === 'coins').map(p => prodRow(p)).join('')}`;
  return `
  <div class="tabs"><button data-tab2="premium" class="${shopTab === 'premium' ? 'on' : ''}">⭐ Premium</button><button data-tab2="coins" class="${shopTab === 'coins' ? 'on' : ''}">${coinIc} ${t('coins')}</button></div>
  <div class="scroll">
    ${shopTab === 'premium' ? prem : coins}
    <div class="legal">${t('iapNote')}</div>
    <div style="text-align:center">
      <button class="linkbtn" id="restore">${t('restore')}</button>
      <button class="linkbtn" data-url="privacy">${t('privacy')}</button>
      <button class="linkbtn" data-url="terms">${t('terms')}</button>
    </div>
  </div>`;
}
function bindShop() {
  screen.querySelectorAll('[data-tab2]').forEach(b => b.onclick = () => { click(); shopTab = b.dataset.tab2; renderPanel(); });
  screen.querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => { click(); b.disabled = true; await store.buy(b.dataset.buy); if (panel === 'shop') renderPanel(); });
  const fa = $('#freeAd');
  if (fa) fa.onclick = async () => {
    click(); fa.disabled = true;
    if (await ads.rewarded()) { resetAdDay(); S.ads.free++; addCoins(ADS.freeCoinAdReward); persist(S, true); }
    else toast(t('adFail'));
    if (panel === 'shop') renderPanel();
  };
  $('#restore').onclick = async () => { click(); if (await store.restore()) toast(t('restored')); else toast(t('restored')); renderPanel(); };
  bindUrls();
}
function bindUrls() {
  screen.querySelectorAll('[data-url]').forEach(b => b.onclick = () => { click(); openUrl(b.dataset.url === 'privacy' ? GAME.privacyUrl : GAME.termsUrl); });
}
function resetAdDay() { if (S.ads.date !== today()) { S.ads.date = today(); S.ads.free = 0; } }

function grant(id, tx) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  if (S.txIds.includes(tx)) return;
  const already = !!S.purchases[id];
  const g = p.grants;
  if (g.noads) S.noads = true;
  if (g.doubler) S.doubler = true;
  for (const sk of g.skins || []) unlockSkin(sk, true);
  if (p.type !== 'consumable' && already) { persist(S); return; } // kalıcı ürün tekrar jeton vermez
  if (!tx.startsWith('owned-')) { S.txIds.push(tx); if (S.txIds.length > 300) S.txIds.splice(0, 100); }
  S.purchases[id] = (S.purchases[id] || 0) + 1;
  if (g.coins) addCoins(g.coins);
  if (g.skins?.length && p.id !== 'pofi_starter') { S.skin = g.skins[0]; game.setSkin(skinById(S.skin)); }
  persist(S, true);
  audio.play('buy'); haptic(S.settings.haptics, 'medium');
  toast('✓ ' + t('bought') + ' ' + t('p_' + id));
  if (panel) renderPanel(); else if (view === 'menu') showMenu();
}

function addCoins(n) { S.coins += n; toast(`+${fmt(n)} ${t('coins').toLowerCase()}`); audio.play('buy'); }

// --- Kostümler
function skinName(s) { return t('s_' + s.id); }
function skinLockText(s) {
  if (s.how === 'coins') return `${coinIc}${fmt(s.cost)}`;
  if (s.how === 'score') return t('needScore', { n: s.need });
  if (s.how === 'streak') return t('needStreak', { n: s.need });
  if (s.how === 'iap') return '👑 ' + t('inPack');
  return '';
}
function skinsHtml() {
  const sel = previewSkin || S.skin;
  const s = skinById(sel), have = S.skins.includes(s.id);
  let action = '';
  if (have) action = S.skin === s.id ? `<button class="btn sm ghost" disabled>✓ ${t('equipped')}</button>` : `<button class="btn sm green" id="equip">${t('equip')}</button>`;
  else if (s.how === 'coins') action = `<button class="btn sm" id="buySkin" ${S.coins >= s.cost ? '' : 'disabled'}>${coinIc} ${fmt(s.cost)}</button>`;
  else if (s.how === 'iap') action = `<button class="btn sm pink" data-go="shop" data-tab="premium">👑 ${t('inPack')}</button>`;
  else action = `<button class="btn sm ghost" disabled>🔒 ${t('locked')}</button>`;
  return `
  <div class="card skin-detail"><canvas width="192" height="192" data-skin="${s.id}" data-big="1"></canvas>
    <div><h3>${skinName(s)}</h3><p>${have ? '' : skinLockText(s)}</p>${action}</div></div>
  <div class="scroll"><div class="grid">
    ${SKINS.map(k => {
      const h = S.skins.includes(k.id);
      return `<button class="skin ${k.id === sel ? 'sel' : ''} ${h ? '' : 'lock'}" data-skinsel="${k.id}">
        ${k.how === 'iap' && !h ? '<span class="tag">VIP</span>' : ''}
        <canvas width="144" height="144" data-skin="${k.id}"></canvas>${skinName(k)}
        <div class="cost">${h ? (S.skin === k.id ? '✓' : '') : skinLockText(k)}</div></button>`;
    }).join('')}
  </div></div>`;
}
function bindSkins() {
  screen.querySelectorAll('canvas[data-skin]').forEach(cv => {
    const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
    drawBird(c, skinById(cv.dataset.skin), cv.width / 2 - 4, cv.height / 2 + 4, -0.1, 0.4, cv.width / 52, 1);
  });
  screen.querySelectorAll('[data-skinsel]').forEach(b => b.onclick = () => {
    click(); const id = b.dataset.skinsel;
    if (S.skins.includes(id)) { S.skin = id; game.setSkin(skinById(id)); persist(S); }
    previewSkin = id; renderPanel();
  });
  const eq = $('#equip'); if (eq) eq.onclick = () => { click(); S.skin = previewSkin || S.skin; game.setSkin(skinById(S.skin)); persist(S); renderPanel(); };
  const bs = $('#buySkin'); if (bs) bs.onclick = () => {
    const s = skinById(previewSkin);
    if (S.coins < s.cost) { audio.play('error'); return toast(t('notEnough')); }
    S.coins -= s.cost; unlockSkin(s.id, true); S.skin = s.id; game.setSkin(s); persist(S, true); audio.play('buy'); toast('✓ ' + skinName(s)); renderPanel();
  };
}
function unlockSkin(id, silent = false) {
  if (S.skins.includes(id)) return;
  S.skins.push(id);
  if (!silent) toast(t('newSkin', { s: t('s_' + id) }));
}

// --- Görevler, günlük ödül, başarımlar
function refreshDaily() {
  const d = today();
  if (S.login.last !== d) {
    S.login.streak = dayDiff(S.login.last, d) === 1 ? S.login.streak + 1 : 1;
    S.login.day = (S.login.streak - 1) % 7 + 1;
    S.login.last = d;
    if (S.login.streak >= 7) unlockSkin('ghost');
  }
  if (S.missions.date !== d) {
    const r = mulberry32(seedFromString(d + S.created));
    const pool = [...MISSION_POOL];
    const list = [];
    while (list.length < 3 && pool.length) {
      const m = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const tier = Math.floor(r() * m.goal.length);
      list.push({ id: m.id, goal: m.goal[tier], reward: m.reward[tier], prog: 0, claimed: false });
    }
    S.missions = { date: d, list };
  }
  persist(S);
}

function showDailyReward() {
  if (S.login.claimed === today() || view !== 'menu') return;
  const day = S.login.day;
  const html = `<div class="dlg"><h3>🎁 ${t('dailyReward')}</h3><p>${t('streak', { n: S.login.streak })}</p>
    <div class="days">${LOGIN_REWARDS.map((r, i) => `<div class="dayc ${i + 1 < day ? 'done' : ''} ${i + 1 === day ? 'today' : ''}">${t('day', { n: i + 1 })}<b>${r}</b>${i === 6 ? '👻' : ''}</div>`).join('')}</div>
    <div class="btns" style="margin-top:16px"><button class="btn green" id="dClaim">${t('claim')} +${LOGIN_REWARDS[day - 1]}</button>
    <button class="btn pink" id="dClaim2">▶ ×2</button></div></div>`;
  openModal(html);
  const claim = mult => { S.login.claimed = today(); addCoins(LOGIN_REWARDS[day - 1] * mult); persist(S, true); closeModal(true); if (view === 'menu' && !panel) showMenu(); else if (panel) renderPanel(); };
  $('#dClaim').onclick = () => { click(); claim(1); };
  $('#dClaim2').onclick = async () => { click(); if (await ads.rewarded()) claim(2); else toast(t('adFail')); };
}

function missionsHtml() {
  const claimedToday = S.login.claimed === today();
  return `<div class="scroll">
    <div class="section-t">${t('dailyReward')} · ${t('streak', { n: S.login.streak })}</div>
    <div class="card"><div class="days">${LOGIN_REWARDS.map((r, i) => `<div class="dayc ${i + 1 < S.login.day || (i + 1 === S.login.day && claimedToday) ? 'done' : ''} ${i + 1 === S.login.day ? 'today' : ''}">${t('day', { n: i + 1 })}<b>${r}</b></div>`).join('')}</div>
      ${claimedToday ? '' : `<div style="text-align:center;margin-top:12px"><button class="btn sm green" id="openDaily">${t('claim')}</button></div>`}</div>
    <div class="section-t">${t('missions')}</div>
    <div class="card">${S.missions.list.map((m, i) => `<div class="row"><div class="grow">${t('m_' + m.id, { n: m.goal })}<small>${fmt(m.prog)} / ${fmt(m.goal)}</small>
      <div class="bar"><b style="width:${Math.min(100, m.prog / m.goal * 100)}%"></b></div></div>
      ${m.claimed ? `<button class="btn sm ghost" disabled>✓</button>` : `<button class="btn sm ${m.prog >= m.goal ? 'green' : 'ghost'}" data-claim="${i}" ${m.prog >= m.goal ? '' : 'disabled'}>${coinIc}${m.reward}</button>`}</div>`).join('')}</div>
    <div class="section-t">${t('achievements')}</div>
    <div class="card">${ACHIEVEMENTS.map(a => { const done = S.ach.includes(a.id); const [v] = achProgress(a); return `<div class="row"><div class="grow">${done ? '✅' : '⬜'} ${t('a_' + a.kind, { n: a.n })}<small>${fmt(Math.min(v, a.n))} / ${fmt(a.n)}</small></div><div class="pill">${coinIc}${a.reward}</div></div>`; }).join('')}</div>
  </div>`;
}
function bindMissions() {
  screen.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => {
    const m = S.missions.list[+b.dataset.claim]; if (!m || m.claimed || m.prog < m.goal) return;
    click(); m.claimed = true; addCoins(m.reward); persist(S, true); renderPanel();
  });
  const od = $('#openDaily'); if (od) od.onclick = () => { click(); showDailyReward(); };
}
function achProgress(a) {
  const st = S.stats;
  const v = { best: Math.max(...Object.values(S.best)), runs: st.runs, combo: st.bestCombo, hard: st.hardBest, daily: st.dailyDays }[a.kind];
  return [v || 0];
}
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (S.ach.includes(a.id)) continue;
    if (achProgress(a)[0] >= a.n) { S.ach.push(a.id); S.coins += a.reward; toast(`🏅 ${t('a_' + a.kind, { n: a.n })} +${a.reward}`); }
  }
}

// --- Rekorlar
function recordsHtml() {
  const rec = S.records[recTab];
  return `<div class="tabs">${['classic', 'hardcore', 'daily'].map(m => `<button data-rec="${m}" class="${m === recTab ? 'on' : ''}">${t(m)}</button>`).join('')}</div>
  <div class="scroll"><div class="card">${rec.length ? rec.map((r, i) => `<div class="rec"><span class="n">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span class="s">${r.s}</span><span class="d">${esc(r.d)}</span></div>`).join('') : `<p style="text-align:center;color:var(--dim)">${t('noRecords')}</p>`}</div></div>`;
}
function bindRecords() { screen.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => { click(); recTab = b.dataset.rec; renderPanel(); }); }

// --- Ayarlar
function settingsHtml() {
  const tg = (k, label) => `<div class="row"><div class="grow">${label}</div><button class="toggle ${S.settings[k] ? 'on' : ''}" data-tg="${k}" aria-label="${label}"></button></div>`;
  return `<div class="scroll"><div class="card">
    ${tg('sound', t('sound'))}${tg('music', t('music'))}${tg('haptics', t('haptics'))}${tg('hq', t('quality'))}
    <div class="row"><div class="grow">${t('language')}</div><select id="lang">${LANGS.map(([k, n]) => `<option value="${k}" ${k === getLang() ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  </div>
  <div class="section-t">${t('support')}</div>
  <div class="card">
    <div class="row"><button class="grow" style="text-align:left" id="restore2">${t('restore')}</button></div>
    ${isNative() && ads.privacyOptions ? `<div class="row"><button class="grow" style="text-align:left" id="adp">${t('adPrivacy')}</button></div>` : ''}
    <div class="row"><button class="grow" style="text-align:left" data-url="privacy">${t('privacy')}</button></div>
    <div class="row"><button class="grow" style="text-align:left" data-url="terms">${t('terms')}</button></div>
    <div class="row"><button class="grow" style="text-align:left" id="mail">${t('support')}: ${esc(GAME.supportEmail)}</button></div>
    <div class="row"><button class="grow" style="text-align:left;color:var(--red)" id="reset">${t('reset')}</button></div>
  </div>
  <p class="legal">${GAME.name} v${GAME.version} · ${platform()}</p></div>`;
}
function bindSettings() {
  screen.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => {
    const k = b.dataset.tg; S.settings[k] = !S.settings[k]; persist(S);
    audio.sfxOn = S.settings.sound; audio.musicOn = S.settings.music;
    if (!S.settings.music) audio.stopMusic();
    if (k === 'hq') { game.hq = S.settings.hq; game.resize(); }
    click(); renderPanel();
  });
  $('#lang').onchange = e => { S.settings.lang = e.target.value; setLang(S.settings.lang); persist(S); renderPanel(); };
  $('#restore2').onclick = async () => { click(); await store.restore(); toast(t('restored')); };
  const adp = $('#adp'); if (adp) adp.onclick = () => ads.showPrivacyOptions();
  $('#mail').onclick = () => openUrl(`mailto:${GAME.supportEmail}?subject=${encodeURIComponent(GAME.name + ' v' + GAME.version)}`);
  $('#reset').onclick = async () => {
    if (!await dialog({ title: t('reset'), text: t('resetQ'), ok: t('yes'), cancel: t('no') })) return;
    await wipe(); location.reload();
  };
  bindUrls();
}

// ---------------------------------------------------------------- Teklif ve puanlama pencereleri
function showStarterOffer() {
  if (!starterActive() || view === 'play') return;
  const p = PRODUCTS.find(x => x.id === 'pofi_starter');
  openModal(`<div class="dlg"><div class="test" style="background:var(--pink)">${t('limited')}</div><h3>🎁 ${t('p_pofi_starter')}</h3>
    <canvas width="192" height="192" id="offerCv" style="width:96px;height:96px"></canvas>
    <p>${t('p_pofi_starterD')}<br><b class="cd" data-until="${S.offer.starterUntil}" style="color:var(--gold)"></b></p>
    <div class="btns"><button class="btn pink" id="oBuy">${esc(store.price(p.id))}</button><button class="btn ghost" id="oNo">${t('later')}</button></div></div>`);
  drawBird($('#offerCv').getContext('2d'), skinById('dragon'), 92, 100, -0.1, 0.4, 3.4, 1);
  tickCountdowns();
  $('#oBuy').onclick = async () => { click(); closeModal(true); await store.buy(p.id); };
  $('#oNo').onclick = () => { click(); closeModal(false); };
}

async function askRate() {
  if (view === 'play') return;
  if (await dialog({ title: t('rateQ'), text: t('rateD'), ok: '⭐ ' + t('rate'), cancel: t('later') })) openUrl(platform() === 'ios' ? GAME.iosUrl : GAME.androidUrl);
}

function tickCountdowns() {
  const els = document.querySelectorAll('.cd[data-until]');
  if (!els.length) return;
  els.forEach(el => {
    const ms = +el.dataset.until - Date.now();
    if (ms <= 0) { el.textContent = ''; return; }
    const h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60, s = Math.floor(ms / 1e3) % 60;
    el.textContent = t('endsIn', { t: `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` });
  });
  clearTimeout(tickCountdowns.tm);
  tickCountdowns.tm = setTimeout(tickCountdowns, 1000);
}

// ---------------------------------------------------------------- Modal, test reklamı, bildirim
let modalResolve = null;
function openModal(html) { const m = $('#modal'); m.innerHTML = html; m.classList.remove('hidden'); }
function closeModal(v) { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; const r = modalResolve; modalResolve = null; r?.(v); }
function dialog({ title, text = '', ok = t('ok'), cancel = null, test = '' }) {
  return new Promise(res => {
    modalResolve?.(false);
    openModal(`<div class="dlg">${test ? `<div class="test">${test}</div>` : ''}<h3>${title}</h3>${text ? `<p>${text}</p>` : ''}
      <div class="btns">${cancel ? `<button class="btn ghost" id="mNo">${cancel}</button>` : ''}<button class="btn green" id="mOk">${ok}</button></div></div>`);
    modalResolve = res;
    $('#mOk').onclick = () => { click(); closeModal(true); };
    const no = $('#mNo'); if (no) no.onclick = () => { click(); closeModal(false); };
  });
}
function simulateAd(kind) {
  return new Promise(res => {
    modalResolve?.(false);
    openModal(`<div class="dlg"><div class="test">${t('testAd')}</div><h3>${kind === 'rewarded' ? '🎬 Rewarded' : '📺 Interstitial'}</h3><p>${t('testAdD')}</p>
      <div class="btns"><button class="btn green" id="adOk" disabled>2</button></div></div>`);
    modalResolve = res;
    const b = $('#adOk'); let n = 2;
    const iv = setInterval(() => { n--; if (!b.isConnected) return clearInterval(iv); if (n <= 0) { clearInterval(iv); b.disabled = false; b.textContent = kind === 'rewarded' ? '✓ ' + t('reward') : t('close'); } else b.textContent = n; }, 500);
    b.onclick = () => closeModal(true);
  });
}
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 2700);
}
