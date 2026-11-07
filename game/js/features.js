// Özellik anahtarları — tek kaynak. Hem oyun hem de yerel derleme betikleri (scripts/) buradan okur.
// App Store ilk sürümü: hesap bağlama (Firebase) ve reklam (AdMob) kapalı.
//   accounts: true  → Game Center / Apple / Google ile giriş, bulut kaydı, sıralama (Firebase kurulumu gerekir)
//   ads: true       → ödüllü reklamlar ve VIP/Reklamsız ürünü (AdMob hesabı gerekir)
// Kapalıyken ilgili eklentiler uygulama paketine hiç eklenmez (scripts/features.mjs).
export const FEATURES = { accounts: false, ads: false };
