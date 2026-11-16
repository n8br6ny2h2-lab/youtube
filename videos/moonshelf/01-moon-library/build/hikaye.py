#!/usr/bin/env python3
"""Moonshelf TV · Story 1: The Moon's Night Library (1920x1080, 30 fps)
Kullanım: python3 hikaye.py <klasör>                 tam render (PART="a,b" parça, JOIN=1 birleştir)
          PREVIEW="5,30,80" python3 hikaye.py <klasör> önizleme
Klasörde: paras.json, ses/NN/{ses.mp3,words.json} (ElevenLabs Lily), muzik.wav (tools/muzik_ninni.py muzik.wav 240 1), src/<pixabay>.mp4
"""
import json, math, os, random, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = sys.argv[1]; REPO = '/workspace/youtube'
W, H, FPS = 1920, 1080, 30
FONT = f'{REPO}/brand/moonshelf/font/Fredoka-SemiBold.ttf'
_fc = {}
def font(s):
    if s not in _fc: _fc[s] = ImageFont.truetype(FONT, s)
    return _fc[s]
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def ramp(t, a, b): return ease((t - a) / (b - a))
CREAM = (255, 240, 200); GOLD = (255, 205, 110); NAVY = (14, 18, 56)

# ---------------------------------------------------------------- zaman çizelgesi
paras = json.load(open(f'{D}/paras.json'))
INTRO, GAP, OUTRO = 3.0, 1.8, 12.0
starts, durs, words = [], [], []
t = INTRO
for k in range(len(paras)):
    w = json.load(open(f'{D}/ses/{k:02d}/words.json'))
    starts.append(t); durs.append(w[-1][2]); words.append(w)
    t += w[-1][2] + GAP
END_AT = t - GAP + 2.0
TOTAL = END_AT + OUTRO
def wt(k, word):
    """paragraf k içinde kelimenin başladığı mutlak zaman"""
    for x, s, e in words[k]:
        if x.lower().strip('.,!?"…') .startswith(word.lower()): return starts[k] + s
    raise KeyError(word)

# ---------------------------------------------------------------- klip okuma
def probe_wh(p):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                        '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip().split(',')
    return int(o[0]), int(o[1])

class Clip:
    def __init__(self, cid, t0, dur, z0=1.0, z1=1.06):
        self.src = f'{D}/src/{cid}.mp4'; sw, sh = probe_wh(self.src)
        self.R = (2304, 1296) if sw >= 3840 else (1920, 1080)
        if sw < 3840: z0, z1 = min(z0, 1.03), min(z1, 1.03)
        self.z0, self.z1 = z0, z1; self.n = int(math.ceil(dur * FPS)) + 2
        self.p = self.open(t0, dur); self.i = 0; self.last = None
    def open(self, t0, dur):
        RW, RH = self.R
        return subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur + 0.5), '-i', self.src, '-vf',
                                 f'fps={FPS},scale={RW}:{RH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    def next(self):
        RW, RH = self.R
        buf = self.p.stdout.read(RW * RH * 3) if self.p else b''
        if len(buf) == RW * RH * 3:
            im = Image.frombuffer('RGB', (RW, RH), buf)
            z = self.z0 + (self.z1 - self.z0) * ease(self.i / max(1, self.n - 1))
            bw, bh = RW / z, RH / z; x0, y0 = (RW - bw) / 2, (RH - bh) / 2
            self.last = im.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + bw, y0 + bh))
        elif self.p:
            self.p.kill(); self.p.wait(); self.p = None
            if self.last is None:
                self.p = self.open(0, 30); return self.next()
        self.i += 1
        return self.last.copy().convert('RGBA')
    def close(self):
        if self.p: self.p.kill(); self.p.wait(); self.p = None

# ---------------------------------------------------------------- çizim parçaları
random.seed(4)
STARS = [(random.uniform(0, W), random.uniform(0, H * .8), random.random(), random.uniform(0, 6.28)) for _ in range(260)]
def night(t):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for y in range(0, H, 4):
        u = y / H; d.rectangle([0, y, W, y + 4], fill=(int(22 - 12 * u), int(26 - 14 * u), int(74 - 36 * u)))
    for x, y, b, ph in STARS:
        a = 0.55 + 0.45 * math.sin(t * 1.3 + ph); c = int((120 + 135 * b) * a); r = 1.2 if b < .8 else 2.2
        d.ellipse([x - r, y - r, x + r, y + r], fill=(c, c, min(255, c + 15)))
    return im.convert('RGBA')

sys.path.insert(0, f'{REPO}/brand/moonshelf')
import logo as LG
EMB = LG.emblem(560)
WM = Image.open(f'{REPO}/brand/moonshelf/moonshelf_filigran_300.png').convert('RGBA').resize((92, 92), Image.LANCZOS)
WM.putalpha(WM.split()[3].point(lambda v: int(v * 0.8)))

def make_book(w=150, h=112, col=(255, 210, 120)):
    S = 2.2; big = Image.new('RGBA', (int(w * S), int(h * S)), (0, 0, 0, 0)); d = ImageDraw.Draw(big)
    cx, cy = big.size[0] / 2, big.size[1] / 2
    d.ellipse([cx - w * .95, cy - h * .95, cx + w * .95, cy + h * .95], fill=(255, 220, 140, 90))
    big = big.filter(ImageFilter.GaussianBlur(26)); d = ImageDraw.Draw(big)
    # açık kitap: iki sayfa
    d.polygon([(cx, cy - h * .32), (cx - w * .48, cy - h * .42), (cx - w * .48, cy + h * .32), (cx, cy + h * .42)], fill=(255, 248, 225, 255))
    d.polygon([(cx, cy - h * .32), (cx + w * .48, cy - h * .42), (cx + w * .48, cy + h * .32), (cx, cy + h * .42)], fill=(255, 242, 210, 255))
    for i in range(3):
        y = cy - h * .18 + i * h * .16
        d.line([(cx - w * .4, y - 4), (cx - w * .08, y + 2)], fill=(220, 190, 140, 255), width=4)
        d.line([(cx + w * .08, y + 2), (cx + w * .4, y - 4)], fill=(220, 190, 140, 255), width=4)
    d.line([(cx, cy - h * .32), (cx, cy + h * .42)], fill=col + (255,), width=5)
    return big
BOOK = make_book(); BOOK_STARS = make_book(col=(150, 200, 255))

def book_drop(im, t, t0, tx, ty, star_book=False):
    """t0'da yukarıdan süzülerek gelir, (tx,ty)'de parlayarak durur."""
    if t < t0: return im
    u = ease((t - t0) / 3.0)
    x = tx + 260 * (1 - u) + 30 * math.sin((t - t0) * 2.2) * (1 - u)
    y = -150 + (ty + 150) * u + 8 * math.sin((t - t0) * 1.7) * u
    b = (BOOK_STARS if star_book else BOOK).copy()
    a = min(1, (t - t0) / 0.6)
    b.putalpha(b.split()[3].point(lambda v: int(v * a)))
    im.alpha_composite(b, (int(x - b.size[0] / 2), int(y - b.size[1] / 2)))
    if u > .95:   # küçük parıltılar
        d = ImageDraw.Draw(im)
        for k in range(6):
            q = k * 1.05 + t * .8; r = 120 + 14 * math.sin(t * 3 + k)
            sx, sy = x + r * math.cos(q), y + r * .6 * math.sin(q); s = 5 + 3 * math.sin(t * 4 + k)
            d.polygon([(sx, sy - s * 2), (sx + s * .5, sy), (sx, sy + s * 2), (sx - s * .5, sy)], fill=(255, 240, 190, 220))
            d.polygon([(sx - s * 2, sy), (sx, sy + s * .5), (sx + s * 2, sy), (sx, sy - s * .5)], fill=(255, 240, 190, 220))
    return im

random.seed(9)
FLIES = [(random.uniform(80, W - 80), random.uniform(300, H - 60), random.uniform(0, 6.28), random.uniform(.6, 1.4)) for _ in range(46)]
def fireflies(im, t, k=1.0):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for x0, y0, ph, sp in FLIES:
        x = x0 + 40 * math.sin(t * .4 * sp + ph); y = y0 + 25 * math.sin(t * .55 * sp + ph * 2)
        a = max(0, math.sin(t * 1.6 * sp + ph)) ** 2 * k
        if a < .03: continue
        for r, al in [(22, 40), (12, 90), (5, 255)]:
            d.ellipse([x - r, y - r, x + r, y + r], fill=(235, 255, 120, int(al * a)))
    return Image.alpha_composite(im, lay)

def soft_text(im, s, y, size, col=CREAM, a=1.0):
    if a <= 0: return im
    d = ImageDraw.Draw(im); f = font(size); w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=col + (int(255 * a),), stroke_width=6, stroke_fill=NAVY + (int(200 * a),))
    return im

# ---------------------------------------------------------------- sahneler
def intro(t):   # 0 -> P1 başlangıcı
    im = night(t)
    s = 0.75 + 0.25 * ease(t / 4)
    e = EMB.resize((int(560 * s), int(560 * s)), Image.LANCZOS)
    e.putalpha(e.split()[3].point(lambda v: int(v * ramp(t, 0.2, 1.6))))
    im.alpha_composite(e, (int(W / 2 - e.size[0] / 2), int(430 - e.size[1] / 2)))
    soft_text(im, 'MOONSHELF TV', 760, 96, CREAM, ramp(t, 1.0, 2.0) * (1 - ramp(t, wt(0, 'Tonight') - 0.6, wt(0, 'Tonight') + 0.4)))
    ta = ramp(t, wt(0, 'Night') - 1.0, wt(0, 'Night'))
    soft_text(im, "The Moon's Night Library", 760, 100, GOLD, ta)
    return im

SPEC = {   # paragraf -> [(paragraf içi başlangıç, ('c', id, t0) | ('g', ad))]
 1: [(0, ('c', '128118', 2)), (7.0, ('c', '134511', 4))],
 2: [(0, ('c', '165837', 2))],
 3: [(0, ('c', '134476', 2)), (8.5, ('c', '91186', 1)), (15.5, ('c', '161402', 2))],
 4: [(0, ('c', '257540', 1)), (6.0, ('c', '28478', 10)), (11.5, ('c', '287503', 2))],
 5: [(0, ('f', '140672', 0))],
 6: [(0, ('c', '244188', 0)), (8.0, ('c', '165837', 10))],
 7: [(0, ('c', '250253', 2)), (6.5, ('c', '219831', 2))],
 8: [(0, ('c', '69094', 2))],
 9: [(0, ('c', '69094', 14))],
}
# 8. paragrafta kelimeye göre kısa geçişler
SPEC[8] += [(wt(8, 'gliding') - starts[8] - .2, ('c', '93235', 3)), (wt(8, 'listening') - starts[8] - .2, ('c', '287503', 8)),
            (wt(8, 'glowing') - starts[8] - .2, ('f', '140672', 12)), (wt(8, 'singing') - starts[8] - .2, ('c', '244188', 1))]
SPEC[8].sort(key=lambda x: x[0])
BOOKS = [(3, wt(3, 'So') + .4, 1500, 300, False), (4, wt(4, 'cozy') - .5, 1520, 300, False),
         (5, wt(5, 'smiles') + .2, 960, 330, True), (6, wt(6, 'sends') - .3, 960, 380, False)]

SHOTS = []   # (mutlak başlangıç, bitiş, spec)
for k in sorted(SPEC):
    lst = SPEC[k]
    for i, (s, spec) in enumerate(lst):
        a = starts[k] + s - (0 if i else GAP * 0.5)
        b = starts[k] + lst[i + 1][0] if i + 1 < len(lst) else (starts[k + 1] - GAP * 0.5 if k + 1 < len(paras) else END_AT)
        SHOTS.append([a, b, spec])
SHOTS[0][0] = starts[1] - GAP * .5
XF = 0.9   # çapraz geçiş süresi
_open = {}
def shot_frame(i, t):
    a, b, spec = SHOTS[i]
    if i not in _open:
        for j in list(_open):
            if j < i - 1: _open[j].close(); del _open[j]
        kind, cid, t0 = spec
        _open[i] = Clip(cid, t0 + max(0, t - a), (b - max(a, t)) + XF + 0.5)
    im = _open[i].next()
    if spec[0] == 'f':
        im = Image.blend(im, Image.new('RGBA', (W, H), (0, 0, 20, 255)), 0.25)
        im = fireflies(im, t)
    return im

def frame(t):
    if t < SHOTS[0][0] + XF:
        im = intro(t)
        if t >= SHOTS[0][0]:
            im = Image.blend(im, shot_frame(0, t), ramp(t, SHOTS[0][0], SHOTS[0][0] + XF))
        return im
    if t >= END_AT - XF:
        e = outro(max(0, t - END_AT))
        if t < END_AT:
            return Image.blend(shot_frame(len(SHOTS) - 1, t), e, ramp(t, END_AT - XF, END_AT))
        return e
    i = max(j for j in range(len(SHOTS)) if SHOTS[j][0] <= t)
    im = shot_frame(i, t)
    if i > 0 and t < SHOTS[i][0] + XF and t >= SHOTS[i][0]:
        im = Image.blend(shot_frame(i - 1, t), im, ramp(t, SHOTS[i][0], SHOTS[i][0] + XF))
    # yazılar
    if starts[2] - .3 <= t < starts[3] - GAP * .5:
        im = soft_text(im, '"Who needs a dream tonight?"', 820, 78, CREAM, min(ramp(t, wt(2, 'Who') - .2, wt(2, 'Who') + .6), 1 - ramp(t, starts[3] - GAP * .5 - .6, starts[3] - GAP * .5)))
    for k, name, word in [(3, 'Owl', 'Owl'), (4, 'Fox', 'Fox'), (5, 'Fireflies', 'Fireflies'), (6, 'Whale', 'humpback'), (7, 'Ducks', 'ducks')]:
        t0 = wt(k, word)
        if t0 - .2 <= t < t0 + 4.0:
            im = soft_text(im, name, 880, 90, GOLD, min(ramp(t, t0 - .2, t0 + .5), 1 - ramp(t, t0 + 3.3, t0 + 4.0)))
    for (k, t0, x, y, st) in BOOKS:
        if t0 <= t < starts[k + 1] - GAP * .5:
            im = book_drop(im, t, t0, x, y, st)
    if starts[8] <= t < wt(8, 'Maybe'):
        im = book_drop(im, t, wt(8, 'saved') - .3, 960, 470)
    if starts[9] <= t:
        im = Image.blend(im, Image.new('RGBA', (W, H), (0, 0, 10, 255)), 0.35 * ramp(t, starts[9], END_AT))
    return im

def outro(lt):
    im = night(lt + 100)
    e = EMB.resize((420, 420), Image.LANCZOS); im.alpha_composite(e, (int(W / 2 - 210), 170))
    soft_text(im, 'Goodnight, friend', 640, 96, CREAM, ramp(lt, .2, 1.2))
    soft_text(im, 'A new book opens tomorrow night', 780, 56, GOLD, ramp(lt, 1.0, 2.0))
    return Image.blend(im, Image.new('RGBA', (W, H), (0, 0, 0, 255)), ramp(lt, OUTRO - 3, OUTRO))

def finish(im, t):
    if SHOTS[0][0] <= t < END_AT:
        im.alpha_composite(WM, (W - 92 - 30, H - 92 - 24))
        d = ImageDraw.Draw(im); d.text((26, 1048), 'Nature footage: Pixabay', font=font(20), fill=(235, 235, 235, 150))
    return im.convert('RGB')

# ---------------------------------------------------------------- çıktılar
def build_audio():
    ins, fc = [], []
    for k in range(len(paras)):
        ins += ['-i', f'{D}/ses/{k:02d}/ses.mp3']
        ms = int(starts[k] * 1000); fc.append(f'[{k}:a]aresample=48000,adelay={ms}|{ms}[a{k}]')
    n = len(paras); ins += ['-i', f'{D}/muzik.wav']
    fc.append(f'[{n}:a]aresample=48000,volume=0.16,atrim=0:{TOTAL:.2f},afade=t=out:st={TOTAL - 5:.2f}:d=5[m]')
    fc.append(''.join(f'[a{k}]' for k in range(n)) + f'[m]amix=inputs={n + 1}:duration=longest:normalize=0,atrim=0:{TOTAL:.2f}[o]')
    mix = f'{D}/mix.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[o]', '-ac', '2', mix], check=True)
    r = subprocess.run(['ffmpeg', '-i', mix, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    return mix, (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
                 f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")

def srt():
    def ts(x): return f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round((x % 1) * 1000)) % 1000:03d}'
    out = []; n = 1
    for k in range(len(paras)):
        cur = []
        for wd, s, e in words[k]:
            cur.append((wd, s, e)); txt = ' '.join(x[0] for x in cur)
            if (wd[-1] in '.?!,…' and len(txt) > 20) or len(txt) > 55:
                out.append((starts[k] + cur[0][1], starts[k] + cur[-1][2] + .2, txt)); cur = []
        if cur: out.append((starts[k] + cur[0][1], starts[k] + cur[-1][2] + .2, ' '.join(x[0] for x in cur)))
    lines = []
    for i, (a, b, s) in enumerate(out):
        if i + 1 < len(out): b = min(b, out[i + 1][0] - .02)
        lines.append(f'{i + 1}\n{ts(a)} --> {ts(b)}\n{s}\n')
    open(f'{D}/altyazi.srt', 'w').write('\n'.join(lines))

def encoder(path):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                             '-vf', 'noise=alls=2:allf=t', '-c:v', 'libx264', '-preset', 'medium', '-b:v', '8M', '-maxrate', '10M',
                             '-bufsize', '16M', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)

if os.environ.get('PREVIEW'):
    ts_ = [float(x) for x in os.environ['PREVIEW'].split(',')]
    sheet = Image.new('RGB', (480 * 4, 270 * ((len(ts_) + 3) // 4)))
    for i, tt in enumerate(ts_):
        for j in list(_open): _open[j].close()
        _open.clear(); sheet.paste(finish(frame(tt), tt).resize((480, 270)), ((i % 4) * 480, (i // 4) * 270))
    sheet.save(f'{D}/preview.png'); print('TOTAL', round(TOTAL, 1)); sys.exit()
if os.environ.get('PART'):
    a0, a1 = [float(x) for x in os.environ['PART'].split(',')]
    enc = encoder(f'{D}/part_{int(a0):04d}.mp4')
    for i in range(int(round(a0 * FPS)), min(int(TOTAL * FPS), int(round(a1 * FPS)))):
        t = i / FPS; enc.stdin.write(finish(frame(t), t).tobytes())
    enc.stdin.close(); enc.wait(); print('parca', a0); sys.exit()
if os.environ.get('JOIN'):
    srt(); mix, ln = build_audio()
    parts = sorted(f for f in os.listdir(D) if f.startswith('part_'))
    open(f'{D}/parts.txt', 'w').write(''.join(f"file '{D}/{f}'\n" for f in parts))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{D}/parts.txt', '-i', mix, '-af', ln, '-map', '0:v',
                    '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart',
                    f'{D}/moonshelf_01.mp4'], check=True)
    print('bitti', round(TOTAL, 1))
