#!/usr/bin/env python3
"""Moonshelf TV marka görselleri: logo (800x800), kanal kapağı (2560x1440), filigran (300x300).
Kullanım: python3 brand/moonshelf/logo.py   -> brand/moonshelf/ içine PNG'ler
Yazı tipi: Fredoka SemiBold (Google Fonts, SIL Open Font License).
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, 'font', 'Fredoka-SemiBold.ttf')
NAVY_TOP, NAVY_BOT = (22, 26, 74), (8, 10, 34)
MOON = (255, 228, 150); MOON_EDGE = (255, 200, 90)
BOOKS = [(255, 122, 122), (90, 200, 190), (170, 130, 240), (255, 190, 80), (120, 180, 255), (140, 220, 140)]

def sky(w, h, seed=3, n=None):
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    for y in range(h):
        u = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(a + (b - a) * u) for a, b in zip(NAVY_TOP, NAVY_BOT)))
    rnd = random.Random(seed)
    for _ in range(n or w * h // 4000):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h); r = rnd.choice([1, 1, 1.5, 2, 2.5])
        c = rnd.randint(170, 255); d.ellipse([x - r, y - r, x + r, y + r], fill=(c, c, min(255, c + 10)))
    return im

def star(d, cx, cy, r, col):
    pts = []
    for i in range(10):
        q = -math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(q), cy + rr * math.sin(q)))
    d.polygon(pts, fill=col)

def emblem(size):
    """Hilal ay + üzerinde duran kitaplar (şeffaf arka plan)."""
    S = size; im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    # ay parıltısı
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse([S * .12, S * .1, S * .88, S * .86], fill=(255, 225, 120, 55))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(S * .06)))
    # hilal: büyük daire - kaydırılmış daire
    moon = Image.new('L', (S, S), 0); m = ImageDraw.Draw(moon)
    m.ellipse([S * .16, S * .12, S * .84, S * .80], fill=255)
    m.ellipse([S * .30, S * .02, S * .98, S * .70], fill=0)
    layer = Image.new('RGBA', (S, S), MOON + (255,)); layer.putalpha(moon)
    im = Image.alpha_composite(im, layer)
    # kitaplar: hilalin alt kavisine dizili (raf gibi)
    d = ImageDraw.Draw(im)
    base_y = S * .66; x = S * .30
    widths = [.075, .06, .085, .065, .07, .06]
    heights = [.26, .21, .28, .19, .24, .2]
    for i, (bw, bh) in enumerate(zip(widths, heights)):
        w, h = S * bw, S * bh
        if i == 5:   # son kitap yaslanmış
            box = Image.new('RGBA', (int(w), int(h)), (0, 0, 0, 0)); bd = ImageDraw.Draw(box)
            bd.rounded_rectangle([0, 0, w - 1, h - 1], int(S * .012), fill=BOOKS[i] + (255,))
            bd.rectangle([0, h * .18, w, h * .25], fill=(255, 255, 255, 170))
            box = box.rotate(-18, expand=True, resample=Image.BICUBIC)
            im.alpha_composite(box, (int(x - S * .01), int(base_y - box.size[1])))
            break
        d.rounded_rectangle([x, base_y - h, x + w, base_y], int(S * .012), fill=BOOKS[i])
        d.rectangle([x, base_y - h * .82, x + w, base_y - h * .76], fill=(255, 255, 255, 170))
        d.rectangle([x, base_y - h * .26, x + w, base_y - h * .20], fill=(255, 255, 255, 170))
        x += w + S * .006
    # raf tahtası
    d.rounded_rectangle([S * .26, base_y, S * .80, base_y + S * .035], int(S * .015), fill=(150, 95, 60))
    # küçük yıldızlar
    star(d, S * .80, S * .20, S * .045, (255, 236, 170))
    star(d, S * .70, S * .09, S * .025, (255, 236, 170))
    star(d, S * .88, S * .36, S * .02, (255, 236, 170))
    return im

def text(d, xy, s, size, col, anchor='la', stroke=0, scol=(0, 0, 0)):
    d.text(xy, s, font=ImageFont.truetype(FONT, size), fill=col, anchor=anchor, stroke_width=stroke, stroke_fill=scol)

def logo(path, S=800):
    bg = sky(S, S, n=160).convert('RGBA')
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).ellipse([0, 0, S - 1, S - 1], fill=255)
    em = emblem(int(S * .78)); bg.alpha_composite(em, (int(S * .11), int(S * .02)))
    d = ImageDraw.Draw(bg)
    text(d, (S / 2, S * .73), 'MOONSHELF', int(S * .135), (255, 240, 200), 'mm', int(S * .012), NAVY_BOT)
    d.rounded_rectangle([S * .40, S * .80, S * .60, S * .90], int(S * .03), fill=(255, 122, 122))
    text(d, (S / 2, S * .852), 'TV', int(S * .075), (255, 255, 255), 'mm')
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(bg, (0, 0), mask)
    # YouTube profil resmi kare yüklenir, daire kesimini YouTube yapar: kare kaydet
    bg.convert('RGB').save(path)
    return bg

def banner(path):
    W, H = 2560, 1440
    im = sky(W, H, seed=7).convert('RGBA'); d = ImageDraw.Draw(im)
    # yumuşak tepeler (alt)
    for k, (col, amp, off) in enumerate([((30, 36, 96), 60, 1180), ((20, 24, 70), 80, 1260)]):
        pts = [(x, off + amp * math.sin(x / 260 + k)) for x in range(0, W + 20, 20)] + [(W, H), (0, H)]
        d.polygon(pts, fill=col)
    # güvenli alan: ortadaki 1546x423 (x 507-2053, y 508-931)
    em = emblem(420); im.alpha_composite(em, (560, 500))
    text(d, (1010, 640), 'MOONSHELF TV', 150, (255, 240, 200), 'lm', 8, NAVY_BOT)
    text(d, (1015, 790), 'Cozy bedtime stories for curious kids', 64, (255, 200, 120), 'lm')
    for x, y, r in [(1900, 560, 22), (1980, 690, 14), (420, 300, 18), (2200, 260, 16), (300, 900, 12)]:
        star(d, x, y, r, (255, 236, 170))
    im.convert('RGB').save(path)

def watermark(path):
    em = emblem(300); em.save(path)

if __name__ == '__main__':
    logo(os.path.join(HERE, 'moonshelf_logo_800.png'))
    banner(os.path.join(HERE, 'moonshelf_banner_2560x1440.png'))
    watermark(os.path.join(HERE, 'moonshelf_filigran_300.png'))
    print('ok')
