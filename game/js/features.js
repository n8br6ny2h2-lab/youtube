// Özellik anahtarları — tek kaynak. Hem oyun hem de yerel derleme betikleri (scripts/) buradan okur.
// App Store ilk sürümü: hesap bağlama (Firebase) ve reklam (AdMob) kapalı.
//   accounts: true  → Game Center / Apple / Google ile giriş, kendi sunucunda bulut kaydı ve sıralama (server/cloud.mjs)
//   apple: true     → yalnızca "Apple ile Giriş" + bulut kaydı (Firebase Firestore, sunucu gerekmez)
//                     Bulut derlemesi GOOGLE_SERVICE_INFO_PLIST gizli ayarını bulursa bunu kendiliğinden açar
//                     (bkz. store/APPLE-GIRIS-KURULUM.md). Elle açmana gerek yok.
//   ads: true       → ödüllü reklamlar ve VIP/Reklamsız ürünü (AdMob hesabı gerekir)
// Kapalıyken ilgili eklentiler uygulama paketine hiç eklenmez (scripts/features.mjs).
export const FEATURES = { accounts: false, apple: false, ads: false };
