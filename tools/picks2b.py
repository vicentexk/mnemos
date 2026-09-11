"""Addendum: decuais bons (rochas/tufos/flores), baú single, remove lixo."""
import os, json
import numpy as np
from PIL import Image

OUT = '/tmp/sprites/picks2'
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

# remove lixo da rodada anterior
for bad in ['g_patch1', 'g_dirt1', 'g_dirt2', 'g_dirt3', 'g_water1', 'g_water2', 'g_water3']:
    p = f'{OUT}/{bad}.png'
    if os.path.exists(p): os.remove(p)

print('chest mantém duplo (baú grande de dungeon)')

# img9: rochas cinza, tufos de capim, flores
rocks, tufts, flowers = [], [], []
for idx, b in enumerate(boxes['9']):
    w, h = b[2], b[3]
    if w < 25 or h < 14 or w > 300 or h > 260: continue
    c = comp(9, idx)
    st = stats(c)
    if st is None: continue
    gray = float(((st['s'] < 0.25) & (st['v'] > 0.3) & (st['v'] < 0.8)).sum() / st['n'])
    green = frac(c, 60, 170, 0.15, 0.25)
    white = float((st['v'] > 0.85).sum() / st['n'])
    yellow = frac(c, 40, 65, 0.3, 0.6)
    area = int((np.asarray(c)[:, :, 3] > 128).sum())
    if gray > 0.25 and area > 2000: rocks.append((idx, area))
    elif green > 0.3 and h < 90: tufts.append((idx, area))
    elif (white > 0.05 or yellow > 0.05) and green > 0.15 and area > 800: flowers.append((idx, area))
rocks.sort(key=lambda t: -t[1]); tufts.sort(key=lambda t: -t[1]); flowers.sort(key=lambda t: -t[1])
print('img9:', len(rocks), 'rochas,', len(tufts), 'tufos,', len(flowers), 'flores')

def save(key, c, th):
    s = th / c.height
    c2 = c.resize((max(1, round(c.width * s)), th), Image.LANCZOS)
    c2.save(f'{OUT}/{key.replace("/", "_")}.png')
    print(key, c.size, '->', c2.size)
    return c2

sizes = {}
if rocks: sizes['g/rock1'] = save('g/rock1', comp(9, rocks[0][0]), 22)
if len(rocks) > 2: sizes['g/rock2'] = save('g/rock2', comp(9, rocks[2][0]), 14)
if tufts: sizes['g/tuft1'] = save('g/tuft1', comp(9, tufts[0][0]), 12)
if len(tufts) > 2: sizes['g/tuft2'] = save('g/tuft2', comp(9, tufts[2][0]), 10)
if flowers: sizes['g/flower1'] = save('g/flower1', comp(9, flowers[0][0]), 10)
# decuais que ficaram da rodada passada
for k in ['g/patch2', 'g/patch3']:
    p = f'{OUT}/{k.replace("/", "_")}.png'
    if os.path.exists(p):
        im = Image.open(p)
        sizes[k] = im.size
        print('mantém', k, im.size)

# ---------- REATLAS ----------
names = sorted(os.listdir(OUT))
names = [n[:-4].replace('_', '/') for n in names if n.endswith('.png')]
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

# ---------- QA de cena: como fica NO JOGO (escala real + zoom) ----------
game = Image.new('RGB', (560, 240), (146, 176, 82))  # grama da savana
def put(img, key, x, y, scale=1):
    im = Image.open(f'{OUT}/{key.replace("/", "_")}.png')
    if scale != 1: im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    game.paste(im, (x - im.width // 2, y - im.height), im)
# chão com decuais
put(game, 'g/patch3', 70, 200); put(game, 'g/tuft1', 130, 215); put(game, 'g/flower1', 250, 225)
put(game, 'g/patch2', 330, 205); put(game, 'g/rock1', 430, 220); put(game, 'g/rock2', 480, 195)
put(game, 'g/tuft2', 200, 195); put(game, 'g/flower1', 60, 150)
# casa + árvores na escala do jogo (1×) — linha de horizonte
put(game, 'b/house2', 120, 110)
put(game, 't/green', 260, 90); put(game, 't/apple', 330, 95); put(game, 't/pine', 420, 90)
put(game, 't/palm', 500, 95); put(game, 't/root', 60, 80); put(game, 't/mushP', 170, 85)
put(game, 'r/ruin1', 390, 60); put(game, 'b/porta2', 490, 55)
# criaturas
put(game, 'e/golem0', 240, 190); put(game, 'e/goblin0', 300, 215); put(game, 'e/fogo0', 350, 190)
put(game, 'a/horse0', 440, 180); put(game, 'a/duck0', 520, 220)
# player ~8px alto (bola branca aproximando) pra escala
game.paste((255, 255, 255), (200, 216, 205, 224))
game.paste((40, 40, 40), (201, 224, 204, 226))
game.save('/home/user/mnemos/docs/qa-cena.png')
print('QA cena OK')
