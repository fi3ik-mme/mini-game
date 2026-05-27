#!/usr/bin/env node
/**
 * Застосовує інструкції з first-million-instructions.md + евристичні патерни
 * node scripts/apply-matematyka-instructions.mjs
 */
import {
  makeMatematykaMedia,
  makeUkrMovaMedia,
  makeInformatykaMedia,
  makeAnhliyskaMedia,
  makeIspanskaMedia,
} from "./generate-first-million-media.mjs";

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "../games/first-million/data");
const BG = "#0d1117";

/** Локальні PNG з прозорим фоном; згенерувати: node scripts/generate-coin-assets.mjs */
const COINS = "assets/coins";
const coinImg = (file, alt, size = 56) =>
  `<img src="${COINS}/${file}" alt="${alt}" width="${size}" height="${size}" loading="lazy" style="display:block;object-fit:contain;background:transparent"/>`;

function svg(viewBox, body, width = 300) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" style="width:${width}px;max-width:100%;height:auto;background:${BG};border-radius:10px;padding:8px;">${body}</svg>`;
}

function schemeTable(headers, rows) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table class="scheme-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function wikiBlock(url, title, imgUrl, alt) {
  const img =
    imgUrl ||
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/AnalogClockAnimation1_2hands_1h_in_6sec.gif/330px-AnalogClockAnimation1_2hands_1h_in_6sec.gif";
  return `<a href="${url}" target="_blank" rel="noopener" title="Стаття у Вікіпедії" style="display:block;margin-bottom:10px"><img src="${img}" alt="${alt || title}" loading="lazy" style="display:block;margin:0 auto;max-width:100%;max-height:240px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);cursor:pointer"/></a>`;
}

function infoCard(html) {
  return `<div class="info-card">${html}</div>`;
}

const MEDIA = {
  coins25x4Photos: () =>
    infoCard(
      `<div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin:6px 0">
        ${[0, 1, 2, 3].map(() => coinImg("25-kopiyok.png", "25 копійок")).join("")}
        <span style="font-size:1.6rem;color:#fde68a;font-weight:800;padding:0 4px">=</span>
        ${coinImg("1-hryvnia-obverse.png", "1 гривня (аверс з гербом)", 72)}
      </div>
      <p style="text-align:center;color:#86efac;margin:8px 0 0">25 × 4 = 1 гривня <span style="color:#94a3b8">(100 копійок)</span></p>`,
    ),

  lengthTable: () =>
    infoCard(
      schemeTable(
        ["Одиниця", "Скільки в наступній"],
        [
          ["1 мм", "10 мм = 1 см"],
          ["1 см", "10 см = 1 дм"],
          ["1 дм", "10 дм = 1 м"],
          ["1 м", "1000 м = 1 км"],
        ],
      ) + `<p style="margin:8px 0 0;color:#86efac;font-size:0.85rem">1 м = 100 см · 1 км = 1000 м</p>`,
    ),

  massTable: () =>
    infoCard(
      schemeTable(
        ["Маса", "Переведення"],
        [
          ["⚖️ 1 г", "× 1000 → 🏋️ 1 кг"],
          ["🏋️ 1 кг", "× 100 → 🏋️ 1 ц"],
          ["🏋️ 1 ц", "× 10 → 🏋️ 1 т"],
        ],
      ) + `<p style="margin:8px 0 0;color:#cbd5e1;font-size:0.85rem">1 кг = 1000 г · 1 ц = 100 кг · 1 т = 1000 кг</p>`,
    ),

  timeTable: () =>
    infoCard(
      schemeTable(
        ["Одиниця", "Переведення"],
        [
          ["1 хв", "60 с"],
          ["1 год", "60 хв"],
          ["1 доба", "24 год"],
          ["1 тиждень", "7 діб"],
          ["1 рік", "12 міс · 365–366 діб"],
        ],
      ),
    ),

  leapYearNote: () =>
    infoCard(
      `<p>📅 У звичайному році <b>365 днів</b>, у <b>високосному</b> — <b>366</b></p>
       <p>🗓 Лютий: 28 днів (29 у високосному році, коли рік ділиться на 4)</p>`,
    ),

  wikiTime: () =>
    wikiBlock(
      "https://uk.wikipedia.org/wiki/%D0%A7%D0%B0%D1%81",
      "Час",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/AnalogClockAnimation1_2hands_1h_in_6sec.gif/330px-AnalogClockAnimation1_2hands_1h_in_6sec.gif",
      "Час",
    ),

  numberLine1000: () =>
    svg(
      "0 0 360 90",
      `<rect width="360" height="90" fill="#0f172a" rx="10"/>
      <line x1="20" y1="50" x2="340" y2="50" stroke="#fbbf24" stroke-width="2.5"/>
      ${[997, 998, 999, 1000, 1001, 1002, 1003]
        .map((n, i) => {
          const x = 20 + i * 53;
          return `<line x1="${x}" y1="44" x2="${x}" y2="56" stroke="#fbbf24" stroke-width="${n === 999 || n === 1000 ? 3 : 1.5}"/>
                  <text x="${x}" y="78" text-anchor="middle" font-family="ui-monospace,Menlo" font-size="10" fill="${n === 999 ? "#34d399" : "#94a3b8"}" font-weight="${n === 999 ? 800 : 400}">${n}</text>
                  ${n === 999 ? `<text x="${x}" y="30" text-anchor="middle" font-size="9" fill="#86efac">попередник</text>` : ""}`;
        })
        .join("")}`,
      340,
    ),

  rectArea: () =>
    svg(
      "0 0 280 180",
      `<rect width="280" height="180" fill="#0f172a" rx="10"/>
      <rect x="50" y="50" width="160" height="80" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" stroke-width="3"/>
      <text x="130" y="42" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#fde68a">8 см</text>
      <text x="230" y="95" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#fde68a">5 см</text>
      <text x="130" y="165" text-anchor="middle" font-family="Inter,Arial" font-size="13" fill="#34d399">S = 8 × 5 = 40 см²</text>`,
      270,
    ),

  rightAngle: () =>
    svg(
      "0 0 200 180",
      `<rect width="200" height="180" fill="#0f172a" rx="10"/>
      <path d="M40 140 L40 50 L130 50" fill="none" stroke="#38bdf8" stroke-width="4"/>
      <rect x="40" y="110" width="30" height="30" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <text x="55" y="128" font-family="Inter,Arial" font-size="14" font-weight="800" fill="#fde68a">90°</text>
      <text x="100" y="168" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#cbd5e1">прямий кут</text>`,
      190,
    ),

  rectRightAngles: () =>
    svg(
      "0 0 280 180",
      `<rect width="280" height="180" fill="#0f172a" rx="10"/>
      <rect x="50" y="40" width="180" height="100" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" stroke-width="3"/>
      ${[
        [43, 33],
        [223, 33],
        [43, 133],
        [223, 133],
      ]
        .map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="14" fill="none" stroke="#fbbf24" stroke-width="2"/>`)
        .join("")}
      <text x="140" y="168" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#bae6fd">4 прямі кути по 90°</text>`,
      270,
    ),

  square4angles: () =>
    svg(
      "0 0 200 200",
      `<rect width="200" height="200" fill="#0f172a" rx="10"/>
      <rect x="50" y="50" width="100" height="100" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="3"/>
      ${[
        [43, 43],
        [143, 43],
        [43, 143],
        [143, 143],
      ]
        .map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="14" fill="none" stroke="#34d399" stroke-width="2"/>`)
        .join("")}
      <text x="100" y="175" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#34d399">квадрат · 4 кути</text>`,
      190,
    ),

  polygon: (sides) => {
    const cx = 110;
    const cy = 90;
    const r = 64;
    const pts = [...Array(sides)]
      .map((_, i) => {
        const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      })
      .join(" ");
    const names = { 3: "трикутник", 5: "п'ятикутник", 6: "шестикутник" };
    return svg(
      "0 0 220 180",
      `<rect width="220" height="180" fill="#0f172a" rx="10"/>
      <polygon points="${pts}" fill="rgba(251,191,36,0.2)" stroke="#fbbf24" stroke-width="3"/>
      <text x="110" y="168" text-anchor="middle" font-family="Inter,Arial" font-size="13" fill="#34d399">${sides} сторін · ${names[sides] || ""}</text>`,
      200,
    );
  },

  romanCheat: () =>
    infoCard(
      schemeTable(
        ["Римське", "Арабське"],
        [
          ["I", "1"],
          ["V", "5"],
          ["X", "10"],
          ["L", "50"],
          ["C", "100"],
          ["IV", "4 (5−1)"],
          ["IX", "9 (10−1)"],
          ["XII", "10 + 2 = 12"],
        ],
      ) + `<p style="margin:6px 0 0;color:#94a3b8;font-size:0.8rem">Менша цифра ліворуч — віднімаємо (IV, IX)</p>`,
    ),

  meanArithmetic: (nums, mean) =>
    svg(
      "0 0 320 150",
      `<rect width="320" height="150" fill="#0f172a" rx="10"/>
      ${nums
        .map((n, i) => {
          const x = 50 + i * 70;
          const h = n * 2;
          return `<rect x="${x}" y="${110 - h}" width="40" height="${h}" fill="#38bdf8" opacity="0.7"/>
                  <text x="${x + 20}" y="${100 - h}" text-anchor="middle" font-family="ui-monospace,Menlo" font-size="12" fill="#fde68a">${n}</text>`;
        })
        .join("")}
      <line x1="30" y1="${110 - mean * 2}" x2="290" y2="${110 - mean * 2}" stroke="#34d399" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="160" y="${95 - mean * 2}" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#34d399">середнє = ${mean}</text>
      <text x="160" y="135" text-anchor="middle" font-family="Inter,Arial" font-size="11" fill="#cbd5e1">(${nums.join(" + ")}) ÷ ${nums.length} = ${mean}</text>`,
      300,
    ),

  digitPlaces: () =>
    infoCard(
      schemeTable(
        ["Розряд", "Приклад"],
        [
          ["одиниці", "…7"],
          ["десятки", "…60"],
          ["сотні", "…500"],
          ["тисячі", "1…"],
        ],
      ) + `<p style="margin:8px 0 0;color:#86efac">найменше трицифрове число — <b>100</b></p>`,
    ),

  monthsDays: () =>
    infoCard(
      schemeTable(
        ["Місяць", "Дні"],
        [
          ["січ", "31"],
          ["лют", "28*"],
          ["бер", "31"],
          ["кві", "30"],
          ["тра", "31"],
          ["чер", "30"],
          ["лип", "31"],
          ["сер", "31"],
          ["вер", "30"],
          ["жов", "31"],
          ["лис", "30"],
          ["гру", "31"],
        ],
      ) + `<p style="margin:6px 0 0;font-size:0.78rem;color:#94a3b8">* у простому році лютий — 28 днів</p>`,
    ),

  monthsSeasons: () =>
    infoCard(
      schemeTable(
        ["Пора року", "Місяці"],
        [
          ["зима", "гру · січ · лют"],
          ["весна", "бер · кві · тра"],
          ["літо", "чер · лип · сер"],
          ["осінь", "вер · жов · лис"],
        ],
      ) + `<p style="margin:8px 0 0">📅 … → <b>лип</b> → <b>сер</b> → …</p>`,
    ),

  hundredsExplain: () =>
    infoCard(
      `<p style="color:#cbd5e1">У числі <b>4567</b>:</p>
       <p>• цифра <b>5</b> у розряді сотень = <b>5 сотень</b> (500)</p>
       <p>• повних сотень: 4567 ÷ 100 = <b>45</b> (залишок 67)</p>
       <p style="color:#86efac;margin-top:6px">У грі правильна відповідь <b>5</b> — цифра сотень.</p>`,
    ),
};

const WIKI = {
  time: {
    wikiKeyword: "час",
    wikiTitle: "Час",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%A7%D0%B0%D1%81",
  },
  week: {
    wikiKeyword: "тиждень",
    wikiTitle: "Тиждень",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%A2%D0%B8%D0%B6%D0%B4%D0%B5%D0%BD%D1%8C",
  },
  year: {
    wikiKeyword: "рік",
    wikiTitle: "Рік",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%A0%D1%96%D0%BA",
  },
  speed: {
    wikiKeyword: "швидкість",
    wikiTitle: "Швидкість",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%A8%D0%B2%D0%B8%D0%B4%D0%BA%D1%96%D1%81%D1%82%D1%8C",
  },
  roman: {
    wikiKeyword: "римські числа",
    wikiTitle: "Римські числа",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%A0%D0%B8%D0%BC%D1%81%D1%8C%D0%BA%D1%96_%D1%87%D0%B8%D1%81%D0%BB%D0%B0",
  },
  mean: {
    wikiKeyword: "середнє арифметичне",
    wikiTitle: "Середнє арифметичне",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%A1%D0%B5%D1%80%D0%B5%D0%B4%D0%BD%D1%94_%D0%B0%D1%80%D0%B8%D1%84%D0%BC%D0%B5%D1%82%D0%B8%D1%87%D0%BD%D0%B5",
  },
  ploshcha: {
    wikiKeyword: "Площа",
    wikiTitle: "Площа",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%9F%D0%BB%D0%BE%D1%89%D0%B0",
  },
  day: {
    wikiKeyword: "день",
    wikiTitle: "День",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%94%D0%B5%D0%BD%D1%8C",
  },
  lypen: {
    wikiKeyword: "липень",
    wikiTitle: "Липень",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%9B%D0%B8%D0%BF%D0%B5%D0%BD%D1%8C",
  },
  // Українська мова
  nagolos: {
    wikiKeyword: "наголос",
    wikiTitle: "Наголос",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%9D%D0%B0%D0%B3%D0%BE%D0%BB%D0%BE%D1%81",
  },
  imennyk: {
    wikiKeyword: "іменник",
    wikiTitle: "Іменник",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%86%D0%BC%D0%B5%D0%BD%D0%BD%D0%B8%D0%BA",
  },
  pidmet: {
    wikiKeyword: "підмет",
    wikiTitle: "Підмет",
    wikiUrl: "https://uk.wikipedia.org/wiki/%D0%9F%D1%96%D0%B4%D0%BC%D0%B5%D1%82",
  },
};

function stripWiki(q) {
  delete q.wikiKeyword;
  delete q.wikiTitle;
  delete q.wikiUrl;
  if (q.media) {
    q.media = q.media
      .replace(/<a href="https:\/\/uk\.wikipedia\.org[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "")
      .trim();
  }
}

function applyPatch(q, patch) {
  const { _stripWiki, ...rest } = patch;
  Object.assign(q, rest);
  if (_stripWiki) stripWiki(q);
}

function applyPatches(questions, patches) {
  let count = 0;
  for (const [idx, patch] of Object.entries(patches)) {
    const i = Number(idx);
    if (!questions[i]) {
      console.warn("Skip missing index", i);
      continue;
    }
    applyPatch(questions[i], { ...patch });
    count++;
  }
  return count;
}

const coins = () => MEDIA.coins25x4Photos();
const mass = () => MEDIA.massTable();
const length = () => MEDIA.lengthTable();
const timeFull = () => MEDIA.wikiTime() + MEDIA.timeTable() + MEDIA.leapYearNote();
const timeBase = () => MEDIA.wikiTime() + MEDIA.timeTable();
const romanWikiLink = () =>
  infoCard(
    `<a href="${WIKI.roman.wikiUrl}" target="_blank" rel="noopener" style="color:#86efac;font-weight:600">📖 Вікіпедія: Римські числа</a>`,
  );
const romanFull = () => romanWikiLink() + MEDIA.romanCheat();
const meanWiki = () =>
  wikiBlock(
    WIKI.mean.wikiUrl,
    WIKI.mean.wikiTitle,
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Seesaw_with_mean.svg/330px-Seesaw_with_mean.svg.png",
    "Середнє арифметичне",
  );
const meanFull3 = () => meanWiki() + MEDIA.meanArithmetic([10, 20, 30], 20);

const matematykaPatches = {
  0: { media: coins() },
  2: { media: length() },
  5: { media: timeBase() + infoCard("⏱ 2 год 30 хв = 2×60 + 30 = <b>150 хв</b>"), ...WIKI.time },
  7: { media: mass() + infoCard("🧮 2 т 500 кг = 2×1000 + 500 = <b>2500 кг</b>") },
  8: {
    text: "Яка площа прямокутника зі сторонами 8 і 5 см відповідно?",
    media:
      wikiBlock(
        WIKI.ploshcha.wikiUrl,
        WIKI.ploshcha.wikiTitle,
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Rectangle_4x5.svg/languk-330px-Rectangle_4x5.svg.png",
        "Площа",
      ) + MEDIA.rectArea(),
    ...WIKI.ploshcha,
  },
  12: { media: mass() + infoCard("🧮 2 кг 300 г = 2×1000 + 300 = <b>2300 г</b>") },
  22: { media: coins() + infoCard("🧮 100 : 25 = <b>4</b>") },
  34: { media: MEDIA.numberLine1000() },
  36: { media: length() },
  37: { media: length() },
  38: { media: mass() },
  39: { media: mass() },
  40: { media: timeFull(), ...WIKI.time },
  41: { media: timeFull(), ...WIKI.time },
  42: { media: timeFull(), ...WIKI.time },
  43: {
    media:
      wikiBlock(
        WIKI.week.wikiUrl,
        WIKI.week.wikiTitle,
        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Weekday_heptagram.svg/languk-330px-Weekday_heptagram.svg.png",
        "Тиждень",
      ) +
      infoCard("📅 У тижні <b>7 днів</b>:<br>Пн · Вт · Ср · Чт · Пт · Сб · Нд") +
      MEDIA.timeTable() +
      MEDIA.leapYearNote(),
    ...WIKI.week,
  },
  44: {
    media:
      wikiBlock(
        WIKI.year.wikiUrl,
        WIKI.year.wikiTitle,
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Analemma_fishburn.tif/lossy-page1-330px-Analemma_fishburn.tif.jpg",
        "Рік",
      ) +
      infoCard("📅 У році <b>12 місяців</b>") +
      MEDIA.timeTable() +
      MEDIA.leapYearNote(),
    ...WIKI.year,
  },
  46: { media: timeFull(), ...WIKI.time },
  47: { media: timeFull(), ...WIKI.time },
  48: { media: length() },
  49: { media: length() },
  50: { media: mass() },
  56: { _stripWiki: true, media: MEDIA.square4angles() },
  58: { media: MEDIA.rightAngle() },
  60: { _stripWiki: true, media: MEDIA.rectRightAngles() },
  61: { media: MEDIA.polygon(5) },
  62: { media: MEDIA.polygon(6) },
  71: { media: timeFull(), ...WIKI.time },
  72: { media: timeFull(), ...WIKI.time },
  81: { media: romanFull(), ...WIKI.roman },
  82: { media: romanFull(), ...WIKI.roman },
  83: { media: romanFull(), ...WIKI.roman },
  84: { media: romanFull(), ...WIKI.roman },
  85: { media: romanFull(), ...WIKI.roman },
  86: { media: romanFull(), ...WIKI.roman },
  87: { media: romanFull(), ...WIKI.roman },
  88: { _stripWiki: true, media: infoCard("🧮 ✏️ 5 грн × 6 = <b>30 грн</b>") },
  89: {
    media: infoCard("🌳 🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎 (12 яблунь)<br>🍐🍐🍐🍐 (груш у 3 рази менше → 12÷3 = <b>4</b>)"),
  },
  92: {
    media:
      wikiBlock(
        WIKI.speed.wikiUrl,
        WIKI.speed.wikiTitle,
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/US_Navy_040501-N-1336S-037_The_U.S._Navy_sponsored_Chevy_Monte_Carlo_NASCAR_leads_a_pack_into_turn_four_at_California_Speedway.jpg/330px-US_Navy_040501-N-1336S-037_The_U.S._Navy_sponsored_Chevy_Monte_Carlo_NASCAR_leads_a_pack_into_turn_four_at_California_Speedway.jpg",
        "Швидкість",
      ) + infoCard("🚗 шлях = швидкість × час<br>60 км/год × 3 год = <b>180 км</b>"),
    ...WIKI.speed,
  },
  94: { _stripWiki: true, media: infoCard("🍬🍬🍬🍬 × 5 грн + 🍫🍫 × 12 грн = 20 + 24 = <b>44 грн</b>") },
  95: { media: infoCard("🥟🥟🥟🥟🥟🥟 × 36 пиріжків ÷ 👧👦👧👦 (4 онуки) = <b>9</b> кожному") },
  96: { _stripWiki: true, media: infoCard("📚 30 хв × 5 днів = <b>150 хв</b>") },
  98: { media: meanFull3(), ...WIKI.mean },
  99: { media: meanWiki() + MEDIA.meanArithmetic([4, 6], 5), ...WIKI.mean },
  101: { media: MEDIA.hundredsExplain() },
  106: { media: MEDIA.digitPlaces() },
  109: {
    media:
      wikiBlock(WIKI.day.wikiUrl, WIKI.day.wikiTitle, "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Daylight.png/330px-Daylight.png", "День") +
      MEDIA.monthsDays(),
    ...WIKI.day,
  },
  110: {
    media:
      wikiBlock(
        WIKI.lypen.wikiUrl,
        WIKI.lypen.wikiTitle,
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/%D0%9B%D0%B8%D0%BF%D0%BD%D0%B5%D0%B2%D0%B8%D0%B9_%D0%B2%D0%B5%D1%87%D1%96%D1%80_%D0%BD%D0%B0_%D1%80._%D0%A1%D0%B0%D0%BC%D0%B0%D1%80%D0%B0.jpg/330px-%D0%9B%D0%B8%D0%BF%D0%BD%D0%B5%D0%B2%D0%B8%D0%B9_%D0%B2%D0%B5%D1%87%D1%96%D1%80_%D0%BD%D0%B0_%D1%80._%D0%A1%D0%B0%D0%BC%D0%B0%D1%80%D0%B0.jpg",
        "Липень",
      ) + MEDIA.monthsSeasons(),
    ...WIKI.lypen,
  },
  111: {
    media:
      wikiBlock(
        WIKI.week.wikiUrl,
        WIKI.week.wikiTitle,
        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Weekday_heptagram.svg/languk-330px-Weekday_heptagram.svg.png",
        "Тиждень",
      ) + infoCard("📅 перший день тижня — <b>понеділок</b><br>Пн · Вт · Ср · Чт · Пт · Сб · Нд"),
    ...WIKI.week,
  },
};

const ukrayinskaPatches = {
  0: {
    media:
      wikiBlock(
        WIKI.nagolos.wikiUrl,
        WIKI.nagolos.wikiTitle,
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Books-aj.svg_aj_ashton_01e.svg/languk-330px-Books-aj.svg_aj_ashton_01e.svg.png",
        "Наголос",
      ) +
      svg(
        "0 0 320 140",
        `<rect width="320" height="140" fill="#0f172a" rx="10"/>
        <text x="160" y="70" text-anchor="middle" font-family="Inter,Arial" font-size="34" font-weight="900" fill="#fde68a">кни́га</text>
        <text x="160" y="100" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#cbd5e1">наголос на «и́»</text>`,
        300,
      ),
    ...WIKI.nagolos,
  },
  1: {
    media:
      wikiBlock(
        WIKI.imennyk.wikiUrl,
        WIKI.imennyk.wikiTitle,
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Serrekundamadrassa.JPG/330px-Serrekundamadrassa.JPG",
        "Іменник",
      ) +
      svg(
        "0 0 320 160",
        `<rect width="320" height="160" fill="#0f172a" rx="10"/>
        <rect x="20" y="20" width="280" height="40" rx="20" fill="#fbbf24"/>
        <text x="160" y="46" text-anchor="middle" font-family="Inter,Arial" font-size="16" font-weight="900" fill="#0f172a">іменник</text>
        <text x="160" y="86" text-anchor="middle" font-family="Inter,Arial" font-size="14" fill="#fde68a">школа</text>
        <text x="160" y="120" text-anchor="middle" font-family="Inter,Arial" font-size="11" fill="#cbd5e1">що? хто? — предмет</text>`,
        300,
      ),
    ...WIKI.imennyk,
  },
  2: {
    media:
      infoCard(
        `<a href="${WIKI.pidmet.wikiUrl}" target="_blank" rel="noopener" style="color:#86efac;font-weight:600">📖 Вікіпедія: Підмет</a>`,
      ) +
      svg(
        "0 0 360 140",
        `<rect width="360" height="140" fill="#0f172a" rx="10"/>
        <text x="180" y="50" text-anchor="middle" font-family="Inter,Arial" font-size="16" fill="#fde68a">Діти грають у дворі</text>
        <line x1="40" y1="58" x2="320" y2="58" stroke="#fbbf24" stroke-width="0.5" opacity="0.3"/>
        <text x="60" y="92" fill="#34d399" font-weight="800" font-family="Inter,Arial" font-size="12">діти</text>
        <text x="60" y="108" fill="#bbf7d0" font-family="Inter,Arial" font-size="12">— підмет (хто? що?)</text>
        <text x="220" y="92" fill="#fb923c" font-weight="800" font-family="Inter,Arial" font-size="12">грають</text>
        <text x="220" y="108" fill="#fed7aa" font-family="Inter,Arial" font-size="12">— присудок</text>`,
        330,
      ),
    ...WIKI.pidmet,
  },
  3: {
    _stripWiki: true,
    media: svg(
      "0 0 320 140",
      `<rect width="320" height="140" fill="#0f172a" rx="10"/>
      <text x="160" y="74" text-anchor="middle" font-family="Inter,Arial" font-size="26" font-weight="900" fill="#34d399">✓ біологія</text>
      <text x="160" y="108" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#bbf7d0">правильне написання</text>`,
      300,
    ),
  },
};

const EXPLICIT_INDICES = {
  matematyka: new Set(Object.keys(matematykaPatches).map(Number)),
  ukrayinska: new Set(Object.keys(ukrayinskaPatches).map(Number)),
};

function revealsAnswer(q) {
  const ans = (q.answers[q.correct] || "").trim();
  if (!ans || !q.media) return false;
  if (/font-size:1\.1em/.test(q.media) && q.media.includes(ans)) return true;
  if (/color:#34d399;font-size:1\.1em/.test(q.media)) return true;
  return false;
}

function leaksAnswer(media) {
  return /font-size:1\.1em/.test(media || "");
}

function hintOnlyCard(q, emoji = "💡") {
  const hint = q.text.replace(/[?.…]+$/u, "").trim();
  return infoCard(`${emoji} <span style="color:#cbd5e1">${hint}</span>`);
}

function stripWikiHtml(media) {
  if (!media) return media;
  return media
    .replace(/<a href="https:\/\/uk\.wikipedia\.org[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<div class="info-card"><a href="https:\/\/uk\.wikipedia\.org[\s\S]*?<\/a><\/div>/gi, "")
    .trim();
}

const UKR_GRAMMAR_WIKI =
  /наголос|іменник|підмет|присудок|дієслов|прикметник|прислівник|синонім|антонім|орфограф|пунктуац|абетк|алфавіт|частк|граматик|речен/i;

function shouldStripUkrWiki(q) {
  const corpus = `${q.text} ${q.wikiKeyword || ""} ${q.wikiTitle || ""}`;
  if (/написан.+правильн|орфограф/i.test(q.text)) return true;
  if (/голосн|приголосн/i.test(q.text)) return true;
  if (/корінь|суфікс|префікс/i.test(q.text) && !/морфолог/i.test(corpus)) return true;
  if (q.wikiKeyword && !UKR_GRAMMAR_WIKI.test(corpus)) return true;
  return false;
}

function enhanceMatematyka(q) {
  const t = q.text;
  if (/піврічч/i.test(t) && !/scheme-table/.test(q.media || "")) {
    return {
      media: MEDIA.timeTable() + infoCard("📅 1 рік = 2 півріччя · кожне по <b>6 місяців</b>"),
      ...WIKI.year,
    };
  }
  if (/сторін у трикутник/i.test(t)) {
    return { _stripWiki: true, media: MEDIA.polygon(3) };
  }
  if (/наступник числа/i.test(t)) {
    const m = t.match(/числа\s+(\d+)/);
    if (m) {
      const n = +m[1];
      return { media: numberLineAround(n) };
    }
  }
  if (/римськ/i.test(t) && !/Римське/.test(q.media || "")) {
    return { media: romanFull(), ...WIKI.roman };
  }
  if (/Площа прямокутника.+дорівнює/i.test(t)) {
    const sides = t.match(/(\d+)\s*см\s*×\s*(\d+)/i);
    if (sides) {
      return {
        text: `Яка площа прямокутника зі сторонами ${sides[1]} і ${sides[2]} см відповідно?`,
        media:
          wikiBlock(
            WIKI.ploshcha.wikiUrl,
            WIKI.ploshcha.wikiTitle,
            "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Rectangle_4x5.svg/languk-330px-Rectangle_4x5.svg.png",
            "Площа",
          ) + MEDIA.rectArea(),
        ...WIKI.ploshcha,
      };
    }
  }
  if (/у книзі.+сторінок/i.test(t)) {
    const nums = t.match(/\d+/g) || [];
    return {
      _stripWiki: true,
      media: infoCard(
        `📚 Всього <b>${nums[0] || "?"}</b> сторінок · прочитано <b>${nums[1] || "?"}</b><br>залишилось = ${nums[0] || "?"} − ${nums[1] || "?"}`,
      ),
    };
  }
  if (/школі.+учнів.+дівчат/i.test(t)) {
    return {
      _stripWiki: true,
      media: infoCard("🏫 👦👧 Усього учнів − хлопчики = дівчатка"),
    };
  }
  if (/котра буде година|хвилин залишилося/i.test(t)) {
    return { media: timeFull(), ...WIKI.time };
  }
  if (/сотень у тисячі/i.test(t)) {
    return { media: MEDIA.digitPlaces() };
  }
  if (/нулів у мільйоні/i.test(t)) {
    return { media: infoCard("1 000 000 — одиниця + <b>6 нулів</b>") };
  }
  if (/(сантиметр|метр|кілометр|мм|дм|\bм\b|\bкм\b)/i.test(t) && /скільки|це скільки/i.test(t) && !/scheme-table/.test(q.media || "")) {
    return { media: length() };
  }
  if (/(кілограм|грам|тонн|центнер|\bкг\b|\bг\b|\bт\b|\bц\b)/i.test(t) && /скільки|це скільки/i.test(t) && !/scheme-table/.test(q.media || "")) {
    return { media: mass() };
  }
  if (/(хвилин|годин|секунд|доб|тиждень|місяц|рік|1\/\d+\s+(години|доби))/i.test(t) && /скільки|це скільки/i.test(t) && !/scheme-table/.test(q.media || "")) {
    return { media: timeFull(), ...WIKI.time };
  }
  if (/кутів у квадрат|прямих кутів|прямий кут|градусів/i.test(t)) {
    return { _stripWiki: true };
  }
  if (/п'ятикутник|шестикутник/i.test(t) && !/polygon/.test(q.media || "")) {
    const sides = /шестикутник/i.test(t) ? 6 : 5;
    return { _stripWiki: true, media: MEDIA.polygon(sides) };
  }
  return null;
}

function numberLineAround(center) {
  const nums = [center - 3, center - 2, center - 1, center, center + 1, center + 2, center + 3];
  return svg(
    "0 0 360 90",
    `<rect width="360" height="90" fill="#0f172a" rx="10"/>
      <line x1="20" y1="50" x2="340" y2="50" stroke="#fbbf24" stroke-width="2.5"/>
      ${nums
        .map((n, i) => {
          const x = 20 + i * 53;
          const isTarget = n === center - 1 || n === center;
          return `<line x1="${x}" y1="44" x2="${x}" y2="56" stroke="#fbbf24" stroke-width="${isTarget ? 3 : 1.5}"/>
                  <text x="${x}" y="78" text-anchor="middle" font-family="ui-monospace,Menlo" font-size="10" fill="${n === center - 1 ? "#34d399" : "#94a3b8"}" font-weight="${n === center - 1 ? 800 : 400}">${n}</text>
                  ${n === center - 1 ? `<text x="${x}" y="30" text-anchor="middle" font-size="9" fill="#86efac">наступник</text>` : ""}`;
        })
        .join("")}`,
    340,
  );
}

function morphScheme(word, label) {
  const w = word.replace(/[«»]/g, "");
  return svg(
    "0 0 320 140",
    `<rect width="320" height="140" fill="#0f172a" rx="10"/>
      <text x="160" y="62" text-anchor="middle" font-family="Inter,Arial" font-size="28" font-weight="900" fill="#fde68a">${w}</text>
      <text x="160" y="96" text-anchor="middle" font-family="Inter,Arial" font-size="14" fill="#34d399" font-weight="800">знайди ${label}</text>
      <text x="160" y="118" text-anchor="middle" font-family="Inter,Arial" font-size="11" fill="#cbd5e1">розбір слова: приставка · корінь · суфікс · закінчення</text>`,
    300,
  );
}

function enhanceUkrainian(q) {
  const t = q.text;
  if (/корінь/i.test(t)) {
    const w = (t.match(/«([^»]+)»/) || [])[1];
    if (w) return { _stripWiki: true, media: morphScheme(w, "корінь") };
  }
  if (/суфікс/i.test(t)) {
    const w = (t.match(/«([^»]+)»/) || [])[1];
    if (w) return { _stripWiki: true, media: morphScheme(w, "суфікс") };
  }
  if (/префікс/i.test(t)) {
    const w = (t.match(/«([^»]+)»/) || [])[1];
    if (w) return { _stripWiki: true, media: morphScheme(w, "приставку") };
  }
  if (/питальн.+речен/i.test(t)) {
    return {
      _stripWiki: true,
      media:
        svg(
          "0 0 320 140",
          `<rect width="320" height="140" fill="#0f172a" rx="10"/>
          <text x="160" y="58" text-anchor="middle" font-family="Inter,Arial" font-size="15" fill="#fde68a">Як тебе звати<b fill="#fbbf24">?</b></text>
          <text x="160" y="100" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#34d399">питальне речення · знак ?</text>`,
          300,
        ),
    };
  }
  if (/окличн.+речен/i.test(t)) {
    return {
      _stripWiki: true,
      media: svg(
        "0 0 220 140",
        `<rect width="220" height="140" fill="#0f172a" rx="10"/>
        <text x="110" y="78" text-anchor="middle" font-family="Inter,Arial" font-size="60" font-weight="900" fill="#fbbf24">!</text>
        <text x="110" y="116" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#fde68a">окличне речення</text>`,
        200,
      ),
    };
  }
  if (/розповідн.+речен/i.test(t)) {
    return {
      _stripWiki: true,
      media: svg(
        "0 0 320 140",
        `<rect width="320" height="140" fill="#0f172a" rx="10"/>
        <text x="160" y="62" text-anchor="middle" font-family="Inter,Arial" font-size="15" fill="#fde68a">Сонце світить яскраво<b fill="#94a3b8">.</b></text>
        <text x="160" y="100" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#34d399">розповідне речення · крапка</text>`,
        300,
      ),
    };
  }
  if (/скільки слів у реченні/i.test(t)) {
    const sent = (t.match(/«([^»]+)»/) || [])[1] || "";
    const words = sent.split(/\s+/).filter(Boolean);
    return {
      _stripWiki: true,
      media: infoCard(
        `📖 «${sent}»<br>${words.map((w, i) => `<span style="color:#fde68a">${i + 1}.</span> ${w}`).join(" · ")}<br><span style="color:#86efac">порахуй слова</span>`,
      ),
    };
  }
  if (/скільки букв|скільки звуків/i.test(t) && !/голосн|приголосн/i.test(t)) {
    const w = (t.match(/«([^»]+)»/) || [])[1];
    if (w) {
      return {
        _stripWiki: true,
        media: infoCard(`🔤 Слово «<b>${w}</b>» — порахуй букви/звуки`),
      };
    }
  }
  if (revealsAnswer(q)) {
    const fresh = makeUkrMovaMedia(q);
    if (fresh && !leaksAnswer(fresh)) {
      return { _stripWiki: true, media: fresh };
    }
    return { _stripWiki: true, media: hintOnlyCard(q, "📝") };
  }
  if (shouldStripUkrWiki(q)) {
    const cleaned = stripWikiHtml(q.media);
    if (cleaned !== q.media) {
      return { _stripWiki: true, media: cleaned || q.media };
    }
  }
  return null;
}

function applyHeuristics(questions, subjectId, maker) {
  let count = 0;
  const skip = EXPLICIT_INDICES[subjectId] || new Set();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    let patch = null;
    if (subjectId === "matematyka") patch = enhanceMatematyka(q);
    else if (subjectId === "ukrayinska") patch = enhanceUkrainian(q);

    if (patch && !skip.has(i)) {
      applyPatch(q, patch);
      count++;
      continue;
    }

    if (revealsAnswer(q) && !skip.has(i) && subjectId !== "ukrayinska") {
      let fresh = maker ? maker(q) : null;
      if (!fresh || leaksAnswer(fresh)) {
        const emoji = { informatyka: "💻", matematyka: "🧮" }[subjectId] || "💡";
        fresh = hintOnlyCard(q, emoji);
      }
      if (fresh !== q.media) {
        q.media = fresh;
        delete q.wikiKeyword;
        delete q.wikiTitle;
        delete q.wikiUrl;
        count++;
      }
    }
  }
  return count;
}

const SUBJECTS = [
  { id: "matematyka", file: "matematyka-4-klas.json", patches: matematykaPatches, maker: makeMatematykaMedia },
  { id: "ukrayinska", file: "ukrayinska-mova-4-klas.json", patches: ukrayinskaPatches, maker: makeUkrMovaMedia },
  { id: "informatyka", file: "informatyka-4-klas.json", patches: null, maker: makeInformatykaMedia },
  { id: "anhliyska", file: "anhliyska-mova-4-klas.json", patches: null, maker: makeAnhliyskaMedia },
  { id: "ispanska", file: "ispanska-mova-4-klas.json", patches: null, maker: makeIspanskaMedia },
];

for (const sub of SUBJECTS) {
  const path = resolve(DATA, sub.file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  const explicit = sub.patches ? applyPatches(data.questions, sub.patches) : 0;
  const heuristic = applyHeuristics(data.questions, sub.id, sub.maker);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`${sub.file}: ${explicit} явних + ${heuristic} евристичних → ${path}`);
}
