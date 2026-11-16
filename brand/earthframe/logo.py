#!/usr/bin/env python3
"""Earthframe TV marka görselleri: logo (800x800), kanal kapağı (2560x1440), filigran (300 şeffaf + 150 rozet).
Kullanım: python3 brand/earthframe/logo.py
Yazı tipi: Inter Display (SIL Open Font License 1.1).
"""
import math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FB = os.path.join(HERE, 'font', 'InterDisplay-Bold.otf')
FM = os.path.join(HERE, 'font', 'InterDisplay-Medium.otf')
SAND = (244, 228, 196); FOREST = (18, 58, 50); DEEP = (10, 30, 30)
SKY_TOP, SKY_BOT = (36, 74, 96), (238, 168, 110)
MTN = [(70, 110, 112), (44, 86, 84), (26, 64, 58), (14, 42, 38)]

def landscape(w, h, sun=(0.5, 0.58), sun_r=0.11, seed=0):
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    for y in range(h):
        u = min(1, y / (h * 0.75))
        d.line([(0, y), (w, y)], fill=tuple(int(a + (b - a) * u) for a, b in zip(SKY_TOP, SKY_BOT)))
    im = im.convert('RGBA')
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    sx, sy, sr = sun[0] * w, sun[1] * h, sun_r * min(w, h)
    g.ellipse([sx - sr * 2.4, sy - sr * 2.4, sx + sr * 2.4, sy + sr * 2.4], fill=(255, 210, 140, 110))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(sr)))
    d = ImageDraw.Draw(im); d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(255, 226, 170, 255))
    for k, col in enumerate(MTN):   # katmanlı dağlar
        base = h * (0.62 + k * 0.1)
        pts = [(0, h)]
        for x in range(0, w + 8, 8):
            u = x / w
            y = base - h * 0.12 * (1 - k * 0.15) * (0.55 * math.sin(u * (3 + k) * math.pi + k * 1.7 + seed) + 0.45 * math.sin(u * (7 + 2 * k) * math.pi + k))
            pts.append((x, y))
        pts.append((w, h)); d.polygon(pts, fill=col + (255,))
    # iki küçük kuş
    for bx, by, s in [(0.66, 0.36, 1.0), (0.72, 0.31, 0.75)]:
        x, y, r = bx * w, by * h, 0.018 * min(w, h) * s
        d.arc([x - 2 * r, y - r, x, y + r], 200, 340, fill=(30, 40, 50, 255), width=max(2, int(r * 0.35)))
        d.arc([x, y - r, x + 2 * r, y + r], 200, 340, fill=(30, 40, 50, 255), width=max(2, int(r * 0.35)))
    return im

def frame_corners(d, x0, y0, x1, y1, L, wdt, col):
    for (cx, cy, sx, sy) in [(x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)]:
        d.line([(cx, cy), (cx + sx * L, cy)], fill=col, width=wdt)
        d.line([(cx, cy), (cx, cy + sy * L)], fill=col, width=wdt)

def emblem(S):
    """Yuvarlak köşeli kare içinde manzara + vizör köşeleri."""
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    land = landscape(S, S, sun=(0.5, 0.52), sun_r=0.13)
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], int(S * 0.2), fill=255)
    im.paste(land, (0, 0), mask)
    d = ImageDraw.Draw(im)
    m = S * 0.12; frame_corners(d, m, m, S - m, S - m, S * 0.16, max(3, int(S * 0.035)), SAND + (255,))
    return im

def T(d, xy, s, path, size, col, anchor='la', stroke=0):
    d.text(xy, s, font=ImageFont.truetype(path, size), fill=col, anchor=anchor, stroke_width=stroke, stroke_fill=DEEP)

def logo(path, S=800):
    im = Image.new('RGBA', (S, S), FOREST + (255,))
    e = emblem(int(S * 0.62)); im.alpha_composite(e, (int(S * 0.19), int(S * 0.08)))
    d = ImageDraw.Draw(im)
    T(d, (S / 2, S * 0.81), 'EARTHFRAME', FB, int(S * 0.115), SAND, 'mm')
    T(d, (S / 2, S * 0.91), 'TV', FM, int(S * 0.07), (238, 168, 110), 'mm')
    im.convert('RGB').save(path)

def banner(path):
    W, H = 2560, 1440
    im = landscape(W, H, sun=(0.80, 0.50), sun_r=0.07, seed=1)
    shade = Image.new('RGBA', (W, H), (0, 0, 0, 0)); s = ImageDraw.Draw(shade)
    s.rounded_rectangle([660, 548, 1900, 892], 40, fill=(8, 24, 24, 150))
    im = Image.alpha_composite(im, shade.filter(ImageFilter.GaussianBlur(8)))
    e = emblem(290); im.alpha_composite(e, (700, 575))
    d = ImageDraw.Draw(im); tx = 1030; maxw = 1860 - tx
    def fit(p, sz, txt):
        while ImageFont.truetype(p, sz).getlength(txt) > maxw: sz -= 2
        return sz
    T(d, (tx, 680), 'EARTHFRAME TV', FB, fit(FB, 128, 'EARTHFRAME TV'), SAND, 'lm')
    T(d, (tx + 4, 800), 'Relaxing nature, beautifully filmed', FM, fit(FM, 58, 'Relaxing nature, beautifully filmed'), (238, 190, 140), 'lm')
    im.convert('RGB').save(path)

def watermarks():
    emblem(300).save(os.path.join(HERE, 'earthframe_filigran_300.png'))
    b = Image.new('RGBA', (600, 600), (0, 0, 0, 0)); d = ImageDraw.Draw(b)
    d.ellipse([0, 0, 599, 599], fill=FOREST + (240,), outline=SAND + (255,), width=18)
    e = emblem(380); b.alpha_composite(e, (110, 110))
    b.resize((150, 150), Image.LANCZOS).save(os.path.join(HERE, 'earthframe_filigran_150.png'))

if __name__ == '__main__':
    logo(os.path.join(HERE, 'earthframe_logo_800.png'))
    banner(os.path.join(HERE, 'earthframe_banner_2560x1440.png'))
    watermarks(); print('ok')
