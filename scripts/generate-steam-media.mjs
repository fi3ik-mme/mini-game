#!/usr/bin/env node
/*
 * Generates "media" HTML/SVG for every STEAM question by analogy with the
 * style used in ya-doslidzhuyu-svit-4-klas.json, but with more detailed and
 * accurate schematic illustrations.
 *
 * Approach:
 *   1. A library of hand-crafted SVG templates (the `T` object below).
 *      Templates are small, parameterised, share a consistent dark theme
 *      (#0d1117), Ukrainian labels, and contain meaningful detail (not just
 *      a stick figure of the concept).
 *   2. A rule list that maps a question to a template by keyword matching.
 *      The first matching rule wins; rules go from most specific to least.
 *   3. A polished `infoCard` / `schemeRow` fallback for purely definitional
 *      questions where a diagram would not add educational value.
 *
 * Run with:  node scripts/generate-steam-media.mjs
 * It overwrites the `media` field on every question in steam-4-klas.json.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(
  PROJECT_ROOT,
  "games/first-million/data/steam-4-klas.json",
);

/* ============================================================
 * SVG helper: every diagram uses a consistent dark theme.
 * ==========================================================*/
const BG = "#0d1117";
const STROKE = "#e2e8f0";
const ACCENT = "#fbbf24";
const ACCENT_2 = "#38bdf8";
const ACCENT_3 = "#34d399";
const DANGER = "#ef4444";

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

function compare(rows) {
  const cells = rows
    .map(([k, v]) => `<span class="label">${k}</span><span class="val">${v}</span>`)
    .join("");
  return `<div class="compare">${cells}</div>`;
}

function schemeTable(headers, rows) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  return `<table class="scheme-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/* ============================================================
 * SVG TEMPLATE LIBRARY
 * Each function returns a complete inline SVG.
 * ==========================================================*/

const T = {
  /* -------- STEAM identity -------- */
  steamLogo: () =>
    svg(
      "0 0 420 120",
      `
      <defs>
        <linearGradient id="g_s" x1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#1d4ed8"/>
        </linearGradient>
        <linearGradient id="g_t" x1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#7c3aed"/>
        </linearGradient>
        <linearGradient id="g_e" x1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#059669"/>
        </linearGradient>
        <linearGradient id="g_a" x1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#be123c"/>
        </linearGradient>
        <linearGradient id="g_m" x1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/>
        </linearGradient>
      </defs>
      ${["S", "T", "E", "A", "M"]
        .map(
          (l, i) => `
        <g transform="translate(${20 + i * 80} 18)">
          <rect width="72" height="72" rx="14" fill="url(#g_${l.toLowerCase()})"/>
          <text x="36" y="54" text-anchor="middle" font-family="Inter, Arial" font-size="44" font-weight="900" fill="#fff">${l}</text>
        </g>`,
        )
        .join("")}
      <g font-family="Inter, Arial" font-size="11" fill="#cbd5e1" text-anchor="middle">
        <text x="56"  y="108">Science</text>
        <text x="136" y="108">Technology</text>
        <text x="216" y="108">Engineering</text>
        <text x="296" y="108">Art</text>
        <text x="376" y="108">Math</text>
      </g>`,
      280,
    ),

  /* -------- Compass -------- */
  compass: () =>
    svg(
      "0 0 240 240",
      `
      <defs>
        <radialGradient id="cf" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stop-color="#fef3c7"/><stop offset="1" stop-color="#cbd5e1"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="108" fill="#1e293b" stroke="#475569" stroke-width="3"/>
      <circle cx="120" cy="120" r="96" fill="url(#cf)"/>
      <g stroke="#1e293b" stroke-width="1.2" opacity="0.6">
        ${[...Array(24)]
          .map((_, i) => {
            const a = (i * 360) / 24;
            const ln = i % 6 === 0 ? 16 : 8;
            return `<line x1="120" y1="${24 + (16 - ln)}" x2="120" y2="${24 + 16}" transform="rotate(${a} 120 120)"/>`;
          })
          .join("")}
      </g>
      <polygon points="120,38 108,120 120,108 132,120" fill="#dc2626"/>
      <polygon points="120,202 108,120 120,132 132,120" fill="#1e293b"/>
      <circle cx="120" cy="120" r="7" fill="#1e293b" stroke="#fef3c7" stroke-width="2"/>
      <g font-family="Inter, Arial" font-weight="800" text-anchor="middle">
        <text x="120" y="20"  font-size="20" fill="#dc2626">Пн</text>
        <text x="120" y="232" font-size="20" fill="#1e293b">Пд</text>
        <text x="226" y="127" font-size="20" fill="#1e293b">Сх</text>
        <text x="14"  y="127" font-size="20" fill="#1e293b">Зх</text>
      </g>
      <g font-family="Inter, Arial" font-size="11" fill="#475569" text-anchor="middle">
        <text x="120" y="36" >N</text>
        <text x="120" y="216">S</text>
        <text x="208" y="124">E</text>
        <text x="32"  y="124">W</text>
      </g>`,
      220,
    ),

  /* -------- Compass with single direction highlighted -------- */
  compassHighlight: (dir) => {
    // dir: 'N' | 'S' | 'E' | 'W' (Ukrainian labels)
    const labels = { N: "Пн", S: "Пд", E: "Сх", W: "Зх" };
    const colors = {
      N: "#dc2626",
      S: "#1d4ed8",
      E: "#16a34a",
      W: "#d97706",
    };
    const arrow = {
      N: "120,30 105,120 135,120",
      S: "120,210 105,120 135,120",
      E: "210,120 120,105 120,135",
      W: "30,120 120,105 120,135",
    };
    return svg(
      "0 0 240 240",
      `
      <circle cx="120" cy="120" r="108" fill="#1e293b" stroke="#475569" stroke-width="3"/>
      <circle cx="120" cy="120" r="96" fill="#f5f5f4"/>
      <polygon points="${arrow[dir]}" fill="${colors[dir]}"/>
      <circle cx="120" cy="120" r="8" fill="#1e293b"/>
      <g font-family="Inter, Arial" font-weight="800" text-anchor="middle">
        <text x="120" y="20"  font-size="20" fill="${dir === "N" ? "#dc2626" : "#1e293b"}">Пн (N)</text>
        <text x="120" y="232" font-size="20" fill="${dir === "S" ? "#1d4ed8" : "#1e293b"}">Пд (S)</text>
        <text x="220" y="127" font-size="20" fill="${dir === "E" ? "#16a34a" : "#1e293b"}">Сх (E)</text>
        <text x="22"  y="127" font-size="20" fill="${dir === "W" ? "#d97706" : "#1e293b"}">Зх (W)</text>
      </g>
      <text x="120" y="62" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="${colors[dir]}" font-weight="700">${labels[dir]}</text>`,
      220,
    );
  },

  /* -------- Microscope (detailed schematic) -------- */
  microscope: () =>
    svg(
      "0 0 200 280",
      `
      <defs>
        <linearGradient id="ms_body" x1="0" x2="1">
          <stop offset="0" stop-color="#475569"/><stop offset="1" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="ms_metal" x1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- base -->
      <ellipse cx="100" cy="262" rx="70" ry="10" fill="#0f172a" opacity="0.5"/>
      <path d="M55 250 Q55 235 75 232 L125 232 Q145 235 145 250 L150 262 L50 262 Z" fill="url(#ms_body)"/>
      <!-- pillar -->
      <rect x="92" y="100" width="16" height="135" rx="3" fill="url(#ms_body)"/>
      <!-- arm -->
      <path d="M100 60 Q145 65 140 130 L120 130 L120 100 L100 100 Z" fill="url(#ms_body)"/>
      <!-- stage -->
      <rect x="58" y="180" width="84" height="14" rx="2" fill="#1e293b" stroke="#475569" stroke-width="1"/>
      <rect x="70" y="184" width="60" height="6" fill="#fde68a"/>
      <!-- objective lens turret -->
      <circle cx="120" cy="150" r="14" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
      <rect x="116" y="158" width="8" height="20" fill="url(#ms_metal)"/>
      <rect x="110" y="170" width="20" height="6" rx="1" fill="#0f172a"/>
      <!-- eyepiece -->
      <rect x="92" y="36" width="22" height="30" rx="3" fill="url(#ms_body)"/>
      <rect x="88" y="30" width="30" height="10" rx="2" fill="url(#ms_metal)"/>
      <!-- focus knobs -->
      <circle cx="48" cy="170" r="11" fill="url(#ms_metal)"/>
      <circle cx="48" cy="170" r="6" fill="#0f172a"/>
      <circle cx="48" cy="195" r="8" fill="url(#ms_metal)"/>
      <!-- light source under stage -->
      <circle cx="100" cy="220" r="10" fill="#fbbf24"/>
      <g stroke="#fbbf24" stroke-width="1.5" opacity="0.7">
        <line x1="100" y1="206" x2="100" y2="200"/>
        <line x1="100" y1="234" x2="100" y2="240"/>
        <line x1="86"  y1="220" x2="80"  y2="220"/>
        <line x1="114" y1="220" x2="120" y2="220"/>
      </g>
      <!-- labels -->
      <g font-family="Inter, Arial" font-size="10" fill="#cbd5e1">
        <text x="160" y="45">окуляр</text>
        <text x="160" y="153">об'єктив</text>
        <text x="160" y="190">столик</text>
        <text x="6"   y="173">фокус</text>
      </g>`,
      210,
    ),

  /* -------- Telescope on tripod -------- */
  telescope: () =>
    svg(
      "0 0 260 240",
      `
      <defs>
        <linearGradient id="tel_t" x1="0" x2="1">
          <stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- night sky -->
      <circle cx="220" cy="40" r="8" fill="#fde68a"/>
      <circle cx="200" cy="60" r="2" fill="#fde68a"/>
      <circle cx="240" cy="70" r="2.5" fill="#fde68a"/>
      <circle cx="180" cy="35" r="1.5" fill="#fde68a"/>
      <!-- tube -->
      <g transform="rotate(-25 130 130)">
        <rect x="50" y="115" width="170" height="30" rx="15" fill="url(#tel_t)" stroke="#475569" stroke-width="2"/>
        <circle cx="218" cy="130" r="13" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
        <rect x="45" y="120" width="12" height="20" rx="3" fill="#334155"/>
        <rect x="40" y="124" width="8" height="12" rx="2" fill="#cbd5e1"/>
      </g>
      <!-- tripod -->
      <line x1="135" y1="160" x2="100" y2="225" stroke="#475569" stroke-width="6" stroke-linecap="round"/>
      <line x1="135" y1="160" x2="170" y2="225" stroke="#475569" stroke-width="6" stroke-linecap="round"/>
      <line x1="135" y1="160" x2="135" y2="225" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="135" cy="228" rx="55" ry="6" fill="#0f172a" opacity="0.5"/>
      <text x="135" y="22" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#cbd5e1">телескоп — спостереження за космічними обʼєктами</text>`,
      260,
    ),

  /* -------- Thermometer with key temperature marks -------- */
  thermometer: () =>
    svg(
      "0 0 140 280",
      `
      <defs>
        <linearGradient id="merc" x1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fca5a5"/><stop offset="1" stop-color="#dc2626"/>
        </linearGradient>
      </defs>
      <!-- glass tube -->
      <rect x="55" y="20" width="20" height="200" rx="10" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
      <rect x="60" y="40"  width="10" height="170" fill="#0f172a"/>
      <!-- mercury column -->
      <rect x="60" y="135" width="10" height="75" fill="url(#merc)"/>
      <circle cx="65" cy="240" r="22" fill="url(#merc)" stroke="#94a3b8" stroke-width="2"/>
      <!-- scale -->
      <g stroke="#cbd5e1" stroke-width="1">
        ${[...Array(11)]
          .map(
            (_, i) =>
              `<line x1="78" y1="${30 + i * 18}" x2="${i % 2 ? 86 : 92}" y2="${30 + i * 18}"/>`,
          )
          .join("")}
      </g>
      <g font-family="Inter, Arial" font-size="11" fill="#cbd5e1">
        <text x="98" y="35"  >100°C — кипіння</text>
        <text x="98" y="143" >0°C — замерзання</text>
        <text x="98" y="215" >−40°C</text>
        <text x="98" y="98"  >°C</text>
      </g>
      <text x="65" y="276" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#94a3b8">термометр</text>`,
      200,
    ),

  /* -------- Barometer (aneroid dial) -------- */
  barometer: () =>
    svg(
      "0 0 220 220",
      `
      <circle cx="110" cy="110" r="100" fill="#1e293b" stroke="#475569" stroke-width="3"/>
      <circle cx="110" cy="110" r="88" fill="#f5f5f4"/>
      <g font-family="Inter, Arial" font-size="11" fill="#1e293b" text-anchor="middle" font-weight="700">
        <text x="110" y="32" >ХОРОША</text>
        <text x="40"  y="115">ДОЩ</text>
        <text x="180" y="115">МІНЛИВО</text>
        <text x="110" y="195">БУРЯ</text>
      </g>
      <g stroke="#475569" stroke-width="1.5">
        ${[...Array(12)]
          .map((_, i) => {
            const a = (i * 360) / 12;
            return `<line x1="110" y1="32" x2="110" y2="40" transform="rotate(${a} 110 110)"/>`;
          })
          .join("")}
      </g>
      <line x1="110" y1="110" x2="58" y2="78" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
      <circle cx="110" cy="110" r="7" fill="#1e293b"/>
      <text x="110" y="158" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#1e293b">760 мм рт. ст.</text>`,
      200,
    ),

  /* -------- Hygrometer -------- */
  hygrometer: () =>
    svg(
      "0 0 220 220",
      `
      <rect x="20" y="20" width="180" height="180" rx="16" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <circle cx="110" cy="110" r="80" fill="#e0f2fe"/>
      <g font-family="Inter, Arial" font-size="11" fill="#0f172a" text-anchor="middle" font-weight="700">
        <text x="50"  y="115">0%</text>
        <text x="170" y="115">100%</text>
        <text x="110" y="50">50%</text>
      </g>
      <line x1="110" y1="110" x2="135" y2="65" stroke="#1d4ed8" stroke-width="3"/>
      <circle cx="110" cy="110" r="6" fill="#1e293b"/>
      <text x="110" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bae6fd" font-weight="700">вологість повітря</text>
      <!-- water-drop emblem -->
      <path d="M55 60 Q48 72 55 80 Q62 72 55 60 Z" fill="#38bdf8"/>`,
      200,
    ),

  /* -------- Wind vane (flugel) -------- */
  flugel: () =>
    svg(
      "0 0 220 240",
      `
      <line x1="110" y1="40" x2="110" y2="200" stroke="#94a3b8" stroke-width="5"/>
      <g transform="translate(110 80)">
        <!-- rooster arrow -->
        <polygon points="-60,0 -15,-12 -15,-4 25,-4 35,-12 60,0 35,12 25,4 -15,4 -15,12" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
      </g>
      <!-- N/E/S/W cross -->
      <g stroke="#cbd5e1" stroke-width="2" font-family="Inter, Arial" font-size="13" fill="#fde68a" font-weight="800" text-anchor="middle">
        <line x1="110" y1="140" x2="110" y2="200"/>
        <line x1="70" y1="170" x2="150" y2="170"/>
        <text x="110" y="138">Пн</text>
        <text x="60"  y="174">Зх</text>
        <text x="160" y="174">Сх</text>
        <text x="110" y="218">Пд</text>
      </g>
      <ellipse cx="110" cy="225" rx="60" ry="6" fill="#0f172a" opacity="0.5"/>
      <text x="110" y="24" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#cbd5e1">флюгер — напрям вітру</text>`,
      210,
    ),

  /* -------- Pan scales -------- */
  scales: () =>
    svg(
      "0 0 240 220",
      `
      <defs>
        <linearGradient id="sc_m" x1="0" x2="1">
          <stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/>
        </linearGradient>
      </defs>
      <!-- base -->
      <rect x="100" y="170" width="40" height="30" rx="4" fill="url(#sc_m)"/>
      <rect x="80" y="200" width="80" height="10" rx="2" fill="url(#sc_m)"/>
      <!-- post -->
      <rect x="116" y="60" width="8" height="115" fill="url(#sc_m)"/>
      <!-- beam -->
      <line x1="40" y1="70" x2="200" y2="70" stroke="url(#sc_m)" stroke-width="6"/>
      <!-- chains -->
      <line x1="60" y1="70" x2="60" y2="110" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="180" y1="70" x2="180" y2="110" stroke="#94a3b8" stroke-width="1.5"/>
      <!-- pans -->
      <path d="M40 110 Q60 130 80 110 Z" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <path d="M160 110 Q180 130 200 110 Z" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <!-- weights -->
      <rect x="56" y="100" width="8" height="10" rx="1" fill="#dc2626"/>
      <circle cx="180" cy="105" r="6" fill="#1e293b"/>
      <text x="120" y="55" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">ваги</text>`,
      220,
    ),

  /* -------- Ruler with cm marks -------- */
  ruler: () =>
    svg(
      "0 0 320 80",
      `
      <rect x="10" y="20" width="300" height="40" rx="4" fill="#fde68a" stroke="#92400e" stroke-width="1.5"/>
      ${[...Array(31)]
        .map((_, i) => {
          const x = 10 + i * 10;
          const big = i % 10 === 0;
          const mid = i % 5 === 0;
          const h = big ? 22 : mid ? 14 : 8;
          return `<line x1="${x}" y1="20" x2="${x}" y2="${20 + h}" stroke="#92400e" stroke-width="${big ? 1.8 : 1}"/>`;
        })
        .join("")}
      ${[0, 1, 2, 3].map((n) => `<text x="${10 + n * 100}" y="52" font-family="Inter, Arial" font-size="11" fill="#92400e" font-weight="700">${n}</text>`).join("")}
      <text x="310" y="14" text-anchor="end" font-family="Inter, Arial" font-size="11" fill="#cbd5e1">см</text>`,
      280,
    ),

  /* -------- Protractor -------- */
  protractor: () =>
    svg(
      "0 0 240 140",
      `
      <path d="M20 120 A100 100 0 0 1 220 120 Z" fill="#fde68a" stroke="#92400e" stroke-width="2"/>
      ${[...Array(19)]
        .map((_, i) => {
          const a = (i * 180) / 18;
          const long = i % 3 === 0;
          const r1 = long ? 78 : 86;
          const r2 = 100;
          const rad = (Math.PI * a) / 180;
          const x1 = 120 + r1 * -Math.cos(rad);
          const y1 = 120 + r1 * -Math.sin(rad);
          const x2 = 120 + r2 * -Math.cos(rad);
          const y2 = 120 + r2 * -Math.sin(rad);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#92400e" stroke-width="${long ? 1.6 : 1}"/>`;
        })
        .join("")}
      ${[0, 30, 60, 90, 120, 150, 180]
        .map((deg) => {
          const rad = (Math.PI * deg) / 180;
          const x = 120 + 64 * -Math.cos(rad);
          const y = 120 + 64 * -Math.sin(rad);
          return `<text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#92400e" font-weight="700">${deg}°</text>`;
        })
        .join("")}
      <line x1="20" y1="120" x2="220" y2="120" stroke="#92400e" stroke-width="2"/>
      <text x="120" y="135" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">транспортир</text>`,
      240,
    ),

  /* -------- Drawing compass -------- */
  drawingCompass: () =>
    svg(
      "0 0 200 240",
      `
      <line x1="60"  y1="180" x2="100" y2="40" stroke="#94a3b8" stroke-width="6"/>
      <line x1="140" y1="180" x2="100" y2="40" stroke="#cbd5e1" stroke-width="6"/>
      <circle cx="100" cy="40" r="9" fill="#475569" stroke="#fbbf24" stroke-width="2"/>
      <polygon points="58,184 64,184 61,196" fill="#1e293b"/>
      <rect x="136" y="180" width="10" height="20" fill="#1e293b"/>
      <text x="100" y="220" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="700">циркуль</text>`,
      180,
    ),

  /* -------- Magnifier (lupa) -------- */
  magnifier: () =>
    svg(
      "0 0 220 220",
      `
      <circle cx="90" cy="90" r="60" fill="rgba(186,230,253,0.25)" stroke="#94a3b8" stroke-width="6"/>
      <circle cx="90" cy="90" r="60" fill="none" stroke="#bae6fd" stroke-width="2"/>
      <rect x="128" y="128" width="20" height="80" rx="6" transform="rotate(-45 138 168)" fill="#7c2d12" stroke="#451a03" stroke-width="1.5"/>
      <text x="90" y="96" text-anchor="middle" font-family="Inter, Arial" font-size="40" font-weight="900" fill="#0ea5e9">A</text>
      <text x="110" y="208" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#bae6fd" font-weight="700">лупа</text>`,
      200,
    ),

  /* -------- Clock face (for time/angle questions) -------- */
  clock: (h, m = 0) =>
    svg(
      "0 0 220 220",
      `
      <circle cx="110" cy="110" r="100" fill="#1e293b" stroke="#fbbf24" stroke-width="4"/>
      <circle cx="110" cy="110" r="92" fill="#0f172a"/>
      ${[...Array(12)]
        .map((_, i) => {
          const a = (i * 360) / 12 - 90;
          const rad = (Math.PI * a) / 180;
          const x1 = 110 + 82 * Math.cos(rad);
          const y1 = 110 + 82 * Math.sin(rad);
          const x2 = 110 + 92 * Math.cos(rad);
          const y2 = 110 + 92 * Math.sin(rad);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fbbf24" stroke-width="2"/>`;
        })
        .join("")}
      ${[12, 3, 6, 9]
        .map((n, i) => {
          const a = (i * 90) - 90;
          const rad = (Math.PI * a) / 180;
          const x = 110 + 70 * Math.cos(rad);
          const y = 110 + 70 * Math.sin(rad) + 5;
          return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Inter, Arial" font-size="16" fill="#fde68a" font-weight="700">${n}</text>`;
        })
        .join("")}
      ${(() => {
        const hourA = ((h % 12) * 30 + m / 2) - 90;
        const minA = (m * 6) - 90;
        const hr = (Math.PI * hourA) / 180;
        const mr = (Math.PI * minA) / 180;
        return `
          <line x1="110" y1="110" x2="${110 + 50 * Math.cos(hr)}" y2="${110 + 50 * Math.sin(hr)}" stroke="#fde68a" stroke-width="5" stroke-linecap="round"/>
          <line x1="110" y1="110" x2="${110 + 75 * Math.cos(mr)}" y2="${110 + 75 * Math.sin(mr)}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
      })()}
      <circle cx="110" cy="110" r="5" fill="#fbbf24"/>`,
      200,
    ),

  /* -------- Hourglass -------- */
  hourglass: () =>
    svg(
      "0 0 160 240",
      `
      <rect x="30" y="20" width="100" height="10" fill="#92400e"/>
      <rect x="30" y="210" width="100" height="10" fill="#92400e"/>
      <path d="M40 30 L120 30 L80 120 Z" fill="rgba(186,230,253,0.15)" stroke="#fbbf24" stroke-width="2"/>
      <path d="M40 210 L120 210 L80 120 Z" fill="rgba(186,230,253,0.15)" stroke="#fbbf24" stroke-width="2"/>
      <path d="M48 38 L112 38 L80 110 Z" fill="#fde68a"/>
      <path d="M70 198 L90 198 L80 184 Z" fill="#fde68a"/>
      <line x1="80" y1="115" x2="80" y2="130" stroke="#fde68a" stroke-width="2"/>
      <text x="80" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">пісочний годинник</text>`,
      170,
    ),

  /* -------- Sundial -------- */
  sundial: () =>
    svg(
      "0 0 240 200",
      `
      <ellipse cx="120" cy="170" rx="100" ry="20" fill="#1e293b"/>
      <ellipse cx="120" cy="160" rx="100" ry="20" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
      <polygon points="120,160 120,60 170,160" fill="#1e293b" stroke="#fde68a" stroke-width="2"/>
      ${[...Array(7)]
        .map((_, i) => {
          const a = i * 30 - 90;
          const rad = (Math.PI * a) / 180;
          const x1 = 120 + 70 * Math.cos(rad);
          const y1 = 160 + 14 * Math.sin(rad);
          const x2 = 120 + 90 * Math.cos(rad);
          const y2 = 160 + 18 * Math.sin(rad);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fde68a" stroke-width="1.5"/>`;
        })
        .join("")}
      <circle cx="200" cy="36" r="14" fill="#fbbf24"/>
      <g stroke="#fbbf24" stroke-width="2">
        <line x1="200" y1="14" x2="200" y2="22"/>
        <line x1="200" y1="50" x2="200" y2="58"/>
        <line x1="178" y1="36" x2="186" y2="36"/>
        <line x1="214" y1="36" x2="222" y2="36"/>
      </g>
      <path d="M170 160 L210 50" stroke="#fde68a" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="120" y="195" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">сонячний годинник</text>`,
      230,
    ),

  /* -------- Water phase diagram (3 states + transitions) -------- */
  waterStates: () =>
    svg(
      "0 0 360 200",
      `
      <!-- ice -->
      <g transform="translate(40 110)">
        <path d="M-30 0 L0 -40 L30 0 L0 30 Z" fill="#bae6fd" stroke="#0ea5e9" stroke-width="2"/>
        <path d="M-15 -15 L15 -15 M0 -25 L0 15" stroke="#0ea5e9" stroke-width="1.5"/>
        <text x="0" y="55" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bae6fd" font-weight="800">ЛІД</text>
        <text x="0" y="70" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#94a3b8">твердий</text>
      </g>
      <!-- water -->
      <g transform="translate(180 110)">
        <path d="M-30 -20 Q-30 30 0 30 Q30 30 30 -20 Q15 -10 0 -20 Q-15 -10 -30 -20 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
        <ellipse cx="-8" cy="0" rx="3" ry="2" fill="#bae6fd"/>
        <ellipse cx="10" cy="8" rx="2" ry="1.5" fill="#bae6fd"/>
        <text x="0" y="55" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bae6fd" font-weight="800">ВОДА</text>
        <text x="0" y="70" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#94a3b8">рідина</text>
      </g>
      <!-- steam -->
      <g transform="translate(320 110)">
        <path d="M-25 0 Q-20 -20 -10 -10 Q0 -25 10 -10 Q25 -15 20 5 Q25 20 5 15 Q-10 25 -20 10 Q-30 5 -25 0 Z" fill="#e0f2fe" opacity="0.7" stroke="#7dd3fc" stroke-width="1.5"/>
        <text x="0" y="55" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bae6fd" font-weight="800">ПАРА</text>
        <text x="0" y="70" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#94a3b8">газ</text>
      </g>
      <!-- arrows -->
      <g stroke="#fbbf24" stroke-width="2" fill="none">
        <path d="M75 100 Q110 80 145 100" marker-end="url(#arr1)"/>
        <path d="M215 100 Q250 80 285 100" marker-end="url(#arr1)"/>
        <path d="M145 130 Q110 150 75 130"  marker-end="url(#arr1)"/>
        <path d="M285 130 Q250 150 215 130" marker-end="url(#arr1)"/>
      </g>
      <defs>
        <marker id="arr1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill="#fbbf24"/>
        </marker>
      </defs>
      <g font-family="Inter, Arial" font-size="10" fill="#fde68a">
        <text x="110" y="78">↑ танення</text>
        <text x="248" y="78">↑ кипіння</text>
        <text x="80"  y="170">↓ замерзання</text>
        <text x="218" y="170">↓ конденсація</text>
      </g>`,
      320,
    ),

  /* -------- Water cycle -------- */
  waterCycle: () =>
    svg(
      "0 0 320 200",
      `
      <!-- sun -->
      <circle cx="40" cy="40" r="18" fill="#fbbf24"/>
      <g stroke="#fbbf24" stroke-width="2">
        <line x1="40" y1="14" x2="40" y2="22"/>
        <line x1="40" y1="58" x2="40" y2="66"/>
        <line x1="14" y1="40" x2="22" y2="40"/>
        <line x1="58" y1="40" x2="66" y2="40"/>
      </g>
      <!-- cloud -->
      <g transform="translate(180 30)">
        <ellipse cx="0" cy="10" rx="40" ry="14" fill="#e2e8f0"/>
        <ellipse cx="-25" cy="6" rx="20" ry="14" fill="#e2e8f0"/>
        <ellipse cx="25" cy="6" rx="22" ry="14" fill="#e2e8f0"/>
      </g>
      <!-- rain -->
      <g stroke="#38bdf8" stroke-width="2" stroke-linecap="round">
        <line x1="160" y1="55" x2="158" y2="68"/>
        <line x1="175" y1="55" x2="173" y2="68"/>
        <line x1="190" y1="55" x2="188" y2="68"/>
        <line x1="205" y1="55" x2="203" y2="68"/>
      </g>
      <!-- ground & water -->
      <path d="M0 200 L0 130 Q60 130 80 140 Q140 130 200 140 Q260 130 320 145 L320 200 Z" fill="#16a34a"/>
      <path d="M120 200 Q160 165 200 195 Q240 200 280 195 L280 200 Z" fill="#0ea5e9"/>
      <!-- evaporation arrow -->
      <path d="M170 175 Q150 130 175 60" stroke="#fbbf24" stroke-width="2" fill="none" marker-end="url(#wcarr)"/>
      <defs>
        <marker id="wcarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill="#fbbf24"/>
        </marker>
      </defs>
      <g font-family="Inter, Arial" font-size="10" fill="#fde68a">
        <text x="70" y="20">сонце</text>
        <text x="160" y="22">хмари</text>
        <text x="160" y="84">дощ</text>
        <text x="140" y="155">випаровування</text>
        <text x="220" y="186" fill="#0ea5e9">річки/моря</text>
      </g>`,
      320,
    ),

  /* -------- Rainbow / spectrum -------- */
  rainbow: () =>
    svg(
      "0 0 320 200",
      `
      ${[
        "#dc2626",
        "#f97316",
        "#facc15",
        "#16a34a",
        "#22d3ee",
        "#2563eb",
        "#7c3aed",
      ]
        .map(
          (c, i) =>
            `<path d="M40 ${175 - i * 6} A${120 - i * 6} ${120 - i * 6} 0 0 1 ${280 + i * 6} ${175 - i * 6}" stroke="${c}" stroke-width="6" fill="none"/>`,
        )
        .join("")}
      <g font-family="Inter, Arial" font-size="10" fill="#fde68a">
        <text x="160" y="190" text-anchor="middle">червоний · оранжевий · жовтий · зелений · блакитний · синій · фіолетовий</text>
      </g>`,
      320,
    ),

  /* -------- Prism dispersing white light -------- */
  prism: () =>
    svg(
      "0 0 320 180",
      `
      <line x1="0" y1="90" x2="120" y2="90" stroke="#fff" stroke-width="3"/>
      <polygon points="120,40 220,140 120,140" fill="rgba(56,189,248,0.25)" stroke="#bae6fd" stroke-width="2"/>
      ${[
        ["#dc2626", 60],
        ["#f97316", 70],
        ["#facc15", 82],
        ["#16a34a", 96],
        ["#22d3ee", 110],
        ["#2563eb", 122],
        ["#7c3aed", 134],
      ]
        .map(
          ([c, y]) =>
            `<line x1="220" y1="100" x2="320" y2="${y}" stroke="${c}" stroke-width="3"/>`,
        )
        .join("")}
      <text x="60" y="80" font-family="Inter, Arial" font-size="10" fill="#fff">біле світло</text>
      <text x="240" y="35" font-family="Inter, Arial" font-size="10" fill="#fde68a">спектр</text>`,
      300,
    ),

  /* -------- Sun + object + shadow -------- */
  shadow: () =>
    svg(
      "0 0 320 180",
      `
      <circle cx="40" cy="40" r="20" fill="#fbbf24"/>
      <g stroke="#fbbf24" stroke-width="2">
        <line x1="40" y1="10" x2="40" y2="18"/>
        <line x1="40" y1="62" x2="40" y2="70"/>
        <line x1="10" y1="40" x2="18" y2="40"/>
        <line x1="62" y1="40" x2="70" y2="40"/>
      </g>
      <line x1="0" y1="150" x2="320" y2="150" stroke="#475569" stroke-width="2"/>
      <rect x="170" y="80" width="22" height="70" fill="#16a34a"/>
      <polygon points="192,150 280,135 280,150" fill="#0f172a" stroke="#475569" stroke-width="1"/>
      <line x1="40" y1="40" x2="280" y2="135" stroke="#fde68a" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="220" y="172" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">тінь</text>`,
      300,
    ),

  /* -------- Bar magnet with field lines -------- */
  magnet: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="40" y="80" width="160" height="50" rx="6" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
      <rect x="40" y="80" width="80" height="50" fill="#1d4ed8"/>
      <text x="80" y="112" text-anchor="middle" font-family="Inter, Arial" font-size="22" font-weight="900" fill="#fff">N</text>
      <text x="160" y="112" text-anchor="middle" font-family="Inter, Arial" font-size="22" font-weight="900" fill="#fff">S</text>
      <g stroke="#fbbf24" stroke-width="1.5" fill="none" opacity="0.9">
        <path d="M60 80 Q120 30 180 80" />
        <path d="M60 70 Q120 10 180 70" />
        <path d="M60 130 Q120 170 180 130" />
        <path d="M60 140 Q120 190 180 140" />
      </g>
      <text x="120" y="20" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#cbd5e1">магнітні полюси та лінії поля</text>`,
      230,
    ),

  /* -------- Magnetic poles attraction/repulsion -------- */
  magnetPoles: (kind) => {
    // kind: 'attract' (different) or 'repel' (same)
    const right = kind === "attract" ? "S" : "N";
    const rightColor = kind === "attract" ? "#1d4ed8" : "#dc2626";
    return svg(
      "0 0 260 140",
      `
      <rect x="20" y="40" width="100" height="40" rx="4" fill="#dc2626"/>
      <rect x="20" y="40" width="50" height="40" fill="#1d4ed8"/>
      <text x="45" y="68" text-anchor="middle" font-family="Inter, Arial" font-size="20" fill="#fff" font-weight="900">N</text>
      <text x="95" y="68" text-anchor="middle" font-family="Inter, Arial" font-size="20" fill="#fff" font-weight="900">S</text>
      <rect x="140" y="40" width="100" height="40" rx="4" fill="${rightColor}"/>
      <rect x="${kind === "attract" ? 190 : 140}" y="40" width="50" height="40" fill="${kind === "attract" ? "#dc2626" : "#1d4ed8"}"/>
      <text x="165" y="68" text-anchor="middle" font-family="Inter, Arial" font-size="20" fill="#fff" font-weight="900">${kind === "attract" ? "N" : "N"}</text>
      <text x="215" y="68" text-anchor="middle" font-family="Inter, Arial" font-size="20" fill="#fff" font-weight="900">${kind === "attract" ? "S" : "S"}</text>
      ${
        kind === "attract"
          ? `<g stroke="#34d399" stroke-width="3" fill="none">
              <path d="M122 60 L138 60" marker-end="url(#m_ar1)"/>
              <path d="M138 60 L122 60" marker-end="url(#m_ar1)"/>
            </g>
            <text x="130" y="32" text-anchor="middle" font-family="Inter, Arial" font-size="12" font-weight="800" fill="#34d399">притягуються</text>`
          : `<g stroke="#dc2626" stroke-width="3" fill="none">
              <path d="M122 60 L108 60" marker-end="url(#m_ar1)"/>
              <path d="M138 60 L152 60" marker-end="url(#m_ar1)"/>
            </g>
            <text x="130" y="32" text-anchor="middle" font-family="Inter, Arial" font-size="12" font-weight="800" fill="#fca5a5">відштовхуються</text>`
      }
      <defs>
        <marker id="m_ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/>
        </marker>
      </defs>`,
      280,
    );
  },

  /* -------- Conductor vs Insulator -------- */
  conductorInsulator: () =>
    svg(
      "0 0 320 180",
      `
      <!-- copper wire -->
      <g transform="translate(20 50)">
        <rect x="0" y="20" width="120" height="20" fill="#b45309"/>
        <rect x="0" y="20" width="120" height="6" fill="#fbbf24"/>
        <rect x="0" y="20" width="120" height="20" fill="none" stroke="#fde68a" stroke-width="1"/>
        ${[...Array(7)]
          .map(
            (_, i) =>
              `<text x="${10 + i * 16}" y="36" font-family="Inter, Arial" font-size="10" fill="#7c2d12">e⁻</text>`,
          )
          .join("")}
        <text x="60" y="78" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">провідник (мідь)</text>
        <text x="60" y="92" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#cbd5e1">пропускає струм</text>
      </g>
      <!-- rubber -->
      <g transform="translate(180 50)">
        <rect x="0" y="20" width="120" height="20" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <line x1="20" y1="30" x2="32" y2="30" stroke="#ef4444" stroke-width="2"/>
        <line x1="60" y1="30" x2="72" y2="30" stroke="#ef4444" stroke-width="2"/>
        <line x1="100" y1="30" x2="112" y2="30" stroke="#ef4444" stroke-width="2"/>
        <text x="60" y="78" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">ізолятор (гума)</text>
        <text x="60" y="92" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#cbd5e1">не пропускає струм</text>
      </g>`,
      300,
    ),

  /* -------- Solar system -------- */
  solarSystem: () =>
    svg(
      "0 0 360 140",
      `
      <circle cx="30" cy="70" r="22" fill="#fbbf24"/>
      <g stroke="#fbbf24" stroke-width="2">
        <line x1="30" y1="38" x2="30" y2="44"/><line x1="30" y1="96" x2="30" y2="102"/>
        <line x1="-2" y1="70" x2="4" y2="70"/><line x1="56" y1="70" x2="62" y2="70"/>
      </g>
      ${[
        { x: 70, r: 4, c: "#cbd5e1", l: "Мерк" },
        { x: 92, r: 6, c: "#fde68a", l: "Вен" },
        { x: 118, r: 6.5, c: "#22d3ee", l: "Земля" },
        { x: 146, r: 5, c: "#ef4444", l: "Марс" },
        { x: 190, r: 16, c: "#fbbf24", l: "Юпітер" },
        { x: 240, r: 13, c: "#fde68a", l: "Сатурн" },
        { x: 290, r: 10, c: "#67e8f9", l: "Уран" },
        { x: 330, r: 10, c: "#3b82f6", l: "Нептун" },
      ]
        .map(
          (p) => `
        <circle cx="${p.x}" cy="70" r="${p.r}" fill="${p.c}"/>
        <text x="${p.x}" y="${70 + p.r + 14}" text-anchor="middle" font-family="Inter, Arial" font-size="9" fill="#cbd5e1">${p.l}</text>`,
        )
        .join("")}
      <ellipse cx="240" cy="70" rx="20" ry="4" fill="none" stroke="#fde68a" stroke-width="1" opacity="0.7"/>
      <text x="30" y="20" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#fde68a" font-weight="700">Сонце</text>`,
      340,
    ),

  /* -------- Earth + Moon (satellite) -------- */
  earthMoon: () =>
    svg(
      "0 0 260 200",
      `
      <circle cx="100" cy="100" r="50" fill="#1d4ed8"/>
      <path d="M75 90 Q90 80 110 92 L130 96 L135 110 L120 120 L100 124 L80 120 L70 108 Z" fill="#16a34a"/>
      <ellipse cx="200" cy="100" rx="22" ry="22" fill="#cbd5e1"/>
      <circle cx="195" cy="92" r="3" fill="#94a3b8"/>
      <circle cx="208" cy="105" r="4" fill="#94a3b8"/>
      <circle cx="202" cy="115" r="2.5" fill="#94a3b8"/>
      <ellipse cx="150" cy="100" rx="100" ry="40" fill="none" stroke="#475569" stroke-width="1" stroke-dasharray="4 4"/>
      <g font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">
        <text x="100" y="170" text-anchor="middle">Земля</text>
        <text x="200" y="148" text-anchor="middle">Місяць (супутник)</text>
      </g>`,
      260,
    ),

  /* -------- Galaxy -------- */
  galaxy: () =>
    svg(
      "0 0 240 240",
      `
      <defs>
        <radialGradient id="gal" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stop-color="#fde68a"/>
          <stop offset="0.3" stop-color="#fbbf24" stop-opacity="0.5"/>
          <stop offset="1" stop-color="#0f172a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="110" fill="url(#gal)"/>
      ${[0, 60, 120, 180, 240, 300]
        .map(
          (a) =>
            `<path d="M120 120 Q${120 + 80 * Math.cos((Math.PI * a) / 180)} ${120 + 80 * Math.sin((Math.PI * a) / 180)} ${120 + 105 * Math.cos((Math.PI * (a + 40)) / 180)} ${120 + 105 * Math.sin((Math.PI * (a + 40)) / 180)}" stroke="#bae6fd" stroke-width="2" fill="none" opacity="0.6"/>`,
        )
        .join("")}
      <ellipse cx="120" cy="120" rx="22" ry="10" fill="#fde68a"/>
      <circle cx="160" cy="100" r="1.5" fill="#fff"/>
      <circle cx="60" cy="80" r="2" fill="#fff"/>
      <circle cx="180" cy="160" r="1.5" fill="#fff"/>
      <text x="120" y="230" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">галактика Чумацький Шлях</text>`,
      230,
    ),

  /* -------- Earth's spheres -------- */
  earthSpheres: () =>
    svg(
      "0 0 260 260",
      `
      <circle cx="130" cy="130" r="120" fill="#1e1b4b" opacity="0.6"/>
      <circle cx="130" cy="130" r="120" fill="none" stroke="#a78bfa" stroke-width="2" stroke-dasharray="3 3"/>
      <text x="130" y="22" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#a78bfa">атмосфера</text>
      <circle cx="130" cy="130" r="95" fill="#0ea5e9" opacity="0.45"/>
      <text x="130" y="50" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#67e8f9">гідросфера</text>
      <circle cx="130" cy="130" r="70" fill="#16a34a" opacity="0.6"/>
      <text x="130" y="74" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#bbf7d0">біосфера</text>
      <circle cx="130" cy="130" r="48" fill="#92400e"/>
      <text x="130" y="135" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="800">літосфера</text>`,
      240,
    ),

  /* -------- Photosynthesis -------- */
  photosynthesis: () =>
    svg(
      "0 0 320 220",
      `
      <!-- sun -->
      <circle cx="40" cy="40" r="18" fill="#fbbf24"/>
      <g stroke="#fbbf24" stroke-width="2">
        <line x1="40" y1="14" x2="40" y2="22"/><line x1="40" y1="58" x2="40" y2="66"/>
        <line x1="14" y1="40" x2="22" y2="40"/><line x1="58" y1="40" x2="66" y2="40"/>
      </g>
      <!-- plant -->
      <line x1="160" y1="200" x2="160" y2="120" stroke="#15803d" stroke-width="6"/>
      <ellipse cx="135" cy="125" rx="30" ry="14" fill="#16a34a" transform="rotate(-25 135 125)"/>
      <ellipse cx="185" cy="125" rx="30" ry="14" fill="#16a34a" transform="rotate(25 185 125)"/>
      <ellipse cx="160" cy="100" rx="40" ry="16" fill="#16a34a"/>
      <rect x="120" y="200" width="80" height="10" fill="#7c2d12"/>
      <!-- arrows in -->
      <g font-family="Inter, Arial" font-size="11" font-weight="700">
        <text x="40" y="80" fill="#fbbf24">світло →</text>
        <text x="220" y="105" fill="#94a3b8">CO₂ →</text>
        <text x="220" y="125" fill="#94a3b8">↘ всередину</text>
        <text x="220" y="160" fill="#0ea5e9">H₂O ←</text>
      </g>
      <!-- O2 arrow out -->
      <text x="80" y="100" font-family="Inter, Arial" font-size="13" fill="#34d399" font-weight="800">O₂ ↑</text>
      <text x="160" y="215" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#cbd5e1">фотосинтез</text>`,
      300,
    ),

  /* -------- Food chain -------- */
  foodChain: () =>
    svg(
      "0 0 360 100",
      `
      <g font-family="Inter, Arial" font-size="14" text-anchor="middle">
        <text x="40"  y="55" font-size="34">🌿</text><text x="40" y="80" fill="#bbf7d0">рослина</text>
        <text x="120" y="55" font-size="34">🐰</text><text x="120" y="80" fill="#fde68a">травоїдне</text>
        <text x="220" y="55" font-size="34">🦊</text><text x="220" y="80" fill="#fde68a">хижак</text>
        <text x="320" y="55" font-size="34">🍂</text><text x="320" y="80" fill="#a78bfa">розкладачі</text>
      </g>
      <g stroke="#fbbf24" stroke-width="2" fill="none" marker-end="url(#fc_arr)">
        <line x1="64" y1="50" x2="92" y2="50"/>
        <line x1="148" y1="50" x2="192" y2="50"/>
        <line x1="248" y1="50" x2="292" y2="50"/>
      </g>
      <defs>
        <marker id="fc_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#fbbf24"/>
        </marker>
      </defs>`,
      340,
    ),

  /* -------- Geometric shapes -------- */
  triangleEquilateral: () =>
    svg(
      "0 0 200 180",
      `
      <polygon points="100,30 175,150 25,150" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="3"/>
      <g font-family="Inter, Arial" font-size="12" fill="#fde68a" text-anchor="middle">
        <text x="100" y="20">A</text><text x="186" y="160">B</text><text x="14" y="160">C</text>
        <text x="140" y="100" transform="rotate(60 140 100)">a</text>
        <text x="60"  y="100" transform="rotate(-60 60 100)">a</text>
        <text x="100" y="168">a</text>
        <text x="100" y="105" font-size="14" fill="#fbbf24" font-weight="700">60° / 60° / 60°</text>
      </g>`,
      200,
    ),

  rightTriangle: () =>
    svg(
      "0 0 200 180",
      `
      <polygon points="30,150 170,150 30,30" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" stroke-width="3"/>
      <rect x="30" y="135" width="15" height="15" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <g font-family="Inter, Arial" font-size="12" fill="#bae6fd">
        <text x="14" y="22">A</text><text x="180" y="160">B</text><text x="14" y="160">C</text>
        <text x="100" y="170" text-anchor="middle">катет</text>
        <text x="14"  y="100">катет</text>
        <text x="110" y="80" transform="rotate(-32 110 80)" fill="#38bdf8" font-weight="700">гіпотенуза</text>
        <text x="36"  y="148" font-size="11" fill="#fbbf24" font-weight="700">90°</text>
      </g>`,
      200,
    ),

  square: () =>
    svg(
      "0 0 180 180",
      `
      <rect x="30" y="30" width="120" height="120" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="3"/>
      <line x1="30" y1="30" x2="150" y2="150" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>
      <line x1="30" y1="150" x2="150" y2="30" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>
      <line x1="90" y1="30" x2="90" y2="150" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>
      <line x1="30" y1="90" x2="150" y2="90" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>
      <text x="90" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a">квадрат · 4 осі симетрії</text>`,
      180,
    ),

  circle: () =>
    svg(
      "0 0 200 200",
      `
      <circle cx="100" cy="100" r="80" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" stroke-width="3"/>
      <circle cx="100" cy="100" r="3" fill="#fde68a"/>
      <line x1="100" y1="100" x2="180" y2="100" stroke="#fbbf24" stroke-width="2"/>
      <line x1="20" y1="100" x2="180" y2="100" stroke="#34d399" stroke-width="2" stroke-dasharray="4 3"/>
      <g font-family="Inter, Arial" font-size="11" fill="#fde68a">
        <text x="100" y="14" text-anchor="middle">коло</text>
        <text x="138" y="94">радіус</text>
        <text x="100" y="190" text-anchor="middle" fill="#34d399">діаметр = 2 × радіус</text>
      </g>`,
      200,
    ),

  polygon: (sides, label) =>
    svg(
      "0 0 200 200",
      `
      ${(() => {
        const pts = [...Array(sides)]
          .map((_, i) => {
            const a = ((Math.PI * 2) / sides) * i - Math.PI / 2;
            return `${100 + 76 * Math.cos(a)},${100 + 76 * Math.sin(a)}`;
          })
          .join(" ");
        return `<polygon points="${pts}" fill="rgba(167,139,250,0.18)" stroke="#a78bfa" stroke-width="3"/>`;
      })()}
      <text x="100" y="106" text-anchor="middle" font-family="Inter, Arial" font-size="16" font-weight="800" fill="#e9d5ff">${sides}</text>
      <text x="100" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">${label}</text>`,
      180,
    ),

  parallelogram: () =>
    svg(
      "0 0 220 160",
      `
      <polygon points="40,120 160,120 180,40 60,40" fill="rgba(52,211,153,0.18)" stroke="#34d399" stroke-width="3"/>
      <text x="110" y="80" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#bbf7d0" font-weight="800">паралелограм</text>
      <text x="110" y="148" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a">2 пари паралельних сторін</text>`,
      210,
    ),

  trapezoid: () =>
    svg(
      "0 0 220 160",
      `
      <polygon points="40,120 180,120 150,40 70,40" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="3"/>
      <text x="110" y="80" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#fde68a" font-weight="800">трапеція</text>
      <text x="110" y="148" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#cbd5e1">лише 2 паралельні сторони</text>`,
      210,
    ),

  cube: () =>
    svg(
      "0 0 220 200",
      `
      <polygon points="40,160 140,160 180,120 80,120" fill="#1e293b"/>
      <polygon points="40,160 40,80 80,40 80,120" fill="#334155"/>
      <polygon points="80,40 180,40 180,120 80,120" fill="#475569" stroke="#fbbf24" stroke-width="2"/>
      <polygon points="40,80 80,40 180,40 140,80" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <polygon points="40,80 40,160 140,160 140,80" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <polygon points="140,80 180,40 180,120 140,160" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <g font-family="Inter, Arial" font-size="11" fill="#fde68a">
        <text x="110" y="184" text-anchor="middle">куб</text>
        <text x="180" y="174" text-anchor="end">6 граней · 8 вершин · 12 ребер</text>
      </g>`,
      210,
    ),

  sphere: () =>
    svg(
      "0 0 200 180",
      `
      <defs>
        <radialGradient id="sph" cx="0.35" cy="0.35" r="0.65">
          <stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#1e3a8a"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="90" r="60" fill="url(#sph)"/>
      <ellipse cx="100" cy="90" rx="60" ry="12" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.6"/>
      <ellipse cx="100" cy="155" rx="50" ry="6" fill="#0f172a" opacity="0.5"/>
      <text x="100" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bae6fd" font-weight="700">куля</text>`,
      180,
    ),

  cone: () =>
    svg(
      "0 0 200 200",
      `
      <ellipse cx="100" cy="160" rx="60" ry="10" fill="#a78bfa"/>
      <path d="M40 160 L100 30 L160 160" fill="rgba(167,139,250,0.25)" stroke="#a78bfa" stroke-width="2"/>
      <ellipse cx="100" cy="160" rx="60" ry="10" fill="none" stroke="#a78bfa" stroke-width="2"/>
      <text x="100" y="188" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#e9d5ff" font-weight="700">конус</text>`,
      180,
    ),

  cylinder: () =>
    svg(
      "0 0 200 200",
      `
      <ellipse cx="100" cy="40" rx="55" ry="14" fill="#fbbf24"/>
      <rect x="45" y="40" width="110" height="120" fill="rgba(251,191,36,0.2)"/>
      <line x1="45" y1="40" x2="45" y2="160" stroke="#fbbf24" stroke-width="2"/>
      <line x1="155" y1="40" x2="155" y2="160" stroke="#fbbf24" stroke-width="2"/>
      <ellipse cx="100" cy="160" rx="55" ry="14" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <ellipse cx="100" cy="40" rx="55" ry="14" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <text x="100" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">циліндр</text>`,
      180,
    ),

  pyramid: () =>
    svg(
      "0 0 200 200",
      `
      <polygon points="30,160 170,160 100,40" fill="rgba(251,146,60,0.25)" stroke="#fb923c" stroke-width="2"/>
      <polygon points="30,160 170,160 130,180" fill="rgba(120,53,15,0.4)" stroke="#fb923c" stroke-width="1.5"/>
      <line x1="100" y1="40" x2="130" y2="180" stroke="#fb923c" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text x="100" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fed7aa" font-weight="700">піраміда</text>`,
      180,
    ),

  /* -------- Simple machines -------- */
  lever: () =>
    svg(
      "0 0 320 160",
      `
      <line x1="20" y1="100" x2="300" y2="60" stroke="#a3a3a3" stroke-width="8" stroke-linecap="round"/>
      <polygon points="160,90 130,140 190,140" fill="#7c2d12"/>
      <rect x="14" y="92" width="40" height="40" fill="#475569" stroke="#1e293b" stroke-width="2"/>
      <text x="34" y="118" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fff" font-weight="800">F</text>
      <circle cx="280" cy="68" r="18" fill="#fbbf24"/>
      <text x="160" y="158" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">важіль</text>`,
      300,
    ),

  pulley: () =>
    svg(
      "0 0 220 240",
      `
      <line x1="40" y1="20" x2="180" y2="20" stroke="#a3a3a3" stroke-width="4"/>
      <circle cx="110" cy="50" r="26" fill="#475569" stroke="#a3a3a3" stroke-width="3"/>
      <circle cx="110" cy="50" r="22" fill="none" stroke="#1e293b" stroke-width="6"/>
      <circle cx="110" cy="50" r="4" fill="#fde68a"/>
      <line x1="86" y1="55" x2="86" y2="180" stroke="#fde68a" stroke-width="2"/>
      <line x1="134" y1="55" x2="134" y2="200" stroke="#fde68a" stroke-width="2"/>
      <rect x="74" y="180" width="24" height="24" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
      <rect x="122" y="200" width="24" height="24" fill="#16a34a" stroke="#14532d" stroke-width="1.5"/>
      <text x="110" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">блок</text>`,
      210,
    ),

  wedge: () =>
    svg(
      "0 0 240 160",
      `
      <rect x="30" y="50" width="80" height="80" fill="#7c2d12" stroke="#a16207" stroke-width="1.5"/>
      <line x1="30" y1="90" x2="110" y2="90" stroke="#fbbf24" stroke-width="1" stroke-dasharray="4 4"/>
      <polygon points="120,60 220,90 120,120" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <text x="130" y="80" font-family="Inter, Arial" font-size="11" fill="#1e293b" font-weight="800">клин</text>
      <text x="120" y="150" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">клин розколює деревину</text>`,
      230,
    ),

  inclinedPlane: () =>
    svg(
      "0 0 280 160",
      `
      <polygon points="20,130 260,130 260,40" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="3"/>
      <rect x="200" y="60" width="22" height="18" fill="#dc2626" transform="rotate(-22 211 69)"/>
      <text x="160" y="148" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">похила площина (пандус)</text>`,
      260,
    ),

  wheelAxle: () =>
    svg(
      "0 0 240 160",
      `
      <circle cx="120" cy="80" r="60" fill="#475569" stroke="#fbbf24" stroke-width="3"/>
      <circle cx="120" cy="80" r="12" fill="#fbbf24"/>
      ${[0, 60, 120, 180, 240, 300]
        .map((a) => {
          const rad = (Math.PI * a) / 180;
          return `<line x1="120" y1="80" x2="${120 + 56 * Math.cos(rad)}" y2="${80 + 56 * Math.sin(rad)}" stroke="#cbd5e1" stroke-width="3"/>`;
        })
        .join("")}
      <text x="120" y="152" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">колесо й вісь</text>`,
      220,
    ),

  /* -------- Engineering structures -------- */
  bridge: () =>
    svg(
      "0 0 320 160",
      `
      <rect x="0" y="120" width="320" height="40" fill="#0ea5e9" opacity="0.5"/>
      <rect x="0" y="80" width="320" height="20" fill="#475569"/>
      <path d="M40 80 Q160 0 280 80" stroke="#fbbf24" stroke-width="4" fill="none"/>
      ${[60, 110, 160, 210, 260]
        .map(
          (x) =>
            `<line x1="${x}" y1="80" x2="${x}" y2="${80 - Math.abs(160 - x) / 4 - 30}" stroke="#fbbf24" stroke-width="2"/>`,
        )
        .join("")}
      <rect x="40" y="80" width="14" height="80" fill="#475569"/>
      <rect x="266" y="80" width="14" height="80" fill="#475569"/>
      <text x="160" y="32" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">міст через річку</text>`,
      300,
    ),

  tunnel: () =>
    svg(
      "0 0 280 180",
      `
      <rect x="0" y="120" width="280" height="60" fill="#7c2d12"/>
      <rect x="0" y="50" width="280" height="80" fill="#16a34a"/>
      <path d="M60 130 Q140 50 220 130 Z" fill="#0f172a" stroke="#fde68a" stroke-width="2"/>
      <rect x="98" y="120" width="84" height="8" fill="#475569"/>
      <line x1="140" y1="120" x2="140" y2="130" stroke="#fbbf24"/>
      <text x="140" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">тунель</text>`,
      260,
    ),

  tower: () =>
    svg(
      "0 0 180 240",
      `
      <polygon points="60,210 60,90 90,40 120,90 120,210" fill="#475569" stroke="#fbbf24" stroke-width="2"/>
      <line x1="60" y1="130" x2="120" y2="130" stroke="#fbbf24"/>
      <line x1="60" y1="170" x2="120" y2="170" stroke="#fbbf24"/>
      <circle cx="90" cy="30" r="6" fill="#dc2626"/>
      <line x1="90" y1="40" x2="90" y2="22" stroke="#fde68a" stroke-width="2"/>
      <g stroke="#bae6fd" stroke-width="1.5" fill="none">
        <path d="M82 30 Q90 12 98 30"/>
        <path d="M76 30 Q90 4 104 30"/>
      </g>
      <text x="90" y="232" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">вежа</text>`,
      180,
    ),

  dam: () =>
    svg(
      "0 0 320 180",
      `
      <rect x="0" y="20" width="120" height="140" fill="#0ea5e9"/>
      <polygon points="120,160 120,20 160,40 160,160" fill="#475569" stroke="#fbbf24" stroke-width="2"/>
      <rect x="160" y="100" width="160" height="60" fill="#0ea5e9"/>
      <line x1="120" y1="60" x2="120" y2="160" stroke="#bae6fd" stroke-width="1" stroke-dasharray="3 3"/>
      <g stroke="#fde68a" stroke-width="2">
        <line x1="135" y1="70" x2="160" y2="90"/>
        <line x1="135" y1="100" x2="160" y2="120"/>
      </g>
      <text x="160" y="174" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">гребля / ГЕС</text>`,
      300,
    ),

  /* -------- Energy sources -------- */
  solarPanel: () =>
    svg(
      "0 0 280 180",
      `
      <circle cx="40" cy="40" r="18" fill="#fbbf24"/>
      <g stroke="#fbbf24" stroke-width="2">
        <line x1="40" y1="14" x2="40" y2="22"/><line x1="40" y1="58" x2="40" y2="66"/>
        <line x1="14" y1="40" x2="22" y2="40"/><line x1="58" y1="40" x2="66" y2="40"/>
      </g>
      <g transform="translate(160 80) rotate(-15)">
        <rect x="-60" y="-30" width="120" height="60" fill="#1d4ed8" stroke="#bae6fd" stroke-width="2"/>
        <g stroke="#bae6fd" stroke-width="1">
          <line x1="-60" y1="-10" x2="60" y2="-10"/><line x1="-60" y1="10" x2="60" y2="10"/>
          <line x1="-20" y1="-30" x2="-20" y2="30"/><line x1="20" y1="-30" x2="20" y2="30"/>
        </g>
      </g>
      <rect x="150" y="120" width="20" height="40" fill="#475569"/>
      <g stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3 3">
        <line x1="60" y1="50" x2="120" y2="70"/>
      </g>
      <text x="140" y="172" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">сонячна панель</text>`,
      270,
    ),

  windTurbine: () =>
    svg(
      "0 0 200 240",
      `
      <ellipse cx="100" cy="220" rx="80" ry="10" fill="#0f172a"/>
      <polygon points="94,220 106,220 102,80 98,80" fill="#cbd5e1"/>
      <g transform="translate(100 80)">
        <ellipse cx="0" cy="0" rx="6" ry="8" fill="#fbbf24"/>
        <ellipse cx="-40" cy="-20" rx="42" ry="6" fill="#cbd5e1" transform="rotate(40)"/>
        <ellipse cx="-40" cy="-20" rx="42" ry="6" fill="#cbd5e1" transform="rotate(160)"/>
        <ellipse cx="-40" cy="-20" rx="42" ry="6" fill="#cbd5e1" transform="rotate(280)"/>
      </g>
      <text x="100" y="234" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">вітрова турбіна</text>`,
      180,
    ),

  nuclearPlant: () =>
    svg(
      "0 0 280 200",
      `
      <path d="M80 180 L70 80 Q70 60 95 50 Q120 60 120 80 L110 180 Z" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <path d="M180 180 L170 80 Q170 60 195 50 Q220 60 220 80 L210 180 Z" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <g fill="#e2e8f0" opacity="0.8">
        <ellipse cx="95" cy="40" rx="22" ry="10"/>
        <ellipse cx="195" cy="40" rx="22" ry="10"/>
      </g>
      <g transform="translate(50 130)">
        <circle r="14" fill="none" stroke="#facc15" stroke-width="2"/>
        <ellipse rx="14" ry="6" fill="none" stroke="#facc15" stroke-width="2"/>
        <ellipse rx="14" ry="6" fill="none" stroke="#facc15" stroke-width="2" transform="rotate(60)"/>
        <ellipse rx="14" ry="6" fill="none" stroke="#facc15" stroke-width="2" transform="rotate(120)"/>
        <circle r="3" fill="#facc15"/>
      </g>
      <text x="140" y="194" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">атомна (АЕС) — енергія атома</text>`,
      280,
    ),

  /* -------- Tech gadgets -------- */
  printer3d: () =>
    svg(
      "0 0 220 200",
      `
      <rect x="40" y="40" width="140" height="120" fill="none" stroke="#fbbf24" stroke-width="3" rx="4"/>
      <rect x="40" y="40" width="140" height="20" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <rect x="60" y="70" width="100" height="6" fill="#fde68a"/>
      <rect x="105" y="76" width="10" height="40" fill="#475569"/>
      <polygon points="100,116 120,116 110,128" fill="#dc2626"/>
      <rect x="70" y="135" width="80" height="14" fill="#fbbf24"/>
      <rect x="60" y="149" width="100" height="6" fill="#475569"/>
      <text x="110" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">3D-принтер</text>`,
      200,
    ),

  vrHeadset: () =>
    svg(
      "0 0 240 160",
      `
      <rect x="40" y="50" width="160" height="70" rx="14" fill="#1e293b" stroke="#a78bfa" stroke-width="3"/>
      <circle cx="90" cy="85" r="18" fill="#0ea5e9" stroke="#bae6fd" stroke-width="2"/>
      <circle cx="150" cy="85" r="18" fill="#0ea5e9" stroke="#bae6fd" stroke-width="2"/>
      <circle cx="90" cy="85" r="6" fill="#0f172a"/>
      <circle cx="150" cy="85" r="6" fill="#0f172a"/>
      <path d="M40 70 Q20 90 40 110" fill="none" stroke="#a78bfa" stroke-width="3"/>
      <path d="M200 70 Q220 90 200 110" fill="none" stroke="#a78bfa" stroke-width="3"/>
      <text x="120" y="144" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#e9d5ff" font-weight="700">VR-окуляри</text>`,
      230,
    ),

  arPhone: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="70" y="20" width="100" height="170" rx="14" fill="#1e293b" stroke="#fbbf24" stroke-width="2.5"/>
      <rect x="80" y="40" width="80" height="120" fill="#0ea5e9"/>
      <circle cx="120" cy="80" r="22" fill="#fbbf24" opacity="0.7"/>
      <polygon points="120,100 100,140 140,140" fill="#34d399" opacity="0.8"/>
      <text x="120" y="76" text-anchor="middle" font-family="Inter, Arial" font-size="22" fill="#fff" font-weight="800">AR</text>
      <text x="120" y="184" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">AR — доповнена реальність</text>`,
      210,
    ),

  drone: () =>
    svg(
      "0 0 260 160",
      `
      <rect x="100" y="70" width="60" height="22" rx="6" fill="#475569" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="40" cy="50" r="22" fill="none" stroke="#94a3b8" stroke-width="3"/>
      <circle cx="220" cy="50" r="22" fill="none" stroke="#94a3b8" stroke-width="3"/>
      <circle cx="40" cy="110" r="22" fill="none" stroke="#94a3b8" stroke-width="3"/>
      <circle cx="220" cy="110" r="22" fill="none" stroke="#94a3b8" stroke-width="3"/>
      <line x1="62" y1="50" x2="105" y2="78" stroke="#475569" stroke-width="4"/>
      <line x1="62" y1="110" x2="105" y2="84" stroke="#475569" stroke-width="4"/>
      <line x1="198" y1="50" x2="155" y2="78" stroke="#475569" stroke-width="4"/>
      <line x1="198" y1="110" x2="155" y2="84" stroke="#475569" stroke-width="4"/>
      <rect x="118" y="90" width="24" height="10" fill="#0f172a"/>
      <text x="130" y="148" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">дрон</text>`,
      250,
    ),

  gps: () =>
    svg(
      "0 0 280 200",
      `
      <ellipse cx="140" cy="170" rx="120" ry="12" fill="#0f172a"/>
      <rect x="40" y="120" width="200" height="40" fill="#16a34a" rx="3"/>
      <circle cx="120" cy="140" r="6" fill="#dc2626"/>
      <line x1="120" y1="140" x2="120" y2="80" stroke="#dc2626" stroke-width="2" stroke-dasharray="3 3"/>
      <g transform="translate(180 50)">
        <rect x="-20" y="-8" width="40" height="16" fill="#cbd5e1"/>
        <rect x="-30" y="-4" width="10" height="8" fill="#1d4ed8"/>
        <rect x="20" y="-4" width="10" height="8" fill="#1d4ed8"/>
      </g>
      <g stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 3">
        <line x1="180" y1="60" x2="120" y2="135"/>
        <line x1="180" y1="60" x2="60" y2="135"/>
        <line x1="180" y1="60" x2="220" y2="135"/>
      </g>
      <text x="140" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">GPS — координати від супутників</text>`,
      270,
    ),

  qrCode: () =>
    svg(
      "0 0 160 160",
      `
      <rect width="160" height="160" fill="#fff"/>
      ${[
        [10, 10, 40, 40],
        [110, 10, 40, 40],
        [10, 110, 40, 40],
      ]
        .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000"/><rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" fill="#fff"/><rect x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 24}" fill="#000"/>`)
        .join("")}
      ${[...Array(60)]
        .map(() => {
          const x = 10 + Math.floor(Math.random() * 14) * 10;
          const y = 10 + Math.floor(Math.random() * 14) * 10;
          if ((x < 50 && y < 50) || (x > 100 && y < 50) || (x < 50 && y > 100))
            return "";
          return `<rect x="${x}" y="${y}" width="10" height="10" fill="#000"/>`;
        })
        .join("")}
      <text x="80" y="158" text-anchor="middle" font-family="Inter, Arial" font-size="9" fill="#0d1117">QR</text>`,
      150,
    ),

  barcode: () =>
    svg(
      "0 0 240 100",
      `
      <rect width="240" height="100" fill="#fff"/>
      ${[
        4, 2, 6, 2, 4, 4, 2, 4, 2, 6, 2, 4, 8, 2, 4, 2, 6, 2, 8, 4, 2, 6, 2, 4,
        2, 4,
      ]
        .reduce(
          (acc, w, i) => {
            const x = acc[acc.length - 1].x + acc[acc.length - 1].w;
            acc.push({ x, w, b: i % 2 === 0 });
            return acc;
          },
          [{ x: 12, w: 0, b: false }],
        )
        .slice(1)
        .map((b) =>
          b.b
            ? `<rect x="${b.x}" y="14" width="${b.w}" height="60" fill="#000"/>`
            : "",
        )
        .join("")}
      <text x="120" y="92" text-anchor="middle" font-family="monospace" font-size="11" fill="#000">0123 4567 8901</text>`,
      230,
    ),

  /* -------- Anatomy: heart -------- */
  heart: () =>
    svg(
      "0 0 200 200",
      `
      <defs>
        <radialGradient id="hrt" cx="0.4" cy="0.3" r="0.7">
          <stop offset="0" stop-color="#fda4af"/><stop offset="1" stop-color="#9f1239"/>
        </radialGradient>
      </defs>
      <path d="M100 170 C40 130, 30 80, 60 50 C80 30, 100 50, 100 70 C100 50, 120 30, 140 50 C170 80, 160 130, 100 170 Z" fill="url(#hrt)" stroke="#7f1d1d" stroke-width="2"/>
      <path d="M80 60 Q100 80 120 60" fill="none" stroke="#fff" stroke-width="2" opacity="0.6"/>
      <text x="100" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fda4af" font-weight="700">серце (≈ з кулак)</text>`,
      190,
    ),

  /* -------- Anatomy: kidneys -------- */
  kidneys: () =>
    svg(
      "0 0 240 200",
      `
      <path d="M60 40 Q30 80 50 140 Q80 160 100 130 Q90 80 80 40 Q70 30 60 40 Z" fill="#7c2d12" stroke="#fbbf24" stroke-width="2"/>
      <path d="M180 40 Q210 80 190 140 Q160 160 140 130 Q150 80 160 40 Q170 30 180 40 Z" fill="#7c2d12" stroke="#fbbf24" stroke-width="2"/>
      <text x="120" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fed7aa" font-weight="700">нирки — очищують кров</text>`,
      220,
    ),

  /* -------- Anatomy: lungs/trachea -------- */
  lungsTrachea: () =>
    svg(
      "0 0 220 220",
      `
      <rect x="100" y="20" width="20" height="60" rx="6" fill="#cbd5e1"/>
      <line x1="106" y1="30" x2="114" y2="30" stroke="#94a3b8"/>
      <line x1="106" y1="44" x2="114" y2="44" stroke="#94a3b8"/>
      <line x1="106" y1="58" x2="114" y2="58" stroke="#94a3b8"/>
      <path d="M100 80 Q60 100 50 150 Q50 190 90 195 Q100 180 100 130 Z" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
      <path d="M120 80 Q160 100 170 150 Q170 190 130 195 Q120 180 120 130 Z" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
      <line x1="110" y1="80" x2="110" y2="120" stroke="#94a3b8" stroke-width="2"/>
      <text x="110" y="216" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fda4af" font-weight="700">трахея і легені</text>`,
      200,
    ),

  /* -------- Anatomy: brain -------- */
  brain: () =>
    svg(
      "0 0 220 200",
      `
      <path d="M60 100 Q40 60 80 50 Q90 30 120 40 Q150 30 160 60 Q180 70 170 110 Q180 140 150 150 Q120 165 90 150 Q60 145 60 100 Z" fill="#fda4af" stroke="#be123c" stroke-width="2"/>
      <g stroke="#be123c" stroke-width="1.5" fill="none">
        <path d="M80 80 Q90 90 80 100"/>
        <path d="M110 70 Q120 85 110 100"/>
        <path d="M140 80 Q150 90 140 100"/>
        <path d="M90 120 Q100 130 90 140"/>
        <path d="M130 120 Q140 130 130 140"/>
      </g>
      <text x="110" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fda4af" font-weight="700">мозок</text>`,
      200,
    ),

  /* -------- Atom -------- */
  atom: () =>
    svg(
      "0 0 240 220",
      `
      <ellipse cx="120" cy="110" rx="100" ry="32" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <ellipse cx="120" cy="110" rx="100" ry="32" fill="none" stroke="#a78bfa" stroke-width="2" transform="rotate(60 120 110)"/>
      <ellipse cx="120" cy="110" rx="100" ry="32" fill="none" stroke="#fb923c" stroke-width="2" transform="rotate(120 120 110)"/>
      <circle cx="120" cy="110" r="14" fill="#fbbf24" stroke="#fde68a" stroke-width="2"/>
      <circle cx="220" cy="110" r="6" fill="#38bdf8"/>
      <circle cx="60" cy="40" r="6" fill="#a78bfa"/>
      <circle cx="180" cy="180" r="6" fill="#fb923c"/>
      <text x="120" y="206" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">атом · ядро + електрони</text>`,
      220,
    ),

  /* -------- H2O molecule -------- */
  h2o: () =>
    svg(
      "0 0 220 200",
      `
      <line x1="80" y1="60" x2="110" y2="110" stroke="#cbd5e1" stroke-width="4"/>
      <line x1="160" y1="60" x2="110" y2="110" stroke="#cbd5e1" stroke-width="4"/>
      <circle cx="110" cy="110" r="36" fill="#0ea5e9" stroke="#bae6fd" stroke-width="2"/>
      <text x="110" y="118" text-anchor="middle" font-family="Inter, Arial" font-size="22" fill="#fff" font-weight="900">O</text>
      <circle cx="80" cy="60" r="22" fill="#dc2626" stroke="#fca5a5" stroke-width="2"/>
      <text x="80" y="68" text-anchor="middle" font-family="Inter, Arial" font-size="18" fill="#fff" font-weight="900">H</text>
      <circle cx="160" cy="60" r="22" fill="#dc2626" stroke="#fca5a5" stroke-width="2"/>
      <text x="160" y="68" text-anchor="middle" font-family="Inter, Arial" font-size="18" fill="#fff" font-weight="900">H</text>
      <text x="110" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#bae6fd" font-weight="800">H₂O — молекула води</text>`,
      210,
    ),

  /* -------- Volcano -------- */
  volcano: () =>
    svg(
      "0 0 280 200",
      `
      <polygon points="20,180 140,40 260,180" fill="#475569" stroke="#1e293b" stroke-width="2"/>
      <polygon points="100,90 140,40 180,90 170,180 110,180" fill="#7c2d12"/>
      <path d="M110 90 Q140 30 170 90 Z" fill="#dc2626"/>
      <path d="M130 60 Q140 30 150 60" fill="#fbbf24"/>
      <g fill="#dc2626">
        <ellipse cx="140" cy="25" rx="16" ry="10"/>
        <ellipse cx="115" cy="15" rx="10" ry="6"/>
        <ellipse cx="165" cy="15" rx="10" ry="6"/>
      </g>
      <path d="M170 90 Q200 130 240 175" stroke="#fb923c" stroke-width="6" fill="none"/>
      <text x="140" y="195" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="700">виверження вулкана</text>`,
      260,
    ),

  /* -------- Earthquake -------- */
  earthquake: () =>
    svg(
      "0 0 320 180",
      `
      <rect x="0" y="100" width="320" height="80" fill="#7c2d12"/>
      <path d="M0 100 L40 100 L60 80 L100 100 L160 100 L180 130 L240 100 L320 100" stroke="#fbbf24" stroke-width="2" fill="none"/>
      <line x1="160" y1="100" x2="160" y2="180" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>
      <circle cx="160" cy="170" r="6" fill="#dc2626"/>
      <g stroke="#fb923c" stroke-width="2" fill="none">
        <path d="M120 60 Q160 30 200 60"/>
        <path d="M100 40 Q160 0 220 40"/>
      </g>
      <text x="160" y="22" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fb923c" font-weight="700">сейсмічні хвилі</text>
      <text x="160" y="174" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#fde68a" font-weight="700">епіцентр</text>`,
      310,
    ),

  /* -------- Tornado -------- */
  tornado: () =>
    svg(
      "0 0 200 220",
      `
      <ellipse cx="100" cy="40" rx="80" ry="14" fill="#475569"/>
      <ellipse cx="100" cy="40" rx="60" ry="10" fill="#1e293b"/>
      <path d="M40 50 Q60 90 80 140 Q90 170 100 200 Q110 170 120 140 Q140 90 160 50 Z" fill="rgba(148,163,184,0.5)" stroke="#cbd5e1" stroke-width="2"/>
      <g stroke="#fff" stroke-width="1" opacity="0.6" fill="none">
        <path d="M48 60 Q100 80 152 60"/>
        <path d="M58 100 Q100 120 142 100"/>
        <path d="M72 140 Q100 155 128 140"/>
      </g>
      <text x="100" y="216" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">торнадо / смерч</text>`,
      200,
    ),

  /* -------- Tsunami -------- */
  tsunami: () =>
    svg(
      "0 0 320 180",
      `
      <rect x="0" y="120" width="320" height="60" fill="#92400e"/>
      <path d="M20 130 Q50 50 100 80 Q140 30 200 60 Q260 30 300 100 L300 130 Z" fill="#0ea5e9" stroke="#bae6fd" stroke-width="2"/>
      <path d="M100 80 Q120 60 140 80 Q150 50 170 80" fill="#fff" opacity="0.7"/>
      <g fill="#fff" opacity="0.7">
        <circle cx="220" cy="60" r="2"/>
        <circle cx="240" cy="50" r="3"/>
        <circle cx="180" cy="40" r="2"/>
      </g>
      <text x="160" y="22" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bae6fd" font-weight="700">цунамі — велика морська хвиля</text>`,
      300,
    ),

  /* -------- Lever angles: clock used for 3:00 (90°) and 6:00 (180°) — uses clock() -------- */

  /* -------- Coordinate plane -------- */
  coordPlane: () =>
    svg(
      "0 0 220 220",
      `
      <rect width="220" height="220" fill="#0f172a"/>
      ${[...Array(11)]
        .map(
          (_, i) =>
            `<line x1="${i * 20}" y1="0" x2="${i * 20}" y2="220" stroke="#1e293b" stroke-width="1"/><line x1="0" y1="${i * 20}" x2="220" y2="${i * 20}" stroke="#1e293b" stroke-width="1"/>`,
        )
        .join("")}
      <line x1="20" y1="200" x2="20" y2="10" stroke="#fbbf24" stroke-width="2" marker-end="url(#cp_a)"/>
      <line x1="10" y1="200" x2="210" y2="200" stroke="#fbbf24" stroke-width="2" marker-end="url(#cp_a)"/>
      <defs>
        <marker id="cp_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#fbbf24"/>
        </marker>
      </defs>
      <circle cx="80" cy="100" r="5" fill="#34d399"/>
      <text x="86" y="96" font-family="Inter, Arial" font-size="11" fill="#bbf7d0" font-weight="700">(3; 5)</text>
      <line x1="80" y1="100" x2="80" y2="200" stroke="#34d399" stroke-width="1" stroke-dasharray="3 3"/>
      <line x1="80" y1="100" x2="20" y2="100" stroke="#34d399" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="208" y="214" font-family="Inter, Arial" font-size="11" fill="#fbbf24">x</text>
      <text x="6" y="14" font-family="Inter, Arial" font-size="11" fill="#fbbf24">y</text>`,
      210,
    ),

  /* -------- Recycling -------- */
  recycling: () =>
    svg(
      "0 0 200 200",
      `
      <g transform="translate(100 100)" fill="#16a34a" stroke="#14532d" stroke-width="1.5">
        <path d="M-20 -50 L20 -50 L0 -80 Z"/>
        <path d="M-65 35 L-45 70 L-25 50 Z"/>
        <path d="M65 35 L25 50 L45 70 Z"/>
        <path d="M-20 -50 L-50 -10 Q-65 5 -50 25 L-35 35" fill="none" stroke-width="6"/>
        <path d="M20 -50 L50 -10 Q65 5 50 25 L35 35" fill="none" stroke-width="6"/>
        <path d="M-30 60 L0 70 L30 60" fill="none" stroke-width="6"/>
      </g>
      <text x="100" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bbf7d0" font-weight="700">рециклінг</text>`,
      180,
    ),

  /* -------- Logic gates truth table for AND/OR -------- */
  truthTable: (op) => {
    const rows =
      op === "AND"
        ? [
            ["0", "0", "0"],
            ["0", "1", "0"],
            ["1", "0", "0"],
            ["1", "1", "1"],
          ]
        : [
            ["0", "0", "0"],
            ["0", "1", "1"],
            ["1", "0", "1"],
            ["1", "1", "1"],
          ];
    return schemeTable(["A", "B", op === "AND" ? "A І B" : "A АБО B"], rows);
  },

  /* -------- Number line for opposites -------- */
  numberLine: () =>
    svg(
      "0 0 320 100",
      `
      <line x1="20" y1="60" x2="300" y2="60" stroke="#fbbf24" stroke-width="3"/>
      ${[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
        .map((n, i) => {
          const x = 20 + i * 28;
          return `<line x1="${x}" y1="55" x2="${x}" y2="65" stroke="#fbbf24" stroke-width="2"/><text x="${x}" y="86" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a">${n}</text>`;
        })
        .join("")}
      <circle cx="${20 + 0 * 28}" cy="60" r="6" fill="#dc2626"/>
      <circle cx="${20 + 10 * 28}" cy="60" r="6" fill="#16a34a"/>
      <text x="${20 + 0 * 28}" y="40" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fca5a5">−5</text>
      <text x="${20 + 10 * 28}" y="40" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#bbf7d0">+5</text>
      <path d="M${20 + 5 * 28} 40 Q160 10 ${20 + 10 * 28} 40" fill="none" stroke="#fde68a" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text x="160" y="14" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a">протилежні</text>`,
      300,
    ),

  /* -------- Circuit warning (electrical outlet danger) -------- */
  outletWarning: () =>
    svg(
      "0 0 220 200",
      `
      <rect x="60" y="40" width="100" height="100" rx="10" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
      <ellipse cx="110" cy="90" rx="35" ry="40" fill="#1e293b"/>
      <rect x="98" y="75" width="5" height="14" fill="#fde68a"/>
      <rect x="117" y="75" width="5" height="14" fill="#fde68a"/>
      <g stroke="#dc2626" stroke-width="4" stroke-linecap="round">
        <line x1="60" y1="40" x2="160" y2="140"/>
        <line x1="160" y1="40" x2="60" y2="140"/>
      </g>
      <text x="110" y="178" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fca5a5" font-weight="800">⚠ небезпечно!</text>`,
      200,
    ),

  /* -------- Lab safety glasses -------- */
  goggles: () =>
    svg(
      "0 0 240 140",
      `
      <ellipse cx="80" cy="70" rx="40" ry="30" fill="#bae6fd" stroke="#0284c7" stroke-width="3"/>
      <ellipse cx="160" cy="70" rx="40" ry="30" fill="#bae6fd" stroke="#0284c7" stroke-width="3"/>
      <line x1="115" y1="70" x2="125" y2="70" stroke="#0284c7" stroke-width="4"/>
      <path d="M40 70 Q20 70 16 90" fill="none" stroke="#0284c7" stroke-width="3"/>
      <path d="M200 70 Q220 70 224 90" fill="none" stroke="#0284c7" stroke-width="3"/>
      <text x="120" y="128" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bae6fd" font-weight="700">захисні окуляри</text>`,
      220,
    ),

  /* -------- Butterfly metamorphosis -------- */
  metamorphosis: () =>
    svg(
      "0 0 380 120",
      `
      <g font-family="Inter, Arial" font-size="36" text-anchor="middle">
        <text x="50"  y="60">🥚</text>
        <text x="140" y="60">🐛</text>
        <text x="240" y="60">🛡</text>
        <text x="340" y="60">🦋</text>
      </g>
      <g font-family="Inter, Arial" font-size="11" fill="#fde68a" text-anchor="middle">
        <text x="50"  y="98">яйце</text>
        <text x="140" y="98">гусениця</text>
        <text x="240" y="98">лялечка</text>
        <text x="340" y="98">метелик</text>
      </g>
      <g stroke="#fbbf24" stroke-width="2" fill="none" marker-end="url(#mm_a)">
        <line x1="76"  y1="50" x2="116" y2="50"/>
        <line x1="166" y1="50" x2="214" y2="50"/>
        <line x1="266" y1="50" x2="314" y2="50"/>
      </g>
      <defs>
        <marker id="mm_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#fbbf24"/>
        </marker>
      </defs>`,
      370,
    ),

  /* -------- Air composition pie -------- */
  airComposition: () =>
    svg(
      "0 0 220 180",
      `
      <circle cx="80" cy="80" r="60" fill="#1d4ed8"/>
      <path d="M80 80 L80 20 A60 60 0 0 1 130 110 Z" fill="#fbbf24"/>
      <path d="M80 80 L130 110 A60 60 0 0 1 80 140 Z" fill="#dc2626"/>
      <text x="80" y="80" text-anchor="middle" font-family="Inter, Arial" font-size="13" font-weight="800" fill="#fff">Повітря</text>
      <g font-family="Inter, Arial" font-size="11" fill="#fde68a">
        <text x="148" y="40">N₂ — 78%</text>
        <text x="148" y="86">O₂ — 21%</text>
        <text x="148" y="132">інші — 1%</text>
        <line x1="138" y1="36" x2="120" y2="50" stroke="#1d4ed8" stroke-width="2"/>
        <line x1="138" y1="82" x2="120" y2="80" stroke="#fbbf24" stroke-width="2"/>
        <line x1="138" y1="128" x2="120" y2="120" stroke="#dc2626" stroke-width="2"/>
      </g>`,
      210,
    ),

  /* -------- Cell -------- */
  cell: () =>
    svg(
      "0 0 220 200",
      `
      <ellipse cx="110" cy="100" rx="90" ry="70" fill="rgba(110,231,183,0.18)" stroke="#34d399" stroke-width="3"/>
      <ellipse cx="100" cy="100" rx="22" ry="18" fill="#1d4ed8"/>
      <circle cx="100" cy="100" r="6" fill="#fde68a"/>
      <ellipse cx="60" cy="80" rx="6" ry="3" fill="#fbbf24"/>
      <ellipse cx="160" cy="120" rx="8" ry="3" fill="#fbbf24"/>
      <ellipse cx="140" cy="80" rx="4" ry="2" fill="#fbbf24"/>
      <g font-family="Inter, Arial" font-size="10" fill="#bbf7d0">
        <text x="110" y="186" text-anchor="middle" font-weight="700">клітина</text>
        <text x="124" y="98">ядро</text>
        <line x1="118" y1="100" x2="106" y2="100" stroke="#bbf7d0" stroke-width="1"/>
      </g>`,
      210,
    ),

  /* -------- Lightning vs thunder -------- */
  lightning: () =>
    svg(
      "0 0 240 200",
      `
      <ellipse cx="80" cy="40" rx="60" ry="18" fill="#475569"/>
      <ellipse cx="160" cy="40" rx="50" ry="14" fill="#475569"/>
      <polygon points="100,60 80,110 110,110 90,170 130,100 100,100 120,60" fill="#fbbf24" stroke="#fef08a" stroke-width="2"/>
      <text x="120" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">блискавка (світло) → грім (звук пізніше)</text>`,
      230,
    ),

  /* -------- Pendulum / simple machine reference, but skip -------- */

  /* -------- Friction (rubbing hands) -------- */
  friction: () =>
    svg(
      "0 0 240 180",
      `
      <g transform="translate(120 90)">
        <rect x="-60" y="-12" width="60" height="24" rx="8" fill="#fde68a" stroke="#92400e" stroke-width="2"/>
        <rect x="0" y="-12" width="60" height="24" rx="8" fill="#fde68a" stroke="#92400e" stroke-width="2"/>
        <g stroke="#dc2626" stroke-width="2" fill="none" marker-end="url(#f_a)">
          <line x1="-30" y1="-26" x2="0" y2="-26"/>
          <line x1="30" y1="26" x2="0" y2="26"/>
        </g>
      </g>
      <text x="120" y="42" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fbbf24" font-weight="800">F тертя →</text>
      <text x="120" y="160" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fda4af" font-weight="700">тертя → теплова енергія</text>
      <g fill="#fb923c">
        <text x="60" y="60" font-size="14">🔥</text>
        <text x="170" y="124" font-size="14">🔥</text>
      </g>
      <defs>
        <marker id="f_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill="#dc2626"/>
        </marker>
      </defs>`,
      230,
    ),

  /* -------- Gravity -------- */
  gravity: () =>
    svg(
      "0 0 200 220",
      `
      <circle cx="100" cy="160" r="50" fill="#1d4ed8"/>
      <path d="M65 155 Q80 145 100 152 L120 148 L130 158 L120 164 L100 170 L80 168 Z" fill="#16a34a"/>
      <circle cx="100" cy="60" r="10" fill="#dc2626"/>
      <line x1="100" y1="76" x2="100" y2="110" stroke="#fbbf24" stroke-width="3" marker-end="url(#gr_a)"/>
      <defs>
        <marker id="gr_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#fbbf24"/>
        </marker>
      </defs>
      <text x="100" y="22" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">F = mg</text>
      <text x="118" y="100" font-family="Inter, Arial" font-size="11" fill="#fde68a">g ≈ 9.8 м/с²</text>
      <text x="100" y="206" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#bbf7d0" font-weight="700">гравітація притягує до Землі</text>`,
      200,
    ),

  /* -------- Cube exploded -------- */
  cubeExploded: () =>
    svg(
      "0 0 240 200",
      `
      <text x="50" y="34" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">6 граней</text>
      <text x="50" y="100" font-family="Inter, Arial" font-size="11" fill="#bbf7d0" font-weight="700">8 вершин</text>
      <text x="50" y="170" font-family="Inter, Arial" font-size="11" fill="#bae6fd" font-weight="700">12 ребер</text>
      <g transform="translate(150 50)">
        <rect x="-20" y="-20" width="40" height="40" fill="rgba(251,191,36,0.4)" stroke="#fbbf24" stroke-width="2"/>
      </g>
      <g transform="translate(150 110)">
        ${[
          [-20, -20],
          [20, -20],
          [-20, 20],
          [20, 20],
        ]
          .map(
            ([x, y]) =>
              `<circle cx="${x}" cy="${y}" r="4" fill="#34d399"/>`,
          )
          .join("")}
      </g>
      <g transform="translate(150 170)" stroke="#38bdf8" stroke-width="2">
        <line x1="-20" y1="0" x2="20" y2="0"/>
        <line x1="-12" y1="-10" x2="28" y2="-10"/>
      </g>`,
      220,
    ),
};

/* ============================================================
 * RULE LIST: question text → media function
 * First matching rule wins. Order from most specific to general.
 * ==========================================================*/

const rules = [
  // STEAM identity & letters
  { match: (q) => /абревіатур.+STEAM/i.test(q.text), media: () => T.steamLogo() },
  { match: (q) => /^Що означає буква [STEAM] у STEAM/i.test(q.text), media: () => T.steamLogo() },

  // Scientific method
  {
    match: (q) => /експеримент|перевірк.+припущ|перевірк.+дослід/i.test(q.text),
    media: () => infoCard("🧪 <b>Експеримент</b>:<br>план → дослід → спостереження → висновок"),
  },
  {
    match: (q) => /з чого починається.+дослідж/i.test(q.text),
    media: () => schemeRow(["❓ Запитання", "🤔 Гіпотеза", "🧪 Дослід", "✅ Висновок"]),
  },
  {
    match: (q) => /гіпотеза/i.test(q.text),
    media: () => infoCard("🤔 <b>Гіпотеза</b> — обґрунтоване припущення, яке треба перевірити дослідом."),
  },
  {
    match: (q) => /спостереженн/i.test(q.text),
    media: () => infoCard("👁 <b>Спостереження</b> — те, що дослідник <em>побачив, почув або зміряв</em> у досліді."),
  },
  {
    match: (q) => /контрольною групою/i.test(q.text),
    media: () => infoCard("⚖ Експеримент із <b>контрольною групою</b>: одну групу змінюємо, іншу — ні. Порівнюємо результат."),
  },
  {
    match: (q) => /мозковий штурм|brainstorm/i.test(q.text),
    media: () => infoCard("💡 <b>Мозковий штурм</b> — колективне швидке генерування ідей без критики на старті."),
  },
  {
    match: (q) => /інженерний дизайн-цикл/i.test(q.text),
    media: () => schemeRow(["Завдання", "Ідея", "Прототип", "Тест", "Удосконалення"]),
  },
  {
    match: (q) => /симуляція.+комп/i.test(q.text),
    media: () => infoCard("🖥 <b>Симуляція</b> — комп'ютерна імітація реального процесу (літака, погоди, фізики)."),
  },

  // Instruments
  { match: (q) => /мікроскоп/i.test(q.text), media: () => T.microscope() },
  { match: (q) => /телескоп/i.test(q.text), media: () => T.telescope() },
  { match: (q) => /термометр|темпера.+вимірю.+(прилад|шкал)|шкал.+термометр/i.test(q.text), media: () => T.thermometer() },
  { match: (q) => /шкал.+на термометрі/i.test(q.text), media: () => T.thermometer() },
  { match: (q) => /Цельсі/i.test(q.text), media: () => T.thermometer() },
  { match: (q) => /барометр/i.test(q.text), media: () => T.barometer() },
  { match: (q) => /гігрометр|вологост/i.test(q.text), media: () => T.hygrometer() },
  { match: (q) => /флюгер|напряму вітру/i.test(q.text), media: () => T.flugel() },
  { match: (q) => /зважуванн|ваги|для зважу/i.test(q.text), media: () => T.scales() },
  { match: (q) => /компас|сторін горизонту/i.test(q.text) && !/побудови кола|циркул/i.test(q.text), media: () => T.compass() },
  { match: (q) => /компасі.+північ|знак.+північ.+компас/i.test(q.text), media: () => T.compassHighlight("N") },
  { match: (q) => /компасі.+південь/i.test(q.text), media: () => T.compassHighlight("S") },
  { match: (q) => /компасі.+схід/i.test(q.text), media: () => T.compassHighlight("E") },
  { match: (q) => /компасі.+захід/i.test(q.text), media: () => T.compassHighlight("W") },
  { match: (q) => /лінійка|довжин.+вимірю|невеликого предмета/i.test(q.text), media: () => T.ruler() },
  { match: (q) => /транспортир/i.test(q.text), media: () => T.protractor() },
  { match: (q) => /циркул/i.test(q.text), media: () => T.drawingCompass() },
  { match: (q) => /косинці|вугільник/i.test(q.text), media: () => T.protractor() },
  { match: (q) => /лупа|збільшу.+скло/i.test(q.text), media: () => T.magnifier() },
  { match: (q) => /годинник.+показує час|годинник/i.test(q.text) && !/пісочн|сонячн|смартгод/i.test(q.text), media: () => T.clock(10, 10) },
  { match: (q) => /пісочн.+годинник/i.test(q.text), media: () => T.hourglass() },
  { match: (q) => /сонячн.+годинник/i.test(q.text), media: () => T.sundial() },

  // Sciences (definitional info-cards)
  { match: (q) => /біолог/i.test(q.text), media: () => infoCard("🧬 <b>Біологія</b> — наука про живі організми: рослини, тварини, людину, мікроби.") },
  { match: (q) => /фізик/i.test(q.text), media: () => infoCard("⚙ <b>Фізика</b> — наука про рух, силу, енергію, тепло, світло й електрику.") },
  { match: (q) => /хімі/i.test(q.text) && /наука|вивчає|речовин/i.test(q.text), media: () => infoCard("⚗ <b>Хімія</b> — наука про речовини та їхні перетворення.") },
  { match: (q) => /географ/i.test(q.text), media: () => infoCard("🌍 <b>Географія</b> — наука про Землю: материки, океани, клімат, населення.") },
  { match: (q) => /астроном|небес.+тіл/i.test(q.text), media: () => T.galaxy() },
  { match: (q) => /числа і форми|математ/i.test(q.text), media: () => infoCard("➕ <b>Математика</b> — наука про числа, фігури, простір і логіку.") },
  { match: (q) => /мину.+людства|історі/i.test(q.text), media: () => infoCard("📜 <b>Історія</b> — наука про минуле людства: події, культури, цивілізації.") },
  { match: (q) => /погод.+метеорол|метеорол/i.test(q.text), media: () => infoCard("🌦 <b>Метеорологія</b> — наука про погоду, атмосферу, опади та клімат.") },
  { match: (q) => /екологі/i.test(q.text), media: () => infoCard("🌱 <b>Екологія</b> — як живі організми взаємодіють із природним середовищем.") },
  { match: (q) => /ботанік/i.test(q.text), media: () => infoCard("🌿 <b>Ботаніка</b> — наука про рослини: будову, життя, поширення.") },
  { match: (q) => /зоологі/i.test(q.text), media: () => infoCard("🐾 <b>Зоологія</b> — наука про тварин.") },
  { match: (q) => /палеонтологі|викопні рештки/i.test(q.text), media: () => infoCard("🦖 <b>Палеонтологія</b> — вивчає скам'янілі рештки давніх організмів.") },

  // States of matter & water
  { match: (q) => /воду на пар|випаровуванн/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /воду на лід|замерзанн/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /льоду на воду|танення|плавленн/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /воду на пару|водян.+пар|газоподібн.+стан/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /вода.+тверд.+стан|лід/i.test(q.text) && /стан/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /темпер.+вода.+(замерза|кипи)|при якій темпера/i.test(q.text), media: () => T.thermometer() },
  { match: (q) => /стан.+води.+зустріч|3 стан.+вод|трьох стан/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /основні стан.+речовини|стан.+речовини/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /рідина.+за норм|що.+рідин.+за норм/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /газ.+за норм|що.+газ.+за норм/i.test(q.text), media: () => T.airComposition() },
  { match: (q) => /тверде тіло.+за норм/i.test(q.text), media: () => T.waterStates() },
  { match: (q) => /кругообіг води/i.test(q.text), media: () => T.waterCycle() },

  // Gases
  { match: (q) => /газ.+78|азот.+78|азот.+більш.+част/i.test(q.text), media: () => T.airComposition() },
  { match: (q) => /близько 21|21.+повітр/i.test(q.text), media: () => T.airComposition() },
  { match: (q) => /кисень.+необхід|для дихання/i.test(q.text), media: () => infoCard("🫁 Людям і тваринам для дихання потрібен <b>кисень (O₂)</b>.") },
  { match: (q) => /рослини.+фотосинтез.+виділ|кисень.+фотосинтез/i.test(q.text), media: () => T.photosynthesis() },
  { match: (q) => /рослини.+поглинають.+фотосинтез|вуглекислий.+фотосинтез/i.test(q.text), media: () => T.photosynthesis() },
  { match: (q) => /фотосинтез/i.test(q.text), media: () => T.photosynthesis() },
  { match: (q) => /чим живиться зелена рослина/i.test(q.text), media: () => T.photosynthesis() },
  { match: (q) => /дих.+рослини/i.test(q.text), media: () => infoCard("🌿 Так — рослини <b>дихають</b> вдень і вночі, поглинаючи кисень і виділяючи CO₂. Удень фотосинтез домінує — кисню виходить більше.") },

  // Light / shadow / rainbow / prism
  { match: (q) => /тінь|тіні падают|тіні від предмет/i.test(q.text) && !/штрих|qr/i.test(q.text), media: () => T.shadow() },
  { match: (q) => /світло від лампи|лампа.+джерел.+світл|природ.+джерел.+світл/i.test(q.text), media: () => infoCard("☀ <b>Сонце</b> — головне природне джерело світла. Світло поширюється від нього в усі боки.") },
  { match: (q) => /спектр|дисперсія|розклад.+бі.+світл/i.test(q.text), media: () => T.prism() },
  { match: (q) => /кольорів.+веселці|колір.+веселц|порядок.+кольор.+вес/i.test(q.text), media: () => T.rainbow() },
  { match: (q) => /небо.+блакитн|чому небо/i.test(q.text), media: () => infoCard("💙 Синє світло сильніше <b>розсіюється</b> молекулами повітря, тому небо вдень блакитне.") },
  { match: (q) => /грім.+після блискав|світло.+швидш.+звук/i.test(q.text), media: () => T.lightning() },

  // Electricity & magnetism
  { match: (q) => /мідн.+дріт|пропуска.+струм.+найкращ/i.test(q.text), media: () => T.conductorInsulator() },
  { match: (q) => /діелектрик|ізолятор/i.test(q.text), media: () => T.conductorInsulator() },
  { match: (q) => /провідник.+пропускає струм|пропускає.+електр.+струм/i.test(q.text), media: () => T.conductorInsulator() },
  { match: (q) => /метал.+електропроводці|мідь/i.test(q.text), media: () => T.conductorInsulator() },
  { match: (q) => /магніт.+притяг|притягує.+магніт/i.test(q.text), media: () => T.magnet() },
  { match: (q) => /магніт.+полюс|у магніту є|північний і південний полюс/i.test(q.text), media: () => T.magnet() },
  { match: (q) => /однойменні полюси/i.test(q.text), media: () => T.magnetPoles("repel") },
  { match: (q) => /різнойменні полюси/i.test(q.text), media: () => T.magnetPoles("attract") },
  { match: (q) => /коротке замика/i.test(q.text), media: () => T.outletWarning() },
  { match: (q) => /мокр.+руками.+електро|небезпечно.+розетк/i.test(q.text), media: () => T.outletWarning() },

  // Solar system & space
  { match: (q) => /Сонячн.+систем|скільки планет/i.test(q.text), media: () => T.solarSystem() },
  { match: (q) => /найближча до Сонця/i.test(q.text), media: () => T.solarSystem() },
  { match: (q) => /найбільша планета/i.test(q.text), media: () => T.solarSystem() },
  { match: (q) => /Червона планета/i.test(q.text), media: () => T.solarSystem() },
  { match: (q) => /галактик|Чумацький Шлях/i.test(q.text), media: () => T.galaxy() },
  { match: (q) => /супутник Землі|природний супутник/i.test(q.text), media: () => T.earthMoon() },
  { match: (q) => /Гагар|перший.+у космос|Sputnik|супутник.+1957/i.test(q.text), media: () => infoCard("🚀 1957 — Sputnik (перший супутник).<br>🧑‍🚀 1961 — Юрій Гагарін (перша людина).<br>🌙 1969 — Apollo 11 (Місяць).") },
  { match: (q) => /Армстронг|поверхн.+Місяц|1969/i.test(q.text), media: () => infoCard("🌙 1969 — Apollo 11. <b>Нейл Армстронг</b> першим ступив на Місяць.") },
  { match: (q) => /Каденюк/i.test(q.text), media: () => infoCard("🇺🇦 <b>Леонід Каденюк</b> — перший космонавт незалежної України (1997, Space Shuttle Columbia).") },

  // Earth's spheres
  { match: (q) => /повітрян.+оболонк|атмосфера/i.test(q.text), media: () => T.earthSpheres() },
  { match: (q) => /водн.+оболонк|гідросфера/i.test(q.text), media: () => T.earthSpheres() },
  { match: (q) => /оболонк.+живі|біосфера/i.test(q.text), media: () => T.earthSpheres() },

  // Time & math (clocks for angles)
  { match: (q) => /3:00.+стрілки|3:00.+ кут/i.test(q.text), media: () => T.clock(3, 0) },
  { match: (q) => /6:00.+стрілки|6:00.+ кут/i.test(q.text), media: () => T.clock(6, 0) },
  { match: (q) => /секунд у 1 хвилин|секунд у 1 хвилині|секунд.+у.+хвилин/i.test(q.text), media: () => infoCard("⏱ 1 хвилина = <b>60 секунд</b>") },
  { match: (q) => /хвилин у 1 годин|хвилин у годин/i.test(q.text), media: () => infoCard("⏱ 1 година = <b>60 хвилин</b>") },
  { match: (q) => /годин у доб|доб.+24/i.test(q.text), media: () => infoCard("🌗 1 доба = <b>24 години</b>") },
  { match: (q) => /днів у.+рок|365/i.test(q.text), media: () => infoCard("📆 1 звичайний рік ≈ <b>365 днів</b> (високосний — 366).") },

  // Numbers
  { match: (q) => /просте число|прост.+число/i.test(q.text), media: () => infoCard("🔢 <b>Прості числа</b> до 20: 2, 3, 5, 7, 11, 13, 17, 19. (Діляться лише на 1 і на себе.)") },
  { match: (q) => /парн.+числ/i.test(q.text), media: () => infoCard("⚖ <b>Парні числа</b>: 0, 2, 4, 6, 8, 10, ... — кратні 2.") },

  // Geometry
  { match: (q) => /шестикутник|6.+рівних.+сторон.+правильн/i.test(q.text), media: () => T.polygon(6, "правильний шестикутник") },
  { match: (q) => /правильна.+5.+рівних.+сторон|правильна фігура з 5/i.test(q.text), media: () => T.polygon(5, "п'ятикутник") },
  { match: (q) => /правильна.+8|восьмикутник|октагон/i.test(q.text), media: () => T.polygon(8, "восьмикутник") },
  { match: (q) => /гран\S*\s+(у|в)\s+куб|куб\S*\s+гран/i.test(q.text), media: () => T.cube() },
  { match: (q) => /вершин.+куба|куб.+верш/i.test(q.text), media: () => T.cube() },
  { match: (q) => /ребер.+куба|куб.+ребер/i.test(q.text), media: () => T.cube() },
  { match: (q) => /рівносторонній|сторони рівні|трикут.+сторони рівні/i.test(q.text), media: () => T.triangleEquilateral() },
  { match: (q) => /прямокутний|кут 90|трикут.+кут 90/i.test(q.text), media: () => T.rightTriangle() },
  { match: (q) => /точки на однаковій відстані|круг|коло/i.test(q.text) && !/циркул|штрих|годинник/i.test(q.text), media: () => T.circle() },
  { match: (q) => /з'єдну.+центр кола|радіус/i.test(q.text), media: () => T.circle() },
  { match: (q) => /діаметр/i.test(q.text), media: () => T.circle() },
  { match: (q) => /симетрі.+квадрат|осей симетрії має квадрат/i.test(q.text), media: () => T.square() },
  { match: (q) => /осей симетрії.+рівносторонн/i.test(q.text), media: () => T.triangleEquilateral() },
  { match: (q) => /осей симетрії.+круг/i.test(q.text), media: () => T.circle() },
  { match: (q) => /симетрія/i.test(q.text), media: () => infoCard("🪞 <b>Симетрія</b> — частини фігури дзеркально схожі одна на одну.") },
  { match: (q) => /фігур.+з трьох вершин|три.+вершин.+сторон|трикутник.+вершин/i.test(q.text), media: () => T.triangleEquilateral() },
  { match: (q) => /чотирьох рівних сторін.+прямих кутів|квадрат/i.test(q.text), media: () => T.square() },
  { match: (q) => /паралелограм/i.test(q.text), media: () => T.parallelogram() },
  { match: (q) => /трапец/i.test(q.text), media: () => T.trapezoid() },
  { match: (q) => /осей координат|координат.+площин/i.test(q.text), media: () => T.coordPlane() },
  { match: (q) => /координат.+\(3.+5\)|координат.+\(3; 5\)/i.test(q.text), media: () => T.coordPlane() },
  { match: (q) => /прямокутна координатна сітка|координатна сітка/i.test(q.text), media: () => T.coordPlane() },
  { match: (q) => /м'яча|тривимірне.+мяч|куля/i.test(q.text) && !/земн|планет|сонячн/i.test(q.text), media: () => T.sphere() },
  { match: (q) => /коробк.+квадратн|тривимірне.+коробк/i.test(q.text), media: () => T.cube() },
  { match: (q) => /звужу.+основи до точки|конус/i.test(q.text), media: () => T.cone() },
  { match: (q) => /труб.+двома круглими|циліндр/i.test(q.text), media: () => T.cylinder() },
  { match: (q) => /трикутних боків.+однієї основи|піраміда/i.test(q.text), media: () => T.pyramid() },
  { match: (q) => /прямого кут|у прямому куті/i.test(q.text), media: () => T.protractor() },
  { match: (q) => /розгорнут.+кут/i.test(q.text), media: () => T.protractor() },
  { match: (q) => /повний кут|повний оберт/i.test(q.text), media: () => T.protractor() },

  // Simple machines
  { match: (q) => /важіль|поверта.+довг.+рук/i.test(q.text), media: () => T.lever() },
  { match: (q) => /колеса з канавкою.+мотузк|блок/i.test(q.text), media: () => T.pulley() },
  { match: (q) => /розколю.+дров|клин/i.test(q.text), media: () => T.wedge() },
  { match: (q) => /похила площин|пандус/i.test(q.text), media: () => T.inclinedPlane() },
  { match: (q) => /колесо й вісь|колесо.+вісь/i.test(q.text), media: () => T.wheelAxle() },
  { match: (q) => /засув/i.test(q.text), media: () => infoCard("🔒 <b>Засув</b> — простий механізм, який тримає двері зачиненими.") },

  // Engineering structures
  { match: (q) => /з'єдну.+бере.+річк|міст/i.test(q.text), media: () => T.bridge() },
  { match: (q) => /підземн.+прохід|тунел/i.test(q.text), media: () => T.tunnel() },
  { match: (q) => /перекритт.+річк|гребл|дамб/i.test(q.text), media: () => T.dam() },
  { match: (q) => /вис.+вузька.+будів|башт|вежа/i.test(q.text), media: () => T.tower() },

  // Inventors / scientists
  { match: (q) => /Белл|телефон/i.test(q.text) && /винайш|винайшов/i.test(q.text), media: () => infoCard("📞 <b>Александер Грейам Белл</b> (1876) — винахідник телефону.") },
  { match: (q) => /Едісон|лампи розжарюва/i.test(q.text), media: () => infoCard("💡 <b>Томас Едісон</b> — масово впровадив лампу розжарювання (1879).") },
  { match: (q) => /Тесла|змінн.+струм/i.test(q.text), media: () => infoCard("⚡ <b>Нікола Тесла</b> — змінний струм, понад 700 патентів.") },
  { match: (q) => /Гутенберг|друкарський верстат/i.test(q.text), media: () => infoCard("📖 <b>Йоганн Гутенберг</b> (≈1450) — перший друкарський верстат у Європі.") },
  { match: (q) => /Ньютон|всесвітнього тяжіння/i.test(q.text), media: () => T.gravity() },
  { match: (q) => /Ейнштейн|E=mc|відносност/i.test(q.text), media: () => infoCard("🧠 <b>Альберт Ейнштейн</b> — теорія відносності, E = m c².") },
  { match: (q) => /Архімед|переверну Землю/i.test(q.text), media: () => T.lever() },
  { match: (q) => /Леонардо да Вінчі|Мона Ліз/i.test(q.text), media: () => infoCard("🎨 <b>Леонардо да Вінчі</b> — учений, інженер і художник. «Мона Ліза», «Тайна вечеря».") },
  { match: (q) => /Ада Лавлейс|перш.+програміс/i.test(q.text), media: () => infoCard("💻 <b>Ада Лавлейс</b> (1815–1852) — одна з перших програмістів. Алгоритм для машини Беббіджа.") },
  { match: (q) => /Кюрі|радіоактивн|Склодов/i.test(q.text), media: () => infoCard("☢ <b>Марія Склодовська-Кюрі</b> — 2 Нобелівських премії (фізика, хімія). Відкрила радій і полоній.") },
  { match: (q) => /Дарвін|еволюц/i.test(q.text), media: () => infoCard("🐢 <b>Чарлз Дарвін</b> — теорія еволюції видів через природний добір («Походження видів», 1859).") },
  { match: (q) => /брати Райт|перший літак.+мото/i.test(q.text), media: () => infoCard("✈ <b>Брати Райт</b> (1903) — перший керований політ з мотором.") },
  { match: (q) => /Карл Бенц|перш.+автомобіл.+бензин/i.test(q.text), media: () => infoCard("🚗 <b>Карл Бенц</b> (1886) — перший автомобіль із бензиновим двигуном.") },
  { match: (q) => /Морзе|телеграф/i.test(q.text), media: () => infoCard("• – <b>Семюел Морзе</b> — телеграф і азбука крапок-тире.") },

  // Inventions
  { match: (q) => /холодильник/i.test(q.text), media: () => infoCard("❄ <b>Холодильник</b> — дозволяє зберігати продукти тривалий час завдяки низькій температурі.") },
  { match: (q) => /радіо/i.test(q.text) && /повідом|вина/i.test(q.text), media: () => infoCard("📻 <b>Радіо</b> — передає повідомлення радіохвилями на великі відстані без проводів.") },
  { match: (q) => /паровоз|залізниц.+рейк/i.test(q.text), media: () => infoCard("🚂 <b>Паровоз</b> — почав епоху швидких залізниць у XIX ст.") },
  { match: (q) => /метеосупутник|погод.+з космос/i.test(q.text), media: () => T.gps() },

  // Energy
  { match: (q) => /сонячн.+енерг|відновлюв.+енергі/i.test(q.text), media: () => T.solarPanel() },
  { match: (q) => /вітров.+турбін|сил.+вітр.+електр|вітряк/i.test(q.text), media: () => T.windTurbine() },
  { match: (q) => /сонячн.+батаре|фотоелектричн|сонячне світло на електрик/i.test(q.text), media: () => T.solarPanel() },
  { match: (q) => /сонячн.+електростанц/i.test(q.text), media: () => T.solarPanel() },
  { match: (q) => /гідроелектростанц|сил.+вод.+електр/i.test(q.text), media: () => T.dam() },
  { match: (q) => /атомна|ядерна.+електростанц|енергі.+атом|розщеплення/i.test(q.text), media: () => T.nuclearPlant() },
  { match: (q) => /акумулят|батаре.+портатив/i.test(q.text), media: () => infoCard("🔋 <b>Акумулятор</b> — зберігає електричну енергію і віддає її пристроям.") },

  // Computing / technology
  { match: (q) => /3D-принтер|3d-принтер|принтер 3D/i.test(q.text), media: () => T.printer3d() },
  { match: (q) => /VR|віртуальн.+реальн/i.test(q.text), media: () => T.vrHeadset() },
  { match: (q) => /AR|доповнен.+реальн/i.test(q.text), media: () => T.arPhone() },
  { match: (q) => /дрон/i.test(q.text), media: () => T.drone() },
  { match: (q) => /штучн.+інтелект|ШІ.+AI/i.test(q.text), media: () => infoCard("🤖 <b>ШІ / AI</b> — комп'ютерні системи, що навчаються і розв'язують задачі (мова, зір, ігри).") },
  { match: (q) => /GPS/i.test(q.text), media: () => T.gps() },
  { match: (q) => /QR-код/i.test(q.text), media: () => T.qrCode() },
  { match: (q) => /штрих-код|горизонтальн.+смугаст/i.test(q.text), media: () => T.barcode() },
  { match: (q) => /Bluetooth/i.test(q.text), media: () => infoCard("📡 <b>Bluetooth</b> — бездротова передача даних на коротких відстанях (≤ 10 м). Навушники, годинники, колонки.") },
  { match: (q) => /мікропроцесор|чіп.+управ/i.test(q.text), media: () => infoCard("🧠 <b>Мікропроцесор</b> — крихітний чіп з мільярдами транзисторів, мозок будь-якого пристрою.") },
  { match: (q) => /сенсор.+техніц|датчик/i.test(q.text), media: () => infoCard("🛰 <b>Сенсор / датчик</b> — сприймає сигнал (температура, рух, світло) і передає його пристрою.") },
  { match: (q) => /темпера.+сенсор|температурн.+сенсор/i.test(q.text), media: () => T.thermometer() },
  { match: (q) => /мікрофон|сприйм.+звук/i.test(q.text), media: () => infoCard("🎤 <b>Мікрофон</b> — перетворює звук на електричний сигнал.") },
  { match: (q) => /динамік|колонк/i.test(q.text), media: () => infoCard("🔊 <b>Динамік</b> — перетворює електричний сигнал на звук.") },
  { match: (q) => /оцифрува|АЦП|аналог.+цифров/i.test(q.text), media: () => infoCard("🔄 <b>АЦП</b> — переводить аналоговий сигнал (хвиля) у цифровий (числа).") },
  { match: (q) => /робот-пилосо/i.test(q.text), media: () => infoCard("🤖🧹 <b>Робот-пилосос</b> — автоматично прибирає, орієнтуючись датчиками.") },
  { match: (q) => /смартгодинник/i.test(q.text), media: () => infoCard("⌚ <b>Смартгодинник</b> — годинник з функціями телефону, фітнес-трекера, GPS.") },
  { match: (q) => /електросамокат|електромобіл|електронн.+транспорт/i.test(q.text), media: () => infoCard("⚡🛴 <b>Електротранспорт</b> — електросамокати, електромобілі — без вихлопу.") },
  { match: (q) => /Розумне місто|smart city/i.test(q.text), media: () => infoCard("🏙 <b>Smart City</b> — місто, де датчики, AI і IoT керують транспортом, освітленням, безпекою.") },
  { match: (q) => /інтернет речей|IoT/i.test(q.text), media: () => infoCard("🌐 <b>IoT (Інтернет речей)</b> — звичайні речі (лампа, чайник) під'єднані до Інтернету.") },
  { match: (q) => /3D-принтер.+шар за шар|3D-принтер.+пластик/i.test(q.text), media: () => T.printer3d() },

  // Recycling & ecology
  { match: (q) => /рециклінг|повторн.+переробк/i.test(q.text), media: () => T.recycling() },
  { match: (q) => /сортуват.+сміт|берегти природу/i.test(q.text), media: () => T.recycling() },
  { match: (q) => /папір.+скло.+пластик|переробити/i.test(q.text), media: () => T.recycling() },
  { match: (q) => /екологічна культура/i.test(q.text), media: () => infoCard("🌱 <b>Екологічна культура</b> — відповідальне ставлення людини до природи: не смітити, економити ресурси.") },
  { match: (q) => /біорізноманіт/i.test(q.text), media: () => infoCard("🦋 <b>Біорізноманіття</b> — різноманітність живих істот: видів, екосистем, генів.") },
  { match: (q) => /національні парки|заповід/i.test(q.text), media: () => infoCard("🏞 <b>Заповідник / національний парк</b> — особливо охоронювана територія. Карпатський НПП, «Асканія-Нова».") },
  { match: (q) => /ланцюг живлення.+послідовн|ланцюг живлення/i.test(q.text), media: () => T.foodChain() },
  { match: (q) => /виробник.+продуцент|продуцент/i.test(q.text), media: () => T.foodChain() },
  { match: (q) => /споживач.+консумент/i.test(q.text), media: () => T.foodChain() },
  { match: (q) => /редуцент|розкладач/i.test(q.text), media: () => T.foodChain() },
  { match: (q) => /шопер-сумк|багатораз/i.test(q.text), media: () => infoCard("👜 Багаторазова сумка замість одноразових пакетів — приклад <b>екологічного вибору</b>.") },
  { match: (q) => /сотні років|поліетилен.+розклад/i.test(q.text), media: () => infoCard("⚠ Поліетиленовий пакет розкладається <b>≈ 200–400 років</b>.") },
  { match: (q) => /вторсировин|сортуєм/i.test(q.text), media: () => T.recycling() },
  { match: (q) => /біорозкладн|біоматеріал/i.test(q.text), media: () => infoCard("🌿 <b>Біорозкладні матеріали</b> — крохмаль, целюлоза — розкладаються природно.") },
  { match: (q) => /полімер.+пластмас|пластмас/i.test(q.text) && /довг.+молекул|роблять/i.test(q.text), media: () => infoCard("🧬 <b>Полімер</b> — довга ланцюгова молекула. З нього роблять пластмаси й тканини.") },
  { match: (q) => /натуральн.+полімер|шовк/i.test(q.text), media: () => infoCard("🧶 <b>Натуральні полімери</b>: шовк, бавовна, льон, целюлоза — з природи.") },
  { match: (q) => /синтетичн.+матеріал|поліетиленов.+пакет/i.test(q.text), media: () => infoCard("🧪 <b>Синтетичні матеріали</b>: поліетилен, поліестер — створені людиною з нафти.") },
  { match: (q) => /бензин і пластмас|нафти/i.test(q.text), media: () => infoCard("🛢 З <b>нафти</b> добувають бензин, дизель, пластмаси, мастила.") },
  { match: (q) => /гірнич.+справ|видобуток/i.test(q.text), media: () => infoCard("⛏ <b>Гірнича справа</b> — видобуток корисних копалин з-під землі: вугілля, руда, сіль.") },

  // Anatomy
  { match: (q) => /серце.+(розмір|кулак)/i.test(q.text), media: () => T.heart() },
  { match: (q) => /печінк/i.test(q.text), media: () => infoCard("🟤 <b>Печінка</b> — виробляє жовч і знешкоджує токсини. Найбільша залоза тіла.") },
  { match: (q) => /нирк|очищує кров.+сечу/i.test(q.text), media: () => T.kidneys() },
  { match: (q) => /трахе|дихальне горло|повітря.+легені/i.test(q.text), media: () => T.lungsTrachea() },
  { match: (q) => /мозок/i.test(q.text), media: () => T.brain() },
  { match: (q) => /зуб.+дорослому/i.test(q.text), media: () => infoCard("🦷 У дорослого <b>32 зуби</b>: 8 різців, 4 ікла, 8 малих кутніх, 12 великих кутніх.") },
  { match: (q) => /скільки рук у людини/i.test(q.text), media: () => infoCard("🤲 У людини <b>2 руки</b>.") },
  { match: (q) => /орган.+дотик|шкір.+по всьому/i.test(q.text), media: () => infoCard("✋ Орган дотику — <b>шкіра</b> по всьому тілу. Найбільший орган людини.") },
  { match: (q) => /кисневмісн|кисень.+потрібен/i.test(q.text), media: () => infoCard("🫁 Для життя людини потрібен <b>кисень (O₂)</b>.") },

  // Chemistry / atoms
  { match: (q) => /атом/i.test(q.text) && /найдрібніш|складається|не діли/i.test(q.text), media: () => T.atom() },
  { match: (q) => /двох атомів водн|H₂O|H2O|сполук.+водн.+кисн/i.test(q.text), media: () => T.h2o() },
  { match: (q) => /клітина в біолог|структурн.+одиниц.+живих/i.test(q.text), media: () => T.cell() },
  { match: (q) => /мікросвіт/i.test(q.text), media: () => T.microscope() },
  { match: (q) => /горіння.+швидк|світло й тепло/i.test(q.text), media: () => infoCard("🔥 <b>Горіння</b> — швидке окиснення з виділенням світла й тепла.") },

  // Natural phenomena
  { match: (q) => /виверження вулкана|викид магми/i.test(q.text), media: () => T.volcano() },
  { match: (q) => /вулкан|отвір.+лав/i.test(q.text), media: () => T.volcano() },
  { match: (q) => /сейсмічн|землетру/i.test(q.text), media: () => T.earthquake() },
  { match: (q) => /торнадо|смерч/i.test(q.text), media: () => T.tornado() },
  { match: (q) => /цунамі/i.test(q.text), media: () => T.tsunami() },
  { match: (q) => /магматичн.+вивержен|базальт/i.test(q.text), media: () => T.volcano() },
  { match: (q) => /осадов.+гірськ.+пород/i.test(q.text), media: () => infoCard("🏞 <b>Осадові породи</b> — пісковик, вапняк, глина. Утворені нашаруванням осадів.") },
  { match: (q) => /метаморфічн/i.test(q.text), media: () => infoCard("🪨 <b>Метаморфічні породи</b> — мармур, гнейс. Змінені тиском і температурою.") },
  { match: (q) => /ерозі|вода.+руйнує береги/i.test(q.text), media: () => infoCard("🌊 <b>Ерозія</b> — поступове руйнування поверхні водою, вітром, льодом.") },

  // Forces & energy
  { match: (q) => /гравітаці|тяжінн|притягаються.+тіла/i.test(q.text), media: () => T.gravity() },
  { match: (q) => /чому ми не падаємо/i.test(q.text), media: () => T.gravity() },
  { match: (q) => /тертя|потираєш руки/i.test(q.text), media: () => T.friction() },
  { match: (q) => /^Що таке енергія/i.test(q.text), media: () => infoCard("⚡ <b>Енергія</b> — здатність виконувати роботу або викликати зміни (тепло, рух, світло).") },
  { match: (q) => /механічн.+енергі|рух велосипед/i.test(q.text), media: () => infoCard("🚴 <b>Механічна енергія</b> — енергія руху або положення тіл. Велосипед, кран, м'яч.") },
  { match: (q) => /теплов.+енергі|парова кав/i.test(q.text), media: () => infoCard("🔥 <b>Теплова енергія</b> — енергія хаотичного руху молекул. Чашка кави, багаття.") },

  // Logic
  { match: (q) => /логічна задача/i.test(q.text), media: () => infoCard("🧩 <b>Логічна задача</b> — розв'язується міркуванням, а не лише обчисленням.") },
  { match: (q) => /^У послідовності 2, 4, 6/i.test(q.text), media: () => infoCard("→ 2, 4, 6, 8, <b>10</b>, 12, 14 ... (крок +2)") },
  { match: (q) => /^У послідовності 1, 3, 5/i.test(q.text), media: () => infoCard("→ 1, 3, 5, 7, <b>9</b>, 11 ... (непарні)") },
  { match: (q) => /^У послідовності 5, 10, 15/i.test(q.text), media: () => infoCard("→ 5, 10, 15, 20, <b>25</b>, 30 ... (крок +5)") },
  { match: (q) => /^У послідовності 1, 2, 4, 8/i.test(q.text), media: () => infoCard("→ 1, 2, 4, 8, 16, <b>32</b> ... (× 2 — степені двійки)") },
  { match: (q) => /^У ряду 1, 4, 9, 16|квадрат/i.test(q.text) && /наступне/i.test(q.text), media: () => infoCard("→ 1², 2², 3², 4², <b>5² = 25</b>, 6² = 36 ... (квадрати)") },
  { match: (q) => /шифр|приховати повідом/i.test(q.text), media: () => infoCard("🔐 <b>Шифр</b> — спосіб закодувати повідомлення, замінивши символи.") },
  { match: (q) => /A=1.+B=2.+CAT/i.test(q.text), media: () => infoCard("🔐 C=3, A=1, T=20 → <b>3-1-20</b>") },
  { match: (q) => /азбук.+Морзе/i.test(q.text), media: () => infoCard("• – Азбука <b>Морзе</b> — крапки і тире.<br>SOS = ··· ––– ···") },
  { match: (q) => /SOS/i.test(q.text), media: () => infoCard("🆘 <b>SOS</b> — міжнародний сигнал лиха (Save Our Souls).<br>··· ––– ···") },
  { match: (q) => /логіка.+АБО.+НЕ|булева логік/i.test(q.text), media: () => T.truthTable("AND") },
  { match: (q) => /^Що означає логічна дія «І»|логічна дія «І»/i.test(q.text), media: () => T.truthTable("AND") },
  { match: (q) => /логічна дія «АБО»|^Що означає логічна дія «АБО»/i.test(q.text), media: () => T.truthTable("OR") },
  { match: (q) => /протилежн.+числа|−5|-5/i.test(q.text) && /5/.test(q.text), media: () => T.numberLine() },

  // Measurements / units
  { match: (q) => /1 м.+см|метрів.+см|метр.+скільки см/i.test(q.text), media: () => infoCard("📏 1 м = <b>100 см</b> = 1000 мм") },
  { match: (q) => /1 кг.+грамів|кг.+скільки грамів/i.test(q.text), media: () => infoCard("⚖ 1 кг = <b>1000 г</b>") },
  { match: (q) => /1 л.+мл|літр.+мілілітрів/i.test(q.text), media: () => infoCard("🥤 1 л = <b>1000 мл</b>") },
  { match: (q) => /час лінійко/i.test(q.text), media: () => T.clock(10, 10) },
  { match: (q) => /мас.+кілограм|маса.+кількіст.+речовин/i.test(q.text), media: () => infoCard("⚖ <b>Маса</b> — кількість речовини. Одиниці: кг, г.") },
  { match: (q) => /об'єм.+простор|місце.+тіло у простор/i.test(q.text), media: () => infoCard("📦 <b>Об'єм</b> — місце, яке займає тіло у просторі. Одиниці: л, мл, м³.") },
  { match: (q) => /літрах і мілілітр/i.test(q.text), media: () => infoCard("🥤 Рідину вимірюють у <b>літрах (л) і мілілітрах (мл)</b>.") },
  { match: (q) => /склянка вміщує 200 мл/i.test(q.text), media: () => infoCard("🥤 1 л = 1000 мл → <b>5</b> склянок по 200 мл = 1 л.") },
  { match: (q) => /кут.+градус|вимірюють кут/i.test(q.text), media: () => T.protractor() },
  { match: (q) => /швидкіст|км\/год/i.test(q.text), media: () => infoCard("🚗 <b>Швидкість</b>: 60 км/год = 60 кілометрів за 1 годину.") },
  { match: (q) => /сила.+ньютон|у ньютонах/i.test(q.text), media: () => infoCard("📐 <b>Сила</b> вимірюється в <b>ньютонах (Н)</b>.<br>1 Н ≈ вага яблука 100 г.") },
  { match: (q) => /одиниц.+енерг.+СІ|джоуль/i.test(q.text), media: () => infoCard("⚡ <b>Енергія</b> — у <b>джоулях (Дж)</b>.") },
  { match: (q) => /одиниц.+струм|ампер/i.test(q.text), media: () => infoCard("⚡ <b>Сила струму</b> — в <b>амперах (А)</b>.") },
  { match: (q) => /одиниц.+напруг|вольт/i.test(q.text), media: () => infoCard("⚡ <b>Напруга</b> — у <b>вольтах (В)</b>. Розетка: 220 В.") },
  { match: (q) => /одиниц.+потужн|ват/i.test(q.text), media: () => infoCard("💡 <b>Потужність</b> — у <b>ватах (Вт)</b>. P = U · I") },

  // Symbiosis / metamorphosis / cell / life
  { match: (q) => /метаморфоз|гусениц.+метелик/i.test(q.text), media: () => T.metamorphosis() },
  { match: (q) => /симбіоз/i.test(q.text), media: () => infoCard("🐠🪸 <b>Симбіоз</b> — взаємокорисне співжиття. Риба-клоун і актинія, бджоли і квіти.") },
  { match: (q) => /ріст|розвиток.+організм/i.test(q.text), media: () => infoCard("🌱 <b>Ріст / розвиток</b> — поступове збільшення розмірів і ускладнення живого організму.") },

  // Tech / matter
  { match: (q) => /^Що з переліченого є технологією/i.test(q.text), media: () => T.printer3d() },

  // Transport
  { match: (q) => /рухає звичайний автомоб|двигун/i.test(q.text), media: () => infoCard("🚗 Сучасний автомобіль рухає <b>двигун</b> (внутрішнього згорання або електродвигун).") },
  { match: (q) => /потяг|по рейках/i.test(q.text), media: () => infoCard("🚂 <b>Потяг</b> їздить рейками — найекономічніший наземний транспорт.") },
  { match: (q) => /літак|перемі.+повітря/i.test(q.text), media: () => infoCard("✈ <b>Літак</b> — повітряний транспорт. Підіймається завдяки крилам та тязі двигуна.") },
  { match: (q) => /корабель|пересува.+по вод/i.test(q.text), media: () => infoCard("🚢 <b>Корабель</b> — водний транспорт. Тримається на воді завдяки виштовхувальній силі.") },

  // Natural vs man-made
  { match: (q) => /є природнім явищем|природн.+явищ.+веселк/i.test(q.text), media: () => T.rainbow() },
  { match: (q) => /створене людиною|міст/i.test(q.text) && /перелічен/i.test(q.text), media: () => T.bridge() },

  // Engineering / making
  { match: (q) => /інженер.+проєктує/i.test(q.text), media: () => infoCard("👷 <b>Інженер</b> — проєктує машини, споруди, прилади. Поєднує науку і практику.") },
  { match: (q) => /дизайн.+оформ|продуман.+художн/i.test(q.text), media: () => infoCard("🎨 <b>Дизайн</b> — продумане художнє і функціональне оформлення речі або простору.") },
  { match: (q) => /прототип/i.test(q.text), media: () => infoCard("🛠 <b>Прототип</b> — перший пробний зразок виробу для перевірки ідей.") },
  { match: (q) => /виготовленн|виробництв/i.test(q.text), media: () => infoCard("🏭 <b>Виробництво</b> — створення речі за кресленнями та з потрібних матеріалів.") },
  { match: (q) => /специфікаці|список матеріал/i.test(q.text), media: () => infoCard("📋 <b>Специфікація</b> — список потрібних деталей з розмірами та кількістю.") },
  { match: (q) => /кресленн/i.test(q.text), media: () => T.coordPlane() },
  { match: (q) => /промислов.+дизайн/i.test(q.text), media: () => infoCard("🪑 <b>Промисловий дизайн</b> — мистецтво робити речі красивими і зручними водночас.") },
  { match: (q) => /векторн.+графік/i.test(q.text), media: () => infoCard("🖋 <b>Векторна графіка</b> — малюнок з ліній і фігур, що не втрачає якості при збільшенні. SVG, AI.") },
  { match: (q) => /растров.+графік|піксел/i.test(q.text), media: () => infoCard("🖼 <b>Растрова графіка</b> — малюнок із пікселів. JPG, PNG. При сильному збільшенні видно квадратики.") },
  { match: (q) => /оцифрування|сканува/i.test(q.text), media: () => infoCard("🖨 <b>Оцифрування</b> — перенесення зображення з паперу в комп'ютер (сканер, фото).") },
  { match: (q) => /композиці/i.test(q.text), media: () => infoCard("🎨 <b>Композиція</b> — продумане розміщення частин (форми, кольорів, об'єктів) у єдине ціле.") },

  // Safety
  { match: (q) => /знак безпек.+лаборатор|захищ.+очі окуляр/i.test(q.text), media: () => T.goggles() },

  // Ukraine independence
  { match: (q) => /Україна.+незалежн|1991/i.test(q.text), media: () => infoCard("🇺🇦 <b>24 серпня 1991</b> — День Незалежності України.") },
  { match: (q) => /Україна.+матери|материк.+Україн/i.test(q.text), media: () => T.earthSpheres() },

  // Healthy lifestyle
  { match: (q) => /крокомір|фітнес-трекер/i.test(q.text), media: () => infoCard("👟 <b>Крокомір / фітнес-трекер</b> — рахує кроки, пульс, нагадує рухатися.") },
  { match: (q) => /чист.+їж.+без обробк|свіже яблуко/i.test(q.text), media: () => infoCard("🍎 <b>Без обробки</b>: свіжі фрукти й овочі — найкорисніша їжа.") },
  { match: (q) => /відновлю.+джерел.+вод|опади/i.test(q.text), media: () => T.waterCycle() },
  { match: (q) => /здоров.+сон.+9|здоров.+сон/i.test(q.text), media: () => infoCard("😴 Дитині потрібно <b>9–10 годин сну</b> щодня — це важливо для мозку й тіла.") },
  { match: (q) => /спорт.+витрив|серцево|біг.+плаван/i.test(q.text), media: () => infoCard("🏃 <b>Біг, плавання, велосипед</b> — розвивають серце, легені, витривалість.") },

  // Reference books
  { match: (q) => /словник/i.test(q.text), media: () => infoCard("📘 <b>Словник</b> — пояснює значення слів і їхні форми.") },
  { match: (q) => /енциклопеді/i.test(q.text), media: () => infoCard("📚 <b>Енциклопедія</b> — упорядковані статті з різних галузей знань.") },

  // Compass letter labels (N/S/E/W only)
  { match: (q) => /знак.+північ.+компас|показу.+північ/i.test(q.text), media: () => T.compassHighlight("N") },

  // Misc instruments/tools
  { match: (q) => /цифров.+малюнок.+вектор/i.test(q.text), media: () => infoCard("🖋 <b>Векторна графіка</b> — побудована з ліній і кривих. Чисто масштабується.") },

  // Default fallback handled below
];

function pickMedia(q) {
  // Build a search corpus combining the question text + correct answer + all
  // answer options so a rule keyed on e.g. "мікроскоп" still matches a
  // question phrased as "пристрій для розгляду дуже маленьких об'єктів".
  const corpus = [q.text, q.answers[q.correct] || "", ...q.answers].join(" | ");
  const proxy = { ...q, text: corpus };
  for (const r of rules) {
    if (r.match(proxy)) return r.media(q);
  }
  return null;
}

/* Smart fallback: use the correct answer + explanation hint as an info-card. */
function fallbackMedia(q) {
  const correct = q.answers[q.correct];
  const emojiMap = [
    [/винайш|винахід/i, "💡"],
    [/наук/i, "🔬"],
    [/тварин|твариною/i, "🐾"],
    [/рослин/i, "🌱"],
    [/комп|програм/i, "💻"],
    [/енерг/i, "⚡"],
    [/світл/i, "☀"],
    [/вод/i, "💧"],
    [/Земл/i, "🌍"],
    [/космос|зір/i, "🌌"],
    [/повітря|газ/i, "🌬"],
  ];
  let emoji = "✨";
  for (const [re, em] of emojiMap) {
    if (re.test(q.text)) {
      emoji = em;
      break;
    }
  }
  return infoCard(
    `${emoji} <b>Правильна відповідь:</b><br>${correct}`,
  );
}

/* ============================================================
 * Main
 * ==========================================================*/

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
