/**
 * Web Mercator map projection for Ukraine travel map (matches Esri tile imagery).
 * Keep in sync with games/geo-quest/data/maps/ukraine-travel.json projection.
 */
export const UKRAINE_VIEW_W = 1000;
export const UKRAINE_VIEW_H = 780;
export const UKRAINE_PAD = 28;

export const UKRAINE_PROJ = {
    type: "webMercator",
    lonMin: 19,
    lonMax: 42.5,
    latMin: 43.5,
    latMax: 54.5,
    width: UKRAINE_VIEW_W,
    height: UKRAINE_VIEW_H,
    pad: UKRAINE_PAD,
};

/** @param {number} lat degrees */
export function mercatorY(lat) {
    const latRad = (lat * Math.PI) / 180;
    return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

/** @param {number} lon @param {number} lat @returns {[number, number]} */
export function ukraineProject(lon, lat) {
    const { lonMin, lonMax, latMin, latMax } = UKRAINE_PROJ;
    const innerW = UKRAINE_VIEW_W - UKRAINE_PAD * 2;
    const innerH = UKRAINE_VIEW_H - UKRAINE_PAD * 2;
    const mercNorth = mercatorY(latMax);
    const mercSouth = mercatorY(latMin);
    const x = ((lon - lonMin) / (lonMax - lonMin)) * innerW + UKRAINE_PAD;
    const y = ((mercNorth - mercatorY(lat)) / (mercNorth - mercSouth)) * innerH + UKRAINE_PAD;
    return [x, y];
}

/** @param {number} x @param {number} y @returns {{ lon: number, lat: number }} */
export function ukraineUnproject(x, y) {
    const { lonMin, lonMax, latMin, latMax } = UKRAINE_PROJ;
    const innerW = UKRAINE_VIEW_W - UKRAINE_PAD * 2;
    const innerH = UKRAINE_VIEW_H - UKRAINE_PAD * 2;
    const mercNorth = mercatorY(latMax);
    const mercSouth = mercatorY(latMin);
    const lon = lonMin + ((x - UKRAINE_PAD) / innerW) * (lonMax - lonMin);
    const merc = mercNorth - ((y - UKRAINE_PAD) / innerH) * (mercNorth - mercSouth);
    const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp(merc)) - Math.PI / 2);
    return { lon, lat };
}

export function ukraineGeoPoint(lon, lat) {
    const [x, y] = ukraineProject(lon, lat);
    return {
        lon,
        lat,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
    };
}
