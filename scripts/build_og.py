# -*- coding: utf-8 -*-
"""Regenerate the share image (assets/og/countries-<slug>.jpg and assets/og/es/...) for every country page.
Photo background + the country outline (and route, when it has one), taken from the page's own <svg class="shape-svg">.
Usage: python scripts/build_og.py [slug ...]   (needs Pillow)"""
import re, sys, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
ROOT = pathlib.Path(__file__).resolve().parent.parent
SERIF = "/usr/share/fonts/truetype/crosextra/Caladea-Bold.ttf"
SANS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
W, H, SS = 1200, 630, 2
GOLD, CREAM, GREEN = (227, 182, 74), (243, 239, 220), (120, 160, 108)

def font(path, size): return ImageFont.truetype(path, size * SS)

def polys(d):
    out = []
    for part in d.split("M")[1:]:
        nums = re.findall(r"-?\d+\.?\d*", part)
        out.append([(float(nums[i]), float(nums[i+1])) for i in range(0, len(nums)-1, 2)])
    return out

def cover(img, w, h):
    return ImageOps.fit(img, (w, h), Image.LANCZOS, centering=(0.5, 0.45))

def make(slug, lang):
    page = ROOT / ("es/" if lang == "es" else "") / "countries" / slug / "index.html"
    h = page.read_text(encoding="utf-8")
    m = re.search(r'<svg class="shape-svg".*?</svg>', h, re.S)
    if not m: return None
    svg = m.group(0)
    shape = re.search(r'class="shape-line"[^>]*\sd="([^"]+)"', svg)
    if not shape: return None
    name = re.sub(r"<[^>]+>", "", re.search(r'<h1 class="country-title">(.*?)</h1>', h, re.S).group(1)).strip()
    kick = re.sub(r"<[^>]+>", "", re.search(r'<p class="country-kicker">(.*?)</p>', h, re.S).group(1)).strip()
    meta = re.search(r'<p class="hero-meta">(.*?)</p>', h, re.S); meta = re.sub(r"<[^>]+>", "", meta.group(1)).strip() if meta else ""
    photo = re.search(r'<div class="photo-tile featured"><img[^>]*src="([^"]+)"', h)
    bg = Image.open(ROOT / photo.group(1).lstrip("/")).convert("RGB") if photo else Image.new("RGB", (W, H), (24, 34, 28))
    im = cover(bg, W*SS, H*SS).filter(ImageFilter.GaussianBlur(2*SS))
    # darken: overall + stronger on the left
    shade = Image.new("RGBA", im.size, (14, 22, 17, 120)); im = Image.alpha_composite(im.convert("RGBA"), shade)
    grad = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(grad)
    for x in range(im.width):
        a = int(210 * max(0, 1 - x / (im.width * 0.78)) ** 1.2)
        gd.line([(x, 0), (x, im.height)], fill=(10, 18, 13, a))
    im = Image.alpha_composite(im, grad)
    # outline panel on the right
    bx, by, bw, bh = 640, 70, 500, 490
    vb_w, vb_h = 600, 520
    s = min(bw / vb_w, bh / vb_h) * SS
    ox = (bx + (bw - vb_w * min(bw / vb_w, bh / vb_h)) / 2) * SS; oy = (by + (bh - vb_h * min(bw / vb_w, bh / vb_h)) / 2) * SS
    T = lambda p: (ox + p[0] * s, oy + p[1] * s)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
    P = polys(shape.group(1))
    for poly in P: ld.polygon([T((x + 9, y + 11)) for x, y in poly], fill=(0, 0, 0, 120))
    layer = layer.filter(ImageFilter.GaussianBlur(7 * SS)); ld = ImageDraw.Draw(layer)
    for poly in P:
        pts = [T(p) for p in poly]
        ld.polygon(pts, fill=CREAM + (245,)); ld.line(pts + [pts[0]], fill=(255, 255, 255, 255), width=2 * SS)
    rp = re.search(r'class="route-path"[^>]*\sd="([^"]+)"', svg)
    if rp:
        pts = [T(p) for p in polys("M" + rp.group(1)[1:])[0]] if False else None
        nums = re.findall(r"-?\d+\.?\d*", rp.group(1)); rpts = [T((float(nums[i]), float(nums[i+1]))) for i in range(0, len(nums)-1, 2)]
        ld.line(rpts, fill=GOLD + (255,), width=5 * SS, joint="curve")
        fn = font(SANS, 15)
        for i, (x, y) in enumerate(rpts, 1):
            r = 14 * SS
            ld.ellipse([x - r, y - r, x + r, y + r], fill=(22, 36, 26, 255), outline=(255, 255, 255, 255), width=3 * SS)
            ld.text((x, y), str(i), font=fn, fill=(255, 255, 255, 255), anchor="mm")
    else:
        pin = re.search(r'class="shape-pin" transform="translate\(([\d.]+) ([\d.]+)\)"', svg)
        if pin:
            x, y = T((float(pin.group(1)), float(pin.group(2)))); r = 10 * SS
            ld.ellipse([x - r, y - r, x + r, y + r], fill=(22, 36, 26, 255), outline=(255, 255, 255, 255), width=3 * SS)
    im = Image.alpha_composite(im, layer)
    d = ImageDraw.Draw(im)
    d.text((72 * SS, 86 * SS), "ALBERTO CASTELLANO MACÍAS", font=font(SANS, 22), fill=(215, 228, 205, 255))
    size = 124
    while size > 48 and d.textlength(name, font=font(SERIF, size)) > 540 * SS: size -= 4
    d.text((70 * SS, 300 * SS), name, font=font(SERIF, size), fill=(255, 255, 255, 255), anchor="ls")
    ks = 21
    while ks > 12 and d.textlength(kick.upper(), font=font(SANS, ks)) > 520 * SS: ks -= 1
    d.text((72 * SS, 352 * SS), kick.upper(), font=font(SANS, ks), fill=GOLD + (255,))
    if meta and not all(t.strip().lower() in kick.lower() for t in meta.split(" · ")): d.text((72 * SS, 392 * SS), meta.upper(), font=font(SANS, 17), fill=(200, 214, 192, 255))
    d.text((72 * SS, 570 * SS), "albercm30.github.io", font=font(SANS, 24), fill=(235, 242, 228, 255))
    out = ROOT / "assets/og" / ("es/" if lang == "es" else "") / ("countries-%s.jpg" % slug)
    im.convert("RGB").resize((W, H), Image.LANCZOS).save(out, quality=88, optimize=True, progressive=True)
    return out

if __name__ == "__main__":
    slugs = sys.argv[1:] or sorted(p.parent.name for p in (ROOT / "countries").glob("*/index.html"))
    for sl in slugs:
        for lang in ("en", "es"):
            o = make(sl, lang)
            print(sl, lang, "ok" if o else "skip")
