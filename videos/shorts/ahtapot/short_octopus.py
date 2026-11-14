#!/usr/bin/env python3
"""Short: An Octopus Has 3 Hearts and Blue Blood (dikey 1080x1920, 30 fps, gerçek görüntü).
Kaynaklar 1080p olduğu için görüntü büyütülmez: 1080x1080 kare, piksel piksel (1:1) yerleştirilir,
arkası aynı karenin bulanık hali. Kullanım: python3 short_octopus.py <çalışma_klasörü>  (PREVIEW="0,3,9")
Klasörde: ses.mp3 + words.json (tools/shorts_ortak.tts), muzik.wav (tools/muzik_ambient.py muzik.wav 34 5),
  src/1198.mp4 (Pixabay, Vimeo-Free-Videos), src/152482.mp4 (Pixabay, mr-sragenesia)
"""
import sys, os, math, subprocess
sys.path.insert(0, '/workspace/youtube/tools')
from shorts_ortak import *

D = sys.argv[1]
TOTAL, END = 26.2, 23.1
load_words(D, ['three', 'hearts.', 'gills.', 'body.', 'blue,', 'copper,', 'iron,', 'swims,', 'stops', 'crawl.', 'two-thirds', 'arms.'])
CREDIT = 'Footage: Pixabay'
PINK = (255, 105, 150); CBLUE = (70, 150, 255)
SQ = 1080; SQ_Y = 400
CFG['wm_pos'] = (W - 96 - 36, 1530)   # başlıklar geniş, filigran alttaki bulanık alana

def sq_frames(src, t0, dur, x0, zoom0=1.0, zoom1=1.0):
    """1080x1080 kare kesit, büyütme yok (zoom>1 sadece hafif içeri yaklaşma)."""
    n = int(math.ceil(dur * FPS)) + 2
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur + 0.3), '-i', src,
           '-vf', f'fps={FPS},crop={SQ}:{SQ}:{x0}:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    last = None
    for i in range(n):
        buf = p.stdout.read(SQ * SQ * 3)
        if len(buf) < SQ * SQ * 3: break
        im = Image.frombuffer('RGB', (SQ, SQ), buf)
        z = zoom0 + (zoom1 - zoom0) * i / max(1, n - 1)
        if z > 1.001:
            b = SQ / z; o = (SQ - b) / 2
            im = im.resize((SQ, SQ), Image.LANCZOS, box=(o, o, o + b, o + b))
        last = im; yield last
    p.stdout.close(); p.wait()
    while True: yield last

def layout(sq, dark=0.45):
    bg = sq.resize((H, H), Image.BILINEAR).crop(((H - W) // 2, 0, (H - W) // 2 + W, H)).filter(ImageFilter.GaussianBlur(28))
    bg = Image.blend(bg, Image.new('RGB', (W, H), (0, 0, 0)), dark).convert('RGBA')
    bg.paste(sq, (0, SQ_Y))
    return bg

def heart(d, cx, cy, s, col):
    pts = []
    for k in range(60):
        q = 2 * math.pi * k / 60
        x = 16 * math.sin(q) ** 3
        y = 13 * math.cos(q) - 5 * math.cos(2 * q) - 2 * math.cos(3 * q) - math.cos(4 * q)
        pts.append((cx + x * s / 16, cy - y * s / 16))
    d.polygon(pts, fill=col)

def pulse(t, rate=1.6, ph=0.0):
    x = (t * rate + ph) % 1.0
    return 1 + 0.18 * math.exp(-((x - 0.1) / 0.06) ** 2)

V1, V2 = '1198', '152482'
SRC = lambda i: f'{D}/src/{i}.mp4'
a_sq = sq_frames(SRC(V2), 3.0, 1.8, 420)
c_sq = sq_frames(SRC(V1), 3.0, 5.3, 600, 1.0, 1.08)
d_sq = sq_frames(SRC(V2), 17.0, 5.1, 420, 1.0, 1.06)
e_sq = sq_frames(SRC(V1), 40.0, 2.5, 380)
f_sq = sq_frames(SRC(V1), 18.0, 3.7, 600, 1.05, 1.15)

def scene_cover(t):  # 0 - 1.8 (kapak: yazı ilk karede)
    im = layout(next(a_sq)); d = ImageDraw.Draw(im)
    text_c(d, 130, '3 HEARTS', 130, PINK, 1, 10)
    text_c(d, 270, '& BLUE BLOOD', 80, CBLUE, 1, 8)
    credit(im, CREDIT)
    return im

def scene_hearts(t):  # 1.8 - 6.5 : kalp şeması
    im = Image.new('RGB', (W, H), (6, 18, 40)).convert('RGBA'); d = ImageDraw.Draw(im)
    # gövde (manto) + kollar
    for k in range(8):
        q = math.pi * (0.15 + 0.7 * k / 7)
        x0, y0 = W / 2 + 140 * math.cos(q), 1080 + 40 * math.sin(q)
        pts = [(x0 + 520 * math.cos(q) * u + 40 * math.sin(u * 9 + t * 2) , y0 + 520 * math.sin(q) * u) for u in [i / 20 for i in range(21)]]
        d.line(pts, fill=(150, 70, 110, 255), width=int(46), joint='curve')
    d.ellipse([W / 2 - 260, 520, W / 2 + 260, 1180], fill=(170, 80, 120, 255))
    # solungaçlar
    for sx in (-1, 1):
        gx = W / 2 + sx * 170
        d.ellipse([gx - 70, 820, gx + 70, 1000], fill=(110, 50, 85, 255))
    a1 = ramp(t, 1.8, 2.2); a2 = ramp(t, 4.4, 4.8)
    for sx in (-1, 1):  # solungaç kalpleri
        if a1 > 0:
            heart(d, W / 2 + sx * 170, 910, 55 * a1 * pulse(t, 1.6, 0.3), (255, 90, 120, 255))
    if a2 > 0:
        heart(d, W / 2, 780, 95 * a2 * pulse(t, 1.6), (255, 60, 90, 255))
    text_c(d, 150, 'THREE HEARTS', 88, PINK, 1, 8)
    if a1 > 0:
        text_c(d, 1010, '2 GILL HEARTS', 46, WHITE, a1, 5)
    if a2 > 0:
        text_c(d, 300, '+ 1 BODY HEART', 64, WHITE, a2, 6)
    return im

def drop(d, cx, cy, s, col):
    d.polygon([(cx, cy - s * 1.5), (cx - s * 0.86, cy - s * 0.4), (cx + s * 0.86, cy - s * 0.4)], fill=col)
    d.ellipse([cx - s, cy - s, cx + s, cy + s], fill=col)

def scene_blue(t):  # 6.5 - 11.8
    im = layout(next(c_sq)); d = ImageDraw.Draw(im)
    text_c(d, 150, 'BLUE BLOOD', 108, CBLUE, ramp(t, 7.0, 7.3), 10)
    a = ramp(t, 8.5, 8.9); b = ramp(t, 9.4, 9.8)
    if a > 0:
        drop(d, 300, 1640, 70 * a, (70, 150, 255, 255))
        text_c(d, 1600, 'Cu', 56, WHITE, a, 5, x=270)
        text_c(d, 1730, 'COPPER', 40, CBLUE, a, 4, x=228)
    if b > 0:
        drop(d, 780, 1640, 70 * b, (220, 40, 50, 255))
        text_c(d, 1600, 'Fe', 56, WHITE, b, 5, x=750)
        text_c(d, 1730, 'IRON (us)', 40, (255, 120, 120), b, 4, x=680)
    return im

def ecg(d, x0, y0, w, t, stopped):
    pts = []
    for i in range(121):
        x = x0 + w * i / 120; u = (i / 120 * 3 - t * 1.6) % 1.0
        y = y0
        if not stopped(x0 + w * i / 120):
            if 0.1 < u < 0.14: y -= 90
            elif 0.14 < u < 0.17: y += 45
        pts.append((x, y))
    d.line(pts, fill=(80, 255, 140, 255), width=7)

def scene_swim(t):  # 11.8 - 16.9
    im = layout(next(d_sq)); d = ImageDraw.Draw(im)
    text_c(d, 130, 'WHEN IT SWIMS...', 78, WHITE, ramp(t, 13.4, 13.7), 8)
    stop_x = 80 + 920 * ramp(t, 15.5, 16.2)   # çizgi soldan sağa düzleşir
    ecg(d, 80, 1640, 920, t, lambda x: t > 15.5 and x < stop_x)
    s = ramp(t, 15.6, 15.9)
    if s > 0:
        text_c(d, 250, 'THE HEART STOPS', 78, PINK, s, 8)
    else:
        heart(d, W / 2, 310, 60 * pulse(t), (255, 60, 90, 255))
    return im

def scene_crawl(t):  # 16.9 - 19.4
    im = layout(next(e_sq)); d = ImageDraw.Draw(im)
    text_c(d, 150, 'SO IT CRAWLS', 98, (255, 205, 90), ramp(t, 17.0, 17.3), 10)
    credit(im, CREDIT)
    return im

def scene_arms(t):  # 19.4 - 23.1
    im = layout(next(f_sq)); d = ImageDraw.Draw(im)
    text_c(d, 120, '2/3 OF ITS', 100, WHITE, ramp(t, 20.2, 20.5), 9)
    text_c(d, 250, 'NEURONS ARE IN ITS ARMS', 62, (255, 205, 90), ramp(t, 21.0, 21.3), 7)
    credit(im, CREDIT)
    return im

def frame(t):
    if t < 1.8: return scene_cover(t)
    if t < 6.5: return scene_hearts(t)
    if t < 11.8: return scene_blue(t)
    if t < 16.9: return scene_swim(t)
    if t < 19.4: return scene_crawl(t)
    if t < END: return scene_arms(t)
    return scene_end(t - END)

if os.environ.get('PREVIEW'):
    P = {'a_sq': (V2, 3.0, 0.0, 420), 'c_sq': (V1, 3.0, 6.5, 600), 'd_sq': (V2, 17.0, 11.8, 420),
         'e_sq': (V1, 40.0, 16.9, 380), 'f_sq': (V1, 18.0, 19.4, 600)}
    _frame = frame
    def frame(t):
        for name, (i, s0, o0, x0) in P.items():
            globals()[name] = sq_frames(SRC(i), s0 + max(0, t - o0), 0.1, x0)
        return _frame(t)

render(D, TOTAL, frame, (1.8, 6.5, 11.8, 16.9, 19.4, END), END, 'short_octopus.mp4')
