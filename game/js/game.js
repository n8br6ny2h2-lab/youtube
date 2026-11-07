// Efsun Avcısı — savaş motoru (Canvas 2D, 60 FPS, mobil dokunmatik joystick)
import { chapterInfo, GAME, CHAPTERS, TUNE } from './data.js';
import { drawHero, drawEnemy as artEnemy, drawPet as artPet, drawAura, ART } from './art.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

const ENEMIES = {
  slime:  { hp: 30,  speed: 78,  dmg: 10, r: 16, ai: 'chase',    xp: 1, color: null,      w: 5 },
  bat:    { hp: 18,  speed: 150, dmg: 8,  r: 12, ai: 'zigzag',   xp: 1, color: '#a78bfa', w: 3 },
  archer: { hp: 28,  speed: 65,  dmg: 12, r: 15, ai: 'ranged',   xp: 2, color: '#e5e7eb', w: 2, cd: 2.0 },
  golem:  { hp: 140, speed: 45,  dmg: 22, r: 26, ai: 'chase',    xp: 4, color: '#a8a29e', w: 1 },
  bomber: { hp: 24,  speed: 125, dmg: 40, r: 14, ai: 'kamikaze', xp: 2, color: '#4b5563', w: 2 },
  mage:   { hp: 45,  speed: 55,  dmg: 14, r: 16, ai: 'caster',   xp: 3, color: '#f472b6', w: 1.5, cd: 2.6 },
  boar:   { hp: 60,  speed: 72,  dmg: 24, r: 18, ai: 'charger',  xp: 2, color: '#92400e', w: 1.6 },
  splitter: { hp: 85, speed: 55, dmg: 16, r: 25, ai: 'chase',   xp: 3, color: '#14b8a6', w: 1.2, split: true },
};
const CH_ENEMIES = [
  ['slime', 'bat', 'archer', 'golem', 'boar'],
  ['slime', 'bat', 'archer', 'bomber', 'golem', 'boar', 'splitter'],
  ['slime', 'bat', 'mage', 'golem', 'bomber', 'splitter', 'boar'],
  ['bat', 'archer', 'mage', 'golem', 'bomber', 'slime', 'boar', 'splitter'],
  ['slime', 'bat', 'archer', 'golem', 'bomber', 'mage', 'boar', 'splitter'],
];
const BOSSES = {
  treant:       { name: 'Yaşlı Kökdev',    color: '#3f9b55', patterns: ['slam', 'summon', 'radial'] },
  scorpion:     { name: 'Kum Akrebi',      color: '#e08a1e', patterns: ['charge', 'spread', 'radial'] },
  frostQueen:   { name: 'Ayaz Kraliçesi',  color: '#7dd3fc', patterns: ['spiral', 'spread', 'summon'] },
  shadowDragon: { name: 'Gölge Ejder',     color: '#8b5cf6', patterns: ['charge', 'spread', 'spiral'] },
  magmaTitan:   { name: 'Magma Titanı',    color: '#ef4444', patterns: ['slam', 'radial', 'charge'] },
  guardian:     { name: 'Kadim Muhafız',   color: '#eab308', patterns: ['radial', 'charge'] },
};

export const RUN_SKILLS = [
  { id: 'multi',  name: 'Çoklu Atış',    icon: '🎯', desc: '+1 mermi (hasar -%10)',              max: 3, apply: g => { g.st.multishot++; g.st.dmgMul *= 0.9; } },
  { id: 'diag',   name: 'Çapraz Atış',   icon: '✳️', desc: 'Yanlara +2 mermi',                   max: 2, apply: g => g.st.diag++ },
  { id: 'rear',   name: 'Arka Atış',     icon: '↩️', desc: 'Arkaya +1 mermi',                    max: 2, apply: g => g.st.rear++ },
  { id: 'pierce', name: 'Delici',        icon: '📌', desc: 'Mermiler +1 düşmanı deler',          max: 3, apply: g => g.st.pierce++ },
  { id: 'bounce', name: 'Seken Atış',    icon: '🔁', desc: 'Mermiler +1 kez seker',              max: 3, apply: g => g.st.bounce++ },
  { id: 'atk',    name: 'Güç Patlaması', icon: '💥', desc: '+%25 hasar',                         max: 6, apply: g => { g.st.dmgMul *= 1.25; } },
  { id: 'aspd',   name: 'Hız Ruhu',      icon: '⚡', desc: '+%18 saldırı hızı',                  max: 6, apply: g => { g.st.aspdMul *= 1.18; } },
  { id: 'crit',   name: 'Keskin Göz',    icon: '👁️', desc: '+%10 kritik, +%25 kritik hasarı',    max: 4, apply: g => { g.st.crit += 10; g.st.critDmg += 25; } },
  { id: 'hp',     name: 'Dev Kalbi',     icon: '❤️', desc: '+%25 maks. can ve tam iyileş',       max: 5, apply: g => { g.p.maxHp = Math.round(g.p.maxHp * 1.25); g.p.hp = g.p.maxHp; } },
  { id: 'heal',   name: 'Şifa',          icon: '💚', desc: 'Canının %60\'ını yenile',            max: 99, cond: g => g.p.hp < g.p.maxHp * 0.75, apply: g => g.healP(0.6) },
  { id: 'vamp',   name: 'Vampir Dişi',   icon: '🧛', desc: '+%3 can çalma',                      max: 3, apply: g => { g.st.lifesteal += 3; } },
  { id: 'orb',    name: 'Ateş Küresi',   icon: '🔥', desc: 'Etrafında dönen +1 ateş küresi',     max: 4, apply: g => g.st.orbs++ },
  { id: 'blade',  name: 'Dönen Bıçaklar',icon: '🌀', desc: 'Uzak yörüngede +2 bıçak',            max: 3, apply: g => { g.st.blades += 2; } },
  { id: 'bolt',   name: 'Yıldırım',      icon: '🌩️', desc: 'Düzenli yıldırım düşer (+1 hedef)',  max: 4, apply: g => g.st.bolt++ },
  { id: 'frost',  name: 'Buz Halkası',   icon: '❄️', desc: 'Yakındakileri yavaşlatır ve yakar',  max: 3, apply: g => g.st.frost++ },
  { id: 'meteor', name: 'Meteor',        icon: '☄️', desc: 'Düşmanlara meteor yağdırır',         max: 3, apply: g => g.st.meteor++ },
  { id: 'shield', name: 'Ruh Kalkanı',   icon: '🔰', desc: 'Düzenli olarak bir darbeyi engelle', max: 3, apply: g => g.st.shieldSkill++ },
  { id: 'magnet', name: 'Mıknatıs',      icon: '🧲', desc: 'Ganimet çekim alanı +%60',           max: 2, apply: g => { g.st.pickR *= 1.6; } },
  { id: 'speed',  name: 'Rüzgâr Adımı',  icon: '👟', desc: '+%15 hareket hızı',                  max: 3, apply: g => { g.st.move *= 1.15; } },
];

// Evrimler: aktif beceri en yüksek seviyede + eşleşen destek gücü alınmışsa seviye atlarken veya hazine sandığında çıkar.
export const EVOLUTIONS = [
  { id: 'evo_orb',    from: 'orb',    with: 'atk',    name: 'Güneş Çemberi',  icon: '☀️', desc: 'Ateş küreleri büyür, 2× hasar verir ve her vuruşta yakar',   apply: g => { g.st.evoOrb = 1; } },
  { id: 'evo_blade',  from: 'blade',  with: 'aspd',   name: 'Kasırga',        icon: '🌪️', desc: '+2 bıçak, bıçaklar 2× hızlı döner ve %60 daha sert keser',  apply: g => { g.st.evoBlade = 1; g.st.blades += 2; } },
  { id: 'evo_bolt',   from: 'bolt',   with: 'crit',   name: 'Gök Hükmü',      icon: '⛈️', desc: 'Her saniye yıldırım; her yıldırım 2 düşmana sıçrar',         apply: g => { g.st.evoBolt = 1; } },
  { id: 'evo_frost',  from: 'frost',  with: 'hp',     name: 'Mutlak Sıfır',   icon: '🧊', desc: 'Buz halkası genişler, her 3 sn içindekileri dondurur',       apply: g => { g.st.evoFrost = 1; } },
  { id: 'evo_meteor', from: 'meteor', with: 'magnet', name: 'Kıyamet Yağmuru', icon: '🌋', desc: '2× meteor, 2× sıklık, daha geniş patlama',                 apply: g => { g.st.evoMeteor = 1; } },
  { id: 'evo_shield', from: 'shield', with: 'vamp',   name: 'Kutsal Aura',    icon: '😇', desc: 'Kalkan her 3 sn yenilenir, kalkan kırılınca çevreye şok dalgası', apply: g => { g.st.evoShield = 1; } },
];
export const skillDef = id => RUN_SKILLS.find(s => s.id === id) || EVOLUTIONS.find(s => s.id === id);

export class Game {
  constructor(canvas, cfg) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.mods = cfg.mods || {};
    this.ch = cfg.chapter;
    this.theme = chapterInfo(this.ch);
    this.chIdx = (this.ch - 1) % 5;
    this.arena = !!this.mods.arena;
    this.input = { id: null, ox: 0, oy: 0, x: 0, y: 0, keys: {} };
    this.bind();
    this.resize();
    this.reset();
  }

  // ---------------- kurulum ----------------
  reset() {
    const s = this.cfg.stats;
    this.st = {
      ...s, dmgMul: this.mods.playerDmg || 1, aspdMul: 1, diag: 0, rear: 0, orbs: 0, blades: 0, bolt: 0, frost: 0,
      meteor: 0, shieldSkill: 0, pickR: 95 + (s.pet === 'fox' ? 80 : 0), move: s.move,
    };
    const hp = Math.round(s.hp * (this.mods.playerHp || 1));
    this.p = { x: 0, y: 0, r: 18, hp, maxHp: hp, inv: 0, face: 0, atkT: 0.3, shield: s.shieldEvery ? 1 : 0, walk: 0, vx: 0, vy: 0, hurtT: 0 };
    this.pet = { x: -30, y: -30, t: 0, t2: 0 };
    this.enemies = []; this.bullets = []; this.ebullets = []; this.pickups = []; this.parts = []; this.texts = []; this.fx = []; this.spirits = [];
    this.wave = 1; this.waveT = 0; this.bossActive = false; this.bossSpawned = false; this.boss = null;
    this.level = 1; this.xp = 0; this.xpNeed = 5; this.pendingLv = 0;
    this.combo = 0; this.comboT = 0; this.maxCombo = 0;
    this.kills = 0; this.goldPicked = 0; this.runes = 0; this.bossKills = 0; this.time = 0;
    this.spawnAcc = 0; this.paused = false; this.over = false; this.revived = false;
    this.shake = 0; this.timeScale = 1; this.slowT = 0;
    this.timers = { bolt: 2, meteor: 3, frostTick: 0, shield: 0, kaya: 0, fireNova: 5, frostNova: 6, stormCall: 4, fox: 4 };
    this.skills = {}; this.dmgBy = {}; this.nextChest = 0;
    this.hudT = 0;
    this.banner = { text: this.theme.name, sub: `${this.ch}. Bölüm • Dalga 1`, t: 2.4 };
    if (this.arena) { this.arenaStage(); this.banner = { text: '🏟️ ARENA', sub: `Sonsuz dalga • Rekor: ${this.cfg.arenaBest ? 'Dalga ' + this.cfg.arenaBest : 'yok'}`, t: 2.6 }; }
    this.endT = 0;
  }

  bind() {
    const c = this.c, inp = this.input;
    this.h = {
      down: e => {
        this.cfg.onInput?.();
        if (inp.id !== null) return;
        inp.id = e.pointerId; inp.ox = inp.x = e.clientX; inp.oy = inp.y = e.clientY;
        c.setPointerCapture?.(e.pointerId);
      },
      move: e => { if (e.pointerId === inp.id) { inp.x = e.clientX; inp.y = e.clientY; } },
      up: e => { if (e.pointerId === inp.id) inp.id = null; },
      key: e => { inp.keys[e.key.toLowerCase()] = e.type === 'keydown'; },
      resize: () => this.resize(),
    };
    c.addEventListener('pointerdown', this.h.down);
    c.addEventListener('pointermove', this.h.move);
    c.addEventListener('pointerup', this.h.up);
    c.addEventListener('pointercancel', this.h.up);
    window.addEventListener('keydown', this.h.key);
    window.addEventListener('keyup', this.h.key);
    window.addEventListener('resize', this.h.resize);
  }

  // Otomatik performans modu: 3 sn boyunca ortalama 40 FPS'in altındaysa kaliteyi düşür
  watchPerf(dt) {
    const pf = this.perf;
    if (this.paused || this.cfg.quality === 'low' || this.cfg.fps === 30 || pf.checked > 2) return;
    pf.t += dt; pf.n++;
    if (pf.t >= 3) {
      const fps = pf.n / pf.t; pf.t = 0; pf.n = 0; pf.checked++;
      if (fps < 40) { this.cfg.quality = 'low'; ART.lite = true; this.resize(); this.amb = null; this.cfg.onLowPerf?.(); }
    }
  }

  destroy() {
    ART.glow = true; ART.lite = false;
    cancelAnimationFrame(this.raf);
    this.running = false;
    const c = this.c;
    c.removeEventListener('pointerdown', this.h.down);
    c.removeEventListener('pointermove', this.h.move);
    c.removeEventListener('pointerup', this.h.up);
    c.removeEventListener('pointercancel', this.h.up);
    window.removeEventListener('keydown', this.h.key);
    window.removeEventListener('keyup', this.h.key);
    window.removeEventListener('resize', this.h.resize);
  }

  resize() {
    // en fazla 2× (mobil performans); tanıtım videosu çekiminde window.EFSUN_MAX_DPR ile yükseltilir (4K)
    const dpr = Math.min(window.EFSUN_MAX_DPR || 2, window.devicePixelRatio || 1) * (this.cfg.quality === 'low' ? 0.6 : 1);
    this.W = this.c.clientWidth || window.innerWidth;
    this.H = this.c.clientHeight || window.innerHeight;
    this.c.width = Math.round(this.W * dpr); this.c.height = Math.round(this.H * dpr);
    this.dpr = dpr;
    this.zoom = clamp(Math.min(this.W, this.H * 0.62) / 440, 0.72, 1.25);
  }

  start() {
    this.running = true;
    ART.glow = false; ART.lite = this.cfg.quality === 'low';
    this.perf = { t: 0, n: 0, checked: 0 };
    let last = performance.now();
    const loop = now => {
      if (!this.running) return;
      if (this.cfg.fps === 30 && now - last < 30) { this.raf = requestAnimationFrame(loop); return; }
      // RAF zaman damgası start() anından önce olabilir: dt asla negatif olmamalı
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now);
      try {
        if (!this.paused) this.update(dt * this.timeScale);
        this.draw();
      } catch (err) {
        // tek bir karede hata olsa bile oyun donmasın
        if (!this.errLogged) { console.error(err); this.errLogged = true; }
        this.ctx.restore?.(); this.ctx.globalAlpha = 1; this.ctx.globalCompositeOperation = 'source-over';
      }
      this.watchPerf(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  sfx(n) { this.cfg.sfx?.(n); }
  vib(ms) { this.cfg.haptic?.(ms); }

  // ---------------- güncelleme ----------------
  update(dt) {
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.slowT > 0) { this.slowT -= dt / Math.max(0.05, this.timeScale); if (this.slowT <= 0) this.timeScale = 1; }
    this.time += dt;
    this.updatePlayer(dt);
    this.updateWaves(dt);
    this.updateSkills(dt);
    this.updatePet(dt);
    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.separate();
    this.updateBullets(dt);
    this.updateEBullets(dt);
    this.updateSpirits(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    this.enemies = this.enemies.filter(e => !e.dead);
    if (this.banner.t > 0) this.banner.t -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.endT > 0) { this.endT -= dt / Math.max(0.05, this.timeScale); if (this.endT <= 0) this.finish(true); }
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.1; this.cfg.onHud?.(this.hudData()); }
  }

  hudData() {
    const isBoss = this.isBossWave(this.wave);
    return {
      hp: this.p.hp, maxHp: this.p.maxHp, xp: this.xp, xpNeed: this.xpNeed, level: this.level, wave: this.wave,
      waves: this.arena ? 0 : GAME.wavesPerChapter, waveP: isBoss ? (this.bossActive ? 1 : 0) : this.waveT / this.waveLen(),
      kills: this.kills, gold: this.goldPicked, shield: this.p.shield, combo: this.comboT > 0 ? this.combo : 0,
      boss: this.boss && !this.boss.dead ? { name: this.boss.name, hp: this.boss.hp, maxHp: this.boss.maxHp } : null,
      time: this.time,
    };
  }

  updatePlayer(dt) {
    const p = this.p, inp = this.input, st = this.st;
    let dx = 0, dy = 0;
    if (inp.id !== null) {
      const vx = inp.x - inp.ox, vy = inp.y - inp.oy, len = Math.hypot(vx, vy);
      if (len > 6) { const m = Math.min(1, len / 55); dx = vx / len * m; dy = vy / len * m; }
      if (len > 70) { inp.ox = inp.x - vx / len * 70; inp.oy = inp.y - vy / len * 70; }
    }
    const k = inp.keys;
    if (k.w || k.arrowup) dy -= 1; if (k.s || k.arrowdown) dy += 1;
    if (k.a || k.arrowleft) dx -= 1; if (k.d || k.arrowright) dx += 1;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    p.vx = dx * st.move; p.vy = dy * st.move;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.moving = l > 0.1;
    if (p.moving) {
      p.walk += dt * 12;
      p.dustT = (p.dustT || 0) - dt;
      if (p.dustT <= 0) { p.dustT = 0.14; this.parts.push({ x: p.x + rand(-6, 6), y: p.y + 14, vx: -p.vx * 0.15 + rand(-15, 15), vy: rand(-25, -5), life: 0.45, max: 0.45, color: 'rgba(230,220,200,0.55)', size: rand(4, 7), dust: true }); }
    }
    if (p.atkAnim > 0) p.atkAnim = Math.max(0, p.atkAnim - dt * 5);
    if (p.lvlFx > 0) p.lvlFx -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.regenStop > 0) p.regenStop -= dt;
    else if (st.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * st.regen * TUNE.regenMul / 100 * dt);

    // otomatik saldırı
    p.atkT -= dt;
    if (p.atkT <= 0) {
      const range = st.wtype === 'sword' ? st.range : Math.min(st.range, Math.max(this.W, this.H) / this.zoom * 0.55);
      let t = this.nearest(p, range);
      // boss önceliği: çok yakında tehdit yoksa menzildeki boss'a nişan al
      const b = this.boss;
      if (t && b && !b.dead && t !== b && d2(p, t) > 150 * 150 && d2(p, b) < (range + b.r) ** 2) t = b;
      if (t) { this.attack(t); p.atkT = 1 / (st.aspd * st.aspdMul); }
      else p.atkT = 0.05;
    }
  }

  nearest(from, range, exclude) {
    let best = null, bd = range * range;
    for (const e of this.enemies) {
      if (e.dead || (exclude && exclude.has(e))) continue;
      const d = d2(from, e) - e.r * e.r;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  baseDmg() { return this.st.atk * this.st.wdmg * this.st.dmgMul; }

  attack(t) {
    const p = this.p, st = this.st;
    const ang = Math.atan2(t.y - p.y, t.x - p.x);
    p.face = ang; p.atkAnim = 1;
    if (st.wtype !== 'sword') this.fx.push({ type: 'muzzle', x: p.x + Math.cos(ang) * 30, y: p.y - 8 + Math.sin(ang) * 30, t: 0, life: 0.1, color: st.wtype === 'staff' ? '#67e8f9' : '#fde68a' });
    const dirs = [];
    const n = 1 + st.multishot;
    if (st.wtype === 'sword') {
      dirs.push(ang);
    } else {
      for (let i = 0; i < n; i++) dirs.push(ang + (i - (n - 1) / 2) * 0.17);
    }
    if (st.diag >= 1) dirs.push(ang + Math.PI / 4, ang - Math.PI / 4);
    if (st.diag >= 2) dirs.push(ang + Math.PI / 2, ang - Math.PI / 2);
    for (let i = 0; i < st.rear; i++) dirs.push(ang + Math.PI + (i - (st.rear - 1) / 2) * 0.2);
    const dmg = this.baseDmg();
    if (st.wtype === 'sword') {
      const arc = 1.2 + st.multishot * 0.3, range = 135 + st.multishot * 18;
      for (const a of dirs) this.slash(a, dmg, arc, range);
      this.sfx('slash');
    } else {
      for (const a of dirs) this.proj(a, dmg);
      this.sfx('shoot');
    }
  }

  proj(a, dmg, opt = {}) {
    const p = this.p, staff = this.st.wtype === 'staff';
    const sp = opt.speed || (staff ? 480 : 820);
    this.bullets.push({
      x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: opt.r || (staff ? 9 : 6), dmg, pierce: opt.pierce ?? this.st.pierce, bounce: opt.bounce ?? this.st.bounce,
      life: opt.life || 1.1, kind: opt.kind || this.st.wtype, hit: new Set(), homing: opt.homing ?? staff, proc: opt.proc ?? true,
      color: opt.color,
    });
  }

  slash(a, dmg, arc, range) {
    const p = this.p;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy);
      if (dist > range + e.r) continue;
      let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < arc / 2 + e.r / Math.max(dist, 1)) this.hitEnemy(e, dmg, { kx: dx / (dist || 1), ky: dy / (dist || 1) });
    }
    this.fx.push({ type: 'slash', x: p.x, y: p.y, a, arc, r: range, t: 0, life: 0.18 });
  }

  // ---------------- hasar ----------------
  hitEnemy(e, base, opt = {}) {
    if (e.dead) return;
    const st = this.st;
    let dmg = base;
    const crit = Math.random() * 100 < st.crit;
    if (crit) dmg *= st.critDmg / 100;
    if (e.boss) dmg *= 1 + st.bossDmg / 100;
    if (st.berserk) dmg *= 1 + (1 - this.p.hp / this.p.maxHp) * 0.8;
    dmg = Math.max(1, Math.round(dmg * rand(0.92, 1.08)));
    const src = opt.src || 'weapon';
    this.dmgBy[src] = (this.dmgBy[src] || 0) + Math.min(dmg, Math.max(0, e.hp));
    e.hp -= dmg; e.flash = 0.08; e.hitS = 1;
    this.text(e.x + rand(-8, 8), e.y - e.r - 4, dmg, crit ? '#ffd23f' : '#fff', crit);
    if (!e.boss && opt.kx !== undefined) { const kb = e.big ? 60 : 160; e.kx += opt.kx * kb; e.ky += opt.ky * kb; }
    if (st.lifesteal > 0) this.p.hp = Math.min(this.p.maxHp, this.p.hp + Math.min(dmg * st.lifesteal / 100, this.p.maxHp * 0.03));
    if (opt.proc !== false) {
      if (Math.random() * 100 < st.burn) this.burn(e, base);
      if (Math.random() * 100 < st.freeze) e.frozen = e.boss ? 0.35 : 1.5;
      if (Math.random() * 100 < st.chain) this.chain(e, base);
    }
    this.sfx('hit');
    if (e.hp <= 0) this.kill(e);
  }

  burn(e, base) { e.burn = 3; e.burnDps = Math.max(e.burnDps || 0, base * 0.35); }

  chain(from, base, opt = {}) {
    const hit = new Set([from]);
    let cur = from;
    for (let i = 0; i < 2; i++) {
      const n = this.nearest(cur, 200, hit);
      if (!n) break;
      hit.add(n);
      this.fx.push({ type: 'bolt', pts: this.jag(cur.x, cur.y, n.x, n.y), t: 0, life: 0.2, color: '#fde047' });
      this.hitEnemy(n, base * 0.6, { proc: false, src: opt.src || 'chain' });
      cur = n;
    }
    this.sfx('zap');
  }

  jag(x1, y1, x2, y2) {
    const pts = [[x1, y1]], n = 6;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([x1 + (x2 - x1) * t + rand(-14, 14), y1 + (y2 - y1) * t + rand(-14, 14)]);
    }
    pts.push([x2, y2]);
    return pts;
  }

  aoe(x, y, r, dmg, opt = {}) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 < (r + e.r) ** 2) {
        if (opt.freeze) e.frozen = e.boss ? 0.5 : opt.freeze;
        if (opt.burn) this.burn(e, dmg / 2);
        this.hitEnemy(e, dmg, { proc: false, src: opt.src });
      }
    }
  }

  kill(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    this.combo = (this.comboT > 0 ? this.combo : 0) + 1; this.comboT = 2.2;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (this.combo % 25 === 0) { this.text(this.p.x, this.p.y - 60, `${this.combo} KOMBO!`, '#fde047', false, true); this.sfx('coin'); }
    if (ENEMIES[e.type]?.split && !e.child) {
      for (const sx of [-1, 1]) { this.spawn('slime', { x: e.x + sx * 14, y: e.y }, { elite: false, portal: false }); const c = this.enemies[this.enemies.length - 1]; c.child = true; c.age = 0.4; c.color = e.color; c.kx = sx * 220; }
    }
    this.burst(e.x, e.y, e.color, e.boss ? 60 : e.big ? 18 : 10, e.boss ? 360 : 200);
    this.fx.push({ type: 'pop', x: e.x, y: e.y, r: e.r, t: 0, life: 0.25, color: e.color });
    if (!e.boss) this.fx.push({ type: 'soul', x: e.x, y: e.y, r: e.r * 0.6, t: 0, life: 0.8 });
    this.sfx('kill');
    const xpMul = 1 + this.st.xp / 100;
    const nx = e.boss ? 12 : e.elite ? 4 : 1;
    for (let i = 0; i < nx; i++) this.drop('xp', e.x + rand(-10, 10) * (nx > 1 ? 2 : 0), e.y + rand(-10, 10) * (nx > 1 ? 2 : 0), Math.ceil(e.xp * xpMul / nx * (e.boss ? 3 : 1)));
    const goldChance = e.elite || e.boss ? 1 : 0.22;
    if (Math.random() < goldChance) {
      const n = e.boss ? 15 : e.elite ? 4 : 1;
      for (let i = 0; i < n; i++) this.drop('gold', e.x + rand(-25, 25), e.y + rand(-25, 25), Math.ceil((3 + this.ch * 2) * (1 + this.st.gold / 100)));
    }
    if (Math.random() < (e.elite ? TUNE.heartDropElite : TUNE.heartDrop)) this.drop('heart', e.x, e.y, 1);
    if (Math.random() < 0.003) this.drop('magnet', e.x, e.y, 1);
    if ((e.boss && (e.mini || this.arena)) || (e.elite && Math.random() < 0.08)) this.drop('chest', e.x, e.y, 1);
    if (this.st.spirits && Math.random() * 100 < this.st.spirits) this.spirits.push({ x: e.x, y: e.y, t: 4, vx: 0, vy: -100 });
    if (e.boss) {
      this.bossKills++;
      if (!this.bossHit) { this.noHitBoss = (this.noHitBoss || 0) + 1; this.text(e.x, e.y - 60, 'KUSURSUZ!', '#fde047', false, true); }
      this.runes += e.mini ? 2 : 5 + Math.floor(this.ch / 2);
      this.shake = 18; this.vib(80);
      this.timeScale = 0.25; this.slowT = 1.1;
      this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, maxR: 420, t: 0, life: 0.8, color: e.color });
      this.bossActive = false; this.boss = null;
      this.cfg.onBoss?.(false);
      if (!this.arena && this.wave >= GAME.wavesPerChapter) { this.endT = 1.6; this.banner = { text: 'ZAFER!', sub: 'Bölüm temizlendi', t: 3 }; this.sfx('win'); }
      else { this.nextWave(); }
    } else if (e.elite) { this.shake = Math.max(this.shake, 5); }
  }

  drop(type, x, y, v) {
    this.pickups.push({ type, x, y, v, vx: rand(-60, 60), vy: rand(-60, 60), t: 0, mag: false });
    if (this.pickups.length > 320) { const o = this.pickups.shift(); this.collect(o); }
  }

  hurtPlayer(dmg, src) {
    const p = this.p, st = this.st;
    if (p.inv > 0 || this.over || this.endT > 0) return;
    if (Math.random() * 100 < st.dodge) { this.text(p.x, p.y - 30, 'KAÇTI', '#7dd3fc', false, true); p.inv = 0.25; return; }
    if (p.shield > 0) { p.shield--; p.inv = 0.6; if (st.evoShield) this.aoe(p.x, p.y, 160, this.baseDmg() * 2, { src: 'evo_shield' }); this.text(p.x, p.y - 30, 'BLOK', '#93c5fd', false, true); this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: 70, t: 0, life: 0.3, color: '#93c5fd' }); this.sfx('hit'); return; }
    dmg = Math.round(dmg * (1 - st.dr / 100));
    p.hp -= dmg; p.inv = 0.55; p.hurtT = 0.3; p.regenStop = TUNE.regenDelay;
    if (this.boss) this.bossHit = true;
    this.text(p.x, p.y - 30, '-' + dmg, '#ff4d4d', false, true);
    this.shake = Math.max(this.shake, 8); this.vib(35); this.sfx('hurt');
    if (src && st.thorns > 0 && !src.dead && src.hp !== undefined) this.hitEnemy(src, st.atk * st.thorns / 100 * 2, { proc: false, src: 'thorns' });
    if (p.hp <= 0) { p.hp = 0; this.die(); }
  }

  healP(f) { const a = Math.round(this.p.maxHp * f); this.p.hp = Math.min(this.p.maxHp, this.p.hp + a); this.text(this.p.x, this.p.y - 34, '+' + a, '#4ade80', false, true); }

  die() {
    this.paused = true;
    this.sfx('lose'); this.vib(120);
    this.cfg.onDeath?.(!this.revived, revive => {
      if (revive) {
        this.revived = true; this.p.hp = this.p.maxHp; this.p.inv = 2.5;
        this.ebullets = [];
        this.fx.push({ type: 'ring', x: this.p.x, y: this.p.y, r: 20, maxR: 500, t: 0, life: 0.7, color: '#fde68a' });
        this.aoe(this.p.x, this.p.y, 350, this.baseDmg() * 6, { freeze: 2, src: 'revive' });
        this.paused = false;
      } else this.finish(false);
    });
  }

  finish(victory) {
    if (this.over) return;
    this.over = true; this.paused = true;
    this.cfg.onEnd?.({
      victory, chapter: this.ch, arena: this.arena, wave: victory ? GAME.wavesPerChapter : this.wave - 1 + Math.min(0.99, this.waveT / this.waveLen()),
      waveReached: this.wave, kills: this.kills, goldPicked: this.goldPicked, runes: this.runes, time: this.time,
      level: this.level, bossKills: this.bossKills, maxCombo: this.maxCombo, goldBonus: this.st.gold,
      dmgBy: this.dmgBy, skills: { ...this.skills }, noHitBoss: this.noHitBoss || 0, revived: this.revived,
    });
  }

  // ---------------- dalgalar ----------------
  isBossWave(w) { return this.arena ? w % 5 === 0 : w === 5 || w === GAME.wavesPerChapter || (this.mods.extraBoss && w === 8); }
  waveLen() { return this.arena ? 15 : GAME.waveLen; }

  // Arena: bölge (görünüm + düşman türleri) her 5 dalgada değişir; güç seviyesi her 4 dalgada bir bölüm kadar artar
  arenaStage() {
    const st = Math.floor((this.wave - 1) / 5), t = CHAPTERS[st % CHAPTERS.length];
    this.theme = { ...t, n: st + 1, title: `Arena • ${t.name}` };
    this.chIdx = st % CHAPTERS.length;
    this.amb = null;
    this.arenaLvl();
  }
  arenaLvl() { this.ch = 1 + Math.floor((this.wave - 1) / 4); }
  arenaK() { return (this.wave - 1) / 4; }

  updateWaves(dt) {
    if (this.endT > 0) return;
    if (!this.bossActive) {
      this.waveT += dt;
      if (this.isBossWave(this.wave)) {
        if (!this.bossSpawned && this.waveT > 2.5) this.spawnBoss();
      } else if (this.waveT >= this.waveLen()) this.nextWave();
    }
    const rate = (1.1 + (this.arena ? Math.min(this.wave, 14) : this.wave) * TUNE.spawnPerWave) * (1 + TUNE.spawnPerChapter * (this.ch - 1)) * (this.mods.spawnMul || 1) * (this.bossActive ? 0.2 : 1) * (this.isBossWave(this.wave) && !this.bossSpawned ? 0.2 : 1);
    const cap = Math.min(130, (45 + Math.min(this.wave, 10) * 5) * (1 + TUNE.spawnPerChapter * 0.6 * (this.ch - 1))) * (this.mods.spawnMul || 1);
    this.spawnAcc += dt * rate;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length < cap) this.spawn();
    }
  }

  nextWave() {
    this.wave++; this.waveT = 0; this.bossSpawned = false;
    const boss = this.isBossWave(this.wave);
    let sub = boss ? 'Hazırlan!' : `${GAME.wavesPerChapter - this.wave + 1} dalga kaldı`;
    if (this.arena) {
      const best = this.cfg.arenaBest || 0;
      if (!boss) sub = this.wave > best && best > 0 ? '🔥 YENİ REKOR!' : `🏟️ Rekor: Dalga ${best}`;
      if ((this.wave - 1) % 5 === 0) { this.arenaStage(); if (!boss) sub = `Yeni bölge: ${this.theme.name}`; } else this.arenaLvl();
    }
    this.banner = { text: boss ? '⚠ BOSS DALGASI ⚠' : `Dalga ${this.wave}`, sub, t: 2 };
    this.healP(TUNE.waveHeal);
  }

  diffHp() { if (this.arena) return Math.pow(TUNE.hpPerChapter, this.arenaK()) * (1 + 0.04 * ((this.wave - 1) % 4)) * (this.mods.enemyHp || 1);
    return Math.pow(TUNE.hpPerChapter, this.ch - 1) * (1 + TUNE.hpPerWave * (this.wave - 1)) * (this.mods.enemyHp || 1); }
  diffDmg() { if (this.arena) return 1.25 * Math.pow(TUNE.dmgPerChapter, this.arenaK()) * (this.mods.enemyDmg || 1);
    return 1.25 * Math.pow(TUNE.dmgPerChapter, this.ch - 1) * (1 + TUNE.dmgPerWave * (this.wave - 1)) * (this.mods.enemyDmg || 1); }

  spawnPos(dist) {
    const a = rand(0, TAU);
    const rx = dist || this.W / this.zoom / 2 + 70, ry = dist || this.H / this.zoom / 2 + 70;
    return { x: this.p.x + Math.cos(a) * rx, y: this.p.y + Math.sin(a) * ry };
  }

  spawn(type, pos, opt = {}) {
    const list = CH_ENEMIES[this.chIdx];
    type = type || this.weightedType(list);
    const d = ENEMIES[type];
    const elite = opt.elite ?? Math.random() < Math.min(0.25, (0.03 + this.wave * TUNE.eliteRamp) * (this.mods.eliteMul || 1));
    const sc = elite ? 1.45 : 1;
    const hp = d.hp * this.diffHp() * (elite ? 3.5 : 1);
    pos = pos || this.spawnPos();
    this.enemies.push({
      type, ai: d.ai, x: pos.x, y: pos.y, r: d.r * sc, hp, maxHp: hp, speed: d.speed * (this.mods.enemySpeed || 1) * rand(0.9, 1.1),
      dmg: d.dmg * this.diffDmg() * (elite ? 1.5 : 1), xp: d.xp * (elite ? 3 : 1), color: d.color || this.theme.accent,
      elite, big: elite || type === 'golem', cd: d.cd ? rand(0.8, d.cd) : 0, kx: 0, ky: 0, flash: 0, frozen: 0, slow: 1,
      ph: rand(0, TAU), fuse: 0, tp: rand(4, 7), age: 0, hitS: 0, accent: this.theme.accent,
    });
    if (opt.portal !== false && pos && Math.hypot(pos.x - this.p.x, pos.y - this.p.y) < 500) this.fx.push({ type: 'portal', x: pos.x, y: pos.y, r: d.r * sc * 1.6, t: 0, life: 0.5, color: '#a78bfa' });
  }

  weightedType(list) {
    const tot = list.reduce((s, t) => s + ENEMIES[t].w, 0);
    let r = Math.random() * tot;
    for (const t of list) { r -= ENEMIES[t].w; if (r <= 0) return t; }
    return list[0];
  }

  spawnBoss() {
    this.bossSpawned = true; this.bossActive = true; this.bossHit = false;
    const mini = this.arena ? this.wave % 10 !== 0 : this.wave < GAME.wavesPerChapter;
    const key = mini ? 'guardian' : this.theme.boss;
    const b = BOSSES[key];
    const hp = (mini ? 550 : 1300) * TUNE.bossHp * Math.pow(TUNE.hpPerChapter, this.arena ? this.arenaK() : this.ch - 1) * (this.mods.enemyHp || 1);
    const pos = this.spawnPos(320);
    const e = {
      type: 'boss', boss: true, mini, key, name: b.name, ai: 'boss', x: pos.x, y: pos.y, r: mini ? 38 : 52, hp, maxHp: hp,
      speed: mini ? 70 : 62, dmg: (mini ? 22 : 30) * this.diffDmg(), xp: 30, color: b.color, patterns: b.patterns,
      state: 'move', pt: 2, kx: 0, ky: 0, flash: 0, frozen: 0, slow: 1, ph: 0, big: true, elite: false, age: -0.6, hitS: 0,
    };
    this.fx.push({ type: 'portal', x: pos.x, y: pos.y, r: e.r * 2.2, t: 0, life: 1.1, color: '#ef4444' });
    this.enemies.push(e); this.boss = e;
    this.banner = { text: b.name, sub: mini ? 'Mini Boss' : 'BÖLÜM BOSS\'U', t: 2.4 };
    this.shake = 14; this.sfx('boss'); this.vib(60);
    this.cfg.onBoss?.(true);
  }

  // ---------------- düşmanlar ----------------
  updateEnemy(e, dt) {
    if (e.dead) return;
    const p = this.p;
    e.flash = Math.max(0, e.flash - dt);
    if (e.hitS > 0) e.hitS = Math.max(0, e.hitS - dt * 6);
    if (e.age < 0.4) { e.age += dt; return; }
    if (e.burn > 0) {
      e.burn -= dt; const dd = Math.min(e.burnDps * dt, Math.max(0, e.hp)); e.hp -= e.burnDps * dt; this.dmgBy.burn = (this.dmgBy.burn || 0) + dd; e.burnAcc = (e.burnAcc || 0) + dd;
      e.burnTick = (e.burnTick || 0) - dt;
      if (e.burnTick <= 0) { e.burnTick = 0.5; if (e.burnAcc >= 1) this.text(e.x, e.y - e.r, Math.round(e.burnAcc), '#fb923c'); e.burnAcc = 0; if (Math.random() < 0.5) this.parts.push({ x: e.x + rand(-e.r, e.r) * 0.6, y: e.y, vx: 0, vy: -60, life: 0.5, max: 0.5, color: '#fb923c', size: 4 }); }
      if (e.hp <= 0) { this.kill(e); return; }
    }
    e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.86; e.ky *= 0.86;
    if (e.frozen > 0) { e.frozen -= dt; return; }
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const sp = e.speed * e.slow; e.slow = 1;
    e.ph += dt;
    switch (e.ai) {
      case 'chase': e.x += ux * sp * dt; e.y += uy * sp * dt; break;
      case 'zigzag': {
        const w = Math.sin(e.ph * 6) * 0.9;
        e.x += (ux - uy * w) * sp * dt; e.y += (uy + ux * w) * sp * dt; break;
      }
      case 'ranged': case 'caster': {
        const want = e.ai === 'caster' ? 260 : 290;
        const m = dist > want + 40 ? 1 : dist < want - 60 ? -0.8 : 0;
        e.x += (ux * m - uy * 0.35) * sp * dt; e.y += (uy * m + ux * 0.35) * sp * dt;
        e.cd -= dt;
        if (e.cd <= 0 && dist < 560) {
          const a = Math.atan2(dy, dx), n = e.ai === 'caster' ? 3 : 1;
          for (let i = 0; i < n; i++) this.ebullet(e.x, e.y, a + (i - (n - 1) / 2) * 0.28, 240, e.dmg, e.ai === 'caster' ? '#f472b6' : '#fca5a5');
          e.cd = ENEMIES[e.type].cd * rand(0.85, 1.2);
        }
        if (e.ai === 'caster') {
          e.tp -= dt;
          if (e.tp <= 0) {
            e.tp = rand(5, 8); this.burst(e.x, e.y, e.color, 10, 120);
            const a = rand(0, TAU); e.x = p.x + Math.cos(a) * 260; e.y = p.y + Math.sin(a) * 260;
            this.burst(e.x, e.y, e.color, 10, 120);
          }
        }
        break;
      }
      case 'charger':
        if (e.chg > 0) {
          e.chg -= dt; e.charging = true;
          e.x += e.cvx * dt; e.y += e.cvy * dt;
          if (Math.random() < 0.5) this.parts.push({ x: e.x, y: e.y + e.r * 0.7, vx: rand(-20, 20), vy: rand(-30, 0), life: 0.4, max: 0.4, color: 'rgba(214,190,160,0.6)', size: rand(4, 8), dust: true });
          if (e.chg <= 0) { e.charging = false; e.rest = rand(1.2, 2); }
        } else if (e.aim > 0) {
          e.aim -= dt;
          if (e.aim <= 0) { const a = Math.atan2(e.ty - e.y, e.tx - e.x); e.cvx = Math.cos(a) * 560; e.cvy = Math.sin(a) * 560; e.chg = 0.7; }
        } else {
          e.x += ux * sp * dt; e.y += uy * sp * dt;
          e.rest = (e.rest || 0) - dt;
          if (dist < 320 && e.rest <= 0) {
            e.aim = 0.65; e.tx = p.x; e.ty = p.y;
            this.fx.push({ type: 'teleLine', x: e.x, y: e.y, x2: p.x, y2: p.y, t: 0, life: 0.65, w: e.r * 1.6 });
          }
        }
        break;
      case 'kamikaze':
        if (e.fuse > 0) {
          e.fuse -= dt;
          if (e.fuse <= 0) {
            this.fx.push({ type: 'boom', x: e.x, y: e.y, r: 90, t: 0, life: 0.35 });
            this.burst(e.x, e.y, '#fb923c', 20, 260); this.sfx('boom'); this.shake = Math.max(this.shake, 6);
            if (Math.hypot(p.x - e.x, p.y - e.y) < 90 + p.r) this.hurtPlayer(e.dmg);
            this.kill(e);
          }
        } else {
          e.x += ux * sp * dt; e.y += uy * sp * dt;
          if (dist < 60) e.fuse = 0.6;
        }
        return;
      case 'boss': this.bossAI(e, dt, ux, uy, dist); break;
    }
    if (dist < e.r + p.r) this.hurtPlayer(e.dmg * (e.charging ? 1.5 : 1), e);
  }

  bossAI(e, dt, ux, uy, dist) {
    const p = this.p;
    const enr = e.hp < e.maxHp * 0.5 ? 0.7 : 1;
    if (e.state === 'move') {
      e.x += ux * e.speed * e.slow * dt; e.y += uy * e.speed * e.slow * dt;
      e.pt -= dt;
      if (e.pt <= 0) {
        e.pat = e.patterns[Math.floor(Math.random() * e.patterns.length)];
        e.state = 'tele'; e.tt = 0.7;
        e.tx = p.x; e.ty = p.y;
        if (e.pat === 'slam') this.fx.push({ type: 'tele', x: p.x, y: p.y, r: 130, t: 0, life: 0.7 });
        if (e.pat === 'charge') this.fx.push({ type: 'teleLine', x: e.x, y: e.y, x2: p.x, y2: p.y, t: 0, life: 0.7, w: e.r * 2 });
      }
    } else if (e.state === 'tele') {
      e.tt -= dt;
      if (e.tt <= 0) { e.state = 'act'; e.burst = 0; e.bt = 0; e.actT = 0; }
    } else if (e.state === 'act') {
      e.actT += dt; e.bt -= dt;
      const aim = Math.atan2(p.y - e.y, p.x - e.x);
      let done = false;
      switch (e.pat) {
        case 'radial':
          if (e.bt <= 0) { const n = 22, off = e.burst * 0.15; for (let i = 0; i < n; i++) this.ebullet(e.x, e.y, off + i * TAU / n, 200, e.dmg * 0.7, e.color); e.burst++; e.bt = 0.4; }
          done = e.burst >= (enr < 1 ? 4 : 3); break;
        case 'spiral':
          if (e.bt <= 0) { for (let i = 0; i < 6; i++) this.ebullet(e.x, e.y, e.burst * 0.3 + i * TAU / 6, 210, e.dmg * 0.6, e.color); e.burst++; e.bt = 0.1; }
          done = e.burst >= 16; break;
        case 'spread':
          if (e.bt <= 0) { for (let i = -2; i <= 2; i++) this.ebullet(e.x, e.y, aim + i * 0.2, 300, e.dmg * 0.7, e.color); e.burst++; e.bt = 0.3; }
          done = e.burst >= 3; break;
        case 'charge': {
          if (e.actT === dt || !e.cvx) { const a = Math.atan2(e.ty - e.y, e.tx - e.x); e.cvx = Math.cos(a) * 760; e.cvy = Math.sin(a) * 760; }
          e.charging = true;
          e.x += e.cvx * dt; e.y += e.cvy * dt;
          if (Math.random() < 0.6) this.parts.push({ x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r), vx: 0, vy: 0, life: 0.4, max: 0.4, color: e.color, size: 6 });
          done = e.actT > 0.6;
          if (done) { e.charging = false; e.cvx = 0; }
          break;
        }
        case 'slam':
          this.fx.push({ type: 'boom', x: e.tx, y: e.ty, r: 130, t: 0, life: 0.4 });
          this.shake = 12; this.sfx('boom');
          if (Math.hypot(p.x - e.tx, p.y - e.ty) < 130 + p.r) this.hurtPlayer(e.dmg * 1.3);
          for (let i = 0; i < 12; i++) this.ebullet(e.tx, e.ty, i * TAU / 12, 180, e.dmg * 0.5, e.color);
          e.x += (e.tx - e.x) * 0.5; e.y += (e.ty - e.y) * 0.5;
          done = true; break;
        case 'summon':
          for (let i = 0; i < 5; i++) { const a = i * TAU / 5; this.spawn(null, { x: e.x + Math.cos(a) * 90, y: e.y + Math.sin(a) * 90 }, { elite: false }); }
          this.burst(e.x, e.y, e.color, 24, 220);
          done = true; break;
      }
      if (done) { e.state = 'move'; e.pt = rand(...TUNE.bossRest) * enr; }
    }
  }

  ebullet(x, y, a, sp, dmg, color) {
    if (this.ebullets.length > 400) return;
    this.ebullets.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7, dmg, life: 4.5, color });
  }

  separate() {
    const es = this.enemies, n = es.length;
    for (let i = 0; i < n; i++) {
      const a = es[i];
      for (let j = i + 1; j < n; j++) {
        const b = es[j];
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        const dd = dx * dx + dy * dy;
        if (dd < rr * rr && dd > 0.01) {
          const d = Math.sqrt(dd), push = (rr - d) / 2, px = dx / d * push, py = dy / d * push;
          const wa = a.boss ? 0.1 : 1, wb = b.boss ? 0.1 : 1;
          a.x -= px * wa; a.y -= py * wa; b.x += px * wb; b.y += py * wb;
        }
      }
    }
  }

  // ---------------- mermiler ----------------
  updateBullets(dt) {
    for (const b of this.bullets) {
      b.life -= dt;
      if (b.homing) {
        const t = this.nearest(b, 300, b.hit);
        if (t) {
          const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(b.vy, b.vx), ta = Math.atan2(t.y - b.y, t.x - b.x);
          let da = Math.atan2(Math.sin(ta - a), Math.cos(ta - a));
          const na = a + clamp(da, -6 * dt, 6 * dt);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const e of this.enemies) {
        if (e.dead || b.hit.has(e)) continue;
        const rr = e.r + b.r;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
          b.hit.add(e);
          const sp = Math.hypot(b.vx, b.vy) || 1;
          this.hitEnemy(e, b.dmg, { kx: b.vx / sp, ky: b.vy / sp, proc: b.proc, src: b.kind === 'pet' ? 'pet' : b.kind === 'sun' ? 'set' : 'weapon' });
          this.burst(b.x, b.y, b.color || '#fff', 3, 90);
          if (b.pierce > 0) { b.pierce--; }
          else if (b.bounce > 0) {
            b.bounce--;
            const t = this.nearest(b, 320, b.hit);
            if (t) { const a = Math.atan2(t.y - b.y, t.x - b.x); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.life = Math.max(b.life, 0.6); }
            else b.life = 0;
          } else b.life = 0;
          if (b.life <= 0) break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
  }

  updateEBullets(dt) {
    const p = this.p;
    for (const b of this.ebullets) {
      b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + p.r - 4) ** 2) { this.hurtPlayer(b.dmg); b.life = 0; }
    }
    this.ebullets = this.ebullets.filter(b => b.life > 0);
  }

  updateSpirits(dt) {
    for (const s of this.spirits) {
      s.t -= dt;
      const t = this.nearest(s, 600);
      if (t) {
        const a = Math.atan2(t.y - s.y, t.x - s.x);
        s.vx += Math.cos(a) * 900 * dt; s.vy += Math.sin(a) * 900 * dt;
        const sp = Math.hypot(s.vx, s.vy); if (sp > 380) { s.vx *= 380 / sp; s.vy *= 380 / sp; }
        if (d2(s, t) < (t.r + 10) ** 2) {
          s.t = 0; this.aoe(s.x, s.y, 60, this.baseDmg() * 1.5, { src: 'spirit' });
          this.fx.push({ type: 'ring', x: s.x, y: s.y, r: 10, maxR: 60, t: 0, life: 0.3, color: '#a78bfa' });
        }
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    this.spirits = this.spirits.filter(s => s.t > 0);
  }

  // ---------------- beceriler, set güçleri, evcil ----------------
  updateSkills(dt) {
    const st = this.st, p = this.p, T = this.timers, dmg = this.baseDmg();
    // dönen küreler ve bıçaklar
    this.orbitals = [];
    const eo = st.evoOrb ? 1 : 0, eb = st.evoBlade ? 1 : 0;
    for (let i = 0; i < st.orbs; i++) { const a = this.time * 3.2 + i * TAU / st.orbs, R = 75 + eo * 15; this.orbitals.push({ x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, r: 13 + eo * 9, dmg: dmg * (0.6 + eo * 0.6), kind: 'orb', evo: eo }); }
    for (let i = 0; i < st.blades; i++) { const a = -this.time * (2.4 + eb * 2.4) + i * TAU / st.blades; this.orbitals.push({ x: p.x + Math.cos(a) * 140, y: p.y + Math.sin(a) * 140, r: 15 + eb * 4, dmg: dmg * (0.75 + eb * 0.45), kind: 'blade', a, evo: eb }); }
    if (this.orbitals.length) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        e.ocd = (e.ocd || 0) - dt;
        if (e.ocd > 0) continue;
        for (const o of this.orbitals) {
          if ((e.x - o.x) ** 2 + (e.y - o.y) ** 2 < (e.r + o.r) ** 2) { e.ocd = o.evo ? 0.25 : 0.35; this.hitEnemy(e, o.dmg, { proc: false, src: o.kind }); if (o.kind === 'orb' && (o.evo || Math.random() < 0.3)) this.burn(e, o.dmg); break; }
        }
      }
    }
    if (st.bolt > 0 && (T.bolt -= dt) <= 0) { T.bolt = st.evoBolt ? 1 : 2.3 - st.bolt * 0.2; this.bolts(st.bolt + 1, dmg * 1.3, st.evoBolt ? 'evo_bolt' : 'bolt'); }
    if (st.frost > 0) {
      const R = 95 + st.frost * 18 + (st.evoFrost ? 60 : 0);
      T.frostTick -= dt;
      const tick = T.frostTick <= 0; if (tick) T.frostTick = 0.5;
      let fz = false;
      if (st.evoFrost && (T.frostEvo = (T.frostEvo ?? 3) - dt) <= 0) { T.frostEvo = 3; fz = true; this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: R, t: 0, life: 0.4, color: '#bae6fd', fill: true }); }
      for (const e of this.enemies) if (!e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (R + e.r) ** 2) { e.slow = 0.5; if (fz) e.frozen = e.boss ? 0.4 : 1.2; if (tick) this.hitEnemy(e, dmg * (st.evoFrost ? 0.4 : 0.25) * st.frost, { proc: false, src: 'frost' }); }
      this.frostR = R;
    } else this.frostR = 0;
    if (st.meteor > 0 && (T.meteor -= dt) <= 0) {
      T.meteor = st.evoMeteor ? 1.8 : 3.6;
      for (let i = 0; i < st.meteor * (st.evoMeteor ? 2 : 1); i++) {
        const t = this.enemies[Math.floor(Math.random() * this.enemies.length)];
        if (t) this.fx.push({ type: 'meteor', x: t.x + rand(-20, 20), y: t.y + rand(-20, 20), r: st.evoMeteor ? 110 : 85, t: 0, life: 0.65, dmg: dmg * 2.4 });
      }
    }
    if (st.shieldSkill > 0 && p.shield < 1 && (T.shield -= dt) <= 0) { T.shield = st.evoShield ? 3 : 10 - st.shieldSkill * 2; p.shield = 1; }
    if (st.shieldEvery && p.shield < 1 && (T.kaya -= dt) <= 0) { T.kaya = st.shieldEvery; p.shield = 1; }
    for (const pw of st.setPowers) {
      if ((T[pw] -= dt) > 0) continue;
      if (pw === 'fireNova') { T[pw] = 5; this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: 180, t: 0, life: 0.45, color: '#ff6b3d', fill: true }); this.aoe(p.x, p.y, 180, dmg * 1.6, { burn: true, src: 'set' }); this.sfx('boom'); }
      if (pw === 'frostNova') { T[pw] = 6; this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: 200, t: 0, life: 0.5, color: '#7dd3fc', fill: true }); this.aoe(p.x, p.y, 200, dmg, { freeze: 1.6, src: 'set' }); }
      if (pw === 'stormCall') { T[pw] = 4; this.bolts(5, dmg * 1.4, 'set'); }
      // sezon setleri
      if (pw === 'voidPull') {
        T[pw] = 7;
        const t = this.nearest(p, 420) || this.enemies[0];
        if (t) this.fx.push({ type: 'void', x: t.x, y: t.y, r: 220, t: 0, life: 1.3, dmg: dmg * 2.6 });
      }
      if (pw === 'sunRays') { T[pw] = 4; for (let i = 0; i < 8; i++) this.proj(i * TAU / 8 + this.time, dmg * 1.2, { pierce: 99, bounce: 0, homing: false, color: '#fbbf24', speed: 700, life: 0.9, r: 9, kind: 'sun', proc: false }); this.sfx('zap'); }
      if (pw === 'tideWave') {
        T[pw] = 5; this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: 240, t: 0, life: 0.5, color: '#22d3ee', fill: true });
        for (const e of this.enemies) { if (e.dead) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < 240 + e.r) { if (!e.boss) { e.kx += dx / d * 520; e.ky += dy / d * 520; } e.frozen = Math.max(e.frozen, e.boss ? 0.3 : 0.8); } }
        this.aoe(p.x, p.y, 240, dmg * 1.3, { src: 'set' }); this.sfx('boom');
      }
      if (pw === 'bloodMoon') {
        T[pw] = 6; const miss = 1 - p.hp / p.maxHp;
        this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: 210, t: 0, life: 0.45, color: '#dc2626', fill: true });
        this.aoe(p.x, p.y, 210, dmg * (1.2 + miss * 2.5), { src: 'set' }); this.healP(0.04); this.sfx('boom');
      }
    }
  }

  bolts(n, dmg, src = 'bolt') {
    const vis = this.enemies.filter(e => !e.dead && Math.abs(e.x - this.p.x) < this.W / this.zoom / 2 + 40 && Math.abs(e.y - this.p.y) < this.H / this.zoom / 2 + 40);
    for (let i = 0; i < n && vis.length; i++) {
      const t = vis.splice(Math.floor(Math.random() * vis.length), 1)[0];
      this.fx.push({ type: 'bolt', pts: this.jag(t.x + rand(-40, 40), t.y - 420, t.x, t.y), t: 0, life: 0.25, color: '#fde047', w: 4 });
      this.fx.push({ type: 'ring', x: t.x, y: t.y, r: 6, maxR: 55, t: 0, life: 0.25, color: '#fde047' });
      this.aoe(t.x, t.y, 50, dmg, { src });
      if (src === 'evo_bolt') this.chain(t, dmg * 0.8, { src });
    }
    if (n) this.sfx('zap');
  }

  updatePet(dt) {
    const st = this.st, pet = this.pet, p = this.p;
    if (!st.pet) return;
    const tx = p.x - 34, ty = p.y - 36;
    pet.x += (tx - pet.x) * Math.min(1, dt * 6); pet.y += (ty - pet.y) * Math.min(1, dt * 6);
    const lv = 1 + 0.12 * (st.petLvl - 1), dmg = st.atk * lv;
    pet.t -= dt;
    if (pet.t <= 0) {
      const t = this.nearest(pet, 520);
      if (!t) { pet.t = 0.2; return; }
      const a = Math.atan2(t.y - pet.y, t.x - pet.x);
      if (st.pet === 'owl') { pet.t = 1.2; this.petShot(a, dmg * 0.45, '#e5e7eb'); }
      if (st.pet === 'fox') { pet.t = 1.6; this.petShot(a, dmg * 0.35, '#a5f3fc', true); }
      if (st.pet === 'drake') {
        pet.t = 2.5;
        for (let i = 0; i < 18; i++) { const aa = a + rand(-0.4, 0.4), sp = rand(250, 420); this.parts.push({ x: pet.x, y: pet.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0.55, max: 0.55, color: i % 2 ? '#fb923c' : '#fde047', size: rand(5, 9) }); }
        for (const e of this.enemies) {
          if (e.dead) continue;
          const dx = e.x - pet.x, dy = e.y - pet.y, dist = Math.hypot(dx, dy);
          let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (dist < 240 && Math.abs(da) < 0.5) { this.burn(e, dmg); this.hitEnemy(e, dmg * 0.9, { proc: false, src: 'pet' }); }
        }
      }
    }
    if (st.pet === 'fox' && (this.timers.fox -= dt) <= 0) { this.timers.fox = 4; if (p.hp < p.maxHp) this.healP(0.02); }
  }

  petShot(a, dmg, color, homing = false) {
    const pet = this.pet;
    this.bullets.push({ x: pet.x, y: pet.y, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, r: 6, dmg, pierce: 0, bounce: 0, life: 1, kind: 'pet', hit: new Set(), homing, proc: false, color });
  }

  // ---------------- ganimet ----------------
  updatePickups(dt) {
    const p = this.p, R = this.st.pickR;
    for (const k of this.pickups) {
      k.t += dt;
      if (!k.mag) {
        k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= 0.9; k.vy *= 0.9;
        if (k.t > 0.25 && (k.x - p.x) ** 2 + (k.y - p.y) ** 2 < R * R) k.mag = true;
      } else {
        const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1, sp = 300 + k.t * 600;
        k.x += dx / d * sp * dt; k.y += dy / d * sp * dt;
        if (d < p.r + 6) { this.collect(k); k.done = true; }
      }
    }
    this.pickups = this.pickups.filter(k => !k.done);
  }

  collect(k) {
    if (k.type === 'xp') { this.gainXp(k.v); this.sfx('xp'); }
    else if (k.type === 'gold') { this.goldPicked += k.v; this.sfx('coin'); }
    else if (k.type === 'heart') { this.healP(0.18 * (1 + this.st.heal / 100)); }
    else if (k.type === 'magnet') { for (const o of this.pickups) o.mag = true; this.sfx('level'); }
    else if (k.type === 'chest') { this.nextChest++; this.pendingLv++; this.sfx('coin'); this.burst(this.p.x, this.p.y, '#fde047', 24, 240); if (!this.choosing) this.levelUp(); }
  }

  gainXp(v) {
    this.xp += v;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed; this.level++;
      this.xpNeed = Math.round(this.xpNeed * 1.2 + 3);
      this.pendingLv++;
    }
    if (this.pendingLv > 0 && !this.choosing) this.levelUp();
  }

  levelUp() {
    this.choosing = true; this.paused = true; this.p.lvlFx = 1.2;
    this.sfx('level'); this.vib(25);
    this.fx.push({ type: 'ring', x: this.p.x, y: this.p.y, r: 10, maxR: 160, t: 0, life: 0.5, color: '#fde68a' });
    const chest = this.nextChest > 0; if (chest) this.nextChest--;
    this.cfg.onLevelUp?.(this.skillChoices(3, chest), id => this.chooseSkill(id), { chest });
  }

  evoReady() {
    return EVOLUTIONS.filter(v => !this.skills[v.id] && (this.skills[v.from] || 0) >= RUN_SKILLS.find(s => s.id === v.from).max && this.skills[v.with]);
  }

  skillChoices(n = 3, chest = false) {
    const pool = RUN_SKILLS.filter(s => (this.skills[s.id] || 0) < s.max && (!s.cond || s.cond(this)) && !(this.st.wtype === 'sword' && (s.id === 'pierce' || s.id === 'bounce')));
    const out = [];
    // hazır evrim varsa: sandıkta kesin, seviye atlamada %50 şansla ilk seçenek
    const evo = this.evoReady();
    if (evo.length && (chest || Math.random() < 0.5)) out.push({ ...evo[0], evo: true, lvl: 1, max: 1 });
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out.map(s => {
      if (s.evo) return s;
      const v = EVOLUTIONS.find(x => (x.from === s.id || x.with === s.id) && !this.skills[x.id]);
      const other = v && skillDef(v.from === s.id ? v.with : v.from);
      return { ...s, lvl: (this.skills[s.id] || 0) + 1, hint: v ? `🧬 ${v.name}: ${other.icon} ${other.name} ile` : '' };
    });
  }

  chooseSkill(id) {
    const s = skillDef(id);
    if (s) {
      s.apply(this); this.skills[id] = (this.skills[id] || 0) + 1;
      if (s.from) { this.banner = { text: `${s.icon} ${s.name}`, sub: 'EVRİM!', t: 2.2 }; this.shake = 10; this.sfx('legend'); this.fx.push({ type: 'ring', x: this.p.x, y: this.p.y, r: 10, maxR: 300, t: 0, life: 0.7, color: '#f0abfc' }); }
    }
    this.pendingLv--;
    this.choosing = false;
    if (this.pendingLv > 0) { this.levelUp(); return; }
    this.paused = false;
    this.p.inv = Math.max(this.p.inv, 0.8);
  }

  // ---------------- efektler ----------------
  text(x, y, v, color, crit = false, big = false) {
    if (this.cfg.dmgNumbers === false && !big && typeof v === 'number') return;
    if (this.texts.length > 70) this.texts.shift();
    this.texts.push({ x, y, v, color, crit, big, t: 0, life: crit || big ? 0.9 : 0.6, vx: rand(-20, 20) });
  }

  burst(x, y, color, n, sp) {
    if (this.cfg.quality === 'low') n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 450) break;
      const a = rand(0, TAU), s = rand(sp * 0.3, sp);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.6), max: 0.6, color, size: rand(2, 5) });
    }
  }

  updateFx(dt) {
    for (const q of this.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92; }
    this.parts = this.parts.filter(q => q.life > 0);
    for (const t of this.texts) { t.t += dt; t.y -= (t.crit ? 50 : 40) * dt; t.x += t.vx * dt; }
    this.texts = this.texts.filter(t => t.t < t.life);
    for (const f of this.fx) {
      f.t += dt;
      if (f.type === 'void') {
        for (const e of this.enemies) { if (e.dead || e.boss) continue; const dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy) || 1; if (d < f.r) { e.x += dx / d * 260 * dt; e.y += dy / d * 260 * dt; } }
        if (!f.hit && f.t >= f.life * 0.9) { f.hit = true; this.aoe(f.x, f.y, f.r * 0.6, f.dmg, { src: 'set' }); this.burst(f.x, f.y, '#a855f7', 26, 280); this.shake = Math.max(this.shake, 7); this.sfx('boom'); }
      }
      if (f.type === 'meteor' && !f.hit && f.t >= f.life * 0.85) {
        f.hit = true; this.aoe(f.x, f.y, f.r, f.dmg, { burn: true, src: 'meteor' });
        this.burst(f.x, f.y, '#fb923c', 22, 260); this.shake = Math.max(this.shake, 6); this.sfx('boom');
        this.fx.push({ type: 'boom', x: f.x, y: f.y, r: f.r, t: 0, life: 0.3 });
      }
    }
    this.fx = this.fx.filter(f => f.t < f.life);
  }

  // ---------------- çizim ----------------
  draw() {
    const ctx = this.ctx, W = this.W, H = this.H, z = this.zoom, p = this.p;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = this.theme.bg; ctx.fillRect(0, 0, W, H);
    const sh = this.cfg.shake === false ? 0 : this.shake;
    const sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh;
    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z); ctx.translate(-p.x, -p.y);
    this.drawGround();
    if (this.frostR) { ctx.fillStyle = 'rgba(125,211,252,0.10)'; ctx.strokeStyle = 'rgba(125,211,252,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, this.frostR, 0, TAU); ctx.fill(); ctx.stroke(); }
    for (const f of this.fx) if (f.type === 'tele' || f.type === 'teleLine' || f.type === 'meteor') this.drawFx(f);
    for (const q of this.parts) if (q.dust) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.4 - q.life / q.max * 0.6), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    this.drawPickups();
    for (const e of this.enemies) this.drawEnemy(e);
    this.drawPlayer();
    this.drawPet();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bullets) this.drawBullet(b);
    for (const o of this.orbitals || []) this.drawOrbital(o);
    for (const s of this.spirits) { ctx.fillStyle = 'rgba(167,139,250,0.85)'; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(167,139,250,0.25)'; ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, TAU); ctx.fill(); }
    for (const b of this.ebullets) { ctx.fillStyle = b.color; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.9, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill(); }
    for (const q of this.parts) { if (q.dust) continue; ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    ctx.globalAlpha = 1;
    for (const f of this.fx) if (f.type !== 'tele' && f.type !== 'teleLine' && f.type !== 'meteor') this.drawFx(f);
    ctx.globalCompositeOperation = 'source-over';
    this.drawTexts();
    ctx.restore();
    this.drawOverlay();
  }

  hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }

  drawGround() {
    const ctx = this.ctx, z = this.zoom, p = this.p, T = 72;
    const hw = this.W / z / 2 + T, hh = this.H / z / 2 + T;
    const x0 = Math.floor((p.x - hw) / T), x1 = Math.ceil((p.x + hw) / T), y0 = Math.floor((p.y - hh) / T), y1 = Math.ceil((p.y + hh) / T);
    ctx.fillStyle = this.theme.tile;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if ((tx + ty) & 1) ctx.fillRect(tx * T, ty * T, T, T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const h = this.hash(tx, ty);
      if (h > 0.82) {
        const cx = tx * T + this.hash(ty, tx) * T, cy = ty * T + h * T % T;
        ctx.fillStyle = this.theme.deco;
        if (this.chIdx === 0) { ctx.beginPath(); ctx.moveTo(cx - 6, cy + 6); ctx.lineTo(cx, cy - 8); ctx.lineTo(cx + 6, cy + 6); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + 4, cy + 6); ctx.lineTo(cx + 9, cy - 4); ctx.lineTo(cx + 12, cy + 6); ctx.fill(); }
        else if (this.chIdx === 2) { ctx.beginPath(); ctx.arc(cx, cy, 3 + h * 4, 0, TAU); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(cx, cy, 6 + h * 8, 4 + h * 4, 0, 0, TAU); ctx.fill(); }
      }
    }
  }

  drawPickups() {
    const ctx = this.ctx;
    for (const k of this.pickups) {
      const bob = Math.sin(k.t * 6 + k.x) * 2;
      if (k.type === 'xp') {
        const big = k.v > 3;
        ctx.fillStyle = big ? '#c084fc' : '#4ade80';
        ctx.beginPath(); ctx.moveTo(k.x, k.y - 6 - bob - (big ? 2 : 0)); ctx.lineTo(k.x + 5 + (big ? 2 : 0), k.y - bob); ctx.lineTo(k.x, k.y + 6 - bob + (big ? 2 : 0)); ctx.lineTo(k.x - 5 - (big ? 2 : 0), k.y - bob); ctx.fill();
      } else if (k.type === 'gold') {
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(k.x, k.y - bob, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(k.x - 1.5, k.y - bob - 1.5, 2.5, 0, TAU); ctx.fill();
      } else if (k.type === 'heart') {
        ctx.fillStyle = '#f43f5e'; ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('❤', k.x, k.y - bob);
      } else if (k.type === 'magnet') {
        ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧲', k.x, k.y - bob);
      } else if (k.type === 'chest') {
        ctx.fillStyle = `rgba(253,224,71,${0.25 + Math.sin(k.t * 5) * 0.12})`; ctx.beginPath(); ctx.arc(k.x, k.y - bob, 26, 0, TAU); ctx.fill();
        ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎁', k.x, k.y - bob);
      }
    }
  }

  drawShadow(x, y, r) { const ctx = this.ctx; ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 0.9, r * 0.35, 0, 0, TAU); ctx.fill(); }

  drawEnemy(e) {
    const ctx = this.ctx, r = e.r, x = e.x, y = e.y, p = this.p;
    const grow = e.age < 0.4 ? Math.max(0.01, this.backOut(Math.max(0, e.age) / 0.4)) : 1;
    this.drawShadow(x, y, r * grow);
    if (e.elite) { ctx.strokeStyle = `rgba(250,204,21,${0.55 + Math.sin(e.ph * 6) * 0.25})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 1.1, r * 0.42, 0, 0, TAU); ctx.stroke(); }
    e.look = Math.atan2(p.y - y, p.x - x);
    ctx.save();
    ctx.translate(x, y);
    const hs = e.hitS || 0;
    ctx.scale(grow * (1 + hs * 0.18), grow * (1 - hs * 0.15));
    if (e.age < 0.4) ctx.globalAlpha = Math.max(0, Math.min(1, e.age / 0.25 + 0.2));
    artEnemy(ctx, e, this.time);
    ctx.restore();
    if (e.elite) { ctx.fillStyle = '#facc15'; ctx.font = '900 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', x, y - r - 14); }
    if (e.burn > 0 && Math.random() < 0.4) this.parts.push({ x: x + rand(-r, r) * 0.6, y: y - r * 0.3, vx: rand(-10, 10), vy: -70, life: 0.4, max: 0.4, color: Math.random() < 0.5 ? '#fb923c' : '#fde047', size: rand(3, 5) });
    if (e.frozen > 0) { ctx.fillStyle = 'rgba(186,230,253,0.35)'; ctx.strokeStyle = 'rgba(224,242,254,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6, rr = r * (i % 2 ? 1.05 : 1.25); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (!e.boss && e.hp < e.maxHp) {
      const w = r * 2, hy = y - r - (e.type === 'mage' ? 26 : e.type === 'archer' ? 22 : 10);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2 - 1, hy - 1, w + 2, 6);
      ctx.fillStyle = e.elite ? '#facc15' : '#ef4444'; ctx.fillRect(x - w / 2, hy, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  }

  backOut(k) { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }

  drawPlayer() {
    const ctx = this.ctx, p = this.p, st = this.st;
    const blink = p.inv > 0 && Math.floor(p.inv * 18) % 2 === 0;
    if (p.lvlFx > 0) {
      const k = p.lvlFx / 1.2;
      const g = ctx.createLinearGradient(p.x, p.y - 300, p.x, p.y + 20);
      g.addColorStop(0, 'rgba(253,230,138,0)'); g.addColorStop(1, `rgba(253,230,138,${0.55 * k})`);
      ctx.fillStyle = g; ctx.fillRect(p.x - 26 * k, p.y - 300, 52 * k, 320);
    }
    this.drawShadow(p.x, p.y, p.r);
    if (this.cfg.aura) drawAura(ctx, this.cfg.aura, p.x, p.y + p.r * 0.85, 1.3, this.time, this.cfg.quality === 'low');
    // ayak altı büyü halkası
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.85, p.r * 1.25, p.r * 0.45, 0, this.time * 2, this.time * 2 + Math.PI * 1.4); ctx.stroke();
    ctx.globalAlpha = blink ? 0.45 : 1;
    drawHero(ctx, st.hero, p.x, p.y - 4, 1.3, { t: this.time, walk: p.walk, moving: p.moving, aim: p.face, atk: p.atkAnim || 0, hurt: p.hurtT, wtype: st.wtype, skin: this.cfg.skin });
    if (p.hurtT > 0) { ctx.fillStyle = `rgba(239,68,68,${p.hurtT})`; ctx.beginPath(); ctx.ellipse(p.x, p.y - 10, 16, 26, 0, 0, TAU); ctx.globalCompositeOperation = 'lighter'; ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
    if (p.shield > 0) {
      const g = ctx.createRadialGradient(p.x, p.y - 8, 10, p.x, p.y - 8, 34);
      g.addColorStop(0, 'rgba(147,197,253,0)'); g.addColorStop(0.8, 'rgba(147,197,253,0.18)'); g.addColorStop(1, 'rgba(191,219,254,0.7)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 8, 34 + Math.sin(this.time * 5) * 1.5, 0, TAU); ctx.fill();
    }
  }

  drawPet() {
    if (!this.st.pet) return;
    const ctx = this.ctx, pet = this.pet;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(pet.x, pet.y + 24, 10, 4, 0, 0, TAU); ctx.fill();
    artPet(ctx, this.st.pet, pet.x, pet.y, 1.25, this.time, Math.cos(this.p.face) < 0);
  }

  drawBullet(b) {
    const ctx = this.ctx;
    if (b.kind === 'bow') {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = 'rgba(253,224,71,0.35)'; ctx.fillRect(-22, -3, 22, 6);
      ctx.fillStyle = '#fff7cc'; ctx.fillRect(-14, -1.5, 18, 3);
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -4); ctx.lineTo(2, 4); ctx.fill();
      ctx.restore();
    } else {
      const col = b.color || (b.kind === 'staff' ? '#67e8f9' : '#fff');
      ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
    }
  }

  drawOrbital(o) {
    const ctx = this.ctx;
    if (o.kind === 'orb') {
      ctx.fillStyle = 'rgba(251,146,60,0.35)'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 1.9, 0, TAU); ctx.fill();
      ctx.fillStyle = o.evo ? '#fde047' : '#fb923c'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.5, 0, TAU); ctx.fill();
    } else {
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(this.time * 14);
      ctx.fillStyle = o.evo ? '#a5f3fc' : '#e2e8f0';
      for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.r * 1.3, -4); ctx.lineTo(o.r * 1.3, 4); ctx.fill(); }
      ctx.restore();
    }
  }

  drawFx(f) {
    const ctx = this.ctx, k = Math.max(0, Math.min(1, f.t / f.life));
    switch (f.type) {
      case 'slash': {
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 14 * (1 - k) + 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.7 + k * 0.3), f.a - f.arc / 2, f.a + f.arc / 2); ctx.stroke();
        ctx.strokeStyle = `rgba(147,197,253,${0.6 * (1 - k)})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.55 + k * 0.3), f.a - f.arc / 2, f.a + f.arc / 2); ctx.stroke();
        break;
      }
      case 'muzzle': {
        ctx.fillStyle = f.color; ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(f.x, f.y, 10 * (1 - k) + 3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
      }
      case 'pop': {
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + k * 0.8), 0, TAU); ctx.fill();
        ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + k * 1.8), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; break;
      }
      case 'soul': {
        const yy = f.y - k * 50;
        ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = '#e0e7ff';
        ctx.beginPath(); ctx.arc(f.x + Math.sin(k * 12) * 4, yy, f.r * 0.6, Math.PI, 0);
        ctx.lineTo(f.x + f.r * 0.6, yy + f.r * 0.8); ctx.lineTo(f.x, yy + f.r * 0.5); ctx.lineTo(f.x - f.r * 0.6, yy + f.r * 0.8); ctx.fill();
        ctx.globalAlpha = 1; break;
      }
      case 'portal': {
        const open = Math.max(0, Math.min(1, k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7));
        ctx.save(); ctx.translate(f.x, f.y); ctx.scale(1, 0.4);
        ctx.fillStyle = f.color; ctx.globalAlpha = 0.35 * open; ctx.beginPath(); ctx.arc(0, 0, f.r * open, 0, TAU); ctx.fill();
        ctx.strokeStyle = f.color; ctx.globalAlpha = open; ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, f.r * open * (0.5 + i * 0.25), f.t * 6 + i, f.t * 6 + i + 4); ctx.stroke(); }
        ctx.restore(); ctx.globalAlpha = 1; break;
      }
      case 'ring':
        ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r + (f.maxR - f.r) * k, 0, TAU); ctx.stroke();
        if (f.fill) { ctx.fillStyle = f.color; ctx.globalAlpha = 0.18 * (1 - k); ctx.fill(); }
        ctx.globalAlpha = 1; break;
      case 'bolt':
        ctx.strokeStyle = f.color; ctx.lineWidth = (f.w || 3) * (1 - k) + 1; ctx.globalAlpha = 1 - k * 0.5;
        ctx.beginPath(); f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; break;
      case 'void': {
        ctx.save(); ctx.globalCompositeOperation = 'source-over';
        const R = f.r * 0.35 * (0.4 + k * 0.6);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R * 1.8);
        g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.55, 'rgba(46,16,101,0.85)'); g.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R * 1.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(216,180,254,0.7)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(f.x, f.y, R * (1.1 + i * 0.35), this.time * 6 + i * 2, this.time * 6 + i * 2 + 2.2); ctx.stroke(); }
        ctx.restore(); break;
      }
      case 'boom': {
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        g.addColorStop(0, `rgba(255,240,180,${1 - k})`); g.addColorStop(0.5, `rgba(251,146,60,${0.7 * (1 - k)})`); g.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k * 0.5), 0, TAU); ctx.fill(); break;
      }
      case 'tele':
        ctx.fillStyle = `rgba(239,68,68,${0.12 + k * 0.2})`; ctx.strokeStyle = 'rgba(239,68,68,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(239,68,68,0.35)'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * k, 0, TAU); ctx.fill(); break;
      case 'teleLine': {
        const a = Math.atan2(f.y2 - f.y, f.x2 - f.x);
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(a);
        ctx.fillStyle = `rgba(239,68,68,${0.15 + k * 0.25})`; ctx.fillRect(0, -f.w / 2, 420, f.w);
        ctx.restore(); break;
      }
      case 'meteor': {
        ctx.fillStyle = `rgba(251,146,60,${0.15 + k * 0.2})`; ctx.strokeStyle = 'rgba(251,146,60,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill(); ctx.stroke();
        if (k < 0.85) { const h = (1 - k / 0.85) * 380; ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(f.x + h * 0.4, f.y - h, 14, 0, TAU); ctx.fill(); ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(f.x + h * 0.4, f.y - h, 7, 0, TAU); ctx.fill(); }
        break;
      }
    }
  }

  drawTexts() {
    const ctx = this.ctx;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.t / t.life;
      const s = t.crit ? 1 + Math.max(0, 0.6 - t.t * 4) : 1;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      ctx.font = `900 ${Math.round((t.crit ? 22 : t.big ? 18 : 15) * s)}px system-ui, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      const txt = t.crit ? t.v + '!' : String(t.v);
      ctx.strokeText(txt, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  drawOverlay() {
    const ctx = this.ctx, W = this.W, H = this.H, inp = this.input, p = this.p;
    this.drawAmbient();
    if (!this.vig || this.vig.w !== W || this.vig.h !== H) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
      this.vig = { w: W, h: H, g };
    }
    ctx.fillStyle = this.vig.g; ctx.fillRect(0, 0, W, H);
    // düşük can vinyeti
    if (p.hp / p.maxHp < 0.3 && !this.over) {
      const a = 0.35 + Math.sin(this.time * 6) * 0.15;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(220,20,20,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // joystick
    if (inp.id !== null && !this.paused) {
      const r = this.c.getBoundingClientRect();
      const ox = inp.ox - r.left, oy = inp.oy - r.top;
      let dx = inp.x - inp.ox, dy = inp.y - inp.oy; const l = Math.hypot(dx, dy); if (l > 55) { dx = dx / l * 55; dy = dy / l * 55; }
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox, oy, 60, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(ox + dx, oy + dy, 26, 0, TAU); ctx.fill();
    }
    // banner
    if (this.banner.t > 0) {
      const b = this.banner, k = Math.min(1, b.t / 0.4, (2.6 - b.t) / 0.25 + 0.2);
      ctx.globalAlpha = Math.max(0, Math.min(1, k));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 34px system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      const y = H * 0.3;
      ctx.strokeText(b.text, W / 2, y); ctx.fillStyle = b.text.includes('BOSS') || b.text === 'ZAFER!' ? '#fde047' : '#fff'; ctx.fillText(b.text, W / 2, y);
      ctx.font = '700 16px system-ui, sans-serif'; ctx.lineWidth = 4;
      ctx.strokeText(b.sub, W / 2, y + 32); ctx.fillStyle = '#e2e8f0'; ctx.fillText(b.sub, W / 2, y + 32);
      ctx.globalAlpha = 1;
    }
    // ekran dışındaki boss oku
    if (this.boss && !this.boss.dead) {
      const z = this.zoom, bx = (this.boss.x - p.x) * z + W / 2, by = (this.boss.y - p.y) * z + H / 2;
      if (bx < 0 || bx > W || by < 0 || by > H) {
        const a = Math.atan2(by - H / 2, bx - W / 2);
        const ax = clamp(bx, 30, W - 30), ay = clamp(by, 120, H - 40);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.fill();
        ctx.restore();
      }
    }
  }

  drawAmbient() {
    const ctx = this.ctx, W = this.W, H = this.H, k = this.chIdx;
    if (!this.amb) {
      const n = this.cfg.quality === 'low' ? 14 : 36;
      this.amb = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, s: rand(0.5, 1.5), ph: rand(0, TAU) }));
      this.ambLast = { x: this.p.x, y: this.p.y };
    }
    const dx = (this.p.x - this.ambLast.x) * this.zoom * 0.6, dy = (this.p.y - this.ambLast.y) * this.zoom * 0.6;
    this.ambLast = { x: this.p.x, y: this.p.y };
    const dt = this.paused ? 0 : 1 / 60, t = this.time;
    const col = ['#d9f99d', '#fed7aa', '#ffffff', '#d8b4fe', '#fb923c'][k];
    const lite = this.cfg.quality === 'low';
    for (const a of this.amb) {
      a.x -= dx * a.s; a.y -= dy * a.s; a.ph += dt;
      if (k === 0) { a.x += Math.cos(a.ph * 0.7) * 20 * dt; a.y += Math.sin(a.ph * 0.9) * 15 * dt; }
      else if (k === 1) { a.x += 90 * a.s * dt; a.y += Math.sin(a.ph * 2) * 10 * dt; }
      else if (k === 2) { a.y += 40 * a.s * dt; a.x += Math.sin(a.ph) * 15 * dt; }
      else { a.y -= 30 * a.s * dt; a.x += Math.sin(a.ph * 1.5) * 12 * dt; }
      if (a.x < -10) a.x += W + 20; if (a.x > W + 10) a.x -= W + 20;
      if (a.y < -10) a.y += H + 20; if (a.y > H + 10) a.y -= H + 20;
      const tw = k === 0 ? 0.3 + Math.max(0, Math.sin(a.ph * 2.5)) * 0.7 : 0.35 + Math.sin(a.ph * 3) * 0.2;
      ctx.globalAlpha = tw * (k === 2 ? 0.8 : 0.7);
      ctx.fillStyle = col;
      if (k === 1) { ctx.fillRect(a.x, a.y, 10 * a.s, 1.5); continue; }
      const rad = (k === 2 ? 2.2 : 1.8) * a.s;
      ctx.fillRect(a.x - rad, a.y - rad, rad * 2, rad * 2);
      if (k !== 2 && !lite) { ctx.globalAlpha *= 0.15; ctx.fillRect(a.x - rad * 2.4, a.y - rad * 2.4, rad * 4.8, rad * 4.8); }
    }
    ctx.globalAlpha = 1;
  }

  // Paylaşım kartı için ekran görüntüsü
  snapshot() { try { return this.c.toDataURL('image/jpeg', 0.8); } catch (e) { return null; } }
}
