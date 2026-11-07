# Pofi Rush — App Store yayın rehberi

Bu rehberi sırayla izleyin. Her adımda App Store Connect'e girilecek değerler hazır. Göndermeden önce `npm run preflight` komutu **❌ 0** göstermeli.

---

## 0. Gerekenler

| Gereken | Not |
|---|---|
| Apple Developer Program üyeliği | Yıllık 99 $. developer.apple.com/programs. Şirket adına açacaksanız D-U-N-S numarası gerekir |
| Mac + Xcode'un en güncel sürümü | Apple, yüklemelerin güncel iOS SDK'sıyla derlenmesini zorunlu tutuyor; eski Xcode ile yükleme reddedilir |
| Ücretli Uygulamalar Sözleşmesi | App Store Connect › İşletme bölümünde sözleşmeyi imzalayın, banka ve vergi bilgilerini girin. **Bu adım yapılmazsa satın almalar çalışmaz** ve inceleme reddedilir |
| AdMob hesabı | admob.google.com: iOS uygulaması ekleyin, 1 ödüllü + 1 geçiş reklam birimi açın |
| Herkese açık 2 adres | Gizlilik politikası (`privacy-policy.md` dosyasını yayınlayın) ve destek sayfası. GitHub Pages ücretsizdir |

## 1. Kodda doldurulacaklar (`npm run preflight` bunları kontrol eder)

1. `capacitor.config.json` → `appId`: ör. `com.sirketadi.pofirush`. Bu değer **sonradan değiştirilemez**, Apple'daki Bundle ID ile aynı olmalı
2. `js/config.js`:
   - `GAME.privacyUrl`, `GAME.termsUrl`, `GAME.supportEmail`
   - `GAME.iosUrl`: 4. adımda uygulamayı açınca gelen sayısal Apple ID ile `https://apps.apple.com/app/id1234567890`
   - `ADS.ios.rewarded`, `ADS.ios.interstitial`: AdMob reklam birimleri
   - `ADS.testing = false`
3. AdMob uygulama kimliği: `ADMOB_APP_ID_IOS=ca-app-pub-XXXX~YYYY npm run patch`
4. `store-listing/privacy-policy.md` içindeki `[ŞİRKET] [E-POSTA] [ADRES]` alanlarını doldurup yayınlayın
5. AdMob › Gizlilik ve mesajlaşma bölümünde **GDPR** mesajını ve **IDFA açıklama** mesajını oluşturup yayınlayın
6. Web sitenizin kökünde `app-ads.txt` yayınlayın (AdMob › Uygulamalar › app-ads.txt satırını verir)

## 2. Xcode'da derleme

```bash
cd pofirush
npm install
npm run native:init        # ilk sefer (ios/ zaten varsa: npm run build && npx cap sync ios && npm run patch)
npm run preflight          # ❌ 0 olmalı
npm run ios                # Xcode açılır
```

Xcode'da:
1. Sol üstte **App** projesi › **App** hedefi › **Signing & Capabilities**:
   - Team: geliştirici hesabınız. "Automatically manage signing" açık olsun
   - Bundle Identifier'ın `appId` ile aynı olduğunu kontrol edin
   - **+ Capability** › **In-App Purchase** ekleyin
2. **General** › Version `1.0.0`, Build `10000` (patch betiği doldurur; her yeni yüklemede Build artmalı)
3. Üst çubukta cihaz olarak **Any iOS Device (arm64)** seçin › **Product › Archive**
4. Organizer açılınca **Distribute App** › **App Store Connect** › **Upload**
5. Yükleme sonrası e-postada "ITMS-…" uyarısı gelirse 8. bölüme bakın

## 3. TestFlight ile telefonda deneyin (göndermeden önce şart)

App Store Connect › Uygulamanız › TestFlight › yüklenen derleme › kendinizi dahili test kullanıcısı olarak ekleyin.

Telefonda şunları kontrol edin:
- [ ] İlk açılışta izleme izni (ATT) penceresi çıkıyor. AB'deyseniz önce reklam onayı formu çıkıyor
- [ ] Oyun 60 FPS akıcı, dokunma gecikmesi yok, çentik veya Dinamik Ada skoru kapatmıyor
- [ ] Ödüllü reklam (Devam et / 2× jeton) açılıyor ve ödül veriyor
- [ ] Ayarlar › Geliştirici › Sandbox hesabıyla **her ürünü** satın alın. Jetonlar ekleniyor, Reklamsız alınca geçiş reklamı kesiliyor
- [ ] Uygulamayı silip yeniden kurun › Mağaza › **Satın alımları geri yükle** → kalıcı ürünler geri geliyor
- [ ] Uçak modunda oyun açılıyor ve oynanıyor
- [ ] Sessiz tuşu açıkken ses davranışı kabul edilebilir

> Gerçek reklam kimlikleriyle kendi reklamlarınıza tıklamayın, AdMob hesabı askıya alınabilir. Test için cihazınızı AdMob › Ayarlar › Test cihazları bölümüne ekleyin.

## 4. App Store Connect: uygulamayı oluşturma

**Uygulamalar › + › Yeni Uygulama**

| Alan | Değer |
|---|---|
| Platform | iOS |
| Ad | `Pofi Rush: Tap & Fly` (alınmışsa `Pofi Rush: Sky Dash` gibi bir varyasyon) |
| Birincil dil | Türkçe (İngilizceyi sonra "Yerelleştirme" olarak ekleyin) |
| Paket kimliği | Xcode'daki Bundle ID |
| SKU | `POFIRUSH001` |
| Kullanıcı erişimi | Tam erişim |

**Uygulama Bilgileri**
- Alt başlık: TR `Sonsuz ve zor uçuş macerası` · EN `Endless, brutally hard flyer`
- Kategori: **Oyunlar › Arcade**, ikincil: **Oyunlar › Gündelik**
- İçerik hakları: "Üçüncü taraf içerik içermiyor". Tüm grafik ve sesler kodla üretilmiştir
- Yaş derecelendirmesi anketi: şiddet, korku, kumar, cinsellik, küfür, ilaç → **Yok**. Sınırsız web erişimi → Hayır. Kullanıcı tarafından üretilen içerik / sohbet → Hayır. Ödüllü sandık (loot box) → Hayır (satılan her şey önceden bellidir). Uygulama içi satın alma → Evet. Beklenen sonuç: **4+**
- Gizlilik politikası URL'si: `GAME.privacyUrl` ile aynı

**Fiyatlandırma ve Erişilebilirlik:** Ücretsiz · Tüm ülkeler

**App Privacy (Uygulama Gizliliği):** `listing.md` → "App Privacy" tablosunu birebir girin. Özet: Tanımlayıcılar (Cihaz kimliği), Kullanım verileri, Tanılama, Yaklaşık konum → reklam ve analiz, **İzleme için kullanılıyor: Evet** (AdMob, ATT izni verilirse); Satın alma geçmişi → uygulama işlevselliği. Hiçbiri kimliğe bağlı değil.

## 5. Uygulama içi satın almalar

**Gelir Sağlama › Uygulama İçi Satın Almalar › +**. Her ürün için: tür, referans adı, ürün kimliği, fiyat, TR ve EN görünen ad (en fazla 30 karakter) ve açıklama (en fazla 45 karakter). Ayrıca bir **inceleme ekran görüntüsü** ekleyin (oyundaki Mağaza ekranının görüntüsü yeterli).

| Ürün kimliği | Tür | Fiyat | Görünen ad TR / EN | Açıklama TR / EN |
|---|---|---|---|---|
| `pofi_noads` | Tüketilemez | 2,99 $ | Reklamsız / No Ads | Zorunlu reklamları kaldırır / Removes forced ads forever |
| `pofi_starter` | Tüketilemez | 1,99 $ | Başlangıç Paketi / Starter Pack | Reklamsız, 3000 jeton, Ejder / No ads, 3000 coins, Dragon |
| `pofi_doubler` | Tüketilemez | 3,99 $ | Jeton Çarpanı ×2 / Coin Doubler ×2 | Her oyunda iki kat jeton / Double coins every run |
| `pofi_legends` | Tüketilemez | 4,99 $ | Efsane Paketi / Legends Pack | 4 efsane kostüm / 4 legendary skins |
| `pofi_coins_s` | Tüketilebilir | 0,99 $ | Jeton Kesesi / Coin Pouch | 2.000 jeton / 2,000 coins |
| `pofi_coins_m` | Tüketilebilir | 2,99 $ | Jeton Sandığı / Coin Chest | 7.000 jeton / 7,000 coins |
| `pofi_coins_l` | Tüketilebilir | 7,99 $ | Jeton Hazinesi / Coin Hoard | 25.000 jeton / 25,000 coins |

Ülke fiyatlarını Apple dolar fiyatından otomatik hesaplar (Türkiye fiyatlarını isterseniz elle ayarlayabilirsiniz). İlk gönderimde **ürünlerin hepsini sürüm sayfasındaki "Uygulama İçi Satın Almalar" bölümüne ekleyin**, yoksa ürünler incelemeye girmez ve uygulama "satın alma çalışmıyor" gerekçesiyle reddedilir.

## 6. Sürüm sayfası (1.0 Gönderime Hazırlanıyor)

| Alan | Değer |
|---|---|
| iPhone 6.9" ekran görüntüleri | `screenshots/ios-tr-*.jpg` (TR) ve `screenshots/ios-en-*.jpg` (EN yerelleştirmesi) · 1290×2796 |
| iPad 13" ekran görüntüleri | `screenshots/ipad-tr-*.jpg` ve `ipad-en-*.jpg` · 2064×2752 |
| Tanıtım metni | `listing.md` → Tanıtım metni |
| Açıklama | `listing.md` → Uzun açıklama (TR / EN) |
| Anahtar kelimeler | `listing.md` → App Store anahtar kelimeleri |
| Destek URL'si | Destek sayfanız (zorunlu, e-posta adresi değil web adresi olmalı) |
| Pazarlama URL'si | İsteğe bağlı |
| Telif hakkı | `2026 Adınız veya Şirketiniz` |
| Derleme | TestFlight'ta denediğiniz derleme |
| Oturum açma gerekli mi | Hayır |
| İletişim bilgileri | Adınız, telefon, e-posta |
| Sürüm yayını | "Bu sürümü elle yayınla" (onaydan sonra kendiniz yayınlarsınız) |

**İnceleme notu (App Review Information › Notes), olduğu gibi yapıştırın:**
```
Pofi Rush is an original single-player arcade game. All art, characters and audio are generated in code by us.
No account or login is required. The game works fully offline.

Original features beyond the basic one-tap genre:
- 5 obstacle types (moving, breathing, shifting pillars with a warning, saw blades)
- 3 modes: Classic, Hardcore, and a seeded "Daily Route" where everyone plays the same map each day
- 5 biomes, power-ups (shield, magnet, slow time), perfect-pass combo system
- 13 skins with unique trails, daily rewards, missions and achievements

In-app purchases: pofi_noads, pofi_starter, pofi_doubler, pofi_legends (non-consumable);
pofi_coins_s, pofi_coins_m, pofi_coins_l (consumable). "Restore purchases" is in Shop and Settings.
Ads are served by Google AdMob. Consent (UMP) and App Tracking Transparency are requested on first launch.
Ratings use the system SKStoreReviewController prompt only.
```

## 7. Gönder

**İncelemeye Gönder** › Reklam kimliği (IDFA) sorusu: **Evet**, "Uygulama içinde reklam sunmak" ve "Kullanıcıyı izlemek (ATT izniyle)" seçeneklerini işaretleyin. İnceleme genelde 24–48 saat sürer.

---

## 8. Ret nedenleri ve projedeki önlemler

| Apple kuralı / uyarısı | Durum |
|---|---|
| **ITMS-91053** gizlilik bildirimi eksik | ✅ `PrivacyInfo.xcprivacy` (UserDefaults CA92.1) `npm run patch` ile projeye ekleniyor. Google ve Capacitor SDK'ları kendi bildirimlerini taşıyor |
| **5.1.2** izleme izni | ✅ Sadece izin hiç sorulmamışsa ATT penceresi çıkıyor, metin Info.plist'te var. Reddedilirse kişiselleştirilmemiş reklam gösteriliyor |
| **5.1.1** gizlilik politikası | ⚠ Adresi siz yayınlayıp `GAME.privacyUrl` alanına yazacaksınız. Uygulama içinde Mağaza ve Ayarlar ekranlarından açılıyor |
| **3.1.1** geri yükleme düğmesi | ✅ Mağaza ve Ayarlar ekranlarında var |
| **3.1.1** dijital ürün başka yoldan satılmıyor | ✅ Uygulamada sadece Apple ödemesi kullanılıyor |
| **5.6.1** özel puanlama penceresi yasak | ✅ Sadece `SKStoreReviewController` kullanılıyor (`@capacitor-community/in-app-review`) |
| **2.3.7 / 4.1** başka oyunun adını kullanmak, taklit | ✅ Başlıkta, açıklamada ve anahtar kelimelerde başka oyun adı yok (`preflight` kontrol ediyor). Karakter ve grafikler özgün |
| **4.3(a)** "spam / çok benzeri var" | ⚠ Bu türde en büyük risk bu. İnceleme notunda özgün özellikler listelendi. Reddedilirse Çözüm Merkezi'nden bu özellikleri vurgulayarak itiraz edin. Gerekirse ilk sürüme yeni bir mekanik ekleyip yeniden gönderin |
| **2.1** satın alma çalışmıyor | ⚠ Ücretli Uygulamalar Sözleşmesi imzalanmalı ve ürünler sürüme eklenmeli (5. bölüm) |
| **2.3.3** ekran görüntüleri gerçek uygulamayı göstermeli | ✅ Görüntüler oyunun kendisinden alındı. Üzerine başlık bandı eklemek serbest |
| **4.0** iPad'de bozuk görünüm | ✅ iPad 13" görüntüleri üretildi, yerleşim kontrol edildi, iPad'de tam ekran dikey |
| **Şifreleme uyumluluğu** sorusu | ✅ `ITSAppUsesNonExemptEncryption = false`, Apple soru sormaz |
| Simgede şeffaflık | ✅ 1024×1024 simgede alfa kanalı yok (`preflight` kontrol ediyor) |

## 9. Yayından sonra
- İlk hafta AdMob ve App Store Connect › Analizler bölümünden günlük kullanıcı, oyuncu tutma ve gelir verisini izleyin
- Yeni sürüm için `package.json` → `version` değerini artırın (ör. 1.0.1) › `npm run patch` › Xcode'da Archive
- Oyuncu yorumlarına App Store Connect › Puanlar ve Yorumlar bölümünden cevap verin
