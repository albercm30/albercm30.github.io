# -*- coding: utf-8 -*-
"""Regenerate the country outline shown in the country hero (the <!--shape--> block inside .hero-shape).

Usage: python scripts/build_shapes.py path/to/ne_10m_admin_0_countries.geojson
(Natural Earth, public domain: https://github.com/nvkelso/natural-earth-vector/tree/master/geojson)
Re-running replaces the section between <!--shape--> and <!--/shape-->. Run build_es.py afterwards.
"""
import json, math, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
A3 = {"china":"CHN","india":"IND","japan":"JPN","jordan":"JOR","kazakhstan":"KAZ","kuwait":"KWT","malaysia":"MYS","oman":"OMN",
"morocco":"MAR","philippines":"PHL","singapore":"SGP","sri-lanka":"LKA","thailand":"THA","turkey":"TUR","united-arab-emirates":"ARE",
"uzbekistan":"UZB","vietnam":"VNM","austria":"AUT","belgium":"BEL","bulgaria":"BGR","croatia":"HRV","france":"FRA","germany":"DEU",
"hungary":"HUN","italy":"ITA","monaco":"MCO","netherlands":"NLD","poland":"POL","slovakia":"SVK","spain":"ESP","uk":"GBR",
"vatican":"VAT","canada":"CAN","guatemala":"GTM","mexico":"MEX","usa":"USA","australia":"AUS","new-zealand":"NZL"}
# Spain's page is about the Canary Islands (Gran Canaria, Teide), so draw those.
ONLY_BOX = {"spain": (-19, 27, -13, 30)}
HEADING = {"spain": "the Canaries."}
W, H, PAD = 600, 520, 46

def laea(lon, lat, lon0, lat0):
    l, p, l0, p0 = map(math.radians, (lon, lat, lon0, lat0))
    dl = l - l0
    k = math.sqrt(2 / (1 + math.sin(p0)*math.sin(p) + math.cos(p0)*math.cos(p)*math.cos(dl)))
    return 6371*k*math.cos(p)*math.sin(dl), 6371*k*(math.cos(p0)*math.sin(p) - math.sin(p0)*math.cos(p)*math.cos(dl))

def area(ring):
    return abs(sum(ring[i][0]*ring[(i+1) % len(ring)][1] - ring[(i+1) % len(ring)][0]*ring[i][1] for i in range(len(ring))))/2

def dp(pts, tol):
    if len(pts) < 4: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts)-1)]
    while stack:
        a, b = stack.pop(); (x1, y1), (x2, y2) = pts[a], pts[b]; dx, dy = x2-x1, y2-y1; n = math.hypot(dx, dy) or 1e-9
        best, bi = 0, None
        for i in range(a+1, b):
            d = abs(dy*pts[i][0] - dx*pts[i][1] + x2*y1 - y2*x1)/n
            if d > best: best, bi = d, i
        if bi is not None and best > tol: keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def dp_ring(pts, tol):
    # closed ring: split at the point farthest from the start so Douglas-Peucker has a real baseline
    pts = pts[:-1] if pts[0] == pts[-1] else pts
    if len(pts) < 5: return pts
    k = max(range(len(pts)), key=lambda i: math.hypot(pts[i][0]-pts[0][0], pts[i][1]-pts[0][1]))
    return dp(pts[:k+1], tol)[:-1] + dp(pts[k:]+[pts[0]], tol)[:-1]

def centroid(ring): return (sum(p[0] for p in ring)/len(ring), sum(p[1] for p in ring)/len(ring))

def shape(slug, feat, coords):
    g = feat["geometry"]
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    rings = [p[0] for p in polys]
    if slug in ONLY_BOX:
        x0, y0, x1, y1 = ONLY_BOX[slug]
        rings = [r for r in rings if x0 <= centroid(r)[0] <= x1 and y0 <= centroid(r)[1] <= y1]
    big = max(rings, key=lambda r: area([laea(x, y, centroid(r)[0], centroid(r)[1]) for x, y in r]))
    cx, cy = centroid(big)
    ar = [area([laea(x, y, cx, cy) for x, y in r]) for r in rings]
    total = sum(ar)
    keep = []
    for r, a in zip(rings, ar):
        rc = centroid(r)
        near = max(abs(rc[1]-cy), abs(rc[0]-cx)*math.cos(math.radians(cy))) <= 35
        if slug in ONLY_BOX or (near and a >= 0.004*total) or r is big: keep.append(r)
    xs = [x for r in keep for x, _ in r]; ys = [y for r in keep for _, y in r]
    lon0, lat0 = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2
    proj = [[laea(x, y, lon0, lat0) for x, y in r] for r in keep]
    px = [p[0] for r in proj for p in r]; py = [p[1] for r in proj for p in r]
    w, h = max(px)-min(px), max(py)-min(py); s = min((W-2*PAD)/w, (H-2*PAD)/h)
    ox = (W-w*s)/2 - min(px)*s; oy = (H-h*s)/2 + max(py)*s
    T = lambda p: (p[0]*s+ox, oy-p[1]*s)
    d = []
    for r in proj:
        pts = dp_ring([T(p) for p in r], 0.9)
        if len(pts) >= 3: d.append("M"+"L".join("%.1f %.1f" % p for p in pts)+"Z")
    # graticule crosses
    lonspan = (max(x for r in keep for x, _ in r)-min(x for r in keep for x, _ in r)); latspan = (max(y for r in keep for _, y in r)-min(y for r in keep for _, y in r))
    span = max(lonspan, latspan)
    step = next(st for st in (.25, .5, 1, 2, 5, 10, 20) if span/st <= 7) if span < 70 else 20
    x0g, x1g = lon0-W/s/100, lon0+W/s/100  # coarse bounds, filtered by viewBox below
    cross = []
    lat_c = round(lat0/step)*step; lon_c = round(lon0/step)*step
    for i in range(-30, 31):
        for j in range(-30, 31):
            lo, la = lon_c+i*step, lat_c+j*step
            if abs(la) > 85: continue
            x, y = T(laea(lo, la, lon0, lat0))
            if 14 < x < W-14 and 14 < y < H-14: cross.append("M%.1f %.1fh6M%.1f %.1fv6" % (x-3, y, x, y-3))
    pin = None
    m = re.match(r"\s*(-?[\d.]+)°([NS]),\s*(-?[\d.]+)°([EW])", coords or "")
    if m:
        la = float(m.group(1))*(1 if m.group(2) == "N" else -1); lo = float(m.group(3))*(1 if m.group(4) == "E" else -1)
        pin = T(laea(lo, la, lon0, lat0))
        if not (6 < pin[0] < W-6 and 6 < pin[1] < H-6): pin = None
        if slug in ONLY_BOX: pin = None
    return "".join(d), "".join(cross), pin, (lambda lo, la: T(laea(lo, la, lon0, lat0))), (W, H)

def route_svg(slug, names, stops, Tf):
    pts = [(n, Tf(stops[n][1], stops[n][0])) for n in names if n in stops]
    if len(pts) < 2: return ''
    xs = [p[1][0] for p in pts]; ys = [p[1][1] for p in pts]
    import itertools
    md = min([math.hypot(p[1][0]-q[1][0], p[1][1]-q[1][1]) for p, q in itertools.combinations(pts, 2)] or [99])
    r = 13 if md >= 34 else max(4.5, md*0.36)      # shrink the markers when stops sit close together
    small = r < 10
    d = 'M' + 'L'.join('%.1f %.1f' % p[1] for p in pts)
    g = ''.join('<g class="route-stop%s" transform="translate(%.1f %.1f)"><title>%s</title><circle r="%.1f"/>%s</g>' % (' sm' if small else '', x, y, n.replace('&', '&amp;'), r, '' if small else '<text y="4.6">%d</text>' % i) for i, (n, (x, y)) in enumerate(pts, 1))
    return '<path class="route-path%s" pathLength="1" d="%s"/>%s' % (' thin' if small else '', d, g)

def svg(path, cross, pin, route=''):
    p = '<path class="shape-line" pathLength="1" d="%s"/>' % path
    s = ('<svg class="shape-svg" viewBox="0 0 %d %d" aria-hidden="true" focusable="false"><defs>'
         '<linearGradient id="shp-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--green)"/><stop offset="1" style="stop-color:var(--green2)"/></linearGradient>'
         '<pattern id="shp-h" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#fff" stroke-opacity=".16" stroke-width="1.2"/></pattern></defs>'
         '<path class="shape-grid" d="%s"/>'
         '<path class="shape-shadow" transform="translate(7 9)" d="%s"/>'
         '<path class="shape-fill" d="%s"/><path class="shape-hatch" d="%s"/>%s') % (W, H, cross, path, path, path, p)
    s += route
    if pin and not route: s += '<g class="shape-pin" transform="translate(%.1f %.1f)"><circle class="pulse" r="6"/><circle class="dot" r="4.2"/></g>' % pin
    return s + '</svg>'

STOPS = json.load(open(ROOT/'data/stops.json'))
ONLY = set(sys.argv[2:])

def main(geo_path):
    geo = json.load(open(geo_path)); by = {}
    for f in geo["features"]: by.setdefault(f["properties"]["ADM0_A3"], f)
    data = json.load(open(ROOT/"data/countries.json"))
    for c in data:
        slug = c["slug"]; page = ROOT/"countries"/slug/"index.html"
        if slug not in A3 or A3[slug] not in by or not page.exists(): print("skip", slug); continue
        if ONLY and slug not in ONLY: continue
        path, cross, pin, Tf, _ = shape(slug, by[A3[slug]], c.get("coords"))
        route = route_svg(slug, c.get('route', []), STOPS.get(slug, {}), Tf) if slug in STOPS else ''
        h = page.read_text(encoding="utf-8")
        svgx = svg(path, cross, pin, route)
        if "<!--shape-->" in h:
            h = re.sub(r"<!--shape-->.*?<!--/shape-->", lambda m: "<!--shape-->"+svgx+"<!--/shape-->", h, count=1, flags=re.S)
        else:
            print("no hero-shape block in", slug)
        page.write_text(h, encoding="utf-8"); print(slug, len(path)//1000, "kB")

if __name__ == "__main__": main(sys.argv[1])
