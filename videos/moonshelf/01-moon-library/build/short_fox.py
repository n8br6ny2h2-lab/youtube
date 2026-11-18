#!/usr/bin/env python3
"""Moonshelf TV Short (çocuklara özel): Fox can hear a mouse under the snow. Hikâye 1'in tilki paragrafının sesinden (ek ses harcanmaz).
Kullanım: python3 short_fox.py <hikaye_klasörü>   (PREVIEW="0,8")  -> <klasör>/short_fox/moonshelf_short_fox.mp4
"""
import sys, os, shutil, subprocess, math
sys.path.insert(0, '/workspace/youtube/tools'); sys.path.insert(0, '/workspace/youtube/brand/moonshelf')
import shorts_ortak as O
from shorts_ortak import *
import logo as LG

BASE = sys.argv[1]; D = f'{BASE}/short_fox'; os.makedirs(D, exist_ok=True)
for f in ('ses.mp3', 'words.json'): shutil.copy(f'{BASE}/ses/04/{f}', f'{D}/{f}')
if not os.path.exists(f'{D}/muzik.wav'):
    subprocess.run(['python3', '/workspace/youtube/tools/muzik_ninni.py', f'{D}/muzik.wav', '40', '3'], check=True)
O.FB = '/workspace/youtube/brand/moonshelf/font/Fredoka-SemiBold.ttf'; O._fc.clear()   # yuvarlak, çocuk dostu yazı
words = load_words(D, ['Fox,', 'ears.', 'mouse,', 'snow.', 'cozy', 'den,', 'tail.'])
O.WM = Image.open('/workspace/youtube/brand/moonshelf/moonshelf_filigran_300.png').convert('RGBA').resize((100, 100), Image.LANCZOS)
CFG['wm_pos'] = (W - 100 - 36, 60)
NAR = words[-1][2]; END = NAR + 0.5; TOTAL = END + 3.0
CREAM = (255, 240, 200); GOLD = (255, 205, 110); NAVY = (14, 18, 56)
def wt(w):
    for x, s, e in words:
        if x.lower().strip('.,!?"').startswith(w.lower()): return s
SRC = lambda i: f'{BASE}/src/{i}.mp4'
SHOTS = [(0, '257540', 0, .68), (next(s_ for x, s_, e in words if x == 'Fox') - .15, '319743', 2, .45), (wt('She') - .15, '287503', 2, .5)]
_g = {}
def shot(i, t):
    a, cid, t0, xc = SHOTS[i]
    if i not in _g:
        b = SHOTS[i + 1][0] if i + 1 < len(SHOTS) else TOTAL
        _g[i] = clip_frames(SRC(cid), t0 + max(0, t - a), b - a + .5, xc=xc, zoom0=1.0, zoom1=1.12)
    return next(_g[i]).convert('RGBA')

def tc(d, y, s, size, col, a=1.0):
    if a <= 0: return
    f = font(size); w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=(*col, int(255 * a)), stroke_width=8, stroke_fill=(*NAVY, int(230 * a)))

BOOK = None
def book(im, t, t0):
    global BOOK
    if BOOK is None:
        BOOK = Image.new('RGBA', (300, 230), (0, 0, 0, 0)); d = ImageDraw.Draw(BOOK)
        d.ellipse([10, 10, 290, 220], fill=(255, 220, 140, 70)); BOOK = BOOK.filter(ImageFilter.GaussianBlur(20)); d = ImageDraw.Draw(BOOK)
        d.polygon([(150, 70), (50, 55), (50, 165), (150, 180)], fill=(255, 248, 225)); d.polygon([(150, 70), (250, 55), (250, 165), (150, 180)], fill=(255, 242, 210))
        d.line([(150, 70), (150, 180)], fill=GOLD, width=5)
    u = ease((t - t0) / 2.5); a = min(1, (t - t0) / .5)
    x = 880 + 120 * (1 - u); y = -150 + 420 * u   # baykuşun başının yanına, yüzüne değil
    b = BOOK.copy(); b.putalpha(b.split()[3].point(lambda v: int(v * a)))
    im.alpha_composite(b, (int(x - 150), int(y - 115)))
    return im

def frame(t):
    if t >= END:
        im = LG.sky(W, H, seed=5).convert('RGBA'); d = ImageDraw.Draw(im)
        e = LG.emblem(600); e.putalpha(e.split()[3].point(lambda v: int(v * ramp(t, END, END + .4)))); im.alpha_composite(e, (240, 480))
        tc(d, 1160, 'MOONSHELF TV', 100, CREAM, ramp(t, END + .2, END + .6)); tc(d, 1290, 'New stories every week', 58, GOLD, ramp(t, END + .4, END + .8))
        return im
    i = max(j for j in range(len(SHOTS)) if SHOTS[j][0] <= t)
    im = shot(i, t); d = ImageDraw.Draw(im)
    if t < 2.6:   # kapak: yazı ilk karede
        a = 1 - ramp(t, 2.2, 2.6)
        tc(d, 300, 'FOX CAN HEAR', 116, CREAM, a); tc(d, 430, 'UNDER SNOW!', 120, GOLD, a)
    so = next(s_ for x, s_, e in words if x == 'cozy') - .8   # "The Moon gives Fox a cozy book" 
    if so and t >= so: im = book(im, t, so)
    return im

if os.environ.get('PREVIEW'):
    _f = frame
    def frame(t): _g.clear(); return _f(t)
render(D, TOTAL, frame, [s[0] for s in SHOTS[1:]] + [END], END, 'moonshelf_short_fox.mp4')
