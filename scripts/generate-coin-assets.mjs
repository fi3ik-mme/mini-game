#!/usr/bin/env node
/**
 * Генерує PNG монет з прозорим фоном для гри «Перший мільйон».
 * Джерела (Вікісховище, PD-UA-exempt):
 *   - 25 коп.: File:Coins_of_the_Ukrainian_hryvnia_02.png
 *   - 1 грн (аверс з гербом): File:1 hryvnia coin of Ukraine, 2018 (averse).jpg
 *
 * node scripts/generate-coin-assets.mjs
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../games/first-million/assets/coins");
const TMP = resolve(__dirname, "../.tmp-coin-assets");

const SOURCES = {
  kop25: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Coins_of_the_Ukrainian_hryvnia_02.png",
  hryvnia1:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/1_hryvnia_coin_of_Ukraine%2C_2018_%28averse%29.jpg/500px-1_hryvnia_coin_of_Ukraine%2C_2018_%28averse%29.jpg",
};

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

for (const [name, url] of Object.entries(SOURCES)) {
  const ext = url.includes(".png") ? "png" : "jpg";
  execSync(`curl -sL -o "${TMP}/${name}.${ext}" "${url}"`, { stdio: "inherit" });
}

const pyPath = resolve(TMP, "process-coins.py");
writeFileSync(
  pyPath,
  `from PIL import Image
from collections import deque

def remove_bg(src, dst, max_h):
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = set()

    def is_bg(r, g, b):
        return r > 195 and g > 195 and b > 195

    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        q = deque([seed])
        while q:
            x, y = q.popleft()
            if (x, y) in visited or x < 0 or y < 0 or x >= w or y >= h:
                continue
            r, g, b, a = px[x, y]
            if not is_bg(r, g, b):
                continue
            visited.add((x, y))
            px[x, y] = (0, 0, 0, 0)
            q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    if im.height > max_h:
        ratio = max_h / im.height
        im = im.resize((max(1, int(im.width * ratio)), max_h), Image.Resampling.LANCZOS)
    data = [(r, g, b, 255 if a > 128 else 0) for r, g, b, a in im.getdata()]
    out = Image.new("RGBA", im.size)
    out.putdata(data)
    out.save(dst, optimize=True)
    print("wrote", dst, out.size)

remove_bg(${JSON.stringify(resolve(TMP, "kop25.png"))}, ${JSON.stringify(resolve(OUT, "25-kopiyok.png"))}, 56)
remove_bg(${JSON.stringify(resolve(TMP, "hryvnia1.jpg"))}, ${JSON.stringify(resolve(OUT, "1-hryvnia-obverse.png"))}, 72)
`,
);

execSync(`python3 "${pyPath}"`, { stdio: "inherit" });
console.log("Coin assets →", OUT);
