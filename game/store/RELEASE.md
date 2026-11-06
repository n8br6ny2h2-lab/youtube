# Yayın Rehberi — Efsun Avcısı 1.0.0

Bu rehber oyunu App Store ve Google Play'e yüklemek için gereken adımları sırasıyla anlatır. Her adımdan sonra `npm run release-check` çalıştır; ❌ kalmayınca yüklemeye hazırsın.

## 0. Yapılmış olanlar (son kontrolde doğrulandı)

- 15 tam savaşlık dayanıklılık testi: 4 kahraman × 3 silah × 3 zorluk × 5 bölüm. Hata yok, bellek sızıntısı yok (10 MB'ta sabit).
- Savaş başında oyunu dondurabilen hata düzeltildi (negatif kare süresi).
- **Güvenlik:** Ödeme, reklam veya giriş eklentisi telefonda açılamazsa artık asla "test modu"na düşülmüyor (öncesinde bedava satın almaya yol açabiliyordu). Bu, test ile doğrulandı.
- "Geri yükle" tek seferlik kitleri ikinci kez vermiyor.
- Aylık Kart ve Sezon Bileti, Apple'da "yenilenmeyen abonelik" olarak tanımlanıyor.
- **Performans:** Ekran kartı olmayan test ortamında en kalabalık sahne normal hızda 59 FPS. Telefon zorlanırsa otomatik performans modu açılıyor.
- AB/İngiltere reklam onay formu (UMP), iOS izleme izni (ATT) ve "Reklam gizlilik seçenekleri" düğmesi eklendi.
- Yazı tipleri uygulamanın içinde: internet gerekmiyor ve oyuncunun IP adresi Google'a gitmiyor.
- Gizlilik politikası ve kullanım şartları (TR + EN) oyunun içinden açılabiliyor.
- Hazır mağaza dosyaları: ikonlar, açılış ekranı, 6+6 ekran görüntüsü, öne çıkan görsel, mağaza metinleri.

## 1. Hesaplar (senin yapman gereken)

| Hesap | Ücret | Not |
|---|---|---|
| Apple Developer Program | yıllık 99 $ | Şirket olarak açacaksan D-U-N-S numarası gerekir |
| Google Play Console | tek seferlik 25 $ | **Kişisel** hesaplarda yayından önce 12 test kullanıcısıyla 14 günlük kapalı test zorunlu |
| Firebase | ücretsiz (Spark) | Giriş için |
| Google AdMob | ücretsiz | Reklam geliri için; ödeme bilgileri gerekir |
| Sunucu (bulut kaydı + sıralama) | ~5 €/ay (ör. Hetzner, DigitalOcean) | İstersen ilk sürümü sunucusuz yayınla; bulut ve sıralama oyunda "yakında" yazar |

## 2. Kimlikleri doldur

```bash
cd game
npm install
npm run legal-fill -- --ad "Adın veya şirketin" --eposta destek@alanadin.com --adres "Şehir, Türkiye" --barindirma "Sunucu firması" --ulke "Ülke"
```

- `capacitor.config.json` → `appId`: kalıcı paket adı, ör. `com.adin.efsunavcisi`. **Yüklendikten sonra değiştirilemez.**
- `js/services.js` → `CONFIG.admob`: AdMob'da iOS ve Android için ayrı birer **ödüllü** reklam birimi oluştur ve kimliklerini yaz.
- `scripts/native-setup.mjs` → AdMob uygulama kimlikleri, Play Oyunlar proje kimliği ve iOS `REVERSED_CLIENT_ID`.
- `capacitor.config.json` → `plugins.AdMob` alanına uygulama kimliklerini yaz.
- `legal/privacy.html` ve `legal/terms.html` dosyalarını herkese açık bir adrese koy (GitHub Pages, kendi siten vb.) ve adresi mağaza formlarına yaz.

## 3. Firebase

1. Proje oluştur. Authentication bölümünde **Apple, Google, Game Center, Play Games** yöntemlerini aç.
2. Android uygulaması ekle (paket adı = `appId`). Hata ayıklama ve yayın imzası SHA-1 parmak izlerini gir. `google-services.json` dosyasını `android/app/` içine koy.
3. iOS uygulaması ekle. `GoogleService-Info.plist` dosyasını Xcode'da `App/App` içine sürükle.
4. Play Games: Play Console > Play Oyunlar hizmetleri > Yapılandırma'da OAuth istemcisini Firebase'deki web istemci kimliğiyle bağla.

## 4. Projeyi oluştur

```bash
npm run build
npx cap add android && npx cap add ios
npm run native-setup     # dikey ekran, izinler, kimlikler (tekrar çalıştırmak güvenli)
npm run assets           # ikon ve açılış ekranının tüm boyutları
npx cap sync
npm run release-check
```

## 5. Uygulama içi ürünler

| Kimlik | App Store türü | Google Play türü | Önerilen TR fiyatı |
|---|---|---|---|
| `gems_80` | Consumable | Tüketilebilir | ₺29,99 |
| `gems_500` | Consumable | Tüketilebilir | ₺149,99 |
| `gems_1200` | Consumable | Tüketilebilir | ₺299,99 |
| `gems_2600` | Consumable | Tüketilebilir | ₺599,99 |
| `gems_7000` | Consumable | Tüketilebilir | ₺1.499,99 |
| `kit_starter` | Non-Consumable | Tek seferlik | ₺49,99 |
| `kit_dragon` | Non-Consumable | Tek seferlik | ₺399,99 |
| `kit_enchanter` | Consumable | Tüketilebilir | ₺199,99 |
| `kit_nyx` | Non-Consumable | Tek seferlik | ₺299,99 |
| `kit_mythic` | Non-Consumable | Tek seferlik | ₺999,99 |
| `monthly_card` | **Non-Renewing Subscription** | Tüketilebilir | ₺99,99 |
| `vip_noads` | Non-Consumable | Tek seferlik | ₺179,99 |
| `battle_pass` | **Non-Renewing Subscription** | Tüketilebilir | ₺199,99 |

Apple ürünlerin her biri için inceleme ekran görüntüsü ister: mağaza ekranının görüntüsü yeterli. Mağazalar fiyatları kendi kademelerine yuvarlar; oyun her zaman mağazadan gelen gerçek fiyatı gösterir.

## 6. Test

- **iOS:** Xcode > Product > Archive > App Store Connect'e yükle > TestFlight. Sandbox test hesabıyla satın almaları dene.
- **Android:** Android Studio > Build > Generate Signed App Bundle (AAB) > Play Console > Kapalı test. Lisans test kullanıcısı ekle; satın almalar ücretsiz test edilir.
- **Kontrol listesi:** ilk açılışta onay formu ve izin ekranları çıkıyor mu? Giriş (4 yöntem) çalışıyor mu? Bir kiti satın al > uygulamayı sil > yeniden kur > Geri yükle; kit geliyor mu? Ödüllü reklamdan ödül geliyor mu? Hesabı sil çalışıyor mu? Uçak modunda oyun açılıyor mu?

## 7. App Review notu (App Store Connect > Uygulama İnceleme Bilgileri)

```
Efsun Avcısı is a single-player action RPG. No login is required to play; tap "OYNA" on the title screen.
Account linking (Game Center / Sign in with Apple / Google) is optional and only used for cloud save and leaderboards.
Account deletion: Main Menu > Hesap (Account) > "Hesabı sil" (Delete account).
In-app purchases: Shop tab (Mağaza). Loot box odds are shown via the "%" button on each chest.
Time-limited items (monthly_card, battle_pass) are Non-Renewing Subscriptions and do not auto-renew.
The game UI is in Turkish.
```

## 8. Gizlilik formları

**App Store "App Privacy":**
| Veri türü | Kullanım | Kimliğe bağlı mı | İzleme için mi |
|---|---|---|---|
| Kullanıcı Kimliği (User ID) | Uygulama işlevi | Evet | Hayır |
| E-posta adresi (sağlayıcı paylaşırsa) | Uygulama işlevi | Evet | Hayır |
| Oyun İçeriği / Diğer Kullanıcı İçeriği (oyuncu adı, skor) | Uygulama işlevi | Evet | Hayır |
| Satın Alma Geçmişi | Uygulama işlevi | Evet | Hayır |
| Reklam Verileri, Cihaz Kimliği | Üçüncü taraf reklam | Hayır | **Evet** (ATT izniyle) |
| Kaba Konum (IP'den, AdMob) | Üçüncü taraf reklam | Hayır | Evet |

**Google Play "Veri Güvenliği":** Toplanan veriler: Kullanıcı kimlikleri, e-posta (isteğe bağlı), uygulama etkinliği (oyun ilerlemesi), satın alma geçmişi, cihaz/diğer kimlikler (reklam). Veriler aktarım sırasında şifreleniyor: **Evet**. Kullanıcı veri silme isteyebilir: **Evet** (uygulama içinden + e-posta). Reklam: **Evet**.

## 9. Yayın sonrası

- İlk hafta: çökme raporlarını (Xcode Organizer / Play Console Android Vitals) ve D1 tutunma oranını izle.
- Zorluk çok yüksek ya da düşük gelirse `js/data.js` → `DIFFS` ve `game.js` → `diffHp` ile ayarla.
- Her güncellemede: `GAME.version` + `package.json` sürümünü artır, Xcode'da Build numarasını ve Android'de `versionCode` değerini artır.
