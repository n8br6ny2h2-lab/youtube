// Oyun motoru: sabit adımlı fizik (60/90/120 Hz ekranlarda aynı oynanış), prosedürel sonsuz harita,
// 5 engel türü, güçlendirmeler, 5 bölge, efektler ve karakter çizimi.
import { TUNING as T, BIOMES, BIOME_EVERY } from './config.js';

const STEP = 1 / 120;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedFromString(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const rgbCache = {};
function rgb(hex) {
  if (rgbCache[hex]) return rgbCache[hex];
  const n = parseInt(hex.slice(1), 16);
  return (rgbCache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
function mix(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`;
}
function rgba(hex, a) { const [r, g, b] = rgb(hex.startsWith('#') ? hex : '#ffffff'); return `rgba(${r},${g},${b},${a})`; }

// Arka plan silüetleri (bölgeye göre tepe / sivri dağ / şehir)
function makeProfiles() {
  const r = mulberry32(7);
  const wave = (n, sharp) => Array.from({ length: n }, (_, i) => {
    const x = i / n * TAU;
    let v = 0.5 + 0.25 * Math.sin(x * 2 + 1) + 0.15 * Math.sin(x * 5 + 2) + 0.1 * (r() - 0.5);
    if (sharp) v = i % 2 ? v * 0.55 : Math.min(1, v * 1.15);
    return clamp(v, 0.05, 1);
  });
  const city = [];
  for (let x = 0; x < 480;) { const w = 22 + Math.floor(r() * 34); city.push({ x, w: w - 4, h: 0.3 + r() * 0.7, win: r() > 0.3 }); x += w; }
  return { hills: wave(48, false), peaks: wave(40, true), hills2: wave(48, false).reverse(), city };
}
const LAYERS = {
  dusk: [['hills', 0.2, 150], ['hills2', 0.45, 90]],
  neon: [['city', 0.15, 230], ['city', 0.4, 140]],
  ice: [['peaks', 0.2, 210], ['peaks', 0.45, 110]],
  lava: [['peaks', 0.18, 190], ['hills', 0.45, 80]],
  space: [['peaks', 0.4, 60]],
};

export class Game {
  constructor(canvas, on = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.on = on;
    this.hq = true;
    this.skin = null;
    this.paused = false;
    this.last = 0; this.acc = 0; this.scroll = 0; this.clock = 0;
    this.stars = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * 0.8, r: Math.random() * 1.4 + 0.3, p: Math.random() * TAU }));
    this.amb = Array.from({ length: 34 }, () => ({ x: Math.random() * 600, y: Math.random() * 900, s: Math.random() }));
    this.prof = makeProfiles();
    this.resize();
    this.reset('classic');
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.hq ? 2.5 : 1.5);
    this.cv.width = Math.round(cw * this.dpr); this.cv.height = Math.round(ch * this.dpr);
    this.cv.style.width = cw + 'px'; this.cv.style.height = ch + 'px';
    this.W = T.W;
    this.H = clamp(this.W * ch / cw, 620, 900);
    this.scale = Math.min(cw / this.W, ch / this.H);
    this.offX = (cw - this.W * this.scale) / 2; this.offY = (ch - this.H * this.scale) / 2;
    this.floorY = this.H - T.groundH;
    this.viewL = -this.offX / this.scale; this.viewR = this.W + this.offX / this.scale;
    this.viewT = -this.offY / this.scale; this.viewB = this.H + this.offY / this.scale;
    this.cw = cw; this.ch = ch;
  }

  setSkin(skin) { this.skin = skin; }

  reset(mode, seed = null) {
    this.mode = mode;
    this.rng = mulberry32(seed ?? (Math.random() * 2 ** 32) >>> 0);
    this.state = 'ready';
    this.score = 0; this.coins = 0; this.combo = 0; this.bestCombo = 0; this.perfects = 0; this.powerups = 0;
    this.t = 0;
    this.bird = { x: this.W * T.birdX, y: this.H * 0.42, vy: 0, rot: 0, wing: 0, baseY: this.H * 0.42 };
    this.pillars = []; this.saws = []; this.items = []; this.parts = []; this.texts = []; this.trail = [];
    this.idx = 0; this.lastC = this.H * 0.42; this.lastGap = T.gap[0]; this.nextX = this.viewR + 60;
    this.nextPower = this.randInt(...T.powerupEvery);
    this.shield = false; this.magnetT = 0; this.slowT = 0; this.invT = 0;
    this.biome = 0; this.biomeFrom = 0; this.biomeK = 1;
    this.shake = 0; this.flash = 0; this.deathT = 0; this.continued = false; this.lastShifter = false;
  }

  rand(a = 0, b = 1) { return a + (b - a) * this.rng(); }   // harita (günlük modda herkes için aynı)
  vr(a = 0, b = 1) { return a + (b - a) * Math.random(); }   // yalnızca görsel efektler
  randInt(a, b) { return Math.floor(this.rand(a, b + 1)); }

  get hard() { return this.mode === 'hardcore'; }
  speed() {
    const e = this.ease(this.score);
    return lerp(T.speed[0], T.speed[1], e) * (this.hard ? T.hardcore.speedMul : 1);
  }
  ease(i) { const d = clamp(i / T.rampScore, 0, 1); return 1 - (1 - d) * (1 - d); }

  // ---------- Girdi ----------
  flap() {
    if (this.paused) return;
    if (this.state === 'ready') { this.state = 'play'; this.on.start?.(); }
    if (this.state !== 'play') return;
    this.bird.vy = T.flapV;
    this.bird.wing = 1;
    this.on.sfx?.('flap');
    this.on.haptic?.('light');
    for (let i = 0; i < 4; i++) this.part(this.bird.x - 8, this.bird.y + 6, this.vr(-90, -30) - 40, this.vr(40, 140), 0.35, this.skin?.tc || '#fff', 2.5);
  }

  revive() {
    const b = this.bird;
    this.pillars = this.pillars.filter(p => p.x > b.x + 230 || p.x + T.pillarW < b.x - 140);
    this.saws = this.saws.filter(s => s.x > b.x + 230 || s.x < b.x - 140);
    this.items = this.items.filter(it => !it.p || this.pillars.includes(it.p));
    if (!this.pillars.length) this.nextX = b.x + 260;
    b.y = b.baseY = this.H * 0.42; b.vy = 0; b.rot = 0;
    this.state = 'ready'; this.invT = 2.2; this.continued = true; this.combo = 0;
  }

  // ---------- Döngü ----------
  loop(now) {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (!this.paused) {
      let ts = 1;
      if (this.slowT > 0) ts = 0.62;
      if (this.state === 'dying' && this.deathT < 0.25) ts = 0.3;
      this.acc += dt * ts;
      let n = 0;
      while (this.acc >= STEP && n++ < 12) { this.step(STEP); this.acc -= STEP; }
    }
    this.render(dt);
    this.on.tick?.();
  }

  step(dt) {
    this.t += dt; this.clock += dt;
    const b = this.bird;
    if (this.biomeK < 1) this.biomeK = Math.min(1, this.biomeK + dt / 1.6);
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    b.wing = Math.max(0, b.wing - dt * 5);

    if (this.state === 'ready') {
      this.scroll += 60 * dt;
      b.y = b.baseY + Math.sin(this.t * 4) * 8;
      b.rot = Math.sin(this.t * 4) * 0.08;
      if (this.t % 0.4 < dt) b.wing = 1;
      this.updateFx(dt, 60);
      return;
    }

    if (this.state === 'play') {
      const sp = this.speed();
      this.scroll += sp * dt;
      this.invT = Math.max(0, this.invT - dt);
      if (this.magnetT > 0) { this.magnetT -= dt; if (this.magnetT <= 0) this.on.power?.(); }
      if (this.slowT > 0) { this.slowT -= dt * 1.6; if (this.slowT <= 0) this.on.power?.(); }

      b.vy = Math.min(T.maxFall, b.vy + T.gravity * dt);
      b.y += b.vy * dt;
      if (b.y < T.birdR + this.viewT) { b.y = T.birdR + this.viewT; b.vy = Math.max(0, b.vy); }
      b.rot = lerp(b.rot, clamp(b.vy / 620, -0.45, 1.25), Math.min(1, dt * (b.vy < 0 ? 18 : 7)));

      // Engeller
      for (const p of this.pillars) this.updatePillar(p, sp, dt);
      for (const s of this.saws) { s.x -= sp * dt; s.y = s.baseY + Math.sin(this.t * s.f + s.ph) * s.amp; s.a += dt * 8; }
      while (this.nextX < this.viewR + 80) this.spawn();
      this.nextX -= sp * dt;
      this.pillars = this.pillars.filter(p => p.x + T.pillarW > this.viewL - 20);
      this.saws = this.saws.filter(s => s.x > this.viewL - 40);

      this.collide();
      this.updateItems(sp, dt);
      if (b.y + T.birdR >= this.floorY) {
        if (this.shield) this.useShield(true); else this.die('ground');
      }
      this.updateFx(dt, sp);
      return;
    }

    if (this.state === 'dying' || this.state === 'dead') {
      this.deathT += dt;
      if (b.y + T.birdR < this.floorY) {
        b.vy = Math.min(T.maxFall, b.vy + T.gravity * dt);
        b.y = Math.min(this.floorY - T.birdR, b.y + b.vy * dt);
        b.rot = lerp(b.rot, 1.57, dt * 6);
      } else if (this.state === 'dying') { this.shake = Math.max(this.shake, 4); }
      if (this.state === 'dying' && this.deathT > 0.75) {
        this.state = 'dead';
        this.on.death?.({ score: this.score, coins: this.coins, perfects: this.perfects, bestCombo: this.bestCombo, powerups: this.powerups, continued: this.continued });
      }
      this.updateFx(dt, 0);
    }
  }

  // ---------- Prosedürel harita ----------
  spawn() {
    const i = this.idx++;
    const e = this.ease(i);
    const hard = this.hard;
    let gap = lerp(T.gap[0], T.gap[1], e) + (hard ? T.hardcore.gapAdd : 0) + this.rand(-5, 5);
    const spacing = lerp(T.spacing[0], T.spacing[1], e) + this.rand(-10, 14);
    const u = hard ? 0.5 : 1;
    const U = T.unlock;
    const types = [['static', Math.max(0.22, 1 - e * 1.3)]];
    if (i >= U.moving * u) types.push(['moving', 0.55]);
    if (i >= U.breathing * u) types.push(['breathing', 0.35]);
    if (i >= U.shifter * u && !this.lastShifter) types.push(['shifter', 0.3]);
    let r = this.rand(0, types.reduce((s, x) => s + x[1], 0)), type = 'static';
    for (const [k, w] of types) { if ((r -= w) <= 0) { type = k; break; } }
    if (i < 2) type = 'static';
    this.lastShifter = type === 'shifter';

    const p = { x: this.nextX, type, gap, base: gap, ph: this.rand(0, TAU), f: this.rand(1.5, 2.5), amp: 0, passed: false, maxOff: 0, warn: 0, shiftK: 0, i };
    if (type === 'breathing') p.base = gap + 26;
    if (type === 'moving') p.amp = lerp(26, 72, e) * this.rand(0.7, 1);
    const half = p.base / 2 + p.amp;
    const lo = this.viewT + 56 + half, hi = this.floorY - 50 - half;
    // ADALET SINIRI: iki aralık arasındaki dikey fark, kuşun o sürede fiziksel olarak
    // inip çıkabileceği mesafeyi aşmaz (zor ama her zaman geçilebilir).
    const sp = lerp(T.speed[0], T.speed[1], e) * (hard ? T.hardcore.speedMul : 1);
    const tau = (spacing - T.pillarW) / sp;
    const reach = 0.4 * T.gravity * tau * tau + Math.min(gap, this.lastGap) * 0.35;
    const maxD = Math.max(40, Math.min(lerp(110, 200, e), reach) - p.amp);
    const c = clamp(this.lastC + this.rand(-maxD, maxD), lo, Math.max(lo, hi));
    p.c0 = p.c = c;
    if (type === 'shifter') {
      const dir = (c - lo < 90) ? 1 : (hi - c < 90) ? -1 : (this.rand() < 0.5 ? -1 : 1);
      const to = clamp(c + dir * this.rand(70, 120), this.viewT + 56 + gap / 2, this.floorY - 50 - gap / 2);
      p.to = clamp(to, this.lastC - reach - 30, this.lastC + reach + 30);
    }
    this.lastGap = p.gap;
    this.pillars.push(p);

    // Ödüller
    const cx = T.pillarW / 2;
    const powerOK = !(hard && T.hardcore.noPowerups);
    if (powerOK && i === this.nextPower) {
      const kinds = ['shield', 'magnet', 'slow'];
      this.items.push({ kind: kinds[this.randInt(0, 2)], p, dx: cx, dy: 0, x: 0, y: 0, r: 15, t: 0 });
      this.nextPower = i + this.randInt(...T.powerupEvery);
    } else if (this.rand() < 0.42) {
      this.items.push({ kind: 'coin', p, dx: cx, dy: 0, x: 0, y: 0, r: 10, t: this.rand(0, 3) });
    }
    if (i > 2 && this.rand() < 0.18) {
      for (let k = -1; k <= 1; k++) {
        const f = 0.5 + k * 0.22;
        this.items.push({ kind: 'coin', p: null, x: this.nextX - spacing + T.pillarW + (spacing - T.pillarW) * f, y: lerp(this.lastC, c, f) + Math.sin(f * Math.PI) * -18, r: 10, t: k });
      }
    }
    // Testere: iki sütun arasında, geçiş çizgisinden uzakta (adil ama riskli kavisleri cezalandırır)
    if (i >= T.unlock.saw * u && this.rand() < lerp(0.18, 0.4, e)) {
      const mid = (this.lastC + c) / 2, off = gap / 2 + 62;
      const up = mid - off, down = mid + off;
      const y = (up - this.viewT > this.floorY - down) ? up : down;
      if (y > this.viewT + 24 && y < this.floorY - 24) {
        this.saws.push({ x: this.nextX - (spacing - T.pillarW) / 2, baseY: y, y, amp: 22, f: this.rand(1.6, 2.6), ph: this.rand(0, TAU), r: 17, a: 0 });
      }
    }
    this.lastC = type === 'shifter' ? p.to : c; // sonraki aralık kaydırılmış konuma göre üretilir
    this.nextX += spacing;
  }

  updatePillar(p, sp, dt) {
    p.x -= sp * dt;
    if (p.type === 'moving') p.c = p.c0 + Math.sin(this.t * p.f + p.ph) * p.amp;
    if (p.type === 'breathing') p.gap = p.base * (0.8 + 0.2 * (0.5 + 0.5 * Math.sin(this.t * p.f * 1.4 + p.ph)));
    if (p.type === 'shifter') {
      const trig = this.bird.x + sp * 1.1;
      if (p.warn === 0 && p.x < trig) { p.warn = 0.0001; this.on.sfx?.('warn'); }
      if (p.warn > 0 && p.shiftK < 1) {
        p.warn += dt;
        if (p.warn > 0.38) { p.shiftK = Math.min(1, p.shiftK + dt / 0.3); const k = p.shiftK * p.shiftK * (3 - 2 * p.shiftK); p.c = lerp(p.c0, p.to, k); }
      }
    }
  }

  collide() {
    const b = this.bird, R = T.birdR, w = T.pillarW;
    for (const p of this.pillars) {
      const top = p.c - p.gap / 2, bot = p.c + p.gap / 2;
      if (b.x + R > p.x && b.x - R < p.x + w) {
        p.maxOff = Math.max(p.maxOff, Math.abs(b.y - p.c));
        if (this.invT <= 0 && (circleRect(b.x, b.y, R, p.x, this.viewT - 500, w, top - this.viewT + 500) || circleRect(b.x, b.y, R, p.x, bot, w, this.floorY - bot + 10))) {
          if (this.shield) this.useShield(false, b.y < p.c ? 1 : -1); else return this.die('pillar');
        }
      }
      if (!p.passed && b.x > p.x + w) {
        p.passed = true;
        this.addScore(p);
      }
    }
    for (const s of this.saws) {
      if (this.invT <= 0 && Math.hypot(b.x - s.x, b.y - s.y) < R + s.r - 3) {
        if (this.shield) this.useShield(false, b.y < s.y ? -1 : 1); else return this.die('saw');
      }
    }
  }

  addScore(p) {
    this.score++;
    const perfect = p.maxOff < p.gap * 0.15 && this.invT <= 0;
    if (perfect) {
      this.combo++; this.perfects++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      const bonus = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
      this.coins += bonus;
      this.text(`${this.on.t?.('perfect') || 'PERFECT'}${this.combo > 1 ? ' ×' + this.combo : ''}`, this.bird.x, this.bird.y - 34, '#fff36b', 20);
      this.on.sfx?.('perfect', this.combo);
      for (let i = 0; i < 10; i++) this.part(this.bird.x, this.bird.y, this.vr(-160, 160), this.vr(-160, 160), 0.5, '#fff36b', 2.5);
    } else { this.combo = 0; this.on.sfx?.('score'); }
    const nb = Math.floor(this.score / BIOME_EVERY) % BIOMES.length;
    if (nb !== this.biome) {
      this.biomeFrom = this.biome; this.biome = nb; this.biomeK = 0;
      this.on.biome?.(BIOMES[nb].id);
      this.on.sfx?.('biome');
    }
    this.on.score?.(this.score, perfect, this.combo);
  }

  useShield(ground, dir = 1) {
    this.shield = false; this.invT = 1.3; this.flash = 0.5; this.shake = 8;
    this.bird.vy = ground ? T.flapV * 1.15 : (dir > 0 ? 260 : -420);
    this.on.sfx?.('shield'); this.on.haptic?.('medium'); this.on.power?.();
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; this.part(this.bird.x, this.bird.y, Math.cos(a) * 260, Math.sin(a) * 260, 0.5, '#7ee7ff', 3); }
  }

  die(cause) {
    if (this.state !== 'play') return;
    this.state = 'dying'; this.deathT = 0; this.cause = cause;
    this.shake = 16; this.flash = 1; this.combo = 0;
    this.bird.vy = cause === 'ground' ? 0 : -260;
    this.on.sfx?.('hit'); if (cause !== 'ground') this.on.sfx?.('fall');
    this.on.haptic?.('heavy');
    const col = this.skin?.body || '#ffcf3a';
    for (let i = 0; i < 26; i++) this.part(this.bird.x, this.bird.y, this.vr(-280, 280), this.vr(-320, 120), this.vr(0.5, 1), i % 3 ? col : '#ffffff', this.vr(2, 4.5), true);
  }

  updateItems(sp, dt) {
    const b = this.bird;
    for (const it of this.items) {
      it.t += dt;
      if (it.p) { it.x = it.p.x + it.dx; it.y = it.p.c + it.dy; } else it.x -= sp * dt;
      if (it.kind === 'coin' && this.magnetT > 0) {
        const dx = b.x - it.x, dy = b.y - it.y, d = Math.hypot(dx, dy);
        if (d < 170) { it.p = null; it.x += dx / d * 620 * dt; it.y += dy / d * 620 * dt; }
      }
      if (!it.dead && Math.hypot(b.x - it.x, b.y - it.y) < it.r + T.birdR + 4) {
        it.dead = true;
        if (it.kind === 'coin') {
          this.coins++; this.on.sfx?.('coin'); this.on.coin?.(this.coins);
          for (let i = 0; i < 6; i++) this.part(it.x, it.y, this.vr(-120, 120), this.vr(-120, 120), 0.35, '#ffd23f', 2);
        } else {
          this.powerups++;
          if (it.kind === 'shield') this.shield = true;
          if (it.kind === 'magnet') this.magnetT = 7;
          if (it.kind === 'slow') this.slowT = 4;
          this.text(this.on.t?.(it.kind) || it.kind, b.x, b.y - 36, '#7ee7ff', 18);
          this.on.sfx?.('power'); this.on.haptic?.('medium'); this.on.power?.(it.kind);
          for (let i = 0; i < 16; i++) this.part(it.x, it.y, this.vr(-200, 200), this.vr(-200, 200), 0.5, '#7ee7ff', 3);
        }
      }
    }
    this.items = this.items.filter(it => !it.dead && it.x > this.viewL - 30);
  }

  updateFx(dt, sp) {
    const b = this.bird;
    if (this.state !== 'dead') {
      this.trail.push({ x: b.x, y: b.y, life: 1 });
      if (this.trail.length > 18) this.trail.shift();
    }
    for (const q of this.trail) { q.x -= (sp || 60) * dt; q.life -= dt * 2.4; }
    for (const p of this.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt / p.max;
      if (p.grav) p.vy += 900 * dt; else { p.vx *= 0.95; p.vy *= 0.95; }
      p.x -= sp * dt * 0.3;
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const x of this.texts) { x.y -= 40 * dt; x.life -= dt / 0.9; }
    this.texts = this.texts.filter(x => x.life > 0);
    const bid = BIOMES[this.biome].id;
    for (const a of this.amb) {
      if (bid === 'ice') { a.x -= (sp * 0.5 + 20) * dt; a.y += (30 + a.s * 40) * dt; }
      else if (bid === 'lava') { a.x -= sp * 0.4 * dt; a.y -= (40 + a.s * 60) * dt; }
      else { a.x -= (sp * 0.1 + 8 * a.s) * dt; }
      const span = this.viewR - this.viewL + 40;
      if (a.x < this.viewL - 20) a.x += span;
      if (a.y > this.viewB) a.y = this.viewT; if (a.y < this.viewT) a.y = this.floorY;
    }
  }

  part(x, y, vx, vy, max, color, size, grav = false) {
    if (!this.hq && this.parts.length > 60) return;
    this.parts.push({ x, y, vx, vy, max, life: 1, color, size, grav });
  }
  text(s, x, y, color, size) { this.texts.push({ s, x, y, color, size, life: 1 }); }

  // ---------- Çizim ----------
  render() {
    const c = this.ctx, d = this.dpr;
    const k = this.biomeK, B = BIOMES[this.biome], A = BIOMES[this.biomeFrom];
    c.setTransform(d, 0, 0, d, 0, 0);
    // Gökyüzü tüm ekranı kaplar
    const g = c.createLinearGradient(0, 0, 0, this.ch);
    g.addColorStop(0, mix(A.sky[0], B.sky[0], k)); g.addColorStop(1, mix(A.sky[1], B.sky[1], k));
    c.fillStyle = g; c.fillRect(0, 0, this.cw, this.ch);

    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    c.setTransform(d * this.scale, 0, 0, d * this.scale, d * (this.offX + sx), d * (this.offY + sy));

    if (k < 1) { c.globalAlpha = 1 - k; this.drawBack(A); }
    c.globalAlpha = k; this.drawBack(B); c.globalAlpha = 1;

    const pal = {
      p0: mix(A.pil[0], B.pil[0], k), p1: mix(A.pil[1], B.pil[1], k), edge: mix(A.edge, B.edge, k),
      g0: mix(A.ground[0], B.ground[0], k), g1: mix(A.ground[1], B.ground[1], k),
    };
    for (const p of this.pillars) this.drawPillar(c, p, pal);
    for (const s of this.saws) drawSaw(c, s);
    for (const it of this.items) this.drawItem(c, it);
    this.drawGround(c, pal);
    this.drawTrail(c);
    // Parçacıklar
    for (const p of this.parts) { c.globalAlpha = Math.max(0, p.life); c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    const b = this.bird;
    const blink = this.invT > 0 && this.state === 'play' && Math.floor(this.invT * 12) % 2 === 0;
    if (!blink) drawBird(c, this.skin, b.x, b.y, b.rot, b.wing, 1, this.clock);
    if (this.shield) {
      c.strokeStyle = 'rgba(126,231,255,0.85)'; c.lineWidth = 2.5; c.fillStyle = 'rgba(126,231,255,0.15)';
      c.beginPath(); c.arc(b.x, b.y, 25 + Math.sin(this.clock * 6) * 1.5, 0, TAU); c.fill(); c.stroke();
    }
    if (this.magnetT > 0) { c.strokeStyle = `rgba(255,90,120,${0.25 + 0.15 * Math.sin(this.clock * 10)})`; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, 40 + (this.clock * 60) % 30, 0, TAU); c.stroke(); }
    // Yazılar
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const x of this.texts) {
      c.globalAlpha = Math.min(1, x.life * 1.6);
      c.font = `900 ${x.size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.strokeText(x.s, x.x, x.y); c.fillStyle = x.color; c.fillText(x.s, x.x, x.y);
    }
    c.globalAlpha = 1;
    // Yavaş zaman filtresi + flaş
    c.setTransform(d, 0, 0, d, 0, 0);
    if (this.slowT > 0) { c.fillStyle = 'rgba(122,77,255,0.12)'; c.fillRect(0, 0, this.cw, this.ch); }
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash * 0.7})`; c.fillRect(0, 0, this.cw, this.ch); }
  }

  drawBack(B) {
    const c = this.ctx, L = this.viewL, R = this.viewR;
    // Yıldızlar
    if (B.id === 'neon' || B.id === 'space' || B.id === 'dusk') {
      c.fillStyle = '#ffffff';
      for (const s of this.stars) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.clock * 1.5 + s.p));
        c.globalAlpha *= 1; const a0 = c.globalAlpha; c.globalAlpha = a0 * tw * (B.id === 'dusk' ? 0.35 : 0.9);
        c.fillRect(L + s.x * (R - L), this.viewT + s.y * (this.floorY - this.viewT), s.r, s.r);
        c.globalAlpha = a0;
      }
    }
    // Güneş / ay / gezegen
    const a0 = c.globalAlpha;
    const sunX = this.W * 0.72, sunY = this.H * (B.id === 'dusk' ? 0.5 : 0.22), sr = B.id === 'space' ? 70 : 46;
    if (this.hq) {
      const gl = c.createRadialGradient(sunX, sunY, sr * 0.5, sunX, sunY, sr * 2.4);
      gl.addColorStop(0, rgba(B.sun, 0.35)); gl.addColorStop(1, rgba(B.sun, 0));
      c.fillStyle = gl; c.fillRect(sunX - sr * 2.4, sunY - sr * 2.4, sr * 4.8, sr * 4.8);
    }
    c.fillStyle = B.sun; c.globalAlpha = a0 * (B.id === 'space' ? 0.5 : 0.9);
    c.beginPath(); c.arc(sunX, sunY, sr, 0, TAU); c.fill();
    if (B.id === 'space') { c.strokeStyle = rgba(B.sun, 0.6); c.lineWidth = 4; c.beginPath(); c.ellipse(sunX, sunY, sr * 1.7, sr * 0.35, -0.3, 0, TAU); c.stroke(); }
    if (B.id === 'neon') { c.fillStyle = B.sky[0]; for (let i = 0; i < 5; i++) c.fillRect(sunX - sr, sunY + i * 9 + 4, sr * 2, 3 + i * 0.6); }
    c.globalAlpha = a0;
    // Silüetler
    const layers = LAYERS[B.id];
    layers.forEach(([kind, par, hgt], li) => {
      const color = li === layers.length - 1 ? B.near : B.far;
      this.drawProfile(kind, color, par, hgt, B);
    });
    // Ortam parçacıkları
    if (B.id === 'ice' || B.id === 'lava' || B.id === 'space' || B.id === 'neon') {
      c.fillStyle = B.id === 'lava' ? '#ff8a2a' : B.id === 'neon' ? '#ff3cac' : '#ffffff';
      for (const a of this.amb) {
        c.globalAlpha = a0 * (0.3 + a.s * 0.5);
        const sz = B.id === 'ice' ? 1.5 + a.s * 2 : 1 + a.s * 1.5;
        c.fillRect(a.x, a.y, sz, B.id === 'neon' ? sz * 4 : sz);
      }
      c.globalAlpha = a0;
    }
  }

  drawProfile(kind, color, par, hgt, B) {
    const c = this.ctx, L = this.viewL - 10, R = this.viewR + 10, base = this.floorY + 4;
    const off = this.scroll * par;
    c.fillStyle = color;
    if (kind === 'city') {
      const P = 480, list = this.prof.city;
      const start = Math.floor((L + off) / P) - 1;
      for (let rep = start; rep * P - off < R; rep++) {
        for (const bd of list) {
          const x = rep * P + bd.x - off; if (x > R || x + bd.w < L) continue;
          const h = bd.h * hgt;
          c.fillStyle = color; c.fillRect(x, base - h, bd.w, h);
          if (bd.win && par > 0.3 && this.hq) {
            c.fillStyle = rgba(B.pil[0], 0.35);
            for (let wy = base - h + 8; wy < base - 10; wy += 12) for (let wx = x + 4; wx < x + bd.w - 4; wx += 8) if (((wx * 7 + wy * 3) | 0) % 5) c.fillRect(wx, wy, 3, 5);
          }
        }
      }
      return;
    }
    const arr = this.prof[kind], n = arr.length, P = 480, stepW = P / n, smooth = kind !== 'peaks';
    c.beginPath(); c.moveTo(L, base);
    for (let x = L - (L + off) % stepW - stepW; x <= R + stepW; x += stepW / (smooth ? 2 : 1)) {
      const u = ((x + off) / stepW) % n, i0 = Math.floor((u + n) % n), i1 = (i0 + 1) % n, f = u - Math.floor(u);
      const ff = smooth ? (1 - Math.cos(f * Math.PI)) / 2 : f;
      c.lineTo(x, base - lerp(arr[i0], arr[i1], ff) * hgt);
    }
    c.lineTo(R, base); c.closePath(); c.fill();
  }

  drawPillar(c, p, pal) {
    const w = T.pillarW, top = p.c - p.gap / 2, bot = p.c + p.gap / 2, x = p.x;
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, pal.p1); g.addColorStop(0.35, pal.p0); g.addColorStop(1, pal.p1);
    const draw = (y0, y1, capY, dir) => {
      if (this.hq) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x - 5, y0, w + 10, y1 - y0); }
      c.fillStyle = g; c.fillRect(x, y0, w, y1 - y0);
      c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(x + 8, y0, 5, y1 - y0);
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + w - 10, y0, 10, y1 - y0);
      // kristal kesikleri
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1.5; c.beginPath();
      for (let yy = capY - dir * 40; dir > 0 ? yy > y0 : yy < y1; yy -= dir * 46) { c.moveTo(x, yy); c.lineTo(x + w, yy - dir * 18); }
      c.stroke();
      // başlık
      const ch = 20, cy = dir > 0 ? capY - ch : capY;
      let capC = pal.edge;
      if (p.type === 'breathing') capC = `rgba(255,${120 + 100 * Math.abs(Math.sin(this.t * 3))},120,1)`;
      if (p.type === 'shifter' && p.warn > 0 && p.shiftK < 1) capC = Math.floor(p.warn * 14) % 2 ? '#ff3b5c' : '#ffffff';
      c.fillStyle = g; roundRect(c, x - 6, cy, w + 12, ch, 6); c.fill();
      c.fillStyle = capC; c.globalAlpha *= 0.9; roundRect(c, x - 6, dir > 0 ? cy + ch - 5 : cy, w + 12, 5, 3); c.fill(); c.globalAlpha = 1;
    };
    draw(this.viewT - 4, top, top, 1);
    draw(bot, this.floorY + 2, bot, -1);
    // Tür ipuçları: hareketli = oklar, kaydırıcı = uyarı
    if (p.type === 'moving') {
      c.fillStyle = 'rgba(255,255,255,0.55)';
      tri(c, x + w / 2, top - 30, 7, -1); tri(c, x + w / 2, bot + 30, 7, 1);
    }
    if (p.type === 'shifter' && p.shiftK < 1) {
      const dir = Math.sign(p.to - p.c0);
      c.fillStyle = p.warn > 0 ? '#ff3b5c' : 'rgba(255,255,255,0.5)';
      c.font = '900 22px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('!', x + w / 2, dir > 0 ? top - 32 : bot + 32);
    }
  }

  drawItem(c, it) {
    if (it.kind === 'coin') {
      const s = Math.abs(Math.cos(it.t * 3.5));
      c.save(); c.translate(it.x, it.y); c.scale(Math.max(0.15, s), 1);
      c.fillStyle = '#b8860b'; c.beginPath(); c.arc(0, 1.5, it.r, 0, TAU); c.fill();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, 0, it.r, 0, TAU); c.fill();
      c.strokeStyle = '#fff2a8'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, it.r - 3.5, 0, TAU); c.stroke();
      c.fillStyle = '#e6a800'; c.fillRect(-1.8, -5, 3.6, 10);
      c.restore();
      return;
    }
    const bob = Math.sin(it.t * 4) * 3;
    c.save(); c.translate(it.x, it.y + bob);
    const col = { shield: '#7ee7ff', magnet: '#ff5a78', slow: '#b38cff' }[it.kind];
    c.fillStyle = rgba(col, 0.25); c.beginPath(); c.arc(0, 0, it.r + 5 + Math.sin(it.t * 6) * 2, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.arc(0, 0, it.r, 0, TAU); c.fill();
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3;
    if (it.kind === 'shield') { c.beginPath(); c.moveTo(0, -9); c.lineTo(8, -5); c.lineTo(6, 5); c.lineTo(0, 10); c.lineTo(-6, 5); c.lineTo(-8, -5); c.closePath(); c.fill(); }
    if (it.kind === 'magnet') { c.lineWidth = 4.5; c.beginPath(); c.arc(0, -1, 6, Math.PI, 0, true); c.stroke(); c.fillStyle = '#5a6b80'; c.fillRect(-8.3, -2, 4.6, 5); c.fillRect(3.7, -2, 4.6, 5); }
    if (it.kind === 'slow') { c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -5.5); c.moveTo(0, 0); c.lineTo(4, 2); c.stroke(); }
    c.restore();
  }

  drawGround(c, pal) {
    const y = this.floorY, L = this.viewL, R = this.viewR;
    const g = c.createLinearGradient(0, y, 0, this.viewB);
    g.addColorStop(0, pal.g0); g.addColorStop(1, pal.g1);
    c.fillStyle = g; c.fillRect(L, y, R - L, this.viewB - y);
    c.fillStyle = pal.edge; c.globalAlpha = 0.85; c.fillRect(L, y, R - L, 4); c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,0.10)';
    const off = this.scroll % 36;
    for (let x = L - off - 36; x < R + 36; x += 36) { c.beginPath(); c.moveTo(x, y + 10); c.lineTo(x + 18, y + 10); c.lineTo(x + 8, y + 24); c.lineTo(x - 10, y + 24); c.fill(); }
  }

  drawTrail(c) {
    const s = this.skin; if (!s || this.state === 'dead') return;
    const n = this.trail.length;
    for (let i = 0; i < n - 2; i++) {
      const q = this.trail[i]; if (q.life <= 0) continue;
      const k = i / n;
      c.globalAlpha = q.life * k * 0.8;
      if (s.trail === 'rainbow') c.fillStyle = `hsl(${(this.clock * 200 + i * 20) % 360},90%,65%)`;
      else c.fillStyle = s.tc;
      const r = s.trail === 'flame' ? 3 + k * 7 : s.trail === 'ghost' ? 4 + k * 8 : 1.5 + k * 4;
      if (s.trail === 'sparkle' && i % 2) { star(c, q.x - 10, q.y + Math.sin(i) * 4, r * 1.2); continue; }
      if (s.trail === 'hearts' && i % 3 === 0) { heart(c, q.x - 10, q.y, r * 1.1); continue; }
      if (s.trail === 'snow' && i % 2) { c.fillRect(q.x - 10 - r / 2, q.y - r / 2 + Math.sin(i * 2) * 5, r, r); continue; }
      if (s.trail === 'flame') c.fillStyle = i > n * 0.6 ? '#fff1a8' : s.tc;
      c.beginPath(); c.arc(q.x - 10, q.y, r, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }
}

function circleRect(cx, cy, r, x, y, w, h) {
  const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function tri(c, x, y, s, dir) { c.beginPath(); c.moveTo(x, y + dir * s); c.lineTo(x - s, y - dir * s * 0.4); c.lineTo(x + s, y - dir * s * 0.4); c.closePath(); c.fill(); }
function star(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
function heart(c, x, y, r) { c.beginPath(); c.moveTo(x, y + r * 0.9); c.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4); c.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); c.fill(); }

function drawSaw(c, s) {
  c.save(); c.translate(s.x, s.y); c.rotate(s.a);
  c.fillStyle = '#c9d1dc';
  c.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? s.r - 5 : s.r + 3; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath(); c.fill();
  c.fillStyle = '#6f7d93'; c.beginPath(); c.arc(0, 0, s.r - 7, 0, TAU); c.fill();
  c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(0, 0, 4.5, 0, TAU); c.fill();
  c.restore();
}

// Karakter çizimi — oyunda, menüde, kostüm önizlemelerinde ve paylaşım kartında kullanılır.
export function drawBird(c, s, x, y, rot = 0, wing = 0, scale = 1, clock = 0) {
  if (!s) return;
  const R = 17;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(scale, scale);
  if (s.alpha) c.globalAlpha *= s.alpha;
  // gövde
  const g = c.createRadialGradient(-5, -7, 3, 0, 0, R + 2);
  g.addColorStop(0, s.body); g.addColorStop(1, s.shade);
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, R + 1, R, 0, 0, TAU); c.fill();
  if (s.galaxy) { c.fillStyle = '#ffffff'; for (let i = 0; i < 7; i++) { const a = i * 2.4 + clock * 0.6; c.globalAlpha = 0.5 + 0.5 * Math.sin(clock * 3 + i); c.fillRect(Math.cos(a) * (i + 5), Math.sin(a * 1.3) * (i + 3), 1.6, 1.6); } c.globalAlpha = s.alpha || 1; }
  c.fillStyle = s.belly; c.beginPath(); c.ellipse(3, 7, 11, 7.5, -0.15, 0, TAU); c.fill();
  // kuyruk tüyü
  c.fillStyle = s.wing; c.beginPath(); c.moveTo(-R + 2, -2); c.lineTo(-R - 7, -7); c.lineTo(-R - 5, 1); c.lineTo(-R - 8, 5); c.lineTo(-R + 2, 4); c.fill();
  // aksesuar (arkada kalanlar)
  if (s.acc === 'halo') { c.strokeStyle = '#ffe27a'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, -R - 6 + Math.sin(clock * 3) * 1.5, 10, 3.5, 0, 0, TAU); c.stroke(); }
  // göz
  const ex = 7, ey = -5;
  switch (s.eye) {
    case 'visor': c.fillStyle = '#1b2333'; roundRect(c, 0, -10, 17, 9, 4); c.fill(); c.fillStyle = '#7ee7ff'; c.fillRect(4 + Math.sin(clock * 4) * 3, -7, 6, 3); break;
    case 'shades': c.fillStyle = '#111'; roundRect(c, 1, -10, 16, 8, 3); c.fill(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(4, -9, 4, 2); break;
    case 'hollow': c.fillStyle = '#2a2550'; c.beginPath(); c.ellipse(ex, ey, 3.8, 5, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(ex - 9, ey, 3, 4.2, 0, 0, TAU); c.fill(); break;
    default: {
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, 6.3, 0, TAU); c.fill();
      if (s.eye === 'star') { c.fillStyle = '#ffd23f'; star(c, ex + 1.5, ey, 4); }
      else { c.fillStyle = '#1b1035'; c.beginPath(); c.arc(ex + 2, ey, 3.2, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.fillRect(ex + 2.5, ey - 2.2, 1.6, 1.6); }
      if (s.eye === 'narrow') { c.fillStyle = s.shade; c.beginPath(); c.arc(ex, ey, 6.6, Math.PI * 1.05, Math.PI * 1.95); c.fill(); }
      if (s.eye === 'angry') { c.strokeStyle = '#1b1035'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(ex - 6, ey - 8); c.lineTo(ex + 6, ey - 4); c.stroke(); }
      if (s.eye === 'lash') { c.strokeStyle = '#1b1035'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex + 3, ey - 6); c.lineTo(ex + 6, ey - 9); c.moveTo(ex, ey - 6.5); c.lineTo(ex + 1, ey - 10); c.stroke(); }
    }
  }
  // yanak
  c.fillStyle = 'rgba(255,110,150,0.45)'; c.beginPath(); c.ellipse(4, 3, 3.5, 2.2, 0, 0, TAU); c.fill();
  // gaga
  c.fillStyle = s.id === 'robo' ? '#8b98ad' : '#ff8a1c';
  c.beginPath(); c.moveTo(R - 2, -2); c.lineTo(R + 8, 1.5); c.lineTo(R - 2, 5); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.moveTo(R - 2, 1.5); c.lineTo(R + 8, 1.5); c.lineTo(R - 2, 5); c.fill();
  // kanat
  const wa = -0.9 * wing + Math.sin(clock * 18) * 0.12 * wing - 0.1;
  c.save(); c.translate(-4, 3); c.rotate(wa);
  c.fillStyle = s.wing; c.beginPath(); c.ellipse(-3, 0, 10, 6, -0.3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-2, -2, 6, 2.5, -0.3, 0, TAU); c.fill();
  c.restore();
  // aksesuar (önde)
  switch (s.acc) {
    case 'crown': c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-9, -R + 3); c.lineTo(-10, -R - 8); c.lineTo(-5, -R - 3); c.lineTo(0, -R - 11); c.lineTo(5, -R - 3); c.lineTo(10, -R - 8); c.lineTo(9, -R + 3); c.closePath(); c.fill(); c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(0, -R - 2, 2, 0, TAU); c.fill(); break;
    case 'cap': c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(0, -R + 6, 13, Math.PI, 0); c.fill(); c.fillRect(4, -R + 3, 16, 4); break;
    case 'horns': c.fillStyle = s.id === 'dragon' ? '#fff1a8' : '#2b0a06'; c.beginPath(); c.moveTo(-8, -R + 4); c.lineTo(-12, -R - 9); c.lineTo(-2, -R + 2); c.fill(); c.beginPath(); c.moveTo(2, -R + 3); c.lineTo(5, -R - 10); c.lineTo(9, -R + 5); c.fill(); break;
    case 'antenna': c.strokeStyle = '#6f7d93'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -R + 1); c.lineTo(-2, -R - 9); c.stroke(); c.fillStyle = Math.sin(clock * 6) > 0 ? '#ff3b5c' : '#7ee7ff'; c.beginPath(); c.arc(-2, -R - 10, 3, 0, TAU); c.fill(); break;
    case 'bow': c.fillStyle = '#ff2d7a'; c.beginPath(); c.moveTo(-2, -R + 1); c.lineTo(-11, -R - 6); c.lineTo(-10, -R + 5); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-2, -R + 1); c.lineTo(7, -R - 6); c.lineTo(6, -R + 5); c.closePath(); c.fill(); c.beginPath(); c.arc(-2, -R + 1, 2.8, 0, TAU); c.fill(); break;
    case 'band': c.fillStyle = '#ff3b5c'; c.fillRect(-R + 1, -12, 2 * R - 3, 4.5); c.beginPath(); c.moveTo(-R + 2, -11); c.lineTo(-R - 9, -15 + Math.sin(clock * 10) * 3); c.lineTo(-R - 8, -8 + Math.sin(clock * 10 + 1) * 3); c.fill(); break;
    case 'leaf': c.fillStyle = '#25c99a'; c.beginPath(); c.ellipse(2, -R - 3, 4, 8, 0.6, 0, TAU); c.fill(); c.strokeStyle = '#1b7a5c'; c.lineWidth = 1; c.beginPath(); c.moveTo(-2, -R + 2); c.lineTo(5, -R - 8); c.stroke(); break;
    case 'crystal': c.fillStyle = '#e6fbff'; [[-6, 8], [0, 12], [6, 8]].forEach(([dx, h]) => { c.beginPath(); c.moveTo(dx - 3, -R + 3); c.lineTo(dx, -R - h); c.lineTo(dx + 3, -R + 3); c.fill(); }); break;
    case 'flame': { const f = Math.sin(clock * 14) * 2; c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-8, -R + 4); c.quadraticCurveTo(-6, -R - 10 + f, 0, -R - 14 - f); c.quadraticCurveTo(3, -R - 6, 8, -R - 9 + f); c.quadraticCurveTo(8, -R, 6, -R + 4); c.fill(); c.fillStyle = '#ff5a1f'; c.beginPath(); c.moveTo(-4, -R + 4); c.quadraticCurveTo(-2, -R - 6, 1, -R - 8 - f); c.quadraticCurveTo(4, -R - 2, 4, -R + 4); c.fill(); break; }
  }
  c.restore();
}
