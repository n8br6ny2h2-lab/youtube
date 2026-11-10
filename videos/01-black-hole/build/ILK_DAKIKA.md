# Video 1: ilk dakika nasıl yapıldı (yeniden üretmek için)

Çıktı: 58 sn, 1920x1080, 30 fps, -14 LUFS. Video dosyası repoda değil (GitHub'a büyük dosya konmaz); bu tarifle yeniden üretilir.

## Ses
- ElevenLabs, voice_id JBFqnCBsd6RMkjVDRZzb (George), model eleven_multilingual_v2, `/with-timestamps` uç noktası.
- Metin: script.md'deki "Hook" + "What is a black hole?" bölümleri (836 karakter, ~53 sn).
- Logo için 24.85. saniyeden sonra 2.55 sn boşluk eklendi.

## Sahneler (çıktı zamanı)
| Süre | Klip | Kaynak / kesit |
|---|---|---|
| 0-4.6 | Samanyolu | Mixkit 1610 (assets.mixkit.co/videos/1610/1610-2160.mp4), hafif kaydırma |
| 4.6-11 | Kara delik diski | NASA SVS 13326 Black_Hole_Accretion_Disk_Sim_4k.mp4, 2-8.4 sn, crop 3840x2160 y=840 |
| 11-15.3 | Dalış | NASA SVS 14576 14576_BH_Plunge_Zoom2b_4k60.mp4, 26-30.3 sn (zayıf, değiştirilecek) |
| 15.3-24.9 | Sgr A* yıldızları + sorular | ESO eso1825e (cdn.eso.org/videos/ultra_hd/eso1825e.mp4), 0-9.6 sn |
| 24.9-27.4 | Logo | brand/kavcilab_logo_yazili.png |
| 27.4-33.2 | "Huge mass → tiny space" | gfx_2d.py (G1) |
| 33.2-40 | Süpernova | NASA SVS 20413 SN_HQ_Full_H264_V001.mp4, 4-10.8 sn |
| 40-55.8 | Uzay-zaman ızgarası, olay ufku | gfx_2d.py (G2) |
| 55.8-58 | Disk, kararma | NASA SVS 13326, 10-12.2 sn |

Kaynak yazıları: "Visualization: NASA Goddard / J. Schnittman", "Credit: ESO/MPE", "Animation: NASA Goddard Space Flight Center".
Son kodlama: libx264 -b:v 12M, filigran sağ altta 72 px, loudnorm I=-14.
