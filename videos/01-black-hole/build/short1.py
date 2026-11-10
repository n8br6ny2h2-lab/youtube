#!/usr/bin/env python3
"""Short 1: Spaghettification (dikey 1080x1920, 30 fps).
Kullanım: python3 short1.py <çalışma_klasörü>
Klasörde olması gerekenler: ses.mp3, words.json (ElevenLabs), muzik.wav, src/disk.mp4 (NASA SVS 13326).
Çıktı: <klasör>/short1_spaghettification.mp4
"""
import json, math, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = sys.argv[1]; REPO = '/workspace/youtube'
W, H, FPS = 1080, 1920, 30
TOTAL = 30.8
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
def disk_frames(t0, dur, zoom0, zoom1):
    n = int(math.ceil(dur * FPS)) + 2; S = 2400
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur + 0.2), '-i', f'{D}/src/disk.mp4',
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

# ---------- altyazı parçaları (kelime zamanlarından)
words = json.load(open(f'{D}/words.json'))
chunks, cur = [], []
for w, s, e in words:
    cur.append((w, s, e))
    if len(cur) >= 3 or w[-1] in '.,?:!' or w.endswith('...'):
        chunks.append(cur); cur = []
if cur: chunks.append(cur)
CH = [(c[0][1], c[-1][2], ' '.join(x[0] for x in c)) for c in chunks]
KEY = {'stronger', 'harder.', 'enormous.', 'stretched', 'squeezed', 'spaghettification.', 'before', 'horizon.'}
def captions(im, t):
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

# ---------- sahneler
def scene_hook(t, base):
    im = base.convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 330, 'FALL INTO A', 84, WHITE, ramp(t, 0.0, 0.3))
    text_c(d, 430, 'BLACK HOLE?', 110, AMBER, ramp(t, 0.15, 0.45))
    credit(im, 'Visualization: NASA Goddard / J. Schnittman')
    return im

def scene_pull(t):  # 4.2 - 11.1
    lt = t - 4.2
    im = starfield(lt * 30).convert('RGBA')
    im = black_hole(im, W / 2, 1900, 380, 1.0)
    cy = 760 + lt * 22
    im = place_figure(im, W / 2, cy, scale=0.9)
    d = ImageDraw.Draw(im)
    text_c(d, 200, 'FEET FIRST', 80, WHITE, ramp(t, 4.2, 4.5))
    a = ramp(t, 6.6, 7.0)
    if a > 0:
        head_y = cy - 0.9 * FIG_H / 2; feet_y = cy + 0.9 * FIG_H / 2
        col_s = (*BLUE, int(255 * a)); col_b = (*AMBER, int(255 * a))
        arrow(d, W / 2 + 190, head_y + 10, head_y + 10 + 110 * a, col_s, 14, 32)
        arrow(d, W / 2 - 190, feet_y - 200, feet_y - 200 + 300 * a, col_b, 20, 48)
    b = ramp(t, 9.3, 9.7)
    if b > 0:
        head_y = cy - 0.9 * FIG_H / 2; feet_y = cy + 0.9 * FIG_H / 2
        text_c(d, head_y + 30, 'WEAK', 50, BLUE, b, 5, x=W / 2 + 230)
        text_c(d, feet_y - 150, 'STRONG', 50, AMBER, b, 5, x=W / 2 - 440)
    return im

def scene_streak(t):  # 14.85 - 23.5
    im = starfield((t - 14.85) * 60).convert('RGBA')
    grow = ramp(t, 14.85, 23.5)
    im = black_hole(im, W / 2, 2050 - 150 * grow, 420 + 120 * grow, 1.0)
    s1 = ramp(t, 15.0, 18.1); s2 = ramp(t, 18.1, 20.4); s3 = ramp(t, 20.6, 22.4)
    sy = 1 + 1.3 * s1 + 1.4 * s2 + 1.2 * s3
    sx = 1 - 0.5 * s1 - 0.25 * s2 - 0.17 * s3
    cy = 700 + 120 * (s1 + s2)
    im = place_figure(im, W / 2, cy, sx=sx, sy=sy, scale=0.55 if sy > 3 else 0.6, glow=0.15 * s1 + 0.4 * s2 + 0.45 * s3,
                      alpha=1 - 0.2 * s3)
    if s3 > 0:  # ışık şeridi
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
        top = cy - 900 * (0.5 + 0.5 * s3); bot = cy + 700
        g.rounded_rectangle([W / 2 - 10, top, W / 2 + 10, bot], 10, fill=(255, 225, 170, int(230 * s3)))
        im = Image.alpha_composite(im, lay.filter(ImageFilter.GaussianBlur(10)))
        g2 = ImageDraw.Draw(im); g2.rounded_rectangle([W / 2 - 4, top + 40, W / 2 + 4, bot - 40], 4, fill=(255, 250, 235, int(255 * s3)))
    d = ImageDraw.Draw(im)
    a = ramp(t, 15.2, 15.6) * (1 - ramp(t, 20.4, 20.7))
    if a > 0:
        arrow(d, W / 2 + 260, cy, cy - 300, (*AMBER, int(255 * a)), 14, 36)
        arrow(d, W / 2 + 260, cy, cy + 300, (*AMBER, int(255 * a)), 14, 36)
    b = ramp(t, 16.85, 17.2) * (1 - ramp(t, 20.4, 20.7))
    if b > 0:
        harrow(d, 90, W / 2 - 110, cy, (*BLUE, int(255 * b)))
        harrow(d, W - 90, W / 2 + 110, cy, (*BLUE, int(255 * b)))
    c = ramp(t, 22.1, 22.4)
    if c > 0:
        sc = 1 + 0.25 * (1 - c)
        text_c(d, 230, 'SPAGHETTI-', int(96 * sc), AMBER, c, 8)
        text_c(d, 345, 'FICATION', int(96 * sc), AMBER, c, 8)
    return im

def scene_horizon(t):  # 23.5 - 28.0
    im = starfield(0).convert('RGBA')
    cx, cy, r = W / 2, 1000, 150
    im = black_hole(im, cx, cy, r, 1.0)
    d = ImageDraw.Draw(im)
    a = ramp(t, 23.6, 24.2)
    R = 260
    for k in range(0, 72, 2):  # kesikli olay ufku çemberi
        q0, q1 = k * math.pi / 36, (k + 1) * math.pi / 36
        d.arc([cx - R, cy - R, cx + R, cy + R], math.degrees(q0), math.degrees(q1), fill=(*BLUE, int(255 * a)), width=6)
    text_c(d, cy - R - 10, 'EVENT', 42, BLUE, a, 5, x=cx + R - 60)
    text_c(d, cy - R + 40, 'HORIZON', 42, BLUE, a, 5, x=cx + R - 20)
    # gerilmiş figür: ufkun DIŞINDA
    b = ramp(t, 25.1, 25.6)
    sy = 3.6; fy = cy - R - 200
    im = place_figure(im, cx, fy, sx=0.22, sy=sy, scale=0.15, glow=0.6, alpha=b)
    d = ImageDraw.Draw(im)
    if b > 0:
        harrow(d, cx - 260, cx - 40, fy, (*AMBER, int(255 * b)), 10, 26)
        text_c(d, fy - 28, 'YOU', 46, AMBER, b, 5, x=cx - 380)
    c = ramp(t, 25.6, 26.0)
    text_c(d, 170, 'STRETCHED', 86, WHITE, c, 7)
    text_c(d, 272, 'BEFORE THE EDGE', 76, AMBER, ramp(t, 26.2, 26.6), 7)
    return im

def scene_end(t):  # 28.0 - end
    lt = t - 28.0
    im = starfield(0).convert('RGBA')
    s = 640 + 40 * ramp(lt, 0, 2.5)
    lg = LOGO.resize((int(s), int(s)), Image.LANCZOS).convert('RGBA')
    lg.putalpha(int(255 * ramp(lt, 0, 0.4)))
    im.alpha_composite(lg, (int(W / 2 - s / 2), int(820 - s / 2)))
    d = ImageDraw.Draw(im)
    text_c(d, 1240, 'FOLLOW FOR MORE', 72, WHITE, ramp(lt, 0.2, 0.6))
    text_c(d, 1340, 'SCIENCE IN MINUTES', 48, AMBER, ramp(lt, 0.4, 0.8))
    return im

# ---------- önizleme: PREVIEW="5,9.5,17" → tek kareler PNG
import os
if os.environ.get('PREVIEW'):
    for ts in os.environ['PREVIEW'].split(','):
        t = float(ts)
        if t < 4.2: im = scene_hook(t, next(disk_frames(2.0 + t, 0.1, 1.1, 1.1)))
        elif t < 11.1: im = scene_pull(t)
        elif t < 14.85: im = next(disk_frames(20.0 + t - 11.1, 0.1, 1.05, 1.05)).convert('RGBA')
        elif t < 23.5: im = scene_streak(t)
        elif t < 28.0: im = scene_horizon(t)
        else: im = scene_end(t)
        im = im.convert('RGBA')
        if t < 28: captions(im, t); im.alpha_composite(WM, (W - 96 - 36, 150))
        im.convert('RGB').resize((540, 960)).save(f'{D}/prev_{ts}.png')
    sys.exit()

# ---------- render
OUT = f'{D}/video_only.mp4'
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                        '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-b:v', '12M', '-minrate', '10M', '-maxrate', '14M', '-bufsize', '20M', '-x264-params', 'nal-hrd=cbr', '-pix_fmt', 'yuv420p', OUT],
                       stdin=subprocess.PIPE)
N = int(TOTAL * FPS)
hook = disk_frames(2.0, 4.2, 1.0, 1.25)
mid = disk_frames(20.0, 3.75, 1.0, 1.15)
for i in range(N):
    t = i / FPS
    if t < 4.2:
        im = scene_hook(t, next(hook))
    elif t < 11.1:
        im = scene_pull(t)
    elif t < 14.85:
        im = next(mid).convert('RGBA'); credit(im, 'Visualization: NASA Goddard / J. Schnittman')
    elif t < 23.5:
        im = scene_streak(t)
    elif t < 28.0:
        im = scene_horizon(t)
    else:
        im = scene_end(t)
    im = im.convert('RGBA')
    # geçişlerde kısa kararma
    for cut in (4.2, 11.1, 14.85, 23.5, 28.0):
        dd = abs(t - cut)
        if dd < 0.1:
            im = Image.blend(im, Image.new('RGBA', (W, H), (0, 0, 0, 255)), 0.6 * (1 - dd / 0.1))
    if t < 28.0:
        captions(im, t)
        im.alpha_composite(WM, (W - 96 - 36, 150))
    enc.stdin.write(im.convert('RGB').tobytes())
    if i % 150 == 0: print(f'{t:.1f}s', flush=True)
enc.stdin.close(); enc.wait()

# ---------- ses: anlatım + müzik, iki geçişli -14 LUFS
MIX = f'{D}/mix.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{D}/ses.mp3', '-i', f'{D}/muzik.wav', '-filter_complex',
                f'[0:a]aresample=48000,apad[v];[1:a]aresample=48000,volume=0.16[m];[v][m]amix=inputs=2:duration=longest:normalize=0,atrim=0:{TOTAL}[a]',
                '-map', '[a]', '-ac', '2', MIX], check=True)
r = subprocess.run(['ffmpeg', '-i', MIX, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                   capture_output=True, text=True).stderr
m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', OUT, '-i', MIX, '-af', ln, '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart',
                f'{D}/short1_spaghettification.mp4'], check=True)
print('bitti')
