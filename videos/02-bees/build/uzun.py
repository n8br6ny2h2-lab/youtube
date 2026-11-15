#!/usr/bin/env python3
"""Video 2: How Do Bees Build Perfect Hexagons? (1920x1080, 30 fps)
Kullanım: python3 uzun.py <çalışma_klasörü>          tam render
          PREVIEW="12,95,200" python3 uzun.py <klasör>  tek kareler (preview.png)
Klasörde: sections.json + ses/NN/{ses.mp3,words.json} (shorts_ortak.tts ile, bölüm bölüm),
          muzik.wav (tools/muzik_ambient.py muzik.wav 380 7), src/<pixabay_id>.mp4
Çıktılar: video_bees.mp4, altyazi.srt, bolumler.txt
"""
import json, math, os, random, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = sys.argv[1]; REPO = '/workspace/youtube'
W, H, FPS = 1920, 1080, 30
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
_fc = {}
def font(s, bold=True):
    k = (s, bold)
    if k not in _fc: _fc[k] = ImageFont.truetype(FB if bold else FR, s)
    return _fc[k]
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def ramp(t, a, b): return ease((t - a) / (b - a))
GOLD = (255, 190, 40); WHITE = (255, 255, 255); DARK = (20, 14, 6); RED = (235, 70, 60); SKY = (120, 200, 255)

# ---------------------------------------------------------------- zaman çizelgesi
secs = json.load(open(f'{D}/sections.json'))
LEAD, GAP, LOGO_LEN, END_LEN = 0.5, 0.9, 2.6, 20.0
starts, t = [], LEAD
durs = []
for k in range(len(secs)):
    w = json.load(open(f'{D}/ses/{k:02d}/words.json')); dur = w[-1][2] + 0.15
    starts.append(t); durs.append(dur)
    t += dur + GAP
    if k == 0:
        LOGO_AT = t - GAP + 0.2; t = LOGO_AT + LOGO_LEN + 0.2
END_AT = t + 0.3
TOTAL = END_AT + END_LEN

# ---------------------------------------------------------------- klip okuma (Ken Burns)
def probe_wh(p):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                        '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip().split(',')
    return int(o[0]), int(o[1])

class Clip:
    def __init__(self, cid, t0, dur, z0=1.0, z1=1.08, fx=0.5, fy=0.5):
        src = f'{D}/src/{cid}.mp4'; sw, sh = probe_wh(src); self.src = src
        self.R = (2304, 1296) if sw >= 3840 else (1920, 1080)
        if sw < 3840: z0, z1 = min(z0, 1.04), min(z1, 1.04)   # 1080p kaynak: neredeyse hiç büyütme yok
        self.z0, self.z1, self.fx, self.fy, self.dur = z0, z1, fx, fy, dur
        self.n = int(math.ceil(dur * FPS)) + 2
        self.p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur + 0.4), '-i', src, '-vf',
                                   f'fps={FPS},scale={self.R[0]}:{self.R[1]}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                                  stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.i = 0; self.last = None
    def next(self):
        RW, RH = self.R; buf = self.p.stdout.read(RW * RH * 3) if self.p else b''
        if len(buf) == RW * RH * 3:
            im = Image.frombuffer('RGB', (RW, RH), buf)
            z = self.z0 + (self.z1 - self.z0) * ease(self.i / max(1, self.n - 1))
            bw, bh = W * (RW / W) / z, H * (RH / H) / z
            cx = self.fx * RW; cy = self.fy * RH
            x0 = min(max(0, cx - bw / 2), RW - bw); y0 = min(max(0, cy - bh / 2), RH - bh)
            self.last = im.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + bw, y0 + bh))
        elif self.p:
            self.p.stdout.close(); self.p.wait(); self.p = None
            if self.last is None:   # başlangıç klipten uzunsa baştan oku
                self.p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', self.src, '-vf',
                                           f'fps={FPS},scale={RW}:{RH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
                return self.next()
        self.i += 1
        return self.last.copy()

def still(cid, t0):
    c = Clip(cid, t0, 0.1, 1, 1); im = c.next()
    if c.p: c.p.kill()
    return im

# ---------------------------------------------------------------- çizim yardımcıları
def text_c(d, y, s, size, col=WHITE, a=1.0, stroke=6, x=None, bold=True):
    if a <= 0: return
    f = font(size, bold); w = d.textlength(s, font=f)
    xx = (W - w) / 2 if x is None else x
    d.text((xx, y), s, font=f, fill=(*col, int(255 * a)), stroke_width=stroke, stroke_fill=(0, 0, 0, int(200 * a)))

def label(im, s, a=1.0, sub=None, y=860):
    """Alt bilgi etiketi (lower third)."""
    if a <= 0: return im
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    f = font(50); w = d.textlength(s, font=f)
    if sub: w = max(w, d.textlength(sub, font=font(34, False)))
    x0 = 90 - (1 - a) * 60; h = 96 if not sub else 146
    d.rounded_rectangle([x0, y, x0 + w + 70, y + h], 16, fill=(15, 10, 4, int(200 * a)))
    d.rectangle([x0, y, x0 + 12, y + h], fill=(*GOLD, int(255 * a)))
    d.text((x0 + 40, y + 18), s, font=f, fill=(*WHITE, int(255 * a)))
    if sub: d.text((x0 + 40, y + 84), sub, font=font(34, False), fill=(*GOLD, int(255 * a)))
    return Image.alpha_composite(im.convert('RGBA'), lay)

def dim(im, k=0.55, blur=0):
    im = im.convert('RGB')
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    return Image.blend(im, Image.new('RGB', (W, H), (0, 0, 0)), k).convert('RGBA')

def hex_pts(cx, cy, r, rot=0.0):
    return [(cx + r * math.cos(math.radians(60 * i + rot)), cy + r * math.sin(math.radians(60 * i + rot))) for i in range(6)]

def morph_pts(cx, cy, r, u, n=72):
    """u=0 daire, u=1 altıgen (köşeler 0°,60°...)"""
    out = []
    for i in range(n):
        q = 2 * math.pi * i / n
        # altıgen yarıçapı bu açıda
        a = (q % (math.pi / 3)) - math.pi / 6
        rh = r * math.cos(math.pi / 6) / math.cos(a)
        rc = r * math.cos(math.pi / 6)
        rr = rc + (rh - rc) * u
        out.append((cx + rr * math.cos(q), cy + rr * math.sin(q)))
    return out

COMB = None
def comb_bg():
    global COMB
    if COMB is None: COMB = dim(still('273485', 2.0), 0.72, 14)
    return COMB.copy()

WM = Image.open(f'{REPO}/brand/kavcilab_filigran_300.png').convert('RGBA').resize((72, 72), Image.LANCZOS)
WM.putalpha(WM.split()[3].point(lambda v: int(v * 0.7)))
LOGO = Image.open(f'{REPO}/brand/kavcilab_logo_yazili.png').convert('RGB')

# ---------------------------------------------------------------- grafikler (t = sahne içi saniye)
def g_proven(t):
    im = dim(still('267036', 3), 0.6, 10); d = ImageDraw.Draw(im)
    text_c(d, 360, 'PROVEN ONLY IN', 70, WHITE, ramp(t, 0, .3))
    text_c(d, 460, '1999', 200, GOLD, ramp(t, .4, .8), 10)
    return im

def g_shapes_q(t):
    im = Image.new('RGBA', (W, H), (18, 12, 4, 255)); d = ImageDraw.Draw(im)
    xs = [360, 760, 1160, 1560]
    a = [ramp(t, .1 + i * .35, .4 + i * .35) for i in range(4)]
    col = (255, 255, 255)
    d.polygon([(xs[0], 380), (xs[0] - 130, 610), (xs[0] + 130, 610)], outline=(*col, int(255 * a[0])), width=10)
    d.rectangle([xs[1] - 115, 380, xs[1] + 115, 610], outline=(*col, int(255 * a[1])), width=10)
    d.ellipse([xs[2] - 120, 375, xs[2] + 120, 615], outline=(*col, int(255 * a[2])), width=10)
    d.polygon(hex_pts(xs[3], 495, 130), outline=(*GOLD, int(255 * a[3])), width=12)
    text_c(d, 700, 'WHY HEXAGONS?', 96, GOLD, ramp(t, 1.4, 1.8))
    return im

def g_roles(t, focus):
    im = dim(still('178049', 5), 0.62, 12); d = ImageDraw.Draw(im)
    cards = [('QUEEN', '1 per colony', 'lays up to ~2,000 eggs a day'),
             ('WORKERS', 'tens of thousands', 'all female'),
             ('DRONES', 'a few hundred', 'male')]
    for i, (a, b, c) in enumerate(cards):
        x = 160 + i * 560; on = (i == focus)
        app = ramp(t, i * .25, i * .25 + .4)
        fill = (60, 40, 8, int(235 * app)) if on else (25, 18, 8, int(200 * app))
        d.rounded_rectangle([x, 300, x + 480, 720], 26, fill=fill, outline=(*GOLD, int((255 if on else 90) * app)), width=6 if on else 3)
        d.polygon(hex_pts(x + 240, 400, 60, 30), fill=(*GOLD, int((255 if on else 120) * app)))
        text_c(d, 490, a, 64, GOLD if on else WHITE, app, 4, x=x + 240 - d.textlength(a, font=font(64)) / 2)
        text_c(d, 580, b, 40, WHITE, app, 3, x=x + 240 - d.textlength(b, font=font(40)) / 2)
        f = font(30, False)
        d.text((x + 240 - d.textlength(c, font=f) / 2, 645), c, font=f, fill=(*GOLD, int(255 * app)))
    return im

def g_wax_cost(t):
    im = dim(still('262866', 2), 0.6, 8); d = ImageDraw.Draw(im)
    text_c(d, 150, 'WAX IS EXPENSIVE', 84, WHITE, ramp(t, 0, .3))
    n = 7
    for i in range(n):
        a = ramp(t, .6 + i * .18, .9 + i * .18)
        x = 230 + i * 120
        d.rounded_rectangle([x, 470, x + 90, 600], 14, fill=(240, 150, 20, int(255 * a)), outline=(255, 220, 140, int(255 * a)), width=4)
        d.rectangle([x + 10, 450, x + 80, 474], fill=(200, 160, 90, int(255 * a)))
    b = ramp(t, 2.2, 2.6)
    text_c(d, 640, '6–8 kg of honey', 58, GOLD, b, 5, x=230)
    d.line([(1120, 535), (1260, 535)], fill=(*WHITE, int(255 * b)), width=10)
    d.polygon([(1290, 535), (1250, 510), (1250, 560)], fill=(*WHITE, int(255 * b)))
    c = ramp(t, 3.0, 3.4)
    d.rounded_rectangle([1340, 470, 1560, 600], 18, fill=(250, 235, 190, int(255 * c)))
    text_c(d, 640, '1 kg of wax', 58, WHITE, c, 5, x=1320)
    return im

def g_challenge(t):
    im = comb_bg(); d = ImageDraw.Draw(im)
    text_c(d, 330, 'MOST CELLS', 120, GOLD, ramp(t, 0, .3), 8)
    text_c(d, 500, 'LEAST WAX', 120, WHITE, ramp(t, 1.4, 1.8), 8)
    return im

def g_circles(t):
    im = Image.new('RGBA', (W, H), (18, 12, 4, 255)); d = ImageDraw.Draw(im)
    r = 78
    for row in range(5):
        for col in range(11):
            cx = 230 + col * 2 * r + (r if row % 2 else 0); cy = 250 + row * r * 1.732
            a = ramp(t, .05 * (row + col), .05 * (row + col) + .3)
            d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=(*WHITE, int(255 * a)), width=6)
    g = ramp(t, 1.6, 2.2)
    if g > 0:   # boşlukları kırmızı göster
        for row in range(4):
            for col in range(10):
                cx = 230 + col * 2 * r + (r if row % 2 else 0) + r; cy = 250 + row * r * 1.732 + r * 0.577
                d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=(*RED, int(230 * g)))
    text_c(d, 60, 'CIRCLES LEAVE GAPS', 72, RED, ramp(t, 1.6, 2.0))
    return im

def tiling(d, kind, ox, oy, a, col):
    s = 52
    if kind == 'tri':
        h = s * 1.732 / 2
        for r in range(4):
            for c in range(7):
                x = ox + c * s / 2; y = oy + r * h
                up = (r + c) % 2 == 0
                pts = [(x, y + h), (x + s / 2, y), (x + s, y + h)] if up else [(x, y), (x + s, y), (x + s / 2, y + h)]
                d.polygon(pts, outline=(*col, int(255 * a)), width=4)
    elif kind == 'sq':
        for r in range(4):
            for c in range(4):
                d.rectangle([ox + c * s, oy + r * s, ox + (c + 1) * s, oy + (r + 1) * s], outline=(*col, int(255 * a)), width=4)
    else:
        rr = 32
        for r in range(4):
            for c in range(4):
                cx = ox + 30 + c * rr * 1.5; cy = oy + 30 + r * rr * 1.732 + (rr * 0.866 if c % 2 else 0)
                d.polygon(hex_pts(cx, cy, rr), outline=(*col, int(255 * a)), width=4)

def g_three(t):
    im = Image.new('RGBA', (W, H), (18, 12, 4, 255)); d = ImageDraw.Draw(im)
    text_c(d, 120, 'ONLY 3 SHAPES FIT WITH NO GAPS', 64, WHITE, ramp(t, 0, .3))
    for i, (k, nm) in enumerate([('tri', 'TRIANGLES'), ('sq', 'SQUARES'), ('hex', 'HEXAGONS')]):
        a = ramp(t, 1.0 + i * .9, 1.4 + i * .9)
        x = 300 + i * 560
        tiling(d, k, x - 105, 400, a, GOLD if k == 'hex' else WHITE)
        text_c(d, 690, nm, 52, GOLD if k == 'hex' else WHITE, a, 4, x=x + 105 - d.textlength(nm, font=font(52)) / 2)
    return im

def g_walls(t):
    im = Image.new('RGBA', (W, H), (18, 12, 4, 255)); d = ImageDraw.Draw(im)
    text_c(d, 110, 'WALL LENGTH FOR THE SAME SPACE', 62, WHITE, ramp(t, 0, .3))
    vals = [('TRIANGLE', 4.56, WHITE), ('SQUARE', 4.00, WHITE), ('HEXAGON', 3.72, GOLD)]
    for i, (nm, v, col) in enumerate(vals):
        y = 330 + i * 190; g = ramp(t, .6 + i * .5, 1.8 + i * .5)
        d.text((180, y + 10), nm, font=font(50), fill=(*col, 255))
        L = 1050 * v / 4.56 * g
        d.rounded_rectangle([600, y, 600 + L, y + 80], 18, fill=(*((240, 150, 20) if col == GOLD else (200, 200, 200)), 255))
        if g > .95: d.text((620 + L, y + 12), f'{v:.2f}', font=font(48), fill=(*col, 255))
    b = ramp(t, 5.3, 5.8)
    text_c(d, 900, 'less wall = less wax = more honey saved', 50, GOLD, b, 4)
    return im

def g_hales(t):
    im = comb_bg(); d = ImageDraw.Draw(im)
    text_c(d, 220, 'THE HONEYCOMB CONJECTURE', 70, WHITE, ramp(t, 0, .3))
    text_c(d, 330, '1999', 180, GOLD, ramp(t, .4, .8), 10)
    text_c(d, 560, 'proved by mathematician Thomas Hales', 52, WHITE, ramp(t, .9, 1.3), 4)
    text_c(d, 680, 'Equal areas, least total wall:', 50, WHITE, ramp(t, 5.0, 5.4), 4)
    text_c(d, 760, 'HEXAGONS WIN', 90, GOLD, ramp(t, 8.5, 8.9), 8)
    return im

def g_morph(t):
    im = Image.new('RGBA', (W, H), (24, 14, 4, 255)); d = ImageDraw.Draw(im)
    u = ramp(t, 3.0, 8.5); r = 70
    for row in range(5):
        for col in range(12):
            cx = 150 + col * r * 1.5 * 1.0; cy = 230 + row * r * 1.732 + (r * 0.866 if col % 2 else 0)
            pts = [(cx + (x - cx), y) for x, y in morph_pts(cx, cy, r * 0.98, u)]
            # daire/altıgen yönü: düz kenarlı (flat-top) için 0° köşe
            d.polygon(pts, fill=(250, 200, 90, 255), outline=(120, 70, 10, 255))
            d.polygon([(cx + (x - cx) * 0.86, cy + (y - cy) * 0.86) for x, y in pts], fill=(70, 40, 6, 255))
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
    g.rounded_rectangle([140, 880, 1780, 1010], 20, fill=(0, 0, 0, 190))
    im = Image.alpha_composite(im, lay); d = ImageDraw.Draw(im)
    text_c(d, 905, 'IDEA 1: round cells + warm wax → hexagons', 56, GOLD, ramp(t, 0, .3), 4)
    return im

def g_open(t):
    im = comb_bg(); d = ImageDraw.Draw(im)
    text_c(d, 400, 'STILL AN', 110, WHITE, ramp(t, 0, .3), 8)
    text_c(d, 540, 'OPEN QUESTION', 120, GOLD, ramp(t, .3, .6), 8)
    return im

def g_dance(t):
    """t: dans sahnesi başından (10.8 s bölüm içi) itibaren."""
    im = comb_bg(); d = ImageDraw.Draw(im)
    th = math.radians(40)              # sallanma açısı (dikeyden sağa)
    cx, cy, L = 560, 560, 300           # düz koşu merkezi ve uzunluğu
    ux, uy = math.sin(th), -math.cos(th)  # koşu yönü (yukarı = güneş)
    px, py = -uy, ux                    # dik yön
    A = (cx - ux * L / 2, cy - uy * L / 2); B = (cx + ux * L / 2, cy + uy * L / 2)
    # sekiz şekli yolu: düz koşu A->B, sonra bir yandan dönüş B->A; tekrar koşu, diğer yandan dönüş
    def loop(side, n=40):
        pts = []
        for i in range(n + 1):
            q = math.pi * i / n
            ox = (L / 2) * math.cos(q); oy = side * 170 * math.sin(q)
            pts.append((cx + ux * ox + px * oy, cy + uy * ox + py * oy))
        return pts
    a = ramp(t, 0.3, 1.0)
    d.line(loop(1), fill=(255, 255, 255, int(120 * a)), width=5)
    d.line(loop(-1), fill=(255, 255, 255, int(120 * a)), width=5)
    d.line([A, B], fill=(*GOLD, int(255 * a)), width=9)
    # arı noktası
    per = 4.0; ph = (t % per) / per
    if ph < 0.4:   # düz koşu + sallanma
        u = ph / 0.4; wig = 18 * math.sin(u * 2 * math.pi * 7)
        bx = A[0] + (B[0] - A[0]) * u + px * wig; by = A[1] + (B[1] - A[1]) * u + py * wig
    else:
        u = (ph - 0.4) / 0.6; side = 1 if int(t / per) % 2 == 0 else -1
        pts = loop(side); k = min(len(pts) - 1, int(u * (len(pts) - 1)))
        bx, by = pts[k]
    d.ellipse([bx - 22, by - 16, bx + 22, by + 16], fill=(255, 200, 40, int(255 * a)), outline=(40, 20, 0, 255), width=4)
    text_c(d, 70, 'THE WAGGLE DANCE', 76, GOLD, ramp(t, 0, .4))
    text_c(d, 940, 'WAGGLE RUN', 46, GOLD, ramp(t, 5.3, 5.7) * (1 - ramp(t, 25.8, 26.3)), 4, x=360)
    # 2. evre: yön
    p2 = ramp(t, 13.2, 13.8)
    if p2 > 0:
        d.line([(cx, cy + 260), (cx, cy - 300)], fill=(255, 255, 255, int(220 * p2)), width=4)
        d.text((cx - 150, cy - 360), 'UP = toward the Sun', font=font(36), fill=(*WHITE, int(255 * p2)))
        d.arc([cx - 140, cy - 140, cx + 140, cy + 140], -90, -90 + 40, fill=(*SKY, int(255 * p2)), width=8)
        d.text((cx + 40, cy - 200), '40°', font=font(44), fill=(*SKY, int(255 * p2)))
        # sağ panel: gökyüzü haritası
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
        g.rounded_rectangle([1120, 180, 1820, 900], 30, fill=(25, 70, 120, int(235 * p2)))
        im = Image.alpha_composite(im, lay); d = ImageDraw.Draw(im)
        hx, hy = 1470, 820
        d.ellipse([1440, 230, 1500, 290], fill=(255, 220, 60, int(255 * p2)))
        d.text((1515, 238), 'SUN', font=font(34), fill=(*WHITE, int(255 * p2)))
        d.line([(hx, hy), (1470, 300)], fill=(255, 255, 255, int(160 * p2)), width=4)
        d.rounded_rectangle([hx - 45, hy - 30, hx + 45, hy + 30], 10, fill=(200, 140, 40, int(255 * p2)))
        d.text((hx - 40, hy + 34), 'HIVE', font=font(30), fill=(*WHITE, int(255 * p2)))
        dist = 380 + 120 * ramp(t, 27.5, 29.0)
        fx, fy = hx + dist * math.sin(th), hy - dist * math.cos(th)
        d.line([(hx, hy), (fx, fy)], fill=(*GOLD, int(255 * p2)), width=8)
        for k in range(5):
            q = k * 2 * math.pi / 5
            d.ellipse([fx + 22 * math.cos(q) - 14, fy + 22 * math.sin(q) - 14, fx + 22 * math.cos(q) + 14, fy + 22 * math.sin(q) + 14], fill=(240, 90, 160, int(255 * p2)))
        d.ellipse([fx - 12, fy - 12, fx + 12, fy + 12], fill=(255, 220, 60, int(255 * p2)))
        d.arc([hx - 160, hy - 160, hx + 160, hy + 160], -90, -50, fill=(*SKY, int(255 * p2)), width=8)
        d.text((1130 + 20, 195), 'OUTSIDE', font=font(32), fill=(*WHITE, int(200 * p2)))
    p3 = ramp(t, 26.4, 27.0)
    if p3 > 0:
        text_c(d, 960, 'LONGER WAGGLE = FARTHER FOOD', 54, GOLD, p3, 5)
    return im

def g_nobel(t):
    im = dim(still('30470', 2), 0.62, 10); d = ImageDraw.Draw(im)
    text_c(d, 300, 'KARL VON FRISCH', 96, WHITE, ramp(t, 0, .3), 7)
    text_c(d, 430, 'decoded the dance', 56, GOLD, ramp(t, .5, .9), 4)
    text_c(d, 560, 'NOBEL PRIZE · 1973', 90, GOLD, ramp(t, 3.4, 3.8), 7)
    return im

def water_gauge(im, t, a):
    d = ImageDraw.Draw(im)
    x, y, w, h = 1450, 220, 140, 560
    frac = 0.75 - (0.75 - 0.17) * ramp(t, 0.8, 5.0)
    d.rounded_rectangle([x - 20, y - 90, x + w + 170, y + h + 40], 24, fill=(0, 0, 0, int(160 * a)))
    d.rounded_rectangle([x, y, x + w, y + h], 20, outline=(*WHITE, int(255 * a)), width=5)
    d.rounded_rectangle([x + 8, y + h - (h - 16) * frac - 8, x + w - 8, y + h - 8], 14, fill=(*SKY, int(255 * a)))
    d.text((x - 5, y - 70), 'WATER', font=font(44), fill=(*SKY, int(255 * a)))
    d.text((x + w + 18, y + h - (h - 16) * frac - 30), f'{int(round(frac * 100))}%', font=font(44), fill=(*WHITE, int(255 * a)))
    return im

def g_flowers(t):
    im = dim(still('262866', 6), 0.5, 6); d = ImageDraw.Draw(im)
    n = int(2_000_000 * ramp(t, 0.6, 4.0))
    text_c(d, 260, 'ONE JAR (~0.5 kg)', 70, WHITE, ramp(t, 0, .3))
    text_c(d, 380, f'{n:,}', 180, GOLD, ramp(t, .5, .8), 10)
    text_c(d, 600, 'FLOWERS', 90, WHITE, ramp(t, .5, .8), 7)
    return im

def g_temp(t):
    im = dim(still('375601', 3), 0.55, 10); d = ImageDraw.Draw(im)
    x = 820
    d.rounded_rectangle([x, 220, x + 80, 760], 40, outline=(*WHITE, 255), width=8)
    d.ellipse([x - 40, 700, x + 120, 860], outline=(*WHITE, 255), width=8, fill=(235, 70, 60, 255))
    lv = ramp(t, 0.3, 2.0)
    d.rounded_rectangle([x + 16, 760 - 480 * lv, x + 64, 760], 24, fill=(235, 70, 60, 255))
    text_c(d, 380, '≈ 35 °C', 130, GOLD, ramp(t, 1.8, 2.2), 9, x=1000)
    text_c(d, 540, 'brood nest', 56, WHITE, ramp(t, 2.0, 2.4), 4, x=1010)
    return im

def g_city(t, base):
    im = dim(base, 0.45); d = ImageDraw.Draw(im)
    items = ['ARCHITECTURE', 'LANGUAGE', 'FOOD FACTORY', 'CLIMATE CONTROL']
    for i, s in enumerate(items):
        text_c(d, 230 + i * 150, s, 86, GOLD if i % 2 == 0 else WHITE, ramp(t, .3 + i * .9, .6 + i * .9), 7)
    return im

def g_bites(t):
    im = dim(still('61679', 10), 0.6, 8); d = ImageDraw.Draw(im)
    text_c(d, 150, 'ABOUT 1 IN 3 BITES', 96, WHITE, ramp(t, 0, .3), 7)
    for i in range(3):
        x = 560 + i * 400; a = ramp(t, .5 + i * .3, .8 + i * .3)
        on = i == 2
        d.ellipse([x - 140, 420, x + 140, 700], fill=((240, 150, 20) if on else (90, 90, 90)) + (int(255 * a),), outline=(*WHITE, int(255 * a)), width=6)
        if on: d.polygon(hex_pts(x, 560, 70, 30), fill=(255, 220, 120, int(255 * a)))
    text_c(d, 760, 'depends on pollinators like bees', 54, GOLD, ramp(t, 2.0, 2.4), 4)
    d.text((60, 1010), 'Source: USDA', font=font(28, False), fill=(230, 230, 230, 220))
    return im

def g_logo(t):
    im = Image.new('RGBA', (W, H), (12, 8, 2, 255))
    s = 620 + 40 * ramp(t, 0, 2.6)
    lg = LOGO.resize((int(s), int(s)), Image.LANCZOS).convert('RGBA'); lg.putalpha(int(255 * ramp(t, 0, .35) * (1 - ramp(t, 2.2, 2.6))))
    im.alpha_composite(lg, (int(W / 2 - s / 2), int(H / 2 - s / 2)))
    return im

def g_end(t):
    im = Image.new('RGBA', (W, H), (14, 10, 3, 255)); d = ImageDraw.Draw(im)
    for row in range(8):   # soluk petek deseni
        for col in range(16):
            cx = col * 130 + (65 if row % 2 else 0); cy = row * 113
            d.polygon(hex_pts(cx, cy, 72, 30), outline=(60, 42, 12, 255), width=3)
    lg = LOGO.resize((300, 300), Image.LANCZOS)
    im.paste(lg, (130, 140))
    text_c(d, 470, 'THANKS FOR WATCHING', 54, WHITE, 1, 4, x=110)
    text_c(d, 540, 'Subscribe to Kavci Lab', 44, GOLD, 1, 4, x=110)
    # YouTube bitiş ekranı öğeleri için yer (Kerem Studio'dan ekler)
    d.rounded_rectangle([1000, 180, 1800, 630], 20, outline=(*GOLD, 160), width=4)
    text_c(d, 380, 'next video', 40, (200, 170, 110), 1, 0, x=1310)
    d.ellipse([1300, 700, 1500, 900], outline=(*GOLD, 160), width=4)
    return im

# ---------------------------------------------------------------- sahne listesi (bölüm içi saniye)
# ('c', id, kaynak_t0, z0, z1, fx, fy)  ya da  ('g', fonksiyon)
SHOTS = {
 0: [(0.0, ('c', '273485', 0, 1.0, 1.04, .5, .5)), (3.2, ('c', '375601', 1, 1.0, 1.12, .5, .5)),
     (7.0, ('c', '273476', 0, 1.0, 1.04, .5, .5)), (11.4, ('c', '26588', 2, 1.0, 1.10, .5, .5)),
     (14.3, ('g', g_proven)), (18.4, ('c', '133574', 0, 1.05, 1.15, .5, .5)), (20.0, ('g', g_shapes_q)),
     (23.5, ('c', '119962', 1, 1.0, 1.10, .5, .5))],
 1: [(0.0, ('c', '133577', 0, 1.0, 1.08, .5, .5)), (2.2, ('c', '178049', 2, 1.0, 1.10, .5, .5)),
     (5.2, ('g', lambda t: g_roles(t, 0))), (11.8, ('c', '78680', 1, 1.0, 1.04, .5, .5)),
     (15.6, ('c', '231078', 3, 1.0, 1.10, .5, .5)), (20.7, ('g', lambda t: g_roles(t, 2))),
     (26.3, ('c', '281976', 20, 1.0, 1.12, .5, .5))],
 2: [(0.0, ('c', '267036', 0, 1.0, 1.04, .5, .5)), (4.5, ('c', '273476', 3, 1.0, 1.04, .5, .5)),
     (5.8, ('g', g_wax_cost)), (16.0, ('g', g_challenge)), (22.8, ('g', g_circles)), (27.7, ('g', g_three)),
     (33.8, ('g', g_walls)), (43.6, ('c', '273485', 3, 1.0, 1.04, .5, .5)), (49.3, ('g', g_hales)),
     (61.8, ('c', '375601', 5, 1.1, 1.0, .5, .5))],
 3: [(0.0, ('c', '375601', 2, 1.0, 1.1, .4, .5)), (3.5, ('c', '273476', 4, 1.0, 1.04, .5, .5)),
     (9.8, ('c', '273485', 1, 1.04, 1.0, .5, .5)), (18.6, ('c', '267036', 6, 1.0, 1.04, .5, .5)),
     (24.1, ('g', g_morph)), (35.0, ('c', '133576', 2, 1.0, 1.1, .5, .5)), (40.0, ('g', g_open))],
 4: [(0.0, ('c', '69668', 2, 1.0, 1.08, .5, .5)), (1.9, ('c', '214722', 3, 1.0, 1.10, .5, .5)),
     (6.2, ('c', '166390', 2, 1.0, 1.10, .5, .5)), (9.5, ('c', '375601', 6, 1.0, 1.08, .5, .5)),
     (10.8, ('g', g_dance)), (43.3, ('g', g_nobel))],
 5: [(0.0, ('c', '56238', 2, 1.0, 1.10, .5, .5)), (4.0, ('c', '218952', 2, 1.0, 1.08, .5, .5)),
     (9.5, ('c', '273476', 3, 1.0, 1.04, .5, .5)), (16.0, ('c', '83226', 2, 1.0, 1.08, .5, .5)),
     (22.0, ('c', '273485', 0, 1.0, 1.04, .3, .5)), (29.1, ('c', '39117', 2, 1.0, 1.04, .5, .5)),
     (32.0, ('g', g_flowers))],
 6: [(0.0, ('c', '90293', 2, 1.0, 1.08, .5, .5)), (1.5, ('g', g_temp)), (9.0, ('c', '375601', 6, 1.12, 1.0, .5, .5)),
     (12.9, ('c', '119962', 6, 1.0, 1.10, .5, .5)), (21.9, ('c', '26588', 10, 1.0, 1.08, .5, .5)),
     (27.8, ('c', '35619', 3, 1.0, 1.10, .5, .5))],
 7: [(0.0, ('c', '37444', 5, 1.0, 1.08, .5, .5)), (1.7, ('c', '211155', 8, 1.0, 1.06, .5, .5)),
     (5.0, ('c', '364775', 2, 1.0, 1.08, .5, .5)), (8.4, ('c', '90594', 2, 1.0, 1.08, .5, .5)),
     (9.4, ('g', g_bites)), (16.1, ('c', '30471', 3, 1.0, 1.10, .5, .5)), (18.5, ('c', '273485', 1, 1.0, 1.04, .5, .5)),
     (22.4, ('c', '132780', 5, 1.0, 1.08, .5, .5))],
}
# sahne üstü yazılar: (bölüm, başla, bitir, fonksiyon(im, t_bölüm))
def lbl(s, sub=None):
    return lambda im, t, a: label(im, s, a, sub)
OVER = [
 (1, 11.8, 15.4, lbl('WORKERS', 'all female')),
 (1, 15.6, 20.5, lbl('clean · build · feed · guard · forage')),
 (1, 26.3, 31.6, lbl('Summer worker lifespan', 'about 5–6 weeks')),
 (2, 43.6, 49.2, lbl('The honeycomb conjecture', '~2,000 years old')),
 (3, 3.5, 9.6, lbl('Wax glands under the abdomen', 'wax comes out as tiny clear flakes')),
 (3, 9.8, 18.0, lbl('Walls about as thin as paper')),
 (3, 18.6, 23.7, lbl('How do they make perfect hexagons?', 'scientists still disagree')),
 (3, 35.0, 40.0, lbl('IDEA 2: bees shape the angles themselves')),
 (4, 1.9, 6.1, lbl('Food can be kilometers away')),
 (5, 4.0, 9.3, lbl('NECTAR', 'a sugary liquid, mostly water')),
 (5, 9.5, 15.9, lbl('Enzymes break the sugars down')),
 (5, 22.0, 29.0, lbl('~17% water', 'then sealed with a wax cap')),
 (6, 9.0, 12.8, lbl('Too cold?', 'bees shiver their flight muscles to make heat')),
 (6, 12.9, 21.2, lbl('Too hot?', 'they fan their wings and bring water')),
 (7, 22.4, 28.5, lbl('Subscribe to Kavci Lab', 'what should we explain next?')),
]
CHAPTERS = ['Intro', 'Inside the hive', 'The hexagon puzzle', 'How do bees build it?', 'The waggle dance',
            'Making honey', 'Air conditioning', 'Why bees matter']
FOOTAGE_IDS = set()

def shot_at(k, tr):
    lst = SHOTS[k]; idx = 0
    for i, (s, _) in enumerate(lst):
        if tr >= s: idx = i
    end = lst[idx + 1][0] if idx + 1 < len(lst) else durs[k] + GAP
    return idx, lst[idx][0], end

_open = {}
def frame(t):
    # logo
    if LOGO_AT <= t < LOGO_AT + LOGO_LEN: return g_logo(t - LOGO_AT), None
    if t >= END_AT: return g_end(t - END_AT), None
    # hangi bölüm
    k = 0
    for i, s in enumerate(starts):
        if t >= s - (0.2 if i else 1): k = i
    if k == 0 and t >= LOGO_AT + LOGO_LEN: k = 1
    tr = t - starts[k]
    idx, s0, s1 = shot_at(k, max(0, tr))
    spec = SHOTS[k][idx][1]
    if spec[0] == 'c':
        key = (k, idx)
        if key not in _open:
            for kk in list(_open):   # eski okuyucuları kapat (bellek)
                if _open[kk].p: _open[kk].p.kill(); _open[kk].p.wait()
                del _open[kk]
            _, cid, t0, z0, z1, fx, fy = spec
            _open[key] = Clip(cid, t0 + max(0, tr - s0), max(0.5, s1 - max(s0, tr)) + 1.0, z0, z1, fx, fy)
            FOOTAGE_IDS.add(cid)
        im = _open[key].next().convert('RGBA'); foot = True
    else:
        im = spec[1](max(0, tr - s0)).convert('RGBA'); foot = False
        if spec[1] is g_dance: pass
    # su göstergesi (bal yapımı, kanat çırpma)
    if k == 5 and 16.0 <= tr < 21.8:
        im = water_gauge(im, tr - 16.0, ramp(tr, 16.0, 16.4))
    # yan yazılar
    for (kk, a, b, fn) in OVER:
        if kk == k and a <= tr < b:
            im = fn(im, tr, min(ramp(tr, a, a + .35), 1 - ramp(tr, b - .3, b)))
    # bölüm etiketi (her bölüm başında 3 sn)
    if k >= 1 and 0 <= tr < 3.2:
        d = ImageDraw.Draw(im); a = min(ramp(tr, 0, .3), 1 - ramp(tr, 2.8, 3.2))
        s = f'{k:02d}  {CHAPTERS[k].upper()}'
        d.text((70, 60), s, font=font(36), fill=(*GOLD, int(255 * a)), stroke_width=4, stroke_fill=(0, 0, 0, int(180 * a)))
    if foot:
        d = ImageDraw.Draw(im); d.text((24, 1046), 'Footage: Pixabay', font=font(20, False), fill=(235, 235, 235, 170))
    return im, k

def finish(im, t):
    # bölüm/sahne geçişlerinde kısa kararma
    for c in CUTS:
        dd = abs(t - c)
        if dd < 0.12: im = Image.blend(im, Image.new('RGBA', (W, H), (0, 0, 0, 255)), 0.55 * (1 - dd / 0.12))
    if not (LOGO_AT <= t < LOGO_AT + LOGO_LEN) and t < END_AT:
        im.alpha_composite(WM, (W - 72 - 30, H - 72 - 26))
    return im.convert('RGB')

CUTS = [LOGO_AT, LOGO_AT + LOGO_LEN, END_AT] + [starts[k] + s for k in SHOTS for s, _ in SHOTS[k] if s > 0]

# ---------------------------------------------------------------- önizleme
if os.environ.get('PREVIEW'):
    ts = [float(x) for x in os.environ['PREVIEW'].split(',')]
    sheet = Image.new('RGB', (480 * 4, 270 * ((len(ts) + 3) // 4)))
    for i, tt in enumerate(ts):
        _open.clear(); im, _ = frame(tt)
        sheet.paste(finish(im, tt).resize((480, 270)), ((i % 4) * 480, (i // 4) * 270))
    sheet.save(f'{D}/preview.png'); print('TOTAL', round(TOTAL, 1)); sys.exit()

# ---------------------------------------------------------------- ses: bölümler + boşluklar + müzik
def build_audio():
    parts = []; fc = []; ins = []
    for k in range(len(secs)):
        ins += ['-i', f'{D}/ses/{k:02d}/ses.mp3']
        fc.append(f'[{k}:a]aresample=48000,adelay={int(starts[k] * 1000)}|{int(starts[k] * 1000)}[a{k}]')
    n = len(secs)
    ins += ['-i', f'{D}/muzik.wav']
    fc.append(f'[{n}:a]aresample=48000,volume=0.13,atrim=0:{TOTAL:.2f},afade=t=out:st={TOTAL - 4:.2f}:d=4[m]')
    fc.append(''.join(f'[a{k}]' for k in range(n)) + f'[m]amix=inputs={n + 1}:duration=longest:normalize=0,atrim=0:{TOTAL:.2f}[o]')
    mix = f'{D}/mix.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[o]', '-ac', '2', mix], check=True)
    r = subprocess.run(['ffmpeg', '-i', mix, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    return mix, (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
                 f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")

def srt_and_chapters():
    def ts(x):
        h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
        return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'
    out = []; n = 1
    for k in range(len(secs)):
        w = json.load(open(f'{D}/ses/{k:02d}/words.json')); cur = []
        for word, s, e in w:
            cur.append((word, s, e))
            if word[-1] in '.?!,:' and len(' '.join(x[0] for x in cur)) > 25 or len(' '.join(x[0] for x in cur)) > 60:
                out.append(f'{n}\n{ts(starts[k] + cur[0][1])} --> {ts(starts[k] + cur[-1][2] + 0.15)}\n{" ".join(x[0] for x in cur)}\n'); n += 1; cur = []
        if cur:
            out.append(f'{n}\n{ts(starts[k] + cur[0][1])} --> {ts(starts[k] + cur[-1][2] + 0.15)}\n{" ".join(x[0] for x in cur)}\n'); n += 1
    # bitişler bir sonraki başlangıcı geçmesin
    import re as _re
    ents = [e.split('\n') for e in out]
    def sec(x): h, m, r = x.split(':'); s_, ms = r.split(','); return int(h) * 3600 + int(m) * 60 + int(s_) + int(ms) / 1000
    for i in range(len(ents) - 1):
        a_, b_ = ents[i][1].split(' --> '); nxt = ents[i + 1][1].split(' --> ')[0]
        if sec(b_) > sec(nxt) - 0.02: ents[i][1] = f'{a_} --> {ts(sec(nxt) - 0.02)}'
    open(f'{D}/altyazi.srt', 'w').write('\n'.join('\n'.join(e) for e in ents))
    ch = []
    for k in range(len(secs)):
        s = 0 if k == 0 else starts[k] - 0.3
        ch.append(f'{int(s // 60)}:{int(s % 60):02d} {CHAPTERS[k]}')
    open(f'{D}/bolumler.txt', 'w').write('\n'.join(ch) + '\n')

if __name__ == '__main__':
    if os.environ.get('PART'):   # PART="0,171" -> sadece bu aralığın görüntüsü
        a0, a1 = [float(x) for x in os.environ['PART'].split(',')]
        out = f'{D}/part_{int(a0)}.mp4'
        enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                                '-i', '-', '-vf', 'noise=alls=2:allf=t', '-c:v', 'libx264', '-preset', 'medium', '-b:v', '12M',
                                '-maxrate', '16M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        for i in range(int(round(a0 * FPS)), min(int(TOTAL * FPS), int(round(a1 * FPS)))):
            t = i / FPS; im, _ = frame(t); enc.stdin.write(finish(im, t).tobytes())
            if i % 900 == 0: print(f'{t:.0f} s', flush=True)
        enc.stdin.close(); enc.wait()
        json.dump(sorted(FOOTAGE_IDS), open(f'{D}/klipler_{int(a0)}.json', 'w')); print('parca bitti'); sys.exit()
    if os.environ.get('JOIN'):     # parçaları birleştir + ses
        srt_and_chapters(); mix, ln = build_audio()
        parts = sorted([f for f in os.listdir(D) if f.startswith('part_')], key=lambda f: int(f[5:-4]))
        open(f'{D}/parts.txt', 'w').write(''.join(f"file '{D}/{f}'\n" for f in parts))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{D}/parts.txt', '-i', mix, '-af', ln,
                        '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                        '-movflags', '+faststart', f'{D}/video_bees.mp4'], check=True)
        print('bitti', round(TOTAL, 1)); sys.exit()
    srt_and_chapters()
    mix, ln = build_audio()
    out = f'{D}/video_only.mp4'
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                            '-i', '-', '-vf', 'noise=alls=2:allf=t', '-c:v', 'libx264', '-preset', 'medium', '-b:v', '12M',
                            '-maxrate', '16M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    N = int(TOTAL * FPS)
    for i in range(N):
        t = i / FPS
        im, _ = frame(t)
        enc.stdin.write(finish(im, t).tobytes())
        if i % 900 == 0: print(f'{t:.0f}/{TOTAL:.0f} s', flush=True)
    enc.stdin.close(); enc.wait()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-i', mix, '-af', ln, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', f'{D}/video_bees.mp4'], check=True)
    json.dump(sorted(FOOTAGE_IDS), open(f'{D}/kullanilan_klipler.json', 'w'))
    print('bitti', round(TOTAL, 1))
