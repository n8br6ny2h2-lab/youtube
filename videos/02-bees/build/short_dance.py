#!/usr/bin/env python3
"""Short: Bees Talk by Dancing (dikey 1080x1920). Arılar uzun videosunu tanıtır.
Kullanım: python3 short_dance.py <klasör>  (PREVIEW="0,7,12")
Klasörde: ses.mp3 + words.json (tools/shorts_ortak.tts), muzik.wav (tools/muzik_ambient.py muzik.wav 34 8),
  src/: Pixabay 30470 (mike-media), 273485 (RaimundoMaciel), 214722 (TAMGRA)
"""
import sys, os, math
sys.path.insert(0, '/workspace/youtube/tools')
from shorts_ortak import *

D = sys.argv[1]
TOTAL, END = 26.2, 22.9
load_words(D, ['dancing.', 'figure', 'eight,', 'shakes', 'angle', 'direction', 'Sun.', 'longer', 'farther', 'Nobel', 'Prize'])
PINK = (255, 110, 200); GOLD = (255, 196, 30); SKYC = (120, 200, 255)
SRC = lambda i: f'{D}/src/{i}.mp4'
CREDIT = 'Footage: Pixabay'
CFG['wm_pos'] = (W - 96 - 36, 50)   # başlıklarla çakışmasın

a_clip = clip_frames(SRC(30470), 0.5, 4.8, xc=0.42, zoom0=1.0, zoom1=1.15)
e_clip = clip_frames(SRC(214722), 3.0, 4.4, xc=0.5, zoom0=1.0, zoom1=1.1)
_comb = None
def comb():
    global _comb
    if _comb is None:
        f = next(clip_frames(SRC(273485), 2.0, 0.1, xc=0.5, crop_w=1080, crop_h=1080))
        f = f.resize((H, H)).crop(((H - W) // 2, 0, (H - W) // 2 + W, H)).filter(ImageFilter.GaussianBlur(14))
        _comb = Image.blend(f, Image.new('RGB', (W, H)), 0.7)
    return _comb.copy().convert('RGBA')

def dance(d, t, cx, cy, L, R, th_deg=40, a=1.0, show_angle=False):
    th = math.radians(th_deg); ux, uy = math.sin(th), -math.cos(th); px, py = -uy, ux
    A = (cx - ux * L / 2, cy - uy * L / 2); B = (cx + ux * L / 2, cy + uy * L / 2)
    def loop(side, n=40):
        return [(cx + ux * (L / 2) * math.cos(math.pi * i / n) + px * side * R * math.sin(math.pi * i / n),
                 cy + uy * (L / 2) * math.cos(math.pi * i / n) + py * side * R * math.sin(math.pi * i / n)) for i in range(n + 1)]
    d.line(loop(1), fill=(255, 255, 255, int(130 * a)), width=6)
    d.line(loop(-1), fill=(255, 255, 255, int(130 * a)), width=6)
    d.line([A, B], fill=(*GOLD, int(255 * a)), width=11)
    per = 3.2; ph = (t % per) / per
    if ph < 0.4:
        u = ph / 0.4; wig = 20 * math.sin(u * 2 * math.pi * 7)
        bx = A[0] + (B[0] - A[0]) * u + px * wig; by = A[1] + (B[1] - A[1]) * u + py * wig
    else:
        pts = loop(1 if int(t / per) % 2 == 0 else -1); u = (ph - 0.4) / 0.6
        bx, by = pts[min(len(pts) - 1, int(u * (len(pts) - 1)))]
    d.ellipse([bx - 26, by - 19, bx + 26, by + 19], fill=(255, 200, 40, int(255 * a)), outline=(40, 20, 0, 255), width=4)
    if show_angle:
        d.line([(cx, cy + R + 40), (cx, cy - R - 60)], fill=(255, 255, 255, int(220 * a)), width=4)
        d.arc([cx - 120, cy - 120, cx + 120, cy + 120], -90, -90 + th_deg, fill=(*SKYC, int(255 * a)), width=8)
        d.text((cx + 30, cy - 190), f'{th_deg}°', font=font(48), fill=(*SKYC, int(255 * a)))
        d.text((cx - 95, cy - R - 120), 'UP = SUN', font=font(40), fill=(*WHITE, int(255 * a)))

def sky(d, a, dist, y0=1460):
    d.rounded_rectangle([90, y0, 990, y0 + 400], 30, fill=(25, 70, 120, int(235 * a)))
    hx, hy = 540, y0 + 350; th = math.radians(40)
    d.ellipse([515, y0 + 25, 565, y0 + 75], fill=(255, 220, 60, int(255 * a)))
    d.text((580, y0 + 30), 'SUN', font=font(34), fill=(*WHITE, int(255 * a)))
    d.line([(hx, hy), (hx, y0 + 85)], fill=(255, 255, 255, int(150 * a)), width=4)
    d.rounded_rectangle([hx - 40, hy - 26, hx + 40, hy + 26], 10, fill=(200, 140, 40, int(255 * a)))
    fx, fy = hx + dist * math.sin(th), hy - dist * math.cos(th)
    d.line([(hx, hy), (fx, fy)], fill=(*GOLD, int(255 * a)), width=8)
    for k in range(5):
        q = k * 2 * math.pi / 5
        d.ellipse([fx + 20 * math.cos(q) - 13, fy + 20 * math.sin(q) - 13, fx + 20 * math.cos(q) + 13, fy + 20 * math.sin(q) + 13], fill=(240, 90, 160, int(255 * a)))
    d.arc([hx - 130, hy - 130, hx + 130, hy + 130], -90, -50, fill=(*SKYC, int(255 * a)), width=7)

def scene_cover(t):   # 0 - 4.6 (kapak: yazı ilk karede)
    im = next(a_clip).convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 250, 'BEES TALK', 130, WHITE, 1, 10)
    text_c(d, 400, 'BY DANCING', 130, PINK, 1, 10)
    credit(im, CREDIT)
    return im

def scene_dance(t):   # 4.6 - 10.0
    im = comb(); d = ImageDraw.Draw(im)
    text_c(d, 220, 'THE WAGGLE DANCE', 90, GOLD, ramp(t, 4.7, 5.0), 8)
    dance(d, t, W / 2, 800, 340, 190, a=ramp(t, 4.7, 5.2))
    if t > 8.0:
        text_c(d, 1060, 'shake = "waggle"', 54, WHITE, ramp(t, 8.1, 8.5), 5)
    return im

def scene_dir(t):     # 10.0 - 15.0
    im = comb(); d = ImageDraw.Draw(im)
    text_c(d, 200, 'ANGLE = DIRECTION', 88, GOLD, ramp(t, 10.1, 10.4), 8)
    dance(d, t, W / 2, 760, 300, 160, a=1, show_angle=True)
    sky(d, ramp(t, 12.5, 13.0), 260)
    return im

def scene_dist(t):    # 15.0 - 18.7
    im = comb(); d = ImageDraw.Draw(im)
    text_c(d, 200, 'LONGER WAGGLE', 92, WHITE, ramp(t, 15.1, 15.4), 8)
    text_c(d, 320, '= FARTHER FOOD', 92, GOLD, ramp(t, 16.6, 17.0), 8)
    g = ramp(t, 15.4, 17.5)
    L = 160 + 300 * g
    dance(d, t, W / 2, 820, L, 150 + 60 * g, a=1)
    sky(d, 1, 120 + 200 * g)
    return im

def scene_nobel(t):   # 18.7 - 22.9
    im = next(e_clip).convert('RGBA')
    im = Image.alpha_composite(im, Image.new('RGBA', (W, H), (0, 0, 0, 90))); d = ImageDraw.Draw(im)
    text_c(d, 240, 'KARL VON FRISCH', 88, WHITE, ramp(t, 19.0, 19.3), 8)
    text_c(d, 370, 'NOBEL PRIZE', 110, GOLD, ramp(t, 21.2, 21.5), 9)
    text_c(d, 500, '1973', 110, GOLD, ramp(t, 21.4, 21.7), 9)
    credit(im, CREDIT)
    return im

def scene_full(lt):
    im = scene_end(lt); d = ImageDraw.Draw(im)
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 255)); im2 = Image.blend(im, lay, 0)
    d = ImageDraw.Draw(im2)
    d.rectangle([0, 1220, W, 1420], fill=(4, 6, 16, 255))
    text_c(d, 1240, 'FULL VIDEO', 80, WHITE, ramp(lt, .1, .4))
    text_c(d, 1340, 'on the channel', 50, GOLD, ramp(lt, .3, .6))
    return im2

def frame(t):
    if t < 4.6: return scene_cover(t)
    if t < 10.0: return scene_dance(t)
    if t < 15.0: return scene_dir(t)
    if t < 18.7: return scene_dist(t)
    if t < END: return scene_nobel(t)
    return scene_full(t - END)

if os.environ.get('PREVIEW'):
    _f = frame
    def frame(t):
        global a_clip, e_clip
        a_clip = clip_frames(SRC(30470), 0.5 + min(t, 4.5), 0.1, xc=0.42)
        e_clip = clip_frames(SRC(214722), 3.0 + max(0, t - 18.7), 0.1, xc=0.5)
        return _f(t)

render(D, TOTAL, frame, (4.6, 10.0, 15.0, 18.7, END), END, 'short_dance.mp4')
