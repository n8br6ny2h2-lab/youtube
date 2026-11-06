// Efsun Avcısı — savaş motoru (Canvas 2D, 60 FPS, mobil dokunmatik joystick)
import { chapterInfo, GAME } from './data.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

const ENEMIES = {
  slime:  { hp: 30,  speed: 78,  dmg: 10, r: 16, ai: 'chase',    xp: 1, color: null,      w: 5 },
  bat:    { hp: 18,  speed: 150, dmg: 8,  r: 12, ai: 'zigzag',   xp: 1, color: '#a78bfa', w: 3 },
  archer: { hp: 28,  speed: 65,  dmg: 12, r: 15, ai: 'ranged',   xp: 2, color: '#e5e7eb', w: 2, cd: 2.4 },
  golem:  { hp: 140, speed: 45,  dmg: 22, r: 26, ai: 'chase',    xp: 4, color: '#a8a29e', w: 1 },
  bomber: { hp: 24,  speed: 125, dmg: 40, r: 14, ai: 'kamikaze', xp: 2, color: '#4b5563', w: 2 },
  mage:   { hp: 45,  speed: 55,  dmg: 14, r: 16, ai: 'caster',   xp: 3, color: '#f472b6', w: 1.5, cd: 3 },
};
const CH_ENEMIES = [
  ['slime', 'bat', 'archer', 'golem'],
  ['slime', 'bat', 'archer', 'bomber', 'golem'],
  ['slime', 'bat', 'mage', 'golem', 'bomber'],
  ['bat', 'archer', 'mage', 'golem', 'bomber', 'slime'],
  ['slime', 'bat', 'archer', 'golem', 'bomber', 'mage'],
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

export class Game {
  constructor(canvas, cfg) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.mods = cfg.mods || {};
    this.ch = cfg.chapter;
    this.theme = chapterInfo(this.ch);
    this.chIdx = (this.ch - 1) % 5;
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
    this.kills = 0; this.goldPicked = 0; this.runes = 0; this.bossKills = 0; this.time = 0;
    this.spawnAcc = 0; this.paused = false; this.over = false; this.revived = false;
    this.shake = 0; this.timeScale = 1; this.slowT = 0;
    this.timers = { bolt: 2, meteor: 3, frostTick: 0, shield: 0, kaya: 0, fireNova: 5, frostNova: 6, stormCall: 4, fox: 4 };
    this.skills = {};
    this.hudT = 0;
    this.banner = { text: this.theme.name, sub: `${this.ch}. Bölüm • Dalga 1`, t: 2.4 };
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

  destroy() {
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
    const dpr = Math.min(2, window.devicePixelRatio || 1) * (this.cfg.quality === 'low' ? 0.6 : 1);
    this.W = this.c.clientWidth || window.innerWidth;
    this.H = this.c.clientHeight || window.innerHeight;
    this.c.width = Math.round(this.W * dpr); this.c.height = Math.round(this.H * dpr);
    this.dpr = dpr;
    this.zoom = clamp(Math.min(this.W, this.H * 0.62) / 440, 0.72, 1.25);
  }

  start() {
    this.running = true;
    let last = performance.now();
    const loop = now => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!this.paused) this.update(dt * this.timeScale);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  sfx(n) { this.cfg.sfx?.(n); }
  vib(ms) { this.cfg.haptic?.(ms); }

  // ---------------- güncelleme ----------------
  update(dt) {
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
      waves: GAME.wavesPerChapter, waveP: isBoss ? (this.bossActive ? 1 : 0) : this.waveT / GAME.waveLen,
      kills: this.kills, gold: this.goldPicked, shield: this.p.shield,
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
    if (l > 0.1) { p.walk += dt * 12; }
    if (p.inv > 0) p.inv -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (st.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * st.regen / 100 * dt);

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
    p.face = ang;
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
    e.hp -= dmg; e.flash = 0.08;
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

  chain(from, base) {
    const hit = new Set([from]);
    let cur = from;
    for (let i = 0; i < 2; i++) {
      const n = this.nearest(cur, 200, hit);
      if (!n) break;
      hit.add(n);
      this.fx.push({ type: 'bolt', pts: this.jag(cur.x, cur.y, n.x, n.y), t: 0, life: 0.2, color: '#fde047' });
      this.hitEnemy(n, base * 0.6, { proc: false });
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
        this.hitEnemy(e, dmg, { proc: false });
      }
    }
  }

  kill(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    this.burst(e.x, e.y, e.color, e.boss ? 60 : e.big ? 18 : 10, e.boss ? 360 : 200);
    this.sfx('kill');
    const xpMul = 1 + this.st.xp / 100;
    const nx = e.boss ? 12 : e.elite ? 4 : 1;
    for (let i = 0; i < nx; i++) this.drop('xp', e.x + rand(-10, 10) * (nx > 1 ? 2 : 0), e.y + rand(-10, 10) * (nx > 1 ? 2 : 0), Math.ceil(e.xp * xpMul / nx * (e.boss ? 3 : 1)));
    const goldChance = e.elite || e.boss ? 1 : 0.22;
    if (Math.random() < goldChance) {
      const n = e.boss ? 15 : e.elite ? 4 : 1;
      for (let i = 0; i < n; i++) this.drop('gold', e.x + rand(-25, 25), e.y + rand(-25, 25), Math.ceil((3 + this.ch * 2) * (1 + this.st.gold / 100)));
    }
    if (Math.random() < (e.elite ? 0.25 : 0.012)) this.drop('heart', e.x, e.y, 1);
    if (Math.random() < 0.003) this.drop('magnet', e.x, e.y, 1);
    if (this.st.spirits && Math.random() * 100 < this.st.spirits) this.spirits.push({ x: e.x, y: e.y, t: 4, vx: 0, vy: -100 });
    if (e.boss) {
      this.bossKills++;
      this.runes += e.mini ? 2 : 5 + Math.floor(this.ch / 2);
      this.shake = 18; this.vib(80);
      this.timeScale = 0.25; this.slowT = 1.1;
      this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, maxR: 420, t: 0, life: 0.8, color: e.color });
      this.bossActive = false; this.boss = null;
      if (this.wave >= GAME.wavesPerChapter) { this.endT = 1.6; this.banner = { text: 'ZAFER!', sub: 'Bölüm temizlendi', t: 3 }; this.sfx('win'); }
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
    if (p.shield > 0) { p.shield--; p.inv = 0.6; this.text(p.x, p.y - 30, 'BLOK', '#93c5fd', false, true); this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: 70, t: 0, life: 0.3, color: '#93c5fd' }); this.sfx('hit'); return; }
    dmg = Math.round(dmg * (1 - st.dr / 100));
    p.hp -= dmg; p.inv = 0.55; p.hurtT = 0.3;
    this.text(p.x, p.y - 30, '-' + dmg, '#ff4d4d', false, true);
    this.shake = Math.max(this.shake, 8); this.vib(35); this.sfx('hurt');
    if (src && st.thorns > 0 && !src.dead && src.hp !== undefined) this.hitEnemy(src, st.atk * st.thorns / 100 * 2, { proc: false });
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
        this.aoe(this.p.x, this.p.y, 350, this.baseDmg() * 6, { freeze: 2 });
        this.paused = false;
      } else this.finish(false);
    });
  }

  finish(victory) {
    if (this.over) return;
    this.over = true; this.paused = true;
    this.cfg.onEnd?.({
      victory, chapter: this.ch, wave: victory ? GAME.wavesPerChapter : this.wave - 1 + Math.min(0.99, this.waveT / GAME.waveLen),
      waveReached: this.wave, kills: this.kills, goldPicked: this.goldPicked, runes: this.runes, time: this.time,
      level: this.level, bossKills: this.bossKills, goldBonus: this.st.gold,
    });
  }

  // ---------------- dalgalar ----------------
  isBossWave(w) { return w === 5 || w === GAME.wavesPerChapter || (this.mods.extraBoss && w === 8); }

  updateWaves(dt) {
    if (this.endT > 0) return;
    if (!this.bossActive) {
      this.waveT += dt;
      if (this.isBossWave(this.wave)) {
        if (!this.bossSpawned && this.waveT > 2.5) this.spawnBoss();
      } else if (this.waveT >= GAME.waveLen) this.nextWave();
    }
    const rate = (0.95 + this.wave * 0.24) * (this.mods.spawnMul || 1) * (this.bossActive ? 0.2 : 1) * (this.isBossWave(this.wave) && !this.bossSpawned ? 0.2 : 1);
    const cap = Math.min(85, 40 + this.wave * 4) * (this.mods.spawnMul || 1);
    this.spawnAcc += dt * rate;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length < cap) this.spawn();
    }
  }

  nextWave() {
    this.wave++; this.waveT = 0; this.bossSpawned = false;
    const boss = this.isBossWave(this.wave);
    this.banner = { text: boss ? '⚠ BOSS DALGASI ⚠' : `Dalga ${this.wave}`, sub: boss ? 'Hazırlan!' : `${GAME.wavesPerChapter - this.wave + 1} dalga kaldı`, t: 2 };
    this.healP(0.08);
  }

  diffHp() { return Math.pow(1.36, this.ch - 1) * (1 + 0.09 * (this.wave - 1)) * (this.mods.enemyHp || 1); }
  diffDmg() { return Math.pow(1.25, this.ch - 1) * (1 + 0.045 * (this.wave - 1)); }

  spawnPos(dist) {
    const a = rand(0, TAU);
    const rx = dist || this.W / this.zoom / 2 + 70, ry = dist || this.H / this.zoom / 2 + 70;
    return { x: this.p.x + Math.cos(a) * rx, y: this.p.y + Math.sin(a) * ry };
  }

  spawn(type, pos, opt = {}) {
    const list = CH_ENEMIES[this.chIdx];
    type = type || this.weightedType(list);
    const d = ENEMIES[type];
    const elite = opt.elite ?? Math.random() < (0.025 + this.wave * 0.005) * (this.mods.eliteMul || 1);
    const sc = elite ? 1.45 : 1;
    const hp = d.hp * this.diffHp() * (elite ? 3.5 : 1);
    pos = pos || this.spawnPos();
    this.enemies.push({
      type, ai: d.ai, x: pos.x, y: pos.y, r: d.r * sc, hp, maxHp: hp, speed: d.speed * (this.mods.enemySpeed || 1) * rand(0.9, 1.1),
      dmg: d.dmg * this.diffDmg() * (elite ? 1.5 : 1), xp: d.xp * (elite ? 3 : 1), color: d.color || this.theme.accent,
      elite, big: elite || type === 'golem', cd: d.cd ? rand(0.8, d.cd) : 0, kx: 0, ky: 0, flash: 0, frozen: 0, slow: 1,
      ph: rand(0, TAU), fuse: 0, tp: rand(4, 7),
    });
  }

  weightedType(list) {
    const tot = list.reduce((s, t) => s + ENEMIES[t].w, 0);
    let r = Math.random() * tot;
    for (const t of list) { r -= ENEMIES[t].w; if (r <= 0) return t; }
    return list[0];
  }

  spawnBoss() {
    this.bossSpawned = true; this.bossActive = true;
    const mini = this.wave < GAME.wavesPerChapter;
    const key = mini ? 'guardian' : this.theme.boss;
    const b = BOSSES[key];
    const hp = (mini ? 450 : 1100) * Math.pow(1.36, this.ch - 1) * (this.mods.enemyHp || 1);
    const pos = this.spawnPos(320);
    const e = {
      type: 'boss', boss: true, mini, key, name: b.name, ai: 'boss', x: pos.x, y: pos.y, r: mini ? 38 : 52, hp, maxHp: hp,
      speed: mini ? 70 : 62, dmg: (mini ? 22 : 30) * this.diffDmg(), xp: 30, color: b.color, patterns: b.patterns,
      state: 'move', pt: 2, kx: 0, ky: 0, flash: 0, frozen: 0, slow: 1, ph: 0, big: true, elite: false,
    };
    this.enemies.push(e); this.boss = e;
    this.banner = { text: b.name, sub: mini ? 'Mini Boss' : 'BÖLÜM BOSS\'U', t: 2.4 };
    this.shake = 14; this.sfx('boss'); this.vib(60);
  }

  // ---------------- düşmanlar ----------------
  updateEnemy(e, dt) {
    if (e.dead) return;
    const p = this.p;
    e.flash = Math.max(0, e.flash - dt);
    if (e.burn > 0) {
      e.burn -= dt; const dd = e.burnDps * dt; e.hp -= dd; e.burnAcc = (e.burnAcc || 0) + dd;
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
          if (e.bt <= 0) { const n = 18, off = e.burst * 0.17; for (let i = 0; i < n; i++) this.ebullet(e.x, e.y, off + i * TAU / n, 200, e.dmg * 0.7, e.color); e.burst++; e.bt = 0.4; }
          done = e.burst >= 3; break;
        case 'spiral':
          if (e.bt <= 0) { for (let i = 0; i < 6; i++) this.ebullet(e.x, e.y, e.burst * 0.3 + i * TAU / 6, 210, e.dmg * 0.6, e.color); e.burst++; e.bt = 0.1; }
          done = e.burst >= 16; break;
        case 'spread':
          if (e.bt <= 0) { for (let i = -2; i <= 2; i++) this.ebullet(e.x, e.y, aim + i * 0.2, 300, e.dmg * 0.7, e.color); e.burst++; e.bt = 0.3; }
          done = e.burst >= 3; break;
        case 'charge': {
          if (e.actT === dt || !e.cvx) { const a = Math.atan2(e.ty - e.y, e.tx - e.x); e.cvx = Math.cos(a) * 680; e.cvy = Math.sin(a) * 680; }
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
      if (done) { e.state = 'move'; e.pt = rand(1.3, 2.2) * enr; }
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
          this.hitEnemy(e, b.dmg, { kx: b.vx / sp, ky: b.vy / sp, proc: b.proc });
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
          s.t = 0; this.aoe(s.x, s.y, 60, this.baseDmg() * 1.5);
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
    for (let i = 0; i < st.orbs; i++) { const a = this.time * 3.2 + i * TAU / st.orbs; this.orbitals.push({ x: p.x + Math.cos(a) * 75, y: p.y + Math.sin(a) * 75, r: 13, dmg: dmg * 0.6, kind: 'orb' }); }
    for (let i = 0; i < st.blades; i++) { const a = -this.time * 2.4 + i * TAU / st.blades; this.orbitals.push({ x: p.x + Math.cos(a) * 140, y: p.y + Math.sin(a) * 140, r: 15, dmg: dmg * 0.75, kind: 'blade', a }); }
    if (this.orbitals.length) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        e.ocd = (e.ocd || 0) - dt;
        if (e.ocd > 0) continue;
        for (const o of this.orbitals) {
          if ((e.x - o.x) ** 2 + (e.y - o.y) ** 2 < (e.r + o.r) ** 2) { e.ocd = 0.35; this.hitEnemy(e, o.dmg, { proc: false }); if (o.kind === 'orb' && Math.random() < 0.3) this.burn(e, o.dmg); break; }
        }
      }
    }
    if (st.bolt > 0 && (T.bolt -= dt) <= 0) { T.bolt = 2.3 - st.bolt * 0.2; this.bolts(st.bolt + 1, dmg * 1.3); }
    if (st.frost > 0) {
      const R = 95 + st.frost * 18;
      T.frostTick -= dt;
      const tick = T.frostTick <= 0; if (tick) T.frostTick = 0.5;
      for (const e of this.enemies) if (!e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (R + e.r) ** 2) { e.slow = 0.5; if (tick) this.hitEnemy(e, dmg * 0.25 * st.frost, { proc: false }); }
      this.frostR = R;
    } else this.frostR = 0;
    if (st.meteor > 0 && (T.meteor -= dt) <= 0) {
      T.meteor = 3.6;
      for (let i = 0; i < st.meteor; i++) {
        const t = this.enemies[Math.floor(Math.random() * this.enemies.length)];
        if (t) this.fx.push({ type: 'meteor', x: t.x + rand(-20, 20), y: t.y + rand(-20, 20), r: 85, t: 0, life: 0.65, dmg: dmg * 2.4 });
      }
    }
    if (st.shieldSkill > 0 && p.shield < 1 && (T.shield -= dt) <= 0) { T.shield = 10 - st.shieldSkill * 2; p.shield = 1; }
    if (st.shieldEvery && p.shield < 1 && (T.kaya -= dt) <= 0) { T.kaya = st.shieldEvery; p.shield = 1; }
    for (const pw of st.setPowers) {
      if ((T[pw] -= dt) > 0) continue;
      if (pw === 'fireNova') { T[pw] = 5; this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: 180, t: 0, life: 0.45, color: '#ff6b3d', fill: true }); this.aoe(p.x, p.y, 180, dmg * 1.6, { burn: true }); this.sfx('boom'); }
      if (pw === 'frostNova') { T[pw] = 6; this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, maxR: 200, t: 0, life: 0.5, color: '#7dd3fc', fill: true }); this.aoe(p.x, p.y, 200, dmg, { freeze: 1.6 }); }
      if (pw === 'stormCall') { T[pw] = 4; this.bolts(5, dmg * 1.4); }
    }
  }

  bolts(n, dmg) {
    const vis = this.enemies.filter(e => !e.dead && Math.abs(e.x - this.p.x) < this.W / this.zoom / 2 + 40 && Math.abs(e.y - this.p.y) < this.H / this.zoom / 2 + 40);
    for (let i = 0; i < n && vis.length; i++) {
      const t = vis.splice(Math.floor(Math.random() * vis.length), 1)[0];
      this.fx.push({ type: 'bolt', pts: this.jag(t.x + rand(-40, 40), t.y - 420, t.x, t.y), t: 0, life: 0.25, color: '#fde047', w: 4 });
      this.fx.push({ type: 'ring', x: t.x, y: t.y, r: 6, maxR: 55, t: 0, life: 0.25, color: '#fde047' });
      this.aoe(t.x, t.y, 50, dmg);
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
          if (dist < 240 && Math.abs(da) < 0.5) { this.burn(e, dmg); this.hitEnemy(e, dmg * 0.9, { proc: false }); }
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
    this.choosing = true; this.paused = true;
    this.sfx('level'); this.vib(25);
    this.fx.push({ type: 'ring', x: this.p.x, y: this.p.y, r: 10, maxR: 160, t: 0, life: 0.5, color: '#fde68a' });
    this.cfg.onLevelUp?.(this.skillChoices(), id => this.chooseSkill(id));
  }

  skillChoices(n = 3) {
    const pool = RUN_SKILLS.filter(s => (this.skills[s.id] || 0) < s.max && (!s.cond || s.cond(this)) && !(this.st.wtype === 'sword' && (s.id === 'pierce' || s.id === 'bounce')));
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out.map(s => ({ ...s, lvl: (this.skills[s.id] || 0) + 1 }));
  }

  chooseSkill(id) {
    const s = RUN_SKILLS.find(x => x.id === id);
    if (s) { s.apply(this); this.skills[id] = (this.skills[id] || 0) + 1; }
    this.pendingLv--;
    this.choosing = false;
    if (this.pendingLv > 0) { this.levelUp(); return; }
    this.paused = false;
    this.p.inv = Math.max(this.p.inv, 0.8);
  }

  // ---------------- efektler ----------------
  text(x, y, v, color, crit = false, big = false) {
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
      if (f.type === 'meteor' && !f.hit && f.t >= f.life * 0.85) {
        f.hit = true; this.aoe(f.x, f.y, f.r, f.dmg, { burn: true });
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
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z); ctx.translate(-p.x, -p.y);
    this.drawGround();
    if (this.frostR) { ctx.fillStyle = 'rgba(125,211,252,0.10)'; ctx.strokeStyle = 'rgba(125,211,252,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, this.frostR, 0, TAU); ctx.fill(); ctx.stroke(); }
    for (const f of this.fx) if (f.type === 'tele' || f.type === 'teleLine' || f.type === 'meteor') this.drawFx(f);
    this.drawPickups();
    for (const e of this.enemies) this.drawEnemy(e);
    this.drawPlayer();
    this.drawPet();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bullets) this.drawBullet(b);
    for (const o of this.orbitals || []) this.drawOrbital(o);
    for (const s of this.spirits) { ctx.fillStyle = 'rgba(167,139,250,0.85)'; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(167,139,250,0.25)'; ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, TAU); ctx.fill(); }
    for (const b of this.ebullets) { ctx.fillStyle = b.color; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.9, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill(); }
    for (const q of this.parts) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
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
      }
    }
  }

  drawShadow(x, y, r) { const ctx = this.ctx; ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 0.9, r * 0.35, 0, 0, TAU); ctx.fill(); }

  drawEnemy(e) {
    const ctx = this.ctx, r = e.r, x = e.x, y = e.y, p = this.p;
    this.drawShadow(x, y, r);
    const col = e.flash > 0 ? '#ffffff' : e.frozen > 0 ? '#bae6fd' : e.color;
    const look = Math.atan2(p.y - y, p.x - x), ex = Math.cos(look) * r * 0.25, ey = Math.sin(look) * r * 0.2;
    if (e.elite) { ctx.strokeStyle = 'rgba(250,204,21,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 5 + Math.sin(e.ph * 6) * 2, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = col;
    switch (e.type) {
      case 'slime': {
        const sq = 1 + Math.sin(e.ph * 8) * 0.08;
        ctx.beginPath(); ctx.ellipse(x, y + r * 0.15, r * sq, r / sq * 0.9, 0, Math.PI, 0); ctx.lineTo(x + r * sq, y + r * 0.7); ctx.lineTo(x - r * sq, y + r * 0.7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.3, r * 0.25, r * 0.15, -0.5, 0, TAU); ctx.fill();
        break;
      }
      case 'bat': {
        const f = Math.sin(e.ph * 18) * 0.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - r * 2.1, y - r * (0.4 + f)); ctx.lineTo(x - r * 1.2, y + r * 0.3); ctx.lineTo(x, y); ctx.lineTo(x + r * 2.1, y - r * (0.4 + f)); ctx.lineTo(x + r * 1.2, y + r * 0.3); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, TAU); ctx.fill(); break;
      }
      case 'archer': case 'mage': {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        if (e.type === 'mage') { ctx.fillStyle = e.flash > 0 ? '#fff' : '#7e22ce'; ctx.beginPath(); ctx.moveTo(x - r * 1.1, y - r * 0.4); ctx.lineTo(x + r * 1.1, y - r * 0.4); ctx.lineTo(x + r * 0.2, y - r * 2); ctx.fill(); }
        else { ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + Math.cos(look) * r, y + Math.sin(look) * r, r * 0.8, look - 1.2, look + 1.2); ctx.stroke(); }
        if (e.cd < 0.4 && e.cd > 0) { ctx.fillStyle = 'rgba(255,80,80,0.5)'; ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, TAU); ctx.fill(); }
        break;
      }
      case 'golem': {
        ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2, rr = r * (i % 2 ? 0.92 : 1.05); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.6); ctx.lineTo(x - r * 0.1, y - r * 0.1); ctx.lineTo(x - r * 0.4, y + r * 0.4); ctx.stroke();
        break;
      }
      case 'bomber': {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        const blink = e.fuse > 0 && Math.floor(e.fuse * 20) % 2 === 0;
        if (blink) { ctx.fillStyle = 'rgba(255,60,60,0.8)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = '#d6d3d1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + 6, y - r - 8, x + 3, y - r - 12); ctx.stroke();
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(x + 3, y - r - 12, 3 + Math.random() * 2, 0, TAU); ctx.fill();
        break;
      }
      case 'boss': this.drawBoss(e, col); break;
    }
    // gözler
    {
      const er = Math.max(2.2, r * 0.16), eo = r * 0.32;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x - eo + ex, y - r * 0.12 + ey, er * 1.3, 0, TAU); ctx.arc(x + eo + ex, y - r * 0.12 + ey, er * 1.3, 0, TAU); ctx.fill();
      ctx.fillStyle = e.boss || e.elite ? '#dc2626' : '#111';
      ctx.beginPath(); ctx.arc(x - eo + ex * 1.4, y - r * 0.12 + ey * 1.4, er * 0.7, 0, TAU); ctx.arc(x + eo + ex * 1.4, y - r * 0.12 + ey * 1.4, er * 0.7, 0, TAU); ctx.fill();
    }
    if (e.burn > 0) { ctx.fillStyle = 'rgba(251,146,60,0.25)'; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.fill(); }
    if (!e.boss && e.hp < e.maxHp) {
      const w = r * 2, hy = y - r - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - w / 2, hy, w, 4);
      ctx.fillStyle = e.elite ? '#facc15' : '#ef4444'; ctx.fillRect(x - w / 2, hy, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  }

  drawBoss(e, col) {
    const ctx = this.ctx, x = e.x, y = e.y, r = e.r, t = this.time;
    if (e.state === 'tele') { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(x, y, r * (1.3 + Math.sin(t * 30) * 0.08), 0, TAU); ctx.fill(); }
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r);
    g.addColorStop(0, e.flash > 0 ? '#fff' : this.lighten(col)); g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.beginPath();
    const spikes = 10;
    for (let i = 0; i < spikes * 2; i++) { const a = i * Math.PI / spikes + t * 0.3, rr = i % 2 ? r : r * 1.12; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    // taç / boynuzlar
    ctx.fillStyle = e.mini ? '#fde68a' : '#fbbf24';
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.75); ctx.lineTo(x - r * 0.45, y - r * 1.35); ctx.lineTo(x - r * 0.2, y - r * 0.85); ctx.lineTo(x, y - r * 1.45); ctx.lineTo(x + r * 0.2, y - r * 0.85); ctx.lineTo(x + r * 0.45, y - r * 1.35); ctx.lineTo(x + r * 0.6, y - r * 0.75); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * 0.4, r * 0.15 + (e.state === 'act' ? r * 0.12 : 0), 0, 0, TAU); ctx.fill();
  }

  lighten(hex) {
    const n = parseInt(hex.slice(1), 16), r = Math.min(255, (n >> 16) + 70), g = Math.min(255, ((n >> 8) & 255) + 70), b = Math.min(255, (n & 255) + 70);
    return `rgb(${r},${g},${b})`;
  }

  drawPlayer() {
    const ctx = this.ctx, p = this.p, st = this.st;
    const blink = p.inv > 0 && Math.floor(p.inv * 18) % 2 === 0;
    this.drawShadow(p.x, p.y, p.r);
    const bob = Math.sin(p.walk) * 2;
    const heroCol = this.cfg.heroColor || '#60a5fa';
    ctx.globalAlpha = blink ? 0.45 : 1;
    // pelerin
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(p.x - Math.cos(p.face) * 6, p.y + 2 - Math.sin(p.face) * 4 + bob, p.r, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(p.x - 6, p.y - 8 + bob, 3, p.x, p.y + bob, p.r + 2);
    g.addColorStop(0, p.hurtT > 0 ? '#fecaca' : this.lighten(heroCol)); g.addColorStop(1, p.hurtT > 0 ? '#ef4444' : heroCol);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y + bob, p.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
    // yüz
    const fx = Math.cos(p.face) * 5, fy = Math.sin(p.face) * 4;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - 5 + fx, p.y - 3 + fy + bob, 3.6, 0, TAU); ctx.arc(p.x + 5 + fx, p.y - 3 + fy + bob, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(p.x - 5 + fx * 1.3, p.y - 3 + fy * 1.3 + bob, 1.8, 0, TAU); ctx.arc(p.x + 5 + fx * 1.3, p.y - 3 + fy * 1.3 + bob, 1.8, 0, TAU); ctx.fill();
    // silah
    ctx.save(); ctx.translate(p.x, p.y + bob); ctx.rotate(p.face);
    if (st.wtype === 'bow') { ctx.strokeStyle = '#d4a373'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(14, 0, 14, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14 + Math.cos(-1.2) * 14, Math.sin(-1.2) * 14); ctx.lineTo(14 + Math.cos(1.2) * 14, Math.sin(1.2) * 14); ctx.stroke(); }
    else if (st.wtype === 'staff') { ctx.strokeStyle = '#a16207'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(30, 4); ctx.stroke(); ctx.fillStyle = '#a5f3fc'; ctx.beginPath(); ctx.arc(32, 3, 6, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(14, -3); ctx.lineTo(42, 0); ctx.lineTo(14, 3); ctx.fill(); ctx.fillStyle = '#ca8a04'; ctx.fillRect(10, -7, 4, 14); }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (p.shield > 0) { ctx.strokeStyle = 'rgba(147,197,253,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y + bob, p.r + 8 + Math.sin(this.time * 5) * 1.5, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(147,197,253,0.12)'; ctx.fill(); }
  }

  drawPet() {
    if (!this.st.pet) return;
    const ctx = this.ctx, pet = this.pet, icon = { owl: '🦉', fox: '🦊', drake: '🐲' }[this.st.pet];
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(pet.x, pet.y + 22, 10, 4, 0, 0, TAU); ctx.fill();
    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, pet.x, pet.y + Math.sin(this.time * 4) * 4);
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
      ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.5, 0, TAU); ctx.fill();
    } else {
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(this.time * 14);
      ctx.fillStyle = '#e2e8f0';
      for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.r * 1.3, -4); ctx.lineTo(o.r * 1.3, 4); ctx.fill(); }
      ctx.restore();
    }
  }

  drawFx(f) {
    const ctx = this.ctx, k = f.t / f.life;
    switch (f.type) {
      case 'slash': {
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 14 * (1 - k) + 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.7 + k * 0.3), f.a - f.arc / 2, f.a + f.arc / 2); ctx.stroke();
        ctx.strokeStyle = `rgba(147,197,253,${0.6 * (1 - k)})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.55 + k * 0.3), f.a - f.arc / 2, f.a + f.arc / 2); ctx.stroke();
        break;
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

  // Paylaşım kartı için ekran görüntüsü
  snapshot() { try { return this.c.toDataURL('image/jpeg', 0.8); } catch (e) { return null; } }
}
