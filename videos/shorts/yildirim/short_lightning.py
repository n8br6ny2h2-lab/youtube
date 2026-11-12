#!/usr/bin/env python3
"""Short: Lightning is 5x hotter than the Sun's surface (dikey 1080x1920, 30 fps, gerçek 4K görüntü).
Kullanım: python3 short_lightning.py <çalışma_klasörü>   (önizleme: PREVIEW="0,6,12" ...)
Klasörde:
  ses.mp3 + words.json   -> tools/shorts_ortak.tts (metin: yukleme.md)
  muzik.wav              -> python3 tools/muzik_ambient.py muzik.wav 34 4
  sfx.wav                -> python3 tools/ses_efekti.py sfx.wav 30 0.05:0.5 3.7:0.35 16.6:1.0 21.9:0.7
  src/<id>.mp4           -> Pixabay 4K: 125192, 226276, 283428 (yazar: adege)
"""
import sys, os, math
sys.path.insert(0, '/workspace/youtube/tools')
from shorts_ortak import *

D = sys.argv[1]
TOTAL, END = 29.4, 26.4
load_words(D, ['lightning', '30,000', 'five', 'hotter', 'Sun.', 'fraction', 'explodes', 'thunder.', 'trick:', 'flash,', 'count', 'three,', 'kilometers'])
CREDIT = 'Footage: Pixabay (adege)'
YEL = (255, 225, 80)
SRC = lambda i: f'{D}/src/{i}.mp4'

a_clip = clip_frames(SRC(125192), 19.70, 4.9, xc=0.39, zoom0=1.0, zoom1=1.12)
b_clip = clip_frames(SRC(226276), 0.0, 3.6, xc=0.5, zoom0=1.1, zoom1=1.2)
c_clip = clip_frames(SRC(226276), 8.55, 2.5, xc=0.43, zoom0=1.0, zoom1=1.08)
d_clip = clip_frames(SRC(283428), 28.0, 6.6, xc=0.5, zoom0=1.0, zoom1=1.1)
e_clip = clip_frames(SRC(125192), 0.0, 8.8, xc=0.55, zoom0=1.05, zoom1=1.2)

def darken(im, k):
    return Image.blend(im.convert('RGBA'), Image.new('RGBA', (W, H), (0, 0, 0, 255)), k)

def scene_cover(t):  # 0 - 4.9 : kapak (yazı ilk karede hazır)
    im = next(a_clip).convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 250, '5x HOTTER', 150, YEL, 1, 10)
    text_c(d, 420, 'THAN THE SUN', 96, WHITE, 1, 8)
    c = ramp(t, 2.5, 2.8)
    text_c(d, 1060, '30,000 °C', 120, WHITE, c, 9)
    text_c(d, 1190, '(about 54,000 °F)', 48, YEL, c, 5)
    credit(im, CREDIT)
    return im

def scene_compare(t):  # 4.9 - 8.5 : sıcaklık çubukları
    im = darken(next(b_clip).filter(ImageFilter.GaussianBlur(10)), 0.55); d = ImageDraw.Draw(im)
    base = 1180; maxh = 580
    g = ramp(t, 5.2, 7.6)
    for x, val, lab, col in [(300, 5500, 'SUN SURFACE', (255, 150, 40)), (780, 30000, 'LIGHTNING', YEL)]:
        h = maxh * val / 30000 * g
        d.rounded_rectangle([x - 110, base - h, x + 110, base], 18, fill=(*col, 255))
        text_c(d, base + 20, lab, 46, WHITE, 1, 5, x=x - d.textlength(lab, font=font(46)) / 2)
        num = f'{int(val * g):,} °C'
        text_c(d, base - h - 70, num, 50, col, ramp(t, 5.2, 5.5), 5, x=x - d.textlength(num, font=font(50)) / 2)
    text_c(d, 230, 'FIVE TIMES', 100, YEL, ramp(t, 5.3, 5.6), 8)
    text_c(d, 350, 'HOTTER', 100, WHITE, ramp(t, 6.1, 6.4), 8)
    return im

def scene_fast(t):  # 8.5 - 11.0
    im = next(c_clip).convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 260, 'IN A SPLIT', 110, WHITE, ramp(t, 8.6, 8.9), 9)
    text_c(d, 390, 'SECOND', 110, YEL, ramp(t, 9.5, 9.8), 9)
    credit(im, CREDIT)
    return im

def bolt_points(x0, y0, y1, seed):
    rnd = random.Random(seed); pts = [(x0, y0)]; y = y0; x = x0
    while y < y1:
        y += rnd.uniform(30, 70); x += rnd.uniform(-45, 45); pts.append((x, min(y, y1)))
    return pts

BOLT = bolt_points(W / 2, 600, 1200, 3)
def scene_explode(t):  # 11.0 - 17.6 : hava patlar -> gök gürültüsü
    im = darken(next(d_clip), 0.35); d = ImageDraw.Draw(im)
    # şimşek çizgisi
    flick = 1.0 if (t < 11.3 or 16.6 < t < 16.9) else 0.75
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
    g.line(BOLT, fill=(200, 210, 255, int(255 * flick)), width=26, joint='curve')
    im = Image.alpha_composite(im, lay.filter(ImageFilter.GaussianBlur(16)))
    d = ImageDraw.Draw(im); d.line(BOLT, fill=(255, 255, 255, 255), width=7, joint='curve')
    # şok dalgası halkaları
    e = ramp(t, 12.3, 15.0)
    for k in range(4):
        ph = (e * 1.6 - k * 0.25)
        if 0 < ph < 1.2:
            rx = 70 + 380 * ph; ry = 330 + 100 * ph
            a = int(220 * max(0, 1 - ph / 1.2))
            d.ellipse([W / 2 - rx, 900 - ry, W / 2 + rx, 900 + ry], outline=(255, 210, 120, a), width=8)
    text_c(d, 230, 'AIR EXPLODES', 96, WHITE, ramp(t, 13.9, 14.2), 8)
    text_c(d, 345, 'OUTWARD', 96, YEL, ramp(t, 14.5, 14.8), 8)
    c = ramp(t, 16.6, 16.85)
    if c > 0:
        text_c(d, 1460, 'THUNDER', int(150 + 30 * (1 - c)), YEL, c, 12)
    # gök gürültüsünde ekran sarsıntısı
    if 16.6 < t < 17.3:
        amp = 18 * (1 - (t - 16.6) / 0.7)
        im = im.transform(im.size, Image.AFFINE, (1, 0, amp * math.sin(t * 90), 0, 1, amp * math.cos(t * 70)))
    return im

def scene_trick(t):  # 17.6 - 26.4 : say, 3'e böl
    im = darken(next(e_clip), 0.2); d = ImageDraw.Draw(im)
    text_c(d, 230, 'COUNT THE', 100, WHITE, ramp(t, 17.7, 18.0), 8)
    text_c(d, 345, 'SECONDS', 100, YEL, ramp(t, 17.9, 18.2), 8)
    if 19.1 < t < 19.9:
        text_c(d, 700, 'FLASH!', 130, WHITE, ramp(t, 19.1, 19.25), 10)
    if 19.9 <= t < 22.5:
        k = min(6, 1 + int((t - 19.9) / 0.42))
        text_c(d, 620, str(k), 300, YEL, 1, 14)
        text_c(d, 960, 'seconds', 56, WHITE, 1, 5)
    if 21.5 <= t < 22.5:
        text_c(d, 1080, 'BOOM!', 90, WHITE, ramp(t, 21.5, 21.7), 8)
    if t >= 22.5:
        a = ramp(t, 22.5, 22.9)
        text_c(d, 640, '6 s ÷ 3', 140, WHITE, a, 10)
        text_c(d, 820, '= 2 km', 160, YEL, ramp(t, 24.3, 24.7), 12)
        text_c(d, 1040, '(÷ 5 for miles)', 54, WHITE, ramp(t, 25.0, 25.4), 5)
    credit(im, CREDIT)
    return im

def frame(t):
    if t < 4.9: return scene_cover(t)
    if t < 8.5: return scene_compare(t)
    if t < 11.0: return scene_fast(t)
    if t < 17.6: return scene_explode(t)
    if t < END: return scene_trick(t)
    return scene_end(t - END)

if os.environ.get('PREVIEW'):  # önizlemede klip karelerini zamana göre al
    starts = {'a_clip': (125192, 19.70, 0.0, 0.39), 'b_clip': (226276, 0.0, 4.9, 0.5), 'c_clip': (226276, 8.55, 8.5, 0.43),
              'd_clip': (283428, 28.0, 11.0, 0.5), 'e_clip': (125192, 0.0, 17.6, 0.55)}
    _frame = frame
    def frame(t):
        for name, (i, s0, o0, xc) in starts.items():
            globals()[name] = clip_frames(SRC(i), s0 + max(0, t - o0), 0.1, xc=xc)
        return _frame(t)

render(D, TOTAL, frame, (4.9, 8.5, 11.0, 17.6, END), END, 'short_lightning.mp4', sfx=f'{D}/sfx.wav', sfx_vol=0.9)
