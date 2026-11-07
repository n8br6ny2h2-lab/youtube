# 🍎 Apple ile Giriş + Bulut Kaydı Kurulumu

Bu kurulum bitince oyunda **Ana Menü > Hesap**'ta "Apple ile Giriş Yap" düğmesi çıkar. Giriş yapan oyuncunun ilerlemesi buluta kaydedilir (3 dakikada bir otomatik) ve yeni iPhone'da aynı Apple hesabıyla giriş yapınca geri gelir. İlk girişte 200 💎 hediye.

- **Ücret:** yok. Firebase'in ücretsiz planı (Spark) yeter; kredi kartı istemez.
- **Sunucu:** kiralaman gerekmez. Kayıtlar Google Firebase'te (Firestore) tutulur.
- **Süre:** telefondan yaklaşık 20 dakika.
- **Kod:** hazır. GitHub'a Firebase dosyasını ekleyince bulut derlemesi özelliği **kendiliğinden açar**.

> Apple Developer hesabın onaylanmış ve App ID (`com.efsunavcisi.game`) oluşturulmuş olmalı (`APP-STORE-YAYIN.md` 3. adım).

---

## 1. Firebase projesi aç
1. Tarayıcıda **console.firebase.google.com** → Google hesabınla gir.
2. **Proje oluştur** → ad: `efsun-avcisi` → Google Analytics: **kapalı** → Oluştur.

## 2. iOS uygulamasını ekle ve dosyayı al
1. Proje ana sayfasında **iOS** simgesine dokun.
2. **Apple paket kimliği:** `com.efsunavcisi.game` (tam olarak böyle) → Uygulamayı kaydet.
3. **GoogleService-Info.plist** dosyasını indir. Diğer adımları ("SDK ekle" vb.) **atla**, kod hazır.

## 3. Apple ile girişi aç
1. Sol menü **Derleme (Build) > Authentication** → **Başlayın**.
2. **Sign-in method** → **Apple** → **Etkinleştir** → Kaydet. (iPhone uygulaması için Services ID ve anahtar alanlarını boş bırakabilirsin.)

## 4. Bulut kaydı veritabanını aç
1. Sol menü **Derleme > Firestore Database** → **Veritabanı oluştur**.
2. Konum: **eur3 (europe-west)** → **Üretim modunda başlat** → Oluştur.
3. Üstte **Kurallar (Rules)** sekmesi → içindekinin tamamını sil, şunu yapıştır → **Yayınla**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /saves/{uid} {
      allow read, delete: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid
        && request.resource.data.save is string && request.resource.data.save.size() < 900000;
    }
  }
}
```
Bu kural her oyuncunun **yalnızca kendi** kaydını okuyup yazabilmesini sağlar.

## 5. Dosyayı GitHub'a gizli ayar olarak ekle
1. İndirdiğin `GoogleService-Info.plist` dosyasını **Dosyalar** uygulamasında aç (metin olarak görünür) → tamamını kopyala.
   - Açılmazsa: dosyayı kendine e-postayla gönder, bilgisayarda Not Defteri/TextEdit ile aç.
2. GitHub → `youtube` deposu → **Settings > Secrets and variables > Actions > New repository secret**
   - Ad: `GOOGLE_SERVICE_INFO_PLIST`
   - Değer: kopyaladığın metnin tamamı → **Add secret**.

## 6. Apple tarafı
- **developer.apple.com > Identifiers > com.efsunavcisi.game** → **Sign In with Apple** kutusunu işaretle → Save.
  (Bulut derlemesi otomatik imzalamada bunu kendisi de yapmaya çalışır; elle işaretlemek garanti olur.)

## 7. Derle ve dene
GitHub → **Actions > Mobil Derleme > Run workflow**. Derleme TestFlight'a gelince oyunda **Hesap > Apple ile Giriş Yap**'ı dene, sonra **☁️ Kaydet** / **⬇️ Yükle**'yi dene.

## 8. Mağazaya göndermeden önce (önemli)
Apple ile giriş açılınca oyun kişisel veri işlemeye başlar. Mağaza incelemesine göndermeden önce:
1. **App Store Connect > Uygulama Gizliliği** bölümünü güncelle:
   - **Tanımlayıcılar > Kullanıcı Kimliği:** toplanır, kimliğe bağlı, amaç: Uygulama İşlevi, izleme için **kullanılmaz**.
   - **Kullanıcı İçeriği > Oyun İçeriği:** toplanır, kimliğe bağlı, amaç: Uygulama İşlevi.
2. Gizlilik sayfasının sürüm notunu güncellemek için Claude'a **"Apple girişini kalıcı aç ve gizlilik sayfasını güncelle"** de. (`js/features.js` içinde `apple: true` yapılır, `npm run legal-fill` ile sayfa yenilenir ve herkese açık kopya da güncellenir.)
3. Hesap silme hazır: **Hesap > Hesabı sil** buluttaki kaydı siler, Apple jetonunu iptal eder ve hesabı kaldırır (Apple yönergesi 5.1.1(v)).

---

**Notlar**
- Sıralama (leaderboard) bu modda yok; kendi sunucu gerektirir (`server/cloud.mjs`, `features.js` → `accounts`).
- Tarayıcı demosunda gerçek Apple girişi yapılamaz; "Test" bağlantısı oluşur ve bulut düğmeleri kapalı kalır.
- Derleme hata verirse Actions kaydındaki son 40 satırı Claude'a gönder.
