#!/usr/bin/env bash
# Whisper, FFmpeg, HyperFrames ve yt-dlp kurulumu
set -euo pipefail

# FFmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    sudo_cmd=""; [ "$(id -u)" -ne 0 ] && sudo_cmd="sudo"
    $sudo_cmd apt-get update && $sudo_cmd apt-get install -y ffmpeg
  elif command -v brew >/dev/null 2>&1; then
    brew install ffmpeg
  else
    echo "FFmpeg'i elle kurun: https://ffmpeg.org/download.html" >&2; exit 1
  fi
fi

# yt-dlp + OpenAI Whisper (Python)
python3 -m pip install -U yt-dlp openai-whisper

# HyperFrames (Node.js >= 22 gerekir)
npm install -g hyperframes

echo "--- Sürümler ---"
ffmpeg -version | head -1
yt-dlp --version
python3 -c "import whisper, importlib.metadata as m; print('whisper', m.version('openai-whisper'))"
hyperframes --version
