// Hesap bağlama, bulut kaydı ve küresel sıralama.
//
// Telefonda tek eklenti: @capacitor-firebase/authentication (Capacitor 8)
//   Game Center, Apple ile Giriş, Google Play Oyunlar ve Google ile Giriş'i destekler.
//   İlk girişten sonra bağlanan diğer sağlayıcılar aynı Firebase hesabına eklenir (linkWith…),
//   böylece oyuncu iPhone'dan Android'e geçse bile aynı ilerlemeye ulaşır.
// Bulut kaydı ve sıralama: server/cloud.mjs (Firebase ID token'ı sunucuda doğrulanır).
// Yalnızca Apple modu (FEATURES.apple): tek sağlayıcı "Apple ile Giriş"; bulut kaydı sunucusuz,
//   @capacitor-firebase/firestore ile saves/{uid} belgesinde tutulur (Firestore kuralları: herkes yalnızca kendi belgesi).
// Tarayıcıda gerçek giriş yapılamaz; açıkça "Test" olarak işaretlenmiş bir bağlantı oluşturulur.
import { CONFIG, FEATURES } from './services.js';

export const PROVIDERS = {
  gamecenter: { name: 'Game Center',         icon: '🎮', firebase: 'gc.apple.com',         fn: 'GameCenter', kind: 'games' },
  apple:      { name: 'Apple ile Giriş',     icon: '',   firebase: 'apple.com',            fn: 'Apple',      kind: 'id' },
  playgames:  { name: 'Google Play Oyunlar', icon: '▶️', firebase: 'playgames.google.com', fn: 'PlayGames',  kind: 'games' },
  google:     { name: 'Google ile Giriş',    icon: 'G',  firebase: 'google.com',           fn: 'Google',     kind: 'id' },
};

const FA = () => window.Capacitor?.Plugins?.FirebaseAuthentication;
const FS = () => window.Capacitor?.Plugins?.FirebaseFirestore;

export class Account {
  constructor() {
    this.platform = window.Capacitor?.getPlatform?.() || 'web';
    this.appleOnly = !!FEATURES.apple && !FEATURES.accounts;
    this.enabled = !!(FEATURES.accounts || FEATURES.apple);
    this.native = this.enabled && (this.platform === 'ios' || this.platform === 'android') && !!FA();
    this.onTestConfirm = null; // (provider) => Promise<boolean>
  }

  // Apple yönergesi 4.8: iOS'te başka bir sosyal giriş sunuluyorsa Apple ile Giriş de sunulmalı.
  available() {
    if (!this.enabled) return [];
    if (this.appleOnly) return this.platform === 'android' ? [] : ['apple'];
    if (this.platform === 'ios') return ['gamecenter', 'apple', 'google'];
    if (this.platform === 'android') return ['playgames', 'google'];
    return ['gamecenter', 'apple', 'playgames', 'google'];
  }

  async link(provider, alreadyLinked) {
    const P = PROVIDERS[provider];
    if (!this.native) {
      if (this.platform !== 'web') throw new Error('Giriş hizmeti şu an kullanılamıyor');
      const ok = await this.onTestConfirm?.(provider);
      if (!ok) return null;
      return { provider, id: 'test-' + Math.random().toString(36).slice(2, 10), name: 'Test Oyuncu', test: true, at: Date.now() };
    }
    const fa = FA();
    const cur = (await fa.getCurrentUser()).user;
    // Zaten bir hesapla girildiyse yeni sağlayıcıyı aynı hesaba bağla, yoksa onunla giriş yap
    const res = cur && alreadyLinked ? await fa['linkWith' + P.fn]() : await fa['signInWith' + P.fn]();
    const u = res.user || (await fa.getCurrentUser()).user;
    if (!u) return null;
    // Apple adı yalnızca ilk girişte paylaşır; yoksa e-postayı göstermeyiz (gizli e-posta olabilir)
    return { provider, id: u.uid, name: u.displayName || P.name + ' oyuncusu', at: Date.now() };
  }

  async unlink(provider, remaining) {
    if (!this.native) return;
    try {
      if (remaining > 0) await FA().unlink({ providerId: PROVIDERS[provider].firebase });
      else await FA().signOut();
    } catch (e) { /* yok say */ }
  }

  // Hesap silme. Apple ile Giriş kullanan uygulamalar silmede Apple jetonunu da iptal etmeli (Apple yönergesi 5.1.1(v)):
  // taze bir yetki kodu için Apple ile yeniden giriş yapılır, jeton iptal edilir, sonra Firebase kullanıcısı silinir.
  async deleteUser() {
    if (!this.native) return;
    const fa = FA();
    try {
      const r = await fa.signInWithApple();
      if (r?.credential?.authorizationCode) await fa.revokeAccessToken({ token: r.credential.authorizationCode });
    } catch (e) { /* kullanıcı vazgeçtiyse veya Apple bağlı değilse devam */ }
    await fa.deleteUser();
  }

  async uid() { return this.native ? (await FA().getCurrentUser()).user?.uid || null : null; }

  async token() {
    if (!this.native) return null;
    const u = (await FA().getCurrentUser()).user;
    if (!u) return null;
    return (await FA().getIdToken({ forceRefresh: false })).token;
  }

  // ---- Bulut kaydı ve sıralama (server/cloud.mjs) ----
  // Bulut kaydı bu sürümde var mı (giriş yapılmasa da): Apple modunda her zaman, diğerinde sunucu adresi varsa
  cloudAvailable() { return this.appleOnly ? true : this.enabled && !!CONFIG.cloudUrl; }
  cloudReady(links) {
    const linked = this.native && Object.values(links || {}).some(l => !l.test);
    return this.appleOnly ? linked && !!FS() : this.enabled && !!CONFIG.cloudUrl && linked;
  }
  async call(path, method, body) {
    const token = await this.token();
    if (!CONFIG.cloudUrl || !token) throw new Error('Bulut için hesabını bağla');
    const res = await fetch(CONFIG.cloudUrl.replace(/\/$/, '') + path, {
      method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) throw new Error('Oturum süresi doldu, tekrar giriş yap');
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Sunucu hatası');
    return method === 'GET' ? res.json() : true;
  }
  async push(links, save) {
    if (!this.appleOnly) return this.call('/save', 'PUT', { save });
    const uid = await this.uid(); if (!uid) throw new Error('Bulut için Apple ile giriş yap');
    await FS().setDocument({ reference: `saves/${uid}`, data: { save: JSON.stringify(save), updated: Date.now(), v: 1 } });
    return true;
  }
  async pull() {
    if (!this.appleOnly) return this.call('/save', 'GET');
    const uid = await this.uid(); if (!uid) throw new Error('Bulut için Apple ile giriş yap');
    const d = (await FS().getDocument({ reference: `saves/${uid}` }))?.snapshot?.data;
    return d?.save ? { save: JSON.parse(d.save) } : null;
  }
  async remove() {
    if (!this.appleOnly) return this.call('/account', 'DELETE');
    const uid = await this.uid(); if (uid) await FS().deleteDocument({ reference: `saves/${uid}` });
    return true;
  }

  async submitScores(scores) { if (this.appleOnly) return; try { await this.call('/scores', 'POST', scores); } catch (e) { /* çevrimdışıysa sessiz */ } }
  async leaderboard(board) {
    if (!this.enabled || !CONFIG.cloudUrl || this.appleOnly) return null;
    const res = await fetch(`${CONFIG.cloudUrl.replace(/\/$/, '')}/leaderboard?board=${encodeURIComponent(board)}`);
    if (!res.ok) throw new Error('Sıralama yüklenemedi');
    return res.json(); // { top: [{rank, name, value, hero}], }
  }
}
