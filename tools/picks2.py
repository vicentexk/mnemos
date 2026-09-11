"""Pipeline de sprites do usuário → atlas (LANCZOS, preserva a arte)."""
import os, json
import numpy as np
from PIL import Image

OUT = '/tmp/sprites/picks2'
os.makedirs(OUT, exist_ok=True)
boxes = json.load(open('/tmp/sprites/boxes.json'))

def comp(i, idx):
    x, y, w, h = boxes[str(i)][idx]
    im = Image.open(f'/home/user/uploads/image-{i}.png').convert('RGBA')
    a = np.asarray(im).astype(np.int16)
    bg = a[2, 2, :3].copy()
    dist = np.abs(a[:, :, :3] - bg).sum(axis=2)
    alpha = np.clip((dist - 40) * 8, 0, 255).astype(np.uint8)
    im.putalpha(Image.fromarray(alpha))
    c = im.crop((x, y, x + w, y + h))
    bb = c.getbbox()
    return c.crop(bb) if bb else c

def stats(c):
    a = np.asarray(c.convert('RGBA')).astype(np.float32)
    m = a[:, :, 3] > 128
    if m.sum() == 0: return None
    rgb = a[:, :, :3][m]
    mx = rgb.max(axis=1); mn = rgb.min(axis=1)
    v = mx / 255; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    d = mx - mn; nz = d > 0
    rr = np.where(nz & (mx == r), ((g - b) / np.maximum(d, 1)) % 6, 0)
    gg = np.where(nz & (mx == g) & (mx != r), (b - r) / np.maximum(d, 1) + 2, 0)
    bb = np.where(nz & (mx == b) & (mx != r) & (mx != g), (r - g) / np.maximum(d, 1) + 4, 0)
    h = (rr + gg + bb) * 60
    return dict(hue=h, s=s, v=v, n=len(r))

def frac(c, lo, hi, smin=0.25, vmin=0.2):
    st = stats(c)
    if st is None: return 0
    return float(((st['hue'] >= lo) & (st['hue'] < hi) & (st['s'] > smin) & (st['v'] > vmin)).sum() / st['n'])

picks = {}

# ---------- ÁRVORES (maiores agora) ----------
picks['t/green'] = comp(22, 0)
# macieira: maior comp da img22 com vermelho > 2%
g22 = [(i, w * h) for i, w, h in [(i, b[2], b[3]) for i, b in enumerate(boxes['22'])] if w * h > 30000]
best_apple = None
for i, area in g22:
    c = comp(22, i)
    red = frac(c, 0, 20) + frac(c, 345, 360)
    grn = frac(c, 60, 170)
    if grn > 0.3 and red > 0.015 and (best_apple is None or area > best_apple[1]): best_apple = (i, area)
picks['t/apple'] = comp(22, best_apple[0]) if best_apple else comp(22, 1)
picks['t/deadbig'] = comp(10, 0)
picks['t/palm'] = comp(23, 0)
picks['t/pine'] = comp(23, 8)
picks['t/tent'] = comp(10, 6)
picks['t/mush'] = comp(10, 14)
picks['t/mushP'] = comp(10, 17)
picks['t/skulltotem'] = comp(10, 19)
picks['t/root'] = comp(2, 8)

# ---------- RUÍNAS / PORTAL / BURACO / BAÚ ----------
picks['r/ruin1'] = comp(19, 0)
picks['r/ruin2'] = comp(19, 8)
g = comp(2, 2)
picks['b/porta2'] = g.crop((0, 0, g.width // 3, g.height))
picks['d/hole2'] = comp(2, 3)
chest = None
for i, b in enumerate(boxes['16']):
    w, h = b[2], b[3]
    if 30 < w < 160 and 20 < h < 120 and 1.2 < w / h < 2.4:
        c = comp(16, i)
        if frac(c, 10, 40, 0.3, 0.4) > 0.25 and (chest is None or w * h > chest[1]): chest = (i, w * h)
picks['b/chest2'] = comp(16, chest[0])

# ---------- CASA GRANDE (img13: telhado amarelo M, pedra na base) ----------
house = None
for i, b in enumerate(boxes['13']):
    w, h = b[2], b[3]
    if w < 260 or h < 200 or w > 900 or h > 700: continue
    ar = w / h
    if not (0.9 < ar < 1.6): continue
    c = comp(13, i)
    yellow = frac(c, 30, 60, 0.4, 0.6)
    orange = frac(c, 10, 35, 0.4, 0.5)
    if yellow + orange > 0.25 and (house is None or w * h > house[1]): house = (i, w * h)
assert house, 'casa não achada na img13'
picks['b/house2'] = comp(13, house[0])

# ---------- DECUAIS DE CHÃO (img5) + ÁGUA (img7) ----------
decals = []
for i, b in enumerate(boxes['5']):
    w, h = b[2], b[3]
    if w < 60 or h < 40 or w > 700 or h > 500: continue
    ar = w / h
    if not (0.8 < ar < 3.5): continue
    c = comp(5, i)
    st = stats(c)
    if st is None: continue
    green = frac(c, 60, 160, 0.1, 0.35)
    brown = frac(c, 15, 45, 0.15, 0.3)
    area_frac = (np.asarray(c)[:, :, 3] > 100).mean()
    if area_frac < 0.5: continue  # decal de chão é cheio, não árvore
    decals.append((i, w, h, green, brown))
# manchas claras (grama clara): verdes suaves
patch = [d for d in decals if d[3] > 0.25]
patch.sort(key=lambda d: -d[1] * d[2])
for n, d in enumerate(patch[:4]): picks[f'g/patch{n+1}'] = comp(5, d[0])
dirt = [d for d in decals if d[3] <= 0.25 and d[4] > 0.2]
dirt.sort(key=lambda d: -d[1] * d[2])
for n, d in enumerate(dirt[:3]): picks[f'g/dirt{n+1}'] = comp(5, d[0])
# água: img7, manchas azuis achatadas
water = []
for i, b in enumerate(boxes['7']):
    w, h = b[2], b[3]
    if w < 50 or h < 8 or w / h < 1.6: continue
    c = comp(7, i)
    blue = frac(c, 180, 220, 0.15, 0.4)
    if blue > 0.3: water.append((i, w, h))
water.sort(key=lambda d: -d[1])
for n, d in enumerate(water[:3]): picks[f'g/water{n+1}'] = comp(7, d[0])

# ---------- ANIMAIS + MOBS (iguais à rodada passada) ----------
def firstrow(i, xr, sz, want=2):
    cs = []
    for idx, b in enumerate(boxes[str(i)]):
        w, h = b[2], b[3]
        if not (sz[0] <= w <= sz[1] and sz[0] <= h <= sz[1] + 25): continue
        if not (xr[0] <= b[0] / 1800 < xr[1]): continue
        cs.append(idx)
    cs.sort(key=lambda t: (boxes[str(i)][t][1] // 120, boxes[str(i)][t][0]))
    return [comp(i, t) for t in cs[:want]]
for f, c in enumerate(firstrow(25, (0, 0.55), (26, 60))): picks[f'a/horse{f}'] = c
for f, c in enumerate(firstrow(26, (0, 0.5), (22, 55))): picks[f'a/goat{f}'] = c
for f, c in enumerate(firstrow(27, (0.3, 0.75), (20, 55))): picks[f'a/duck{f}'] = c
for f, c in enumerate(firstrow(28, (0.1, 0.9), (24, 60))): picks[f'a/donkey{f}'] = c
picks['e/goblin0'] = comp(36, 68); picks['e/goblin1'] = comp(36, 69)
gol = [(i, b[2] * b[3]) for i, b in enumerate(boxes['32']) if 55 <= b[2] <= 130 and 55 <= b[3] <= 130 and b[0] / 1800 < 0.35]
gol.sort(key=lambda t: (boxes['32'][t[0]][1] // 150, boxes['32'][t[0]][0]))
picks['e/golem0'] = comp(32, gol[0][0]); picks['e/golem1'] = comp(32, gol[1][0])
picks['e/fogo0'] = comp(31, 12); picks['e/fogo1'] = comp(31, 13)
ur = [(i, b[2] * b[3]) for i, b in enumerate(boxes['31']) if b[1] > 850 and b[2] < 120 and b[3] < 120]
ur.sort(key=lambda t: -t[1])
picks['e/espinho0'] = comp(31, ur[0][0]); picks['e/espinho1'] = comp(31, ur[1][0])

# ---------- REDIMENSIONAMENTO LANCZOS ----------
TARGET = {
    't/green': 58, 't/apple': 52, 't/deadbig': 42, 't/palm': 58, 't/pine': 56,
    't/mush': 36, 't/mushP': 40, 't/tent': 34, 't/skulltotem': 38, 't/root': 62,
    'r/ruin1': 48, 'r/ruin2': 38, 'b/chest2': 18, 'b/porta2': 60, 'd/hole2': 15,
    'b/house2': 0,  # por largura
    'a/horse0': 19, 'a/horse1': 19, 'a/goat0': 15, 'a/goat1': 15, 'a/duck0': 13, 'a/duck1': 13,
    'a/donkey0': 17, 'a/donkey1': 17,
    'e/goblin0': 26, 'e/goblin1': 26, 'e/golem0': 34, 'e/golem1': 34,
    'e/fogo0': 24, 'e/fogo1': 24, 'e/espinho0': 20, 'e/espinho1': 20
}
sizes = {}
for k, c in picks.items():
    if k == 'b/house2':
        s = 76 / c.width  # casa por largura (proporção original preservada)
        c2 = c.resize((76, max(1, round(c.height * s))), Image.LANCZOS)
    elif k.startswith('g/'):
        s = min(1.0, 26 / max(c.width, c.height))
        c2 = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
        if k.startswith('g/water'): c2 = c2.resize((c2.width // 2 * 2, c2.height // 2 * 2 or 2), Image.LANCZOS)
    else:
        th = TARGET[k]
        s = th / c.height
        c2 = c.resize((max(1, round(c.width * s)), th), Image.LANCZOS)
    c2.save(f'{OUT}/{k.replace("/", "_")}.png')
    sizes[k] = c2.size
    print(k, c.size, '->', c2.size)

# ---------- ATLAS + MANIFEST ----------
names = sorted(sizes.keys())
CELL = 96
cols = 8
rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * CELL, rows * CELL), (0, 0, 0, 0))
man = {}
for n, k in enumerate(names):
    im = Image.open(f'{OUT}/{k.replace("/", "_")}.png')
    x, y = (n % cols) * CELL, (n // cols) * CELL
    sheet.paste(im, (x + (CELL - im.width) // 2, y + CELL - im.height), im)
    man[k] = [x, y, im.width, im.height]
sheet.save('/home/user/mnemos/public/img/externa.png')
json.dump(man, open('/home/user/mnemos/public/img/externa.json', 'w'), separators=(',', ':'))
open('/home/user/mnemos/public/img/externa.manifest.js', 'w').write(
    '// gerado — atlas externo (folhas do usuario)\nwindow.EXTERNA_MANIFEST=' + json.dumps(man, separators=(',', ':')) + ';\n')
print('ATLAS', sheet.size, len(man), 'sprites')

# ---------- QA: zoom 4x simulando o jogo ----------
from PIL import ImageDraw
keys = names
colsq = 6
CW, CH = 420, 300
rowsq = (len(keys) + colsq - 1) // colsq
qa = Image.new('RGB', (CW * colsq, CH * rowsq), (140, 170, 90))
d = ImageDraw.Draw(qa)
for n, k in enumerate(keys):
    im = Image.open(f'{OUT}/{k.replace("/", "_")}.png')
    im4 = im.resize((im.width * 4, im.height * 4), Image.NEAREST)  # zoom do jogo
    x, y = (n % colsq) * CW, (n // colsq) * CH
    d.rectangle([x, y, x + CW - 1, y + 22], fill=(20, 20, 24))
    d.text((x + 6, y + 6), f'{k} {im.size[0]}x{im.size[1]}', fill=(255, 255, 255))
    qa.paste(im4, (x + CW // 2 - im4.width // 2, y + CH - 8 - im4.height), im4)
    d.rectangle([x, y, x + CW - 1, y + CH - 1], outline=(70, 70, 70))
qa.save('/home/user/mnemos/docs/qa-picks2.png')
print('QA OK')
