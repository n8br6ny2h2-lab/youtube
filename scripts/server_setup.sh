#!/usr/bin/env bash
# Bulutkent stüdyosunu temiz bir Ubuntu 24.04 sunucuya kurar ve 7/24 servis olarak başlatır.
# Kullanım (sunucuda root olarak):
#   curl -fsSL https://raw.githubusercontent.com/n8br6ny2h2-lab/youtube/claude/whisper-ffmpeg-hyperframes-ytdlp-coo3ks/scripts/server_setup.sh | bash
set -euo pipefail
BRANCH=claude/whisper-ffmpeg-hyperframes-ytdlp-coo3ks
DIR=/opt/bulutkent
export DEBIAN_FRONTEND=noninteractive

echo "==> Sistem paketleri"
apt-get update -qq
apt-get install -y -qq git curl ffmpeg sqlite3 espeak-ng sox imagemagick fonts-noto-color-emoji fonts-noto-core fonts-dejavu \
  python3 python3-venv python3-pip ca-certificates gnupg tzdata
timedatectl set-timezone Europe/Istanbul 2>/dev/null || true

echo "==> Node.js 22"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi

echo "==> Google Chrome (render için)"
if ! command -v google-chrome >/dev/null; then
  curl -fsSL -o /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y -qq /tmp/chrome.deb && rm -f /tmp/chrome.deb
fi

echo "==> HyperFrames"
command -v hyperframes >/dev/null || npm install -g hyperframes >/dev/null

echo "==> Kod"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull -q origin "$BRANCH"; else git clone -q -b "$BRANCH" https://github.com/n8br6ny2h2-lab/youtube.git "$DIR"; fi
cd "$DIR"

echo "==> Python ortamı"
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt

echo "==> Türkçe ses ve Whisper modelleri"
mkdir -p models/piper models/whisper config/secrets
chmod 700 config/secrets
B=https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium
[ -f models/piper/tr_TR-dfki-medium.onnx ] || curl -fsSL -o models/piper/tr_TR-dfki-medium.onnx $B/tr_TR-dfki-medium.onnx
[ -f models/piper/tr_TR-dfki-medium.onnx.json ] || curl -fsSL -o models/piper/tr_TR-dfki-medium.onnx.json $B/tr_TR-dfki-medium.onnx.json
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8', download_root='models/whisper')"

[ -f .env ] || { cp .env.example .env; sed -i "s/^DASHBOARD_TOKEN=.*/DASHBOARD_TOKEN=$(openssl rand -hex 24)/" .env; chmod 600 .env; }

echo "==> Servisler"
cat > /etc/systemd/system/bulutkent-panel.service <<UNIT
[Unit]
Description=Bulutkent yönetim paneli
After=network-online.target
[Service]
WorkingDirectory=$DIR
Environment=CHROME_PATH=/usr/bin/google-chrome
ExecStart=$DIR/.venv/bin/python main.py --mode dashboard
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/bulutkent.service <<UNIT
[Unit]
Description=Bulutkent otomatik üretim ve yayın (her gece 02:37, saatlik yayın kuyruğu)
After=network-online.target
[Service]
WorkingDirectory=$DIR
Environment=CHROME_PATH=/usr/bin/google-chrome
ExecStart=$DIR/.venv/bin/python main.py --mode daemon
Restart=always
RestartSec=60
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now bulutkent-panel.service >/dev/null

.venv/bin/python main.py --mode status | head -40
cat <<MSG

==================================================================
KURULUM TAMAM. Son adımlar:
 1) Google izin dosyası:  cd $DIR && .venv/bin/python main.py --mode set-client   (JSON içeriğini yapıştırın)
 2) Kanal izni:   cd $DIR && .venv/bin/python main.py --mode auth
    (çıkan bağlantıyı telefonda açın, onaylayın, açılmayan sayfanın adresini kopyalayıp)
    .venv/bin/python main.py --mode auth --code "ADRES"
 3) YouTube API anahtarı: .venv/bin/python main.py --mode set-key
 4) Otomatik çalışmayı başlatın:  systemctl enable --now bulutkent.service
 Panel (sunucu içinden): http://127.0.0.1:8080
 Kayıtlar: journalctl -u bulutkent -f
==================================================================
MSG
