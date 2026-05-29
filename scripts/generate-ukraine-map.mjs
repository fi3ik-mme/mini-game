#!/usr/bin/env node
/**
 * Builds games/geo-quest/data/maps/ukraine-travel.json — Ukraine travel map with
 * regional earth texture, neighbor countries, geo markers, and zoom support.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NE_URL =
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";
const NE_RIVERS_URL =
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson";

const VIEW_W = 1000;
const VIEW_H = 780;
const PAD = 28;
const MARKER_PAD = 72;

/** Expanded view to show neighboring countries around Ukraine. */
const PROJ = {
    lonMin: 19,
    lonMax: 42.5,
    latMin: 43.5,
    latMax: 54.5,
    width: VIEW_W,
    height: VIEW_H,
};

function project(lon, lat) {
    const { lonMin, lonMax, latMin, latMax } = PROJ;
    const x = ((lon - lonMin) / (lonMax - lonMin)) * (VIEW_W - PAD * 2) + PAD;
    const y = ((latMax - lat) / (latMax - latMin)) * (VIEW_H - PAD * 2) + PAD;
    return [x, y];
}

function ringsFromGeometry(geom) {
    if (geom.type === "Polygon") return [geom.coordinates[0]];
    if (geom.type === "MultiPolygon") return geom.coordinates.map((p) => p[0]);
    return [];
}

function crimeaRingFromRussia(geo) {
    const ru = geo.features.find((f) => f.properties?.ISO_A2 === "RU");
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
        const latSpan = latMax - latMin;
        const lonSpan = lonMax - lonMin;
        if (
            latMin < 45.2 &&
            latMax > 44.3 &&
            lonMin > 32.2 &&
            lonMax < 37 &&
            latSpan > 0.8 &&
            lonSpan > 2 &&
            ring.length > 80
        ) {
            return ring;
        }
    }
    return null;
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

function ringToPath(ring) {
    if (!ring.length) return "";
    const pts = ring.map(([lon, lat]) => project(lon, lat));
    let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) {
        d += " L" + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1);
    }
    return d + " Z";
}

function simplifyRing(ring, maxPoints = 360) {
    if (ring.length <= maxPoints) return ring;
    const step = Math.ceil(ring.length / maxPoints);
    const out = [];
    for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
    const last = ring[ring.length - 1];
    const tail = out[out.length - 1];
    if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
    return out;
}

function linesFromGeometry(geom) {
    if (geom.type === "LineString") return [geom.coordinates];
    if (geom.type === "MultiLineString") return geom.coordinates;
    return [];
}

function lineToPath(line) {
    if (!line.length) return "";
    const pts = line.map(([lon, lat]) => project(lon, lat));
    let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) {
        d += " L" + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1);
    }
    return d;
}

function dniproPathsFromRivers(riversGeo) {
    const parts = [];
    for (const feat of riversGeo.features || []) {
        const label = (feat.properties?.name || "") + (feat.properties?.name_en || "");
        if (!/Dnieper|Dnipro|Dnepr/i.test(label)) continue;
        for (const line of linesFromGeometry(feat.geometry)) {
            const path = lineToPath(line);
            if (path) parts.push(path);
        }
    }
    return parts.join(" ");
}

function centerOfPath(pathStr) {
    const nums = pathStr.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 4) return { x: VIEW_W / 2, y: VIEW_H / 2 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = +nums[i];
        const y = +nums[i + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

function geoPoint(lon, lat) {
    const [x, y] = project(lon, lat);
    return {
        lon,
        lat,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
    };
}

function buildGraticule() {
    let d = "";
    for (let lon = 20; lon <= 42; lon += 4) {
        const [x1, y1] = project(lon, PROJ.latMax);
        const [x2, y2] = project(lon, PROJ.latMin);
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    for (let lat = 44; lat <= 54; lat += 2) {
        const [x1, y1] = project(PROJ.lonMin, lat);
        const [x2, y2] = project(PROJ.lonMax, lat);
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    return d.trim();
}

/** City / region markers — WGS84 coordinates. */
const MARKERS = {
    lviv: { lon: 24.0297, lat: 49.8397, title: "Львів" },
    kyiv: { lon: 30.5234, lat: 50.4501, title: "Київ" },
    odesa: { lon: 30.7233, lat: 46.4825, title: "Одеса" },
    "black-sea": { lon: 31.8, lat: 44.8, title: "Чорне море", nudgeDownCm: 1, labelBelow: true },
    carpathians: { lon: 24.5, lat: 48.16, title: "Карпати" },
    dnipro: { lon: 35.0462, lat: 48.4647, title: "Дніпро" },
};

/** Neighbor countries (Natural Earth ISO_A2). */
const NEIGHBOR_ISO = ["PL", "SK", "HU", "RO", "MD", "BY", "RU"];

/** Labels placed just outside Ukraine's borders. */
const NEIGHBOR_LABELS = [
    { id: "poland", title: "Польща", lon: 20.2, lat: 52.2 },
    { id: "slovakia", title: "Словаччина", lon: 20.4, lat: 49.1 },
    { id: "hungary", title: "Угорщина", lon: 21.8, lat: 47.6 },
    { id: "romania", title: "Румунія", lon: 26.2, lat: 45.2 },
    { id: "moldova", title: "Молдова", lon: 28.8, lat: 47.0 },
    { id: "belarus", title: "Білорусь", lon: 31.0, lat: 53.8 },
    { id: "russia", title: "Росія", lon: 40.5, lat: 50.8 },
];

/** Oblast puzzle regions — simplified bbox polygons in lon/lat. */
const OBLAST_BBOX = {
    "lviv-oblast": { lonMin: 22.5, lonMax: 25.6, latMin: 48.9, latMax: 50.5, title: "Львівська область" },
    "kyiv-oblast": { lonMin: 29.2, lonMax: 32.2, latMin: 49.1, latMax: 51.2, title: "Київська область" },
    "black-sea-coast": { lonMin: 30.2, lonMax: 36.8, latMin: 44.2, latMax: 47.2, title: "Чорноморське узбережжя" },
};

function bboxToPath(b) {
    const [x1, y1] = project(b.lonMin, b.latMax);
    const [x2, y2] = project(b.lonMax, b.latMin);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${x1.toFixed(1)} ${y2.toFixed(1)} Z`;
}

async function loadGeoJson(localPath, url) {
    try {
        return JSON.parse(readFileSync(localPath, "utf8"));
    } catch {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch: " + url + " " + res.status);
        const data = await res.json();
        mkdirSync(dirname(localPath), { recursive: true });
        writeFileSync(localPath, JSON.stringify(data));
        return data;
    }
}

function neighborTitle(iso) {
    const map = {
        PL: "Польща",
        SK: "Словаччина",
        HU: "Угорщина",
        RO: "Румунія",
        MD: "Молдова",
        BY: "Білорусь",
        RU: "Росія",
    };
    return map[iso] || iso;
}

async function main() {
    const localNe = join(__dirname, "../games/geo-quest/data/cache/ne_10m_countries.geojson");
    const localRivers = join(__dirname, "../games/geo-quest/data/cache/ne_10m_rivers.geojson");
    const geo = await loadGeoJson(localNe, NE_URL);
    const riversGeo = await loadGeoJson(localRivers, NE_RIVERS_URL);

    const feat = geo.features.find(
        (f) => f.properties?.ISO_A2 === "UA" || f.properties?.ADMIN === "Ukraine"
    );
    if (!feat) throw new Error("Ukraine feature not found");

    const rings = ringsFromGeometry(feat.geometry);
    if (!ringsAlreadyIncludeCrimea(rings)) {
        const crimea = crimeaRingFromRussia(geo);
        if (crimea) rings.push(crimea);
        else console.warn("Warning: Crimea ring not found in Russia geometry");
    }
    const ukrainePath = rings.map((r) => ringToPath(r)).join(" ");
    const dniproPath = dniproPathsFromRivers(riversGeo);

    const neighbors = [];
    for (const iso of NEIGHBOR_ISO) {
        const nf = geo.features.find((f) => f.properties?.ISO_A2 === iso);
        if (!nf) continue;
        const nrings = ringsFromGeometry(nf.geometry);
        const paths = nrings
            .map((r) => ringToPath(simplifyRing(r)))
            .filter(Boolean);
        if (!paths.length) continue;
        neighbors.push({
            id: iso.toLowerCase(),
            title: neighborTitle(iso),
            path: paths.join(" "),
        });
    }

    const neighborLabels = NEIGHBOR_LABELS.map((lb) => {
        const pt = geoPoint(lb.lon, lb.lat);
        return { id: lb.id, title: lb.title, lon: pt.lon, lat: pt.lat, x: pt.x, y: pt.y };
    });

    const ukraineCenter = centerOfPath(ukrainePath);
    const regions = [
        {
            id: "ukraine",
            title: "Україна",
            path: ukrainePath,
            marker: ukraineCenter,
            center: ukraineCenter,
        },
    ];

    for (const [id, b] of Object.entries(OBLAST_BBOX)) {
        const path = bboxToPath(b);
        const c = centerOfPath(path);
        regions.push({ id, title: b.title, path, marker: c, center: c });
    }

    for (const [id, m] of Object.entries(MARKERS)) {
        const pt = geoPoint(m.lon, m.lat);
        const entry = {
            id,
            title: m.title,
            lon: pt.lon,
            lat: pt.lat,
            marker: pt,
            center: pt,
        };
        if (m.nudgeUpCm) entry.nudgeUpCm = m.nudgeUpCm;
        if (m.nudgeDownCm) entry.nudgeDownCm = m.nudgeDownCm;
        if (m.labelBelow) entry.labelBelow = true;
        if (m.labelAbove) entry.labelAbove = true;
        regions.push(entry);
    }

    const bonusPt = geoPoint(31.5, 51.5);
    regions.push({
        id: "ukraine-puzzle-marker",
        title: "Бонус",
        lon: bonusPt.lon,
        lat: bonusPt.lat,
        marker: bonusPt,
        center: bonusPt,
    });

    const out = {
        id: "ukraine-travel",
        theme: "ukraine-travel",
        viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
        background: "#1a4a6e",
        markerPadding: MARKER_PAD,
        mapFill: "ukraine",
        earthTexture: "assets/earth-equirect.jpg",
        projection: { ...PROJ, pad: PAD },
        graticule: buildGraticule(),
        neighbors,
        neighborLabels,
        overlays: dniproPath
            ? [{ id: "dnipro", title: "Дніпро", kind: "river", path: dniproPath }]
            : [],
        regions,
    };

    const outPath = join(__dirname, "../games/geo-quest/data/maps/ukraine-travel.json");
    writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log("Wrote", outPath);
    console.log("Neighbors:", neighbors.length);
    console.log("Markers:", Object.keys(MARKERS).join(", "));
    console.log("Dnipro path:", dniproPath ? "yes" : "missing");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
