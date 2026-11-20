#!/usr/bin/env python3
"""Kavci Lab Short: How Hot Is Lava? (dikey 1080x1920). Kaynak: USGS (Volcano Hazards Program).
Kullanım: python3 short_lava.py <klasör>  (PREVIEW="0,4,8")
Klasörde: ses.mp3 + words.json (George), muzik.wav (tools/muzik_ambient.py muzik.wav 36 31),
  src/: Pixabay 234084, 219833 (TungArt7), 92288 (caeuje), 211700, 165042 (Gylfi), 190532 (Rudimaes)
"""
import sys, os, math
sys.path.insert(0, '/workspace/youtube/tools')
from shorts_ortak import *

D = sys.argv[1]
TOTAL, END = 31.4, 28.5
load_words(D, ['hotter', 'eleven', 'hundred', 'copper.', 'magma:', 'melts.', 'lava.', 'amazing', 'brand', 'new', 'rock.', 'Hawaii', 'thirteen', 'active'])
LAVA = (255, 120, 30); HOT = (255, 200, 60); ROCK = (60, 52, 50)
SRC = lambda i: f'{D}/src/{i}.mp4'; CREDIT = 'Footage: Pixabay'
CL = {}
def clip(name, cid, t0, dur, xc, z0=1.0, z1=1.12):
    if name not in CL: CL[name] = clip_frames(SRC(cid), t0, dur, xc=xc, zoom0=z0, zoom1=z1)
    return next(CL[name]).convert('RGBA')

def scene_cover(t):   # 0 - 3.3 (yazı ilk karede)
    im = clip('a', '234084', 4, 3.6, .32); d = ImageDraw.Draw(im)
    text_c(d, 300, 'LAVA', 150, WHITE, 1, 10)
    text_c(d, 450, '1,100 °C', 170, HOT, 1, 12)
    credit(im, CREDIT)
    return im

def scene_copper(t):  # 3.3 - 5.6
    im = clip('b', '92288', 3, 2.6, .5); d = ImageDraw.Draw(im)
    text_c(d, 260, 'HOT ENOUGH TO', 90, WHITE, ramp(t, 3.4, 3.7), 8)
    text_c(d, 370, 'MELT COPPER', 110, (255, 235, 205), ramp(t, 4.2, 4.5), 9)
    text_c(d, 1480, 'copper melts at 1,085 °C', 48, WHITE, ramp(t, 4.6, 5.0), 5)
    credit(im, CREDIT)
    return im

def scene_magma(t):   # 5.6 - 10.2: kesit çizimi
    im = Image.new('RGBA', (W, H), (16, 20, 40, 255)); d = ImageDraw.Draw(im)
    gy = 900   # yer yüzeyi
    d.polygon([(0, gy), (330, gy), (500, 560), (580, 560), (750, gy), (W, gy), (W, H), (0, H)], fill=ROCK + (255,))
    for k in range(6):   # katmanlar
        y = gy + 120 + k * 110
        d.line([(0, y), (W, y + 20 * math.sin(k))], fill=(80, 70, 66, 255), width=6)
    a = ramp(t, 5.8, 6.6)
    d.ellipse([300, 1350, 780, 1650], fill=(*LAVA, int(255 * a)))      # magma odası
    rise = ramp(t, 8.0, 10.0)
    top = 1360 - (1360 - 560) * rise
    d.rectangle([515, top, 565, 1380], fill=(*LAVA, int(255 * a)))     # baca
    if rise > .95:
        for k in range(10):
            q = -math.pi / 2 + (k - 4.5) * .2; L = 120 + 40 * math.sin(t * 6 + k)
            d.line([(540, 560), (540 + L * math.cos(q), 560 + L * math.sin(q))], fill=(*HOT, 255), width=10)
    text_c(d, 1680, 'MAGMA', 90, LAVA, ramp(t, 7.0, 7.4), 7)
    text_c(d, 1790, 'melted rock underground', 46, WHITE, ramp(t, 8.1, 8.5), 4)
    text_c(d, 230, 'DEEP UNDERGROUND', 84, WHITE, ramp(t, 5.7, 6.1), 7)
    return im

def scene_crater(t):  # 10.2 - 13.6
    im = clip('d', '211700', 4, 3.6, .55); d = ImageDraw.Draw(im)
    text_c(d, 260, 'OUT OF THE VOLCANO', 80, WHITE, ramp(t, 10.3, 10.7), 7)
    text_c(d, 370, '= LAVA', 130, LAVA, ramp(t, 12.6, 12.9), 10)
    credit(im, CREDIT)
    return im

def scene_cool(t):    # 13.6 - 18.6
    im = clip('e', '219833', 2, 5.2, .4); d = ImageDraw.Draw(im)
    text_c(d, 260, 'IT COOLS INTO', 96, WHITE, ramp(t, 15.4, 15.8), 8)
    text_c(d, 375, 'BRAND NEW ROCK', 104, (255, 235, 205), ramp(t, 17.1, 17.5), 9)
    credit(im, CREDIT)
    return im

def scene_island(t):  # 18.6 - 23.0
    im = clip('f', '190532', 3, 4.6, .5); d = ImageDraw.Draw(im)
    text_c(d, 260, 'VOLCANIC', 120, WHITE, ramp(t, 19.2, 19.6), 9)
    text_c(d, 385, 'ISLANDS', 120, (110, 220, 200), ramp(t, 19.6, 20.0), 9)
    text_c(d, 530, 'like Hawaii: built layer by layer', 52, WHITE, ramp(t, 21.5, 21.9), 5)
    credit(im, CREDIT)
    return im

def scene_count(t):   # 23.0 - 28.5
    im = clip('g', '165042', 2, 5.7, .5)
    im = Image.alpha_composite(im, Image.new('RGBA', (W, H), (0, 0, 0, 80))); d = ImageDraw.Draw(im)
    c = ramp(t, 24.0, 25.4)
    text_c(d, 480, f'≈ {int(1300 * c):,}', 190, HOT, ramp(t, 24.0, 24.3), 12)
    text_c(d, 700, 'ACTIVE VOLCANOES', 84, WHITE, ramp(t, 25.5, 25.9), 7)
    text_c(d, 800, 'on land, worldwide', 54, WHITE, ramp(t, 26.8, 27.2), 5)
    text_c(d, 1480, 'Source: USGS', 40, WHITE, ramp(t, 25.5, 25.9), 4)
    credit(im, CREDIT)
    return im

def frame(t):
    if t < 3.3: return scene_cover(t)
    if t < 5.6: return scene_copper(t)
    if t < 10.2: return scene_magma(t)
    if t < 13.6: return scene_crater(t)
    if t < 18.6: return scene_cool(t)
    if t < 23.0: return scene_island(t)
    if t < END: return scene_count(t)
    return scene_end(t - END)

if os.environ.get('PREVIEW'):
    OFF = {'a': (0, '234084', 4, .32), 'b': (3.3, '92288', 3, .5), 'd': (10.2, '211700', 4, .55), 'e': (13.6, '219833', 2, .4),
           'f': (18.6, '190532', 3, .5), 'g': (23.0, '165042', 2, .5)}
    _f = frame
    def frame(t):
        CL.clear()
        for k, (a, cid, t0, xc) in OFF.items(): CL[k] = clip_frames(SRC(cid), t0 + max(0, t - a), .1, xc=xc)
        return _f(t)

render(D, TOTAL, frame, (3.3, 5.6, 10.2, 13.6, 18.6, 23.0, END), END, 'short_lava.mp4')
