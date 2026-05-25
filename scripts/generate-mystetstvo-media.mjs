#!/usr/bin/env node
/*
 * Generates rich "media" HTML/SVG for every Мистецтво (Art) question.
 * Mirrors scripts/generate-steam-media.mjs in approach: a library of detailed
 * hand-crafted SVGs (color wheel, instruments, music notation, Ukrainian
 * folk patterns, etc.) plus a keyword-matching rule list. Falls back to a
 * styled info-card for purely definitional questions.
 *
 * Run with:  node scripts/generate-mystetstvo-media.mjs [--verbose]
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(
  PROJECT_ROOT,
  "games/first-million/data/mystetstvo-4-klas.json",
);

const BG = "#0d1117";

function svg(viewBox, body, width = 240) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" style="width:${width}px;max-width:100%;height:auto;background:${BG};border-radius:10px;padding:8px;">${body}</svg>`;
}

function infoCard(html) {
  return `<div class="info-card">${html}</div>`;
}

function schemeRow(nodes) {
  const inner = nodes
    .map((n, i) =>
      i === 0
        ? `<span class="node">${n}</span>`
        : `<span class="arrow">→</span><span class="node">${n}</span>`,
    )
    .join("");
  return `<div class="scheme-row">${inner}</div>`;
}

function swatchRow(items) {
  const html = items
    .map(
      (i) =>
        `<span class="swatch"><span class="chip" style="background:${i.color}"></span><span>${i.label}</span></span>`,
    )
    .join("");
  return `<div style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center">${html}</div>`;
}

/* ============================================================
 * SVG TEMPLATE LIBRARY
 * ==========================================================*/

const T = {
  /* --------------------------- COLOR THEORY --------------------------- */

  colorWheel: () =>
    svg(
      "0 0 240 240",
      `
      ${[
        ["#dc2626", 0],
        ["#f97316", 30],
        ["#facc15", 60],
        ["#84cc16", 90],
        ["#16a34a", 120],
        ["#0ea5e9", 180],
        ["#2563eb", 210],
        ["#7c3aed", 270],
        ["#db2777", 300],
        ["#f43f5e", 330],
      ]
        .map(([c, deg]) => {
          const start = (Math.PI * (deg - 18)) / 180;
          const end = (Math.PI * (deg + 18)) / 180;
          const cx = 120, cy = 120, r = 100;
          const x1 = cx + r * Math.cos(start);
          const y1 = cy + r * Math.sin(start);
          const x2 = cx + r * Math.cos(end);
          const y2 = cy + r * Math.sin(end);
          return `<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${c}" stroke="${BG}" stroke-width="1.5"/>`;
        })
        .join("")}
      <circle cx="120" cy="120" r="35" fill="#0d1117"/>
      <g font-family="Inter, Arial" font-size="11" font-weight="800" text-anchor="middle">
        <text x="220" y="124" fill="#dc2626">червоний</text>
        <text x="120" y="14"  fill="#facc15">жовтий</text>
        <text x="22"  y="124" fill="#2563eb">синій</text>
      </g>
      <text x="120" y="126" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="800">3 основні</text>`,
      230,
    ),

  colorMix: (a, b, result, names) =>
    svg(
      "0 0 320 140",
      `
      <circle cx="80" cy="70" r="44" fill="${a}" opacity="0.85"/>
      <circle cx="140" cy="70" r="44" fill="${b}" opacity="0.85"/>
      <text x="110" y="74" text-anchor="middle" font-family="Inter, Arial" font-size="20" font-weight="900" fill="#fff">+</text>
      <text x="190" y="74" text-anchor="middle" font-family="Inter, Arial" font-size="24" font-weight="900" fill="#fff">=</text>
      <circle cx="260" cy="70" r="44" fill="${result}" stroke="#fff" stroke-width="2"/>
      <g font-family="Inter, Arial" font-size="11" fill="#fde68a" text-anchor="middle" font-weight="700">
        <text x="80" y="130">${names[0]}</text>
        <text x="140" y="130">${names[1]}</text>
        <text x="260" y="130">${names[2]}</text>
      </g>`,
      310,
    ),

  warmColors: () =>
    swatchRow([
      { color: "#dc2626", label: "червоний" },
      { color: "#f97316", label: "помаранчевий" },
      { color: "#facc15", label: "жовтий" },
    ]) +
    `<div class="info-card" style="margin-top:8px">🔥 Теплі кольори — кольори вогню та сонця.</div>`,

  coldColors: () =>
    swatchRow([
      { color: "#0ea5e9", label: "блакитний" },
      { color: "#2563eb", label: "синій" },
      { color: "#7c3aed", label: "фіолетовий" },
      { color: "#16a34a", label: "зелений" },
    ]) +
    `<div class="info-card" style="margin-top:8px">❄ Холодні кольори — як вода, лід і небо.</div>`,

  achromatic: () =>
    swatchRow([
      { color: "#ffffff", label: "білий" },
      { color: "#94a3b8", label: "сірий" },
      { color: "#0f172a", label: "чорний" },
    ]) +
    `<div class="info-card" style="margin-top:8px">⚫⚪ Ахроматичні (нейтральні) — без кольорового тону.</div>`,

  contrast: () =>
    svg(
      "0 0 240 140",
      `
      <rect x="20" y="20" width="100" height="100" fill="#0f172a"/>
      <circle cx="70" cy="70" r="30" fill="#fde68a"/>
      <rect x="120" y="20" width="100" height="100" fill="#fde68a"/>
      <circle cx="170" cy="70" r="30" fill="#0f172a"/>
      <text x="120" y="138" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">контраст темного і світлого</text>`,
      240,
    ),

  symmetry: () =>
    svg(
      "0 0 240 200",
      `
      <line x1="120" y1="10" x2="120" y2="190" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 4"/>
      <g fill="#38bdf8" stroke="#0284c7" stroke-width="1.5">
        <polygon points="60,150 100,150 80,110"/>
        <polygon points="180,150 140,150 160,110"/>
        <circle cx="80" cy="90" r="14"/>
        <circle cx="160" cy="90" r="14"/>
      </g>
      <text x="120" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">симетрія — як у дзеркалі</text>`,
      220,
    ),

  composition: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="20" y="20" width="200" height="160" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <line x1="20" y1="73" x2="220" y2="73" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>
      <line x1="20" y1="127" x2="220" y2="127" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>
      <line x1="86" y1="20" x2="86" y2="180" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>
      <line x1="153" y1="20" x2="153" y2="180" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>
      <circle cx="86" cy="73" r="18" fill="#fde68a"/>
      <rect x="140" y="100" width="60" height="60" fill="#16a34a"/>
      <polygon points="60,160 80,120 100,160" fill="#dc2626"/>
      <text x="120" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">композиція — правило третин</text>`,
      230,
    ),

  /* --------------------------- PAINTING GENRES --------------------------- */

  portrait: () =>
    svg(
      "0 0 200 240",
      `
      <rect x="10" y="10" width="180" height="220" fill="#fde68a" stroke="#92400e" stroke-width="4"/>
      <rect x="20" y="20" width="160" height="200" fill="#fef3c7"/>
      <ellipse cx="100" cy="100" rx="46" ry="58" fill="#fda4af"/>
      <ellipse cx="84" cy="92" rx="5" ry="6" fill="#0f172a"/>
      <ellipse cx="116" cy="92" rx="5" ry="6" fill="#0f172a"/>
      <path d="M82 120 Q100 132 118 120" stroke="#0f172a" stroke-width="2" fill="none"/>
      <path d="M60 90 Q60 50 100 50 Q140 50 140 90" fill="#451a03"/>
      <path d="M60 170 Q60 220 100 220 Q140 220 140 170 L140 145 Q100 165 60 145 Z" fill="#1d4ed8"/>
      <text x="100" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">портрет</text>`,
      200,
    ),

  landscape: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="10" y="10" width="260" height="180" fill="#fde68a" stroke="#92400e" stroke-width="4"/>
      <rect x="20" y="20" width="240" height="160" fill="#bae6fd"/>
      <circle cx="220" cy="50" r="20" fill="#fbbf24"/>
      <polygon points="20,150 80,80 130,150" fill="#475569"/>
      <polygon points="100,150 150,70 200,150" fill="#334155"/>
      <polygon points="170,150 220,90 260,150" fill="#475569"/>
      <polygon points="80,80 92,100 75,100" fill="#fff"/>
      <polygon points="150,70 162,92 142,92" fill="#fff"/>
      <rect x="20" y="150" width="240" height="30" fill="#16a34a"/>
      <g fill="#15803d">
        <circle cx="50" cy="160" r="6"/>
        <circle cx="100" cy="165" r="5"/>
        <circle cx="180" cy="162" r="7"/>
      </g>
      <text x="140" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">пейзаж</text>`,
      260,
    ),

  stillLife: () =>
    svg(
      "0 0 240 220",
      `
      <rect x="10" y="10" width="220" height="200" fill="#fde68a" stroke="#92400e" stroke-width="4"/>
      <rect x="20" y="20" width="200" height="180" fill="#fef3c7"/>
      <rect x="20" y="160" width="200" height="40" fill="#92400e"/>
      <path d="M70 160 Q70 90 100 80 Q130 90 130 160 Z" fill="#0ea5e9" stroke="#0284c7" stroke-width="2"/>
      <ellipse cx="100" cy="80" rx="14" ry="6" fill="#0284c7"/>
      <g stroke="#16a34a" stroke-width="3" fill="#16a34a">
        <path d="M100 80 Q90 50 80 30" fill="none"/>
        <ellipse cx="80" cy="32" rx="10" ry="6" transform="rotate(-30 80 32)"/>
      </g>
      <circle cx="155" cy="155" r="18" fill="#dc2626"/>
      <ellipse cx="180" cy="148" rx="12" ry="10" fill="#facc15"/>
      <ellipse cx="60" cy="155" rx="14" ry="11" fill="#84cc16"/>
      <text x="120" y="216" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">натюрморт</text>`,
      230,
    ),

  battleScene: () =>
    svg(
      "0 0 280 180",
      `
      <rect width="280" height="180" fill="#7c2d12"/>
      <rect x="0" y="120" width="280" height="60" fill="#451a03"/>
      <circle cx="40" cy="40" r="14" fill="#fbbf24" opacity="0.5"/>
      <g fill="#1e293b">
        <rect x="40" y="80" width="20" height="40"/>
        <rect x="80" y="70" width="20" height="50"/>
        <rect x="120" y="60" width="20" height="60"/>
      </g>
      <g stroke="#fde68a" stroke-width="3">
        <line x1="50" y1="80" x2="50" y2="50"/>
        <line x1="90" y1="70" x2="90" y2="40"/>
        <line x1="130" y1="60" x2="130" y2="30"/>
      </g>
      <g fill="#dc2626" opacity="0.7">
        <circle cx="200" cy="50" r="14"/>
        <circle cx="240" cy="70" r="10"/>
      </g>
      <text x="140" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">батальний жанр</text>`,
      270,
    ),

  animalism: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="10" y="10" width="260" height="180" fill="#fde68a" stroke="#92400e" stroke-width="4"/>
      <rect x="20" y="20" width="240" height="160" fill="#bae6fd"/>
      <rect x="20" y="130" width="240" height="50" fill="#16a34a"/>
      <g transform="translate(140 130)">
        <ellipse cx="0" cy="-10" rx="50" ry="22" fill="#7c2d12"/>
        <ellipse cx="-44" cy="-22" rx="20" ry="18" fill="#7c2d12"/>
        <circle cx="-52" cy="-24" r="3" fill="#fff"/>
        <line x1="-12" y1="10" x2="-12" y2="30" stroke="#7c2d12" stroke-width="6"/>
        <line x1="12" y1="10" x2="12" y2="30" stroke="#7c2d12" stroke-width="6"/>
        <line x1="-30" y1="10" x2="-30" y2="30" stroke="#7c2d12" stroke-width="6"/>
        <line x1="30" y1="10" x2="30" y2="30" stroke="#7c2d12" stroke-width="6"/>
        <path d="M50 -16 L60 -10 L55 -2" stroke="#7c2d12" stroke-width="4" fill="none"/>
      </g>
      <text x="140" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">анімалізм</text>`,
      260,
    ),

  fresco: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="10" y="10" width="260" height="180" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      ${[...Array(7)]
        .map(
          (_, i) =>
            `<line x1="${10 + i * 38}" y1="10" x2="${10 + i * 38}" y2="190" stroke="#cbd5e1" stroke-width="0.5"/>`,
        )
        .join("")}
      <ellipse cx="140" cy="100" rx="40" ry="60" fill="#fda4af"/>
      <circle cx="140" cy="60" r="28" fill="#fff"/>
      <circle cx="140" cy="60" r="20" fill="#fde68a"/>
      <text x="140" y="64" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#92400e" font-weight="800">✟</text>
      <path d="M115 110 Q140 130 165 110 L160 170 L120 170 Z" fill="#1d4ed8"/>
      <text x="140" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#92400e" font-weight="700">фреска (розпис на стіні)</text>`,
      260,
    ),

  sketch: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="10" y="10" width="220" height="180" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      <g stroke="#1e293b" stroke-width="1.5" fill="none" opacity="0.85">
        <path d="M40 150 Q60 60 110 70 Q160 80 180 150"/>
        <path d="M60 80 Q70 60 80 80"/>
        <path d="M100 80 Q110 60 120 80"/>
        <circle cx="80" cy="80" r="3" fill="#1e293b"/>
        <circle cx="120" cy="80" r="3" fill="#1e293b"/>
        <path d="M85 100 Q100 110 115 100"/>
      </g>
      <line x1="180" y1="180" x2="200" y2="160" stroke="#475569" stroke-width="5"/>
      <polygon points="200,160 205,155 210,165" fill="#1e293b"/>
      <text x="120" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#92400e" font-weight="700">ескіз / начерк</text>`,
      230,
    ),

  /* --------------------------- ART MATERIALS --------------------------- */

  watercolor: () =>
    svg(
      "0 0 280 180",
      `
      <rect x="20" y="40" width="220" height="100" rx="6" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      ${[
        "#dc2626", "#f97316", "#facc15", "#84cc16", "#16a34a", "#0ea5e9", "#2563eb", "#7c3aed",
      ]
        .map(
          (c, i) =>
            `<circle cx="${50 + i * 24}" cy="90" r="11" fill="${c}"/>`,
        )
        .join("")}
      <g transform="translate(50 30)">
        <path d="M0 0 L0 -20 Q-2 -28 0 -28 Q2 -28 0 -20 Z" fill="#94a3b8"/>
      </g>
      <text x="240" y="50" font-family="Inter, Arial" font-size="11" fill="#bae6fd">💧</text>
      <text x="130" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">акварель — розводиться водою</text>`,
      270,
    ),

  oilPaint: () =>
    svg(
      "0 0 280 140",
      `
      ${["#dc2626", "#fbbf24", "#16a34a", "#1d4ed8", "#7c3aed"].map(
        (c, i) => `
        <rect x="${20 + i * 50}" y="20" width="40" height="90" rx="4" fill="#475569" stroke="#94a3b8" stroke-width="1"/>
        <rect x="${22 + i * 50}" y="36" width="36" height="60" fill="${c}"/>
        <circle cx="${40 + i * 50}" cy="20" r="6" fill="#94a3b8"/>`,
      ).join("")}
      <text x="140" y="130" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">олійні фарби (тюбики)</text>`,
      270,
    ),

  pastel: () =>
    svg(
      "0 0 280 140",
      `
      ${["#dc2626", "#f97316", "#facc15", "#84cc16", "#16a34a", "#0ea5e9", "#7c3aed", "#db2777"].map(
        (c, i) => `<rect x="${20 + i * 32}" y="40" width="22" height="80" rx="6" fill="${c}" stroke="#0f172a" stroke-width="1.5"/>`,
      ).join("")}
      <text x="140" y="32" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">пастель — кольорові олівці-палички</text>`,
      270,
    ),

  gouache: () =>
    svg(
      "0 0 280 160",
      `
      ${["#dc2626", "#fbbf24", "#16a34a", "#1d4ed8", "#7c3aed", "#fff"].map(
        (c, i) => `
        <rect x="${20 + i * 42}" y="40" width="34" height="80" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
        <rect x="${22 + i * 42}" y="58" width="30" height="40" fill="${c}"/>
        <circle cx="${37 + i * 42}" cy="40" r="4" fill="#475569"/>`,
      ).join("")}
      <text x="140" y="150" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">гуаш (баночки)</text>`,
      270,
    ),

  brush: () =>
    svg(
      "0 0 280 120",
      `
      <rect x="20" y="50" width="180" height="14" rx="3" fill="#7c2d12"/>
      <rect x="200" y="48" width="30" height="18" rx="2" fill="#94a3b8"/>
      <path d="M230 48 L260 40 L270 57 L260 73 L230 65 Z" fill="#1d4ed8"/>
      <text x="140" y="100" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">пензель</text>`,
      270,
    ),

  easel: () =>
    svg(
      "0 0 260 240",
      `
      <line x1="60" y1="220" x2="100" y2="40" stroke="#7c2d12" stroke-width="6"/>
      <line x1="200" y1="220" x2="160" y2="40" stroke="#7c2d12" stroke-width="6"/>
      <line x1="130" y1="220" x2="130" y2="40" stroke="#7c2d12" stroke-width="6"/>
      <rect x="70" y="80" width="120" height="100" fill="#fde68a" stroke="#92400e" stroke-width="3"/>
      <rect x="75" y="85" width="110" height="90" fill="#fef3c7"/>
      <circle cx="120" cy="130" r="14" fill="#fbbf24"/>
      <polygon points="100,170 130,140 150,170" fill="#16a34a"/>
      <line x1="50" y1="190" x2="210" y2="190" stroke="#7c2d12" stroke-width="4"/>
      <text x="130" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">мольберт</text>`,
      230,
    ),

  palette: () =>
    svg(
      "0 0 240 200",
      `
      <defs>
        <linearGradient id="pal" x1="0" x2="1">
          <stop offset="0" stop-color="#92400e"/><stop offset="1" stop-color="#fbbf24"/>
        </linearGradient>
      </defs>
      <path d="M40 120 Q40 40 130 40 Q220 40 220 110 Q220 160 160 160 Q140 130 110 145 Q70 155 40 120 Z" fill="url(#pal)" stroke="#451a03" stroke-width="2"/>
      <circle cx="130" cy="135" r="10" fill="none" stroke="#451a03" stroke-width="2"/>
      <circle cx="80" cy="80" r="10" fill="#dc2626"/>
      <circle cx="120" cy="70" r="10" fill="#facc15"/>
      <circle cx="160" cy="80" r="10" fill="#1d4ed8"/>
      <circle cx="190" cy="105" r="10" fill="#16a34a"/>
      <circle cx="100" cy="105" r="10" fill="#f97316"/>
      <circle cx="160" cy="115" r="10" fill="#7c3aed"/>
      <text x="130" y="188" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">палітра</text>`,
      220,
    ),

  /* --------------------------- UKRAINIAN FOLK ART --------------------------- */

  petrykivka: () =>
    svg(
      "0 0 280 200",
      `
      <rect width="280" height="200" fill="#fef3c7"/>
      <g transform="translate(140 100)">
        <ellipse cx="0" cy="0" rx="30" ry="22" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
        <ellipse cx="0" cy="-2" rx="14" ry="10" fill="#fbbf24"/>
        <ellipse cx="-50" cy="-20" rx="18" ry="12" fill="#16a34a" transform="rotate(-30 -50 -20)"/>
        <ellipse cx="50" cy="-20" rx="18" ry="12" fill="#16a34a" transform="rotate(30 50 -20)"/>
        <ellipse cx="-60" cy="20" rx="14" ry="8" fill="#16a34a"/>
        <ellipse cx="60" cy="20" rx="14" ry="8" fill="#16a34a"/>
        <circle cx="-80" cy="-10" r="8" fill="#facc15"/>
        <circle cx="80" cy="-10" r="8" fill="#facc15"/>
        <circle cx="-30" cy="40" r="6" fill="#dc2626"/>
        <circle cx="30" cy="40" r="6" fill="#dc2626"/>
        <circle cx="0" cy="50" r="8" fill="#7c3aed"/>
      </g>
      <text x="140" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#7f1d1d" font-weight="800">петриківський розпис</text>`,
      270,
    ),

  vyshyvanka: () =>
    svg(
      "0 0 240 240",
      `
      <path d="M60 60 L100 30 L140 30 L180 60 L180 110 L160 100 L160 220 L80 220 L80 100 L60 110 Z" fill="#fff" stroke="#dc2626" stroke-width="2.5"/>
      <rect x="80" y="60" width="80" height="14" fill="none" stroke="#dc2626" stroke-width="2"/>
      <g fill="#dc2626">
        ${[80, 100, 120, 140]
          .map(
            (x) =>
              `<polygon points="${x},62 ${x + 8},68 ${x},74 ${x - 8},68"/>`,
          )
          .join("")}
      </g>
      <g stroke="#0f172a" stroke-width="1">
        <line x1="80" y1="100" x2="160" y2="100"/>
        <line x1="80" y1="120" x2="160" y2="120"/>
      </g>
      ${[110, 130, 150, 170, 190]
        .map(
          (y) =>
            `<g fill="#dc2626" transform="translate(120 ${y})"><polygon points="-30,0 -22,-4 -22,4"/><polygon points="-10,0 -2,-4 -2,4"/><polygon points="10,0 18,-4 18,4"/><polygon points="30,0 22,-4 22,4"/></g>`,
        )
        .join("")}
      <text x="120" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">вишиванка</text>`,
      220,
    ),

  pysanka: () =>
    svg(
      "0 0 220 240",
      `
      <ellipse cx="110" cy="110" rx="80" ry="100" fill="#fbbf24" stroke="#7f1d1d" stroke-width="3"/>
      <path d="M30 110 Q110 80 190 110" stroke="#7f1d1d" stroke-width="2" fill="none"/>
      <path d="M30 110 Q110 140 190 110" stroke="#7f1d1d" stroke-width="2" fill="none"/>
      <line x1="110" y1="10" x2="110" y2="210" stroke="#7f1d1d" stroke-width="1.5"/>
      <g fill="#dc2626">
        <circle cx="60" cy="80" r="6"/>
        <circle cx="160" cy="80" r="6"/>
        <circle cx="60" cy="140" r="6"/>
        <circle cx="160" cy="140" r="6"/>
      </g>
      <g fill="#16a34a" stroke="#14532d" stroke-width="1">
        <polygon points="110,30 116,50 100,50"/>
        <polygon points="110,180 116,200 100,200"/>
        <polygon points="40,110 30,116 30,104"/>
        <polygon points="180,110 190,116 190,104"/>
      </g>
      <g stroke="#7f1d1d" stroke-width="1" fill="none">
        <path d="M65 105 Q80 110 95 105"/>
        <path d="M125 105 Q140 110 155 105"/>
      </g>
      <text x="110" y="230" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">писанка</text>`,
      200,
    ),

  krashanka: () =>
    svg(
      "0 0 220 240",
      `
      <defs>
        <radialGradient id="kr" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0" stop-color="#fca5a5"/><stop offset="1" stop-color="#b91c1c"/>
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="110" rx="80" ry="100" fill="url(#kr)" stroke="#7f1d1d" stroke-width="2"/>
      <text x="110" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fca5a5" font-weight="800">крашанка (один колір)</text>`,
      200,
    ),

  trident: () =>
    svg(
      "0 0 200 240",
      `
      <rect x="10" y="20" width="180" height="200" rx="14" fill="#1d4ed8" stroke="#fbbf24" stroke-width="3"/>
      <g fill="#fde68a" stroke="#92400e" stroke-width="2">
        <path d="M100 50 L100 200" stroke-width="6" fill="none" stroke="#fde68a"/>
        <path d="M55 75 L55 130 Q70 150 95 150" stroke-width="6" fill="none" stroke="#fde68a"/>
        <path d="M145 75 L145 130 Q130 150 105 150" stroke-width="6" fill="none" stroke="#fde68a"/>
        <path d="M55 75 L55 60" stroke-width="6" fill="none" stroke="#fde68a"/>
        <path d="M145 75 L145 60" stroke-width="6" fill="none" stroke="#fde68a"/>
        <path d="M100 50 L80 70 L100 80 L120 70 Z"/>
        <path d="M55 60 L40 75 L55 80"/>
        <path d="M145 60 L160 75 L145 80"/>
        <ellipse cx="100" cy="200" rx="32" ry="8"/>
      </g>
      <text x="100" y="232" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">тризуб — герб України</text>`,
      200,
    ),

  ukraineFlag: () =>
    svg(
      "0 0 280 180",
      `
      <rect x="40" y="20" width="200" height="60" fill="#005bbb"/>
      <rect x="40" y="80" width="200" height="60" fill="#ffd500"/>
      <rect x="40" y="20" width="200" height="120" fill="none" stroke="#fff" stroke-width="1.5"/>
      <text x="140" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">🇺🇦 Прапор України</text>`,
      270,
    ),

  icon: () =>
    svg(
      "0 0 220 260",
      `
      <rect x="20" y="20" width="180" height="220" rx="6" fill="#7c2d12" stroke="#fbbf24" stroke-width="4"/>
      <rect x="35" y="35" width="150" height="190" fill="#451a03"/>
      <circle cx="110" cy="100" r="36" fill="#fde68a"/>
      <ellipse cx="110" cy="130" rx="50" ry="70" fill="#0c4a6e"/>
      <ellipse cx="110" cy="100" rx="28" ry="32" fill="#fda4af"/>
      <circle cx="110" cy="80" r="48" fill="none" stroke="#fbbf24" stroke-width="3"/>
      <ellipse cx="135" cy="135" rx="14" ry="18" fill="#fda4af"/>
      <circle cx="135" cy="125" r="14" fill="#fda4af"/>
      <circle cx="135" cy="118" r="20" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <text x="110" y="250" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">ікона Богородиці</text>`,
      210,
    ),

  mosaic: () =>
    svg(
      "0 0 240 200",
      `
      ${[...Array(15)]
        .map(() => {
          const x = Math.floor(Math.random() * 20) * 11 + 10;
          const y = Math.floor(Math.random() * 15) * 11 + 10;
          const colors = ["#dc2626", "#fbbf24", "#16a34a", "#1d4ed8", "#7c3aed", "#fff"];
          return `<rect x="${x}" y="${y}" width="9" height="9" fill="${colors[Math.floor(Math.random() * colors.length)]}"/>`;
        })
        .join("")}
      ${(() => {
        const out = [];
        for (let y = 10; y < 170; y += 11) {
          for (let x = 10; x < 230; x += 11) {
            const dx = x - 120, dy = y - 80;
            const inHeart = dy < 0 && Math.abs(dx) < 60 && (dx * dx + (dy + 20) ** 2 < 1600);
            const c = inHeart || (Math.abs(dx) < 50 && y > 80 && y < 130 && y < 130 - Math.abs(dx)) ? "#dc2626" : ((x + y) % 22 === 0 ? "#fbbf24" : "#16a34a");
            out.push(`<rect x="${x}" y="${y}" width="9" height="9" fill="${c}" opacity="0.85"/>`);
          }
        }
        return out.join("");
      })()}
      <text x="120" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">мозаїка</text>`,
      230,
    ),

  rushnyk: () =>
    svg(
      "0 0 260 200",
      `
      <rect x="20" y="40" width="220" height="120" fill="#fff" stroke="#dc2626" stroke-width="2"/>
      <rect x="20" y="55" width="220" height="10" fill="none" stroke="#dc2626" stroke-width="1.5"/>
      <rect x="20" y="135" width="220" height="10" fill="none" stroke="#dc2626" stroke-width="1.5"/>
      ${[70, 80, 90, 105, 120, 135]
        .map((y) =>
          `<g transform="translate(0 ${y})" fill="#dc2626">${[...Array(10)]
            .map((_, i) => `<polygon points="${30 + i * 22},0 ${36 + i * 22},6 ${30 + i * 22},12 ${24 + i * 22},6"/>`)
            .join("")}</g>`,
        )
        .join("")}
      <text x="130" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">рушник з вишитими орнаментами</text>`,
      250,
    ),

  /* --------------------------- SCULPTURE / ARCHITECTURE / DANCE --------------------------- */

  sculpture: () =>
    svg(
      "0 0 220 240",
      `
      <rect x="60" y="190" width="100" height="30" fill="#475569" stroke="#1e293b" stroke-width="2"/>
      <rect x="50" y="180" width="120" height="14" fill="#64748b"/>
      <circle cx="110" cy="60" r="22" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
      <path d="M85 80 Q70 130 80 180 L140 180 Q150 130 135 80 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
      <line x1="90" y1="100" x2="70" y2="140" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
      <line x1="130" y1="100" x2="150" y2="140" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
      <text x="110" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">скульптура</text>`,
      210,
    ),

  architecture: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="40" y="80" width="200" height="100" fill="#cbd5e1"/>
      <polygon points="40,80 240,80 140,30" fill="#dc2626"/>
      <rect x="120" y="120" width="40" height="60" fill="#7c2d12"/>
      <rect x="60" y="100" width="30" height="30" fill="#fbbf24"/>
      <rect x="190" y="100" width="30" height="30" fill="#fbbf24"/>
      <line x1="75" y1="100" x2="75" y2="130" stroke="#7c2d12"/>
      <line x1="60" y1="115" x2="90" y2="115" stroke="#7c2d12"/>
      <line x1="205" y1="100" x2="205" y2="130" stroke="#7c2d12"/>
      <line x1="190" y1="115" x2="220" y2="115" stroke="#7c2d12"/>
      <text x="140" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">архітектура</text>`,
      270,
    ),

  hopak: () =>
    svg(
      "0 0 240 240",
      `
      <ellipse cx="120" cy="220" rx="100" ry="8" fill="#0f172a"/>
      <g transform="translate(80 120)">
        <circle cx="0" cy="-50" r="14" fill="#fda4af"/>
        <path d="M-20 -38 L20 -38 L26 30 L-26 30 Z" fill="#1d4ed8"/>
        <rect x="-22" y="-44" width="44" height="14" fill="#fde68a" stroke="#dc2626" stroke-width="1.5"/>
        <line x1="-20" y1="0" x2="-50" y2="40" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
        <line x1="20" y1="0" x2="50" y2="-20" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
        <line x1="-12" y1="30" x2="-30" y2="80" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
        <line x1="12" y1="30" x2="50" y2="50" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      </g>
      <g transform="translate(160 130)">
        <circle cx="0" cy="-46" r="12" fill="#fda4af"/>
        <path d="M-18 -36 L18 -36 L22 30 L-22 30 Z" fill="#dc2626"/>
        <line x1="-18" y1="0" x2="-44" y2="-20" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
        <line x1="18" y1="0" x2="44" y2="40" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
        <line x1="-10" y1="30" x2="-26" y2="70" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
        <line x1="10" y1="30" x2="34" y2="70" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      </g>
      <text x="120" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">гопак</text>`,
      220,
    ),

  choreography: () =>
    svg(
      "0 0 240 200",
      `
      <g transform="translate(120 100)" stroke="#fbbf24" stroke-width="6" stroke-linecap="round" fill="none">
        <circle cx="0" cy="-50" r="12" fill="#fde68a" stroke="none"/>
        <line x1="0" y1="-38" x2="0" y2="20"/>
        <line x1="0" y1="-20" x2="-40" y2="-40"/>
        <line x1="0" y1="-20" x2="40" y2="-40"/>
        <line x1="0" y1="20" x2="-25" y2="70"/>
        <line x1="0" y1="20" x2="35" y2="55"/>
      </g>
      <path d="M40 180 Q120 200 200 180" stroke="#fbbf24" stroke-width="2" fill="none"/>
      <text x="120" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">хореографія</text>`,
      220,
    ),

  graphics: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="20" y="20" width="200" height="140" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      <g stroke="#0f172a" stroke-width="2" fill="none">
        <path d="M40 60 L200 60"/>
        <path d="M40 80 L180 80"/>
        <path d="M40 100 L200 100"/>
        <path d="M40 120 L160 120"/>
        <path d="M40 140 L200 140"/>
        <path d="M50 50 L60 70 L70 50 L80 70"/>
      </g>
      <text x="120" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#92400e" font-weight="800">графіка — лінії та штрихи</text>`,
      230,
    ),

  /* --------------------------- MUSIC NOTATION --------------------------- */

  staff: () =>
    svg(
      "0 0 320 140",
      `
      ${[40, 60, 80, 100, 120]
        .map(
          (y) =>
            `<line x1="20" y1="${y}" x2="300" y2="${y}" stroke="#fde68a" stroke-width="1.5"/>`,
        )
        .join("")}
      <line x1="20" y1="40" x2="20" y2="120" stroke="#fde68a" stroke-width="2.5"/>
      <line x1="300" y1="40" x2="300" y2="120" stroke="#fde68a" stroke-width="2.5"/>
      <g transform="translate(30 80) scale(0.7)" fill="#fbbf24">
        <path d="M0 0 C-10 -20 -10 -40 5 -55 C20 -70 30 -50 25 -30 C20 -10 0 0 -5 20 C-10 40 5 50 15 40 C20 35 18 25 10 25 C0 25 -8 35 -3 50 C0 60 15 60 25 50"
              fill="none" stroke="#fbbf24" stroke-width="3"/>
      </g>
      <g fill="#fde68a">
        <ellipse cx="120" cy="100" rx="9" ry="7" transform="rotate(-20 120 100)"/>
        <line x1="128" y1="100" x2="128" y2="60" stroke="#fde68a" stroke-width="2"/>
        <ellipse cx="170" cy="90" rx="9" ry="7" transform="rotate(-20 170 90)"/>
        <line x1="178" y1="90" x2="178" y2="50" stroke="#fde68a" stroke-width="2"/>
        <ellipse cx="220" cy="80" rx="9" ry="7" transform="rotate(-20 220 80)"/>
        <line x1="228" y1="80" x2="228" y2="40" stroke="#fde68a" stroke-width="2"/>
        <ellipse cx="270" cy="70" rx="9" ry="7" transform="rotate(-20 270 70)"/>
        <line x1="278" y1="70" x2="278" y2="30" stroke="#fde68a" stroke-width="2"/>
      </g>
      <text x="160" y="134" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a">нотний стан з 5 ліній</text>`,
      310,
    ),

  trebleClef: () =>
    svg(
      "0 0 200 220",
      `
      ${[60, 90, 120, 150, 180]
        .map((y) => `<line x1="20" y1="${y}" x2="180" y2="${y}" stroke="#fde68a" stroke-width="1.5"/>`)
        .join("")}
      <g transform="translate(100 130) scale(1.4)" stroke="#fbbf24" stroke-width="3.5" fill="none">
        <path d="M0 0 C-10 -20 -10 -40 5 -55 C20 -70 30 -50 25 -30 C20 -10 0 0 -5 20 C-10 40 5 50 15 40 C20 35 18 25 10 25 C0 25 -8 35 -3 50 C0 60 15 60 25 50"/>
        <circle cx="-3" cy="50" r="4" fill="#fbbf24"/>
      </g>
      <text x="100" y="212" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">скрипковий ключ</text>`,
      200,
    ),

  solfege: () =>
    svg(
      "0 0 360 100",
      `
      ${["до", "ре", "мі", "фа", "соль", "ля", "сі"]
        .map(
          (n, i) =>
            `<g transform="translate(${30 + i * 45} 50)">
              <circle r="20" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
              <text y="6" text-anchor="middle" font-family="Inter, Arial" font-size="13" font-weight="800" fill="#7c2d12">${n}</text>
            </g>`,
        )
        .join("")}
      <text x="180" y="92" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a">7 нот мажорної гами</text>`,
      340,
    ),

  /* --------------------------- INSTRUMENTS --------------------------- */

  piano: () =>
    svg(
      "0 0 280 160",
      `
      <rect x="20" y="40" width="240" height="80" fill="#fff" stroke="#0f172a" stroke-width="2"/>
      ${[...Array(13)]
        .map(
          (_, i) =>
            `<line x1="${20 + (i + 1) * (240 / 14)}" y1="40" x2="${20 + (i + 1) * (240 / 14)}" y2="120" stroke="#0f172a" stroke-width="1"/>`,
        )
        .join("")}
      ${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12]
        .filter((i) => ![2, 6, 9, 13].includes(i))
        .map(
          (i) =>
            `<rect x="${20 + (i + 1) * (240 / 14) - 8}" y="40" width="16" height="50" fill="#0f172a"/>`,
        )
        .join("")}
      <text x="140" y="146" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">піаніно — клавішний</text>`,
      270,
    ),

  violin: () =>
    svg(
      "0 0 220 280",
      `
      <g transform="translate(110 140)">
        <path d="M-30 -100 Q-50 -90 -50 -50 Q-40 -20 -55 0 Q-60 30 -45 60 Q-30 90 0 100 Q30 90 45 60 Q60 30 55 0 Q40 -20 50 -50 Q50 -90 30 -100 Q15 -110 0 -110 Q-15 -110 -30 -100 Z" fill="#92400e" stroke="#451a03" stroke-width="2"/>
        <rect x="-3" y="-130" width="6" height="40" fill="#451a03"/>
        <line x1="0" y1="-100" x2="0" y2="90" stroke="#fde68a" stroke-width="0.8"/>
        <line x1="-4" y1="-100" x2="-4" y2="90" stroke="#fde68a" stroke-width="0.8"/>
        <line x1="4" y1="-100" x2="4" y2="90" stroke="#fde68a" stroke-width="0.8"/>
        <line x1="-8" y1="-100" x2="-8" y2="90" stroke="#fde68a" stroke-width="0.8"/>
        <path d="M-12 15 Q-8 8 -4 15 Q0 25 -12 25 Z M12 15 Q8 8 4 15 Q0 25 12 25 Z" fill="#0f172a"/>
        <line x1="60" y1="-80" x2="100" y2="120" stroke="#451a03" stroke-width="3"/>
      </g>
      <text x="110" y="270" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">скрипка</text>`,
      200,
    ),

  flute: () =>
    svg(
      "0 0 320 100",
      `
      <rect x="20" y="40" width="280" height="14" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <rect x="20" y="40" width="20" height="14" fill="#475569"/>
      ${[80, 110, 140, 170, 200, 230, 260]
        .map((x) => `<circle cx="${x}" cy="47" r="4" fill="#0f172a"/>`)
        .join("")}
      <text x="160" y="86" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">флейта — духовий</text>`,
      300,
    ),

  drum: () =>
    svg(
      "0 0 240 220",
      `
      <ellipse cx="120" cy="60" rx="80" ry="20" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      <rect x="40" y="60" width="160" height="100" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
      <ellipse cx="120" cy="160" rx="80" ry="20" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
      ${[60, 90, 120, 150, 180]
        .map(
          (x) =>
            `<line x1="${x}" y1="60" x2="${x - 4}" y2="160" stroke="#fde68a" stroke-width="1.5"/>`,
        )
        .join("")}
      <line x1="170" y1="30" x2="220" y2="60" stroke="#7c2d12" stroke-width="5"/>
      <line x1="55" y1="20" x2="105" y2="50" stroke="#7c2d12" stroke-width="5"/>
      <text x="120" y="206" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">барабан — ударний</text>`,
      230,
    ),

  guitar: () =>
    svg(
      "0 0 200 280",
      `
      <g transform="translate(100 150)">
        <circle cx="0" cy="40" r="60" fill="#92400e" stroke="#451a03" stroke-width="2"/>
        <circle cx="0" cy="40" r="14" fill="#0f172a"/>
        <rect x="-50" y="-20" width="100" height="50" fill="#92400e" stroke="#451a03" stroke-width="2"/>
        <rect x="-12" y="-130" width="24" height="110" fill="#451a03"/>
        <rect x="-12" y="-145" width="24" height="20" fill="#92400e"/>
        ${[-9, -3, 3, 9, -6, 6]
          .map((x, i) => `<circle cx="${x}" cy="${-145 + i * 2}" r="2" fill="#cbd5e1"/>`)
          .join("")}
        <g stroke="#fde68a" stroke-width="0.6">
          ${[-9, -5, -2, 2, 5, 9].map((x) => `<line x1="${x}" y1="-125" x2="${x}" y2="90"/>`).join("")}
        </g>
        ${[-110, -90, -70, -50, -35]
          .map(
            (y) =>
              `<line x1="-12" y1="${y}" x2="12" y2="${y}" stroke="#94a3b8" stroke-width="1"/>`,
          )
          .join("")}
      </g>
      <text x="100" y="270" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">гітара — 6 струн</text>`,
      190,
    ),

  bandura: () =>
    svg(
      "0 0 220 280",
      `
      <path d="M30 30 Q110 10 190 30 L190 220 Q150 260 110 260 Q70 260 30 220 Z" fill="#92400e" stroke="#451a03" stroke-width="2"/>
      <ellipse cx="80" cy="140" rx="22" ry="14" fill="#0f172a"/>
      ${[...Array(14)]
        .map(
          (_, i) =>
            `<line x1="${50 + i * 10}" y1="40" x2="${50 + i * 8 - 10}" y2="240" stroke="#fde68a" stroke-width="0.8"/>`,
        )
        .join("")}
      <text x="110" y="274" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">бандура — український нар.</text>`,
      210,
    ),

  trembita: () =>
    svg(
      "0 0 360 100",
      `
      <path d="M20 50 L330 38 L350 45 L350 55 L330 62 L20 50 Z" fill="#7c2d12" stroke="#451a03" stroke-width="2"/>
      ${[80, 140, 200, 260].map((x) => `<line x1="${x}" y1="42" x2="${x}" y2="58" stroke="#451a03"/>`).join("")}
      <text x="180" y="86" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">трембіта — Карпати</text>`,
      330,
    ),

  sopilka: () =>
    svg(
      "0 0 320 90",
      `
      <rect x="20" y="36" width="280" height="14" rx="3" fill="#92400e" stroke="#451a03" stroke-width="1.5"/>
      ${[80, 110, 140, 170, 200, 230]
        .map((x) => `<circle cx="${x}" cy="43" r="3.5" fill="#0f172a"/>`)
        .join("")}
      <text x="160" y="74" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">сопілка</text>`,
      300,
    ),

  /* --------------------------- ENSEMBLES --------------------------- */

  orchestra: () =>
    svg(
      "0 0 320 180",
      `
      <ellipse cx="160" cy="170" rx="150" ry="20" fill="#0f172a"/>
      ${[
        [60, 120, "#dc2626", "🎻"],
        [100, 120, "#dc2626", "🎻"],
        [140, 120, "#fbbf24", "🎺"],
        [180, 120, "#fbbf24", "🎷"],
        [220, 120, "#16a34a", "🥁"],
        [260, 120, "#7c3aed", "🎹"],
        [80, 80, "#dc2626", "🎻"],
        [200, 80, "#fbbf24", "🎺"],
      ]
        .map(([x, y, c, e]) => `<g transform="translate(${x} ${y})"><circle r="18" fill="${c}" opacity="0.85"/><text y="6" text-anchor="middle" font-size="18">${e}</text></g>`)
        .join("")}
      <g transform="translate(160 40)">
        <circle r="14" fill="#fde68a"/>
        <line x1="0" y1="14" x2="0" y2="40" stroke="#fde68a" stroke-width="4"/>
        <line x1="-14" y1="20" x2="14" y2="20" stroke="#fde68a" stroke-width="3"/>
      </g>
      <text x="160" y="22" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="800">оркестр</text>`,
      300,
    ),

  choir: () =>
    svg(
      "0 0 320 200",
      `
      ${[40, 80, 120, 160, 200, 240, 280]
        .map((x, i) => `
          <g transform="translate(${x} ${100 + (i % 2) * 20})">
            <circle cx="0" cy="-20" r="14" fill="#fda4af"/>
            <path d="M-18 -8 Q-18 30 0 30 Q18 30 18 -8 Z" fill="#1d4ed8"/>
            <path d="M-12 -25 Q-12 -45 0 -50 Q12 -45 12 -25" fill="#451a03"/>
            <text x="0" y="-12" text-anchor="middle" font-size="11">♪</text>
          </g>`)
        .join("")}
      <text x="160" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">хор</text>`,
      300,
    ),

  soloDuetTrio: (n, label) =>
    svg(
      "0 0 280 200",
      `
      ${[...Array(n)]
        .map((_, i) => {
          const x = 140 + (i - (n - 1) / 2) * 60;
          return `<g transform="translate(${x} 100)">
            <circle cx="0" cy="-20" r="14" fill="#fda4af"/>
            <path d="M-18 -8 Q-18 40 0 40 Q18 40 18 -8 Z" fill="#1d4ed8"/>
            <text x="0" y="-15" text-anchor="middle" font-size="14">♪</text>
          </g>`;
        })
        .join("")}
      <text x="140" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fde68a" font-weight="800">${label}</text>`,
      270,
    ),

  conductor: () =>
    svg(
      "0 0 240 240",
      `
      <g transform="translate(120 120)">
        <circle cx="0" cy="-50" r="16" fill="#fda4af"/>
        <path d="M-22 -38 Q-22 50 0 50 Q22 50 22 -38 Z" fill="#0f172a"/>
        <line x1="22" y1="-30" x2="80" y2="-80" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
        <line x1="80" y1="-80" x2="100" y2="-100" stroke="#fde68a" stroke-width="3"/>
        <line x1="-22" y1="-30" x2="-50" y2="0" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
      </g>
      <text x="120" y="232" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">диригент</text>`,
      220,
    ),

  /* --------------------------- DYNAMICS / SYMBOLS --------------------------- */

  forte: () =>
    svg(
      "0 0 220 140",
      `
      <text x="110" y="100" text-anchor="middle" font-family="Times, serif" font-style="italic" font-size="86" font-weight="900" fill="#fbbf24">f</text>
      <text x="110" y="128" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">forte — голосно</text>`,
      200,
    ),

  piano_dyn: () =>
    svg(
      "0 0 220 140",
      `
      <text x="110" y="100" text-anchor="middle" font-family="Times, serif" font-style="italic" font-size="78" font-weight="900" fill="#bae6fd">p</text>
      <text x="110" y="128" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">piano — тихо</text>`,
      200,
    ),

  sharp: () =>
    svg(
      "0 0 220 140",
      `
      <text x="110" y="100" text-anchor="middle" font-family="serif" font-size="86" font-weight="900" fill="#fbbf24">♯</text>
      <text x="110" y="128" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">діез ♯ — підвищує на півтон</text>`,
      200,
    ),

  flat: () =>
    svg(
      "0 0 220 140",
      `
      <text x="110" y="100" text-anchor="middle" font-family="serif" font-size="86" font-weight="900" fill="#bae6fd">♭</text>
      <text x="110" y="128" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">бемоль ♭ — знижує на півтон</text>`,
      200,
    ),

  pause: () =>
    svg(
      "0 0 220 140",
      `
      <rect x="80" y="60" width="60" height="14" fill="#fbbf24"/>
      <text x="110" y="124" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">пауза — перерва у звуку</text>`,
      200,
    ),

  tempo: () =>
    svg(
      "0 0 220 200",
      `
      <polygon points="60,180 160,180 130,40 90,40" fill="#7c2d12" stroke="#451a03" stroke-width="2"/>
      <line x1="110" y1="170" x2="60" y2="60" stroke="#fbbf24" stroke-width="4"/>
      <circle cx="60" cy="60" r="8" fill="#dc2626"/>
      <text x="110" y="194" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">темп — швидкість</text>`,
      200,
    ),

  /* --------------------------- THEATER / FILM --------------------------- */

  theaterMasks: () =>
    svg(
      "0 0 280 200",
      `
      <g transform="translate(80 100)">
        <ellipse cx="0" cy="0" rx="50" ry="60" fill="#fbbf24" stroke="#92400e" stroke-width="3"/>
        <ellipse cx="-15" cy="-10" rx="6" ry="8" fill="#0f172a"/>
        <ellipse cx="15" cy="-10" rx="6" ry="8" fill="#0f172a"/>
        <path d="M-20 20 Q0 40 20 20" stroke="#0f172a" stroke-width="3" fill="none"/>
      </g>
      <g transform="translate(200 100)">
        <ellipse cx="0" cy="0" rx="50" ry="60" fill="#1d4ed8" stroke="#0f172a" stroke-width="3"/>
        <ellipse cx="-15" cy="-10" rx="6" ry="8" fill="#fff"/>
        <ellipse cx="15" cy="-10" rx="6" ry="8" fill="#fff"/>
        <path d="M-20 30 Q0 10 20 30" stroke="#fff" stroke-width="3" fill="none"/>
      </g>
      <text x="140" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">театральні маски</text>`,
      270,
    ),

  puppetTheater: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="20" y="40" width="240" height="130" fill="#7c2d12" stroke="#451a03" stroke-width="3"/>
      <rect x="30" y="50" width="220" height="110" fill="#fef3c7"/>
      <line x1="30" y1="60" x2="250" y2="60" stroke="#92400e" stroke-width="3"/>
      <g fill="#dc2626">
        <line x1="100" y1="50" x2="100" y2="100" stroke="#0f172a" stroke-width="1"/>
        <circle cx="100" cy="110" r="14"/>
        <ellipse cx="94" cy="106" rx="2" ry="3" fill="#fff"/>
        <ellipse cx="106" cy="106" rx="2" ry="3" fill="#fff"/>
      </g>
      <g fill="#16a34a">
        <line x1="180" y1="50" x2="180" y2="100" stroke="#0f172a" stroke-width="1"/>
        <circle cx="180" cy="110" r="14"/>
        <ellipse cx="174" cy="106" rx="2" ry="3" fill="#fff"/>
        <ellipse cx="186" cy="106" rx="2" ry="3" fill="#fff"/>
      </g>
      <text x="140" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">ляльковий театр</text>`,
      270,
    ),

  actor: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="20" y="160" width="200" height="20" fill="#fbbf24"/>
      <rect x="20" y="20" width="200" height="10" fill="#7c2d12"/>
      ${[40, 100, 160, 220].map((x) => `<rect x="${x - 5}" y="30" width="10" height="160" fill="#7c2d12"/>`).join("")}
      <g transform="translate(120 140)">
        <circle cx="0" cy="-46" r="14" fill="#fda4af"/>
        <path d="M-22 -34 L22 -34 L20 30 L-20 30 Z" fill="#dc2626"/>
        <line x1="-22" y1="-10" x2="-44" y2="20" stroke="#fda4af" stroke-width="5"/>
        <line x1="22" y1="-10" x2="40" y2="-20" stroke="#fda4af" stroke-width="5"/>
      </g>
      <text x="120" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">актор на сцені</text>`,
      220,
    ),

  director: () =>
    svg(
      "0 0 240 200",
      `
      <g transform="translate(80 100)">
        <circle cx="0" cy="-40" r="14" fill="#fda4af"/>
        <path d="M-20 -28 L20 -28 L24 50 L-24 50 Z" fill="#0f172a"/>
        <rect x="-26" y="-44" width="52" height="6" fill="#7c2d12"/>
      </g>
      <g transform="translate(180 100)">
        <rect x="-20" y="-30" width="40" height="40" fill="#0f172a" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="-10" cy="-15" r="6" fill="#cbd5e1"/>
        <circle cx="10" cy="-15" r="6" fill="#cbd5e1"/>
        <line x1="20" y1="-10" x2="35" y2="-15" stroke="#fbbf24" stroke-width="3"/>
      </g>
      <text x="120" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">режисер з камерою</text>`,
      220,
    ),

  script: () =>
    svg(
      "0 0 220 240",
      `
      <rect x="40" y="30" width="140" height="180" fill="#fff" stroke="#0f172a" stroke-width="2"/>
      <g stroke="#0f172a" stroke-width="1">
        ${[50, 70, 90, 110, 130, 150, 170, 190]
          .map((y) => `<line x1="55" y1="${y}" x2="${y < 90 ? 155 : 165}" y2="${y}"/>`)
          .join("")}
      </g>
      <rect x="50" y="40" width="60" height="6" fill="#dc2626"/>
      <text x="110" y="232" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">сценарій</text>`,
      200,
    ),

  /* --------------------------- CRAFTS --------------------------- */

  collage: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="10" y="10" width="220" height="180" fill="#fef3c7"/>
      <polygon points="40,40 100,30 110,90 40,100" fill="#dc2626" stroke="#0f172a" stroke-width="1"/>
      <polygon points="120,30 200,60 170,120 110,80" fill="#16a34a" stroke="#0f172a" stroke-width="1"/>
      <polygon points="40,110 130,100 140,170 50,180" fill="#1d4ed8" stroke="#0f172a" stroke-width="1"/>
      <polygon points="150,130 220,110 200,180 140,170" fill="#fbbf24" stroke="#0f172a" stroke-width="1"/>
      <text x="120" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#92400e" font-weight="800">колаж</text>`,
      230,
    ),

  origami: () =>
    svg(
      "0 0 220 200",
      `
      <g transform="translate(110 100)" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5">
        <polygon points="-60,-20 0,-50 60,-20 0,30"/>
        <polygon points="0,-50 -20,-20 0,10 20,-20" fill="#fda4af"/>
        <polygon points="-60,-20 -30,-10 -50,30" />
        <polygon points="60,-20 30,-10 50,30" />
        <polygon points="0,30 -10,60 10,60" />
      </g>
      <text x="110" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">орігамі</text>`,
      210,
    ),

  quilling: () =>
    svg(
      "0 0 240 200",
      `
      ${[
        [60, 80, "#dc2626"],
        [120, 60, "#fbbf24"],
        [180, 80, "#16a34a"],
        [80, 130, "#7c3aed"],
        [160, 130, "#0ea5e9"],
      ]
        .map(([cx, cy, c]) => {
          let path = `M${cx} ${cy} `;
          for (let i = 0; i < 24; i++) {
            const r = i * 1.4;
            const a = (i * Math.PI) / 6;
            path += `L${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)} `;
          }
          return `<path d="${path}" stroke="${c}" stroke-width="2" fill="none"/>`;
        })
        .join("")}
      <text x="120" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">квілінг — паперові смужки</text>`,
      230,
    ),

  macrame: () =>
    svg(
      "0 0 220 200",
      `
      <line x1="20" y1="40" x2="200" y2="40" stroke="#7c2d12" stroke-width="4"/>
      ${[50, 90, 130, 170]
        .map(
          (x) =>
            `<g stroke="#fde68a" stroke-width="3" fill="none">
              <path d="M${x} 40 Q${x - 8} 80 ${x + 8} 110 Q${x - 8} 140 ${x} 170"/>
              <circle cx="${x}" cy="90" r="4" fill="#fde68a"/>
              <circle cx="${x}" cy="130" r="4" fill="#fde68a"/>
            </g>`,
        )
        .join("")}
      <text x="110" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">макраме (плетіння вузлами)</text>`,
      210,
    ),

  vytynanka: () =>
    svg(
      "0 0 220 220",
      `
      <rect width="220" height="220" fill="#0d1117"/>
      <g transform="translate(110 110)" fill="#fff">
        ${[0, 60, 120, 180, 240, 300]
          .map(
            (a) =>
              `<g transform="rotate(${a})">
                <path d="M0 -10 Q-10 -50 0 -80 Q10 -50 0 -10 Z"/>
                <circle cx="0" cy="-60" r="6"/>
                <ellipse cx="-14" cy="-45" rx="6" ry="10" transform="rotate(-30 -14 -45)"/>
                <ellipse cx="14" cy="-45" rx="6" ry="10" transform="rotate(30 14 -45)"/>
              </g>`,
          )
          .join("")}
        <circle r="10"/>
      </g>
      <text x="110" y="212" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">витинанка</text>`,
      210,
    ),

  /* --------------------------- COSTUME --------------------------- */

  vinok: () =>
    svg(
      "0 0 260 200",
      `
      <ellipse cx="130" cy="100" rx="100" ry="20" fill="none" stroke="#16a34a" stroke-width="14"/>
      ${[30, 70, 110, 150, 190, 230]
        .map(
          (x, i) =>
            `<circle cx="${x}" cy="${100 + (i % 2 === 0 ? -8 : 8)}" r="12" fill="${["#dc2626", "#fbbf24", "#db2777", "#7c3aed", "#0ea5e9", "#dc2626"][i]}"/>`,
        )
        .join("")}
      <g stroke="#dc2626" stroke-width="6" stroke-linecap="round">
        <line x1="60" y1="120" x2="40" y2="180"/>
        <line x1="200" y1="120" x2="220" y2="180"/>
      </g>
      <g stroke="#fbbf24" stroke-width="6" stroke-linecap="round">
        <line x1="80" y1="120" x2="70" y2="180"/>
        <line x1="180" y1="120" x2="190" y2="180"/>
      </g>
      <text x="130" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">вінок із квітів і стрічок</text>`,
      240,
    ),

  khustka: () =>
    svg(
      "0 0 220 200",
      `
      <polygon points="40,40 180,40 110,180" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
      <g fill="#fbbf24">
        ${[70, 90, 110, 130, 150]
          .map(
            (x) =>
              `<polygon points="${x},60 ${x + 4},66 ${x},72 ${x - 4},66"/>`,
          )
          .join("")}
      </g>
      <g fill="#16a34a">
        <circle cx="80" cy="100" r="6"/>
        <circle cx="110" cy="115" r="6"/>
        <circle cx="140" cy="100" r="6"/>
      </g>
      <text x="110" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">хустка</text>`,
      210,
    ),

  sharovary: () =>
    svg(
      "0 0 240 240",
      `
      <path d="M70 40 Q70 100 50 200 L100 200 Q110 150 120 110 Q130 150 140 200 L190 200 Q170 100 170 40 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
      <rect x="68" y="34" width="104" height="14" fill="#fbbf24"/>
      <text x="120" y="232" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">шаровари</text>`,
      220,
    ),

  /* --------------------------- ANIMATION / COMIC / POSTER --------------------------- */

  animation: () =>
    svg(
      "0 0 320 160",
      `
      ${[40, 90, 140, 190, 240, 290]
        .map(
          (x, i) => `
          <rect x="${x - 22}" y="30" width="44" height="60" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
          <circle cx="${x}" cy="58" r="${10 + (i % 3) * 2}" fill="#facc15"/>
          <path d="M${x - 8} ${68 + (i % 2) * 4} Q${x} ${78 - (i % 2) * 4} ${x + 8} ${68 + (i % 2) * 4}" stroke="#0f172a" stroke-width="1.5" fill="none"/>`,
        )
        .join("")}
      <g stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3 3" fill="none">
        <line x1="22" y1="100" x2="312" y2="100"/>
      </g>
      <g stroke="#fde68a" stroke-width="1.5" fill="none" marker-end="url(#m_an)">
        <path d="M40 110 L290 110"/>
      </g>
      <defs>
        <marker id="m_an" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#fde68a"/>
        </marker>
      </defs>
      <text x="160" y="148" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">анімація — кадр за кадром</text>`,
      310,
    ),

  comic: () =>
    svg(
      "0 0 320 200",
      `
      ${[
        [10, 10],
        [110, 10],
        [210, 10],
        [10, 110],
        [110, 110],
        [210, 110],
      ]
        .map(
          ([x, y], i) =>
            `<rect x="${x}" y="${y}" width="90" height="80" fill="#fef3c7" stroke="#0f172a" stroke-width="2"/>
             <text x="${x + 45}" y="${y + 50}" text-anchor="middle" font-size="28">${["😮", "💥", "💭", "😅", "🚀", "🎉"][i]}</text>`,
        )
        .join("")}
      <text x="160" y="198" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="800">комікс — серія картинок</text>`,
      300,
    ),

  poster: () =>
    svg(
      "0 0 220 240",
      `
      <rect x="20" y="20" width="180" height="200" fill="#dc2626" stroke="#7f1d1d" stroke-width="3"/>
      <text x="110" y="80" text-anchor="middle" font-family="Inter, Arial" font-size="26" font-weight="900" fill="#fde68a">КОНЦЕРТ!</text>
      <text x="110" y="110" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fde68a">сьогодні о 19:00</text>
      <circle cx="110" cy="160" r="32" fill="#fbbf24"/>
      <text x="110" y="168" text-anchor="middle" font-family="Inter, Arial" font-size="36" font-weight="900" fill="#dc2626">♪</text>
      <text x="110" y="232" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">плакат</text>`,
      200,
    ),

  illustration: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="10" y="10" width="260" height="180" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      <g stroke="#0f172a" stroke-width="1">
        ${[35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185]
          .map((y) => `<line x1="30" y1="${y}" x2="155" y2="${y}"/>`)
          .join("")}
      </g>
      <g transform="translate(220 100)">
        <circle r="40" fill="#fbbf24"/>
        <ellipse cx="-12" cy="-5" rx="4" ry="6" fill="#0f172a"/>
        <ellipse cx="12" cy="-5" rx="4" ry="6" fill="#0f172a"/>
        <path d="M-15 15 Q0 25 15 15" stroke="#0f172a" stroke-width="2" fill="none"/>
      </g>
      <text x="140" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#92400e" font-weight="800">ілюстрація до тексту</text>`,
      270,
    ),

  miniature: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="10" y="10" width="260" height="180" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      ${[40, 60, 80, 100, 120, 140, 160, 180]
        .map((y) => `<line x1="30" y1="${y}" x2="260" y2="${y}" stroke="#0f172a" stroke-width="1"/>`)
        .join("")}
      <g transform="translate(35 50)">
        <text font-family="serif" font-size="36" font-weight="900" fill="#dc2626">М</text>
        <g stroke="#16a34a" stroke-width="2" fill="none">
          <path d="M30 -2 Q40 -10 50 -2"/>
          <circle cx="30" cy="-4" r="3" fill="#dc2626"/>
        </g>
      </g>
      <text x="140" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#92400e" font-weight="800">мініатюра / ілюстрація літери</text>`,
      270,
    ),

  /* --------------------------- OPERA, BALLET, SYMPHONY, MARCH, WALTZ, LULLABY --------------------------- */

  opera: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="10" y="10" width="260" height="180" fill="#0f172a" stroke="#fbbf24" stroke-width="3"/>
      <g fill="#7c2d12">
        <rect x="20" y="20" width="240" height="14"/>
        <path d="M20 34 Q50 60 20 90 M260 34 Q230 60 260 90"/>
        <path d="M20 34 L20 180" stroke="#7c2d12" stroke-width="14"/>
        <path d="M260 34 L260 180" stroke="#7c2d12" stroke-width="14"/>
      </g>
      <g transform="translate(110 130)">
        <circle cx="0" cy="-40" r="14" fill="#fda4af"/>
        <path d="M-22 -28 L22 -28 L20 30 L-20 30 Z" fill="#dc2626"/>
        <text x="0" y="-15" text-anchor="middle" font-size="14">♪</text>
      </g>
      <g transform="translate(170 130)">
        <circle cx="0" cy="-40" r="14" fill="#fda4af"/>
        <path d="M-22 -28 L22 -28 L20 30 L-20 30 Z" fill="#1d4ed8"/>
        <text x="0" y="-15" text-anchor="middle" font-size="14">♫</text>
      </g>
      <text x="140" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">опера — спів і театр</text>`,
      270,
    ),

  ballet: () =>
    svg(
      "0 0 240 240",
      `
      <ellipse cx="120" cy="220" rx="80" ry="10" fill="#0f172a"/>
      <g transform="translate(120 110)">
        <circle cx="0" cy="-60" r="12" fill="#fda4af"/>
        <line x1="0" y1="-48" x2="0" y2="40" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
        <line x1="0" y1="-20" x2="50" y2="-60" stroke="#fda4af" stroke-width="5" stroke-linecap="round"/>
        <line x1="0" y1="-20" x2="-50" y2="-60" stroke="#fda4af" stroke-width="5" stroke-linecap="round"/>
        <polygon points="-40,40 40,40 60,60 -60,60" fill="#fff" opacity="0.85"/>
        <line x1="-15" y1="60" x2="-35" y2="100" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
        <line x1="15" y1="60" x2="35" y2="100" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
      </g>
      <text x="120" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">балет — танець і музика</text>`,
      220,
    ),

  symphony: () =>
    svg(
      "0 0 280 180",
      `
      <ellipse cx="140" cy="160" rx="130" ry="14" fill="#0f172a"/>
      ${[
        [40, 110, "🎻"],
        [80, 110, "🎻"],
        [120, 110, "🎻"],
        [160, 110, "🎻"],
        [200, 110, "🎷"],
        [240, 110, "🎺"],
        [80, 70, "🥁"],
        [200, 70, "🎹"],
      ]
        .map(([x, y, e]) => `<text x="${x}" y="${y}" font-size="22">${e}</text>`)
        .join("")}
      <g transform="translate(140 30)" fill="#fde68a">
        <circle cy="10" r="14"/>
        <line x1="0" y1="24" x2="0" y2="44" stroke="#fde68a" stroke-width="4"/>
      </g>
      <text x="140" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">симфонія — для оркестру</text>`,
      270,
    ),

  march: () =>
    svg(
      "0 0 320 160",
      `
      <rect x="0" y="120" width="320" height="40" fill="#7c2d12"/>
      ${[60, 130, 200, 270]
        .map(
          (x) =>
            `<g transform="translate(${x} 90)">
              <circle cx="0" cy="-20" r="8" fill="#fda4af"/>
              <rect x="-10" y="-12" width="20" height="30" fill="#dc2626"/>
              <line x1="-8" y1="20" x2="-12" y2="32" stroke="#fda4af" stroke-width="4"/>
              <line x1="8" y1="20" x2="12" y2="32" stroke="#fda4af" stroke-width="4"/>
              <rect x="-6" y="-30" width="12" height="6" fill="#0f172a"/>
            </g>`,
        )
        .join("")}
      <text x="160" y="32" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">🥁 марш — раз, два, раз, два!</text>`,
      300,
    ),

  waltz: () =>
    svg(
      "0 0 280 200",
      `
      <ellipse cx="140" cy="180" rx="100" ry="14" fill="#0f172a"/>
      <g stroke="#fbbf24" stroke-width="2" fill="none">
        <path d="M40 160 Q100 120 80 80 Q60 30 130 60 Q200 90 170 130 Q140 170 80 160" marker-end="url(#w_a)"/>
      </g>
      <defs>
        <marker id="w_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#fbbf24"/></marker>
      </defs>
      <text x="140" y="32" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fbbf24" font-weight="800">вальс — раз-два-три, раз-два-три</text>`,
      270,
    ),

  lullaby: () =>
    svg(
      "0 0 240 200",
      `
      <path d="M40 140 Q120 70 200 140 Q200 170 40 170 Z" fill="#7c2d12"/>
      <path d="M50 140 Q120 80 190 140 Q190 160 50 160 Z" fill="#fde68a"/>
      <g transform="translate(120 125)">
        <circle cx="0" cy="0" r="14" fill="#fda4af"/>
        <ellipse cx="-4" cy="-2" rx="2" ry="3" fill="#0f172a"/>
        <ellipse cx="4" cy="-2" rx="2" ry="3" fill="#0f172a"/>
        <path d="M-4 4 Q0 8 4 4" stroke="#0f172a" stroke-width="1" fill="none"/>
      </g>
      <text x="60" y="60" font-family="Inter, Arial" font-size="22" fill="#fbbf24">♪</text>
      <text x="180" y="50" font-family="Inter, Arial" font-size="22" fill="#fbbf24">♫</text>
      <text x="80" y="50" font-family="Inter, Arial" font-size="18" fill="#fbbf24">♬</text>
      <text x="120" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">колискова</text>`,
      220,
    ),

  /* --------------------------- COMPOSERS / FOLK SONG --------------------------- */

  shchedryk: () =>
    svg(
      "0 0 280 180",
      `
      <rect x="10" y="10" width="260" height="160" fill="#0d1117"/>
      ${[60, 80, 100, 120]
        .map((y) => `<line x1="40" y1="${y}" x2="240" y2="${y}" stroke="#fde68a" stroke-width="1.5"/>`)
        .join("")}
      ${[
        [60, 100, 1],
        [80, 100, 0],
        [100, 90, 1],
        [120, 100, 0],
        [150, 100, 1],
        [170, 100, 0],
        [190, 90, 1],
        [210, 100, 0],
      ]
        .map(
          ([x, y, fl]) =>
            `<g><ellipse cx="${x}" cy="${y}" rx="6" ry="5" transform="rotate(-15 ${x} ${y})" fill="#fbbf24"/><line x1="${x + 6}" y1="${y}" x2="${x + 6}" y2="${y - 30}" stroke="#fbbf24" stroke-width="2"/>${fl ? `<path d="M${x + 6} ${y - 30} Q${x + 16} ${y - 24} ${x + 12} ${y - 14}" stroke="#fbbf24" stroke-width="2" fill="none"/>` : ""}</g>`,
        )
        .join("")}
      <text x="140" y="40" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fbbf24" font-weight="800">Щедрик — М. Леонтович</text>
      <text x="140" y="160" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a">(Carol of the Bells)</text>`,
      270,
    ),

  anthem: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="40" y="40" width="200" height="60" fill="#005bbb"/>
      <rect x="40" y="100" width="200" height="60" fill="#ffd500"/>
      <text x="140" y="76" text-anchor="middle" font-family="Inter, Arial" font-size="14" font-weight="900" fill="#fff">Ще не вмерла</text>
      <text x="140" y="138" text-anchor="middle" font-family="Inter, Arial" font-size="14" font-weight="900" fill="#1e293b">України…</text>
      <text x="140" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">🎵 Державний Гімн України</text>`,
      270,
    ),

  composer: () =>
    svg(
      "0 0 240 200",
      `
      <g transform="translate(120 100)">
        <circle cx="0" cy="-46" r="14" fill="#fda4af"/>
        <path d="M-22 -34 L22 -34 L24 40 L-24 40 Z" fill="#7c2d12"/>
      </g>
      <g transform="translate(70 130)">
        <rect x="0" y="0" width="50" height="40" fill="#fff" stroke="#0f172a"/>
        ${[8, 16, 24, 32]
          .map((y) => `<line x1="3" y1="${y}" x2="46" y2="${y}" stroke="#0f172a" stroke-width="0.7"/>`)
          .join("")}
        <text x="25" y="22" text-anchor="middle" font-size="11" fill="#fbbf24">♪♫</text>
      </g>
      <g transform="translate(150 110) rotate(-30)">
        <rect x="0" y="0" width="40" height="4" fill="#7c2d12"/>
        <polygon points="40,-2 50,2 40,6" fill="#0f172a"/>
      </g>
      <text x="120" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">композитор</text>`,
      220,
    ),

  folkSong: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="10" y="10" width="260" height="180" fill="#0d1117"/>
      <g fill="#16a34a">
        <ellipse cx="50" cy="160" rx="18" ry="6"/>
        <path d="M40 160 Q40 130 50 110 Q60 130 60 160"/>
      </g>
      <g fill="#dc2626">
        <circle cx="100" cy="100" r="8"/>
        <circle cx="180" cy="100" r="8"/>
        <circle cx="140" cy="80" r="8"/>
      </g>
      <text x="60" y="60" font-family="Inter, Arial" font-size="22" fill="#fbbf24">♪</text>
      <text x="140" y="40" font-family="Inter, Arial" font-size="22" fill="#fbbf24">♫</text>
      <text x="220" y="60" font-family="Inter, Arial" font-size="22" fill="#fbbf24">♬</text>
      <text x="140" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">«Ой у вишневому саду» — нар. пісня</text>`,
      270,
    ),

  /* --------------------------- BUILDINGS: OPERA HOUSE / GALLERY --------------------------- */

  operaHouse: () =>
    svg(
      "0 0 320 200",
      `
      <rect x="0" y="160" width="320" height="40" fill="#475569"/>
      <rect x="40" y="100" width="240" height="60" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      ${[70, 110, 150, 190, 230, 270]
        .map(
          (x) =>
            `<rect x="${x - 8}" y="60" width="16" height="100" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>`,
        )
        .join("")}
      <polygon points="20,100 300,100 280,60 40,60" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
      <rect x="120" y="120" width="80" height="40" fill="#7c2d12"/>
      <text x="160" y="40" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fbbf24" font-weight="800">🎭 Оперний театр</text>`,
      300,
    ),

  gallery: () =>
    svg(
      "0 0 320 200",
      `
      <rect x="20" y="40" width="280" height="120" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      ${[
        [50, 60, "#dc2626"],
        [130, 60, "#16a34a"],
        [210, 60, "#1d4ed8"],
      ]
        .map(
          ([x, y, c]) =>
            `<rect x="${x}" y="${y}" width="60" height="60" fill="#fff" stroke="#92400e" stroke-width="2"/>
             <rect x="${x + 6}" y="${y + 6}" width="48" height="48" fill="${c}"/>`,
        )
        .join("")}
      <text x="160" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">🖼 художня галерея</text>`,
      310,
    ),

  /* --------------------------- DA VINCI / ARTISTS --------------------------- */

  monaLisa: () =>
    svg(
      "0 0 220 280",
      `
      <rect x="10" y="10" width="200" height="260" fill="#fef3c7" stroke="#7c2d12" stroke-width="6"/>
      <rect x="22" y="22" width="176" height="236" fill="#92400e"/>
      <rect x="30" y="30" width="160" height="220" fill="#451a03"/>
      <ellipse cx="110" cy="120" rx="50" ry="65" fill="#fda4af"/>
      <ellipse cx="92" cy="110" rx="5" ry="6" fill="#0f172a"/>
      <ellipse cx="128" cy="110" rx="5" ry="6" fill="#0f172a"/>
      <path d="M92 142 Q110 152 128 142" stroke="#0f172a" stroke-width="2" fill="none"/>
      <path d="M60 110 Q60 60 110 60 Q160 60 160 110 L150 130 Q110 80 70 130 Z" fill="#451a03"/>
      <path d="M65 180 Q65 240 110 240 Q155 240 155 180 L155 160 Q110 180 65 160 Z" fill="#1c1917"/>
      <text x="110" y="268" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">Мона Ліза — Л. да Вінчі</text>`,
      200,
    ),

  shevchenko: () =>
    svg(
      "0 0 220 280",
      `
      <rect x="10" y="10" width="200" height="260" fill="#fef3c7" stroke="#7c2d12" stroke-width="4"/>
      <ellipse cx="110" cy="120" rx="50" ry="60" fill="#fda4af"/>
      <ellipse cx="92" cy="110" rx="5" ry="7" fill="#0f172a"/>
      <ellipse cx="128" cy="110" rx="5" ry="7" fill="#0f172a"/>
      <path d="M90 138 Q110 130 130 138" stroke="#0f172a" stroke-width="2" fill="none"/>
      <path d="M70 120 Q60 95 110 70 Q160 95 150 120" fill="#1c1917"/>
      <ellipse cx="110" cy="155" rx="22" ry="18" fill="#1c1917"/>
      <path d="M65 180 L155 180 L160 240 L60 240 Z" fill="#1d4ed8"/>
      <rect x="80" y="200" width="60" height="40" fill="#7c2d12"/>
      <text x="110" y="268" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">Тарас Шевченко — поет і художник</text>`,
      200,
    ),

  aivazovsky: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="10" y="10" width="260" height="180" fill="#fde68a" stroke="#92400e" stroke-width="4"/>
      <rect x="20" y="20" width="240" height="160" fill="#bae6fd"/>
      <rect x="20" y="90" width="240" height="90" fill="#0c4a6e"/>
      <path d="M20 90 Q60 80 100 90 Q140 80 180 95 Q220 80 260 90 L260 110 L20 110 Z" fill="#0ea5e9"/>
      <path d="M20 110 Q60 130 100 115 Q140 130 180 115 Q220 130 260 115 L260 130 L20 130 Z" fill="#bae6fd" opacity="0.85"/>
      <circle cx="220" cy="40" r="22" fill="#fbbf24" opacity="0.9"/>
      <g transform="translate(120 100)">
        <polygon points="-30,0 30,0 20,20 -20,20" fill="#7c2d12"/>
        <line x1="0" y1="0" x2="0" y2="-40" stroke="#7c2d12" stroke-width="2"/>
        <polygon points="0,-40 0,-10 16,-10" fill="#fff"/>
      </g>
      <text x="140" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">мариністика — І. Айвазовський</text>`,
      270,
    ),

  pleinAir: () =>
    svg(
      "0 0 280 200",
      `
      <rect width="280" height="200" fill="#bae6fd"/>
      <rect x="0" y="130" width="280" height="70" fill="#16a34a"/>
      <circle cx="40" cy="50" r="18" fill="#fbbf24"/>
      <g transform="translate(180 130)">
        <line x1="-12" y1="-2" x2="-30" y2="60" stroke="#7c2d12" stroke-width="4"/>
        <line x1="12" y1="-2" x2="30" y2="60" stroke="#7c2d12" stroke-width="4"/>
        <line x1="0" y1="-2" x2="0" y2="60" stroke="#7c2d12" stroke-width="4"/>
        <rect x="-30" y="-50" width="60" height="50" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
        <circle cx="-12" cy="-30" r="6" fill="#fbbf24"/>
        <polygon points="0,-15 10,-30 20,-15" fill="#16a34a"/>
      </g>
      <g transform="translate(80 150)">
        <circle cx="0" cy="-20" r="10" fill="#fda4af"/>
        <path d="M-12 -10 L12 -10 L10 30 L-10 30 Z" fill="#dc2626"/>
      </g>
      <text x="140" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">пленер — малювання просто неба</text>`,
      270,
    ),
};

/* ============================================================
 * RULE LIST
 * ==========================================================*/

const C = {
  red: "#dc2626",
  yellow: "#facc15",
  blue: "#2563eb",
  green: "#16a34a",
  orange: "#f97316",
  purple: "#7c3aed",
};

const rules = [
  // Color theory
  { match: (q) => /основними у живописі|три кольори.+основн/i.test(q.text), media: () => T.colorWheel() },
  { match: (q) => /жовтий і синій/i.test(q.text), media: () => T.colorMix(C.yellow, C.blue, C.green, ["жовтий", "синій", "зелений"]) },
  { match: (q) => /червоний і жовтий/i.test(q.text), media: () => T.colorMix(C.red, C.yellow, C.orange, ["червоний", "жовтий", "помаранчевий"]) },
  { match: (q) => /червоний і синій/i.test(q.text), media: () => T.colorMix(C.red, C.blue, C.purple, ["червоний", "синій", "фіолетовий"]) },
  { match: (q) => /тепл/i.test(q.text) && /колір|кольор/i.test(q.text), media: () => T.warmColors() },
  { match: (q) => /холодн/i.test(q.text) && /колір|кольор/i.test(q.text), media: () => T.coldColors() },
  { match: (q) => /ахроматичн|нейтральн/i.test(q.text), media: () => T.achromatic() },
  { match: (q) => /гарячими.+теплими|жовтий і помаранчевий/i.test(q.text), media: () => T.warmColors() },
  { match: (q) => /контраст/i.test(q.text), media: () => T.contrast() },
  { match: (q) => /^Як називається властивість.+ліва і права|симетрія/i.test(q.text), media: () => T.symmetry() },
  { match: (q) => /загальна побудова|композиц/i.test(q.text), media: () => T.composition() },

  // Genres
  { match: (q) => /портрет|зображено людину/i.test(q.text), media: () => T.portrait() },
  { match: (q) => /пейзаж|зображено природу/i.test(q.text), media: () => T.landscape() },
  { match: (q) => /натюрморт|неживі предмети/i.test(q.text), media: () => T.stillLife() },
  { match: (q) => /батальн|битв/i.test(q.text), media: () => T.battleScene() },
  { match: (q) => /анімалізм|герої.+тварини/i.test(q.text), media: () => T.animalism() },
  { match: (q) => /фреск|стіні.+храм/i.test(q.text), media: () => T.fresco() },
  { match: (q) => /ескіз|підготовч.+малюнок/i.test(q.text), media: () => T.sketch() },
  { match: (q) => /етюд|начерк|пленер/i.test(q.text), media: () => T.pleinAir() },

  // Plein air timing
  { match: (q) => /пора року.+пленер|виходять малювати на пленер/i.test(q.text), media: () => T.pleinAir() },

  // Art materials
  { match: (q) => /акварель|розвод.+водою/i.test(q.text), media: () => T.watercolor() },
  { match: (q) => /пастель|тонк.+пресован.+палич/i.test(q.text), media: () => T.pastel() },
  { match: (q) => /гуаш|густ.+фарба.+крие|густа фарба/i.test(q.text), media: () => T.gouache() },
  { match: (q) => /олі[яй].+фарб/i.test(q.text) && /пис/i.test(q.text), media: () => T.oilPaint() },
  { match: (q) => /пензел|наносить фарб/i.test(q.text), media: () => T.brush() },
  { match: (q) => /мольберт|полотно.+кріплять/i.test(q.text), media: () => T.easel() },
  { match: (q) => /палітр|круглій дощечці/i.test(q.text), media: () => T.palette() },

  // Famous artists
  { match: (q) => /Мона Ліза|Mona Lisa/i.test(q.text), media: () => T.monaLisa() },
  { match: (q) => /Шевченко|поет.+художник/i.test(q.text), media: () => T.shevchenko() },
  { match: (q) => /Айвазовськ|картин.+мор/i.test(q.text), media: () => T.aivazovsky() },

  // Ukrainian folk arts
  { match: (q) => /петриківськ|Петриківк/i.test(q.text), media: () => T.petrykivka() },
  { match: (q) => /вишиван/i.test(q.text), media: () => T.vyshyvanka() },
  { match: (q) => /писанк/i.test(q.text), media: () => T.pysanka() },
  { match: (q) => /крашанк|пофарбован.+один.+колір/i.test(q.text), media: () => T.krashanka() },
  { match: (q) => /тризуб|гербом.+Україн/i.test(q.text), media: () => T.trident() },
  { match: (q) => /ікон.+Богородиц|Матері з немовлям/i.test(q.text), media: () => T.icon() },
  { match: (q) => /мозаїк|крапками різних кольор/i.test(q.text), media: () => T.mosaic() },
  { match: (q) => /рушник.+стіни|на українському рушнику|трикутна або прямокутна.+тканина/i.test(q.text), media: () => T.rushnyk() },

  // Sculpture / architecture / dance / graphics
  { match: (q) => /скульптур|об'ємних фігур/i.test(q.text), media: () => T.sculpture() },
  { match: (q) => /архітектур|створення будівель/i.test(q.text), media: () => T.architecture() },
  { match: (q) => /гопак/i.test(q.text), media: () => T.hopak() },
  { match: (q) => /хореографі|мистецтво танцю/i.test(q.text), media: () => T.choreography() },
  { match: (q) => /графік|малюнк.+лініями.+штрих/i.test(q.text), media: () => T.graphics() },

  // Music notation
  { match: (q) => /нотний стан|сітк.+5.+ліній/i.test(q.text), media: () => T.staff() },
  { match: (q) => /скрипковий ключ|символ.+на початку нотного/i.test(q.text), media: () => T.trebleClef() },
  { match: (q) => /до, ре, мі|основн.+мажорн.+гамі/i.test(q.text), media: () => T.solfege() },
  { match: (q) => /нот у музичній гамі|скільки нот/i.test(q.text), media: () => T.solfege() },
  { match: (q) => /ноти.+нотний запис|записана музика/i.test(q.text), media: () => T.staff() },

  // Instruments
  { match: (q) => /піаніно|фортепіан|клавішн|білих і чорних клавіш/i.test(q.text), media: () => T.piano() },
  { match: (q) => /скрипк|4 струни.+смичок/i.test(q.text), media: () => T.violin() },
  { match: (q) => /флейт|духов/i.test(q.text) && !/трембіт|сопілк|бандур/i.test(q.text), media: () => T.flute() },
  { match: (q) => /барабан|ударн/i.test(q.text), media: () => T.drum() },
  { match: (q) => /гітар|6 струн|популярн.+муз/i.test(q.text), media: () => T.guitar() },
  { match: (q) => /бандур|нагадує.+арф/i.test(q.text), media: () => T.bandura() },
  { match: (q) => /трембіт|Карпат/i.test(q.text), media: () => T.trembita() },
  { match: (q) => /сопілк/i.test(q.text), media: () => T.sopilka() },
  { match: (q) => /струнні смичков/i.test(q.text), media: () => T.violin() },

  // Ensembles
  { match: (q) => /оркестр|колектив музикант/i.test(q.text), media: () => T.orchestra() },
  { match: (q) => /^Як називається великий колектив співаків|^хор/i.test(q.text), media: () => T.choir() },
  { match: (q) => /^Соло — це|соло — коли/i.test(q.text), media: () => T.soloDuetTrio(1, "соло — одна людина") },
  { match: (q) => /^Дует — це|дует — коли/i.test(q.text), media: () => T.soloDuetTrio(2, "дует — двоє") },
  { match: (q) => /^Тріо — це|тріо — коли/i.test(q.text), media: () => T.soloDuetTrio(3, "тріо — троє") },
  { match: (q) => /диригент|керує оркестром або хором/i.test(q.text), media: () => T.conductor() },

  // Composer / songs
  { match: (q) => /композитор|пише музику/i.test(q.text), media: () => T.composer() },
  { match: (q) => /Леонтович|Щедрик|Carol of the Bells/i.test(q.text), media: () => T.shchedryk() },
  { match: (q) => /Лисенко|Тарас Бульб|Наталк.+Полтавк/i.test(q.text), media: () => T.composer() },
  { match: (q) => /народн.+українськ.+пісн|Ой у вишневому/i.test(q.text), media: () => T.folkSong() },

  // National anthem
  { match: (q) => /урочист.+пісенн.+символ|державн.+гімн.+країни/i.test(q.text), media: () => T.anthem() },
  { match: (q) => /Гімн України|Ще не вмерла/i.test(q.text), media: () => T.anthem() },
  { match: (q) => /Чубинськ|автор слів.+Гімн/i.test(q.text), media: () => T.anthem() },
  { match: (q) => /Вербицьк|автор музики.+Гімн/i.test(q.text), media: () => T.anthem() },

  // Music genres
  { match: (q) => /опера|співаки.+історію|сюжетн.+театральн.+оркестр/i.test(q.text), media: () => T.opera() },
  { match: (q) => /оперний театр/i.test(q.text), media: () => T.operaHouse() },
  { match: (q) => /галере|музей|виставляють картин/i.test(q.text), media: () => T.gallery() },
  { match: (q) => /балет|танцем під музику/i.test(q.text), media: () => T.ballet() },
  { match: (q) => /симфоні/i.test(q.text), media: () => T.symphony() },
  { match: (q) => /марш/i.test(q.text), media: () => T.march() },
  { match: (q) => /вальс|трьохдольн|раз-два-три/i.test(q.text), media: () => T.waltz() },
  { match: (q) => /колиск/i.test(q.text), media: () => T.lullaby() },

  // Music dynamics
  { match: (q) => /темп.+музиці|швидкість виконання/i.test(q.text), media: () => T.tempo() },
  { match: (q) => /forte|голосно/i.test(q.text), media: () => T.forte() },
  { match: (q) => /piano.+вказ|тихо/i.test(q.text), media: () => T.piano_dyn() },
  { match: (q) => /діез|♯|підвищ.+півтон/i.test(q.text), media: () => T.sharp() },
  { match: (q) => /бемоль|♭|зниж.+півтон/i.test(q.text), media: () => T.flat() },
  { match: (q) => /пауза|перерва у звучанн/i.test(q.text), media: () => T.pause() },

  // Theater / film
  { match: (q) => /ляльков.+театр/i.test(q.text), media: () => T.puppetTheater() },
  { match: (q) => /актор|грає в театрі ролі/i.test(q.text), media: () => T.actor() },
  { match: (q) => /режисер|керує постановкою/i.test(q.text), media: () => T.director() },
  { match: (q) => /сценарій|текст.+актори/i.test(q.text), media: () => T.script() },

  // Animation / comic / illustration / poster
  { match: (q) => /мультфільм|анімаці/i.test(q.text), media: () => T.animation() },
  { match: (q) => /комікс|ряд.+картинок/i.test(q.text), media: () => T.comic() },
  { match: (q) => /плакат|рекламн.+малюн/i.test(q.text), media: () => T.poster() },
  { match: (q) => /мініатюр|прикраса літер/i.test(q.text), media: () => T.miniature() },
  { match: (q) => /ілюстраці|супроводжує текст/i.test(q.text), media: () => T.illustration() },

  // Crafts
  { match: (q) => /колаж|шматочків паперу/i.test(q.text), media: () => T.collage() },
  { match: (q) => /орігам/i.test(q.text), media: () => T.origami() },
  { match: (q) => /квілінг|скруч.+паперов.+смуж/i.test(q.text), media: () => T.quilling() },
  { match: (q) => /макраме|плетіння.+вузликам/i.test(q.text), media: () => T.macrame() },
  { match: (q) => /витинанк|вирізання візерунк/i.test(q.text), media: () => T.vytynanka() },

  // Costume
  { match: (q) => /вінок|жіноч.+квітами.+стрічк/i.test(q.text), media: () => T.vinok() },
  { match: (q) => /хустк/i.test(q.text), media: () => T.khustka() },
  { match: (q) => /шаровар|чоловічі широкі полотняні штани/i.test(q.text), media: () => T.sharovary() },

  // Repro / proba (other extras)
  { match: (q) => /репродукц|друкована.+фото-копія/i.test(q.text), media: () => infoCard("🖼 <b>Репродукція</b> — точна фото- чи друкована копія оригіналу картини.") },
  { match: (q) => /проба пензл/i.test(q.text), media: () => T.sketch() },
];

function pickMedia(q) {
  const corpus = [q.text, q.answers[q.correct] || "", ...q.answers].join(" | ");
  const proxy = { ...q, text: corpus };
  for (const r of rules) {
    if (r.match(proxy)) return r.media(q);
  }
  return null;
}

function fallbackMedia(q) {
  const correct = q.answers[q.correct];
  return infoCard(`🎨 <b>Правильна відповідь:</b><br>${correct}`);
}

async function main() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw);

  let mediaCount = 0;
  let fallbackCount = 0;
  const unmatched = [];

  for (const q of data.questions) {
    const m = pickMedia(q);
    if (m) {
      q.media = m;
      mediaCount++;
    } else {
      q.media = fallbackMedia(q);
      fallbackCount++;
      unmatched.push(q.text);
    }
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + "\n");

  console.log(`Total questions: ${data.questions.length}`);
  console.log(`  Rule-matched media: ${mediaCount}`);
  console.log(`  Fallback info-cards: ${fallbackCount}`);
  if (unmatched.length && process.argv.includes("--verbose")) {
    console.log("\nUnmatched questions (fallback applied):");
    for (const t of unmatched) console.log("  -", t);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
