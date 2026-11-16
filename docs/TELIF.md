# Telif kontrolü (her video için zorunlu)

Bu kontrolü Claude yapar ve her videonun `yukleme.md` dosyasına "Görüntü kaynakları ve lisanslar" bölümü olarak yazar. Bir klibin lisansı doğrulanamıyorsa kullanılmaz.

## Kullanılabilir kaynaklar
| Kaynak | Lisans | Ticari kullanım | Kaynak gösterme | Not |
|---|---|---|---|---|
| Pixabay | Pixabay Content License | Evet | Gerekmez (yazarı yazarız) | "ai generated" etiketli ve yapay zekâ üretimi görünenler kullanılmaz |
| Pexels | Pexels License | Evet | Gerekmez (yazarı yazarız) | API anahtarı gerekiyor |
| Mixkit | Mixkit Free License | Evet | Gerekmez | Tek başına, değiştirilmeden satılamaz; videoda kullanmak serbest |
| NASA (SVS, images.nasa.gov) | Genelde kamu malı | Evet | Önerilir | NASA logosu "onay" izlenimi verecek şekilde kullanılmaz; "Credit" satırında üçüncü taraf yazıyorsa kullanılmaz |
| ESA/Hubble, ESA/Webb, ESO | CC BY 4.0 | Evet | **Zorunlu** (ekranda ve açıklamada) | |
| NPS, USFWS, NOAA (ABD hükümeti) | Kamu malı (ABD hükümeti çalışması) | Evet | Önerilir | Sayfada "©" ya da üçüncü taraf fotoğrafçı yazıyorsa kullanılmaz |
| Wikimedia Commons | Dosyaya göre değişir | Sadece "Public domain", "CC0", "CC BY", "CC BY-SA" | CC BY / BY-SA'da **zorunlu** | "NC" (ticari değil) ve "ND" (değiştirilemez) lisanslar kullanılmaz; her dosyanın lisansı tek tek kontrol edilir |

## Asla kullanılmaz
- Başkasının YouTube, TV, Netflix, BBC, National Geographic vb. belgeselleri ya da bunlardan parçalar (ses değiştirmek, aynalamak, kırpmak da dahil).
- YouTube'daki "Creative Commons" işaretli videolar (lisansı doğrulamak zor, Content ID riski).
- Lisansı belirsiz, sosyal medyadan indirilmiş ya da "telifsiz" olduğu sadece iddia edilen görüntüler.
- Ticari müzik. Müzik ve efektler kendi ürettiğimiz (`tools/`).

## Her videoda
1. Kullanılan her klip için: kaynak, ID ya da URL, yazar, lisans. `kaynaklar.json` + `yukleme.md`.
2. CC BY kaynaklar ekranda ve açıklamada belirtilir.
3. Videonun büyük kısmı **bizim katkımız** olmalı: özgün senaryo, anlatım, kurgu, grafik ve bilgi. Görüntüler sadece malzeme (YouTube "yeniden kullanılan içerik" kuralı).
4. Content ID hak talebi gelirse: `kaynaklar.json`'daki lisansla itiraz edilir.
