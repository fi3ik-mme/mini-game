#!/usr/bin/env node
/**
 * Verifies Wikimedia Commons files used in ukraine-extra.json.
 * Usage: node scripts/verify-ukraine-media.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, "../games/geo-quest/data/rounds/ukraine-extra.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolveFile(filename) {
  const title = filename.startsWith("File:") ? filename : "File:" + filename;
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&titles=" +
    encodeURIComponent(title) +
    "&prop=imageinfo&iiprop=url|mime&iiurlwidth=360&format=json";
  const r = await fetch(url, { headers: { "User-Agent": "mini-game-verify/1.0" } });
  const j = await r.json();
  const page = j.query?.pages?.[Object.keys(j.query.pages)[0]];
  if (!page || page.missing) return { ok: false, filename, error: "missing" };
  const info = page.imageinfo?.[0];
  if (!info) return { ok: false, filename, error: "no imageinfo" };
  return {
    ok: true,
    filename,
    thumb: info.thumburl,
    url: info.url,
    mime: info.mime,
  };
}

function extractFiles(data) {
  const files = new Set();
  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "image" && typeof v === "string" && v.includes("FilePath/")) {
        const m = v.match(/FilePath\/([^?]+)/);
        if (m) files.add(decodeURIComponent(m[1]));
      } else if (typeof v === "object") walk(v);
    }
  };
  walk(data);
  return [...files];
}

const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
const candidates = {
  "Igor Sikorsky": [
    "Igor I. Sikorsky 1914.jpg",
    "Sikorsky, Igor Ivanovich, 1889-1972.jpg",
    "Igor Sikorsky circa 1910.jpg",
  ],
  "Kupala": [
    "Ivana Kupala Festival in Belarus.jpg",
    "Kupala Night Sanok 2014.JPG",
    "Kupala night celebration.jpg",
  ],
  Malanka: [
    "Malanka festival in Krasnoyilsk 2017.jpg",
    "Malanka in Chernivtsi.jpg",
  ],
  Petrykivka: [
    "Petrykivka painting by N. Bilokin.jpg",
    "Petrykivka decorative painting style.jpg",
    "Petrykivka painting 1.jpg",
  ],
  Uzhhorod: [
    "Uzhhorod Castle 2014.jpg",
    "Uzhgorod Castle.jpg",
    "Palanok Castle Mukacheve.jpg",
  ],
  Shevchenko: [
    "Taras Shevchenko by Ivan Kramskoy.jpg",
    "Taras Shevchenko photo.jpg",
    "Shevchenko National Museum portrait.jpg",
  ],
};

console.log("=== Files in ukraine-extra.json ===\n");
const files = extractFiles(data);
const results = [];
for (const f of files) {
  const res = await resolveFile(f);
  results.push(res);
  console.log(res.ok ? "OK" : "FAIL", f, res.ok ? "" : res.error);
  await sleep(1100);
}

console.log("\n=== Candidate replacements ===\n");
for (const [label, list] of Object.entries(candidates)) {
  console.log("\n--", label, "--");
  for (const f of list) {
    const res = await resolveFile(f);
    console.log(res.ok ? "OK" : "FAIL", f);
    if (res.ok) console.log("  ", res.thumb);
    await sleep(1100);
  }
}

const failed = results.filter((r) => !r.ok);
console.log("\n=== Summary ===");
console.log("Total:", files.length, "Failed:", failed.length);
if (failed.length) {
  console.log("Failed files:", failed.map((f) => f.filename).join(", "));
}
