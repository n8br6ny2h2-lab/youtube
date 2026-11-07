# App Store'a Sadece Telefonla Yayın — Efsun Avcısı 1.0

Bu ilk sürüm **hesap bağlama ve reklam olmadan** yayınlanıyor; ikisi sonraki güncellemede gelecek. Böylece Firebase ve AdMob kurulumuna gerek kalmıyor ve oyun hiç kişisel veri toplamıyor. Derlemeyi GitHub'ın Mac bilgisayarları yapıyor; senin bilgisayara ihtiyacın yok.

> 💡 Apple'ın web sayfaları telefonda dar görünürse Safari'de **aA > Masaüstü web sitesini iste** seçeneğini aç.

| # | Adım | Süre | Kim |
|---|---|---|---|
| 1 | Apple Developer hesabı | 10 dk + 1-2 gün onay | Sen |
| 2 | Gizlilik ve destek sayfaları | 2 dk | Sen bilgileri verirsin, Claude yapar |
| 3 | App ID + App Store Connect uygulaması | 10 dk | Sen |
| 4 | API anahtarı + GitHub gizli ayarları | 10 dk | Sen |
| 5 | Derleme → TestFlight | 20 dk | Claude başlatır |
| 6 | Uygulama içi ürünler | 20 dk | Sen |
| 7 | Mağaza sayfası + incelemeye gönder | 20 dk | Sen |

---

## 1. Apple Developer hesabı (yıllık 99 $)
1. App Store'dan **Apple Developer** uygulamasını indir.
2. **Hesap > Şimdi Kaydol** yolunu izle, Apple kimliğinle gir. Hesap türü: **Bireysel**. Mağazada geliştirici adı olarak gerçek adın görünür.
3. Kimlik kartının fotoğrafını çek ve ödemeyi yap.
4. Onay e-postası gelince **developer.apple.com/account** adresinde **Membership details > Team ID** değerini not et (10 karakter).
5. **App Store Connect > İşletme (Business)** bölümünde **Ücretli Uygulamalar** sözleşmesini kabul et; banka ve vergi bilgilerini gir. Bu yapılmadan uygulama içi satın almalar çalışmaz.

## 2. Gizlilik politikası ve destek sayfası
Claude'a şunları yaz: **ad soyad, destek e-postası, şehir**. Claude sayfaları doldurur ve herkese açık bir adreste yayınlar. Sana iki adres verilir:
- Gizlilik Politikası URL'si
- Destek URL'si

## 3. App ID ve uygulama kaydı
1. **developer.apple.com/account > Certificates, IDs & Profiles > Identifiers > +** ile **App IDs > App** seç.
   - Description: `Efsun Avcisi`
   - Bundle ID: **Explicit** `com.efsunavcisi.game`
   - Ek yetenek seçme (Uygulama İçi Satın Alma zaten açık gelir).
2. **appstoreconnect.apple.com > Uygulamalar > + > Yeni Uygulama:**
   - Platform: iOS
   - Ad: `Efsun Avcısı: Aksiyon RPG`
   - Birincil dil: Türkçe
   - Paket kimliği: az önce açtığın `com.efsunavcisi.game`
   - SKU: `efsun001`
   - Kullanıcı erişimi: Tam erişim

## 4. API anahtarı ve GitHub gizli ayarları
1. App Store Connect'te **Kullanıcılar ve Erişim > Entegrasyonlar > App Store Connect API > Ekip Anahtarları > +** yolunu izle. Ad `github`, erişim **Admin**.
2. **API anahtarını indir.** ⚠️ Bu dosya yalnızca bir kez indirilebilir. Dosyalar uygulamasında `AuthKey_XXXX.p8` dosyasını aç ve tüm içeriğini kopyala.
3. Aynı sayfadaki **Key ID** ve en üstteki **Issuer ID** değerlerini not et.
4. **github.com/n8br6ny2h2-lab/youtube** sayfasında **Settings > Secrets and variables > Actions > New repository secret** yolunu izle ve şu 4 gizli ayarı ekle:

| Name | Secret |
|---|---|
| `APPLE_TEAM_ID` | Team ID (1. adım) |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8` | .p8 dosyasının tüm içeriği (`-----BEGIN PRIVATE KEY-----` satırından `-----END PRIVATE KEY-----` satırına kadar) |

Gizli ayarlar şifrelenir; repo herkese açık olsa da kimse göremez.

## 5. Derleme → TestFlight
Claude'a "**derlemeyi başlat**" yaz. Bulut Mac'i uygulamayı imzalar ve App Store Connect'e yükler. İşlenmesi 10-30 dakika sürer.
- iPhone'a **TestFlight** uygulamasını kur. App Store Connect > uygulaman > **TestFlight** bölümünde kendini iç test kullanıcısı olarak ekle ve oyunu kendi telefonunda dene.
- Sorun çıkarsa Claude derleme loglarını okuyup düzeltir.

## 6. Uygulama içi satın almalar
App Store Connect > uygulaman > **Para Kazanma > Uygulama İçi Satın Almalar > +**. Ürün kimlikleri **birebir** aynı olmalı:

| Ürün kimliği | Tür | Referans ad | Fiyat (TR) |
|---|---|---|---|
| `gems_80` | Tüketilebilir | 80 Elmas | ₺29,99 |
| `gems_500` | Tüketilebilir | 500 Elmas | ₺149,99 |
| `gems_1200` | Tüketilebilir | 1200 Elmas | ₺299,99 |
| `gems_2600` | Tüketilebilir | 2600 Elmas | ₺599,99 |
| `gems_7000` | Tüketilebilir | 7000 Elmas | ₺1.499,99 |
| `kit_starter` | Tüketilmeyen | Başlangıç Kiti | ₺49,99 |
| `kit_dragon` | Tüketilmeyen | Ejder Hükümdarı Kiti | ₺399,99 |
| `kit_enchanter` | Tüketilebilir | Büyük Efsuncu Kiti | ₺199,99 |
| `kit_nyx` | Tüketilmeyen | Gölge Cadısı Kiti | ₺299,99 |
| `kit_mythic` | Tüketilmeyen | Mitik Savaş Lordu Kiti | ₺999,99 |

**Abonelikler > Yenilenmeyen Abonelikler** bölümünde ayrıca şunları aç:

| Ürün kimliği | Referans ad | Fiyat (TR) |
|---|---|---|
| `monthly_card` | Aylık Kart | ₺99,99 |
| `battle_pass` | Efsun Bileti | ₺199,99 |

`vip_noads` ürününü **oluşturma**; reklam olmadığı için bu sürümde gizli.

Her ürün için Türkçe görünen ad ve açıklama gir (metinler `js/data.js` içinde). İnceleme ekran görüntüsü olarak oyundaki mağaza ekranının görüntüsünü kullanabilirsin.

## 7. Mağaza sayfası ve incelemeye gönderme
App Store Connect > uygulaman > **iOS Uygulaması 1.0**:

1. **Ekran görüntüleri:** `store/app-store/screenshot-1..6.png` dosyalarını 6,9" iPhone alanına yükle. GitHub'da dosyayı açıp **Download** ile telefona indirebilirsin.
2. **Metinler:** Tanıtım metni, açıklama, anahtar kelimeler ve alt başlık `store/LISTING.md` dosyasında hazır.
3. **Destek URL'si** ve **Gizlilik Politikası URL'si:** 2. adımda verilen adresler.
4. **Uygulama Gizliliği:** **"Veri toplamıyoruz"** seç. Bu sürüm hiç veri toplamıyor ve hiçbir sunucuya veri göndermiyor.
5. **Yaş derecelendirmesi:**
   - Çizgi film veya fantastik şiddet: **Seyrek/Hafif**
   - Kumar: **Hayır**
   - Rastgele ödüller ("Loot box"): **Evet**
   - Diğer tüm sorular: **Hayır**
6. **Kategori:** Oyunlar > Aksiyon (ikincil: Rol Yapma). **Telif hakkı:** `2026 Adın Soyadın`
7. **Fiyat:** Ücretsiz. **Bulunabilirlik:** Tüm ülkeler (oyun Türkçe olsa da yayınlanabilir) ya da sadece Türkiye.
8. **Derleme:** TestFlight'taki derlemeyi seç. **Uygulama İçi Satın Almalar** bölümünde 6. adımdaki ürünleri bu sürüme ekle.
9. **Uygulama İnceleme Bilgileri:** İletişim bilgilerini gir. Oturum açma gerekmez. Not alanına şunu yapıştır:
```
Efsun Avcısı is a single-player action RPG. No login is required; tap "OYNA" on the title screen to play.
This version has no account system and no advertising; the app collects no data.
In-app purchases are in the "Mağaza" (Shop) tab. Loot box odds are shown via the "%" button on each chest.
monthly_card and battle_pass are Non-Renewing Subscriptions (they do not auto-renew).
Progress can be backed up with a code via Main Menu > Hesap. The UI is in Turkish.
```
10. **İncelemeye gönder.** İnceleme genelde 24-48 saat sürer. Onaylanınca **Yayınla**'ya dokun ya da otomatik yayın seç.

---

### Apple reddederse
Ret mesajını Claude'a yapıştır. En sık nedenler: eksik metadata, ürün açıklamalarının eksik olması ya da satın alma sözleşmesinin imzalanmamış olması.

### Sonraki güncelleme (hesap + reklam)
`js/features.js` dosyasında iki anahtarı `true` yap, Firebase ve AdMob'u kur (`store/TELEFONDAN-YAYIN.md` Adım 2), sürümü 1.1.0 yap ve derle.
