#!/usr/bin/env python3
"""Short: Honey Never Spoils (dikey 1080x1920, 30 fps, gerçek görüntü).
Kullanım: python3 short_honey.py <çalışma_klasörü>   (önizleme: PREVIEW="0,5,12")
Klasörde: ses.mp3 + words.json (tools/shorts_ortak.tts, metin: yukleme.md), muzik.wav (tools/muzik_ambient.py muzik.wav 36 6),
  src/: Pixabay 262866 (conghuynh8, 4K), 133574 (RoyBuri, 4K), 281976 (adege, 4K), 267036 + 273476 (RaimundoMaciel, 1080p)
4K klipler dikey kesilir; 1080p klipler büyütülmeden 1080x1080 kare yerleşir.
"""
import sys, os, math
sys.path.insert(0, '/workspace/youtube/tools')
from shorts_ortak import *

D = sys.argv[1]
TOTAL, END = 31.3, 28.2
load_words(D, ['thousands', 'years.', 'Egyptian', 'preserved.', 'bad?', 'water,', 'acidic.', 'enzyme', 'hydrogen', 'peroxide,', 'one', 'twelfth', 'teaspoon'])
CREDIT = 'Footage: Pixabay'
GOLD = (255, 190, 40); HONEY = (240, 150, 20)
SRC = lambda i: f'{D}/src/{i}.mp4'
CFG['wm_pos'] = (W - 96 - 36, 1530)

a_clip = clip_frames(SRC(262866), 0.0, 8.6, xc=0.52, zoom0=1.0, zoom1=1.25)
c_sq = sq_frames(SRC(267036), 1.0, 8.1, 420, 1.0, 1.1)
d_sq = sq_frames(SRC(273476), 1.0, 5.4, 420, 1.0, 1.08)
e1 = clip_frames(SRC(133574), 1.0, 1.7, xc=0.4, zoom0=1.0, zoom1=1.05)
e2 = clip_frames(SRC(281976), 10.0, 4.5, xc=0.47, zoom0=1.0, zoom1=1.1)

def scene_cover(t):  # 0 - 8.6 : kapak + mısır mezarları
    im = next(a_clip).convert('RGBA'); d = ImageDraw.Draw(im)
    if t < 2.8:
        text_c(d, 220, 'THIS FOOD', 110, WHITE, 1, 9)
        text_c(d, 350, 'NEVER SPOILS', 120, GOLD, 1, 10)
    else:
        text_c(d, 220, 'FOUND IN', 96, WHITE, ramp(t, 2.9, 3.2), 8)
        text_c(d, 330, 'EGYPTIAN TOMBS', 100, GOLD, ramp(t, 5.4, 5.7), 9)
        text_c(d, 460, 'still preserved', 60, WHITE, ramp(t, 7.4, 7.7), 6)
    credit(im, CREDIT)
    return im

def gauge(d, x, y, w, frac, col, label):
    d.rounded_rectangle([x, y, x + w, y + 46], 23, outline=(255, 255, 255, 230), width=4)
    d.rounded_rectangle([x + 6, y + 6, x + 6 + (w - 12) * frac, y + 40], 18, fill=(*col, 255))
    text_c(d, y + 60, label, 44, WHITE, 1, 5, x=x)

def scene_water(t):  # 8.6 - 16.7
    im = layout(next(c_sq)); d = ImageDraw.Draw(im)
    text_c(d, 150, 'WHY?', 140, GOLD, ramp(t, 8.7, 9.0), 10)
    a = ramp(t, 11.4, 11.8)
    if a > 0:
        text_c(d, 1530, 'WATER', 52, (120, 200, 255), a, 5, x=100)
        gauge(d, 100, 1600, 520, 0.17 * ramp(t, 11.6, 12.6), (120, 200, 255), 'only about 17%')
    b = ramp(t, 15.3, 15.6)
    if b > 0:
        text_c(d, 1530, 'ACIDIC', 52, GOLD, b, 5, x=690)
        text_c(d, 1600, 'pH', 56, WHITE, b, 5, x=690)
        text_c(d, 1660, '≈ 3.9', 64, GOLD, b, 6, x=690)
    return im

def scene_enzyme(t):  # 16.7 - 22.1
    im = layout(next(d_sq)); d = ImageDraw.Draw(im)
    text_c(d, 120, 'BEES ADD', 100, WHITE, ramp(t, 16.8, 17.1), 9)
    text_c(d, 240, 'AN ENZYME', 100, GOLD, ramp(t, 17.6, 17.9), 9)
    c = ramp(t, 18.9, 19.3)
    if c > 0:
        text_c(d, 1540, 'H₂O₂', 120, WHITE, c, 9)
        text_c(d, 1690, 'natural germ killer', 50, GOLD, ramp(t, 20.4, 20.8), 5)
    return im

def scene_bee(t):  # 22.1 - 28.2
    if t < 23.8:
        im = next(e1).convert('RGBA'); d = ImageDraw.Draw(im)
        text_c(d, 220, 'THE CRAZY PART', 92, GOLD, ramp(t, 22.2, 22.5), 8)
    else:
        im = next(e2).convert('RGBA'); d = ImageDraw.Draw(im)
        text_c(d, 200, "ONE BEE'S", 96, WHITE, ramp(t, 23.8, 24.1), 8)
        text_c(d, 310, 'WHOLE LIFE =', 96, WHITE, ramp(t, 24.0, 24.3), 8)
        c = ramp(t, 25.2, 25.6)
        if c > 0:
            text_c(d, 460, '1/12', 200, GOLD, c, 12)
            text_c(d, 690, 'TEASPOON', 90, GOLD, ramp(t, 25.8, 26.1), 8)
    credit(im, CREDIT)
    return im

def frame(t):
    if t < 8.6: return scene_cover(t)
    if t < 16.7: return scene_water(t)
    if t < 22.1: return scene_enzyme(t)
    if t < END: return scene_bee(t)
    return scene_end(t - END)

if os.environ.get('PREVIEW'):
    _frame = frame
    def frame(t):
        global a_clip, c_sq, d_sq, e1, e2
        a_clip = clip_frames(SRC(262866), min(10.5, t), 0.1, xc=0.52)
        c_sq = sq_frames(SRC(267036), 1.0 + max(0, t - 8.6), 0.1, 420)
        d_sq = sq_frames(SRC(273476), 1.0 + max(0, t - 16.7), 0.1, 420)
        e1 = clip_frames(SRC(133574), 1.0 + max(0, t - 22.1), 0.1, xc=0.4)
        e2 = clip_frames(SRC(281976), 10.0 + max(0, t - 23.8), 0.1, xc=0.47)
        return _frame(t)

render(D, TOTAL, frame, (2.8, 8.6, 16.7, 22.1, 23.8, END), END, 'short_honey.mp4')
