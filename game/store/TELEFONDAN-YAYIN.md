# Sadece Telefonla Yayınlama — Efsun Avcısı

Bilgisayar gerekmiyor. Derlemeyi GitHub'ın bulut bilgisayarları yapıyor: Android için Linux, iPhone için Mac. Bu repo herkese açık olduğu için ücretsiz. Sen sadece hesapları açıp birkaç bilgiyi GitHub'a yapıştırıyorsun.

> 💡 Bazı konsol sayfaları telefonda dar görünür. Safari'de **aA > Masaüstü web sitesini iste** seçeneğini aç.

---

## Adım 1 — Hesapları aç (1-3 gün sürebilir)

### 🍎 Apple Developer (yıllık 99 $)
1. iPhone'a App Store'dan **Apple Developer** uygulamasını indir.
2. Uygulamada **Hesap > Şimdi Kaydol**. Apple kimliğinle gir, **Bireysel** seç.
3. Kimlik kartının fotoğrafını çek, ödemeyi yap. Onay genelde 24-48 saat sürer.
4. Onaylanınca developer.apple.com > **Membership details** bölümündeki **Team ID** değerini not et (10 karakter, ör. `AB12CD34EF`).

### ▶️ Google Play Console (tek seferlik 25 $)
1. Tarayıcıda **play.google.com/console/signup** adresini aç. **Kendin için (kişisel)** hesabı seç.
2. Kimlik doğrulama ve ödemeyi yap.
3. ⚠️ Google, yeni kişisel hesaplarda **bir Android telefona erişimin olduğunu** doğrulamanı istiyor: Android bir telefona (ödünç olabilir) "Play Console" uygulamasını kurup aynı hesapla girmen yeterli.
4. ⚠️ Kişisel hesaplarda yayından önce **en az 12 kişilik, 14 gün süren kapalı test** zorunlu. Arkadaş ve aileden 12 Gmail adresi topla.

---

## Adım 2 — Firebase (giriş sistemi, ücretsiz)

1. **console.firebase.google.com > Proje ekle** ("efsun-avcisi").
2. **Authentication > Get started > Sign-in method** bölümünden **Apple, Google, Game Center, Play Games**'i etkinleştir.
3. **Proje ayarları > Uygulama ekle > Android:** Paket adı `com.efsunavcisi.game`.
   - SHA-1 olarak yükleme anahtarının parmak izini gir (Claude'un verdiği `GITHUB-GIZLI-AYARLAR.txt` dosyasında yazıyor).
   - **google-services.json** dosyasını indir.
4. **Uygulama ekle > iOS:** Paket kimliği `com.efsunavcisi.game`. **GoogleService-Info.plist** dosyasını indir.
5. İki dosyayı iPhone'un **Dosyalar** uygulamasında açıp içeriklerini kopyala (Adım 4'te yapıştıracaksın).

---

## Adım 3 — Apple tarafı

1. **developer.apple.com/account > Identifiers > +** ile **App IDs** seç. Bundle ID: `com.efsunavcisi.game`. **Game Center** ve **Sign in with Apple** kutularını işaretle.
2. **appstoreconnect.apple.com > Uygulamalar > + > Yeni Uygulama:** Ad "Efsun Avcısı: Aksiyon RPG", birincil dil Türkçe, az önceki Bundle ID, SKU `efsun001`.
3. **Kullanıcılar ve Erişim > Entegrasyonlar > App Store Connect API > +** ile **Admin** yetkili bir anahtar oluştur.
   - **.p8 dosyasını indir.** ⚠️ Bu dosya yalnızca bir kez indirilebilir.
   - Sayfadaki **Key ID** ve **Issuer ID** değerlerini not et.
4. Uygulamanın **Özellikler** bölümünden **Game Center**'ı aç.

---

## Adım 4 — GitHub'a gizli bilgileri ekle

**github.com/n8br6ny2h2-lab/youtube** sayfasında **Settings > Secrets and variables > Actions > New repository secret** yolunu izle. Her satır ayrı bir gizli ayar:

| Name | Secret (ne yapıştırılacak) |
|---|---|
| `ANDROID_KEYSTORE_B64` | Claude'un verdiği `upload.jks.base64.txt` içeriğinin tamamı |
| `ANDROID_KEYSTORE_PASSWORD` | `GITHUB-GIZLI-AYARLAR.txt` dosyasındaki şifre |
| `ANDROID_KEY_PASSWORD` | aynı şifre |
| `ANDROID_KEY_ALIAS` | `efsun-upload` |
| `GOOGLE_SERVICES_JSON` | google-services.json dosyasının tüm içeriği |
| `GOOGLE_SERVICE_INFO_PLIST` | GoogleService-Info.plist dosyasının tüm içeriği |
| `APPLE_TEAM_ID` | Team ID |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8` | .p8 dosyasının tüm içeriği (`-----BEGIN PRIVATE KEY-----` satırı dahil) |

Gizli ayarlar şifrelenir; repo herkese açık olsa da kimse göremez.

---

## Adım 5 — Derle

**Actions > Mobil Derleme** bölümünde son çalıştırmayı aç ve **Re-run all jobs** de (ya da Claude'a "derlemeyi yeniden başlat" yaz). 15-25 dakika sonra:

- **iPhone:** Derleme otomatik olarak **TestFlight**'a yüklenir. iPhone'a **TestFlight** uygulamasını kur ve oyunu kendi telefonunda dene.
- **Android:** Çalıştırma sayfasının altındaki **Artifacts** bölümünden `efsun-avcisi-android-…` dosyasını indir. Dosyalar uygulamasında zip'e dokununca açılır; içinden **.aab** dosyası çıkar.

---

## Adım 6 — Mağazalara gönder

### Google Play
1. Play Console > **Uygulama oluştur:** Ad, varsayılan dil Türkçe, **Oyun**, **Ücretsiz**.
2. **Test > Kapalı test > Yeni sürüm** bölümüne .aab dosyasını yükle ve 12 test kullanıcısını ekle.
3. **Mağaza girişi:** Metinler `store/LISTING.md`'de, görseller `store/google-play/` klasöründe.
4. **Uygulama içeriği:** Gizlilik politikası, reklamlar (Evet), hedef kitle (13+), Veri güvenliği (`store/RELEASE.md` §8) ve İçerik derecelendirmesi formlarını doldur.
5. **Para kazanma > Ürünler:** Ürünleri `store/RELEASE.md` §5'teki kimliklerle oluştur.
6. 14 gün kapalı testten sonra **Üretim** için erişim başvurusu yap ve yayınla.

### App Store
1. App Store Connect > uygulaman > **1.0 hazırlanıyor**.
2. Ekran görüntülerini (`store/app-store/`), metinleri, gizlilik politikası adresini, yaş derecelendirmesini ve App Privacy bilgilerini gir.
3. **Uygulama içi satın almalar:** `store/RELEASE.md` §5'teki tabloya göre oluştur.
4. **Derleme** bölümünde TestFlight'taki derlemeyi seç. İnceleme notunu (`store/RELEASE.md` §7) yapıştır ve **İncelemeye gönder**'e dokun. İnceleme genelde 1-2 gün sürer.

---

## Bunları Claude yapabilir
- Derlemeyi başlatmak, hata çıkarsa logları okuyup düzeltmek
- Gizlilik politikasını adınla doldurmak ve herkese açık bir adreste yayınlamak
- AdMob kimliklerini, bulut sunucusu adresini ve Play Oyunlar kimliğini koda işlemek
- Mağaza metinlerini, görselleri ve ürün fiyatlarını değiştirmek
