#!/usr/bin/env node
/**
 * World-map ocean screen: equirectangular earth texture + geo markers + landmarks.
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../games/geo-quest/data/maps/ocean-regions.json");

const W = 1200;
const H = 620;
const PAD = 6;
const MARKER_PAD = 88;
const LON_MIN = -180;
const LON_MAX = 180;
const LAT_MIN = -66;
const LAT_MAX = 84;

/** Geographic centers of the five oceans (lon/lat). */
const OCEAN_CENTERS = {
    atlantic: { lon: -42, lat: 8 },
    pacific: { lon: -154.5, lat: 0 },
    arctic: { lon: 0, lat: 84 },
    indian: { lon: 79, lat: -23 },
    southern: { lon: 0, lat: -65 },
};

/** Notable places (lon, lat). */
const LANDMARKS = [
    { id: "bermuda", title: "Бермудський трикутник", lon: -65, lat: 32 },
    { id: "mariana", title: "Маріанська западина", lon: 142.5917, lat: 11.3733 },
    { id: "gulf-stream", title: "Гольфстрім", lon: -52, lat: 38 },
    { id: "great-barrier", title: "Великий бар'єрний риф", lon: 149.4, lat: -19.3, nudgeUpCm: 1.5 },
    { id: "mid-atlantic", title: "Середньо-Атлантичний хребет", lon: -28, lat: 0 },
    { id: "hawaii", title: "Гавайські острови", lon: -157, lat: 21 },
    { id: "sargasso", title: "Саргасове море", lon: -45, lat: 30, labelBelow: true },
    { id: "maldives", title: "Мальдіви", lon: 73.5, lat: 3.2 },
];

function project(lon, lat) {
    const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - PAD * 2) + PAD;
    const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - PAD * 2) + PAD;
    return [x, y];
}

/** md ocean node circle diameter (2 × r=30) — unit for UI nudges. */
const OCEAN_MARKER_H = 60;

/** Display nudges in marker heights (SVG y+, lat unchanged). */
const MARKER_OFFSET_Y = {
    arctic: OCEAN_MARKER_H * 0.5,
    atlantic: OCEAN_MARKER_H * 1,
    southern: -OCEAN_MARKER_H * 1.5,
};

function geoPoint(lon, lat, offsetY = 0) {
    const [x, y] = project(lon, lat);
    return {
        lon,
        lat,
        x: Math.round(x * 10) / 10,
        y: Math.round((y + offsetY) * 10) / 10,
    };
}

function buildGraticule() {
    let d = "";
    for (let lon = -180; lon <= 180; lon += 30) {
        const [x1, y1] = project(lon, LAT_MAX);
        const [x2, y2] = project(lon, LAT_MIN);
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    for (let lat = -60; lat <= 60; lat += 30) {
        const [x1, y1] = project(LON_MIN, lat);
        const [x2, y2] = project(LON_MAX, lat);
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    return d.trim();
}

function main() {
    const regions = Object.entries(OCEAN_CENTERS).map(([id, c]) => {
        const offsetY = MARKER_OFFSET_Y[id] ?? 0;
        const pt = geoPoint(c.lon, c.lat, offsetY);
        return {
            id,
            title: id,
            lon: pt.lon,
            lat: pt.lat,
            markerOffsetY: offsetY,
            marker: pt,
            center: pt,
        };
    });

    const landmarks = LANDMARKS.map((lm) => {
        const pt = geoPoint(lm.lon, lm.lat);
        const out = { id: lm.id, title: lm.title, lon: pt.lon, lat: pt.lat, x: pt.x, y: pt.y };
        if (lm.labelBelow) out.labelBelow = true;
        if (lm.labelAbove) out.labelAbove = true;
        if (lm.nudgeUpCm) out.nudgeUpCm = lm.nudgeUpCm;
        if (lm.nudgeDownCm) out.nudgeDownCm = lm.nudgeDownCm;
        if (lm.displayOffsetX) out.displayOffsetX = lm.displayOffsetX;
        if (lm.displayOffsetY) out.displayOffsetY = lm.displayOffsetY;
        return out;
    });

    const data = {
        id: "ocean-regions",
        theme: "world-ocean",
        viewBox: `0 0 ${W} ${H}`,
        markerPadding: MARKER_PAD,
        earthTexture: "assets/earth-equirect.jpg",
        projection: {
            lonMin: LON_MIN,
            lonMax: LON_MAX,
            latMin: LAT_MIN,
            latMax: LAT_MAX,
            width: W,
            height: H,
            pad: PAD,
        },
        background: "#0a3d5c",
        graticule: buildGraticule(),
        regions,
        landmarks,
    };

    writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log("Wrote", OUT);
    console.log("Markers:", regions.map((r) => r.id + "@" + r.marker.x + "," + r.marker.y).join(" "));
    console.log("Landmarks:", landmarks.length);
}

main();
