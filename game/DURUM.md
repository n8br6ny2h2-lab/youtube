# Efsun Avcısı — Proje Durumu (devam etmek için önce bunu oku)

Son güncelleme: 7 Kasım 2026 • Dal: `claude/amazing-clarke-nki5ny` • Sürüm: 1.0.0
Geliştirici: Kerem Kağan Kavcıoğlu • k.k.kavcioglu01@icloud.com

## Oyun
Tek parmakla oynanan dikey aksiyon RPG. Tamamen `game/` klasöründe, saf HTML5/JS + Capacitor 8.
- Web'de oynamak: `cd game && python3 -m http.server 8080`
- Oyun bağlantısı (Claude Artifact): https://claude.ai/artifact/JohfjjEwYV3oPJ55eo4aGj
- Ayrıntılı tasarım: `game/README.md`

| Dosya | İçerik |
|---|---|
| `js/data.js` | Tüm denge ve içerik: eşyalar, efsunlar, setler, kahramanlar, ürünler (PRODUCTS), zorluklar (DIFFS) |
| `js/game.js` | Savaş motoru |
| `js/art.js` | Karakter, düşman ve boss çizimleri |
| `js/main.js` | Lobi, mağaza, HUD |
| `js/menus.js` | Ana menü ve menü pencereleri |
| `js/economy.js` | Ekonomi kuralları |
| `js/services.js` | Satın alma, reklam, müzik |
| `js/account.js` | Hesap sistemi |
| `js/features.js` | **Özellik anahtarları:** `accounts: false`, `ads: false` (App Store ilk sürümü) |

## Son eklenenler (benzer oyunlar incelendi: Archero, Survivor.io)
Beceri evrimleri (6), savaş içi hazine sandığı, savaş sonu hasar dökümü, Hızlı Tarama (günde 3), kahraman parçası kaynakları (önceden parça kazanmanın yolu yoktu, kahraman seviyesi atlanamıyordu). Ardından: Arena (sonsuz dalga modu), sonsuz/kademeli başarımlar, daha zor denge (`TUNE`) ve aylık sezonlar (özel set, kalıcı aura/kostüm/unvan; Efsun Bileti her ay sıfırlanır). Ayrıntı: `README.md` > Evrimler, Arena, Sonsuz başarımlar.

## Mağaza görselleri ve metinleri (1.0 için güncel)
`store/app-store/screenshot-1..6.png` (1320×2868): başlık, sürü savaşı, evrim, boss, Arena, sezon. Eski görsellerde 1.0'da olmayan Game Center, sıralama ve reklam simgesi vardı; değiştirildi. Yeniden üretmek: `promo/store-shots-capture.cjs` + `promo/store-shots-compose.cjs`. `store/LISTING.md` 1.0 özelliklerine göre yeniden yazıldı (reklam/sıralama/bulut yok). Oyundaki "yakında" yer tutucuları kaldırıldı (Sıralama → kişisel Rekorlar).

## Yayın durumu: yalnızca App Store, hesapsız ve reklamsız ilk sürüm
Telefon rehberi: **`game/store/APP-STORE-YAYIN.md`** (adım adım)

| # | Adım | Durum |
|---|---|---|
| 1 | Apple Developer hesabı (Bireysel, 99 $) | ⏳ **Başvuru yapıldı, "Enrollment Pending"**. Onay e-postası bekleniyor |
| 2 | Gizlilik ve destek sayfaları | ✅ Yayında (aşağıda) |
| 3 | App ID: `com.efsunavcisi.game` (developer.apple.com > Identifiers) | ⬜ Onaydan sonra |
| 4 | App Store Connect'te yeni uygulama (SKU `efsun001`) | ⬜ |
| 5 | API anahtarı (Admin) + 4 GitHub gizli ayarı | ⬜ |
| 6 | Bulut derleme → TestFlight | ⬜ (gizli ayarlar eklenince otomatik) |
| 7 | Uygulama içi ürünler (tablo rehberde; `vip_noads` OLUŞTURULMAYACAK) | ⬜ |
| 8 | Mağaza sayfası + incelemeye gönder | ⬜ |

**Herkese açık sayfalar** (ana dal `docs/efsun-avcisi/`):
- Gizlilik: https://n8br6ny2h2-lab.github.io/youtube/efsun-avcisi/privacy.html
- Destek: https://n8br6ny2h2-lab.github.io/youtube/efsun-avcisi/support.html
- Şartlar: https://n8br6ny2h2-lab.github.io/youtube/efsun-avcisi/terms.html

**GitHub gizli ayarları** (Settings > Secrets > Actions). TestFlight için bu 4'ü yeterli:
`APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`.
Android için olanlar (şimdilik gerekmiyor): `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Bulut derleme (`.github/workflows/mobile-build.yml`)
- Her push'ta iOS derlenir. Anahtarlar yoksa simülatör derlemesi ile kontrol edilir; varsa imzalanıp **TestFlight'a otomatik yüklenir**.
- Android sadece elle başlatılınca derlenir.
- Son durum: iOS derlemesi ✅ (Xcode 26.3); Android APK ✅.
- Yeniden başlatmak için: GitHub Actions > Mobil Derleme > son çalıştırma > Re-run.

## Kontrol komutları (`game/` içinde)
- `npm run release-check:ios`: Yayın öncesi kontrol. Şu an **engel yok**.
- `npm run features`: `js/features.js` değişince eklenti listesini günceller.
- `npm run legal-fill -- --ad "…" --eposta … --adres "…"`: Yasal sayfaları doldurur. Sayfalar değişirse `docs/efsun-avcisi/` altına da kopyala.

## Instagram reklamları
`game/promo/` → `bash promo/render.sh` 3 video üretir (boss, guc, kombo), her biri 9:16 ve 4:5. Videolar git'e eklenmiyor (büyük); kullanıcıya gönderildi.
Kapanış yazısı: `PROMO_CTA="…"`. Uygulama-yükleme reklamları için oyunun App Store'da yayında olması gerekir.

## Apple ile Giriş + bulut kaydı (hazır, kapalı)
Kod hazır; `features.js` → `apple`. Kurulum rehberi: **`game/store/APPLE-GIRIS-KURULUM.md`** (Firebase ücretsiz, sunucu yok). GitHub'a `GOOGLE_SERVICE_INFO_PLIST` gizli ayarı eklenince iOS bulut derlemesi özelliği kendiliğinden açar. Mağazaya göndermeden önce gizlilik etiketleri ve gizlilik sayfası güncellenmeli (rehber 8. adım).

## Sonraki güncelleme (1.1)
`js/features.js` → `accounts: true` ve `ads: true`. Ardından Firebase (Game Center/Apple girişi) ve AdMob kurulur (`store/TELEFONDAN-YAYIN.md` Adım 2), sunucu kurulur (`server/cloud.mjs`, `CONFIG.cloudUrl`). Gizlilik sayfası `legal-fill` ile yeniden üretilir.

## Önemli: Google Play yükleme anahtarı
Claude bir Android yükleme anahtarı (`upload.jks`, alias `efsun-upload`) üretti ve kullanıcıya gönderdi; **repo'da yok**. Kullanıcı bunu iCloud'a kaydetmeli. Kaybolursa ve Play'e henüz yüklenmediyse yenisi üretilebilir (`keytool -genkeypair …`).
