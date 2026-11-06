// Makbuz doğrulama sunucusu (Google Play). Gerçek parayla satışta hile/sahte makbuzu engeller.
// cordova-plugin-purchase "store.validator" adresine POST eder; bu sunucu Google'a sorar ve sonucu döner.
//
// Kurulum:  npm i express googleapis
// Ortam:    GOOGLE_APPLICATION_CREDENTIALS=servis-hesabi.json  PACKAGE_NAME=com.efsunavcisi.game  PORT=8787
// Google Play Console > Kurulum > API erişimi bölümünden servis hesabına "Finansal veriler" izni verilmelidir.
// App Store için aynı uç noktaya Apple App Store Server API (@apple/app-store-server-library) doğrulaması eklenmelidir.
import express from 'express';
import { google } from 'googleapis';

const PACKAGE = process.env.PACKAGE_NAME || 'com.efsunavcisi.game';
const app = express();
app.use(express.json({ limit: '200kb' }));

const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
const publisher = google.androidpublisher({ version: 'v3', auth });
const seen = new Set(); // üretimde veritabanı kullanın (aynı token iki kez ödül vermesin)

app.post('/validate', async (req, res) => {
  try {
    const { id, transaction } = req.body || {};
    if (transaction?.type === 'android-playstore') {
      const receipt = JSON.parse(transaction.receipt || '{}');
      const token = receipt.purchaseToken;
      if (!token || !id) return res.json({ ok: false, code: 6778003, message: 'Eksik makbuz' });
      const r = await publisher.purchases.products.get({ packageName: PACKAGE, productId: id, token });
      const valid = r.data.purchaseState === 0; // 0 = ödendi
      if (!valid) return res.json({ ok: false, code: 6778003, message: 'Ödeme onaylanmadı' });
      if (seen.has(token)) return res.json({ ok: false, code: 6778003, message: 'Makbuz zaten kullanıldı' });
      seen.add(token);
      return res.json({ ok: true, data: { id, latest_receipt: true, transaction } });
    }
    if (transaction?.type === 'ios-appstore') {
      // TODO: App Store Server API ile transactionId doğrulaması
      return res.json({ ok: false, code: 6778003, message: 'iOS doğrulaması henüz yapılandırılmadı' });
    }
    res.json({ ok: false, code: 6778003, message: 'Bilinmeyen platform' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Doğrulama hatası' });
  }
});

app.listen(process.env.PORT || 8787, () => console.log('Doğrulama sunucusu hazır'));
