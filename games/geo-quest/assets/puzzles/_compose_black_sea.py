#!/usr/bin/env python3
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw

img_path = Path(sys.argv[1])
geo_path = Path(sys.argv[2])
out_path = img_path

W, H = 960, 720
LON_MIN, LON_MAX = 25.69, 42.31
LAT_MIN, LAT_MAX = 39, 48
STD_PAR = 43.5
ISO_CODES = ["UA","RO","BG","TR","GE","RU","MD"]
COS_STD = math.cos(math.radians(STD_PAR))
LON_SPAN = (LON_MAX - LON_MIN) * COS_STD

def project(lon, lat):
    x = W * ((lon - LON_MIN) * COS_STD) / LON_SPAN
    y = H * (LAT_MAX - lat) / (LAT_MAX - LAT_MIN)
    return x, y

def in_view(lon, lat):
    return LON_MIN - 0.5 <= lon <= LON_MAX + 0.5 and LAT_MIN - 0.5 <= lat <= LAT_MAX + 0.5

def draw_ring(draw, ring):
    pts = []
    for lon, lat in ring:
        if not in_view(lon, lat):
            continue
        pts.append(project(lon, lat))
    if len(pts) < 2:
        return
    draw.line(pts, fill=(250, 204, 21, 240), width=3, joint="curve")

def walk_coords(draw, geom):
    t = geom.get("type")
    coords = geom.get("coordinates")
    if not coords:
        return
    if t == "Polygon":
        for ring in coords:
            draw_ring(draw, ring)
    elif t == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                draw_ring(draw, ring)

data = json.loads(geo_path.read_text())
img = Image.open(img_path).convert("RGBA")
overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

for feat in data.get("features", []):
    props = feat.get("properties") or {}
    iso = props.get("ISO_A2") or props.get("iso_a2")
    if iso not in ISO_CODES:
        continue
    walk_coords(draw, feat.get("geometry") or {})

# faint land tint along coasts
land = Image.new("RGBA", img.size, (0, 0, 0, 0))
land_draw = ImageDraw.Draw(land)
for feat in data.get("features", []):
    props = feat.get("properties") or {}
    iso = props.get("ISO_A2") or props.get("iso_a2")
    if iso not in ISO_CODES:
        continue
    geom = feat.get("geometry") or {}
    t = geom.get("type")
    coords = geom.get("coordinates")
    if t == "Polygon":
        polys = [coords]
    elif t == "MultiPolygon":
        polys = coords
    else:
        continue
    for poly in polys:
        for ring in poly:
            pts = [project(lon, lat) for lon, lat in ring if in_view(lon, lat)]
            if len(pts) >= 3:
                land_draw.polygon(pts, fill=(34, 197, 94, 28))

out = Image.alpha_composite(img, land)
out = Image.alpha_composite(out, overlay)
out.convert("RGB").save(out_path, quality=88, optimize=True)
print(f"Wrote {out_path}")
