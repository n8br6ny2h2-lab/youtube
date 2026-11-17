#!/usr/bin/env python3
"""Kavci Lab Short: Why Is the Sky Blue? (dikey 1080x1920). Kaynak: NASA Space Place "Why Is the Sky Blue?".
Kullanım: python3 short_sky.py <klasör>  (PREVIEW="0,4,9")
Klasörde: ses.mp3 + words.json (George), muzik.wav (tools/muzik_ambient.py muzik.wav 36 21), src/: Pixabay 158384, 133823 (NickyPe/Kaffeesüchtig), 201308 (SerajKaram)
"""
import sys, os, math, random
sys.path.insert(0, '/workspace/youtube/tools')
from shorts_ortak import *

D = sys.argv[1]
TOTAL, END = 31.6, 28.6
load_words(D, ['blue?', 'white,', 'every', 'rainbow.', 'scatter', 'blue', 'red.', 'sunset,', 'more', 'air', 'scattered', 'reds', 'oranges'])
SKY = (90, 170, 255); WHITE_ = (255, 255, 255); ORANGE = (255, 140, 60)
SPEC = [(255, 60, 60), (255, 140, 40), (255, 220, 60), (80, 210, 90), (60, 170, 255), (70, 90, 230), (150, 80, 220)]
SRC = lambda i: f'{D}/src/{i}.mp4'
CREDIT = 'Footage: Pixabay'
a_clip = clip_frames(SRC(158384), 2, 2.2, xc=0.55, zoom0=1.15, zoom1=1.0)
d_clip = clip_frames(SRC(133823), 1, 6.2, xc=0.5, zoom0=1.0, zoom1=1.12)
f_clip = clip_frames(SRC(201308), 10, 6.5, xc=0.45, zoom0=1.0, zoom1=1.1)

def bg(top=(8, 14, 40), bot=(20, 40, 90)):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for y in range(0, H, 4):
        u = y / H; d.rectangle([0, y, W, y + 4], fill=tuple(int(a + (b - a) * u) for a, b in zip(top, bot)))
    return im.convert('RGBA')

def scene_cover(t):   # 0 - 1.9 (yazı ilk karede)
    im = next(a_clip).convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 330, 'WHY IS', 120, WHITE_, 1, 10)
    text_c(d, 460, 'THE SKY', 120, WHITE_, 1, 10)
    text_c(d, 590, 'BLUE?', 170, SKY, 1, 12)
    credit(im, CREDIT)
    return im

def scene_prism(t):   # 1.9 - 6.6
    im = bg(); d = ImageDraw.Draw(im)
    a = ramp(t, 2.0, 2.6)
    px, py = 520, 820
    d.line([(-10, 900), (px - 60, py + 30)], fill=(255, 255, 240, int(255 * a)), width=16)   # beyaz ışın
    tri = [(px, py - 150), (px - 140, py + 110), (px + 140, py + 110)]
    d.polygon(tri, fill=(200, 230, 255, int(90 * a)), outline=(230, 245, 255, int(255 * a)))
    b = ramp(t, 3.0, 5.2)
    if b > 0:   # renk yelpazesi
        for i, c in enumerate(SPEC):
            ang = math.radians(-6 + i * 4.5)
            L = 700 * b
            x0, y0 = px + 60, py + 20
            d.line([(x0, y0), (x0 + L * math.cos(ang), y0 + L * math.sin(ang))], fill=(*c, 255), width=16)
    text_c(d, 230, 'SUNLIGHT', 110, WHITE_, ramp(t, 2.0, 2.4), 8)
    text_c(d, 360, '= ALL COLORS', 96, (255, 220, 80), ramp(t, 4.6, 5.0), 8)
    return im

random.seed(3)
MOL = [(random.uniform(80, W - 80), random.uniform(560, 1250)) for _ in range(46)]
def scene_scatter(t):  # 6.6 - 12.3
    lt = t - 6.6
    im = bg((10, 30, 80), (30, 70, 140)); d = ImageDraw.Draw(im)
    for x, y in MOL:
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(200, 220, 255, 200))
    # kırmızı düz geçer
    rx = min(W, -50 + 600 * lt)
    d.line([(-50, 900), (rx, 900)], fill=(255, 70, 60, 255), width=12)
    # mavi her yöne saçılır
    s = ramp(t, 9.4, 10.2)
    if s > 0:
        for k, (x, y) in enumerate(MOL[::2]):
            for j in range(4):
                q = k * 1.3 + j * math.pi / 2 + lt * .5; L = 90 * s
                d.line([(x, y), (x + L * math.cos(q), y + L * math.sin(q))], fill=(80, 180, 255, 230), width=6)
    text_c(d, 230, 'AIR SCATTERS', 104, WHITE_, ramp(t, 6.7, 7.1), 8)
    text_c(d, 350, 'BLUE MORE', 120, SKY, ramp(t, 9.6, 10.0), 9)
    text_c(d, 1450, 'red passes straight', 54, (255, 120, 110), ramp(t, 11.2, 11.6), 5)
    return im

def scene_sky(t):     # 12.3 - 18.2
    im = next(d_clip).convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 260, 'BLUE FROM', 110, WHITE_, ramp(t, 12.5, 12.9), 9)
    text_c(d, 380, 'EVERY DIRECTION', 92, SKY, ramp(t, 15.0, 15.4), 8)
    credit(im, CREDIT)
    return im

def scene_path(t):    # 18.2 - 22.4
    im = bg((6, 10, 30), (14, 24, 60)); d = ImageDraw.Draw(im)
    cx, cy, R = W / 2, 2350, 1250
    d.ellipse([cx - R - 170, cy - R - 170, cx + R + 170, cy + R + 170], fill=(60, 120, 220, 110))   # atmosfer
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(40, 110, 70, 255))                              # Dünya
    ox, oy = cx, cy - R   # gözlemci
    d.ellipse([ox - 16, oy - 16, ox + 16, oy + 16], fill=(255, 255, 255, 255))
    a = ramp(t, 18.4, 19.0)
    d.line([(ox, oy - 170), (ox, oy - 10)], fill=(255, 240, 150, int(255 * a)), width=12)
    text_c(d, oy - 290, 'NOON: short path', 44, (255, 240, 150), a, 5, x=ox + 24)
    b = ramp(t, 19.8, 20.6)
    if b > 0:
        sx = ox - 1000 * b
        d.line([(sx, oy - 120 * b), (ox - 10, oy - 4)], fill=(255, 140, 60, 255), width=12)
        text_c(d, oy - 200, 'SUNSET: long path', 58, ORANGE, b, 5, x=40)
    text_c(d, 230, 'MORE AIR', 120, WHITE_, ramp(t, 20.6, 21.0), 9)
    return im

def scene_sunset(t):  # 22.4 - 28.6
    im = next(f_clip).convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 260, 'BLUE SCATTERED', 96, SKY, ramp(t, 23.4, 23.8), 8)
    text_c(d, 370, 'AWAY', 96, SKY, ramp(t, 23.6, 24.0), 8)
    text_c(d, 500, 'RED & ORANGE', 110, ORANGE, ramp(t, 26.2, 26.6), 9)
    text_c(d, 625, 'LEFT', 110, ORANGE, ramp(t, 26.4, 26.8), 9)
    credit(im, CREDIT)
    return im

def frame(t):
    if t < 1.9: return scene_cover(t)
    if t < 6.6: return scene_prism(t)
    if t < 12.3: return scene_scatter(t)
    if t < 18.2: return scene_sky(t)
    if t < 22.4: return scene_path(t)
    if t < END: return scene_sunset(t)
    return scene_end(t - END)

if os.environ.get('PREVIEW'):
    _f = frame
    def frame(t):
        global a_clip, d_clip, f_clip
        a_clip = clip_frames(SRC(158384), 2 + min(t, 1.8), .1, xc=.55)
        d_clip = clip_frames(SRC(133823), 1 + max(0, t - 12.3), .1, xc=.5)
        f_clip = clip_frames(SRC(201308), 10 + max(0, t - 22.4), .1, xc=.45)
        return _f(t)

render(D, TOTAL, frame, (1.9, 6.6, 12.3, 18.2, 22.4, END), END, 'short_sky.mp4')
