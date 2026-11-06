// Hesap bağlama, bulut kaydı ve küresel sıralama.
//
// Telefonda tek eklenti: @capacitor-firebase/authentication (Capacitor 8)
//   Game Center, Apple ile Giriş, Google Play Oyunlar ve Google ile Giriş'i destekler.
//   İlk girişten sonra bağlanan diğer sağlayıcılar aynı Firebase hesabına eklenir (linkWith…),
//   böylece oyuncu iPhone'dan Android'e geçse bile aynı ilerlemeye ulaşır.
// Bulut kaydı ve sıralama: server/cloud.mjs (Firebase ID token'ı sunucuda doğrulanır).
// Tarayıcıda gerçek giriş yapılamaz; açıkça "Test" olarak işaretlenmiş bir bağlantı oluşturulur.
import { CONFIG } from './services.js';

export const PROVIDERS = {
  gamecenter: { name: 'Game Center',         icon: '🎮', firebase: 'gc.apple.com',         fn: 'GameCenter', kind: 'games' },
  apple:      { name: 'Apple ile Giriş',     icon: '',   firebase: 'apple.com',            fn: 'Apple',      kind: 'id' },
  playgames:  { name: 'Google Play Oyunlar', icon: '▶️', firebase: 'playgames.google.com', fn: 'PlayGames',  kind: 'games' },
  google:     { name: 'Google ile Giriş',    icon: 'G',  firebase: 'google.com',           fn: 'Google',     kind: 'id' },
};

const FA = () => window.Capacitor?.Plugins?.FirebaseAuthentication;

export class Account {
  constructor() {
    this.platform = window.Capacitor?.getPlatform?.() || 'web';
    this.native = (this.platform === 'ios' || this.platform === 'android') && !!FA();
    this.onTestConfirm = null; // (provider) => Promise<boolean>
  }

  // Apple yönergesi 4.8: iOS'te başka bir sosyal giriş sunuluyorsa Apple ile Giriş de sunulmalı.
  available() {
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
    return { provider, id: u.uid, name: u.displayName || P.name + ' oyuncusu', at: Date.now() };
  }

  async unlink(provider, remaining) {
    if (!this.native) return;
    try {
      if (remaining > 0) await FA().unlink({ providerId: PROVIDERS[provider].firebase });
      else await FA().signOut();
    } catch (e) { /* yok say */ }
  }

  async deleteUser() { if (this.native) await FA().deleteUser(); }

  async token() {
    if (!this.native) return null;
    const u = (await FA().getCurrentUser()).user;
    if (!u) return null;
    return (await FA().getIdToken({ forceRefresh: false })).token;
  }

  // ---- Bulut kaydı ve sıralama (server/cloud.mjs) ----
  cloudReady(links) { return !!CONFIG.cloudUrl && this.native && Object.values(links || {}).some(l => !l.test); }
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
  push(links, save) { return this.call('/save', 'PUT', { save }); }
  pull() { return this.call('/save', 'GET'); }
  remove() { return this.call('/account', 'DELETE'); }

  async submitScores(scores) { try { await this.call('/scores', 'POST', scores); } catch (e) { /* çevrimdışıysa sessiz */ } }
  async leaderboard(board) {
    if (!CONFIG.cloudUrl) return null;
    const res = await fetch(`${CONFIG.cloudUrl.replace(/\/$/, '')}/leaderboard?board=${encodeURIComponent(board)}`);
    if (!res.ok) throw new Error('Sıralama yüklenemedi');
    return res.json(); // { top: [{rank, name, value, hero}], }
  }
}
