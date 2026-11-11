#!/usr/bin/env python3
"""Short 2: The Event Horizon (dikey 1080x1920, 30 fps).
Kullanım: python3 short2.py <çalışma_klasörü>   (önizleme: PREVIEW="2,8,12" python3 short2.py ...)
Klasörde: ses.mp3 + words.json (shorts_ortak.tts ile), muzik.wav (tools/muzik_ambient.py ... 34 2), src/disk.mp4 (NASA SVS 13326).
Metin: videos/01-black-hole/yukleme/short2_event_horizon.md
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shorts_ortak import *

D = sys.argv[1]
TOTAL, END = 30.2, 27.3
load_words(D, ['return...', 'notice.', 'horizon.', 'inward.', 'light', 'nothing', 'wall.', 'bump.', "can't", 'see.'])
CREDIT = 'Visualization: NASA Goddard / J. Schnittman'

def dashed_circle(d, cx, cy, R, col, width=6, n=72):
    for k in range(0, n, 2):
        d.arc([cx - R, cy - R, cx + R, cy + R], k * 360 / n, (k + 1) * 360 / n, fill=col, width=width)

def curve_arrow(d, p0, p1, p2, col, prog=1.0, width=8, head=26):
    """Kuadratik eğri ok; prog: 0..1 çizim ilerlemesi."""
    pts = []
    for i in range(41):
        u = prog * i / 40
        x = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0]
        y = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]
        pts.append((x, y))
    if len(pts) < 2: return
    d.line(pts, fill=col, width=width, joint='curve')
    (xa, ya), (xb, yb) = pts[-2], pts[-1]
    ang = math.atan2(yb - ya, xb - xa)
    tip = (xb + math.cos(ang) * head * 0.5, yb + math.sin(ang) * head * 0.5)
    l = (xb + math.cos(ang + 2.5) * head, yb + math.sin(ang + 2.5) * head)
    r = (xb + math.cos(ang - 2.5) * head, yb + math.sin(ang - 2.5) * head)
    d.polygon([tip, l, r], fill=col)

hook = disk_frames(24.0, 4.2, 1.0, 1.35)
mid = disk_frames(30.0, 6.2, 1.15, 1.0)
CX, CY = W / 2, 900

def scene_hook(t):
    im = next(hook).convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 300, 'THE POINT OF', 80, WHITE, ramp(t, 0.0, 0.3))
    text_c(d, 395, 'NO RETURN', 120, AMBER, ramp(t, 0.15, 0.45))
    credit(im, CREDIT)
    return im

def scene_horizon(t):  # 4.0 - 8.9
    im = starfield((t - 4) * 8).convert('RGBA')
    im = black_hole(im, CX, CY, 200)
    d = ImageDraw.Draw(im)
    a = ramp(t, 5.9, 6.8)
    R = 200 + 160 * a
    if a > 0:
        dashed_circle(d, CX, CY, R, (*BLUE, int(255 * a)), 7)
    b = ramp(t, 7.4, 7.8)
    text_c(d, 300, 'EVENT HORIZON', 92, BLUE, b, 7)
    text_c(d, 410, 'an invisible line', 52, WHITE, ramp(t, 6.0, 6.4), 5)
    return im

def scene_paths(t):  # 8.9 - 14.9
    im = starfield(0).convert('RGBA')
    im = black_hole(im, CX, CY, 130)
    d = ImageDraw.Draw(im)
    R = 380
    dashed_circle(d, CX, CY, R, (*BLUE, 255), 7)
    # "sen" noktası ufkun içinde
    px, py = CX + 60, CY - 260
    d.ellipse([px - 18, py - 18, px + 18, py + 18], fill=(255, 255, 255, 255))
    # her yol içeri
    a = ramp(t, 9.9, 11.3)
    ends = [(-1.0, -0.2), (-0.4, -0.8), (0.4, -0.9), (1.0, -0.3), (0.9, 0.5), (-0.9, 0.6)]
    for k, (ex, ey) in enumerate(ends):
        c1 = (px + ex * 170, py + 60 + ey * 40)
        curve_arrow(d, (px, py), c1, (CX + ex * 40, CY + 20), (*AMBER, int(230 * min(1, a * 1.3))), prog=a, width=7)
    text_c(d, 230, 'EVERY PATH', 84, WHITE, ramp(t, 9.9, 10.3), 7)
    text_c(d, 330, 'LEADS INWARD', 84, AMBER, ramp(t, 11.0, 11.4), 7)
    # ışık: dışarı çıkmaya çalışır, geri döner
    b = ramp(t, 12.4, 14.4)
    if t > 12.3:
        q0 = (px, py); q1 = (CX - 330, CY - 480); q2 = (CX - 40, CY - 20)
        curve_arrow(d, q0, q1, q2, (255, 245, 170, 255), prog=max(0.02, b), width=6, head=22)
        text_c(d, CY - 140, 'LIGHT', 46, (255, 245, 170), ramp(t, 12.4, 12.8), 5, x=CX - 340)
    return im

def scene_giant(t):  # 14.9 - 20.9
    im = next(mid).convert('RGBA'); d = ImageDraw.Draw(im)
    text_c(d, 280, 'GIANT BLACK HOLE', 82, WHITE, ramp(t, 15.0, 15.4), 7)
    text_c(d, 380, 'like Sagittarius A*', 54, AMBER, ramp(t, 16.6, 17.0), 5)
    text_c(d, 450, '4 million times the Sun', 46, WHITE, ramp(t, 17.3, 17.7), 5)
    credit(im, CREDIT)
    return im

def scene_cross(t):  # 20.9 - 27.3
    lt = t - 20.9
    im = starfield(lt * 25).convert('RGBA')
    # dev ufuk: ekranın altında kocaman bir yay
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
    R = 2600; cx, cy = W / 2, 1150 + R
    g.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(0, 0, 0, 255))
    im = Image.alpha_composite(im, lay); d = ImageDraw.Draw(im)
    vis = 1 - ramp(t, 25.2, 26.3)   # "can't even see": çizgi kaybolur
    if vis > 0:
        dashed_circle(d, cx, cy, R, (*BLUE, int(255 * vis)), 8, n=720)
        text_c(d, 1060, 'EVENT HORIZON', 44, BLUE, vis * ramp(t, 21.0, 21.4), 5, x=60)
    fy = 700 + 560 * ramp(t, 20.9, 26.6)   # astronot sakin süzülür, ~23.7'de çizgiyi geçer
    im = place_figure(im, W - 190, fy, scale=0.45)
    d = ImageDraw.Draw(im)
    text_c(d, 230, 'NO WALL.', 92, WHITE, ramp(t, 21.1, 21.4), 8)
    text_c(d, 345, 'NO BUMP.', 92, AMBER, ramp(t, 22.0, 22.3), 8)
    return im

def frame(t):
    if t < 4.0: return scene_hook(t)
    if t < 8.9: return scene_horizon(t)
    if t < 14.9: return scene_paths(t)
    if t < 20.9: return scene_giant(t)
    if t < END: return scene_cross(t)
    return scene_end(t - END)

if os.environ.get('PREVIEW'):  # önizlemede disk karelerini zamana göre al
    _h, _m = scene_hook, scene_giant
    def scene_hook(t):
        global hook; hook = disk_frames(24.0 + t, 0.1, 1.1, 1.1); return _h(t)
    def scene_giant(t):
        global mid; mid = disk_frames(30.0 + t - 14.9, 0.1, 1.1, 1.1); return _m(t)

render(D, TOTAL, frame, (4.0, 8.9, 14.9, 20.9, END), END, 'short2_event_horizon.mp4')
