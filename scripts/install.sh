#!/usr/bin/env bash
# Bulutkent stüdyo kurulumu (Ubuntu/Debian; macOS'ta brew ile benzer). Kurulu olanları tekrar kurmaz.
set -euo pipefail
cd "$(dirname "$0")/.."
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
need() { command -v "$1" >/dev/null 2>&1; }

if need apt-get; then
  PKGS=""
  need ffmpeg || PKGS="$PKGS ffmpeg"
  need sqlite3 || PKGS="$PKGS sqlite3"
  need convert || PKGS="$PKGS imagemagick"
  need espeak-ng || PKGS="$PKGS espeak-ng"
  need git || PKGS="$PKGS git"
  dpkg -s fonts-noto-color-emoji >/dev/null 2>&1 || PKGS="$PKGS fonts-noto-color-emoji"
  [ -n "$PKGS" ] && $SUDO apt-get update && $SUDO apt-get install -y $PKGS
fi

python3 -m pip install -r requirements.txt
need hyperframes || npm install -g hyperframes
need n8n || npm install -g n8n

# Chrome/Chromium (HyperFrames ve kapak render'ı için)
if ! need google-chrome && ! need chromium && [ ! -e /opt/pw-browsers/chromium ]; then
  python3 -m playwright install --with-deps chromium
fi

# Türkçe Piper sesi ve Whisper modeli
mkdir -p models/piper models/whisper
V=models/piper/tr_TR-dfki-medium
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium
[ -f $V.onnx ] || curl -fL -o $V.onnx $BASE/tr_TR-dfki-medium.onnx
[ -f $V.onnx.json ] || curl -fL -o $V.onnx.json $BASE/tr_TR-dfki-medium.onnx.json
HF_HUB_DISABLE_XET=1 python3 -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8', download_root='models/whisper')"

# GSAP (yerel kopya) ve yazı tipleri depoda hazır: vendor/, templates/fonts/
[ -f .env ] || cp .env.example .env
python3 main.py --mode status
