"""The demo card's textures, from the art in design-loop/art-src/card.

The scene is three layers, each a picture with its own depth:
  near  the ferns and boulders under the window       (the photograph)
  mid   the cliffs, the falls, the slopes, the river   (the photograph; behind
        the ferns, a plate with them painted out)
  far   the valley and the sky                          (behind the cliffs, a
        plate with them painted out)

Writes to public/images/card:
  canyon-a.png   R depth of the photograph   G falling water   B near matte
  canyon-b.png   R depth of the mid plate    G depth of the far plate   B mid matte
  canyon-mid.webp, canyon-far.webp   the two plates
Run from the repo root.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

SRC = 'design-loop/art-src/card/'
OUT = 'public/images/card/'
W, H = 1344, 752


def grey(name):
    return np.asarray(Image.open(SRC + name).convert('L').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255


def blur(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255


def grow(a, px):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(px))).astype(np.float32) / 255


def shrink(a, px):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(px))).astype(np.float32) / 255


d = grey('depth-a.png')
dm = grey('depth-mid.png')
df = grey('depth-far.png')
rgb = np.asarray(Image.open(SRC + 'c-canyon.png').convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
pm = np.asarray(Image.open(SRC + 'plate-mid.png').convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
pf = np.asarray(Image.open(SRC + 'plate-far.png').convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
ys, xs = np.mgrid[0:H, 0:W]
x = xs / W
y = ys / H

# the far falls on the left slope and in the right gorge are distant: the map
# drew their white water as near. Hold them to the depth of the slope around.
for (x0, x1, y0, y1, cap) in [(0.29, 0.38, 0.30, 0.52, 0.30), (0.70, 0.76, 0.36, 0.58, 0.30)]:
    reg = (x > x0) & (x < x1) & (y > y0) & (y < y1)
    soft = np.clip(np.minimum.reduce([(x - x0) / 0.02, (x1 - x) / 0.02, (y - y0) / 0.03, (y1 - y) / 0.03]), 0, 1)
    d = np.where(reg, d * (1 - soft) + np.minimum(d, cap) * soft, d)


def fblur(a, r):
    """a blur that keeps fractions (the 8-bit one above is for mattes)"""
    a = a.astype(np.float64)
    w = max(1, int(round(r * 1.2)))  # three box passes of this half-width ~ a gaussian of r

    def box(v, axis):
        n = v.shape[axis]
        pad = [(0, 0), (0, 0)]
        pad[axis] = (w + 1, w)
        c = np.cumsum(np.pad(v, pad, mode='edge'), axis=axis)
        hi = np.take(c, np.arange(2 * w + 1, 2 * w + 1 + n), axis=axis)
        lo = np.take(c, np.arange(0, n), axis=axis)
        return (hi - lo) / (2 * w + 1)

    for _ in range(3):
        a = box(box(a, 0), 1)
    return a.astype(np.float32)


def layer_depth(depth, matte, smooth):
    """A layer's depth as one smooth surface: its own depth where it is
    (smoothed among its own pixels only), and carried on past its edges, so a
    ray never meets a wall where the layer stops. The matte does the cutting."""
    m = (matte > 0.5).astype(np.float32)
    out = fblur(depth * m, smooth) / np.maximum(fblur(m, smooth), 1e-4)
    known = fblur(m, smooth) > 0.05
    out = np.where(known, out, 0)
    have = known.astype(np.float32)
    for r in (6, 12, 24, 48, 96, 192, 384):
        num = fblur(out * have, r)
        den = fblur(have, r)
        fill = (have < 0.5) & (den > 0.02)
        out = np.where(fill, num / np.maximum(den, 1e-4), out)
        have = np.where(fill, 1.0, have)
    out = np.where(have > 0.5, out, float(depth[m > 0.5].mean()))
    return fblur(out, 2.5)


def same(a, b):
    """where two pictures show the same thing"""
    return blur(np.abs(a - b).mean(2), 3) < 0.07


def calibrate(plate_depth, ref_depth, where):
    """Each map is drawn nearest-white on its own. Put the plate's depths on
    the photograph's scale, from the places where both show the same thing."""
    src = plate_depth[where]
    ref = ref_depth[where]
    edges = np.linspace(0, 1, 33)
    cx, cy = [], []
    for a, b in zip(edges[:-1], edges[1:]):
        sel = (src >= a) & (src < b)
        if sel.sum() > 400:
            cx.append((a + b) / 2)
            cy.append(float(np.median(ref[sel])))
    cy = np.maximum.accumulate(np.array(cy))  # nearer stays nearer
    print('  calibration', [(round(a, 2), round(float(b), 2)) for a, b in zip(cx, cy)][::6])
    return np.interp(plate_depth, cx, cy).astype(np.float32)


print('mid plate')
unchanged = same(rgb, pm)
dmc = calibrate(dm, d, unchanged & (d < 0.95))
print('far plate')
unchanged_f = same(pm, pf)
dfc = calibrate(df, dmc, unchanged_f)

# what each plate painted out: nearer in the picture in front than in the plate
near = ((d - dmc) > 0.07) & ~unchanged
near = shrink(grow(near.astype(np.float32), 5), 3)
near = shrink(grow(near, 9), 9)  # close pinholes in the fronds
# the ferns and boulders are under the window: nothing up the cliffs is theirs
near = near * np.clip((y - 0.40) / 0.06, 0, 1)
near = shrink(grow(shrink(near, 7), 7), 1)  # and no specks
mid = ((dmc - dfc) > 0.06) & ~unchanged_f
mid = shrink(grow(mid.astype(np.float32), 5), 3)
mid = shrink(grow(mid, 25), 25)  # a cliff has no holes in it
# behind its own matte a layer's depth is the plate's; elsewhere the map that
# is sharpest there (the photograph's own)
d_mid = np.where(near > 0.5, dmc, np.minimum(d, 1.0))
d_mid = np.where(blur(near, 6) > 0.02, np.minimum(d_mid, dmc + 0.0) * 1.0, d_mid)
d_far = np.where(mid > 0.5, dfc, d_mid)
d_far = np.where(blur(mid, 6) > 0.02, np.minimum(d_far, dfc), d_far)
print('near covers', round(float(near.mean()) * 100, 1), '%  mid covers', round(float(mid.mean()) * 100, 1), '%')
print('near depth', np.percentile(d[near > 0.5], [2, 50, 98]).round(2), ' mid depth', np.percentile(d_mid[mid > 0.5], [2, 50, 98]).round(2),
      ' far depth', np.percentile(d_far, [2, 50, 98]).round(2))

# falling water: bright, colourless, inside the two great falls' own columns
mx = rgb.max(2)
mn = rgb.min(2)
sat = (mx - mn) / (mx + 1e-6)
water = (mx > 0.72) & (sat < 0.22) & (d > 0.22) & (near < 0.5)
region = ((x > 0.115) & (x < 0.235) & (y > 0.06) & (y < 0.66)) | ((x > 0.815) & (x < 0.925) & (y > 0.05) & (y < 0.63))
wm = shrink(grow(shrink((water & region).astype(np.float32), 11), 11), 1)
lab = np.zeros((H, W), np.int32)
n = 0
sizes = {}
for sy in range(H):
    for sx in range(W):
        if wm[sy, sx] > 0.5 and lab[sy, sx] == 0:
            n += 1
            st = [(sy, sx)]
            lab[sy, sx] = n
            c = 0
            while st:
                a, b = st.pop()
                c += 1
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    aa, bb = a + da, b + db
                    if 0 <= aa < H and 0 <= bb < W and wm[aa, bb] > 0.5 and lab[aa, bb] == 0:
                        lab[aa, bb] = n
                        st.append((aa, bb))
            sizes[n] = c
keep = [k for k, v in sizes.items() if v > 2500]
wm = np.isin(lab, keep).astype(np.float32)
for k in keep:
    top = np.where((lab == k).any(1))[0].min()
    wm = np.where(lab == k, wm * np.clip((ys - top) / (0.07 * H), 0, 1), wm)
wm = blur(wm, 4.5)


def save(name, r, g, b):
    pack = np.zeros((H, W, 3), np.uint8)
    for i, ch in enumerate((r, g, b)):
        pack[..., i] = (np.clip(ch, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(pack).save(OUT + name, optimize=True)


# each layer: one smooth surface, continued past its own edges
h_near = layer_depth(d, near, 5)
h_mid = layer_depth(d_mid, mid, 6)
h_far = fblur(d_far, 14)
save('canyon-a.png', h_near, wm, blur(near, 1.2))
print('surfaces: near', np.percentile(h_near, [1, 50, 99]).round(2), 'mid', np.percentile(h_mid, [1, 50, 99]).round(2), 'far', np.percentile(h_far, [1, 50, 99]).round(2))
save('canyon-b.png', h_mid, h_far, blur(mid, 1.4))


def match(plate, ref, where, r=48):
    """The plates were painted separately and come out a shade off the
    photograph: where they meet, a seam. Lift each plate by the photograph's
    own local colour, measured where the two show the same thing and carried
    smoothly into what the plate painted in."""
    m = where.astype(np.float32)
    out = plate.copy()
    for ch in range(3):
        num = fblur(ref[..., ch] * m, r)
        den = fblur(plate[..., ch] * m, r)
        cov = fblur(m, r)
        gain = np.where(cov > 0.02, (num + 1e-3) / (den + 1e-3), np.nan)
        have = np.isfinite(gain)
        g = np.where(have, gain, 0.0)
        hv = have.astype(np.float32)
        for rr in (32, 64, 128, 256, 512):
            nn = fblur(g * hv, rr)
            dd = fblur(hv, rr)
            fill = (hv < 0.5) & (dd > 0.02)
            g = np.where(fill, nn / np.maximum(dd, 1e-4), g)
            hv = np.where(fill, 1.0, hv)
        g = np.where(hv > 0.5, g, 1.0)
        out[..., ch] = plate[..., ch] * np.clip(fblur(g, 8), 0.7, 1.4)
    return np.clip(out, 0, 1)


pm_fit = match(pm, rgb, unchanged)
pf_fit = match(pf, pm_fit, unchanged_f)
for name, a, b, w in (('mid', pm, pm_fit, unchanged), ('far', pf, pf_fit, unchanged_f)):
    ref = rgb if name == 'mid' else pm_fit
    print(name, 'mean error where unchanged: before', round(float(np.abs(a - ref)[w].mean()), 4), 'after', round(float(np.abs(b - ref)[w].mean()), 4))
Image.fromarray((pm_fit * 255).astype(np.uint8)).save(OUT + 'canyon-mid.webp', quality=86, method=6)
Image.fromarray((pf_fit * 255).astype(np.uint8)).save(OUT + 'canyon-far.webp', quality=86, method=6)
if os.path.exists(OUT + 'canyon-depth.png'):
    os.remove(OUT + 'canyon-depth.png')
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(OUT + f) // 1024, 'KB')

# a look at the mattes
chk = rgb.copy()
chk[..., 0] = np.clip(chk[..., 0] + near * 0.7, 0, 1)
chk[..., 2] = np.clip(chk[..., 2] + mid * (1 - near) * 0.7, 0, 1)
Image.fromarray((chk * 255).astype(np.uint8)).resize((1008, 564)).save(SRC + 'matte-check.png')
row = np.concatenate([np.repeat(np.clip(a, 0, 1)[..., None], 3, 2) for a in (h_near, h_mid, h_far)], 1)
Image.fromarray((row * 255).astype(np.uint8)).resize((2016, 376)).save(SRC + 'depth-check.png')
