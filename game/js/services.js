// Platform servisleri: Uygulama içi satın alma (IAP), ödüllü reklam, ses, titreşim, paylaşım.
//
// IAP: Telefonda (Capacitor/Cordova) "cordova-plugin-purchase" (CdvPurchase v13) ile
// Google Play Billing / App Store StoreKit kullanılır. Tarayıcıda gerçek ödeme ALINMAZ;
// "Test Mağazası" modunda satın alma onaylanınca ürün verilir (geliştirme/demo için).
import { PRODUCTS } from './data.js';
import { FEATURES } from './features.js';
export { FEATURES };

export const CONFIG = {
  // Sunucu tarafı makbuz doğrulama (server/validate.mjs). Boşsa istemci tarafında onaylanır.
  validatorUrl: '',
  // Bulut kaydı sunucusu (server/cloud.mjs), ör. https://api.ornek.com — boşsa bulut kaydı kapalı
  cloudUrl: '',
  // Apple ile Giriş (Services ID) ve Google ile Giriş (Web istemci kimliği)
  appleServiceId: 'com.efsunavcisi.game.signin',
  googleWebClientId: '',
  supportEmail: 'k.k.kavcioglu01@icloud.com',
  // Game Center / Google Play Games sıralama kimlikleri (konsollarda oluşturulan değerler)
  leaderboards: {
    chapter: { ios: 'efsun.maxchapter', android: '' },
    kills:   { ios: 'efsun.totalkills', android: '' },
    power:   { ios: 'efsun.power',      android: '' },
  },
  admob: {
    android: 'ca-app-pub-3940256099942544/5224354917', // Google'ın TEST kimliği — yayından önce kendi kimliğinizle değiştirin
    ios: 'ca-app-pub-3940256099942544/1712485313',
  },
  // Aylık Kart ve Sezon Bileti: Apple'da "Non-Renewing Subscription", Google Play'de tüketilebilir ürün
  timedProducts: ['monthly_card', 'battle_pass'],
};

export const isNative = () => !!(window.Capacitor?.isNativePlatform?.() || window.cordova);

// ---------------- IAP ----------------
export class Store {
  constructor() {
    this.native = false;
    this.ready = false;
    this.prices = {};
    this.onGrant = null;     // (productId, txId) => void
    this.onConfirm = null;   // test modunda onay penceresi: (product) => Promise<boolean>
    this.onError = null;
  }

  async init() {
    // Telefonda ASLA test mağazasına düşülmez: eklenti yoksa ya da açılamazsa satın alma kapalı kalır.
    this.device = isNative();
    if (this.device) {
      if (!window.CdvPurchase) { this.failed = 'Mağaza eklentisi bulunamadı'; }
      else { try { await this.initNative(); this.native = true; } catch (e) { this.failed = 'Mağazaya bağlanılamadı'; console.warn('IAP başlatılamadı', e); } }
    }
    this.ready = true;
  }

  async initNative() {
    const { store, ProductType, Platform } = window.CdvPurchase;
    const platform = window.Capacitor?.getPlatform?.() === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
    store.register(PRODUCTS.map(p => ({
      id: p.id, platform,
      type: CONFIG.timedProducts.includes(p.id) && platform === Platform.APPLE_APPSTORE ? ProductType.NON_RENEWING_SUBSCRIPTION
        : p.type === 'consumable' ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE,
    })));
    if (CONFIG.validatorUrl) store.validator = CONFIG.validatorUrl;
    store.when()
      .productUpdated(p => { const o = p.pricing; if (o?.price) this.prices[p.id] = o.price; })
      .approved(tx => (CONFIG.validatorUrl ? tx.verify() : tx.finish()))
      .verified(receipt => receipt.finish())
      .finished(tx => { for (const p of tx.products) this.onGrant?.(p.id, tx.transactionId); });
    store.error(err => this.onError?.(err.message || 'Ödeme hatası'));
    await store.initialize([platform]);
    await store.update();
  }

  price(id) {
    return this.prices[id] || PRODUCTS.find(p => p.id === id)?.price || '';
  }

  async buy(id) {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return false;
    if (this.device && !this.native) { this.onError?.((this.failed || 'Mağaza kullanılamıyor') + '. İnternet bağlantını kontrol edip tekrar dene.'); return false; }
    if (this.native) {
      const { store } = window.CdvPurchase;
      const offer = store.get(id)?.getOffer();
      if (!offer) { this.onError?.('Ürün mağazada bulunamadı'); return false; }
      const err = await offer.order();
      if (err) { if (err.code !== window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) this.onError?.(err.message); return false; }
      return true; // ödül "finished" olayında verilir
    }
    const ok = await this.onConfirm?.(product);
    if (ok) this.onGrant?.(id, 'test-' + Date.now());
    return ok;
  }

  async restore() {
    if (this.native) { await window.CdvPurchase.store.restorePurchases(); return true; }
    return false;
  }
}

// ---------------- Ödüllü reklam ----------------
export class Ads {
  constructor() { this.native = null; this.onSimulate = null; this.canRequest = true; this.privacyRequired = false; }
  // Google'ın önerdiği sıra: (1) UMP onay formu (AB/İngiltere vb.)  (2) iOS ATT izni  (3) AdMob başlatma
  get enabled() { return FEATURES.ads; }
  async init() {
    if (!FEATURES.ads) return; // reklamlar kapalı: onay formu, izleme izni ve SDK başlatma yok
    const AdMob = window.Capacitor?.Plugins?.AdMob;
    if (!isNative() || !AdMob) return;
    try {
      let info = await AdMob.requestConsentInfo().catch(() => null);
      if (info?.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm().catch(() => info);
      this.canRequest = info ? info.canRequestAds !== false : true;
      this.privacyRequired = info?.privacyOptionsRequirementStatus === 'REQUIRED';
      if (window.Capacitor.getPlatform() === 'ios') {
        const st = await AdMob.trackingAuthorizationStatus().catch(() => null);
        if (st?.status === 'notDetermined') await AdMob.requestTrackingAuthorization().catch(() => {});
      }
      const testing = [CONFIG.admob.android, CONFIG.admob.ios].some(id => id.startsWith('ca-app-pub-3940256099942544'));
      await AdMob.initialize({ initializeForTesting: testing, maxAdContentRating: 'ParentalGuidance' });
      this.native = AdMob;
    } catch (e) { console.warn('Reklam başlatılamadı', e); }
  }
  // Ayarlar > Reklam gizlilik seçenekleri (onay toplanan bölgelerde zorunlu)
  async privacyOptions() {
    const AdMob = window.Capacitor?.Plugins?.AdMob;
    if (!AdMob) return false;
    await AdMob.showPrivacyOptionsForm();
    const info = await AdMob.requestConsentInfo().catch(() => null);
    if (info) this.canRequest = info.canRequestAds !== false;
    return true;
  }
  // true = ödül kazanıldı
  async rewarded(vip) {
    if (vip || !FEATURES.ads) return true; // reklamsız sürümde ödül doğrudan verilir
    if (this.native) {
      if (!this.canRequest) return false;
      try {
        const adId = window.Capacitor.getPlatform() === 'ios' ? CONFIG.admob.ios : CONFIG.admob.android;
        await this.native.prepareRewardVideoAd({ adId });
        const r = await this.native.showRewardVideoAd();
        return !!r;
      } catch (e) { return false; }
    }
    if (isNative()) return false; // telefonda reklam yüklenemediyse ödül verilmez
    return this.onSimulate ? this.onSimulate() : true;
  }
}

// ---------------- Ses (sentezlenmiş, dosya gerektirmez) ----------------
export class Sfx {
  constructor() { this.ctx = null; this.on = true; this.last = {}; this.vol = 0.8; this.mvol = 0.5; this.mode = null; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.mus = this.ctx.createGain(); this.mus.connect(this.ctx.destination);
      this.setVolumes(this.vol, this.mvol);
      if (this.pending) { const m = this.pending; this.pending = null; this.music(m); }
    } catch (e) { this.ctx = null; }
  }
  setVolumes(sfx, music) {
    this.vol = sfx; this.mvol = music;
    if (this.master) this.master.gain.value = 0.45 * sfx;
    if (this.mus) this.mus.gain.value = 0.32 * music;
  }
  // ---- prosedürel müzik: menü / savaş / boss ----
  music(mode) {
    if (!this.ctx) { this.pending = mode; return; }
    if (this.mode === mode) return;
    this.mode = mode; this.step = 0; this.next = this.ctx.currentTime + 0.08;
    if (!mode) { clearInterval(this.timer); this.timer = null; return; }
    if (!this.timer) this.timer = setInterval(() => this.sched(), 40);
  }
  sched() {
    const c = this.ctx; if (!this.mode || !c || c.state !== 'running') return;
    const M = MUSIC[this.mode], spb = 60 / M.bpm / 4;
    while (this.next < c.currentTime + 0.2) { this.beat(this.step, this.next, M, spb); this.step++; this.next += spb; }
  }
  mt(midi, t, dur, type, vol) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.mus); o.start(t); o.stop(t + dur + 0.05);
  }
  drum(t, kind) {
    const c = this.ctx;
    if (kind === 'kick') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(this.mus); o.start(t); o.stop(t + 0.2); return; }
    const n = Math.floor(c.sampleRate * (kind === 'snare' ? 0.12 : 0.03)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = kind === 'snare' ? 1200 : 6000;
    src.buffer = b; g.gain.value = kind === 'snare' ? 0.22 : 0.07; src.connect(f); f.connect(g); g.connect(this.mus); src.start(t);
  }
  beat(step, t, M, spb) {
    const s = step % 16, ch = M.prog[Math.floor(step / 16) % M.prog.length];
    if (s === 0) for (const n of ch) this.mt(n, t, spb * 16, 'sine', 0.05);                 // pad
    if (s % 4 === 0 || (M.drive && s % 2 === 0)) this.mt(ch[0] - 12, t, spb * (M.drive ? 1.8 : 3.5), 'triangle', 0.2);  // bas
    if (s % 2 === 0) { const arp = [0, 1, 2, 1, 0, 2, 1, 2][(s / 2) % 8]; this.mt(ch[arp] + 12, t, spb * 1.6, M.lead, 0.05); }
    if (M.melody && s % 4 === 2 && Math.random() < 0.5) this.mt(ch[Math.floor(Math.random() * 3)] + 24, t, spb * 3, 'sine', 0.04);
    if (M.drums) {
      if (s % 4 === 0) this.drum(t, 'kick');
      if (s % 8 === 4) this.drum(t, 'snare');
      if (s % 2 === 1) this.drum(t, 'hat');
    }
  }
  tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.3, delay = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = buf; g.gain.value = vol; src.connect(g); g.connect(this.master); src.start(t);
  }
  play(name) {
    const now = performance.now();
    const gap = { shoot: 70, hit: 40, coin: 50, xp: 35 }[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'shoot': this.tone(880, 0.06, 'triangle', 0.08, -400); break;
      case 'slash': this.noise(0.08, 0.12); this.tone(300, 0.08, 'sawtooth', 0.06, -150); break;
      case 'hit': this.tone(180, 0.05, 'square', 0.07, -80); break;
      case 'kill': this.tone(520, 0.08, 'square', 0.08, 300); break;
      case 'xp': this.tone(1200, 0.05, 'sine', 0.06, 200); break;
      case 'coin': this.tone(1500, 0.06, 'square', 0.06); this.tone(2000, 0.08, 'square', 0.06, 0, 0.05); break;
      case 'hurt': this.tone(140, 0.2, 'sawtooth', 0.2, -80); this.noise(0.1, 0.15); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.15, 'square', 0.12, 0, i * 0.07)); break;
      case 'boss': this.tone(80, 0.9, 'sawtooth', 0.3, -30); this.noise(0.5, 0.2); break;
      case 'boom': this.noise(0.35, 0.3); this.tone(90, 0.3, 'sine', 0.3, -60); break;
      case 'zap': this.tone(1800, 0.12, 'sawtooth', 0.08, -1500); break;
      case 'win': [523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.18, 0, i * 0.12)); break;
      case 'lose': [400, 330, 260, 200].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.18, 0, i * 0.18)); break;
      case 'buy': [784, 1046, 1318].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, 0, i * 0.06)); break;
      case 'click': this.tone(660, 0.04, 'triangle', 0.08); break;
      case 'legend': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.16, 0, i * 0.08)); this.noise(0.6, 0.08, 0.4); break;
      case 'error': this.tone(200, 0.15, 'square', 0.12); this.tone(150, 0.2, 'square', 0.12, 0, 0.1); break;
    }
  }
}

const Am = [57, 60, 64], F = [53, 57, 60], C = [55, 60, 64], G = [55, 59, 62], Em = [52, 55, 59], Dm = [50, 53, 57], Bb = [53, 58, 62], A = [57, 61, 64];
const MUSIC = {
  menu:   { bpm: 84,  prog: [Am, F, C, G],  lead: 'triangle', melody: true },
  battle: { bpm: 126, prog: [Am, F, G, Em], lead: 'square',   drums: true },
  boss:   { bpm: 142, prog: [Dm, Bb, C, A], lead: 'sawtooth', drums: true, drive: true },
};

// Enerji dolunca yerel bildirim (Capacitor LocalNotifications varsa)
export async function scheduleEnergyNotification(enabled, seconds) {
  const LN = window.Capacitor?.Plugins?.LocalNotifications;
  if (!LN) return false;
  try {
    await LN.cancel({ notifications: [{ id: 1 }] }).catch(() => {});
    if (!enabled || seconds <= 0) return true;
    const perm = await LN.checkPermissions();
    if (perm.display !== 'granted') { const r = await LN.requestPermissions(); if (r.display !== 'granted') return false; }
    await LN.schedule({ notifications: [{ id: 1, title: 'Enerjin doldu! ⚡', body: 'Efsun Avcısı seni bekliyor. Bossları yenmeye hazır mısın?', schedule: { at: new Date(Date.now() + seconds * 1000) } }] });
    return true;
  } catch (e) { return false; }
}

export function haptic(on, ms = 15) {
  if (!on) return;
  try {
    const H = window.Capacitor?.Plugins?.Haptics;
    if (H) H.impact({ style: ms > 30 ? 'HEAVY' : 'LIGHT' }); else navigator.vibrate?.(ms);
  } catch (e) { /* yok say */ }
}

export async function share({ title, text, url, blob }) {
  try {
    if (blob && navigator.canShare?.({ files: [new File([blob], 'efsun.png', { type: 'image/png' })] })) {
      await navigator.share({ title, text, url, files: [new File([blob], 'efsun.png', { type: 'image/png' })] });
      return 'shared';
    }
    if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch (e) { return 'cancel'; }
}
