#!/usr/bin/env python3
"""Video 2 kapak resmi (1280x720). Kullanım: python3 kapak.py <çalışma_klasörü>  -> kapak_bees.jpg"""
import sys, math, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
D = sys.argv[1]; W, H = 1280, 720
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '2.0', '-i', f'{D}/src/273485.mp4', '-frames:v', '1',
                      '-vf', 'scale=1920:1080', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
im = Image.frombuffer('RGB', (1920, 1080), raw).crop((240, 0, 1920, 945)).resize((W, H), Image.LANCZOS)
im = ImageEnhance.Contrast(ImageEnhance.Color(im).enhance(1.25)).enhance(1.12)
# sola koyu geçiş (yazı alanı)
grad = Image.new('L', (W, H))
for x in range(W):
    grad.paste(int(max(0, 235 - x * 0.42)), (x, 0, x + 1, H))
im = Image.composite(Image.new('RGB', (W, H), (12, 8, 2)), im, grad).convert('RGBA')
# parlayan tek altıgen (sağdaki hücrenin üstünde)
def hexp(cx, cy, r): return [(cx + r * math.cos(math.radians(60 * i)), cy + r * math.sin(math.radians(60 * i))) for i in range(6)]
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
g.line(hexp(1150, 235, 125) + [hexp(1150, 235, 125)[0]], fill=(255, 190, 30, 255), width=40, joint='curve')
glow = glow.filter(ImageFilter.GaussianBlur(16))
im = Image.alpha_composite(im, glow); d = ImageDraw.Draw(im)
d.line(hexp(1150, 235, 125) + [hexp(1150, 235, 125)[0]], fill=(255, 245, 190, 255), width=14, joint='curve')
f1 = ImageFont.truetype(FB, 132); f2 = ImageFont.truetype(FB, 150)
d.text((50, 190), 'WHY', font=f1, fill=(255, 255, 255), stroke_width=10, stroke_fill=(0, 0, 0))
d.text((50, 340), 'HEXAGONS?', font=f2, fill=(255, 196, 30), stroke_width=12, stroke_fill=(0, 0, 0))
im.convert('RGB').save(f'{D}/kapak_bees.jpg', quality=92)
print('ok')
