// Pofi Rush — TÜM AYARLAR BURADA: mağaza ürünleri, reklam kimlikleri, kostümler, zorluk eğrisi.
// Yayından önce değiştirilmesi gerekenler "YAYIN ÖNCESİ" ile işaretli.

export const GAME = {
  name: 'Pofi Rush',
  version: '1.0.0',
  // YAYIN ÖNCESİ: mağaza bağlantıları ve gizlilik politikası adresi (mağazalar zorunlu tutar)
  androidUrl: 'https://play.google.com/store/apps/details?id=com.pofirush.game',
  iosUrl: 'https://apps.apple.com/app/id0000000000',
  webUrl: '',  // web sürümünün paylaşım adresi (boşsa açık olan sayfanın adresi kullanılır)
  privacyUrl: 'https://example.com/pofirush/privacy',
  termsUrl: 'https://example.com/pofirush/terms',
  supportEmail: 'destek@example.com',
};

export const ADS = {
  // YAYIN ÖNCESİ: AdMob panelinden aldığınız reklam birimi kimlikleri.
  // Aşağıdakiler Google'ın resmi TEST kimlikleridir; test kimliğiyle gerçek gelir oluşmaz.
  testing: true,
  android: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
  // Geçiş reklamı kuralları (oyuncuyu kaçırmadan gelir): ilk oyunlarda hiç gösterilmez,
  // her N ölümde bir ve en az X saniye arayla gösterilir. "Reklamsız" alan oyuncuya hiç gösterilmez.
  interstitialEvery: 3,
  interstitialMinGapSec: 100,
  interstitialAfterRuns: 4,
  freeCoinAdsPerDay: 3,
  freeCoinAdReward: 120,
};

// Ürün kimlikleri Google Play Console ve App Store Connect'te AYNI kimlikle açılmalıdır.
// price: yalnızca tarayıcı demosunda gösterilen yedek fiyattır; telefonda mağazanın yerel fiyatı görünür.
export const PRODUCTS = [
  { id: 'pofi_noads', type: 'non-consumable', price: '₺89,99', grants: { noads: true }, tag: 'noads' },
  { id: 'pofi_starter', type: 'non-consumable', price: '₺59,99', grants: { noads: true, coins: 3000, skins: ['dragon'] }, tag: 'starter' },
  { id: 'pofi_doubler', type: 'non-consumable', price: '₺119,99', grants: { doubler: true }, tag: 'doubler' },
  { id: 'pofi_legends', type: 'non-consumable', price: '₺149,99', grants: { skins: ['king', 'cosmic', 'phoenix', 'dragon'] }, tag: 'legends' },
  { id: 'pofi_coins_s', type: 'consumable', price: '₺29,99', grants: { coins: 2000 }, tag: 'coins' },
  { id: 'pofi_coins_m', type: 'consumable', price: '₺89,99', grants: { coins: 7000 }, tag: 'coins', badge: 'popular' },
  { id: 'pofi_coins_l', type: 'consumable', price: '₺249,99', grants: { coins: 25000 }, tag: 'coins', badge: 'best' },
];

// Kostümler. how: 'free' | 'coins' | 'score' (tek oyunda skor) | 'streak' (giriş serisi) | 'iap' (gerçek para)
export const SKINS = [
  { id: 'pofi', how: 'free', body: '#ffcf3a', shade: '#f08c1a', belly: '#fff3c4', wing: '#ff9f1c', eye: 'normal', acc: 'none', trail: 'dots', tc: '#ffd35a' },
  { id: 'mint', how: 'coins', cost: 400, body: '#62f2c0', shade: '#1fae8a', belly: '#dcfff2', wing: '#25c99a', eye: 'normal', acc: 'leaf', trail: 'dots', tc: '#7dffd2' },
  { id: 'berry', how: 'coins', cost: 900, body: '#ff7ab8', shade: '#d63f86', belly: '#ffe1ef', wing: '#ff4f9a', eye: 'lash', acc: 'bow', trail: 'hearts', tc: '#ff8cc6' },
  { id: 'ninja', how: 'coins', cost: 1800, body: '#3b3f5c', shade: '#1f2238', belly: '#6c7096', wing: '#272a44', eye: 'narrow', acc: 'band', trail: 'dots', tc: '#ff3b5c' },
  { id: 'robo', how: 'coins', cost: 3000, body: '#b8c4d6', shade: '#6f7d93', belly: '#e9eef6', wing: '#8b98ad', eye: 'visor', acc: 'antenna', trail: 'sparkle', tc: '#7ee7ff' },
  { id: 'cool', how: 'coins', cost: 5000, body: '#4d8dff', shade: '#2350c9', belly: '#d6e5ff', wing: '#2f6af0', eye: 'shades', acc: 'cap', trail: 'sparkle', tc: '#8fb8ff' },
  { id: 'frost', how: 'score', need: 30, body: '#bff4ff', shade: '#62bfe6', belly: '#ffffff', wing: '#8fe0ff', eye: 'normal', acc: 'crystal', trail: 'snow', tc: '#e6fbff' },
  { id: 'inferno', how: 'score', need: 60, body: '#ff5a36', shade: '#b8200f', belly: '#ffd2a8', wing: '#ff2d1a', eye: 'angry', acc: 'horns', trail: 'flame', tc: '#ff8a2a' },
  { id: 'ghost', how: 'streak', need: 7, body: '#f2f0ff', shade: '#b5b0e0', belly: '#ffffff', wing: '#d9d5ff', eye: 'hollow', acc: 'none', trail: 'ghost', tc: '#ffffff', alpha: 0.82 },
  { id: 'king', how: 'iap', body: '#ffd84a', shade: '#c99300', belly: '#fff6c9', wing: '#e8b100', eye: 'normal', acc: 'crown', trail: 'sparkle', tc: '#ffe27a' },
  { id: 'cosmic', how: 'iap', body: '#7a4dff', shade: '#3a1aa8', belly: '#c9b6ff', wing: '#5b2ff0', eye: 'star', acc: 'halo', trail: 'rainbow', tc: '#c08cff', galaxy: true },
  { id: 'phoenix', how: 'iap', body: '#ff9a2a', shade: '#e0400e', belly: '#ffe39a', wing: '#ff5a1f', eye: 'angry', acc: 'flame', trail: 'flame', tc: '#ffb13b' },
  { id: 'dragon', how: 'iap', body: '#4fd36a', shade: '#1e8a3a', belly: '#d9ffb8', wing: '#2fb34f', eye: 'narrow', acc: 'horns', trail: 'flame', tc: '#a6ff5a' },
];

// Bölgeler: her BIOME_EVERY puanda bir değişir (döngüsel)
export const BIOME_EVERY = 20;
export const BIOMES = [
  { id: 'dusk', sky: ['#2a1650', '#ff7a59'], far: '#6b2f6e', near: '#3a1b4f', pil: ['#ffb347', '#ff6f3c'], edge: '#ffe1a8', ground: ['#3d1d4f', '#24102f'], sun: '#ffd27a' },
  { id: 'neon', sky: ['#060a24', '#2b0f5a'], far: '#161a4a', near: '#0d0f2e', pil: ['#00e5ff', '#7a3cff'], edge: '#b8fbff', ground: ['#14123a', '#08071c'], sun: '#ff3cac' },
  { id: 'ice', sky: ['#0d3b66', '#9ee7ff'], far: '#5fa8d3', near: '#2b6f9e', pil: ['#e6fbff', '#7fd3ff'], edge: '#ffffff', ground: ['#cdefff', '#7cc2e8'], sun: '#ffffff' },
  { id: 'lava', sky: ['#1a0505', '#a3200c'], far: '#4a0f0a', near: '#260605', pil: ['#ff8a00', '#d61f00'], edge: '#ffd27a', ground: ['#2b0a06', '#120302'], sun: '#ff5a00' },
  { id: 'space', sky: ['#000008', '#1a0b3d'], far: '#2b1d5c', near: '#120a2e', pil: ['#c08cff', '#5b2ff0'], edge: '#f1e3ff', ground: ['#1b1238', '#0a0618'], sun: '#8ad8ff' },
];

// Zorluk eğrisi. t = 0..1 (skora göre ilerleme). Hepsi sonsuz modda yumuşakça zorlaşır.
export const TUNING = {
  W: 405,                 // mantıksal genişlik (tüm cihazlarda aynı oynanış)
  groundH: 74,
  gravity: 1950,
  flapV: -585,
  maxFall: 930,
  birdX: 0.3,             // ekran genişliğine oranla
  birdR: 12.5,            // çarpışma yarıçapı (çizimden biraz küçük = adil his)
  pillarW: 66,
  speed: [168, 292],
  gap: [182, 128],
  spacing: [238, 186],
  rampScore: 90,          // bu skorda en zor değerlere ulaşılır
  hardcore: { speedMul: 1.14, gapAdd: -12, noPowerups: true },
  // Engel türlerinin açıldığı skorlar
  unlock: { moving: 6, breathing: 16, shifter: 26, saw: 34 },
  powerupEvery: [12, 20],
  medals: [
    { id: 'bronze', at: 10, color: '#d98b4a' },
    { id: 'silver', at: 25, color: '#cfd8e6' },
    { id: 'gold', at: 50, color: '#ffd23f' },
    { id: 'diamond', at: 100, color: '#7ee7ff' },
    { id: 'legend', at: 200, color: '#ff4fd8' },
  ],
};

export const LOGIN_REWARDS = [50, 80, 120, 160, 220, 300, 500];

// Günlük görev havuzu (her gün 3 tanesi seçilir)
export const MISSION_POOL = [
  { id: 'score', goal: [8, 15, 25], reward: [80, 150, 260] },
  { id: 'runs', goal: [5, 10], reward: [80, 140] },
  { id: 'coins', goal: [20, 50], reward: [100, 180] },
  { id: 'perfect', goal: [5, 15], reward: [90, 200] },
  { id: 'total', goal: [40, 100], reward: [120, 240] },
  { id: 'power', goal: [2, 4], reward: [90, 160] },
  { id: 'hard', goal: [5, 10], reward: [140, 240] },
];

export const ACHIEVEMENTS = [
  { id: 'a10', kind: 'best', n: 10, reward: 100 },
  { id: 'a25', kind: 'best', n: 25, reward: 200 },
  { id: 'a50', kind: 'best', n: 50, reward: 400 },
  { id: 'a100', kind: 'best', n: 100, reward: 800 },
  { id: 'a200', kind: 'best', n: 200, reward: 1500 },
  { id: 'r50', kind: 'runs', n: 50, reward: 200 },
  { id: 'r500', kind: 'runs', n: 500, reward: 1000 },
  { id: 'p10', kind: 'combo', n: 10, reward: 300 },
  { id: 'h25', kind: 'hard', n: 25, reward: 500 },
  { id: 'd7', kind: 'daily', n: 7, reward: 400 },
];

export const CONTINUE_COINS = 250;
