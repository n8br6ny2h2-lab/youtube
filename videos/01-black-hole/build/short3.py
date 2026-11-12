#!/usr/bin/env python3
"""Short 3: Time Slows Down (dikey 1080x1920, 30 fps).
Kullanım: python3 short3.py <çalışma_klasörü>   (önizleme: PREVIEW="2,6,12" ...)
Klasörde: ses.mp3 + words.json (shorts_ortak.tts), muzik.wav (tools/muzik_ambient.py ... 34 3).
Metin: videos/01-black-hole/yukleme/short3_time_slows.md
"""
import sys, os, math
sys.path.insert(0, '/workspace/youtube/tools')
import shorts_ortak as O
from shorts_ortak import *

D = sys.argv[1]
TOTAL, END = 28.4, 25.3
load_words(D, ['never', 'slower', 'slower...', 'slower.', 'redder,', 'dimmer,', 'nothing', 'moment.', 'true.', "Einstein's", 'relativity.'])
BASE_FIG = O.FIG
RED = (255, 90, 70)

def tinted(red=0.0, alpha=1.0):
    """Astronotu kırmızılaştır ve sönükleştir."""
    f = BASE_FIG.copy()
    r, g, b, a = f.split()
    k = 1 - 0.75 * red
    g = g.point(lambda v: int(v * k)); b = b.point(lambda v: int(v * k * 0.8))
    r = r.point(lambda v: int(min(255, v * (1 - 0.2 * red) + 40 * red)))
    a = a.point(lambda v: int(v * alpha))
    return Image.merge('RGBA', (r, g, b, a))

def fig_at(im, x, y, scale, red=0.0, alpha=1.0):
    O.FIG = tinted(red, alpha)
    im = place_figure(im, x, y, scale=scale)
    O.FIG = BASE_FIG
    return im

def dashed_circle(d, cx, cy, R, col, width=6, n=72):
    for k in range(0, n, 2):
        d.arc([cx - R, cy - R, cx + R, cy + R], k * 360 / n, (k + 1) * 360 / n, fill=col, width=width)

def clock(d, cx, cy, r, ang, col):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(*col, 255), width=8, fill=(10, 14, 30, 255))
    for k in range(12):
        q = k * math.pi / 6
        d.line([(cx + math.sin(q) * r * 0.8, cy - math.cos(q) * r * 0.8), (cx + math.sin(q) * r * 0.92, cy - math.cos(q) * r * 0.92)],
               fill=(*col, 255), width=5)
    d.line([(cx, cy), (cx + math.sin(ang) * r * 0.75, cy - math.cos(ang) * r * 0.75)], fill=(255, 255, 255, 255), width=9)
    d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(255, 255, 255, 255))

def scene_hook(t):
    """Kapak/açılış: kırmızı tonlarda, neredeyse durmuş dev saat + sönen astronot. Yazı ilk karede hazır."""
    im = Image.new('RGB', (W, H), (26, 4, 12)).convert('RGBA')
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    for j in range(12, 0, -1):
        r = 300 + j * 40
        g.ellipse([W / 2 - r, 880 - r, W / 2 + r, 880 + r], fill=(200, 30, 60, 10))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(30)))
    d = ImageDraw.Draw(im)
    clock(d, W / 2, 880, 300, 5.2 + 0.03 * t, (255, 90, 90))
    im = fig_at(im, W / 2 + 10, 880, 0.33, 0.9, 0.85 - 0.1 * ramp(t, 1.0, 3.9))
    d = ImageDraw.Draw(im)
    text_c(d, 250, 'TIME ALMOST', 104, WHITE, 1, 8)
    text_c(d, 380, 'STOPS', 160, (255, 90, 90), 1, 10)
    return im

def scene_clocks(t):  # 3.9 - 7.1
    lt = t - 3.9
    im = starfield(0).convert('RGBA')
    im = black_hole(im, W / 2, 1950, 420)
    d = ImageDraw.Draw(im)
    text_c(d, 210, 'TIME RUNS SLOWER', 74, WHITE, ramp(t, 4.9, 5.3), 7)
    text_c(d, 300, 'near a black hole', 54, AMBER, ramp(t, 5.4, 5.8), 5)
    clock(d, W / 2, 600, 150, lt * 4.0, BLUE)
    text_c(d, 770, 'FAR AWAY', 46, BLUE, 1, 5)
    clock(d, W / 2, 1110, 150, lt * 0.5, AMBER)
    text_c(d, 1270, 'NEAR', 46, AMBER, 1, 5) if t < 5.0 else None
    return im

HOR_Y = 1250
def scene_friend(t):  # 7.1 - 17.3
    lt = t - 7.1
    im = starfield(0).convert('RGBA')
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
    R = 2600; cx, cy = W / 2, HOR_Y + R
    g.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(0, 0, 0, 255))
    im = Image.alpha_composite(im, lay); d = ImageDraw.Draw(im)
    dashed_circle(d, cx, cy, R, (*BLUE, 255), 8, n=720)
    text_c(d, 210, "YOUR FRIEND'S VIEW", 68, WHITE, ramp(t, 7.1, 7.4), 7)
    # yavaşlayan düşüş: ufka yaklaşır ama hiç varamaz
    feet_target = HOR_Y - 10
    y_feet = feet_target - 700 * math.exp(-lt * 0.55)
    red = ramp(t, 13.6, 15.2); alpha = 1 - 0.95 * ramp(t, 15.0, 16.8)
    dim = 1 - 0.5 * ramp(t, 14.9, 16.0)
    sc = 0.5
    im = fig_at(im, W / 2, y_feet - FIG_H * sc / 2, sc, red, alpha * dim)
    d = ImageDraw.Draw(im)
    # yavaşlayan saat (küçük)
    clock(d, 160, 420, 80, 0.4 + 3.0 * (1 - math.exp(-lt * 0.55)) / 0.55, AMBER)
    return im

def scene_you(t):  # 17.3 - 21.6
    lt = t - 17.3
    im = starfield(lt * 40).convert('RGBA')
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
    R = 2600; cx, cy = W / 2, HOR_Y + R
    g.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(0, 0, 0, 255))
    im = Image.alpha_composite(im, lay); d = ImageDraw.Draw(im)
    dashed_circle(d, cx, cy, R, (*BLUE, 255), 8, n=720)
    text_c(d, 200, 'YOUR VIEW', 92, AMBER, ramp(t, 17.3, 17.6), 8)
    sc = 0.5
    y = 500 + 330 * lt   # sabit hızla düşer, ~20.5'te sınırı geçer
    im = fig_at(im, W / 2 + 170, y, sc)
    return im

def scene_both(t):  # 21.6 - 25.3
    im = starfield(0).convert('RGBA'); d = ImageDraw.Draw(im)
    d.line([(W / 2, 520), (W / 2, 1200)], fill=(255, 255, 255, 120), width=3)
    im = fig_at(im, W / 4, 800, 0.42, 1.0, 0.35)
    im = fig_at(im, 3 * W / 4, 800, 0.42)
    d = ImageDraw.Draw(im)
    text_c(d, 1020, 'FRIEND SEES', 40, (255, 120, 100), 1, 4, x=70)
    text_c(d, 1070, 'you fade away', 40, WHITE, 1, 4, x=70)
    text_c(d, 1020, 'YOU FEEL', 40, AMBER, 1, 4, x=W / 2 + 90)
    text_c(d, 1070, 'a quick crossing', 40, WHITE, 1, 4, x=W / 2 + 70)
    text_c(d, 200, 'BOTH ARE TRUE', 92, WHITE, ramp(t, 21.7, 22.0), 8)
    text_c(d, 310, "EINSTEIN'S RELATIVITY", 62, AMBER, ramp(t, 23.6, 24.0), 6)
    return im

def frame(t):
    if t < 3.9: return scene_hook(t)
    if t < 7.1: return scene_clocks(t)
    if t < 17.3: return scene_friend(t)
    if t < 21.6: return scene_you(t)
    if t < END: return scene_both(t)
    return scene_end(t - END)

render(D, TOTAL, frame, (3.9, 7.1, 17.3, 21.6, END), END, 'short3_time_slows.mp4')
