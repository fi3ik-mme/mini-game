#!/usr/bin/env node
/**
 * Generates high-detail satellite puzzle textures for European country puzzles:
 * stitched Esri World Imagery tiles + physical overlays (rivers, borders, graticule).
 *
 * Ukraine borders include Crimea as Ukrainian territory (internationally recognised;
 * temporarily occupied). Same ring logic as scripts/generate-ukraine-map.mjs.
 *
 * Output: games/geo-quest/assets/puzzles/{country}-phys.jpg
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
const CRIMEA_RING_CACHE = join(ROOT, "games/geo-quest/data/cache/ukraine-crimea-ring.json");

const DEFAULT_OUT_W = 720;
const DEFAULT_OUT_H = 960;

/** focusBounds: [lonMin, lonMax, latMin, latMax] — keep only mainland polygons. */
const COUNTRIES = {
    ukraine: {
        isoA2: "UA",
        adm0A3: "UKR",
        zoom: 8,
        pad: 1,
        fit: "cover",
        outW: 960,
        outH: 720,
    },
    france: {
        isoA2: "FR",
        adm0A3: "FRA",
        zoom: 8,
        pad: 1.08,
        focusBounds: [-5.5, 10.0, 41.0, 51.5],
        outline: {
            fill: [48, 220, 120, 70],
            glow: [255, 255, 255, 210],
            line: [255, 240, 60, 255],
            glowWidth: 6,
            lineWidth: 3,
        },
    },
    spain: {
        isoA2: "ES",
        adm0A3: "ESP",
        zoom: 8,
        pad: 1.08,
        focusBounds: [-9.5, 4.5, 36.0, 44.2],
    },
    sweden: {
        isoA2: "SE",
        adm0A3: "SWE",
        zoom: 7,
        pad: 1.08,
        focusBounds: [10.5, 24.5, 55.0, 69.5],
    },
    germany: { isoA2: "DE", adm0A3: "DEU", zoom: 8, pad: 1.08 },
};

const PYTHON = `#!/usr/bin/env python3
import json, math, sys, io
from pathlib import Path
from urllib.request import urlopen, Request
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageChops

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
    req = Request(url, headers={"User-Agent": "mini-game-puzzle-generator/1.0"})
    with urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")

def compute_cover_bounds(bounds, out_w, out_h, pad=1.08, fit="contain"):
    """contain: whole country visible; cover: country fills frame (may crop margins)."""
    lon_min, lon_max, lat_min, lat_max = bounds
    cx = (lon_min + lon_max) / 2
    cy = (lat_min + lat_max) / 2
    span_lon = lon_max - lon_min
    span_lat = lat_max - lat_min
    aspect = out_w / out_h
    cos_lat = max(math.cos(math.radians(cy)), 0.25)
    geo_aspect = span_lon / max(span_lat, 0.01) * cos_lat
    if fit == "cover":
        if geo_aspect > aspect:
            half_lat = span_lat / 2 * pad
            half_lon = half_lat * aspect / cos_lat
        else:
            half_lon = span_lon / 2 * pad
            half_lat = half_lon / aspect * cos_lat
    elif geo_aspect > aspect:
        half_lon = span_lon / 2 * pad
        half_lat = half_lon / aspect * cos_lat
    else:
        half_lat = span_lat / 2 * pad
        half_lon = half_lat * aspect / cos_lat
    return cx - half_lon, cx + half_lon, cy - half_lat, cy + half_lat

def stitch(view_bounds, zoom):
    lon_min, lon_max, lat_min, lat_max = view_bounds
    margin = 0.45
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
            px = (tx_i - x0) * TILE
            py = (ty_i - y0) * TILE
            canvas.paste(tile, (px, py))
    return canvas, x0, y0, zoom

def crop_view(img, x0_tile, y0_tile, view_bounds, zoom, out_w, out_h):
    clon_min, clon_max, clat_min, clat_max = view_bounds
    px1, py1 = lonlat_to_px(clon_min, clat_max, zoom)
    px2, py2 = lonlat_to_px(clon_max, clat_min, zoom)
    left = int(px1 - x0_tile * TILE)
    top = int(py1 - y0_tile * TILE)
    right = int(px2 - x0_tile * TILE)
    bottom = int(py2 - y0_tile * TILE)
    left = max(0, min(img.size[0] - 1, left))
    top = max(0, min(img.size[1] - 1, top))
    right = max(left + 1, min(img.size[0], right))
    bottom = max(top + 1, min(img.size[1], bottom))
    cropped = img.crop((left, top, right, bottom)).resize((out_w, out_h), Image.LANCZOS)
    # Safety: replace any unfilled edge pixels with ocean tone
    px = cropped.load()
    for j in range(out_h):
        for i in range(out_w):
            r, g, b = px[i, j]
            if r + g + b < 45:
                px[i, j] = SEA_RGB
    return cropped

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
    lon_min, lon_max, lat_min, lat_max = bounds
    tint = Image.new("RGB", (w, h))
    px = tint.load()
    for j in range(h):
        for i in range(w):
            lat = lat_max - (j / h) * (lat_max - lat_min)
            t = (lat - lat_min) / max(lat_max - lat_min, 0.01)
            r = int(34 + t * 110 + (1 - t) * 20)
            g = int(120 - t * 35 + (1 - t) * 40)
            b = int(55 - t * 20 + (1 - t) * 15)
            px[i, j] = (min(255, r), min(255, g), min(255, b))
    return tint

def country_matches(feat, cfg):
    p = feat.get("properties", {})
    iso = p.get("ISO_A2")
    if cfg.get("iso_a2") and iso not in (None, "-99") and iso == cfg["iso_a2"]:
        return True
    if cfg.get("adm0_a3") and p.get("ADM0_A3") == cfg["adm0_a3"]:
        return True
    return False

def ring_centroid(ring):
    lons = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    return sum(lons) / len(lons), sum(lats) / len(lats)

def ring_in_focus(ring, focus):
    if not focus:
        return True
    lon_min, lon_max, lat_min, lat_max = focus
    cx, cy = ring_centroid(ring)
    return lon_min <= cx <= lon_max and lat_min <= cy <= lat_max

def draw_ring_outline(draw, ring, view_bounds, w, h, style=None):
    style = style or {}
    fill = tuple(style.get("fill", [34, 197, 94, 36]))
    glow = tuple(style.get("glow", [255, 255, 255, 95]))
    line = tuple(style.get("line", [250, 204, 21, 230]))
    glow_w = style.get("glowWidth", 5)
    line_w = style.get("lineWidth", 2)
    pts = project_poly(ring, view_bounds, w, h)
    if len(pts) <= 2:
        return
    draw.polygon(pts, fill=fill)
    draw.line(pts + [pts[0]], fill=glow, width=glow_w)
    draw.line(pts + [pts[0]], fill=line, width=line_w)

def draw_country_outline(draw, feat, view_bounds, w, h, focus, style=None):
    style = style or {}
    fill = tuple(style.get("fill", [34, 197, 94, 36]))
    glow = tuple(style.get("glow", [255, 255, 255, 95]))
    line = tuple(style.get("line", [250, 204, 21, 230]))
    glow_w = style.get("glowWidth", 5)
    line_w = style.get("lineWidth", 2)
    for ring in rings(feat.get("geometry", {})):
        if not ring_in_focus(ring, focus):
            continue
        pts = project_poly(ring, view_bounds, w, h)
        if len(pts) <= 2:
            continue
        draw.polygon(pts, fill=fill)
        draw.line(pts + [pts[0]], fill=glow, width=glow_w)
        draw.line(pts + [pts[0]], fill=line, width=line_w)

def draw_overlays(base, cfg):
    w, h = base.size
    stitch_bounds = cfg["bounds"]
    pad = cfg.get("pad", 1.08)
    fit = cfg.get("fit", "contain")
    view_bounds = compute_cover_bounds(stitch_bounds, w, h, pad, fit)
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
    focus = cfg.get("focus_bounds")
    outline_style = cfg.get("outline")
    for feat in countries.get("features", []):
        if not country_matches(feat, cfg):
            continue
        draw_country_outline(draw, feat, view_bounds, w, h, focus, outline_style)

    for ring in cfg.get("extra_rings") or []:
        draw_ring_outline(draw, ring, view_bounds, w, h, outline_style)

    tint = hypsometric_tint(w, h, view_bounds)
    tinted = ImageChops.multiply(base, tint)
    base = Image.blend(base, tinted, 0.14)

    out = Image.alpha_composite(base.convert("RGBA"), overlay)
    return out.convert("RGB")

def main():
    cfg = json.loads(sys.argv[1])
    bounds = tuple(cfg["bounds"])
    pad = cfg.get("pad", 1.08)
    fit = cfg.get("fit", "contain")
    out_w, out_h = cfg["out_w"], cfg["out_h"]
    view_bounds = compute_cover_bounds(bounds, out_w, out_h, pad, fit)
    print(f"Stitching {cfg['id']} at z{cfg['zoom']}…")
    img, x0, y0, zoom = stitch(view_bounds, cfg["zoom"])
    print(f"  mosaic {img.size[0]}×{img.size[1]}")
    cropped = crop_view(img, x0, y0, view_bounds, zoom, out_w, out_h)
    cropped = enhance_satellite(cropped)
    final = draw_overlays(cropped, cfg)
    out_path = Path(cfg["out"])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(out_path, "JPEG", quality=88, optimize=True)
    print(f"Wrote {out_path} ({final.size[0]}×{final.size[1]})")

if __name__ == "__main__":
    main()
`;

function ringCentroid(ring) {
    let lon = 0;
    let lat = 0;
    for (const c of ring) {
        lon += c[0];
        lat += c[1];
    }
    return [lon / ring.length, lat / ring.length];
}

function ringInFocus(ring, focus) {
    if (!focus) return true;
    const [lonMin, lonMax, latMin, latMax] = focus;
    const [cx, cy] = ringCentroid(ring);
    return cx >= lonMin && cx <= lonMax && cy >= latMin && cy <= latMax;
}

function ringsFromGeometry(geom) {
    if (geom.type === "Polygon") return [geom.coordinates[0]];
    if (geom.type === "MultiPolygon") return geom.coordinates.map((p) => p[0]);
    return [];
}

function countryMatches(props, spec) {
    const iso = props.ISO_A2;
    if (spec.isoA2 && iso && iso !== "-99" && iso === spec.isoA2) return true;
    if (spec.adm0A3 && props.ADM0_A3 === spec.adm0A3) return true;
    return false;
}

function ringsAlreadyIncludeCrimea(rings) {
    for (const ring of rings) {
        let latMin = Infinity;
        for (const [, lat] of ring) {
            if (lat < latMin) latMin = lat;
        }
        if (latMin < 44.6 && ring.length > 80) return true;
    }
    return false;
}

/** Crimea peninsula ring — de jure part of Ukraine (see generate-ukraine-map.mjs). */
function crimeaRingFromRussia(geojson) {
    const ru = geojson.features.find((f) => f.properties?.ISO_A2 === "RU");
    if (!ru || ru.geometry.type !== "MultiPolygon") return null;
    for (const poly of ru.geometry.coordinates) {
        const ring = poly[0];
        let latMin = Infinity;
        let latMax = -Infinity;
        let lonMin = Infinity;
        let lonMax = -Infinity;
        for (const [lon, lat] of ring) {
            if (lat < latMin) latMin = lat;
            if (lat > latMax) latMax = lat;
            if (lon < lonMin) lonMin = lon;
            if (lon > lonMax) lonMax = lon;
        }
        if (
            latMin < 45.2 &&
            latMax > 44.3 &&
            lonMin > 32.2 &&
            lonMax < 37 &&
            latMax - latMin > 0.8 &&
            lonMax - lonMin > 2 &&
            ring.length > 80
        ) {
            return ring;
        }
    }
    return null;
}

function ensureCrimeaRing(geojson) {
    try {
        const cached = JSON.parse(readFileSync(CRIMEA_RING_CACHE, "utf8"));
        if (Array.isArray(cached.ring) && cached.ring.length > 50) return cached.ring;
    } catch {
        /* build cache below */
    }
    const ring = crimeaRingFromRussia(geojson);
    if (!ring) throw new Error("Crimea ring not found — cannot build Ukraine puzzle bounds");
    mkdirSync(dirname(CRIMEA_RING_CACHE), { recursive: true });
    writeFileSync(
        CRIMEA_RING_CACHE,
        JSON.stringify({
            comment: "Crimea as Ukrainian territory (internationally recognised). Coastline ring for map/puzzle rendering.",
            ring,
        }, null, 2),
    );
    return ring;
}

function ringsForCountry(spec, feat, geojson) {
    const rings = ringsFromGeometry(feat.geometry);
    const focus = spec.focusBounds || null;
    if (spec.adm0A3 === "UKR" && !ringsAlreadyIncludeCrimea(rings)) {
        const crimea = ensureCrimeaRing(geojson);
        rings.push(crimea);
    }
    if (!focus) return rings;
    return rings.filter((ring) => ringInFocus(ring, focus));
}

function computeBoundsFromGeo(spec, geojson) {
    const padDeg = 0.35;
    let lonMin = Infinity;
    let lonMax = -Infinity;
    let latMin = Infinity;
    let latMax = -Infinity;

    for (const feat of geojson.features) {
        if (!countryMatches(feat.properties, spec)) continue;
        for (const ring of ringsForCountry(spec, feat, geojson)) {
            for (const [lon, lat] of ring) {
                if (lon < lonMin) lonMin = lon;
                if (lon > lonMax) lonMax = lon;
                if (lat < latMin) latMin = lat;
                if (lat > latMax) latMax = lat;
            }
        }
    }

    if (!isFinite(lonMin)) {
        throw new Error("No geometry for " + spec.adm0A3);
    }

    return {
        lonMin: lonMin - padDeg,
        lonMax: lonMax + padDeg,
        latMin: latMin - padDeg,
        latMax: latMax + padDeg,
    };
}

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
    const only = process.argv[2] || null;
    await ensureGeoCache();
    const geojson = JSON.parse(readFileSync(NE_COUNTRIES, "utf8"));

    for (const [id, spec] of Object.entries(COUNTRIES)) {
        if (only && id !== only) continue;
        const bounds = computeBoundsFromGeo(spec, geojson);
        let extraRings = null;
        if (spec.adm0A3 === "UKR") {
            const uaFeat = geojson.features.find((f) => countryMatches(f.properties, spec));
            const baseRings = uaFeat ? ringsFromGeometry(uaFeat.geometry) : [];
            if (!ringsAlreadyIncludeCrimea(baseRings)) {
                extraRings = [ensureCrimeaRing(geojson)];
            }
        }
        console.log(
            id + " bounds:",
            bounds.lonMin.toFixed(2),
            bounds.lonMax.toFixed(2),
            bounds.latMin.toFixed(2),
            bounds.latMax.toFixed(2),
        );
        runPython({
            id,
            iso_a2: spec.isoA2,
            adm0_a3: spec.adm0A3,
            zoom: spec.zoom,
            pad: spec.pad || 1.08,
            fit: spec.fit || "contain",
            focus_bounds: spec.focusBounds || null,
            outline: spec.outline || null,
            extra_rings: extraRings,
            lon_min: bounds.lonMin,
            lon_max: bounds.lonMax,
            lat_min: bounds.latMin,
            lat_max: bounds.latMax,
            out_w: spec.outW || DEFAULT_OUT_W,
            out_h: spec.outH || DEFAULT_OUT_H,
            out: join(OUT_DIR, id + "-phys.jpg"),
            countries: NE_COUNTRIES,
            rivers: NE_RIVERS,
            bounds: [bounds.lonMin, bounds.lonMax, bounds.latMin, bounds.latMax],
        });
    }
    console.log("Done.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
