#!/usr/bin/env python3
"""Shorts için ortak parçalar: yıldız arka plan, kara delik, astronot, oklar, yazılar,
NASA disk kareleri, kelime kelime altyazı, bitiş kartı, kodlama ve -14 LUFS ses.
Her Short betiği (short2.py, ...) bunu içe aktarır. (short1.py kendi başına çalışır.)
"""
import json, math, random, subprocess, sys, os, base64, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

REPO = '/workspace/youtube'
W, H, FPS = 1080, 1920, 30
CFG = {'D': '.', 'CH': [], 'KEY': set()}
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
_fc = {}
def font(s):
    if s not in _fc: _fc[s] = ImageFont.truetype(FB, s)
    return _fc[s]
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def ramp(t, a, b): return ease((t - a) / (b - a))

AMBER = (255, 179, 71); BLUE = (79, 195, 255); WHITE = (255, 255, 255)

# ---------- yıldızlı arka plan
random.seed(7)
STARS = [(random.uniform(0, W), random.uniform(0, H), random.random()) for _ in range(700)]
def starfield(drift=0.0):
    im = Image.new('RGB', (W, H), (4, 6, 16)); d = ImageDraw.Draw(im)
    for x, y, b in STARS:
        y2 = (y - drift * (0.3 + b)) % H
        c = int(70 + 170 * b); r = 1 if b < 0.88 else 2
        d.ellipse([x - r, y2 - r, x + r, y2 + r], fill=(c, c, min(255, c + 25)))
    return im

def black_hole(im, cx, cy, r, glow=1.0):
    """Siyah çekirdek + turuncu parlayan halka."""
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
    for j in range(10, 0, -1):
        rr = r * (1 + j * 0.09)
        g.ellipse([cx - rr, cy - rr * 0.98, cx + rr, cy + rr * 0.98],
                  fill=(255, 150 + j * 6, 60, int(glow * (14 + 6 * (10 - j)))))
    lay = lay.filter(ImageFilter.GaussianBlur(r * 0.08 + 2))
    im = Image.alpha_composite(im.convert('RGBA'), lay); d = ImageDraw.Draw(im)
    d.ellipse([cx - r * 1.04, cy - r * 1.04, cx + r * 1.04, cy + r * 1.04], outline=(255, 210, 150, 255), width=max(3, int(r * 0.03)))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 0, 0, 255))
    return im

# ---------- astronot figürü (ayaklar aşağıda), kendi tuvalinde
FIG_W, FIG_H = 300, 600
def figure_layer():
    im = Image.new('RGBA', (FIG_W, FIG_H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    suit = (236, 240, 248, 255); edge = (150, 165, 190, 255)
    # bacaklar
    d.rounded_rectangle([95, 330, 140, 560], 22, fill=suit, outline=edge, width=4)
    d.rounded_rectangle([160, 330, 205, 560], 22, fill=suit, outline=edge, width=4)
    d.rounded_rectangle([88, 535, 145, 585], 16, fill=(200, 205, 215, 255), outline=edge, width=4)
    d.rounded_rectangle([155, 535, 212, 585], 16, fill=(200, 205, 215, 255), outline=edge, width=4)
    # kollar (yukarı açık, süzülme)
    d.rounded_rectangle([30, 150, 75, 330], 22, fill=suit, outline=edge, width=4)
    d.rounded_rectangle([225, 150, 270, 330], 22, fill=suit, outline=edge, width=4)
    # gövde + sırt çantası çizgisi
    d.rounded_rectangle([75, 150, 225, 370], 40, fill=suit, outline=edge, width=4)
    d.rounded_rectangle([120, 200, 180, 250], 8, fill=(79, 195, 255, 255))
    # kask
    d.ellipse([85, 20, 215, 160], fill=suit, outline=edge, width=4)
    d.ellipse([105, 45, 195, 130], fill=(255, 190, 90, 255))
    d.ellipse([120, 55, 150, 80], fill=(255, 235, 200, 255))
    return im
FIG = figure_layer()

def place_figure(im, cx, cy, sx=1.0, sy=1.0, scale=1.0, glow=0.0, alpha=1.0):
    w = max(2, int(FIG_W * sx * scale)); h = max(2, int(FIG_H * sy * scale))
    f = FIG.resize((w, h), Image.LANCZOS)
    if glow > 0:
        hot = Image.new('RGBA', f.size, (255, 200, 120, 0))
        a = f.split()[3]
        hot.putalpha(a.point(lambda v: int(v * glow)))
        f = Image.alpha_composite(f, hot)
    if alpha < 1:
        f.putalpha(f.split()[3].point(lambda v: int(v * alpha)))
    im = im.convert('RGBA')
    if glow > 0:
        halo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        hl = Image.new('RGBA', f.size, (255, 170, 80, 0)); hl.putalpha(f.split()[3].point(lambda v: int(v * glow * 0.8)))
        halo.paste(hl, (int(cx - w / 2), int(cy - h / 2)), hl)
        im = Image.alpha_composite(im, halo.filter(ImageFilter.GaussianBlur(18)))
    im.alpha_composite(f, (int(cx - w / 2), int(cy - h / 2)))
    return im

def arrow(d, x, y0, y1, col, width=14, head=34):
    """Dikey ok (y0'dan y1'e)."""
    s = 1 if y1 > y0 else -1
    d.line([(x, y0), (x, y1 - s * head * 0.6)], fill=col, width=width)
    d.polygon([(x, y1), (x - head * 0.7, y1 - s * head), (x + head * 0.7, y1 - s * head)], fill=col)
def harrow(d, x0, x1, y, col, width=12, head=30):
    s = 1 if x1 > x0 else -1
    d.line([(x0, y), (x1 - s * head * 0.6, y)], fill=col, width=width)
    d.polygon([(x1, y), (x1 - s * head, y - head * 0.7), (x1 - s * head, y + head * 0.7)], fill=col)

def text_c(d, y, s, size, col=WHITE, a=1.0, stroke=6, x=None):
    if a <= 0: return
    f = font(size); w = d.textlength(s, font=f)
    xx = (W - w) / 2 if x is None else x
    d.text((xx, y), s, font=f, fill=(*col, int(255 * a)), stroke_width=stroke, stroke_fill=(0, 0, 0, int(220 * a)))

# ---------- NASA disk kareleri (ffmpeg ile dikey kesit)
def disk_frames(t0, dur, zoom0, zoom1, src=None):
    n = int(math.ceil(dur * FPS)) + 2; S = 2400
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur + 0.2), '-i', src or f'{CFG["D"]}/src/disk.mp4',
           '-vf', f'fps={FPS},scale={S}:{S}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    for i in range(n):
        buf = p.stdout.read(S * S * 3)
        if len(buf) < S * S * 3: break
        im = Image.frombuffer('RGB', (S, S), buf)
        z = zoom0 + (zoom1 - zoom0) * (i / max(1, n - 1))
        cw, ch = W / z, H / z
        box = (S / 2 - cw / 2, S / 2 - ch / 2, S / 2 + cw / 2, S / 2 + ch / 2)
        last = im.resize((W, H), Image.LANCZOS, box=box); yield last
    p.stdout.close(); p.wait()
    while True: yield last  # kare sayısı yuvarlaması için son kareyi tekrarla


def captions(im, t):
    CH = CFG['CH']; KEY = CFG['KEY']
    for i, (s, e, txt) in enumerate(CH):
        nxt = CH[i + 1][0] if i + 1 < len(CH) else e + 0.6
        if s - 0.05 <= t < min(nxt, e + 0.6):
            d = ImageDraw.Draw(im)
            ws = txt.upper().split(' '); size = 70
            while True:  # ekrana sığana kadar küçült
                f = font(size); total = sum(d.textlength(x + ' ', font=f) for x in ws)
                if total <= W - 100 or size <= 44: break
                size -= 2
            x = (W - total) / 2; y = 1300
            pop = 1.0
            for wd, orig in zip(ws, txt.split(' ')):
                col = AMBER if orig.lower() in KEY else WHITE
                d.text((x, y), wd, font=f, fill=(*col, 255), stroke_width=8, stroke_fill=(0, 0, 0, 255))
                x += d.textlength(wd + ' ', font=f)
            return

WM = Image.open(f'{REPO}/brand/kavcilab_filigran_300.png').convert('RGBA').resize((96, 96), Image.LANCZOS)
WM.putalpha(WM.split()[3].point(lambda v: int(v * 0.75)))
LOGO = Image.open(f'{REPO}/brand/kavcilab_logo_yazili.png').convert('RGB')

def credit(im, txt):
    d = ImageDraw.Draw(im); f = font(26)
    d.text((40, 1700), txt, font=f, fill=(230, 230, 230, 200), stroke_width=3, stroke_fill=(0, 0, 0, 200))

def clip_frames(src, t0, dur, xc=0.5, zoom0=1.0, zoom1=1.0, crop_w=1216, crop_h=2160):
    """Yatay 4K klipten dikey kesit (xc: kesit merkezinin genişliğe oranı). Kare sayısı yetmezse son kare tekrarlanır."""
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                          '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip().split(',')
    sw, sh = int(out[0]), int(out[1])
    cw, ch = min(crop_w, sw), min(crop_h, sh)
    cw -= cw % 2; ch -= ch % 2   # tek sayı genişlik ffmpeg'de kayma yapar
    x0 = int(min(max(0, xc * sw - cw / 2), sw - cw)) // 2 * 2
    n = int(math.ceil(dur * FPS)) + 2
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur + 0.3), '-i', src,
           '-vf', f'fps={FPS},crop={cw}:{ch}:{x0}:{(sh - ch) // 2}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    last = None
    for i in range(n):
        buf = p.stdout.read(cw * ch * 3)
        if len(buf) < cw * ch * 3: break
        im = Image.frombuffer('RGB', (cw, ch), buf)
        z = zoom0 + (zoom1 - zoom0) * (i / max(1, n - 1))
        bw, bh = cw / z, ch / z
        box = (cw / 2 - bw / 2, ch / 2 - bh / 2, cw / 2 + bw / 2, ch / 2 + bh / 2)
        last = im.resize((W, H), Image.LANCZOS, box=box); yield last
    p.stdout.close(); p.wait()
    while True: yield last

def scene_end(lt):
    """Bitiş kartı (lt = kartın başından itibaren saniye)."""
    im = starfield(0).convert('RGBA')
    s = 640 + 40 * ramp(lt, 0, 2.5)
    lg = LOGO.resize((int(s), int(s)), Image.LANCZOS).convert('RGBA')
    lg.putalpha(int(255 * ramp(lt, 0, 0.4)))
    im.alpha_composite(lg, (int(W / 2 - s / 2), int(820 - s / 2)))
    d = ImageDraw.Draw(im)
    text_c(d, 1240, 'FOLLOW FOR MORE', 72, WHITE, ramp(lt, 0.2, 0.6))
    text_c(d, 1340, 'SCIENCE IN MINUTES', 48, AMBER, ramp(lt, 0.4, 0.8))
    return im

def tts(D, text):
    """ElevenLabs George sesi + kelime zamanları -> D/ses.mp3, D/words.json"""
    cfg = json.load(open(f'{REPO}/config/ses.json'))
    body = {"text": text, "model_id": cfg["model_id"], "voice_settings": cfg["voice_settings"]}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['anlatici']['voice_id']}/with-timestamps?output_format=mp3_44100_192",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "proxy"})
    r = json.load(urllib.request.urlopen(req, timeout=180))
    open(f'{D}/ses.mp3', 'wb').write(base64.b64decode(r["audio_base64"]))
    a = r["alignment"]; words = []; cur = ""; s0 = pe = None
    for c, s, e in zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]):
        if c.isspace():
            if cur: words.append((cur, s0, pe)); cur = ""
        else:
            if not cur: s0 = s
            cur += c; pe = e
    if cur: words.append((cur, s0, pe))
    json.dump(words, open(f'{D}/words.json', 'w'))
    return words

def load_words(D, key_words):
    CFG['D'] = D; CFG['KEY'] = set(key_words)
    words = json.load(open(f'{D}/words.json'))
    chunks, cur = [], []
    for w, s, e in words:
        cur.append((w, s, e))
        if len(cur) >= 3 or w[-1] in '.,?:!' or w.endswith('...'):
            chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    CFG['CH'] = [(c[0][1], c[-1][2], ' '.join(x[0] for x in c)) for c in chunks]
    return words

def finish(im, t, cuts, end_t):
    im = im.convert('RGBA')
    for cut in cuts:
        dd = abs(t - cut)
        if dd < 0.1:
            im = Image.blend(im, Image.new('RGBA', (W, H), (0, 0, 0, 255)), 0.6 * (1 - dd / 0.1))
    if t < end_t:
        captions(im, t)
        im.alpha_composite(WM, CFG.get('wm_pos', (W - 96 - 36, 150)))
    return im

def render(D, total, frame_fn, cuts, end_t, out_name, sfx=None, sfx_vol=0.8):
    """frame_fn(t) -> PIL resmi. PREVIEW="1,5,9" ortam değişkeniyle sadece önizleme kareleri."""
    if os.environ.get('PREVIEW'):
        ts = os.environ['PREVIEW'].split(',')
        sheet = Image.new('RGB', (360 * len(ts), 640))
        for k, s in enumerate(ts):
            t = float(s); sheet.paste(finish(frame_fn(t), t, cuts, end_t).convert('RGB').resize((360, 640)), (360 * k, 0))
        sheet.save(f'{D}/preview.png'); return
    out = f'{D}/video_only.mp4'
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                            '-i', '-', '-vf', 'noise=alls=3:allf=t', '-c:v', 'libx264', '-preset', 'medium', '-b:v', '12M', '-minrate', '10M', '-maxrate', '14M',
                            '-bufsize', '20M', '-x264-params', 'nal-hrd=cbr', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for i in range(int(total * FPS)):
        t = i / FPS
        enc.stdin.write(finish(frame_fn(t), t, cuts, end_t).convert('RGB').tobytes())
    enc.stdin.close(); enc.wait()
    mix = f'{D}/mix.wav'
    ins = ['-i', f'{D}/ses.mp3', '-i', f'{D}/muzik.wav'] + (['-i', sfx] if sfx else [])
    fc = '[0:a]aresample=48000,apad[v];[1:a]aresample=48000,volume=0.16[m];'
    fc += (f'[2:a]aresample=48000,volume={sfx_vol}[x];[v][m][x]amix=inputs=3' if sfx else '[v][m]amix=inputs=2')
    fc += f':duration=longest:normalize=0,atrim=0:{total}[a]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', fc, '-map', '[a]', '-ac', '2', mix], check=True)
    r = subprocess.run(['ffmpeg', '-i', mix, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-i', mix, '-af', ln, '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', f'{D}/{out_name}'], check=True)
    print('bitti:', f'{D}/{out_name}')
