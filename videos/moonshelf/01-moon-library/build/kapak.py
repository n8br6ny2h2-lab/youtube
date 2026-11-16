#!/usr/bin/env python3
"""Moonshelf TV hikâye 1 kapak resmi (1280x720). Kullanım: python3 kapak.py <klasör> -> kapak_moonshelf_01.jpg"""
import sys, subprocess, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
D = sys.argv[1]; W, H = 1280, 720
sys.path.insert(0, '/workspace/youtube/brand/moonshelf'); import logo as LG
F = '/workspace/youtube/brand/moonshelf/font/Fredoka-SemiBold.ttf'
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '6', '-i', f'{D}/src/134476.mp4', '-frames:v', '1', '-vf', 'scale=1920:1080',
                      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
owl = Image.frombuffer('RGB', (1920, 1080), raw).crop((700, 60, 1660, 1080)).resize((678, 720), Image.LANCZOS)
owl = ImageEnhance.Brightness(owl).enhance(1.25)
im = LG.sky(W, H, seed=11).convert('RGBA')
mask = Image.new('L', (678, 720), 0); m = ImageDraw.Draw(mask)
for x in range(678): m.line([(x, 0), (x, 720)], fill=int(255 * min(1, x / 220)))
im.paste(owl, (W - 678, 0), mask)
em = LG.emblem(330); im.alpha_composite(em, (30, 20))
d = ImageDraw.Draw(im)
def T(xy, s, size, col, sw=8): d.text(xy, s, font=ImageFont.truetype(F, size), fill=col, stroke_width=sw, stroke_fill=(10, 12, 40))
T((60, 345), "The Moon's", 92, (255, 240, 200)); T((60, 450), 'Night Library', 104, (255, 205, 110))
d.rounded_rectangle([60, 600, 470, 672], 36, fill=(255, 122, 122))
T((92, 608), 'Bedtime Story', 46, (255, 255, 255), 0)
im.convert('RGB').save(f'{D}/kapak_moonshelf_01.jpg', quality=92); print('ok')
