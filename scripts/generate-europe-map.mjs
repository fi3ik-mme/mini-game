#!/usr/bin/env node
/**
 * Builds games/geo-quest/data/maps/europe-countries.json — Europe travel map with
 * earth texture, neighbor context, geo markers, and zoom support.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NE_URL =
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";

const VIEW_W = 1000;
const VIEW_H = 780;
const PAD = 28;
const MARKER_PAD = 72;

const PROJ = {
    lonMin: -18,
    lonMax: 48,
    latMin: 34,
    latMax: 72,
    width: VIEW_W,
    height: VIEW_H,
};

const ISO_A3_FALLBACK = { FR: "FRA", NO: "NOR" };
const GAME_COUNTRIES = {
    austria: "AT",
    belarus: "BY",
    czechia: "CZ",
    denmark: "DK",
    finland: "FI",
    france: "FR",
    germany: "DE",
    greece: "GR",
    hungary: "HU",
    ireland: "IE",
    italy: "IT",
    norway: "NO",
    poland: "PL",
    portugal: "PT",
    romania: "RO",
    spain: "ES",
    sweden: "SE",
    uk: "GB",
    ukraine: "UA",
};

/** Extra European countries shown as map context (not game nodes). */
const CONTEXT_EUROPE_ISO = {
    albania: "AL",
    andorra: "AD",
    belgium: "BE",
    "bosnia-herzegovina": "BA",
    bulgaria: "BG",
    croatia: "HR",
    estonia: "EE",
    iceland: "IS",
    latvia: "LV",
    lithuania: "LT",
    luxembourg: "LU",
    malta: "MT",
    moldova: "MD",
    montenegro: "ME",
    netherlands: "NL",
    "north-macedonia": "MK",
    serbia: "RS",
    slovakia: "SK",
    slovenia: "SI",
    switzerland: "CH",
    cyprus: "CY",
};

const ALL_EUROPE_IDS = { ...GAME_COUNTRIES, ...CONTEXT_EUROPE_ISO };

const TITLES_UK = {
    austria: "Австрія",
    belarus: "Білорусь",
    czechia: "Чехія",
    denmark: "Данія",
    finland: "Фінляндія",
    france: "Франція",
    germany: "Німеччина",
    greece: "Греція",
    hungary: "Угорщина",
    ireland: "Ірландія",
    italy: "Італія",
    norway: "Норвегія",
    poland: "Польща",
    portugal: "Португалія",
    romania: "Румунія",
    spain: "Іспанія",
    sweden: "Швеція",
    uk: "Велика Британія",
    ukraine: "Україна",
    albania: "Албанія",
    andorra: "Андорра",
    belgium: "Бельгія",
    "bosnia-herzegovina": "Боснія і Герцеговина",
    bulgaria: "Болгарія",
    croatia: "Хорватія",
    estonia: "Естонія",
    iceland: "Ісландія",
    latvia: "Латвія",
    lithuania: "Литва",
    luxembourg: "Люксембург",
    malta: "Мальта",
    moldova: "Молдова",
    montenegro: "Чорногорія",
    netherlands: "Нідерланди",
    "north-macedonia": "Північна Македонія",
    serbia: "Сербія",
    slovakia: "Словаччина",
    slovenia: "Словенія",
    switzerland: "Швейцарія",
    cyprus: "Кіпр",
};

/** Capital coordinates for marker placement (lon, lat). */
const CAPITALS = {
    ukraine: [30.5234, 50.4501],
    poland: [21.0122, 52.2297],
    france: [2.3522, 48.8566],
    italy: [12.4964, 41.9028],
    spain: [-3.7038, 40.4168],
    norway: [10.7522, 59.9139],
    austria: [16.3738, 48.2082],
    belarus: [27.5615, 53.9023],
    czechia: [14.4378, 50.0755],
    denmark: [12.5683, 55.6761],
    finland: [24.9384, 60.1699],
    germany: [13.405, 52.52],
    greece: [23.7275, 37.9838],
    hungary: [19.0402, 47.4979],
    ireland: [-6.2603, 53.3498],
    portugal: [-9.1393, 38.7223],
    romania: [26.1025, 44.4268],
    sweden: [18.0686, 59.3293],
    uk: [-0.1276, 51.5074],
    albania: [19.8187, 41.3275],
    belgium: [4.3517, 50.8503],
    bulgaria: [23.3219, 42.6977],
    croatia: [15.9819, 45.815],
    estonia: [24.7536, 59.437],
    iceland: [-21.9426, 64.1466],
    latvia: [24.1052, 56.9496],
    lithuania: [25.2797, 54.6872],
    moldova: [28.8638, 47.0105],
    netherlands: [4.9041, 52.3676],
    serbia: [20.4489, 44.7866],
    slovakia: [17.1077, 48.1486],
    slovenia: [14.5058, 46.0569],
    switzerland: [7.4474, 46.948],
    cyprus: [33.3823, 35.1856],
};

/** Non-European neighbors — land silhouettes. */
const NEIGHBOR_ISO = ["MA", "DZ", "TN", "LY", "EG", "TR", "SY", "GE", "RU"];

const NEIGHBOR_LABELS = [
    { id: "iceland", title: "Ісландія", lon: -17, lat: 66 },
    { id: "morocco", title: "Марокко", lon: -8, lat: 34.5 },
    { id: "algeria", title: "Алжир", lon: 0, lat: 35 },
    { id: "tunisia", title: "Туніс", lon: 9, lat: 34.5 },
    { id: "libya", title: "Лівія", lon: 18, lat: 34.5 },
    { id: "egypt", title: "Єгипет", lon: 30, lat: 34.2 },
    { id: "turkey", title: "Туреччина", lon: 36, lat: 38 },
    { id: "georgia", title: "Грузія", lon: 44, lat: 42.5 },
    { id: "russia", title: "Росія", lon: 46, lat: 58 },
];

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

function simplifyRing(ring, maxPoints = 320) {
    if (ring.length <= maxPoints) return ring;
    const step = Math.ceil(ring.length / maxPoints);
    const out = [];
    for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
    const last = ring[ring.length - 1];
    const tail = out[out.length - 1];
    if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
    return out;
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

function ringIntersectsBbox(ring) {
    const { lonMin, lonMax, latMin, latMax } = PROJ;
    for (const [lon, lat] of ring) {
        if (lon >= lonMin - 2 && lon <= lonMax + 2 && lat >= latMin - 2 && lat <= latMax + 2) {
            return true;
        }
    }
    return false;
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
    for (let lon = -15; lon <= 45; lon += 5) {
        const [x1, y1] = project(lon, PROJ.latMax);
        const [x2, y2] = project(lon, PROJ.latMin);
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    for (let lat = 35; lat <= 70; lat += 5) {
        const [x1, y1] = project(PROJ.lonMin, lat);
        const [x2, y2] = project(PROJ.lonMax, lat);
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    return d.trim();
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

function findFeature(geo, iso) {
    let feat = geo.features.find((f) => f.properties?.ISO_A2 === iso);
    if (!feat && ISO_A3_FALLBACK[iso]) {
        feat = geo.features.find((f) => f.properties?.ADM0_A3 === ISO_A3_FALLBACK[iso]);
    }
    return feat;
}

function countryPathFromFeature(feat, extraRings = []) {
    const rings = ringsFromGeometry(feat.geometry);
    const all = [...rings, ...extraRings];
    const visible = all.filter(ringIntersectsBbox);
    if (!visible.length) return "";
    return visible.map((r) => ringToPath(simplifyRing(r))).join(" ");
}

async function main() {
    const localNe = join(__dirname, "../games/geo-quest/data/cache/ne_10m_countries.geojson");
    const ne = await loadGeoJson(localNe, NE_URL);

    const crimea = crimeaRingFromRussia(ne);
    const usedIso = new Set();

    const countries = [];
    for (const [id, iso] of Object.entries(ALL_EUROPE_IDS)) {
        const feat = findFeature(ne, iso);
        if (!feat) {
            console.warn("Missing feature for", id, iso);
            continue;
        }
        usedIso.add(iso);
        let extra = [];
        if (id === "ukraine" && crimea && !ringsAlreadyIncludeCrimea(ringsFromGeometry(feat.geometry))) {
            extra.push(crimea);
        }
        const path = countryPathFromFeature(feat, extra);
        if (!path) continue;
        const cap = CAPITALS[id];
        const center = cap ? geoPoint(cap[0], cap[1]) : geoPoint(0, 0);
        if (!cap) {
            const rings = ringsFromGeometry(feat.geometry);
            let lonSum = 0;
            let latSum = 0;
            let n = 0;
            for (const ring of rings) {
                for (const [lon, lat] of ring) {
                    lonSum += lon;
                    latSum += lat;
                    n++;
                }
            }
            if (n) Object.assign(center, geoPoint(lonSum / n, latSum / n));
        }
        countries.push({
            id,
            title: TITLES_UK[id] || id,
            lon: center.lon,
            lat: center.lat,
            center,
            path,
        });
    }

    const neighbors = [];
    for (const iso of NEIGHBOR_ISO) {
        if (usedIso.has(iso)) continue;
        const feat = findFeature(ne, iso);
        if (!feat) continue;
        const path = countryPathFromFeature(feat);
        if (!path) continue;
        neighbors.push({
            id: iso.toLowerCase(),
            title: feat.properties?.ADMIN || iso,
            path,
        });
    }

    const neighborLabels = NEIGHBOR_LABELS.map((lb) => {
        const pt = geoPoint(lb.lon, lb.lat);
        return { id: lb.id, title: lb.title, lon: pt.lon, lat: pt.lat, x: pt.x, y: pt.y };
    });

    const bonusPt = geoPoint(10.5, 52.2);
    countries.push({
        id: "europe-puzzle",
        title: "Бонус: пазл",
        lon: bonusPt.lon,
        lat: bonusPt.lat,
        marker: bonusPt,
        center: bonusPt,
    });

    const out = {
        id: "europe-countries",
        theme: "europe-countries",
        viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
        background: "#1a4a6e",
        markerPadding: MARKER_PAD,
        earthTexture: "assets/earth-equirect.jpg",
        projection: { ...PROJ, pad: PAD },
        graticule: buildGraticule(),
        neighbors,
        neighborLabels,
        countries,
    };

    const outPath = join(__dirname, "../games/geo-quest/data/maps/europe-countries.json");
    writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log("Wrote", outPath);
    console.log("Countries:", countries.length);
    console.log("Neighbors:", neighbors.length);
    console.log("Labels:", neighborLabels.length);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
