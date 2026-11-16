#!/usr/bin/env python3
"""Earthframe 01 kapak (1280x720). Kullanım: python3 kapak.py <klasör> -> kapak_earthframe_01.jpg"""
import sys, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
D = sys.argv[1]; W, H = 1280, 720
FB = '/workspace/youtube/brand/earthframe/font/InterDisplay-Bold.otf'; FM = '/workspace/youtube/brand/earthframe/font/InterDisplay-Medium.otf'
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '4', '-i', f'{D}/src/80954.mp4', '-frames:v', '1', '-vf', 'scale=3840:2160',
                      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
im = Image.frombuffer('RGB', (3840, 2160), raw).crop((0, 100, 2940, 1754)).resize((W, H), Image.LANCZOS)
im = ImageEnhance.Contrast(ImageEnhance.Color(im).enhance(1.2)).enhance(1.12).convert('RGBA')
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
for x in range(W): d.line([(x, 0), (x, H)], fill=(6, 18, 16, int(max(0, 235 - x * 0.45))))
im = Image.alpha_composite(im, sh); d = ImageDraw.Draw(im)
d.text((60, 190), 'OWLS', font=ImageFont.truetype(FB, 200), fill=(244, 228, 196), stroke_width=4, stroke_fill=(6, 18, 16))
d.text((66, 420), 'Silent Hunters', font=ImageFont.truetype(FB, 74), fill=(238, 190, 140), stroke_width=3, stroke_fill=(6, 18, 16))
d.text((66, 505), 'of the Night', font=ImageFont.truetype(FB, 74), fill=(238, 190, 140), stroke_width=3, stroke_fill=(6, 18, 16))
im.convert('RGB').save(f'{D}/kapak_earthframe_01.jpg', quality=92); print('ok')
