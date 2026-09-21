"""Convert generated PNGs in art-src/ into web-weight WebP in public/, plus tiny blur placeholders."""
import os, json, base64, io, sys
from PIL import Image
SRC = os.path.join(os.path.dirname(__file__), 'art-src')
PUB = os.path.join(os.path.dirname(__file__), '..', 'public')
# name -> (folder, max width, quality)
MAP = {}
for w in ['portal','creative','web','ai']:
    MAP[f'{w}-desktop'] = ('worlds', 2880, 78)
    MAP[f'{w}-mobile']  = ('worlds', 1170, 78)
for c in ['mesa-tordo','ironvale-build','solenne-aesthetics','harrow-pike','tavo-supply','kilo-club','alder-quay','caliber-nine','fennick-rowe-engineer','fennick-rowe-van']:
    MAP[c] = ('concepts', 1600, 80)
for t in ['maren-holloway','marcus-thibault','priya-raman','caleb-whitford','sofia-marchetti','jonah-pruitt','elena-vasquez','hannah-lindqvist','tomas-reyes','devin-okafor']:
    MAP[t] = ('testimonials', 320, 82)
manifest_path = os.path.join(PUB, 'art-manifest.json')
manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
for name, (folder, maxw, q) in MAP.items():
    src = os.path.join(SRC, name + '.png')
    if not os.path.exists(src): continue
    im = Image.open(src).convert('RGB')
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    os.makedirs(os.path.join(PUB, folder), exist_ok=True)
    out = os.path.join(PUB, folder, name + '.webp')
    im.save(out, 'WEBP', quality=q, method=6)
    tiny = im.copy(); tiny.thumbnail((24, 24)); buf = io.BytesIO(); tiny.save(buf, 'WEBP', quality=50)
    manifest[f'/{folder}/{name}.webp'] = {'w': im.width, 'h': im.height, 'blur': 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()}
    print(f'{folder}/{name}.webp  {im.width}x{im.height}  {os.path.getsize(out)//1024} KB')
json.dump(manifest, open(manifest_path, 'w'), indent=1)
print('manifest entries:', len(manifest))
