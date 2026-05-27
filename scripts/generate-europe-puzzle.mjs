#!/usr/bin/env node
/**
 * Optional: renders games/geo-quest/assets/europe-puzzle.svg from europe-countries.json.
 * The game also builds the puzzle image at runtime; this asset is for preview / fallback.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mapPath = join(__dirname, "../games/geo-quest/data/maps/europe-countries.json");
const outPath = join(__dirname, "../games/geo-quest/assets/europe-puzzle.svg");

const COLORS = [
  "#3b82f6", "#22c55e", "#eab308", "#f97316", "#a855f7", "#ec4899",
  "#14b8a6", "#64748b", "#0ea5e9", "#84cc16", "#f43f5e", "#8b5cf6",
  "#06b6d4", "#d946ef", "#f59e0b", "#10b981", "#6366f1", "#ef4444",
  "#2dd4bf",
];

const map = JSON.parse(readFileSync(mapPath, "utf8"));
const vb = map.viewBox || "0 0 1000 780";
let paths = "";
map.countries.forEach((c, i) => {
  const fill = COLORS[i % COLORS.length];
  paths += `<path fill="${fill}" stroke="rgba(255,255,255,0.45)" stroke-width="1.2" d="${c.path}"/>`;
});

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">
  <rect width="1000" height="780" fill="#1e3a8a"/>
  ${paths}
</svg>
`;

writeFileSync(outPath, svg);
console.log("Wrote", outPath);
