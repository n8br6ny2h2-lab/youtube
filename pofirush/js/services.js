// Platform servisleri: uygulama içi satın alma, AdMob (GDPR onayı + iOS ATT), ses/müzik, titreşim, paylaşım.
//
// Telefonda: cordova-plugin-purchase v13 (Google Play Billing + StoreKit) ve @capacitor-community/admob.
// Tarayıcıda: gerçek ödeme ALINMAZ, gerçek reklam GÖSTERİLMEZ; açıkça "TEST" yazan pencereler çıkar.
import { ADS, PRODUCTS } from './config.js';

export const VALIDATOR_URL = ''; // YAYIN ÖNCESİ (önerilir): server/validate.mjs adresi, ör. https://api.alanadiniz.com/validate

export const isNative = () => !!window.Capacitor?.isNativePlatform?.();
export const platform = () => window.Capacitor?.getPlatform?.() || 'web';
export const plugin = name => (isNative() ? window.Capacitor.Plugins?.[name] : null);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------- Uygulama içi satın alma ----------------
export class Store {
  constructor() {
    this.native = false;
    this.prices = {};
    this.onGrant = null;    // (productId, txId) => void   — ödülü veren tek nokta
    this.onConfirm = null;  // tarayıcı test penceresi: (product) => Promise<boolean>
    this.onError = null;
  }

  async init() {
    if (!isNative()) return;
    // Cordova eklentileri "deviceready" sonrası hazır olur
    if (!window.CdvPurchase) await new Promise(r => { document.addEventListener('deviceready', r, { once: true }); setTimeout(r, 4000); });
    if (!window.CdvPurchase) { console.warn('cordova-plugin-purchase bulunamadı'); return; }
    try { await this.initNative(); this.native = true; } catch (e) { console.warn('IAP başlatılamadı', e); }
  }

  async initNative() {
    const { store, ProductType, Platform, LogLevel } = window.CdvPurchase;
    const plat = platform() === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
    store.verbosity = LogLevel.WARNING;
    store.register(PRODUCTS.map(p => ({
      id: p.id, platform: plat,
      type: p.type === 'consumable' ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE,
    })));
    if (VALIDATOR_URL) store.validator = VALIDATOR_URL;
    const grantTx = tx => { for (const p of tx.products) this.onGrant?.(p.id, tx.transactionId || `${p.id}-${Date.now()}`); };
    store.when()
      .productUpdated(p => {
        const price = p.pricing?.price || p.offers?.[0]?.pricingPhases?.[0]?.price;
        if (price) this.prices[p.id] = price;
        // Kalıcı ürünler (reklamsız, paketler) yeniden kurulumda / başka cihazda otomatik geri gelir
        if (p.owned && PRODUCTS.find(x => x.id === p.id)?.type !== 'consumable') this.onGrant?.(p.id, `owned-${p.id}`);
      })
      .approved(tx => {
        if (VALIDATOR_URL) return tx.verify();
        grantTx(tx);
        return tx.finish();
      })
      .verified(receipt => {
        for (const tx of receipt.sourceReceipt?.transactions || []) grantTx(tx);
        return receipt.finish();
      });
    store.error(err => {
      if (err?.code === window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) return;
      this.onError?.(err?.message || 'Ödeme hatası');
    });
    await store.initialize([plat]);
  }

  price(id) { return this.prices[id] || PRODUCTS.find(p => p.id === id)?.price || ''; }

  async buy(id) {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return false;
    if (this.native) {
      const { store, ErrorCode } = window.CdvPurchase;
      const offer = store.get(id)?.getOffer();
      if (!offer) { this.onError?.('Ürün mağazada bulunamadı (Play Console / App Store Connect kimliğini kontrol edin)'); return false; }
      const err = await offer.order();
      if (err && err.code !== ErrorCode.PAYMENT_CANCELLED) this.onError?.(err.message);
      return !err; // ödül approved/verified olayında verilir
    }
    if (isNative()) { this.onError?.('Mağaza hazır değil'); return false; }
    const ok = await this.onConfirm?.(product);
    if (ok) this.onGrant?.(id, 'web-test-' + Date.now());
    return !!ok;
  }

  async restore() {
    if (!this.native) return false;
    await window.CdvPurchase.store.restorePurchases();
    return true;
  }
}

// ---------------- Reklamlar (AdMob) ----------------
export class Ads {
  constructor() {
    this.admob = null;
    this.ready = { rewarded: false, interstitial: false };
    this.privacyOptions = false;
    this.onSimulate = null; // tarayıcıda test penceresi: (kind) => Promise<boolean>
    this.onBusy = null;     // reklam açılıp kapanırken müzik vb. durdurmak için (bool)
  }
  ids() { return platform() === 'ios' ? ADS.ios : ADS.android; }

  async init() {
    const AdMob = plugin('AdMob');
    if (!AdMob) return;
    try {
      // 1) GDPR / UMP onayı (AB, Birleşik Krallık, İsviçre için zorunlu)
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm();
      this.privacyOptions = info.privacyOptionsRequirementStatus === 'REQUIRED';
      // 2) iOS uygulama izleme şeffaflığı (ATT) izni
      if (platform() === 'ios') {
        try {
          const { status } = await AdMob.trackingAuthorizationStatus();
          if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        } catch (e) { /* iOS 14 öncesi */ }
      }
      if (!info.canRequestAds) return;
      await AdMob.initialize({ initializeForTesting: ADS.testing });
      this.admob = AdMob;
      AdMob.addListener('onRewardedVideoAdDismissed', () => { this.ready.rewarded = false; this.preload('rewarded'); });
      AdMob.addListener('interstitialAdDismissed', () => { this.ready.interstitial = false; this.preload('interstitial'); });
      this.preload('rewarded');
      this.preload('interstitial');
    } catch (e) { console.warn('AdMob başlatılamadı', e); }
  }

  async preload(kind, attempt = 0) {
    if (!this.admob || this.ready[kind]) return;
    try {
      const opts = { adId: this.ids()[kind], isTesting: ADS.testing, immersiveMode: true };
      if (kind === 'rewarded') await this.admob.prepareRewardVideoAd(opts);
      else await this.admob.prepareInterstitial(opts);
      this.ready[kind] = true;
    } catch (e) {
      if (attempt < 4) setTimeout(() => this.preload(kind, attempt + 1), 4000 * 2 ** attempt); // üstel bekleme
    }
  }

  async showPrivacyOptions() { try { await this.admob?.showPrivacyOptionsForm(); } catch (e) { /* */ } }

  // true = oyuncu ödülü kazandı
  async rewarded() {
    if (!isNative()) return this.onSimulate ? this.onSimulate('rewarded') : true;
    if (!this.admob) return false;
    if (!this.ready.rewarded) { await this.preload('rewarded'); if (!this.ready.rewarded) return false; }
    let earned = false;
    const h = await this.admob.addListener('onRewardedVideoAdReward', () => { earned = true; });
    this.onBusy?.(true);
    try {
      const r = await this.admob.showRewardVideoAd();
      if (r && (r.amount > 0 || r.type)) earned = true;
      await sleep(250);
    } catch (e) { /* gösterilemedi */ }
    finally { h?.remove?.(); this.ready.rewarded = false; this.onBusy?.(false); this.preload('rewarded'); }
    return earned;
  }

  async interstitial() {
    if (!isNative()) return false; // web sürümünde zorunlu reklam yok
    if (!this.admob || !this.ready.interstitial) { this.preload('interstitial'); return false; }
    this.onBusy?.(true);
    try { await this.admob.showInterstitial(); return true; } catch (e) { return false; }
    finally { this.ready.interstitial = false; this.onBusy?.(false); this.preload('interstitial'); }
  }
}

// ---------------- Ses efektleri + prosedürel müzik (dosya gerektirmez) ----------------
export class Audio {
  constructor() { this.ctx = null; this.sfxOn = true; this.musicOn = true; this.timer = null; this.step = 0; this.next = 0; this.intensity = 0; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.mbus = this.ctx.createGain(); this.mbus.gain.value = 0.16; this.mbus.connect(this.master);
    } catch (e) { this.ctx = null; }
  }
  suspend() { this.ctx?.suspend?.(); }
  resume() { this.ctx?.resume?.(); }
  tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0, bus = null) {
    if (!this.ctx) return;
    const t = bus ? delay : this.ctx.currentTime + delay; // müzik (bus) mutlak zaman verir
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.master); o.start(t); o.stop(t + dur + 0.03);
  }
  noise(dur, vol = 0.2, delay = 0, hp = 800) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp; s.buffer = buf; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  }
  play(name, arg = 0) {
    if (!this.sfxOn || !this.ctx) return;
    switch (name) {
      case 'flap': this.tone(520 + Math.random() * 60, 0.09, 'triangle', 0.16, 380); this.noise(0.05, 0.05, 0, 2500); break;
      case 'score': this.tone(880, 0.07, 'square', 0.07); this.tone(1320, 0.1, 'square', 0.06, 0, 0.05); break;
      case 'perfect': { const b = 660 * 2 ** (Math.min(arg, 12) / 12); [1, 1.25, 1.5].forEach((m, i) => this.tone(b * m, 0.12, 'triangle', 0.12, 0, i * 0.04)); break; }
      case 'coin': this.tone(1568, 0.05, 'square', 0.06); this.tone(2093, 0.09, 'square', 0.06, 0, 0.045); break;
      case 'power': [523, 784, 1046, 1568].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.14, 0, i * 0.05)); break;
      case 'shield': this.tone(300, 0.25, 'sawtooth', 0.12, 600); this.noise(0.2, 0.1); break;
      case 'hit': this.noise(0.3, 0.35, 0, 200); this.tone(160, 0.35, 'sawtooth', 0.22, -110); break;
      case 'fall': this.tone(600, 0.5, 'triangle', 0.12, -480, 0.12); break;
      case 'biome': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.1, 0, i * 0.09)); break;
      case 'warn': this.tone(1200, 0.06, 'square', 0.06); this.tone(1200, 0.06, 'square', 0.06, 0, 0.1); break;
      case 'best': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.15, 0, i * 0.08)); break;
      case 'buy': [784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.09, 0, i * 0.06)); break;
      case 'click': this.tone(700, 0.04, 'triangle', 0.09); break;
      case 'error': this.tone(220, 0.12, 'square', 0.1); this.tone(160, 0.16, 'square', 0.1, 0, 0.09); break;
      case 'count': this.tone(arg ? 1046 : 660, 0.12, 'square', 0.1); break;
    }
  }
  // Basit müzik: 8 adımlık arpej + bas. Yoğunluk skora göre artar (hi-hat açılır).
  startMusic() {
    if (!this.musicOn || !this.ctx || this.timer) return;
    const prog = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 64]];
    const bpm = 118, st = 60 / bpm / 2;
    const hz = m => 440 * 2 ** ((m - 69) / 12);
    this.next = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => {
      while (this.next < this.ctx.currentTime + 0.25) {
        const bar = Math.floor(this.step / 8) % 4, i = this.step % 8, ch = prog[bar];
        const pat = [0, 1, 2, 3, 2, 1, 2, 3];
        this.tone(hz(ch[pat[i]] + 12), st * 0.9, 'triangle', 0.35, 0, this.next, this.mbus);
        if (i % 4 === 0) this.tone(hz(ch[0] - 12), st * 3.5, 'sine', 0.6, 0, this.next, this.mbus);
        if (this.intensity > 0.3 && i % 2 === 1) this.tone(8000, 0.02, 'square', 0.05, 0, this.next, this.mbus);
        if (this.intensity > 0.6 && i % 4 === 2) this.tone(110, 0.12, 'sine', 0.5, -60, this.next, this.mbus);
        this.next += st; this.step++;
      }
    }, 80);
  }
  stopMusic() { clearInterval(this.timer); this.timer = null; }
}

export function haptic(on, kind = 'light') {
  if (!on) return;
  try {
    const H = plugin('Haptics');
    if (H) H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
    else navigator.vibrate?.(kind === 'heavy' ? 60 : 12);
  } catch (e) { /* */ }
}

export async function share({ title, text, url, blob }) {
  try {
    if (blob) {
      const file = new File([blob], 'pofirush.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ title, text, url, files: [file] }); return 'shared'; }
    }
    const S = plugin('Share');
    if (S) { await S.share({ title, text, url, dialogTitle: title }); return 'shared'; }
    if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch (e) { return e?.name === 'AbortError' ? 'cancel' : 'fail'; }
}

export function openUrl(url) { window.open(url, '_blank', 'noopener'); }
