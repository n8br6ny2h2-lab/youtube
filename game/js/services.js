// Platform servisleri: Uygulama içi satın alma (IAP), ödüllü reklam, ses, titreşim, paylaşım.
//
// IAP: Telefonda (Capacitor/Cordova) "cordova-plugin-purchase" (CdvPurchase v13) ile
// Google Play Billing / App Store StoreKit kullanılır. Tarayıcıda gerçek ödeme ALINMAZ;
// "Test Mağazası" modunda satın alma onaylanınca ürün verilir (geliştirme/demo için).
import { PRODUCTS } from './data.js';

export const CONFIG = {
  // Sunucu tarafı makbuz doğrulama (server/validate.js). Boşsa istemci tarafında onaylanır.
  validatorUrl: '',
  admob: {
    android: 'ca-app-pub-3940256099942544/5224354917', // Google'ın TEST kimliği — yayından önce kendi kimliğinizle değiştirin
    ios: 'ca-app-pub-3940256099942544/1712485313',
  },
};

const isNative = () => !!(window.Capacitor?.isNativePlatform?.() || window.cordova);

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
    if (isNative() && window.CdvPurchase) {
      try { await this.initNative(); this.native = true; } catch (e) { console.warn('IAP başlatılamadı', e); }
    }
    this.ready = true;
  }

  async initNative() {
    const { store, ProductType, Platform } = window.CdvPurchase;
    const platform = window.Capacitor?.getPlatform?.() === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
    store.register(PRODUCTS.map(p => ({
      id: p.id, platform,
      type: p.type === 'consumable' ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE,
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
  constructor() { this.native = null; this.onSimulate = null; }
  async init() {
    const AdMob = window.Capacitor?.Plugins?.AdMob;
    if (isNative() && AdMob) {
      try { await AdMob.initialize({ initializeForTesting: true }); this.native = AdMob; } catch (e) { console.warn(e); }
    }
  }
  // true = ödül kazanıldı
  async rewarded(vip) {
    if (vip) return true;
    if (this.native) {
      try {
        const adId = window.Capacitor.getPlatform() === 'ios' ? CONFIG.admob.ios : CONFIG.admob.android;
        await this.native.prepareRewardVideoAd({ adId });
        const r = await this.native.showRewardVideoAd();
        return !!r;
      } catch (e) { return false; }
    }
    return this.onSimulate ? this.onSimulate() : true;
  }
}

// ---------------- Ses (sentezlenmiş, dosya gerektirmez) ----------------
export class Sfx {
  constructor() { this.ctx = null; this.on = true; this.last = {}; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination); } catch (e) { this.ctx = null; }
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
