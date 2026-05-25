#!/usr/bin/env node
/*
 * Unified media generator for all remaining "Перший мільйон" subjects:
 *   - matematyka-4-klas.json       (Математика)
 *   - ukrayinska-mova-4-klas.json  (Українська мова)
 *   - informatyka-4-klas.json      (Інформатика)
 *   - anhliyska-mova-4-klas.json   (Англійська)
 *   - ispanska-mova-4-klas.json    (Іспанська)
 *
 * Same approach as generate-steam-media.mjs and generate-mystetstvo-media.mjs:
 * subject-specific rule list of (predicate → template), corpus matching
 * across text + answers, polished info-card fallback.
 *
 * Run with:  node scripts/generate-first-million-media.mjs [--verbose]
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "games/first-million/data");

const BG = "#0d1117";

/* ============================================================
 * SHARED SVG / HTML HELPERS
 * ==========================================================*/

function svg(viewBox, body, width = 240) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" style="width:${width}px;max-width:100%;height:auto;background:${BG};border-radius:10px;padding:8px;">${body}</svg>`;
}
function infoCard(html) {
  return `<div class="info-card">${html}</div>`;
}
function schemeRow(nodes) {
  return `<div class="scheme-row">${nodes
    .map((n, i) =>
      i === 0
        ? `<span class="node">${n}</span>`
        : `<span class="arrow">→</span><span class="node">${n}</span>`,
    )
    .join("")}</div>`;
}
function schemeTable(headers, rows) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  return `<table class="scheme-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
function compare(rows) {
  return `<div class="compare">${rows
    .map(([k, v]) => `<span class="label">${k}</span><span class="val">${v}</span>`)
    .join("")}</div>`;
}

/* ============================================================
 * EMOJI DICTIONARY FOR LANGUAGE FLASHCARDS
 * Maps a Ukrainian word/phrase (lower-cased, stripped of '? !') to an emoji.
 * Used for English & Spanish word cards.
 * ==========================================================*/
const EMOJI = {
  // numbers
  "нуль": "0️⃣", "один": "1️⃣", "два": "2️⃣", "три": "3️⃣", "чотири": "4️⃣",
  "п'ять": "5️⃣", "шість": "6️⃣", "сім": "7️⃣", "вісім": "8️⃣", "девʼять": "9️⃣",
  "дев'ять": "9️⃣", "десять": "🔟", "одинадцять": "1️⃣1️⃣", "дванадцять": "1️⃣2️⃣",
  "тринадцять": "1️⃣3️⃣", "чотирнадцять": "1️⃣4️⃣", "п'ятнадцять": "1️⃣5️⃣",
  "шістнадцять": "1️⃣6️⃣", "сімнадцять": "1️⃣7️⃣", "вісімнадцять": "1️⃣8️⃣",
  "дев'ятнадцять": "1️⃣9️⃣", "двадцять": "2️⃣0️⃣", "тридцять": "3️⃣0️⃣",
  "сорок": "4️⃣0️⃣", "п'ятдесят": "5️⃣0️⃣", "сто": "💯", "тисяча": "1⃣K",

  // colors
  "червоний": "🟥", "оранжевий": "🟧", "помаранчевий": "🟧",
  "жовтий": "🟨", "зелений": "🟩", "синій": "🟦", "блакитний": "🟦",
  "фіолетовий": "🟪", "білий": "⬜", "чорний": "⬛", "коричневий": "🟫",
  "сірий": "▫", "рожевий": "🌸", "колір": "🎨",

  // family
  "мама": "👩", "тато": "👨", "брат": "👦", "сестра": "👧", "бабуся": "👵",
  "дідусь": "👴", "син": "👶", "донька": "👧", "родина": "👨‍👩‍👧‍👦", "сімʼя": "👨‍👩‍👧",
  "дідусь і бабуся": "👴👵", "тітка": "👩", "дядько": "👨", "друг": "🧑‍🤝‍🧑",
  "подруга": "👭", "дитина": "🧒",

  // animals
  "кіт": "🐱", "кішка": "🐈", "пес": "🐶", "собака": "🐕", "корова": "🐄",
  "свиня": "🐷", "коза": "🐐", "вівця": "🐑", "кінь": "🐴", "курка": "🐔",
  "качка": "🦆", "гуска": "🦢", "пташка": "🐦", "птах": "🐦", "риба": "🐟",
  "ведмідь": "🐻", "вовк": "🐺", "лисиця": "🦊", "лис": "🦊", "заєць": "🐰",
  "білка": "🐿", "їжак": "🦔", "слон": "🐘", "жираф": "🦒", "лев": "🦁",
  "тигр": "🐯", "мавпа": "🐵", "крокодил": "🐊", "змія": "🐍", "черепаха": "🐢",
  "метелик": "🦋", "бджола": "🐝", "комар": "🦟", "павук": "🕷",
  "тварина": "🐾", "тварини": "🐾", "мишка": "🐭", "миша": "🐭",

  // body
  "голова": "💆", "обличчя": "😀", "око": "👁", "очі": "👀", "вухо": "👂",
  "ніс": "👃", "рот": "👄", "губи": "💋", "зуби": "🦷", "язик": "👅",
  "рука": "✋", "руки": "🙌", "нога": "🦵", "ноги": "🦶", "пальці": "🖐",
  "волосся": "💇", "серце": "❤", "мозок": "🧠", "тіло": "🧍",

  // foods
  "яблуко": "🍎", "груша": "🍐", "помідор": "🍅", "огірок": "🥒", "картопля": "🥔",
  "морква": "🥕", "цибуля": "🧅", "часник": "🧄", "лимон": "🍋", "апельсин": "🍊",
  "виноград": "🍇", "кавун": "🍉", "диня": "🍈", "полуниця": "🍓", "малина": "🍓",
  "вишня": "🍒", "банан": "🍌", "ананас": "🍍", "ягода": "🫐", "ягоди": "🫐",
  "хліб": "🍞", "молоко": "🥛", "масло": "🧈", "сир": "🧀", "яйце": "🥚",
  "мʼясо": "🍖", "мясо": "🍖", "м'ясо": "🍖", "риба": "🐟", "суп": "🍲",
  "каша": "🥣", "торт": "🎂", "цукерка": "🍬", "шоколад": "🍫", "морозиво": "🍨",
  "сік": "🧃", "вода": "💧", "чай": "🍵", "кава": "☕", "печиво": "🍪",
  "піца": "🍕", "макарони": "🍝", "хот-дог": "🌭", "сендвіч": "🥪", "бургер": "🍔",
  "їжа": "🍽", "фрукт": "🍎", "фрукти": "🍓", "овоч": "🥬", "овочі": "🥬",
  "ягода": "🫐",

  // school
  "школа": "🏫", "учень": "🧑‍🎓", "учениця": "👩‍🎓", "учитель": "🧑‍🏫", "вчителька": "👩‍🏫",
  "клас": "🏫", "урок": "📚", "книга": "📖", "книжка": "📖", "зошит": "📓",
  "ручка": "🖊", "олівець": "✏", "лінійка": "📏", "гумка": "🧽", "ножиці": "✂",
  "папір": "📄", "рюкзак": "🎒", "сумка": "👜", "дошка": "🖼", "крейда": "🖍",
  "комп'ютер": "💻", "комп'ютер": "💻", "ноутбук": "💻", "телефон": "📱",
  "телевізор": "📺", "годинник": "⏰", "стіл": "🪑", "стілець": "🪑",

  // weather
  "погода": "🌤", "сонце": "☀", "сонячно": "☀", "хмара": "☁", "хмарно": "☁",
  "дощ": "🌧", "дощить": "🌧", "сніг": "❄", "сніжить": "❄", "вітер": "🌬",
  "вітряно": "🌬", "тепло": "🌡", "холодно": "🥶", "гаряче": "🥵", "гарно": "☀",
  "веселка": "🌈",

  // time
  "ранок": "🌅", "день": "🌞", "вечір": "🌆", "ніч": "🌙", "сьогодні": "📅",
  "завтра": "📆", "вчора": "🕐", "час": "⏰", "тиждень": "📅",
  "понеділок": "1️⃣", "вівторок": "2️⃣", "середа": "3️⃣", "четвер": "4️⃣",
  "п'ятниця": "5️⃣", "субота": "🎉", "неділя": "🎉",
  "січень": "❄", "лютий": "❄", "березень": "🌷", "квітень": "🌸",
  "травень": "🌹", "червень": "☀", "липень": "🌞", "серпень": "🍉",
  "вересень": "🍂", "жовтень": "🎃", "листопад": "🍁", "грудень": "🎄",
  "весна": "🌸", "літо": "☀", "осінь": "🍂", "зима": "❄",
  "рік": "📅", "місяць": "🌙", "хвилина": "⏱", "секунда": "⏱", "година": "⏰",

  // travel / places
  "автомобіль": "🚗", "машина": "🚗", "автобус": "🚌", "потяг": "🚂", "поїзд": "🚂",
  "літак": "✈", "корабель": "🚢", "велосипед": "🚴", "вантажівка": "🚚",
  "човен": "⛵", "ракета": "🚀", "будинок": "🏠", "хата": "🏠", "квартира": "🏢",
  "вулиця": "🛣", "місто": "🏙", "село": "🏡", "країна": "🌍", "світ": "🌎",
  "парк": "🌳", "ліс": "🌲", "море": "🌊", "озеро": "🏞", "гора": "⛰",
  "пляж": "🏖", "магазин": "🏬", "лікарня": "🏥", "аеропорт": "✈",
  "вокзал": "🚉", "стадіон": "🏟", "церква": "⛪", "міст": "🌉",

  // greetings/feelings
  "привіт": "👋", "здравствуй": "👋", "вітаю": "👋", "до побачення": "👋",
  "будь ласка": "🙏", "дякую": "🙏", "вибач": "🙏", "так": "✅", "ні": "❌",
  "добре": "👍", "погано": "👎", "щастя": "😄", "сум": "😢", "сумно": "😢",
  "веселий": "😄", "радість": "😊", "сміятися": "😂", "плакати": "😭",
  "любов": "❤", "любити": "❤", "друг": "🤝", "обійми": "🤗",
  "сміливий": "💪", "розумний": "🤓",

  // verbs
  "читати": "📖", "писати": "✍", "малювати": "🎨", "рахувати": "🧮",
  "співати": "🎤", "танцювати": "💃", "бігати": "🏃", "ходити": "🚶",
  "плавати": "🏊", "стрибати": "🤸", "грати": "🎮", "гратися": "🎮",
  "їсти": "🍴", "пити": "🥤", "спати": "😴", "слухати": "👂", "дивитися": "👀",
  "сидіти": "🪑", "стояти": "🧍", "лежати": "🛏", "відкривати": "🔓",
  "закривати": "🔒", "купувати": "🛒", "вчити": "📚", "працювати": "💼",
  "вчитися": "🎓", "малювати": "🎨",

  // adjectives / qualities
  "великий": "🐘", "малий": "🐭", "маленький": "🐭", "високий": "📏",
  "низький": "📐", "довгий": "📏", "короткий": "✂", "новий": "✨",
  "старий": "🧓", "чистий": "🧼", "брудний": "💩", "швидкий": "⚡",
  "повільний": "🐢", "гарний": "🌟", "красивий": "🌟", "сильний": "💪",
  "слабкий": "😪", "молодий": "👶", "повний": "🍱", "пустий": "📭",
  "товстий": "🐖", "тонкий": "📄", "теплий": "🌡", "гарячий": "🔥", "холодний": "🥶",

  // others common
  "квітка": "🌸", "квіти": "💐", "трава": "🌱", "дерево": "🌳", "лист": "🍃",
  "корінь": "🌱", "плід": "🍎", "вогонь": "🔥", "земля": "🌍", "небо": "☁",
  "зірка": "⭐", "місяць": "🌙", "вода": "💧", "сонце": "☀", "пісок": "🏖",
  "камінь": "🪨", "сніжинка": "❄", "лід": "🧊", "дзвоник": "🔔",
  "м'яч": "⚽", "ляльк": "🪆", "іграшка": "🧸", "ялинка": "🎄", "подарунок": "🎁",
  "ключ": "🔑", "двері": "🚪", "вікно": "🪟", "велосипед": "🚲", "куля": "🎈",

  // greetings phrases
  "доброго ранку": "🌅", "добрий день": "🌞", "добрий вечір": "🌆",
  "доброї ночі": "🌙", "на добраніч": "🌙",

  // generic
  "людина": "🧍", "хлопчик": "👦", "дівчинка": "👧", "жінка": "👩", "чоловік": "👨",
  "дівчина": "👩", "хлопець": "👨", "діти": "👶👧👦",
};

function emojiFor(ukrPhrase) {
  if (!ukrPhrase) return "";
  const key = ukrPhrase
    .trim()
    .toLowerCase()
    .replace(/[?!.,]+$/g, "")
    .replace(/^['"«»]+|['"«»]+$/g, "");
  if (EMOJI[key]) return EMOJI[key];
  // try first word
  const first = key.split(/\s+/)[0];
  if (first && EMOJI[first]) return EMOJI[first];
  return "";
}

/* ============================================================
 * LANGUAGE TEMPLATES (used for English & Spanish)
 * ==========================================================*/

const LangT = {
  // Big foreign word + Ukrainian gloss + emoji.
  wordCard: (foreign, ukr, emoji, langBadge) => {
    const emojiText = emoji
      ? `<text x="60" y="106" text-anchor="middle" font-size="56">${emoji}</text>`
      : "";
    const xWord = emoji ? 220 : 170;
    return svg(
      "0 0 340 200",
      `
      <defs>
        <linearGradient id="lc_bg" x1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1e293b"/>
          <stop offset="1" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="340" height="200" fill="url(#lc_bg)" rx="10"/>
      ${langBadge ? `<rect x="10" y="10" width="58" height="22" rx="11" fill="#fbbf24"/><text x="39" y="26" text-anchor="middle" font-family="Inter, Arial" font-size="12" font-weight="900" fill="#7c2d12">${langBadge}</text>` : ""}
      ${emojiText}
      <text x="${xWord}" y="96" text-anchor="middle" font-family="Inter, Arial" font-size="${foreign.length > 12 ? 22 : 30}" font-weight="900" fill="#fbbf24">${escapeXml(foreign)}</text>
      <text x="${xWord}" y="130" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#cbd5e1">${escapeXml(ukr)}</text>
      <text x="170" y="178" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#94a3b8" font-style="italic">🔊 запам'ятай це слово</text>`,
      300,
    );
  },

  // Generic vocabulary card without emoji
  textCard: (foreign, ukr, langBadge) => LangT.wordCard(foreign, ukr, "", langBadge),

  // Phrase card for "as ... — це" / question phrases
  phraseCard: (foreign, ukr, langBadge) =>
    svg(
      "0 0 340 200",
      `
      <rect width="340" height="200" fill="#0f172a" rx="10"/>
      ${langBadge ? `<rect x="10" y="10" width="58" height="22" rx="11" fill="#fbbf24"/><text x="39" y="26" text-anchor="middle" font-family="Inter, Arial" font-size="12" font-weight="900" fill="#7c2d12">${langBadge}</text>` : ""}
      <text x="170" y="80" text-anchor="middle" font-family="Inter, Arial" font-size="${foreign.length > 18 ? 18 : 22}" font-weight="800" fill="#fbbf24">${escapeXml(foreign)}</text>
      <text x="170" y="120" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#cbd5e1">↕</text>
      <text x="170" y="150" text-anchor="middle" font-family="Inter, Arial" font-size="${ukr.length > 18 ? 14 : 16}" fill="#bae6fd">${escapeXml(ukr)}</text>`,
      300,
    ),
};

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ============================================================
 * MATH TEMPLATES
 * ==========================================================*/

const MathT = {
  calc: (a, op, b, result) =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      <text x="160" y="70" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="34" font-weight="900" fill="#fde68a">${a} ${op} ${b} = <tspan fill="#34d399">${result}</tspan></text>
      <text x="160" y="106" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#cbd5e1">${{
        "×": "множення",
        "÷": "ділення",
        ":": "ділення",
        "+": "додавання",
        "−": "віднімання",
        "-": "віднімання",
      }[op] || "обчислення"}</text>`,
      300,
    ),

  multiplyGrid: (a, b) => {
    if (a > 12 || b > 12) return MathT.calc(a, "×", b, a * b);
    const cell = 16;
    const w = 60 + b * cell;
    const h = 40 + a * cell;
    return svg(
      `0 0 ${w} ${h + 30}`,
      `
      <rect width="${w}" height="${h + 30}" fill="#0f172a" rx="8"/>
      ${[...Array(a)]
        .map((_, i) =>
          [...Array(b)]
            .map(
              (_, j) =>
                `<rect x="${50 + j * cell}" y="${30 + i * cell}" width="${cell - 2}" height="${cell - 2}" fill="#fbbf24" opacity="0.85"/>`,
            )
            .join(""),
        )
        .join("")}
      <text x="${50 + (b * cell) / 2}" y="22" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="12" fill="#fbbf24">${b}</text>
      <text x="40" y="${30 + (a * cell) / 2 + 4}" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="12" fill="#fbbf24">${a}</text>
      <text x="${w / 2}" y="${h + 22}" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="14" font-weight="800" fill="#34d399">${a} × ${b} = ${a * b}</text>`,
      Math.min(300, w),
    );
  },

  numberLine: (highlight) =>
    svg(
      "0 0 320 90",
      `
      <line x1="20" y1="50" x2="300" y2="50" stroke="#fbbf24" stroke-width="2.5"/>
      ${[...Array(11)]
        .map((_, i) => {
          const x = 20 + i * 28;
          const v = i;
          const hot = highlight === v;
          return `<line x1="${x}" y1="44" x2="${x}" y2="56" stroke="#fbbf24" stroke-width="${hot ? 3 : 1.5}"/><text x="${x}" y="78" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="${hot ? "#34d399" : "#fde68a"}" font-weight="${hot ? 800 : 400}">${v}</text>${hot ? `<circle cx="${x}" cy="50" r="6" fill="#34d399"/>` : ""}`;
        })
        .join("")}`,
      300,
    ),

  fractionPie: (num, den, label) =>
    svg(
      "0 0 220 200",
      `
      <rect width="220" height="200" fill="#0f172a" rx="10"/>
      <circle cx="110" cy="90" r="64" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      ${[...Array(den)]
        .map((_, i) => {
          const a1 = (Math.PI * 2 * i) / den - Math.PI / 2;
          const a2 = (Math.PI * 2 * (i + 1)) / den - Math.PI / 2;
          const x1 = 110 + 64 * Math.cos(a1);
          const y1 = 90 + 64 * Math.sin(a1);
          const x2 = 110 + 64 * Math.cos(a2);
          const y2 = 90 + 64 * Math.sin(a2);
          return `<path d="M110 90 L${x1} ${y1} A64 64 0 0 1 ${x2} ${y2} Z" fill="${i < num ? "#fbbf24" : "#334155"}" stroke="#fde68a" stroke-width="1"/>`;
        })
        .join("")}
      <text x="110" y="184" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="22" font-weight="900" fill="#34d399">${num}/${den}${label ? " " + label : ""}</text>`,
      200,
    ),

  fractionsCompare: (a1, a2, b1, b2, larger) =>
    svg(
      "0 0 320 200",
      `
      <rect width="320" height="200" fill="#0f172a" rx="10"/>
      <g transform="translate(60 100)">
        <circle r="50" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
        ${[...Array(a2)]
          .map((_, i) => {
            const a1a = (Math.PI * 2 * i) / a2 - Math.PI / 2;
            const a1b = (Math.PI * 2 * (i + 1)) / a2 - Math.PI / 2;
            return `<path d="M0 0 L${50 * Math.cos(a1a)} ${50 * Math.sin(a1a)} A50 50 0 0 1 ${50 * Math.cos(a1b)} ${50 * Math.sin(a1b)} Z" fill="${i < a1 ? "#fbbf24" : "#334155"}" stroke="#fde68a"/>`;
          })
          .join("")}
        <text x="0" y="76" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="16" font-weight="800" fill="${larger === "a" ? "#34d399" : "#cbd5e1"}">${a1}/${a2}</text>
      </g>
      <g transform="translate(240 100)">
        <circle r="50" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
        ${[...Array(b2)]
          .map((_, i) => {
            const a1a = (Math.PI * 2 * i) / b2 - Math.PI / 2;
            const a1b = (Math.PI * 2 * (i + 1)) / b2 - Math.PI / 2;
            return `<path d="M0 0 L${50 * Math.cos(a1a)} ${50 * Math.sin(a1a)} A50 50 0 0 1 ${50 * Math.cos(a1b)} ${50 * Math.sin(a1b)} Z" fill="${i < b1 ? "#fbbf24" : "#334155"}" stroke="#fde68a"/>`;
          })
          .join("")}
        <text x="0" y="76" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="16" font-weight="800" fill="${larger === "b" ? "#34d399" : "#cbd5e1"}">${b1}/${b2}</text>
      </g>
      <text x="150" y="104" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="22" font-weight="900" fill="#fde68a">${larger === "a" ? ">" : "<"}</text>`,
      300,
    ),

  square: (side, perimeter) =>
    svg(
      "0 0 240 200",
      `
      <rect width="240" height="200" fill="#0f172a" rx="10"/>
      <rect x="60" y="40" width="120" height="120" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="3"/>
      <text x="120" y="26" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fde68a" font-weight="700">${side} см</text>
      <text x="120" y="180" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fde68a" font-weight="700">${side} см</text>
      <text x="44" y="104" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fde68a" font-weight="700" transform="rotate(-90 44 104)">${side}</text>
      <text x="196" y="104" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fde68a" font-weight="700" transform="rotate(90 196 104)">${side}</text>
      <text x="120" y="195" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="13" fill="#34d399">P = 4 · ${side} = ${perimeter} см</text>`,
      230,
    ),

  rectangle: () =>
    svg(
      "0 0 280 180",
      `
      <rect width="280" height="180" fill="#0f172a" rx="10"/>
      <rect x="50" y="40" width="180" height="100" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" stroke-width="3"/>
      ${[
        [50, 40, "▢"],
        [230, 40, "▢"],
        [50, 140, "▢"],
        [230, 140, "▢"],
      ]
        .map(
          ([x, y]) =>
            `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="none" stroke="#fbbf24" stroke-width="2"/>`,
        )
        .join("")}
      <text x="140" y="168" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bae6fd" font-weight="700">прямокутник · 4 прямі кути</text>`,
      270,
    ),

  triangleWithAngle: () =>
    svg(
      "0 0 220 180",
      `
      <rect width="220" height="180" fill="#0f172a" rx="10"/>
      <polygon points="40,150 180,150 110,40" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="3"/>
      <text x="110" y="168" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">сума кутів = 180°</text>`,
      200,
    ),

  clock: (h, m = 0) =>
    svg(
      "0 0 200 200",
      `
      <circle cx="100" cy="100" r="92" fill="#1e293b" stroke="#fbbf24" stroke-width="4"/>
      ${[...Array(12)]
        .map((_, i) => {
          const a = (i * 360) / 12 - 90;
          const rad = (Math.PI * a) / 180;
          return `<line x1="${100 + 76 * Math.cos(rad)}" y1="${100 + 76 * Math.sin(rad)}" x2="${100 + 86 * Math.cos(rad)}" y2="${100 + 86 * Math.sin(rad)}" stroke="#fbbf24" stroke-width="2"/>`;
        })
        .join("")}
      ${(() => {
        const hourA = ((h % 12) * 30 + m / 2) - 90;
        const minA = (m * 6) - 90;
        const hr = (Math.PI * hourA) / 180;
        const mr = (Math.PI * minA) / 180;
        return `
          <line x1="100" y1="100" x2="${100 + 48 * Math.cos(hr)}" y2="${100 + 48 * Math.sin(hr)}" stroke="#fde68a" stroke-width="5" stroke-linecap="round"/>
          <line x1="100" y1="100" x2="${100 + 72 * Math.cos(mr)}" y2="${100 + 72 * Math.sin(mr)}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
      })()}
      <circle cx="100" cy="100" r="5" fill="#fbbf24"/>`,
      180,
    ),

  unitConvert: (from, to, ratio) =>
    svg(
      "0 0 320 120",
      `
      <rect width="320" height="120" fill="#0f172a" rx="10"/>
      <text x="160" y="50" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="22" font-weight="900" fill="#fde68a">1 ${from} = <tspan fill="#34d399">${ratio} ${to}</tspan></text>
      <text x="160" y="88" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#cbd5e1">переведення одиниць</text>`,
      300,
    ),

  wordProblem: (parts) =>
    svg(
      "0 0 320 160",
      `
      <rect width="320" height="160" fill="#0f172a" rx="10"/>
      ${parts
        .map((p, i) =>
          `<text x="20" y="${40 + i * 24}" font-family="Inter, Arial" font-size="13" fill="${p.color || "#fde68a"}">${escapeXml(p.text)}</text>`,
        )
        .join("")}`,
      300,
    ),

  rectAreaBar: (total, taken, label) =>
    svg(
      "0 0 320 120",
      `
      <rect width="320" height="120" fill="#0f172a" rx="10"/>
      <rect x="20" y="40" width="280" height="40" fill="#334155" stroke="#fbbf24" stroke-width="2"/>
      <rect x="20" y="40" width="${(280 * taken) / total}" height="40" fill="#fbbf24"/>
      <text x="160" y="98" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="13" fill="#fde68a">${label}</text>
      <text x="${20 + (280 * taken) / total / 2}" y="66" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="13" font-weight="900" fill="#0f172a">${taken}</text>
      <text x="${20 + (280 * taken) / total + (280 * (total - taken)) / total / 2}" y="66" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="13" font-weight="900" fill="#fde68a">${total - taken}</text>`,
      300,
    ),

  orderingCard: (sortedNumbers) =>
    schemeRow(sortedNumbers.map(String)),

  monthCard: (m) =>
    svg(
      "0 0 220 140",
      `
      <rect width="220" height="140" fill="#0f172a" rx="10"/>
      <rect x="20" y="20" width="180" height="30" fill="#fbbf24"/>
      <text x="110" y="40" text-anchor="middle" font-family="Inter, Arial" font-size="14" font-weight="900" fill="#7c2d12">${m}</text>
      <g font-family="ui-monospace, Menlo" font-size="11" fill="#cbd5e1">
        ${[
          "Пн Вт Ср Чт Пт Сб Нд",
          " 1  2  3  4  5  6  7",
          " 8  9 10 11 12 13 14",
          "15 16 17 18 19 20 21",
        ]
          .map((line, i) => `<text x="30" y="${74 + i * 16}">${line}</text>`)
          .join("")}
      </g>`,
      200,
    ),
};

/* ============================================================
 * UKRAINIAN GRAMMAR TEMPLATES
 * ==========================================================*/

const UkrT = {
  stressCard: (word, stressedSyllable) =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      <text x="160" y="70" text-anchor="middle" font-family="Inter, Arial" font-size="34" font-weight="900" fill="#fde68a">${escapeXml(word)}</text>
      <text x="160" y="100" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#cbd5e1">наголос на «${escapeXml(stressedSyllable)}»</text>`,
      300,
    ),

  partsOfSpeech: (part, examples) =>
    svg(
      "0 0 320 160",
      `
      <rect width="320" height="160" fill="#0f172a" rx="10"/>
      <rect x="20" y="20" width="280" height="40" rx="20" fill="${
        {
          іменник: "#fbbf24",
          прикметник: "#34d399",
          дієслово: "#dc2626",
          прислівник: "#a78bfa",
          займенник: "#0ea5e9",
          числівник: "#f97316",
        }[part] || "#fbbf24"
      }"/>
      <text x="160" y="46" text-anchor="middle" font-family="Inter, Arial" font-size="16" font-weight="900" fill="#0f172a">${part}</text>
      <text x="160" y="86" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#fde68a">${examples}</text>
      <text x="160" y="120" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#cbd5e1">${{
        іменник: "що? хто? — предмет",
        прикметник: "який? яка? яке? — ознака",
        дієслово: "що робить? — дія",
        прислівник: "як? коли? — спосіб дії",
        займенник: "я, ти, він, вона, воно, ми, ви, вони",
        числівник: "скільки? — кількість",
      }[part] || ""}</text>`,
      300,
    ),

  sentence: (subjectText, predicateText, allText) =>
    svg(
      "0 0 360 140",
      `
      <rect width="360" height="140" fill="#0f172a" rx="10"/>
      <text x="180" y="50" text-anchor="middle" font-family="Inter, Arial" font-size="16" fill="#fde68a">${escapeXml(allText)}</text>
      <line x1="40" y1="58" x2="320" y2="58" stroke="#fbbf24" stroke-width="0.5" opacity="0.3"/>
      <g font-family="Inter, Arial" font-size="12">
        <text x="60" y="92" fill="#34d399" font-weight="800">${escapeXml(subjectText)}</text>
        <text x="60" y="108" fill="#bbf7d0">— підмет (хто? що?)</text>
        <text x="220" y="92" fill="#fb923c" font-weight="800">${escapeXml(predicateText)}</text>
        <text x="220" y="108" fill="#fed7aa">— присудок (що робить?)</text>
      </g>`,
      330,
    ),

  soundCount: (word, vowels, consonants) =>
    svg(
      "0 0 320 160",
      `
      <rect width="320" height="160" fill="#0f172a" rx="10"/>
      <text x="160" y="60" text-anchor="middle" font-family="Inter, Arial" font-size="${word.length > 8 ? 26 : 32}" font-weight="900">${[...word]
        .map((ch) => {
          const isVowel = /[аеєиіїоуюяАЕЄИІЇОУЮЯ]/.test(ch);
          return `<tspan fill="${isVowel ? "#fbbf24" : "#34d399"}">${ch}</tspan>`;
        })
        .join("")}</text>
      <text x="160" y="100" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fbbf24" font-weight="800">${vowels} голосних</text>
      <text x="160" y="120" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#34d399" font-weight="800">${consonants} приголосних</text>
      <text x="160" y="146" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#cbd5e1">всього ${vowels + consonants} звуків</text>`,
      300,
    ),

  punctuation: (mark, descr) =>
    svg(
      "0 0 220 140",
      `
      <rect width="220" height="140" fill="#0f172a" rx="10"/>
      <text x="110" y="78" text-anchor="middle" font-family="Inter, Arial" font-size="60" font-weight="900" fill="#fbbf24">${mark}</text>
      <text x="110" y="116" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a">${descr}</text>`,
      200,
    ),

  spelling: (correct) =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      <text x="160" y="74" text-anchor="middle" font-family="Inter, Arial" font-size="26" font-weight="900" fill="#34d399">✓ ${escapeXml(correct)}</text>
      <text x="160" y="108" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#bbf7d0">правильне написання</text>`,
      300,
    ),

  alphabet: () =>
    svg(
      "0 0 360 140",
      `
      <rect width="360" height="140" fill="#0f172a" rx="10"/>
      <text x="180" y="50" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fbbf24" font-weight="700">Українська абетка</text>
      <text x="180" y="80" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="12" fill="#fde68a">А Б В Г Ґ Д Е Є Ж З И І Ї Й К Л</text>
      <text x="180" y="102" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="12" fill="#fde68a">М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ь Ю Я</text>
      <text x="180" y="128" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#cbd5e1">33 літери · 38 звуків</text>`,
      340,
    ),

  synAnt: (kind, pair) =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      <text x="160" y="40" text-anchor="middle" font-family="Inter, Arial" font-size="14" font-weight="800" fill="#fbbf24">${kind === "syn" ? "синоніми (схоже значення)" : "антоніми (протилежне)"}</text>
      <text x="80" y="92" text-anchor="middle" font-family="Inter, Arial" font-size="20" font-weight="900" fill="#34d399">${escapeXml(pair[0])}</text>
      <text x="160" y="92" text-anchor="middle" font-family="Inter, Arial" font-size="22" fill="#fbbf24">${kind === "syn" ? "≈" : "↔"}</text>
      <text x="240" y="92" text-anchor="middle" font-family="Inter, Arial" font-size="20" font-weight="900" fill="#a78bfa">${escapeXml(pair[1])}</text>`,
      300,
    ),

  tenses: (tense) =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      <g font-family="Inter, Arial" font-size="14" font-weight="800" text-anchor="middle">
        <rect x="20" y="40" width="80" height="50" rx="6" fill="${tense === "past" ? "#34d399" : "#1e293b"}" stroke="#334155"/>
        <text x="60" y="62" fill="${tense === "past" ? "#0f172a" : "#cbd5e1"}">минулий</text>
        <text x="60" y="80" font-size="11" fill="${tense === "past" ? "#0f172a" : "#94a3b8"}">що робив?</text>

        <rect x="120" y="40" width="80" height="50" rx="6" fill="${tense === "present" ? "#fbbf24" : "#1e293b"}" stroke="#334155"/>
        <text x="160" y="62" fill="${tense === "present" ? "#0f172a" : "#cbd5e1"}">теперішній</text>
        <text x="160" y="80" font-size="11" fill="${tense === "present" ? "#0f172a" : "#94a3b8"}">що робить?</text>

        <rect x="220" y="40" width="80" height="50" rx="6" fill="${tense === "future" ? "#a78bfa" : "#1e293b"}" stroke="#334155"/>
        <text x="260" y="62" fill="${tense === "future" ? "#0f172a" : "#cbd5e1"}">майбутній</text>
        <text x="260" y="80" font-size="11" fill="${tense === "future" ? "#0f172a" : "#94a3b8"}">що буде робити?</text>
      </g>`,
      300,
    ),
};

/* ============================================================
 * INFORMATIKA TEMPLATES
 * ==========================================================*/

const InfoT = {
  keyboard: () =>
    svg(
      "0 0 320 140",
      `
      <rect x="20" y="20" width="280" height="100" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      ${[...Array(4)]
        .map((_, r) =>
          [...Array(13)]
            .map(
              (_, c) =>
                `<rect x="${30 + c * 20}" y="${32 + r * 20}" width="16" height="16" rx="2" fill="#475569"/>`,
            )
            .join(""),
        )
        .join("")}
      <text x="160" y="134" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="800">клавіатура — введення тексту</text>`,
      300,
    ),

  monitor: () =>
    svg(
      "0 0 280 200",
      `
      <rect x="30" y="20" width="220" height="140" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="3"/>
      <rect x="42" y="32" width="196" height="116" fill="#0ea5e9"/>
      <circle cx="140" cy="80" r="22" fill="#fbbf24"/>
      <polygon points="80,140 110,100 140,140" fill="#16a34a"/>
      <polygon points="140,140 180,90 220,140" fill="#15803d"/>
      <rect x="110" y="160" width="60" height="12" fill="#475569"/>
      <rect x="80" y="172" width="120" height="6" fill="#475569"/>
      <text x="140" y="194" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">монітор</text>`,
      270,
    ),

  mouse: () =>
    svg(
      "0 0 220 200",
      `
      <ellipse cx="110" cy="110" rx="50" ry="70" fill="#475569" stroke="#fbbf24" stroke-width="2"/>
      <line x1="110" y1="60" x2="110" y2="110" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="100" y="80" width="20" height="12" rx="3" fill="#cbd5e1"/>
      <line x1="110" y1="40" x2="110" y2="20" stroke="#94a3b8" stroke-width="2"/>
      <text x="110" y="196" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">миша</text>`,
      200,
    ),

  cpu: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="60" y="60" width="120" height="80" fill="#1e293b" stroke="#fbbf24" stroke-width="3"/>
      <rect x="80" y="80" width="80" height="40" fill="#0ea5e9"/>
      <text x="120" y="104" text-anchor="middle" font-family="Inter, Arial" font-size="11" font-weight="900" fill="#fff">CPU</text>
      ${[...Array(8)]
        .map(
          (_, i) =>
            `<line x1="60" y1="${70 + i * 9}" x2="50" y2="${70 + i * 9}" stroke="#fbbf24" stroke-width="2"/><line x1="180" y1="${70 + i * 9}" x2="190" y2="${70 + i * 9}" stroke="#fbbf24" stroke-width="2"/>`,
        )
        .join("")}
      <text x="120" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">процесор — «мозок» ПК</text>`,
      220,
    ),

  printer: () =>
    svg(
      "0 0 240 200",
      `
      <rect x="40" y="80" width="160" height="80" rx="6" fill="#475569" stroke="#fbbf24" stroke-width="2"/>
      <rect x="60" y="50" width="120" height="40" fill="#fef3c7" stroke="#92400e" stroke-width="1.5"/>
      <line x1="60" y1="80" x2="180" y2="80" stroke="#fbbf24"/>
      <rect x="50" y="120" width="20" height="10" fill="#0f172a"/>
      <text x="120" y="148" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fbbf24" font-weight="700">🖨</text>
      <text x="120" y="190" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">принтер</text>`,
      220,
    ),

  webcam: () =>
    svg(
      "0 0 240 180",
      `
      <ellipse cx="120" cy="80" rx="60" ry="40" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="120" cy="80" r="25" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
      <circle cx="120" cy="80" r="12" fill="#0ea5e9"/>
      <rect x="115" y="120" width="10" height="30" fill="#475569"/>
      <ellipse cx="120" cy="150" rx="40" ry="6" fill="#475569"/>
      <text x="120" y="172" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">веб-камера</text>`,
      220,
    ),

  desktop: () =>
    svg(
      "0 0 320 200",
      `
      <rect width="320" height="200" fill="#0ea5e9" rx="10"/>
      <circle cx="60" cy="60" r="22" fill="#fbbf24"/>
      <g transform="translate(40 110)">
        <rect width="40" height="40" fill="#1e293b" rx="3"/>
        <text x="20" y="60" text-anchor="middle" font-size="9" fill="#fde68a">Мій ПК</text>
      </g>
      <g transform="translate(100 110)">
        <rect width="40" height="40" fill="#dc2626" rx="3"/>
        <text x="20" y="60" text-anchor="middle" font-size="9" fill="#fde68a">Кошик</text>
      </g>
      <rect x="0" y="180" width="320" height="20" fill="#1e293b"/>
      <text x="160" y="194" text-anchor="middle" font-size="10" fill="#fde68a">⊞ Старт</text>`,
      310,
    ),

  fileIcon: (ext, color) =>
    svg(
      "0 0 220 200",
      `
      <path d="M50 30 L150 30 L180 60 L180 170 L50 170 Z" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      <path d="M150 30 L150 60 L180 60 Z" fill="#fde68a" stroke="#92400e" stroke-width="2"/>
      <rect x="65" y="100" width="100" height="40" rx="6" fill="${color || "#0ea5e9"}"/>
      <text x="115" y="126" text-anchor="middle" font-family="Inter, Arial" font-size="16" font-weight="900" fill="#fff">.${ext}</text>
      <text x="115" y="188" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="800">файл .${ext}</text>`,
      200,
    ),

  shortcut: (combo, descr) =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      ${combo
        .split("+")
        .map((k, i, arr) => {
          const w = (300 - (arr.length - 1) * 30) / arr.length;
          const x = 10 + i * (w + 30);
          return `<rect x="${x}" y="30" width="${w}" height="50" rx="6" fill="#475569" stroke="#fbbf24" stroke-width="2"/><text x="${x + w / 2}" y="62" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="16" font-weight="900" fill="#fde68a">${k.trim()}</text>${i < arr.length - 1 ? `<text x="${x + w + 8}" y="62" font-family="Inter, Arial" font-size="20" fill="#fbbf24">+</text>` : ""}`;
        })
        .join("")}
      <text x="160" y="118" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#bbf7d0" font-weight="700">${descr}</text>`,
      300,
    ),

  flowchart: () =>
    svg(
      "0 0 240 280",
      `
      <rect width="240" height="280" fill="#0f172a" rx="10"/>
      <ellipse cx="120" cy="30" rx="50" ry="18" fill="#34d399"/>
      <text x="120" y="35" text-anchor="middle" font-family="Inter, Arial" font-size="12" font-weight="800" fill="#0f172a">старт</text>
      <line x1="120" y1="48" x2="120" y2="68" stroke="#fbbf24" stroke-width="2" marker-end="url(#fc_a)"/>
      <rect x="70" y="70" width="100" height="40" fill="#fbbf24"/>
      <text x="120" y="94" text-anchor="middle" font-family="Inter, Arial" font-size="12" font-weight="800" fill="#0f172a">дія</text>
      <line x1="120" y1="110" x2="120" y2="130" stroke="#fbbf24" stroke-width="2" marker-end="url(#fc_a)"/>
      <polygon points="120,130 170,160 120,190 70,160" fill="#a78bfa"/>
      <text x="120" y="164" text-anchor="middle" font-family="Inter, Arial" font-size="11" font-weight="800" fill="#0f172a">?</text>
      <line x1="120" y1="190" x2="120" y2="210" stroke="#fbbf24" stroke-width="2" marker-end="url(#fc_a)"/>
      <ellipse cx="120" cy="226" rx="50" ry="18" fill="#dc2626"/>
      <text x="120" y="231" text-anchor="middle" font-family="Inter, Arial" font-size="12" font-weight="800" fill="#fff">кінець</text>
      <defs>
        <marker id="fc_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#fbbf24"/>
        </marker>
      </defs>
      <text x="120" y="266" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a" font-weight="700">блок-схема алгоритму</text>`,
      230,
    ),

  paint: () =>
    svg(
      "0 0 280 180",
      `
      <rect width="280" height="180" fill="#1e293b" rx="10"/>
      <rect x="20" y="40" width="240" height="100" fill="#fff"/>
      <circle cx="140" cy="90" r="32" fill="#fbbf24"/>
      <polygon points="60,130 100,80 140,130" fill="#16a34a"/>
      <rect x="30" y="20" width="240" height="18" fill="#475569"/>
      <g transform="translate(40 28)" fill="#fde68a" font-family="Inter, Arial" font-size="10">
        <text>Файл</text><text x="40">Правка</text><text x="100">Інстр</text>
      </g>
      <text x="140" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">Paint — графічний редактор</text>`,
      270,
    ),

  word: () =>
    svg(
      "0 0 280 180",
      `
      <rect width="280" height="180" fill="#fff" rx="10" stroke="#1d4ed8" stroke-width="4"/>
      ${[40, 56, 72, 88, 104, 120, 136]
        .map(
          (y, i) =>
            `<line x1="30" y1="${y}" x2="${i === 6 ? 180 : 250}" y2="${y}" stroke="#0f172a" stroke-width="1.5"/>`,
        )
        .join("")}
      <rect x="30" y="20" width="220" height="10" fill="#1d4ed8"/>
      <text x="40" y="28" font-family="Inter, Arial" font-size="9" fill="#fff">Документ.docx</text>
      <text x="140" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#1d4ed8" font-weight="900">W — Microsoft Word</text>`,
      270,
    ),

  excel: () =>
    svg(
      "0 0 280 180",
      `
      <rect width="280" height="180" fill="#fff" rx="10" stroke="#16a34a" stroke-width="4"/>
      <rect x="20" y="20" width="240" height="20" fill="#16a34a"/>
      ${[...Array(5)]
        .map((_, r) =>
          [...Array(6)]
            .map(
              (_, c) =>
                `<rect x="${20 + c * 40}" y="${40 + r * 22}" width="40" height="22" fill="${(r + c) % 2 ? "#dcfce7" : "#fff"}" stroke="#16a34a" stroke-width="0.5"/>`,
            )
            .join(""),
        )
        .join("")}
      <text x="140" y="170" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#16a34a" font-weight="900">X — Excel · таблиці</text>`,
      270,
    ),

  scratch: () =>
    svg(
      "0 0 240 180",
      `
      <rect width="240" height="180" fill="#fb923c" rx="10"/>
      <text x="120" y="42" text-anchor="middle" font-family="Inter, Arial" font-size="16" font-weight="900" fill="#fff">Scratch</text>
      <g font-family="Inter, Arial" font-size="11">
        <rect x="40" y="60" width="160" height="22" rx="4" fill="#facc15"/>
        <text x="60" y="76" fill="#0f172a">коли натиснуто ⚑</text>
        <rect x="40" y="86" width="160" height="22" rx="4" fill="#0ea5e9"/>
        <text x="60" y="102" fill="#fff">рухайся 10 кроків</text>
        <rect x="40" y="112" width="160" height="22" rx="4" fill="#dc2626"/>
        <text x="60" y="128" fill="#fff">⬛ зупинити все</text>
      </g>
      <text x="120" y="160" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fff" font-weight="700">блочне програмування</text>`,
      230,
    ),

  internet: () =>
    svg(
      "0 0 320 200",
      `
      <circle cx="160" cy="100" r="70" fill="#1d4ed8"/>
      ${[0, 60, 120, 180, 240, 300]
        .map((d) => {
          const r = (Math.PI * d) / 180;
          return `<line x1="160" y1="100" x2="${160 + 70 * Math.cos(r)}" y2="${100 + 70 * Math.sin(r)}" stroke="#bae6fd" stroke-width="1.5"/>`;
        })
        .join("")}
      <circle cx="160" cy="100" r="70" fill="none" stroke="#bae6fd" stroke-width="2"/>
      <ellipse cx="160" cy="100" rx="70" ry="28" fill="none" stroke="#bae6fd" stroke-width="2"/>
      <text x="160" y="106" text-anchor="middle" font-family="Inter, Arial" font-size="22" font-weight="900" fill="#fff">🌐</text>
      <text x="160" y="186" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">інтернет — мережа мереж</text>`,
      300,
    ),

  email: () =>
    svg(
      "0 0 320 180",
      `
      <rect x="40" y="40" width="240" height="100" rx="6" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
      <polygon points="40,40 280,40 160,110" fill="#fde68a" stroke="#92400e" stroke-width="2"/>
      <text x="160" y="86" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="20" font-weight="900" fill="#92400e">name@site.ua</text>
      <text x="160" y="166" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">електронна адреса = ім'я + <tspan fill="#dc2626">@</tspan> + домен</text>`,
      300,
    ),

  ram: () =>
    svg(
      "0 0 320 140",
      `
      <rect x="20" y="40" width="280" height="60" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <rect x="20" y="40" width="280" height="14" fill="#0f172a"/>
      ${[...Array(16)]
        .map(
          (_, i) =>
            `<rect x="${30 + i * 17}" y="58" width="14" height="20" fill="#0ea5e9"/>`,
        )
        .join("")}
      <text x="160" y="130" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">оперативна пам'ять (RAM)</text>`,
      300,
    ),

  storage: () =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      <text x="160" y="50" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="14" fill="#fbbf24" font-weight="800">1 КБ = 1024 Б</text>
      <text x="160" y="74" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="14" fill="#fbbf24" font-weight="800">1 МБ = 1024 КБ</text>
      <text x="160" y="98" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="14" fill="#fbbf24" font-weight="800">1 ГБ = 1024 МБ</text>
      <text x="160" y="122" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="14" fill="#34d399" font-weight="800">1 ТБ = 1024 ГБ</text>`,
      300,
    ),

  url: () =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      <rect x="20" y="40" width="280" height="40" rx="20" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <text x="40" y="66" font-family="ui-monospace, Menlo" font-size="15" font-weight="800">
        <tspan fill="#34d399">https://</tspan><tspan fill="#fbbf24">site</tspan><tspan fill="#cbd5e1">.</tspan><tspan fill="#a78bfa">com</tspan>
      </text>
      <text x="160" y="114" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">URL — адреса сайту</text>`,
      300,
    ),

  spam: () =>
    svg(
      "0 0 240 180",
      `
      <rect width="240" height="180" fill="#0f172a" rx="10"/>
      ${[30, 60, 90].map((y) => `<rect x="40" y="${y}" width="160" height="20" rx="3" fill="#7c2d12"/><text x="50" y="${y + 14}" font-family="Inter, Arial" font-size="11" fill="#fda4af">🗑 SPAM!!! 💰💰💰</text>`).join("")}
      <text x="120" y="160" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">спам — небажані повідомлення</text>`,
      220,
    ),

  ai: () =>
    svg(
      "0 0 240 180",
      `
      <rect x="40" y="40" width="160" height="90" rx="14" fill="#1e293b" stroke="#a78bfa" stroke-width="3"/>
      <text x="120" y="90" text-anchor="middle" font-family="Inter, Arial" font-size="40" font-weight="900" fill="#a78bfa">AI</text>
      <text x="120" y="116" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#e9d5ff">штучний інтелект</text>
      <g stroke="#a78bfa" stroke-width="2" fill="none">
        <line x1="40" y1="60" x2="20" y2="60"/>
        <line x1="40" y1="90" x2="20" y2="90"/>
        <line x1="200" y1="60" x2="220" y2="60"/>
        <line x1="200" y1="90" x2="220" y2="90"/>
      </g>
      <text x="120" y="166" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#fde68a">програма, що навчається</text>`,
      220,
    ),

  emojiCard: (emoji, label) =>
    svg(
      "0 0 220 180",
      `
      <rect width="220" height="180" fill="#0f172a" rx="10"/>
      <text x="110" y="100" text-anchor="middle" font-size="62">${emoji}</text>
      <text x="110" y="156" text-anchor="middle" font-family="Inter, Arial" font-size="13" fill="#fde68a" font-weight="800">${label}</text>`,
      200,
    ),

  binary: () =>
    svg(
      "0 0 320 140",
      `
      <rect width="320" height="140" fill="#0f172a" rx="10"/>
      <text x="160" y="60" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="34" font-weight="900" fill="#34d399">0 1 0 1 1 0 1 0</text>
      <text x="160" y="100" text-anchor="middle" font-family="Inter, Arial" font-size="12" fill="#fde68a" font-weight="800">двійкова система — мова комп'ютерів</text>
      <text x="160" y="122" text-anchor="middle" font-family="Inter, Arial" font-size="11" fill="#cbd5e1">8 бітів = 1 байт</text>`,
      300,
    ),
};

/* ============================================================
 * SHARED HELPER: extract Ukrainian-phrase between quotes
 * e.g. "Як англійською 'один'?" → "один"
 * ==========================================================*/
function extractQuoted(text) {
  const m = text.match(/['‘‛«]([^'’«»]+)[’'»]/);
  return m ? m[1] : "";
}

/* ============================================================
 * SUBJECT 1: ENGLISH
 * Almost every question is "Як англійською 'X'?" → Y.
 * Use a flashcard with the English answer + Ukrainian + emoji.
 * ==========================================================*/

function makeAnhliyskaMedia(q) {
  const text = q.text;
  const correct = q.answers[q.correct];
  const ukr = extractQuoted(text);

  // Vocab translation pattern
  if (/Як англійською|англ\.|по-англійськ/i.test(text) && ukr) {
    return LangT.wordCard(correct, ukr, emojiFor(ukr), "🇬🇧 EN");
  }
  if (/перекласти|перекладається|означає/i.test(text)) {
    const fW = extractQuoted(text) || correct;
    return LangT.phraseCard(fW, correct, "🇬🇧 EN");
  }
  if (/множин|однин/i.test(text)) {
    return LangT.phraseCard(correct, ukr || "форма множини / однини", "🇬🇧 EN");
  }
  return LangT.phraseCard(correct, ukr || "переклад", "🇬🇧 EN");
}

/* ============================================================
 * SUBJECT 2: SPANISH
 * ==========================================================*/

function makeIspanskaMedia(q) {
  const text = q.text;
  const correct = q.answers[q.correct];
  const ukr = extractQuoted(text);

  if (/Як іспанською|ісп\.|по-іспанськ/i.test(text) && ukr) {
    return LangT.wordCard(correct, ukr, emojiFor(ukr), "🇪🇸 ES");
  }
  if (/перекласти|перекладається|означає/i.test(text)) {
    const fW = extractQuoted(text) || correct;
    return LangT.phraseCard(fW, correct, "🇪🇸 ES");
  }
  return LangT.phraseCard(correct, ukr || "переклад", "🇪🇸 ES");
}

/* ============================================================
 * SUBJECT 3: MATH — rule list
 * ==========================================================*/

const mathRules = [
  // direct arithmetic
  {
    match: (q) => /Скільки буде\s+(\d+)\s*[×*]\s*(\d+)/i.test(q.text),
    media: (q) => {
      const [, a, b] = q.text.match(/Скільки буде\s+(\d+)\s*[×*]\s*(\d+)/i);
      return MathT.multiplyGrid(parseInt(a, 10), parseInt(b, 10));
    },
  },
  {
    match: (q) => /(\d+)\s*[:÷/]\s*(\d+)/.test(q.text) && /діленн|поділ/i.test(q.text + q.answers[q.correct]),
    media: (q) => {
      const m = q.text.match(/(\d+)\s*[:÷/]\s*(\d+)/);
      return MathT.calc(m[1], ":", m[2], q.answers[q.correct]);
    },
  },
  {
    match: (q) => /Скільки буде\s+(\d+)\s*[-−]\s*(\d+)/i.test(q.text),
    media: (q) => {
      const [, a, b] = q.text.match(/Скільки буде\s+(\d+)\s*[-−]\s*(\d+)/i);
      return MathT.calc(a, "−", b, q.answers[q.correct]);
    },
  },
  {
    match: (q) => /Скільки буде\s+(\d+)\s*\+\s*(\d+)/i.test(q.text),
    media: (q) => {
      const [, a, b] = q.text.match(/Скільки буде\s+(\d+)\s*\+\s*(\d+)/i);
      return MathT.calc(a, "+", b, q.answers[q.correct]);
    },
  },
  {
    // mixed operations
    match: (q) => /Скільки буде\s+[\d\s+\-−×÷:/()]+\?/i.test(q.text),
    media: (q) => {
      const expr = q.text.replace(/^.*Скільки буде\s+/i, "").replace(/[?.]$/, "");
      return infoCard(`🧮 <b>${escapeXml(expr)} = ${escapeXml(q.answers[q.correct])}</b><br><span style="font-size:.85em;color:#cbd5e1">за правилами порядку дій</span>`);
    },
  },

  // fractions
  {
    match: (q) => /Який дріб більший:\s*(\d+)\/(\d+)\s*чи\s*(\d+)\/(\d+)/i.test(q.text),
    media: (q) => {
      const m = q.text.match(/(\d+)\/(\d+)\s*чи\s*(\d+)\/(\d+)/i);
      const a1 = +m[1], a2 = +m[2], b1 = +m[3], b2 = +m[4];
      const ans = q.answers[q.correct].replace(/\s/g, "");
      const larger = ans === `${a1}/${a2}` ? "a" : "b";
      return MathT.fractionsCompare(a1, a2, b1, b2, larger);
    },
  },
  {
    match: (q) => /(\d+)\/(\d+)\s+від\s+(\d+)/i.test(q.text),
    media: (q) => {
      const m = q.text.match(/(\d+)\/(\d+)\s+від\s+(\d+)/i);
      return MathT.fractionPie(+m[1], +m[2], `від ${m[3]} = ${q.answers[q.correct]}`);
    },
  },
  {
    match: (q) => /дріб|чверть|пол(?:овин|у)|третин/i.test(q.text),
    media: (q) => MathT.fractionPie(1, 4, ""),
  },

  // perimeter / area
  {
    match: (q) => /Периметр квадрата\s+зі\s+стороною\s+(\d+)/i.test(q.text),
    media: (q) => {
      const m = q.text.match(/стороною\s+(\d+)/i);
      const side = +m[1];
      return MathT.square(side, side * 4);
    },
  },
  {
    match: (q) => /прямокутник/i.test(q.text + q.answers[q.correct]),
    media: () => MathT.rectangle(),
  },
  {
    match: (q) => /прямих кутів/i.test(q.text),
    media: () => MathT.rectangle(),
  },
  {
    match: (q) => /сум.+кут.+трикутник|кут.+трикутник|трикут.+180/i.test(q.text + q.answers[q.correct]),
    media: () => MathT.triangleWithAngle(),
  },

  // time / clock
  {
    match: (q) => /хвилин у 1 годині|хвилин у годин/i.test(q.text),
    media: () => MathT.clock(10, 10),
  },
  {
    match: (q) => /секунд у\s+(?:1\s+)?хвилин/i.test(q.text),
    media: () => infoCard("⏱ 1 хвилина = <b>60 секунд</b>"),
  },
  {
    match: (q) => /годин у доб|у добі/i.test(q.text),
    media: () => infoCard("🌗 1 доба = <b>24 години</b>"),
  },
  {
    match: (q) => /днів у\s+(?:звичайн|висок)/i.test(q.text),
    media: () => infoCard("📆 Звичайний рік — <b>365 днів</b>, високосний — 366."),
  },

  // unit conversion (works regardless of word order in the question)
  { match: (q) => /кілометр|\bкм\b/i.test(q.text), media: () => MathT.unitConvert("км", "м", 1000) },
  { match: (q) => /центнер/i.test(q.text), media: () => MathT.unitConvert("ц", "кг", 100) },
  { match: (q) => /\bтонн/i.test(q.text), media: () => MathT.unitConvert("т", "кг", 1000) },
  { match: (q) => /кілограм.+грам|грам.+кілограм|\bкг\b|кілограм/i.test(q.text), media: () => MathT.unitConvert("кг", "г", 1000) },
  { match: (q) => /літр.+мілілітр|мілілітр.+літр|\bмл\b/i.test(q.text), media: () => MathT.unitConvert("л", "мл", 1000) },
  { match: (q) => /дециметр|\bдм\b/i.test(q.text), media: () => MathT.unitConvert("дм", "см", 10) },
  { match: (q) => /сантиметр.+метр|метр.+сантиметр|^Скільки см у|сантиметрів у/i.test(q.text), media: () => MathT.unitConvert("м", "см", 100) },
  { match: (q) => /міліметр|\bмм\b/i.test(q.text), media: () => MathT.unitConvert("см", "мм", 10) },

  // days of the week & calendar
  { match: (q) => /день тижн|днів у тижн/i.test(q.text), media: () => infoCard("📅 У тижні <b>7 днів</b>:<br>Пн · Вт · Ср · Чт · Пт · Сб · Нд") },
  { match: (q) => /місяців у роц|місяців у рік/i.test(q.text), media: () => infoCard("📅 У році <b>12 місяців</b>") },
  { match: (q) => /сторін.+квадрат/i.test(q.text), media: () => MathT.square(1, 4) },
  { match: (q) => /сторін.+трикут/i.test(q.text), media: () => MathT.triangleWithAngle() },

  // ordering numbers
  {
    match: (q) => /Найбільше з чисел|^Найбільш/i.test(q.text),
    media: (q) => infoCard(`🔢 <b>Найбільше:</b> ${escapeXml(q.answers[q.correct])}`),
  },
  {
    match: (q) => /Найменше з чисел|^Найменш/i.test(q.text),
    media: (q) => infoCard(`🔢 <b>Найменше:</b> ${escapeXml(q.answers[q.correct])}`),
  },
  {
    match: (q) => /^У ряду|^У послідовності/i.test(q.text),
    media: (q) => MathT.orderingCard([..."?+1".split("")].slice(0, 1).map(() => q.answers[q.correct])),
  },

  // months
  {
    match: (q) => /місяц.+перед|місяц.+після|місяц.+іде/i.test(q.text),
    media: (q) => MathT.monthCard(q.answers[q.correct]),
  },
  {
    match: (q) => /Який місяць (?:іде\s+)?(?:перед|після)/i.test(q.text),
    media: (q) => MathT.monthCard(q.answers[q.correct]),
  },

  // word problems with numeric remainder
  {
    match: (q) =>
      /у книзі.+\d+\s+сторінок.+прочитал.+\d+/i.test(q.text) ||
      /сторінок.+залишилось/i.test(q.text),
    media: (q) => {
      const nums = q.text.match(/\d+/g) || [];
      if (nums.length >= 2) {
        return MathT.rectAreaBar(+nums[0], +nums[1], `всього ${nums[0]} · прочитано ${nums[1]} · залишилось ${q.answers[q.correct]}`);
      }
      return infoCard(`📘 Відповідь: <b>${escapeXml(q.answers[q.correct])}</b>`);
    },
  },

  // generic
];

function richCard(emoji, question, answer) {
  // Shortens the question to fit a card and highlights the answer.
  const q = question.replace(/[?]+$/, "").trim();
  return infoCard(
    `${emoji} <span style="color:#cbd5e1">${escapeXml(q)}</span><br><b style="color:#34d399;font-size:1.1em">${escapeXml(answer)}</b>`,
  );
}

function makeMatematykaMedia(q) {
  const corpus = [q.text, q.answers[q.correct] || "", ...q.answers].join(" | ");
  const proxy = { ...q, text: corpus };
  for (const r of mathRules) {
    if (r.match(proxy)) return r.media(q);
  }
  return richCard("🧮", q.text, q.answers[q.correct]);
}

/* ============================================================
 * SUBJECT 4: UKRAINIAN LANGUAGE
 * ==========================================================*/

function detectStressedSyllable(word) {
  // e.g. "кни́га" contains combining acute (U+0301) after stressed vowel.
  const m = word.match(/(\w[\u0300-\u036f]?)/g);
  const idx = word.indexOf("\u0301");
  if (idx > 0) {
    // The stressed vowel is at idx-1
    const ch = word[idx - 1];
    return ch + "́";
  }
  return word[0] + "́";
}

const ukrRules = [
  // Stress questions
  {
    match: (q) => /наголос (падає|на)/i.test(q.text),
    media: (q) => {
      const w = q.answers[q.correct];
      return UkrT.stressCard(w, detectStressedSyllable(w));
    },
  },

  // Parts of speech
  {
    match: (q) => /іменник/i.test(q.text + q.answers[q.correct]),
    media: (q) => UkrT.partsOfSpeech("іменник", q.answers[q.correct]),
  },
  {
    match: (q) => /прикметник/i.test(q.text + q.answers[q.correct]),
    media: (q) => UkrT.partsOfSpeech("прикметник", q.answers[q.correct]),
  },
  {
    match: (q) => /дієслово/i.test(q.text + q.answers[q.correct]) && !/час/i.test(q.text),
    media: (q) => UkrT.partsOfSpeech("дієслово", q.answers[q.correct]),
  },
  {
    match: (q) => /прислівник/i.test(q.text + q.answers[q.correct]),
    media: (q) => UkrT.partsOfSpeech("прислівник", q.answers[q.correct]),
  },
  {
    match: (q) => /займенник/i.test(q.text + q.answers[q.correct]),
    media: (q) => UkrT.partsOfSpeech("займенник", q.answers[q.correct]),
  },
  {
    match: (q) => /числівник/i.test(q.text + q.answers[q.correct]),
    media: (q) => UkrT.partsOfSpeech("числівник", q.answers[q.correct]),
  },

  // Tenses
  {
    match: (q) => /час|якого часу/i.test(q.text) && /дієслов/i.test(q.text + q.answers[q.correct]),
    media: (q) => {
      const ans = q.answers[q.correct].toLowerCase();
      if (/мину/i.test(ans)) return UkrT.tenses("past");
      if (/теперіш/i.test(ans)) return UkrT.tenses("present");
      if (/майбут/i.test(ans)) return UkrT.tenses("future");
      return UkrT.tenses("present");
    },
  },

  // Spelling
  {
    match: (q) => /написан.+правильн|пишеться правильн/i.test(q.text),
    media: (q) => UkrT.spelling(q.answers[q.correct]),
  },

  // Sound counts
  {
    match: (q) => /Скільки.+голосн.+у слові|голосних звуків/i.test(q.text),
    media: (q) => {
      const w = (q.text.match(/«([^»]+)»/) || [])[1] || "";
      const vowels = ([...w].filter((c) => /[аеєиіїоуюя]/i.test(c)) || []).length;
      const cons = ([...w].filter((c) => /[бвгґджзйклмнпрстфхцчшщь']/i.test(c)) || []).length;
      return UkrT.soundCount(w, vowels, cons);
    },
  },
  {
    match: (q) => /приголосн.+у слові|приголосних звуків/i.test(q.text),
    media: (q) => {
      const w = (q.text.match(/«([^»]+)»/) || [])[1] || "";
      const vowels = ([...w].filter((c) => /[аеєиіїоуюя]/i.test(c)) || []).length;
      const cons = ([...w].filter((c) => /[бвгґджзйклмнпрстфхцчшщь']/i.test(c)) || []).length;
      return UkrT.soundCount(w, vowels, cons);
    },
  },

  // Punctuation
  {
    match: (q) => /знак.+питальн|питальн.+речен/i.test(q.text),
    media: () => UkrT.punctuation("?", "знак питання — у кінці питального речення"),
  },
  {
    match: (q) => /знак.+оклич|оклич.+речен/i.test(q.text),
    media: () => UkrT.punctuation("!", "знак оклику — сильна емоція"),
  },
  {
    match: (q) => /кр.+пк|крапк/i.test(q.text) && /кінц/i.test(q.text),
    media: () => UkrT.punctuation(".", "крапка — у кінці розповідного речення"),
  },

  // Synonyms / antonyms
  {
    match: (q) => /синонім|схож.+значен/i.test(q.text + q.answers[q.correct]),
    media: (q) => {
      const target = (q.text.match(/«([^»]+)»/) || [])[1] || "";
      return UkrT.synAnt("syn", [target, q.answers[q.correct]]);
    },
  },
  {
    match: (q) => /антонім|протилежн.+значен/i.test(q.text + q.answers[q.correct]),
    media: (q) => {
      const target = (q.text.match(/«([^»]+)»/) || [])[1] || "";
      return UkrT.synAnt("ant", [target, q.answers[q.correct]]);
    },
  },

  // Sentence parsing
  {
    match: (q) => /підмет/i.test(q.text),
    media: (q) => {
      const sentence = (q.text.match(/«([^»]+)»/) || [])[1] || "";
      return UkrT.sentence(q.answers[q.correct], "присудок", sentence);
    },
  },
  {
    match: (q) => /присудок/i.test(q.text),
    media: (q) => {
      const sentence = (q.text.match(/«([^»]+)»/) || [])[1] || "";
      return UkrT.sentence("підмет", q.answers[q.correct], sentence);
    },
  },

  // Capitalization
  {
    match: (q) => /велик.+літер.+правильн|з великої літери/i.test(q.text),
    media: (q) => UkrT.spelling(q.answers[q.correct]),
  },

  // Particle "не"
  {
    match: (q) => /частк.+не\s+з\s+дієслов/i.test(q.text),
    media: (q) => infoCard(`📝 Частка «не» з дієсловом пишеться <b>окремо</b>:<br><span style="font-size:1.1em;color:#34d399">${escapeXml(q.answers[q.correct])}</span>`),
  },

  // Text
  {
    match: (q) => /^Текст склад|речен.+пов'язан|пов'язан.+змістом/i.test(q.text),
    media: () => infoCard("📖 <b>Текст</b> — кілька речень, поєднаних спільною темою і змістом."),
  },

  // Alphabet
  {
    match: (q) => /літер|абетк|алфавіт|українськ.+азбук/i.test(q.text),
    media: () => UkrT.alphabet(),
  },
];

function makeUkrMovaMedia(q) {
  const corpus = [q.text, q.answers[q.correct] || "", ...q.answers].join(" | ");
  const proxy = { ...q, text: corpus };
  for (const r of ukrRules) {
    if (r.match(proxy)) return r.media(q);
  }
  return richCard("📝", q.text, q.answers[q.correct]);
}

/* ============================================================
 * SUBJECT 5: INFORMATIKA
 * ==========================================================*/

const infoRules = [
  // Devices
  { match: (q) => /клавіатур/i.test(q.text + q.answers[q.correct]), media: () => InfoT.keyboard() },
  { match: (q) => /моніто|зображен.+комп/i.test(q.text + q.answers[q.correct]), media: () => InfoT.monitor() },
  { match: (q) => /^мишк|курсор|^миша/i.test(q.text + q.answers[q.correct]), media: () => InfoT.mouse() },
  { match: (q) => /процесор|мозок.+комп/i.test(q.text + q.answers[q.correct]), media: () => InfoT.cpu() },
  { match: (q) => /принтер|друку документ/i.test(q.text + q.answers[q.correct]), media: () => InfoT.printer() },
  { match: (q) => /веб-камер|відеозв'язк/i.test(q.text + q.answers[q.correct]), media: () => InfoT.webcam() },

  // OS / desktop
  { match: (q) => /робочий стіл|після завантаженн/i.test(q.text), media: () => InfoT.desktop() },

  // Software
  { match: (q) => /Microsoft Word|\.docx|\.doc[^a-z]/i.test(q.text + q.answers[q.correct]), media: () => InfoT.word() },
  { match: (q) => /Excel|\.xlsx?|таблиц.+електрон/i.test(q.text + q.answers[q.correct]), media: () => InfoT.excel() },
  { match: (q) => /Paint|графічн.+редактор/i.test(q.text + q.answers[q.correct]), media: () => InfoT.paint() },
  { match: (q) => /Scratch|блочн.+програм|зупинити все/i.test(q.text + q.answers[q.correct]), media: () => InfoT.scratch() },

  // File extensions
  { match: (q) => /\.jpe?g/i.test(q.text + q.answers[q.correct]), media: () => InfoT.fileIcon("jpg", "#dc2626") },
  { match: (q) => /\.mp3/i.test(q.text + q.answers[q.correct]), media: () => InfoT.fileIcon("mp3", "#7c3aed") },
  { match: (q) => /\.mp4|\.avi|відео.+файл/i.test(q.text + q.answers[q.correct]), media: () => InfoT.fileIcon("mp4", "#0ea5e9") },
  { match: (q) => /\.txt|текстов.+файл/i.test(q.text + q.answers[q.correct]) && !/Word/i.test(q.text), media: () => InfoT.fileIcon("txt", "#475569") },
  { match: (q) => /\.zip|архів/i.test(q.text + q.answers[q.correct]), media: () => InfoT.fileIcon("zip", "#facc15") },
  { match: (q) => /\.pdf/i.test(q.text + q.answers[q.correct]), media: () => InfoT.fileIcon("pdf", "#dc2626") },

  // Shortcuts
  { match: (q) => /Ctrl\s*\+\s*Z/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + Z", "скасувати останню дію") },
  { match: (q) => /Ctrl\s*\+\s*C/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + C", "копіювати") },
  { match: (q) => /Ctrl\s*\+\s*V/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + V", "вставити") },
  { match: (q) => /Ctrl\s*\+\s*X/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + X", "вирізати") },
  { match: (q) => /Ctrl\s*\+\s*F/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + F", "знайти / пошук") },
  { match: (q) => /Ctrl\s*\+\s*S/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + S", "зберегти") },
  { match: (q) => /Ctrl\s*\+\s*A/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + A", "виділити все") },
  { match: (q) => /Ctrl\s*\+\s*P/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + P", "друкувати") },
  { match: (q) => /PrintScreen|PrtSc|знімок екран|скриншот/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("PrtSc", "знімок екрана") },
  { match: (q) => /^Ctrl\b|клавіш.+Ctrl|гарячих комбінацій/i.test(q.text), media: () => InfoT.shortcut("Ctrl", "модифікатор гарячих клавіш") },
  { match: (q) => /Enter|клавіша підтверджен/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Enter", "підтвердити дію / перехід рядка") },
  { match: (q) => /Esc|вийт.+з програм|скасуван.+вибор/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Esc", "вихід / скасування") },
  { match: (q) => /Backspace|видали.+ліворуч/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Backspace", "видалити символ ліворуч") },
  { match: (q) => /Delete|del.+видали/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Delete", "видалити") },
  { match: (q) => /Space|пробіл|клавіша пробіл/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Space", "пробіл — найдовша клавіша") },
  { match: (q) => /Shift|пишемо великими/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Shift", "великі літери + символи") },
  { match: (q) => /Caps\s*Lock/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Caps Lock", "фіксує верхній регістр") },
  { match: (q) => /Tab/i.test(q.text + q.answers[q.correct]) && /клав|перех/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Tab", "табуляція / перемикач полів") },

  // Algorithm
  { match: (q) => /блок-схем|алгорит.+овал|початок.+кінець.+алгорит/i.test(q.text + q.answers[q.correct]), media: () => InfoT.flowchart() },
  { match: (q) => /^Що таке алгоритм|алгоритм — це/i.test(q.text), media: () => InfoT.flowchart() },

  // Internet
  { match: (q) => /^Що таке URL|URL/i.test(q.text), media: () => InfoT.url() },
  { match: (q) => /^Що таке інтернет|^Інтернет/i.test(q.text), media: () => InfoT.internet() },
  { match: (q) => /браузер/i.test(q.text + q.answers[q.correct]), media: () => InfoT.internet() },
  { match: (q) => /сайт|веб-сайт/i.test(q.text + q.answers[q.correct]), media: () => InfoT.url() },
  { match: (q) => /електронн.+адрес|пошт|@.+домен/i.test(q.text + q.answers[q.correct]), media: () => InfoT.email() },
  { match: (q) => /спам/i.test(q.text + q.answers[q.correct]), media: () => InfoT.spam() },

  // Memory / storage
  { match: (q) => /оперативн.+пам|RAM|очищується після вимкнен/i.test(q.text + q.answers[q.correct]), media: () => InfoT.ram() },
  { match: (q) => /1\s*ТБ|1\s*ГБ|байт.+КБ|кілобай|гігабай|терабай/i.test(q.text + q.answers[q.correct]), media: () => InfoT.storage() },
  { match: (q) => /двійков|2\s*цифр.+0.+1|0.+1.+комп/i.test(q.text + q.answers[q.correct]), media: () => InfoT.binary() },
  { match: (q) => /^Що таке біт|^біт/i.test(q.text), media: () => InfoT.binary() },
  { match: (q) => /^Що таке байт|байт = 8/i.test(q.text), media: () => InfoT.binary() },

  // AI
  { match: (q) => /штучн.+інтелек|^AI\b|^ШІ\b/i.test(q.text + q.answers[q.correct]), media: () => InfoT.ai() },

  // File / extension / clipboard
  { match: (q) => /крапк.+\(\.\)|відокрем.+ім'я.+файл.+розширен/i.test(q.text), media: () => InfoT.fileIcon("doc", "#1d4ed8") },
  { match: (q) => /буфер обмін|clipboard/i.test(q.text + q.answers[q.correct]), media: () => InfoT.shortcut("Ctrl + C", "копіювати → у буфер обміну") },

  // Common emoji icons
  { match: (q) => /значок\s+🖨|друк/i.test(q.text), media: () => InfoT.emojiCard("🖨", "друк") },
  { match: (q) => /значок\s+💾|зберег/i.test(q.text), media: () => InfoT.emojiCard("💾", "зберегти") },
  { match: (q) => /значок\s+🗑|кошик/i.test(q.text + q.answers[q.correct]), media: () => InfoT.emojiCard("🗑", "кошик") },
  { match: (q) => /значок\s+🔍|пошук/i.test(q.text), media: () => InfoT.emojiCard("🔍", "пошук") },
  { match: (q) => /значок\s+⚙|налаштуван/i.test(q.text + q.answers[q.correct]), media: () => InfoT.emojiCard("⚙", "налаштування") },
  { match: (q) => /значок\s+✂|вирізат/i.test(q.text), media: () => InfoT.emojiCard("✂", "вирізати") },

  // Health / ergonomics
  { match: (q) => /втом.+оч|перерв.+комп|постав|шкоди.+оч/i.test(q.text + q.answers[q.correct]), media: () => infoCard("👁 Щоб берегти очі: <b>20–20–20</b> — кожні 20 хв дивись 20 секунд на щось за 6 м (≈20 футів).") },
];

function makeInformatykaMedia(q) {
  const corpus = [q.text, q.answers[q.correct] || "", ...q.answers].join(" | ");
  const proxy = { ...q, text: corpus };
  for (const r of infoRules) {
    if (r.match(proxy)) return r.media(q);
  }
  return richCard("💻", q.text, q.answers[q.correct]);
}

/* ============================================================
 * MAIN
 * ==========================================================*/

const SUBJECTS = [
  { file: "anhliyska-mova-4-klas.json", maker: makeAnhliyskaMedia, name: "Англійська" },
  { file: "ispanska-mova-4-klas.json", maker: makeIspanskaMedia, name: "Іспанська" },
  { file: "matematyka-4-klas.json", maker: makeMatematykaMedia, name: "Математика" },
  { file: "ukrayinska-mova-4-klas.json", maker: makeUkrMovaMedia, name: "Українська мова" },
  { file: "informatyka-4-klas.json", maker: makeInformatykaMedia, name: "Інформатика" },
];

async function processSubject(subject) {
  const filePath = path.join(DATA_DIR, subject.file);
  const data = JSON.parse(await fs.readFile(filePath, "utf8"));
  let withSvg = 0, withCard = 0;
  for (const q of data.questions) {
    const m = subject.maker(q);
    q.media = m;
    if (/^<svg/.test(m)) withSvg++;
    else withCard++;
  }
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(
    `${subject.name.padEnd(20)} ${String(data.questions.length).padStart(3)} q · SVG: ${String(withSvg).padStart(3)} · card: ${String(withCard).padStart(3)}`,
  );
}

async function main() {
  for (const s of SUBJECTS) await processSubject(s);
  console.log("\n✓ All five subjects now have media.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
