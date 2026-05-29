#!/usr/bin/env node
/**
 * Generates high-detail satellite puzzle textures for Ukraine and France:
 * stitched Esri World Imagery tiles + schematic physical overlays (rivers,
 * borders, hypsometric tint, graticule).
 *
 * Output: games/geo-quest/assets/puzzles/{ukraine,france}-phys.jpg
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "games/geo-quest/assets/puzzles");
const NE_COUNTRIES = join(ROOT, "games/geo-quest/data/cache/ne_10m_countries.geojson");
const NE_RIVERS = join(ROOT, "games/geo-quest/data/cache/ne_10m_rivers.geojson");
const MAP_EUROPE = join(ROOT, "games/geo-quest/data/maps/europe-countries.json");
const MAP_UKRAINE = join(ROOT, "games/geo-quest/data/maps/ukraine-travel.json");

const OUT_W = 720;
const OUT_H = 960;

const COUNTRIES = {
    ukraine: {
        isoA2: "UA",
        zoom: 8,
        /** Cover crop bounds (WGS84) — slightly wider than country for puzzle fill. */
        lonMin: 21.8,
        lonMax: 40.8,
        latMin: 43.8,
        latMax: 52.6,
        mapFile: MAP_UKRAINE,
        countryId: "ukraine",
    },
    france: {
        isoA2: "FR",
        zoom: 8,
        lonMin: -5.4,
        lonMax: 9.8,
        latMin: 41.0,
        latMax: 51.4,
        mapFile: MAP_EUROPE,
        countryId: "france",
    },
};

const PYTHON = `#!/usr/bin/env python3
import json, math, sys, io
from pathlib import Path
from urllib.request import urlopen, Request
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageChops

TILE = 256
TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

def lonlat_to_px(lon, lat, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n * TILE
    lat_r = math.radians(lat)
    y = (1.0 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2.0 * n * TILE
    return x, y

def fetch_tile(z, y, x):
    url = TILE_URL.format(z=z, y=y, x=x)
    req = Request(url, headers={"User-Agent": "mini-game-puzzle-generator/1.0"})
    with urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")

def compute_cover_bounds(bounds, out_w, out_h):
    lon_min, lon_max, lat_min, lat_max = bounds
    cx = (lon_min + lon_max) / 2
    cy = (lat_min + lat_max) / 2
    span_lon = lon_max - lon_min
    span_lat = lat_max - lat_min
    aspect = out_w / out_h
    geo_aspect = span_lon / max(span_lat, 0.01) * math.cos(math.radians(cy))
    if geo_aspect > aspect:
        half_lat = span_lat / 2 * 1.02
        half_lon = half_lat * aspect / max(math.cos(math.radians(cy)), 0.25)
    else:
        half_lon = span_lon / 2 * 1.02
        half_lat = half_lon / aspect * math.cos(math.radians(cy))
    return cx - half_lon, cx + half_lon, cy - half_lat, cy + half_lat

def stitch(bounds, zoom):
    lon_min, lon_max, lat_min, lat_max = bounds
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
    canvas = Image.new("RGB", (w, h), (20, 40, 60))
    for ty_i in range(y0, y1 + 1):
        for tx_i in range(x0, x1 + 1):
            try:
                tile = fetch_tile(zoom, ty_i, tx_i)
            except Exception as e:
                print(f"  tile {zoom}/{ty_i}/{tx_i} failed: {e}", file=sys.stderr)
                continue
            px = (tx_i - x0) * TILE
            py = (ty_i - y0) * TILE
            canvas.paste(tile, (px, py))
    return canvas, x0, y0, zoom

def crop_cover(img, x0_tile, y0_tile, bounds, zoom, out_w, out_h):
    clon_min, clon_max, clat_min, clat_max = compute_cover_bounds(bounds, out_w, out_h)
    px1, py1 = lonlat_to_px(clon_min, clat_max, zoom)
    px2, py2 = lonlat_to_px(clon_max, clat_min, zoom)
    left = int(px1 - x0_tile * TILE)
    top = int(py1 - y0_tile * TILE)
    right = int(px2 - x0_tile * TILE)
    bottom = int(py2 - y0_tile * TILE)
    return img.crop((left, top, right, bottom)).resize((out_w, out_h), Image.LANCZOS)

def rings(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon":
        return [p[0] for p in geom["coordinates"]]
    return []

def lines(geom):
    if geom["type"] == "LineString":
        return [geom["coordinates"]]
    if geom["type"] == "MultiLineString":
        return geom["coordinates"]
    return []

def in_bbox(lon, lat, b):
    return b[0] <= lon <= b[1] and b[2] <= lat <= b[3]

def project_poly(coords, view_bounds, out_w, out_h):
    clon_min, clon_max, clat_min, clat_max = view_bounds

    def to_xy(lon, lat):
        u = (lon - clon_min) / (clon_max - clon_min)
        v = (clat_max - lat) / (clat_max - clat_min)
        return u * out_w, v * out_h

    return [to_xy(lon, lat) for lon, lat in coords]

def enhance_satellite(img):
    img = ImageEnhance.Contrast(img).enhance(1.08)
    img = ImageEnhance.Color(img).enhance(1.12)
    img = ImageEnhance.Brightness(img).enhance(1.03)
    return img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=85, threshold=3))

def hypsometric_tint(w, h, bounds):
    """Schematic physical tint: greener lowlands, warmer highlands."""
    lon_min, lon_max, lat_min, lat_max = bounds
    tint = Image.new("RGB", (w, h))
    px = tint.load()
    for j in range(h):
        for i in range(w):
            lat = lat_max - (j / h) * (lat_max - lat_min)
            t = (lat - lat_min) / max(lat_max - lat_min, 0.01)
            # low: marsh green, mid: forest, high: brown rock
            r = int(34 + t * 110 + (1 - t) * 20)
            g = int(120 - t * 35 + (1 - t) * 40)
            b = int(55 - t * 20 + (1 - t) * 15)
            px[i, j] = (min(255, r), min(255, g), min(255, b))
    return tint

def draw_overlays(base, cfg):
    w, h = base.size
    stitch_bounds = cfg["bounds"]
    view_bounds = compute_cover_bounds(stitch_bounds, w, h)
    zoom = cfg["zoom"]
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    clon_min, clon_max, clat_min, clat_max = view_bounds
    step = 2 if (clon_max - clon_min) > 25 else 1
    lat_step = 2
    lon = math.ceil(clon_min / step) * step
    while lon <= clon_max:
        pts = project_poly([(lon, clat_min), (lon, clat_max)], view_bounds, w, h)
        draw.line(pts, fill=(255, 255, 255, 38), width=1)
        lon += step
    lat = math.ceil(clat_min / lat_step) * lat_step
    while lat <= clat_max:
        pts = project_poly([(clon_min, lat), (clon_max, lat)], view_bounds, w, h)
        draw.line(pts, fill=(255, 255, 255, 38), width=1)
        lat += lat_step

    rivers = json.loads(Path(cfg["rivers"]).read_text())
    for feat in rivers.get("features", []):
        for line in lines(feat.get("geometry", {})):
            clipped = [(lon, lat) for lon, lat in line
                       if clon_min - 1 <= lon <= clon_max + 1 and clat_min - 1 <= lat <= clat_max + 1]
            if len(clipped) < 2:
                continue
            pts = project_poly(clipped, view_bounds, w, h)
            draw.line(pts, fill=(56, 189, 248, 175), width=2)
            draw.line(pts, fill=(14, 116, 144, 90), width=4)

    countries = json.loads(Path(cfg["countries"]).read_text())
    for feat in countries.get("features", []):
        if feat.get("properties", {}).get("ISO_A2") != cfg["iso_a2"]:
            continue
        for ring in rings(feat.get("geometry", {})):
            pts = project_poly(ring, view_bounds, w, h)
            if len(pts) > 2:
                draw.line(pts + [pts[0]], fill=(250, 204, 21, 230), width=3)
                draw.line(pts + [pts[0]], fill=(255, 255, 255, 80), width=5)

    tint = hypsometric_tint(w, h, view_bounds)
    tinted = ImageChops.multiply(base, tint)
    base = Image.blend(base, tinted, 0.14)

    out = Image.alpha_composite(base.convert("RGBA"), overlay)
    return out.convert("RGB")

def main():
    cfg = json.loads(sys.argv[1])
    bounds = (cfg["lon_min"], cfg["lon_max"], cfg["lat_min"], cfg["lat_max"])
    print(f"Stitching {cfg['id']} at z{cfg['zoom']}…")
    img, x0, y0, zoom = stitch(bounds, cfg["zoom"])
    print(f"  mosaic {img.size[0]}×{img.size[1]}")
    cropped = crop_cover(img, x0, y0, bounds, zoom, cfg["out_w"], cfg["out_h"])
    cropped = enhance_satellite(cropped)
    final = draw_overlays(cropped, cfg)
    out_path = Path(cfg["out"])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(out_path, "JPEG", quality=88, optimize=True)
    print(f"Wrote {out_path} ({final.size[0]}×{final.size[1]})")

if __name__ == "__main__":
    main()
`;

async function ensureGeoCache() {
    const urls = [
        ["https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson", NE_COUNTRIES],
        ["https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson", NE_RIVERS],
    ];
    mkdirSync(dirname(NE_COUNTRIES), { recursive: true });
    for (const [url, path] of urls) {
        try {
            readFileSync(path);
        } catch {
            console.log("Fetching", url);
            const res = await fetch(url);
            if (!res.ok) throw new Error("Fetch failed: " + url);
            writeFileSync(path, await res.text());
        }
    }
}

function runPython(cfg) {
    const pyPath = join(OUT_DIR, "_compose_puzzle.py");
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(pyPath, PYTHON);
    const args = [pyPath, JSON.stringify(cfg)];
    const r = spawnSync("python3", args, { stdio: "inherit", encoding: "utf8" });
    if (r.status !== 0) throw new Error("Python compositor failed for " + cfg.id);
}

async function main() {
    await ensureGeoCache();
    for (const [id, spec] of Object.entries(COUNTRIES)) {
        runPython({
            id,
            iso_a2: spec.isoA2,
            zoom: spec.zoom,
            lon_min: spec.lonMin,
            lon_max: spec.lonMax,
            lat_min: spec.latMin,
            lat_max: spec.latMax,
            out_w: OUT_W,
            out_h: OUT_H,
            out: join(OUT_DIR, id + "-phys.jpg"),
            countries: NE_COUNTRIES,
            rivers: NE_RIVERS,
            map_file: spec.mapFile,
            bounds: [spec.lonMin, spec.lonMax, spec.latMin, spec.latMax],
        });
    }
    console.log("Done.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
