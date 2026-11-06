// Makbuz doğrulama sunucusu (isteğe bağlı ama önerilir): sahte/hileli satın alımların ödül almasını engeller.
// İstemci: js/services.js → VALIDATOR_URL = 'https://sunucunuz/validate'
// cordova-plugin-purchase bu adrese POST eder; biz Google / Apple'a sorup sonucu döneriz.
//
// Kurulum:  cd server && npm install && npm start
// Ortam değişkenleri:
//   PORT=8787
//   PACKAGE_NAME=com.pofirush.game                         (Android paket adı = iOS bundle id)
//   GOOGLE_APPLICATION_CREDENTIALS=./google-service.json   (Play Console > Ayarlar > API erişimi; servis hesabına "Finansal verileri görüntüleme" izni)
//   APPLE_KEY_ID=XXXXXXXXXX  APPLE_ISSUER_ID=uuid  APPLE_KEY_FILE=./SubscriptionKey_XXXX.p8  (App Store Connect > Kullanıcılar ve Erişim > Entegrasyonlar > In-App Purchase)
//   APPLE_APP_ID=1234567890                                (App Store'daki sayısal uygulama kimliği; üretimde zorunlu)
//   APPLE_ENV=Production | Sandbox
//   Apple kök sertifikaları: ./certs/*.cer (https://www.apple.com/certificateauthority/ → AppleRootCA-G3.cer, AppleRootCA-G2.cer)
import express from 'express';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { google } from 'googleapis';
import { AppStoreServerAPIClient, Environment, ReceiptUtility, SignedDataVerifier } from '@apple/app-store-server-library';

const PKG = process.env.PACKAGE_NAME || 'com.pofirush.game';
const PRODUCTS = new Set(['pofi_noads', 'pofi_starter', 'pofi_doubler', 'pofi_legends', 'pofi_coins_s', 'pofi_coins_m', 'pofi_coins_l']);
const app = express();
app.use(express.json({ limit: '300kb' }));
app.use((req, res, next) => { res.set('Access-Control-Allow-Origin', '*').set('Access-Control-Allow-Headers', 'Content-Type'); if (req.method === 'OPTIONS') return res.sendStatus(204); next(); });

const fail = (res, message, code = 6778003) => res.json({ ok: false, code, message });
const okRes = (res, body, extra = {}) => res.json({ ok: true, data: { id: body.id, latest_receipt: true, transaction: body.transaction, ...extra } });

// ---------- Google Play ----------
const publisher = google.androidpublisher({ version: 'v3', auth: new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] }) });
async function verifyGoogle(body) {
  const t = body.transaction || {};
  let token = t.purchaseToken, productId = body.id;
  if (!token && t.receipt) { try { const r = JSON.parse(t.receipt); token = r.purchaseToken; productId = r.productId || productId; } catch { /* */ } }
  if (!token || !PRODUCTS.has(productId)) return { ok: false, message: 'Eksik veya bilinmeyen makbuz' };
  const { data } = await publisher.purchases.products.get({ packageName: PKG, productId, token });
  // purchaseState: 0 = ödendi, 1 = iptal, 2 = beklemede
  if (data.purchaseState !== 0) return { ok: false, message: 'Ödeme tamamlanmadı' };
  return { ok: true, extra: { productId, orderId: data.orderId } };
}

// ---------- App Store ----------
let apple = null;
function appleSetup() {
  if (apple !== null) return apple;
  const { APPLE_KEY_ID, APPLE_ISSUER_ID, APPLE_KEY_FILE } = process.env;
  const env = process.env.APPLE_ENV === 'Sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
  const certs = existsSync('./certs') ? readdirSync('./certs').filter(f => f.endsWith('.cer')).map(f => readFileSync('./certs/' + f)) : [];
  if (!APPLE_KEY_ID || !APPLE_ISSUER_ID || !APPLE_KEY_FILE || !certs.length) { apple = false; return apple; }
  const appId = process.env.APPLE_APP_ID ? Number(process.env.APPLE_APP_ID) : undefined;
  apple = {
    client: new AppStoreServerAPIClient(readFileSync(APPLE_KEY_FILE, 'utf8'), APPLE_KEY_ID, APPLE_ISSUER_ID, PKG, env),
    verifier: new SignedDataVerifier(certs, true, env, PKG, appId),
  };
  return apple;
}
async function verifyApple(body) {
  const A = appleSetup();
  if (!A) return { ok: false, message: 'Apple doğrulaması yapılandırılmadı (APPLE_* ortam değişkenleri ve certs/)' };
  const t = body.transaction || {};
  let signed = t.jwsRepresentation; // StoreKit 2
  if (!signed) {
    const txId = t.appStoreReceipt ? new ReceiptUtility().extractTransactionIdFromAppReceipt(t.appStoreReceipt) : null;
    if (!txId) return { ok: false, message: 'Makbuzda işlem bulunamadı' };
    signed = (await A.client.getTransactionInfo(txId)).signedTransactionInfo;
  }
  const tx = await A.verifier.verifyAndDecodeTransaction(signed);
  if (tx.bundleId !== PKG || tx.revocationDate) return { ok: false, message: 'Geçersiz veya iade edilmiş işlem' };
  if (!PRODUCTS.has(tx.productId)) return { ok: false, message: 'Bilinmeyen ürün' };
  return { ok: true, extra: { productId: tx.productId, transactionId: tx.transactionId } };
}

app.post('/validate', async (req, res) => {
  const body = req.body || {};
  try {
    const type = body.transaction?.type;
    const r = type === 'android-playstore' ? await verifyGoogle(body)
      : (type === 'ios-appstore' || type === 'apple-sk2') ? await verifyApple(body)
        : { ok: false, message: 'Bilinmeyen platform' };
    if (!r.ok) return fail(res, r.message);
    console.log(new Date().toISOString(), 'OK', type, r.extra);
    okRes(res, body, r.extra);
  } catch (e) {
    console.error(e?.message || e);
    // Ağ / Google / Apple hatasında 6778001: eklenti daha sonra yeniden dener, oyuncu ödülünü kaybetmez
    res.json({ ok: false, code: 6778001, message: 'Doğrulama geçici olarak yapılamadı' });
  }
});
app.get('/health', (req, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 8787, () => console.log('Doğrulama sunucusu hazır :' + (process.env.PORT || 8787)));
