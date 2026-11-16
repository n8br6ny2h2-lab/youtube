#!/usr/bin/env python3
"""Earthframe TV · Video 1: Owls, Silent Hunters of the Night (1920x1080, 30 fps)
Kullanım: PREVIEW="5,40" python3 belgesel.py <klasör>  |  PART="a,b" ...  |  JOIN=1 ...
Klasörde: paras.json, ses/NN/{ses.mp3,words.json} (Lily), muzik.wav (tools/muzik_ambient.py muzik.wav 360 11), src/<pixabay>.mp4
"""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = sys.argv[1]; REPO = '/workspace/youtube'
W, H, FPS = 1920, 1080, 30
FB = f'{REPO}/brand/earthframe/font/InterDisplay-Bold.otf'
FM = f'{REPO}/brand/earthframe/font/InterDisplay-Medium.otf'
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def ramp(t, a, b): return ease((t - a) / (b - a))
SAND = (244, 228, 196); GOLD = (238, 190, 140); FOREST = (18, 58, 50)

# ---------------------------------------------------------------- zaman çizelgesi
paras = json.load(open(f'{D}/paras.json'))
INTRO, GAP, OUTRO = 9.0, 3.4, 20.0
starts, words = [], []
t = INTRO
for k in range(len(paras)):
    w = json.load(open(f'{D}/ses/{k:02d}/words.json')); starts.append(t); words.append(w)
    t += w[-1][2] + GAP
END_AT = t - GAP + 3.0
TOTAL = END_AT + OUTRO
def wt(k, word, n=1):
    c = 0
    for x, s, e in words[k]:
        if x.lower().strip('.,!?":;…').startswith(word.lower()):
            c += 1
            if c == n: return starts[k] + s
    raise KeyError(word)

# ---------------------------------------------------------------- klipler
def probe_wh(p):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p],
                       capture_output=True, text=True).stdout.strip().split(',')
    return int(o[0]), int(o[1])
class Clip:
    def __init__(self, cid, t0, dur, z0=1.0, z1=1.07):
        self.src = f'{D}/src/{cid}.mp4'; sw, sh = probe_wh(self.src)
        self.R = (2304, 1296) if sw >= 3840 else (1920, 1080)
        if sw < 3840: z0, z1 = min(z0, 1.03), min(z1, 1.03)
        self.z0, self.z1 = z0, z1; self.n = int(math.ceil(dur * FPS)) + 2
        self.p = self.open(t0, dur); self.i = 0; self.last = None
    def open(self, t0, dur):
        RW, RH = self.R
        return subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur + 0.5), '-i', self.src, '-vf',
                                 f'fps={FPS},scale={RW}:{RH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
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
            if self.last is None: self.p = self.open(0, 60); return self.next()
        self.i += 1
        return self.last.copy().convert('RGBA')
    def close(self):
        if self.p: self.p.kill(); self.p.wait(); self.p = None

# ---------------------------------------------------------------- grafikler
def lower_third(im, title, sub=None, a=1.0):
    if a <= 0: return im
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    f1, f2 = font(FB, 46), font(FM, 32)
    w = max(d.textlength(title, font=f1), d.textlength(sub, font=f2) if sub else 0)
    x0 = 90 - 40 * (1 - a); y0 = 850; h = 82 if not sub else 128
    d.rounded_rectangle([x0, y0, x0 + w + 64, y0 + h], 14, fill=(8, 22, 20, int(170 * a)))
    d.rectangle([x0, y0 + 14, x0 + 6, y0 + h - 14], fill=GOLD + (int(255 * a),))
    d.text((x0 + 32, y0 + 16), title, font=f1, fill=SAND + (int(255 * a),))
    if sub: d.text((x0 + 32, y0 + 76), sub, font=f2, fill=GOLD + (int(255 * a),))
    return Image.alpha_composite(im, lay)

def center_title(im, a, t1, t2):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, int(90 * a))); d = ImageDraw.Draw(lay)
    for txt, f, y, col in [(t1, font(FB, 150), 430, SAND), (t2, font(FM, 54), 600, GOLD)]:
        w = d.textlength(txt, font=f); d.text(((W - w) / 2, y), txt, font=f, fill=col + (int(255 * a),))
    d.line([(W / 2 - 120, 575), (W / 2 + 120, 575)], fill=GOLD + (int(200 * a),), width=3)
    return Image.alpha_composite(im, lay)

def wing_diagram(t, base):
    """Kanat ön kenarında tarak dişleri, arka kenarda saçak: sessiz uçuş."""
    im = Image.blend(base, Image.new('RGBA', (W, H), (6, 14, 16, 255)), 0.72); d = ImageDraw.Draw(im)
    a = ramp(t, 0.2, 1.2)
    # kanat kesiti: kavisli üst kenar
    pts_top = [(360 + i * 12, 520 - 140 * math.sin(i / 100 * math.pi) ** 0.8) for i in range(101)]
    pts_bot = [(360 + i * 12, 520 - 60 * math.sin(i / 100 * math.pi)) for i in range(101)]
    d.polygon(pts_top + pts_bot[::-1], fill=(150, 120, 90, int(230 * a)))
    b = ramp(t, wt(6, 'front') - wt(6, 'And'), wt(6, 'front') - wt(6, 'And') + 0.8)
    for i in range(0, 101, 3):   # ön kenar tarak dişleri (sol uç)
        x, y = pts_top[i]
        if i > 40: break
        d.line([(x, y), (x - 26, y - 14)], fill=SAND + (int(255 * b),), width=4)
    c = ramp(t, wt(6, 'back') - wt(6, 'And'), wt(6, 'back') - wt(6, 'And') + 0.8)
    for i in range(55, 101, 2):   # arka kenar saçakları (sağ uç)
        x, y = pts_bot[i]
        d.line([(x, y), (x + 10, y + 34 + 6 * math.sin(i + t * 3))], fill=GOLD + (int(220 * c),), width=3)
    # hava akışı çizgileri
    e = ramp(t, wt(6, 'break') - wt(6, 'And'), wt(6, 'break') - wt(6, 'And') + 1.0)
    for j in range(5):
        y = 300 + j * 70
        pts = [(180 + i * 18, y + 10 * math.sin(i * 0.5 + t * 2 + j) * (1 if i * 18 + 180 < 760 else 0.3)) for i in range(90)]
        d.line(pts, fill=(160, 210, 220, int(150 * e)), width=3)
    f = font(FM, 40)
    if b > 0: d.text((250, 300), 'comb-like front edge', font=f, fill=SAND + (int(255 * b),))
    if c > 0: d.text((1080, 600), 'soft, fringed back edge', font=f, fill=GOLD + (int(255 * c),))
    tt = font(FB, 64); s = 'SILENT FLIGHT'; d.text(((W - d.textlength(s, font=tt)) / 2, 120), s, font=tt, fill=SAND + (int(255 * a),))
    return im

WM = Image.open(f'{REPO}/brand/earthframe/earthframe_filigran_300.png').convert('RGBA').resize((80, 80), Image.LANCZOS)
WM.putalpha(WM.split()[3].point(lambda v: int(v * 0.75)))
LOGO = Image.open(f'{REPO}/brand/earthframe/earthframe_logo_800.png').convert('RGBA').resize((360, 360), Image.LANCZOS)

# ---------------------------------------------------------------- sahne listesi (mutlak zaman)
def S(k, rel): return starts[k] + rel
SHOTS_SPEC = [
    (0, ('c', '142695', 6)),
    (S(0, -0.5), ('c', '319455', 1)), (wt(0, 'But'), ('c', '224535', 1)), (wt(0, 'Tonight'), ('c', '134476', 3)),
    (S(1, -1.3), ('c', '91186', 1)), (wt(1, 'Some'), ('c', '80290', 1)), (wt(1, 'Others'), ('c', '116657', 1)), (wt(1, 'But'), ('c', '103280', 2)),
    (S(2, -1.3), ('c', '18244', 2)), (wt(2, 'They', 1), ('c', '49532', 0)), (wt(2, 'But'), ('c', '155754', 6)),
    (S(3, -1.3), ('c', '116657', 7)), (wt(3, 'An'), ('c', '80954', 4)), (wt(3, 'Its'), ('c', '161402', 4)),
    (S(4, -1.3), ('c', '93235', 2)), (wt(4, 'The', 1), ('c', '95059', 3)), (wt(4, 'Its'), ('c', '93235', 8)),
    (S(5, -1.3), ('c', '134476', 9)), (wt(5, 'A', 1), ('c', '65809', 2)), (wt(5, 'By'), ('c', '65812', 3)), (wt(5, 'It', 1), ('c', '102626', 10)),
    (S(6, -1.3), ('w', '69094', 4)),
    (S(7, -1.3), ('c', '81032', 3)), (wt(7, 'Later'), ('c', '103280', 8)), (wt(7, 'Scientists'), ('c', '146699', 4)),
    (S(8, -1.3), ('c', '189813', 2)), (wt(8, 'snowy'), ('c', '102626', 22)), (wt(8, 'Eurasian'), ('c', '80954', 10)),
    (wt(8, 'burrowing'), ('c', '155754', 14)), (wt(8, 'tiny'), ('c', '232518', 3)),
    (S(9, -1.3), ('c', '189813', 12)), (wt(9, 'A', 1), ('c', '66810', 4)), (wt(9, 'which'), ('c', '93235', 4)),
    (S(10, -1.3), ('c', '69094', 12)), (wt(10, 'Then'), ('c', '128118', 6)), (wt(10, 'Somewhere'), ('c', '91186', 5)),
    (S(11, -1.3), ('c', '142695', 14)),
]
SHOTS = []
for i, (a, spec) in enumerate(SHOTS_SPEC):
    b = SHOTS_SPEC[i + 1][0] if i + 1 < len(SHOTS_SPEC) else END_AT
    SHOTS.append([a, b, spec])
LABELS = [   # (başla, bitir, başlık, alt yazı)
    (wt(1, 'more'), wt(1, 'Some') - .2, '200+ species', 'on every continent except Antarctica'),
    (wt(2, 'They', 2) - .2 if False else wt(2, 'tube') - .3, S(3, -1.5), 'Tube-shaped eyes', "they can't move in their sockets"),
    (wt(3, 'An') + .3, wt(3, 'Its') - .2, 'Head turn: about 270°', None),
    (wt(3, 'Its'), S(4, -1.5), '14 neck bones', 'humans have 7'),
    (wt(4, 'round'), S(5, -1.5), 'The facial disc', 'works like a satellite dish'),
    (wt(5, 'one', 1), wt(5, 'By') - .2, 'Barn owl ears', 'one sits higher than the other'),
    (wt(7, 'pellet') - .3, S(8, -1.5), 'Owl pellet', 'bones and fur the owl cannot digest'),
    (wt(8, 'snowy') + .3, wt(8, 'Eurasian') - .3, 'Snowy owl', 'Arctic · often hunts in daylight'),
    (wt(8, 'Eurasian') + .3, wt(8, 'burrowing') - .3, 'Eurasian eagle-owl', 'one of the largest owls'),
    (wt(8, 'burrowing') + .3, wt(8, 'tiny') - .3, 'Burrowing owl', 'nests underground'),
    (wt(8, 'tiny') + .3, S(9, -1.5), 'Elf owl', 'home: holes in desert cacti'),
    (wt(9, 'thousands') - .3, S(10, -1.5), 'Natural pest control', 'thousands of rodents a year'),
]

_open = {}
def shot_frame(i, t):
    a, b, spec = SHOTS[i]
    if i not in _open:
        for j in list(_open):
            if j < i - 1: _open[j].close(); del _open[j]
        _open[i] = Clip(spec[1], spec[2] + max(0, t - a), (b - max(a, t)) + 1.5)
    im = _open[i].next()
    if spec[0] == 'w': im = wing_diagram(t - a, im)
    return im

XF = 1.0
def frame(t):
    if t >= END_AT - XF:
        e = outro(max(0, t - END_AT))
        return Image.blend(shot_frame(len(SHOTS) - 1, t), e, ramp(t, END_AT - XF, END_AT)) if t < END_AT else e
    i = max(j for j in range(len(SHOTS)) if SHOTS[j][0] <= t)
    im = shot_frame(i, t)
    if i > 0 and SHOTS[i][0] <= t < SHOTS[i][0] + XF:
        im = Image.blend(shot_frame(i - 1, t), im, ramp(t, SHOTS[i][0], SHOTS[i][0] + XF))
    if t < 9.5:   # açılış: sessiz manzara + başlık
        im = Image.blend(Image.new('RGBA', (W, H), (0, 0, 0, 255)), im, ramp(t, 0, 1.5))
        im = center_title(im, min(ramp(t, 1.2, 2.6), 1 - ramp(t, 7.4, 8.8)), 'OWLS', 'Silent Hunters of the Night')
    for a, b, ti, su in LABELS:
        if a <= t < b: im = lower_third(im, ti, su, min(ramp(t, a, a + .5), 1 - ramp(t, b - .4, b)))
    return im

def outro(lt):
    im = Image.new('RGBA', (W, H), (10, 26, 24, 255)); d = ImageDraw.Draw(im)
    im.alpha_composite(LOGO, (150, 300))
    for txt, f, y, col in [('Thanks for watching', font(FB, 64), 380, SAND), ('Earthframe TV', font(FM, 44), 470, GOLD)]:
        d.text((560, y), txt, font=f, fill=col)
    d.rounded_rectangle([1260, 250, 1840, 576], 18, outline=GOLD + (140,), width=3)
    d.text((1460, 395), 'next video', font=font(FM, 36), fill=(200, 180, 150, 180))
    d.ellipse([1460, 680, 1640, 860], outline=GOLD + (140,), width=3)
    return Image.blend(im, Image.new('RGBA', (W, H), (0, 0, 0, 255)), ramp(lt, OUTRO - 2.5, OUTRO))

def finish(im, t):
    if t < END_AT:
        im.alpha_composite(WM, (W - 80 - 32, H - 80 - 26))
        if t > 9.5: ImageDraw.Draw(im).text((26, 1050), 'Footage: Pixabay', font=font(FM, 20), fill=(235, 235, 235, 140))
    return im.convert('RGB')

# ---------------------------------------------------------------- ses / altyazı / çıktı
def build_audio():
    ins, fc = [], []
    for k in range(len(paras)):
        ins += ['-i', f'{D}/ses/{k:02d}/ses.mp3']; ms = int(starts[k] * 1000)
        fc.append(f'[{k}:a]aresample=48000,adelay={ms}|{ms}[a{k}]')
    n = len(paras); ins += ['-i', f'{D}/muzik.wav']
    fc.append(f'[{n}:a]aresample=48000,volume=0.17,atrim=0:{TOTAL:.2f},afade=t=in:d=3,afade=t=out:st={TOTAL - 5:.2f}:d=5[m]')
    fc.append(''.join(f'[a{k}]' for k in range(n)) + f'[m]amix=inputs={n + 1}:duration=longest:normalize=0,atrim=0:{TOTAL:.2f}[o]')
    mix = f'{D}/mix.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[o]', '-ac', '2', mix], check=True)
    r = subprocess.run(['ffmpeg', '-i', mix, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    return mix, (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
                 f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")

def srt():
    def ts(x): return f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round((x % 1) * 1000)) % 1000:03d}'
    out = []
    for k in range(len(paras)):
        cur = []
        for wd, s, e in words[k]:
            cur.append((wd, s, e)); txt = ' '.join(x[0] for x in cur)
            if (wd[-1] in '.?!,…:' and len(txt) > 22) or len(txt) > 58:
                out.append((starts[k] + cur[0][1], starts[k] + cur[-1][2] + .2, txt)); cur = []
        if cur: out.append((starts[k] + cur[0][1], starts[k] + cur[-1][2] + .2, ' '.join(x[0] for x in cur)))
    lines = []
    for i, (a, b, s) in enumerate(out):
        if i + 1 < len(out): b = min(b, out[i + 1][0] - .02)
        lines.append(f'{i + 1}\n{ts(a)} --> {ts(b)}\n{s}\n')
    open(f'{D}/altyazi.srt', 'w').write('\n'.join(lines))

def encoder(path):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                             '-vf', 'noise=alls=2:allf=t', '-c:v', 'libx264', '-preset', 'medium', '-b:v', '7M', '-maxrate', '9M',
                             '-bufsize', '14M', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)

if os.environ.get('PREVIEW'):
    tl = [float(x) for x in os.environ['PREVIEW'].split(',')]
    sheet = Image.new('RGB', (480 * 4, 270 * ((len(tl) + 3) // 4)))
    for i, tt in enumerate(tl):
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
                    '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', f'{D}/earthframe_01_owls.mp4'], check=True)
    used = sorted({s[2][1] for s in SHOTS})
    json.dump(used, open(f'{D}/kullanilan_klipler.json', 'w'))
    print('bitti', round(TOTAL, 1), used)
