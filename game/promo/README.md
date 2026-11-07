# Instagram Tanıtım Videoları

Üç kısa reklam videosu üretilir. Her biri **9:16** (Reels/Hikâye, 1080×1920) ve **4:5** (akış, 1080×1350) boyutunda, ~17 saniye, sesli, 30 FPS:

| Video | Kanca (ilk saniye) | Akış |
|---|---|---|
| `boss` | "Bu boss'u yenebilir misin? 😱" | Kalabalık savaş → Gölge Ejder gelir → kırmızı alandan kaçış → yavaş çekim zafer |
| `guc` | "Güç: 3.316 😐" | Efsane Sandık → MİTİK! → "En İyisini Giy" → güç uçar → düşmanlar tek vuruş |
| `kombo` | "Ekranda 90 düşman… 😳" | Bıçaklar, yıldırım, meteorlar → kombo → "Hangisini seçerdin? 👇" → 300+ KOMBO |

Üretmek için: `bash promo/render.sh`. Kapanış kartındaki yazıyı değiştirmek için `PROMO_CTA="Şimdi indir • App Store" bash promo/render.sh` kullan.

**Nasıl çalışır?** `capture.cjs` oyunu tarayıcıda açar ve oyunun saatini dışarıdan ilerletir. Böylece her kare tek tek çekilir; kare atlaması ya da takılma olmaz. Yazılar oyunun kendi yazı tipiyle sahnenin üstüne çizilir. `audio.py` oyunun müziğini aynı akor ve tempoyla üretir ve efektleri sahne olaylarına senkronlar.

## Reklam kuralları için notlar
- **Gerçek oynanış:** Görüntüler gerçek oyundan alınıyor. Sahneleme için geç oyun bir oyuncu profili kullanılıyor (Mitik/Efsanevi eşyalar, yüksek seviye). Bu ilerleme oyunda gerçekten mümkün; Mitik sandık sahnesi de oyunun gerçek şans koruması kuralıyla çıkıyor. Kartta "Oyun içi görüntüler" notu var.
- **Güvenli alan:** Yazılar Meta'nın Reels güvenli alanında. Üst %14 ve alt %35'e yazı konmadı, çünkü oralarda Instagram'ın kendi arayüzü duruyor.
- **Yayın sırası:** "Uygulama yükleme" reklamları için uygulamanın App Store'da **yayında** olması gerekir; reklam, mağaza bağlantısına yönlenir. Yayından önce bu videolar sadece "çok yakında" gönderisi olarak kullanılabilir. O durumda `PROMO_CTA="Çok yakında App Store'da"` ile yeniden üret.
