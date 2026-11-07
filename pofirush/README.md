# 🐤 Pofi Rush

Tek dokunuşla oynanan, **sonsuz ve zor** bir kanat çırpma oyunu. Android ve iOS için Capacitor 8 ile paketlenir; reklam (AdMob) ve uygulama içi satın alma (Google Play Billing / StoreKit) hazır.

Saf HTML5 + JavaScript, derleme adımı yok, harici görsel veya ses dosyası yok. Karakterler, arka planlar, müzik ve efektler kodla üretilir, bu yüzden telif riski yok ve uygulama boyutu küçük.

```bash
cd pofirush && npm run dev        # → http://localhost:8090  (tarayıcıda dene)
npm test                          # ayrı terminalde: uçtan uca duman testi
npm run web                       # paylaşılabilir tek dosya: dist/pofi-rush.html
```

---

## 1. Oyun

| Özellik | Ayrıntı |
|---|---|
| **Sonsuz harita** | Prosedürel üretilir. Zorluk 90. sütuna kadar yumuşakça artar: hız 168 → 292, aralık 182 → 128 piksel. Sonrasında en zor seviyede sonsuza kadar sürer |
| **Adil zorluk** | İki aralık arasındaki dikey fark, kuşun o sürede inip çıkabileceği mesafeyle fizikten sınırlanır. Oyun zor ama hiçbir zaman imkânsız değildir. Bir arama botu klasik modda 66, zorlu modda 60 puana ulaşabildi |
| **5 engel türü** | Sabit · **Hareketli** (6. puandan sonra) · **Nefes alan** (aralık daralıp genişler, 16+) · **Kaydırıcı** (kırmızı `!` ile uyarır, sonra yer değiştirir, 26+) · **Testere** (sütunlar arasında, 34+) |
| **3 mod** | Klasik · **Zorlu** (+%14 hız, daha dar aralık, güçlendirme yok, engeller iki kat erken açılır) · **Günün Rotası** (o gün herkes aynı haritayı oynar, sosyal medyada skor karşılaştırmak için) |
| **Güçlendirmeler** | 🛡️ Kalkan (bir çarpışmayı affeder) · 🧲 Mıknatıs (7 sn) · ⏳ Yavaş zaman (4 sn) |
| **Mükemmel geçiş** | Aralığın ortasından geçince seri başlar. Seri 5'e ulaşınca ×2, 10'a ulaşınca ×3 jeton verir |
| **5 bölge** | Her 20 puanda değişir: Gün Batımı → Neon Şehir → Buz Vadisi → Volkan → Uzay. Renk geçişi yumuşaktır ve parallaks katmanlar vardır |
| **13 kostüm** | 6'sı jetonla, 2'si skorla, 1'i 7 günlük giriş serisiyle, 4'ü **Efsane Paketi**'yle açılır. Her kostümün kendi iz efekti var (kalp, kar, alev, gökkuşağı…) |
| **Madalyalar** | Bronz 10 · Gümüş 25 · Altın 50 · Elmas 100 · Efsane 200 |
| **Bağlılık** | 7 günlük giriş ödülü (reklamla ×2) · günde 3 görev · 10 başarım · mod başına ilk 10 rekor |
| **His** | Sabit adımlı fizik (60/90/120 Hz ekranlarda aynı oynanış), ekran sarsıntısı, parçacıklar, titreşim, ölümde yavaş çekim, skora göre yoğunlaşan prosedürel müzik |
| **Diller** | Türkçe + İngilizce, cihaz dilinden otomatik seçilir (`js/i18n.js`) |

Tüm denge değerleri `js/config.js` → `TUNING` içinde.

---

## 2. Para kazanma

### Uygulama içi ürünler (gerçek para)
Kimlikleri **Google Play Console** ve **App Store Connect**'te aynen bu adlarla açın:

| Kimlik | Tür | Önerilen fiyat | İçerik |
|---|---|---|---|
| `pofi_noads` | Tüketilemez | ₺89,99 / $2.99 | Zorunlu reklamları kaldırır |
| `pofi_starter` | Tüketilemez | ₺59,99 / $1.99 | Reklamsız + 3.000 jeton + Ejder kostümü. 3. oyundan sonra **48 saatlik geri sayımla** bir kez teklif edilir |
| `pofi_doubler` | Tüketilemez | ₺119,99 / $3.99 | Her oyunda ×2 jeton, kalıcı |
| `pofi_legends` | Tüketilemez | ₺149,99 / $4.99 | Kral, Kozmik, Anka, Ejder kostümleri |
| `pofi_coins_s` | Tüketilebilir | ₺29,99 / $0.99 | 2.000 jeton |
| `pofi_coins_m` | Tüketilebilir | ₺89,99 / $2.99 | 7.000 jeton (POPÜLER) |
| `pofi_coins_l` | Tüketilebilir | ₺249,99 / $7.99 | 25.000 jeton (EN AVANTAJLI) |

Telefonda mağazanın **yerel fiyatı** gösterilir. Tablodaki fiyat yalnızca tarayıcı demosunda görünür.

### Reklamlar (AdMob)
| Yer | Tür | Kural |
|---|---|---|
| Ölünce "Devam et?" | Ödüllü | Oyun başına 1 kez, skor ≥ 5 ise. Alternatifi 250 jeton (jetona talep yaratır) |
| Oyun sonu "2× jeton" | Ödüllü | Her oyunda |
| Mağaza "Ücretsiz jeton" | Ödüllü | Günde 3 × 120 jeton |
| Günlük ödül ×2 | Ödüllü | Günde 1 |
| Tekrar / Ana menü | Geçiş reklamı | İlk 4 oyunda hiç gösterilmez. Sonra her 3 ölümde bir, en az 100 saniye arayla. **Reklamsız** paketi alanlara hiç gösterilmez |

Banner reklam bilerek yok: bu türde oyun alanını daraltıyor ve elde tutmayı düşürüyor.
Kurallar `js/config.js` → `ADS` içinde değiştirilebilir.

### Uyumluluk (mağaza reddini önler)
- **GDPR/UMP onay formu** (AB/İngiltere) ve **iOS ATT izni** açılışta otomatik isteniyor. Ayarlar'da "Reklam gizlilik tercihleri" var
- **Satın alımları geri yükle** düğmesi mağazada ve ayarlarda var (Apple zorunlu tutuyor)
- Mağaza ekranında vergi, ebeveyn izni ve sanal para notu var. Gizlilik politikası ve kullanım koşulları bağlantıları da burada
- Kalıcı ürünler yeniden kurulumda ve başka cihazda otomatik geri gelir. Aynı işlem iki kez ödül vermez
- Tarayıcıda **gerçek ödeme alınmaz**: açıkça "TEST MAĞAZASI" ve "TEST REKLAMI" yazan pencereler çıkar

### Makbuz doğrulama (önerilir)
`server/` klasörü Google Play ve App Store için hazır bir doğrulama sunucusu içerir. Apple tarafında hem StoreKit 1 makbuzu hem StoreKit 2 JWS desteklenir. Kurulum adımları `server/validate.mjs` dosyasının başında. Sunucuyu yayınladıktan sonra adresini `js/services.js` → `VALIDATOR_URL` alanına yazın.

---

## 3. Telefona paketleme

**Gerekenler:** Node 20+, Android için Android Studio (JDK 21), iOS için macOS + Xcode 16+.

```bash
cd pofirush
npm install
npm run native:init     # www/ oluşturur, android/ + ios/ ekler, yerel ayarları yamalar, simgeleri üretir
npm run android         # Android Studio açılır → Build › Generate Signed App Bundle (.aab)
npm run ios             # Xcode açılır → Signing & Capabilities › + In-App Purchase → Product › Archive
```

`npm run patch` (`scripts/patch-native.mjs`) şunları otomatik ayarlar ve tekrar çalıştırmak güvenlidir:
AdMob uygulama kimliği, iOS ATT metni, SKAdNetwork, yalnız dikey ekran, iPad tam ekran, şifreleme beyanı ve `package.json` sürümünden üretilen sürüm numaraları.

Kodda değişiklik yaptıktan sonra: `npm run build && npx cap sync`.

---

## 3.5 Web sürümü ve paylaşma

```bash
npm run web      # → dist/pofi-rush.html (tek dosya, ~100 KB, internetsiz açılır)
```

`dist/pofi-rush.html` hazır olarak repoda da var. Şu yollarla paylaşabilirsiniz:
- **Doğrudan dosya:** WhatsApp, Telegram veya e-postayla gönderin; telefonda ya da bilgisayarda tarayıcıda açılır.
- **itch.io:** Yeni proje › Kind: HTML › dosyayı `index.html` adıyla zip'leyip yükleyin › "Mobile friendly" ve "Fullscreen button" seçeneklerini açın. Ücretsiz yayınlanır, oyunun ilk tanıtımı ve geri bildirim için iyidir.
- **GitHub Pages / Netlify:** dosyayı `index.html` olarak yükleyin. Paylaşılan skor kartları açık sayfanın adresini kullanır (sabit bir adres istiyorsanız `GAME.webUrl` alanını doldurun).

Web sürümünde zorunlu reklam yoktur. Ödüllü reklam düğmeleri "TEST REKLAMI" penceresiyle anında ödül verir, satın almalar ise "TEST MAĞAZASI" penceresiyle çalışır (gerçek ödeme alınmaz). Gerçek gelir telefon uygulamasından gelir.

---

## 4. Yayın öncesi kontrol listesi

1. **Ad ve kimlik**: `capacitor.config.json` → `appId` (ör. `com.sirketiniz.pofirush`). `server/validate.mjs` içinde `PACKAGE_NAME` ile aynı olmalı. Mağazada adın boşta olduğunu kontrol edin
2. **AdMob**: admob.google.com'da Android ve iOS uygulaması açın, ardından:
   - Uygulama kimlikleri: `ADMOB_APP_ID_ANDROID=… ADMOB_APP_ID_IOS=… npm run patch`
   - Ödüllü ve geçiş reklamı birim kimlikleri: `js/config.js` → `ADS.android` / `ADS.ios`
   - Aynı dosyada `ADS.testing = false`
   - AdMob › Gizlilik ve mesajlar bölümünde **GDPR mesajını** ve **IDFA açıklama mesajını** yayınlayın
   - Sitenizde `app-ads.txt` yayınlayın
3. **Ürünler**: Bölüm 2'deki 7 ürünü iki mağazada da açın. Türlerini (tüketilebilir/tüketilemez) doğru seçin
4. **Bağlantılar**: `js/config.js` → `GAME` (mağaza adresleri, gizlilik politikası, koşullar, destek e-postası). `store-listing/privacy-policy.md` dosyasını kendi sitenizde yayınlayın
5. **Mağaza sayfası**: metinler `store-listing/listing.md` içinde. Ekran görüntüleri `store-listing/screenshots/` içinde: iPhone 6.9" için 1290×2796, Android için 1080×1920, TR ve EN. Yeniden üretmek için `node scripts/store-shots.mjs` çalıştırın
6. **Formlar**: Google Play'de *Veri güvenliği* ve *İçerik derecelendirmesi*, App Store'da *App Privacy* formunu doldurun. Cevaplar `listing.md` içinde
7. **Test**: Play Console'da dahili test kanalına yükleyin, lisans test hesabıyla satın almaları deneyin. iOS'ta TestFlight ve Sandbox hesabıyla deneyin
8. Simgeyi değiştirdiyseniz: `npm run assets`

---

## 5. Dosya yapısı

```
pofirush/
├── index.html, css/style.css, manifest.webmanifest, sw.js (çevrimdışı PWA), icon.svg, icons/
├── js/config.js     ← TÜM AYARLAR: ürünler, reklam kimlikleri/kuralları, kostümler, bölgeler, zorluk
├── js/engine.js     ← oyun motoru: fizik, harita üretimi, engeller, çizim, karakter çizimi
├── js/main.js       ← menüler, mağaza, kostümler, görevler, ayarlar, devam/oyun sonu, teklifler
├── js/services.js   ← IAP (cordova-plugin-purchase), AdMob + onay + ATT, ses/müzik, titreşim, paylaşım
├── js/save.js       ← kayıt (localStorage + Capacitor Preferences yedeği, bütünlük özeti)
├── js/i18n.js       ← Türkçe / İngilizce metinler
├── scripts/         ← build, bundle-web, patch-native, make-assets, smoke-test, store-shots
├── dist/            ← paylaşılabilir tek dosyalık web sürümü
├── assets/          ← simge ve açılış ekranı kaynakları (@capacitor/assets)
├── server/          ← makbuz doğrulama sunucusu
└── store-listing/   ← mağaza metinleri, gizlilik politikası, ekran görüntüleri
```

## 6. Sonraki adımlar (isteğe bağlı)
- **Liderlik tablosu**: Google Play Games / Game Center (ör. `@openforge/capacitor-game-connect`). Günün Rotası için küresel sıralama
- **Analitik**: Firebase Analytics ile D1/D7 tutunma, reklam başına gelir, satın alma hunisi. Fiyatlar ve reklam sıklığı bu veriyle ayarlanmalı
- **Uzaktan yapılandırma**: `TUNING` ve `ADS` değerlerini yeni sürüm çıkarmadan A/B test etmek için
- **Bulut kaydı**: hesap bağlama

> Gerçekçi not: Hiçbir oyunun para kazanacağı garanti edilemez. Bu türde gelir, büyük ölçüde mağaza sayfasının kalitesine, TikTok/Shorts videolarına ve ilk günlerdeki tutunma oranına bağlıdır. Günün Rotası modu ve paylaşım kartı kısa video için tasarlandı.
