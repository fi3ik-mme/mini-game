#!/usr/bin/env node
/**
 * High-resolution Ukraine travel-map background (satellite + rivers).
 * Uses the same Web Mercator projection as ukraine-travel.json so borders align with the SVG contour.
 *
 * Output: games/geo-quest/assets/ukraine-terrain.jpg (2000×1560, 2× viewBox)
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { UKRAINE_PROJ } from "./lib/ukraine-map-projection.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "games/geo-quest/assets/ukraine-terrain.jpg");
const NE_RIVERS = join(ROOT, "games/geo-quest/data/cache/ne_10m_rivers.geojson");
const NE_RIVERS_URL =
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson";

const OUT_W = 2000;
const OUT_H = 1560;
const ZOOM = 9;

const PYTHON = `#!/usr/bin/env python3
import json, math, sys, io
from pathlib import Path
from urllib.request import urlopen, Request
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

TILE = 256
TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
SEA_RGB = (26, 71, 110)

def lonlat_to_px(lon, lat, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n * TILE
    lat_r = math.radians(lat)
    y = (1.0 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2.0 * n * TILE
    return x, y

def fetch_tile(z, y, x):
    url = TILE_URL.format(z=z, y=y, x=x)
    req = Request(url, headers={"User-Agent": "mini-game-ukraine-terrain/1.0"})
    with urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")

def stitch(view_bounds, zoom):
    lon_min, lon_max, lat_min, lat_max = view_bounds
    margin = 0.35
    lon_min -= margin
    lon_max += margin
    lat_min -= margin
    lat_max += margin
    n = 2 ** zoom
    x0 = int((lon_min + 180) / 360 * n)
    x1 = int((lon_max + 180) / 360 * n)
    def ty(lat):
        lat_r = math.radians(lat)
        return int((1 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2 * n)
    y0 = ty(lat_max)
    y1 = ty(lat_min)
    w = (x1 - x0 + 1) * TILE
    h = (y1 - y0 + 1) * TILE
    canvas = Image.new("RGB", (w, h), SEA_RGB)
    for ty_i in range(y0, y1 + 1):
        for tx_i in range(x0, x1 + 1):
            try:
                tile = fetch_tile(zoom, ty_i, tx_i)
            except Exception as e:
                print(f"  tile {zoom}/{ty_i}/{tx_i} failed: {e}", file=sys.stderr)
                continue
            canvas.paste(tile, ((tx_i - x0) * TILE, (ty_i - y0) * TILE))
    return canvas, x0, y0, zoom

def merc_y(lat):
    lat_r = math.radians(lat)
    return math.log(math.tan(math.pi / 4 + lat_r / 2))

def inverse_project(ix, iy, cfg):
    lon_min, lon_max = cfg["lon_min"], cfg["lon_max"]
    lat_min, lat_max = cfg["lat_min"], cfg["lat_max"]
    out_w, out_h, pad = cfg["out_w"], cfg["out_h"], cfg["pad"]
    inner_w = out_w - 2 * pad
    inner_h = out_h - 2 * pad
    lon = lon_min + (ix - pad) / inner_w * (lon_max - lon_min)
    merc_n = merc_y(lat_max)
    merc_s = merc_y(lat_min)
    merc = merc_n - (iy - pad) / inner_h * (merc_n - merc_s)
    lat = math.degrees(2 * math.atan(math.exp(merc)) - math.pi / 2)
    return lon, lat

def sample_bilinear(img, sx, sy):
    w, h = img.size
    if sx < 0 or sy < 0 or sx >= w - 1 or sy >= h - 1:
        return None
    x0 = int(sx)
    y0 = int(sy)
    fx = sx - x0
    fy = sy - y0
    p00 = img.getpixel((x0, y0))
    p10 = img.getpixel((x0 + 1, y0))
    p01 = img.getpixel((x0, y0 + 1))
    p11 = img.getpixel((x0 + 1, y0 + 1))
    out = []
    for c in range(3):
        top = p00[c] * (1 - fx) + p10[c] * fx
        bot = p01[c] * (1 - fx) + p11[c] * fx
        out.append(int(top * (1 - fy) + bot * fy))
    return tuple(out)

def reproject_to_map_space(mosaic, x0_tile, y0_tile, zoom, cfg):
    out_w, out_h = cfg["out_w"], cfg["out_h"]
    origin_x = x0_tile * TILE
    origin_y = y0_tile * TILE
    out = Image.new("RGB", (out_w, out_h), SEA_RGB)
    px = out.load()
    step = 1
    for j in range(0, out_h, step):
        for i in range(0, out_w, step):
            lon, lat = inverse_project(i + 0.5, j + 0.5, cfg)
            mx, my = lonlat_to_px(lon, lat, zoom)
            sx = mx - origin_x
            sy = my - origin_y
            rgb = sample_bilinear(mosaic, sx, sy)
            if rgb is None:
                continue
            if step == 1:
                px[i, j] = rgb
            else:
                for jj in range(j, min(out_h, j + step)):
                    for ii in range(i, min(out_w, i + step)):
                        px[ii, jj] = rgb
    return out

def project(lon, lat, cfg):
    lon_min, lon_max = cfg["lon_min"], cfg["lon_max"]
    lat_min, lat_max = cfg["lat_min"], cfg["lat_max"]
    out_w, out_h, pad = cfg["out_w"], cfg["out_h"], cfg["pad"]
    inner_w = out_w - 2 * pad
    inner_h = out_h - 2 * pad
    merc_n = merc_y(lat_max)
    merc_s = merc_y(lat_min)
    x = (lon - lon_min) / (lon_max - lon_min) * inner_w + pad
    y = (merc_n - merc_y(lat)) / (merc_n - merc_s) * inner_h + pad
    return x, y

def lines(geom):
    if geom["type"] == "LineString":
        return [geom["coordinates"]]
    if geom["type"] == "MultiLineString":
        return geom["coordinates"]
    return []

def clip_line(line, cfg, min_pts=2):
    lon_min, lon_max = cfg["lon_min"], cfg["lon_max"]
    lat_min, lat_max = cfg["lat_min"], cfg["lat_max"]
    out = []
    for lon, lat in line:
        if lon_min - 0.5 <= lon <= lon_max + 0.5 and lat_min - 0.5 <= lat <= lat_max + 0.5:
            out.append((lon, lat))
    return out if len(out) >= min_pts else []

def draw_rivers(base, cfg):
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    rivers = json.loads(Path(cfg["rivers"]).read_text())
    scale = cfg["out_w"] / 1000.0
    w_main = max(2, int(3.2 * scale))
    w_branch = max(1, int(1.8 * scale))
    for feat in rivers.get("features", []):
        name = (feat.get("properties", {}).get("name") or "") + (feat.get("properties", {}).get("name_en") or "")
        is_major = bool(__import__("re").search(
            r"Dnieper|Dnipro|Dnepr|Dniester|Dniester|Danube|Donets|Desna|Pripyat|Southern Bug|Inhul",
            name, __import__("re").I))
        width = w_main if is_major else w_branch
        for line in lines(feat.get("geometry", {})):
            clipped = clip_line(line, cfg)
            if len(clipped) < 2:
                continue
            pts = [project(lon, lat, cfg) for lon, lat in clipped]
            if len(pts) < 2:
                continue
            draw.line(pts, fill=(14, 116, 144, 120), width=width + 2)
            draw.line(pts, fill=(125, 211, 252, 200), width=width)
    return Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")

def enhance(img):
    img = ImageEnhance.Contrast(img).enhance(1.14)
    img = ImageEnhance.Color(img).enhance(1.18)
    img = ImageEnhance.Brightness(img).enhance(1.04)
    img = ImageEnhance.Sharpness(img).enhance(1.35)
    return img.filter(ImageFilter.UnsharpMask(radius=1.4, percent=120, threshold=2))

def main():
    cfg = json.loads(sys.argv[1])
    bounds = (cfg["lon_min"], cfg["lon_max"], cfg["lat_min"], cfg["lat_max"])
    print(f"Stitching Ukraine terrain z{cfg['zoom']}…")
    img, x0, y0, zoom = stitch(bounds, cfg["zoom"])
    print(f"  mosaic {img.size[0]}×{img.size[1]}")
    print("  reprojecting to map space (Web Mercator)…")
    cropped = reproject_to_map_space(img, x0, y0, zoom, cfg)
    cropped = enhance(cropped)
    final = draw_rivers(cropped, cfg)
    out = Path(cfg["out"])
    out.parent.mkdir(parents=True, exist_ok=True)
    final.save(out, "JPEG", quality=92, optimize=True, progressive=True)
    print(f"Wrote {out} ({final.size[0]}×{final.size[1]})")

if __name__ == "__main__":
    main()
`;

async function ensureRiversCache() {
    mkdirSync(dirname(NE_RIVERS), { recursive: true });
    try {
        readFileSync(NE_RIVERS);
    } catch {
        console.log("Fetching rivers GeoJSON…");
        const res = await fetch(NE_RIVERS_URL);
        if (!res.ok) throw new Error("Rivers fetch failed");
        writeFileSync(NE_RIVERS, await res.text());
    }
}

function runPython(cfg) {
    const pyPath = join(ROOT, "games/geo-quest/assets/_bake_ukraine_terrain.py");
    writeFileSync(pyPath, PYTHON);
    const r = spawnSync("python3", [pyPath, JSON.stringify(cfg)], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("Terrain bake failed");
}

async function main() {
    await ensureRiversCache();
    runPython({
        lon_min: UKRAINE_PROJ.lonMin,
        lon_max: UKRAINE_PROJ.lonMax,
        lat_min: UKRAINE_PROJ.latMin,
        lat_max: UKRAINE_PROJ.latMax,
        pad: UKRAINE_PROJ.pad,
        out_w: OUT_W,
        out_h: OUT_H,
        zoom: ZOOM,
        rivers: NE_RIVERS,
        out: OUT_PATH,
    });
    console.log("Done.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
