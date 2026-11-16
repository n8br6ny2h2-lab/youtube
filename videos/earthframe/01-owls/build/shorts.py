#!/usr/bin/env python3
"""Earthframe 01 Shorts: uzun videonun paragraf seslerinden 3 dikey Short (ek ElevenLabs harcamaz).
Kullanım: python3 shorts.py <uzun_video_klasörü> <a|b|c>   (PREVIEW="0,5" ile önizleme)
Çıktı: <klasör>/short_<x>/earthframe_short_<x>.mp4
"""
import sys, os, json, shutil, subprocess, math
sys.path.insert(0, '/workspace/youtube/tools')
import shorts_ortak as O
from shorts_ortak import *

BASE, KEY = sys.argv[1], sys.argv[2]
SPEC = {
 'a': dict(para=3, hook=('HOW FAR CAN', 'AN OWL TURN', 'ITS HEAD?'),
           shots=[(0, '116657', 7, .5), ('An', '80954', 4, .45), ('Its', '161402', 4, .5)],
           keys=['whole', 'head.', 'seventy', 'degrees,', 'behind', 'fourteen', 'twice']),
 'b': dict(para=5, hook=('OWLS CAN HUNT', 'IN TOTAL', 'DARKNESS'),
           shots=[(0, '134476', 9, .55), ('A', '65809', 2, .5), ('By', '65812', 3, .5), ('It', '102626', 10, .5)],
           keys=['higher', 'darkness,', 'sound', 'alone.', 'snow.', 'mouse']),
 'c': dict(para=8, hook=('4 OWLS', '4 WAYS', 'OF LIFE'),
           shots=[(0, '189813', 2, .5), ('snowy', '102626', 22, .5), ('Eurasian', '80954', 10, .45), ('burrowing', '155754', 14, .5), ('tiny', '232518', 3, .5)],
           keys=['snowy', 'Arctic,', 'daylight.', 'largest', 'orange', 'underground,', 'tiny', 'elf', 'cacti.']),
}[KEY]
D = f'{BASE}/short_{KEY}'; os.makedirs(D, exist_ok=True)
src_dir = f'{BASE}/ses/{SPEC["para"]:02d}'
for f in ('ses.mp3', 'words.json'): shutil.copy(f'{src_dir}/{f}', f'{D}/{f}')
if not os.path.exists(f'{D}/muzik.wav'):
    subprocess.run(['python3', '/workspace/youtube/tools/muzik_ambient.py', f'{D}/muzik.wav', '40', str(20 + ord(KEY))], check=True)
words = load_words(D, SPEC['keys'])
NAR = words[-1][2]; END = NAR + 0.6; TOTAL = END + 3.0
SAND = (244, 228, 196); GOLD = (238, 190, 140)
FB = '/workspace/youtube/brand/earthframe/font/InterDisplay-Bold.otf'
O.WM = Image.open('/workspace/youtube/brand/earthframe/earthframe_filigran_300.png').convert('RGBA').resize((96, 96), Image.LANCZOS)
CFG['wm_pos'] = (W - 96 - 36, 60)
def wt(word):
    for x, s, e in words:
        if x.lower().strip('.,!?:;').startswith(word.lower()): return s
    raise KeyError(word)
starts = [0 if a == 0 else wt(a) - .15 for a, *_ in SPEC['shots']]
def wh(cid):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', f'{BASE}/src/{cid}.mp4'], capture_output=True, text=True).stdout
    return int(o.strip())
def sq_any(src, t0, dur, xc):
    """Kaynaktan en büyük kareyi alıp 1080x1080'e indirir (4K'da küçültme, 1080p'de 1:1)."""
    w = wh(src.split('/')[-1][:-4]); hh = 2160 if w >= 3840 else 1080
    x0 = int(max(0, min(w - hh, xc * w - hh / 2))) // 2 * 2
    n = int(math.ceil(dur * FPS)) + 2
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur + .3), '-i', src, '-vf', f'fps={FPS},crop={hh}:{hh}:{x0}:0,scale=1080:1080',
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    last = None
    for i in range(n):
        buf = p.stdout.read(1080 * 1080 * 3)
        if len(buf) < 1080 * 1080 * 3: break
        last = Image.frombuffer('RGB', (1080, 1080), buf); yield last
    p.kill(); p.wait()
    if last is None and t0 > 0: yield from sq_any(src, 0, dur, xc); return
    while True: yield last
_gen = {}
def shot(i, t):
    _, cid, t0, xc = SPEC['shots'][i]
    if i not in _gen:
        a = starts[i]; b = starts[i + 1] if i + 1 < len(starts) else TOTAL
        off = max(0, t - a)
        if i == 0 and wh(cid) >= 3840:   # kapak sahnesi: tam ekran dikey kesit
            _gen[i] = ('c', clip_frames(f'{BASE}/src/{cid}.mp4', t0 + off, b - a + .5, xc=xc, zoom0=1.0, zoom1=1.1))
        else:                            # hayvanın tamamı görünsün: kare + bulanık arka plan
            _gen[i] = ('s', sq_any(f'{BASE}/src/{cid}.mp4', t0 + off, b - a + .5, xc))
    kind, g = _gen[i]
    return next(g).convert('RGBA') if kind == 'c' else layout(next(g))

def tc(d, y, s, size, col, a=1.0):
    if a <= 0: return
    f = ImageFont.truetype(FB, size); w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=(*col, int(255 * a)), stroke_width=7, stroke_fill=(6, 18, 16, int(220 * a)))

def frame(t):
    if t >= END:
        im = Image.new('RGBA', (W, H), (10, 26, 24, 255)); d = ImageDraw.Draw(im)
        lg = Image.open('/workspace/youtube/brand/earthframe/earthframe_logo_800.png').convert('RGBA').resize((560, 560))
        lg.putalpha(int(255 * ramp(t, END, END + .4))); im.alpha_composite(lg, (260, 520))
        tc(d, 1180, 'FULL VIDEO', 84, SAND, ramp(t, END + .2, END + .6)); tc(d, 1290, 'on Earthframe TV', 56, GOLD, ramp(t, END + .4, END + .8))
        return im
    i = max(j for j in range(len(starts)) if starts[j] <= t)
    im = shot(i, t); d = ImageDraw.Draw(im)
    if t < 2.4:   # kapak: yazı ilk karede hazır
        a = 1 - ramp(t, 2.0, 2.4)
        for k, line in enumerate(SPEC['hook']):
            tc(d, 300 + k * 120, line, 104, SAND if k < 2 else GOLD, a)
    return im

if os.environ.get('PREVIEW'):
    _f = frame
    def frame(t):
        _gen.clear(); return _f(t)
render(D, TOTAL, frame, starts[1:] + [END], END, f'earthframe_short_{KEY}.mp4')
