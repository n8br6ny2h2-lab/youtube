#!/usr/bin/env python3
"""NASA görsel seçimi için temas sayfası: python scripts/nasa_curate.py cikti.png "sorgu 1" "sorgu 2" ...
Her satırda bir sorgunun ilk 8 adayı ve NASA kimlikleri görünür; seçilen kimlikler senaryodaki nasa_ids alanına yazılır."""
import sys, httpx, io
from PIL import Image, ImageDraw, ImageFont
queries = sys.argv[2:]
out = sys.argv[1]
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
rows = []
for q in queries:
    items = httpx.get('https://images-api.nasa.gov/search', params={'q': q, 'media_type': 'image'}, timeout=30).json()['collection']['items'][:8]
    row = Image.new('RGB', (8 * 210, 160), '#222'); d = ImageDraw.Draw(row)
    d.text((4, 2), q, font=F, fill='#ff0')
    for i, it in enumerate(items):
        nid = it['data'][0]['nasa_id']
        try:
            href = next(l['href'] for l in it.get('links', []) if l.get('rel') == 'preview')
            im = Image.open(io.BytesIO(httpx.get(href.replace(' ', '%20'), timeout=30).content)).convert('RGB')
            im.thumbnail((200, 120)); row.paste(im, (i * 210 + 5, 20))
        except Exception:
            pass
        d.text((i * 210 + 5, 142), nid[:28], font=F, fill='#fff')
    rows.append(row)
sheet = Image.new('RGB', (8 * 210, 160 * len(rows)))
for i, r in enumerate(rows):
    sheet.paste(r, (0, i * 160))
sheet.save(out)
