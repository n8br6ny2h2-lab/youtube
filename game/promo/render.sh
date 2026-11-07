#!/usr/bin/env bash
# Instagram tanıtım videolarını üretir: store/instagram/efsun-<video>-9x16.mp4 ve -4x5.mp4
# Kullanım: bash promo/render.sh [boss guc kombo]
# Kapanış kartı yazısı: PROMO_CTA="App Store'da ücretsiz" bash promo/render.sh
# 4K: PROMO_SCALE=6 bash promo/render.sh hikaye  → -4k-9x16.mp4 (2160x3840) + 4K'dan küçültülmüş -9x16.mp4 (1080x1920)
# Gerekenler: node + playwright (Chromium), python3 + numpy, ffmpeg
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEOS=("${@:-boss guc kombo}"); [ $# -eq 0 ] && VIDEOS=(boss guc kombo)
WORK="$(mktemp -d)"; OUT=store/instagram; mkdir -p "$OUT"
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; trap 'kill $SRV 2>/dev/null; rm -rf "$WORK"' EXIT; sleep 1
for v in "${VIDEOS[@]}"; do
  node promo/capture.cjs "$v" "$WORK/$v"
  python3 promo/audio.py "$WORK/$v/events.json" "$WORK/$v/audio.wav" "$v"
  if [ "${PROMO_SCALE:-3}" = "6" ]; then
    # 4K ana kopya (2160x3840) + ondan küçültülmüş en keskin 1080x1920 (Instagram hikâye/Reels boyutu)
    ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$WORK/$v/frames/%05d.jpg" -i "$WORK/$v/audio.wav" \
      -vf "setsar=1" -c:v libx264 -preset slow -crf 16 -profile:v high -level:v 5.2 -pix_fmt yuv420p -r 30 \
      -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT/efsun-$v-4k-9x16.mp4"
    ffmpeg -hide_banner -loglevel error -y -i "$OUT/efsun-$v-4k-9x16.mp4" -vf "scale=1080:1920:flags=lanczos,setsar=1" \
      -c:v libx264 -preset slow -crf 16 -maxrate 12M -bufsize 24M -profile:v high -level:v 4.1 -pix_fmt yuv420p -r 30 \
      -c:a copy -movflags +faststart "$OUT/efsun-$v-9x16.mp4"
  else
  ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$WORK/$v/frames/%05d.jpg" -i "$WORK/$v/audio.wav" \
    -c:v libx264 -preset slow -crf 19 -profile:v high -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart "$OUT/efsun-$v-9x16.mp4"
  fi
  # 4:5 akış sürümü: yazılar Meta güvenli alanında olduğu için ortadan kırpılır
  ffmpeg -hide_banner -loglevel error -y -i "$OUT/efsun-$v-9x16.mp4" -vf "crop=1080:1350:0:285" \
    -c:v libx264 -preset slow -crf 19 -profile:v high -pix_fmt yuv420p -c:a copy -movflags +faststart "$OUT/efsun-$v-4x5.mp4"
  echo "✓ $OUT/efsun-$v-9x16.mp4  ✓ $OUT/efsun-$v-4x5.mp4"
done
