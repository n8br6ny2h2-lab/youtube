#!/usr/bin/env python3
"""YouTube "Test ve Karşılaştır" için 2 ek kapak (B, C). Kullanım: python3 kapak_test.py <klasör>"""
import sys, math, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
D = sys.argv[1]; W, H = 1280, 720
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def frame(cid, t, box=None):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', f'{D}/src/{cid}.mp4', '-frames:v', '1', '-vf', 'scale=1920:1080',
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    im = Image.frombuffer('RGB', (1920, 1080), raw)
    if box: im = im.crop(box)
    return ImageEnhance.Contrast(ImageEnhance.Color(im.resize((W, H), Image.LANCZOS)).enhance(1.25)).enhance(1.1)
def hexp(cx, cy, r, rot=0): return [(cx + r * math.cos(math.radians(60 * i + rot)), cy + r * math.sin(math.radians(60 * i + rot))) for i in range(6)]
def T(d, xy, s, size, col, sw=10): d.text(xy, s, font=ImageFont.truetype(FB, size), fill=col, stroke_width=sw, stroke_fill=(0, 0, 0))

# B: "BEES vs MATH" — kalabalık arılar + 1999
im = frame('375601', 4).convert('RGBA')
im = Image.alpha_composite(im, Image.new('RGBA', (W, H), (0, 0, 0, 90))); d = ImageDraw.Draw(im)
d.rounded_rectangle([40, 60, 700, 330], 30, fill=(255, 196, 30, 255))
T(d, (75, 80), 'BEES', 120, (20, 14, 0), 0); T(d, (75, 200), 'BEAT MATH', 96, (20, 14, 0), 0)
T(d, (690, 450), '1999', 180, (255, 255, 255), 12)
im.convert('RGB').save(f'{D}/kapak_bees_B.jpg', quality=92)

# C: parlayan altıgen ağ + iki arı
im = frame('273476', 4).convert('RGBA')
lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
r = 70
for row in range(-1, 8):
    for col in range(-1, 12):
        cx = col * r * 1.5; cy = row * r * 1.732 + (r * 0.866 if col % 2 else 0)
        g.line(hexp(cx, cy, r) + [hexp(cx, cy, r)[0]], fill=(255, 200, 40, 150), width=5)
mask = Image.new('L', (W, H)); m = ImageDraw.Draw(mask)
m.rectangle([0, 0, W, H], fill=0); m.ellipse([-300, 300, 900, 1300], fill=255)
lay.putalpha(Image.composite(lay.split()[3], Image.new('L', (W, H), 0), mask.filter(ImageFilter.GaussianBlur(60))))
im = Image.alpha_composite(im, lay); d = ImageDraw.Draw(im)
T(d, (50, 40), 'PERFECT', 120, (255, 255, 255)); T(d, (50, 170), 'HEXAGONS', 120, (255, 196, 30))
T(d, (55, 310), 'built in the dark', 54, (255, 255, 255), 6)
im.convert('RGB').save(f'{D}/kapak_bees_C.jpg', quality=92)
print('ok')
