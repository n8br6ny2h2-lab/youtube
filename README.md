# youtube

Video işleme araçları: **FFmpeg**, **yt-dlp**, **Whisper**, **HyperFrames**.

## Kurulum

```bash
./setup.sh
```

## Örnek kullanım

```bash
# Video indir
yt-dlp -f "bv*+ba/b" -o "video.%(ext)s" "https://www.youtube.com/watch?v=..."

# Sesi ayır
ffmpeg -i video.mp4 -vn -ac 1 -ar 16000 audio.wav

# Altyazı/transkript çıkar (Türkçe)
whisper audio.wav --model small --language tr --output_format srt

# HTML'den video üret
hyperframes init my-video && cd my-video && hyperframes render
```
