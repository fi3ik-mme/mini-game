// scripts/enrich-wiki-media.mjs (v2)
//
// Goes through every question of a Перший-мільйон category, builds an ordered
// list of keyword candidates (correct answer first, then long nouns / proper
// nouns mined from the question text) and prepends a clickable Wikipedia
// thumbnail to the question's `media` HTML using the first candidate that
// returns a usable, non-disambiguation, non-media-spinoff article.
//
// Usage:
//   node scripts/enrich-wiki-media.mjs                   # all subjects
//   node scripts/enrich-wiki-media.mjs mystetstvo        # single subject
//   node scripts/enrich-wiki-media.mjs --dry-run         # don't touch JSON files
//   node scripts/enrich-wiki-media.mjs --force           # re-attempt already-enriched questions too
//
// Subject ids: matematyka, ukrayinska-mova, ya-doslidzhuyu-svit, anhliyska-mova,
//              ispanska-mova, informatyka, mystetstvo, steam.
//
// Idempotent in default mode: questions whose media already contains
// "wikipedia.org/wiki/" are skipped. With `--force`, the existing Wikipedia
// block is stripped and re-attempted (useful when keyword logic improves).
// All API responses are cached on disk under scripts/.wiki-cache so re-runs
// hit the cache (look for cache hits → ~150 ms instead of full API throttle).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(REPO_ROOT, "games/first-million/data");
const CACHE_DIR = resolve(__dirname, ".wiki-cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const SUBJECTS = [
    { id: "matematyka",          file: "matematyka-4-klas.json",          lang: "uk" },
    { id: "ukrayinska-mova",     file: "ukrayinska-mova-4-klas.json",     lang: "uk" },
    { id: "ya-doslidzhuyu-svit", file: "ya-doslidzhuyu-svit-4-klas.json", lang: "uk" },
    { id: "anhliyska-mova",      file: "anhliyska-mova-4-klas.json",      lang: "en" },
    { id: "ispanska-mova",       file: "ispanska-mova-4-klas.json",       lang: "es" },
    { id: "informatyka",         file: "informatyka-4-klas.json",         lang: "uk" },
    { id: "mystetstvo",          file: "mystetstvo-4-klas.json",          lang: "uk" },
    { id: "steam",               file: "steam-4-klas.json",               lang: "uk" },
];

// Words that should never become standalone keywords (interrogatives, common verbs,
// pronouns, conjunctions). Lowercased, diacritics stripped.
const STOP_UK = new Set([
    "що", "як", "хто", "де", "коли", "чому", "скільки", "який", "яка", "яке", "які",
    "якого", "якої", "якому", "якій", "якими", "якою", "ким", "чим", "чого", "чому",
    "це", "ця", "цей", "цю", "цього", "цієї", "цьому", "цій", "цими", "цих",
    "той", "та", "те", "ті", "того", "тієї", "тому", "тій", "тими", "тих",
    "такий", "така", "таке", "такі", "такого", "такої", "такому", "такій", "такими",
    "для", "тому", "тоді", "також", "якщо", "потім", "раніше", "перед", "після",
    "над", "під", "між", "серед", "разом", "саме", "точно", "ще", "вже", "ось",
    "там", "тут", "зараз", "тепер", "завжди", "ніколи", "часто",
    "є", "був", "була", "було", "були", "буде", "будуть", "має", "мала", "мали",
    "може", "можна", "потрібно", "треба", "необхідно",
    "робить", "зробити", "робити", "робимо", "роблять", "зробив", "зробили",
    "називається", "називаються", "означає", "означають",
    "себе", "свій", "своя", "своє", "свої", "свого", "своєї", "своїм", "своєю",
    "усі", "всі", "усю", "всю", "все", "усе", "усього", "усього", "увесь",
    "лише", "тільки", "майже", "зовсім", "трохи", "багато", "мало",
    "слово", "слова", "речення", "приклад", "відповідь", "питання", "правильно",
    "число", "числа", "буква", "букви", "літера", "літери",
    "має", "повинен", "повинна", "повинно", "повинні",
    "буде", "будемо", "будете", "будуть", "були", "була", "було",
    "тільки", "лише", "потрібно", "необхідно",
]);

const STOP_BY_LANG = {
    uk: STOP_UK,
    en: new Set(["the", "what", "which", "where", "when", "who", "how", "this", "that", "these", "those", "with", "from", "into", "onto", "about"]),
    es: new Set(["el", "la", "los", "las", "un", "una", "que", "qué", "cuál", "donde", "dónde", "cuando", "como", "cómo", "esto", "esta", "este", "esa", "esos", "esas"]),
};

// Wikipedia article descriptions / extracts that signal a likely wrong match —
// most quiz questions are NOT about a film / album / song / novel / fictional
// character etc.
const BAD_TYPE_RE = /(фільм|альбом|пісня|пісні|роман|серіал|відеогра|комікс|мультсеріал|мультфільм|кінофільм|кінокартина|мюзикл|опера|балет|радіопрограма|телепрограма|персонаж|вигаданий|вигадана|вигадане|герой серії|серії книг|серії романів|серії фільмів|марка автомобіля|автомобільн[аи]|футбольн[аи] клуб|хокейн[аи] клуб|баскетбольн[аи] клуб|спортивн[аи] клуб|музичн[аи] гурт|музичн[аи] група|рок-гурт|рок-група|поп-гурт|поп-група|метал-гурт|вокально-інструментальний|нічний клуб|комп'ютерна гра|настільна гра|film|album|song|novel|video game|tv series|sitcom|fictional character|literary character|película|álbum|canción|novela|videojuego|serie de televisión)/i;

const BAD_GEO_RE = /^(село|селище|хутір|залізнична станція|залізничний роз'їзд|зупинний пункт|зупинка)\b/i;

// Lightweight Ukrainian morphology hints — convert common case forms back to
// nominative so we hit the right Wikipedia article (e.g. "добі" → "доба",
// otherwise Wikipedia returns an article about Dobby the house elf).
const UK_LEMMA = {
    "добі": "доба",
    "діб":  "доба",
    "дні":  "день",
    "днів": "день",
    "годин": "година",
    "годині": "година",
    "години": "година",
    "хвилин": "хвилина",
    "хвилині": "хвилина",
    "хвилини": "хвилина",
    "секунд": "секунда",
    "секунді": "секунда",
    "секунди": "секунда",
    "роки":  "рік",
    "років": "рік",
    "році":  "рік",
    "місяці": "місяць",
    "місяців": "місяць",
    "тижні": "тиждень",
    "тижнів": "тиждень",
    "сторін": "сторона",
    "сторони": "сторона",
    "кутів": "кут",
    "кути":  "кут",
    "куті":  "кут",
    "грошей": "гроші",
    "грошах": "гроші",
};

function lemmatizeUk(s) {
    const low = s.toLowerCase();
    return UK_LEMMA[low] ? UK_LEMMA[low] : s;
}

// Per-subject manual overrides. Map: { questionIndex: { keyword: "...", skip: bool } }.
// Use these to pin a keyword for known-tricky cases or skip a bad auto-match.
const OVERRIDES = {
    "steam-4-klas.json": {
        // Q[0..2] are "Що означає STEAM?" — generic acronym, skip the auto-hit on "Science" journal.
        0: { skip: true },
        1: { skip: true },
    },
    "matematyka-4-klas.json": {
        // 59 = "У квадрата всі сторони рівні" — auto-hit was a sci-fi film "Рівні". Override to "Квадрат".
        59: { keyword: "Квадрат" },
    },
};

const HEADERS = {
    "User-Agent": "mini-game-build/1.1 (https://github.com/fi3ik-mme/mini-game; static site PWA)",
    "Accept": "application/json",
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function stripDiacritics(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
}

function cleanCandidate(raw) {
    if (!raw) return null;
    let s = String(raw);
    s = s.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    s = s.split(/[,;\/]| – | — /)[0].trim();
    s = stripDiacritics(s);
    s = s.replace(/^[«"'“„]+|[»"'”“.,;:!?–—-]+$/g, "").trim();
    if (!s || s.length < 3 || s.length > 60) return null;
    if (/^[\d\s+\-*/=().,%×÷·°²³]+$/.test(s)) return null;
    return s;
}

function isViableKeyword(s, lang) {
    if (!s || s.length < 3) return false;
    const stop = STOP_BY_LANG[lang] || STOP_UK;
    if (stop.has(s.toLowerCase())) return false;
    return true;
}

// Mine candidate nouns from the question text. Returns up to N most-promising
// candidates (capitalised mid-sentence words first, then longest non-stop tokens).
function extractFromQuestion(text, lang) {
    if (!text) return [];
    const cleaned = String(text)
        .replace(/[?!.,;:«»"'()\[\]{}–—]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const tokens = cleaned.split(" ").filter(Boolean);
    if (!tokens.length) return [];

    const stop = STOP_BY_LANG[lang] || STOP_UK;
    const seen = new Set();
    const proper = [];
    const longest = [];

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.length < 4 || t.length > 22) continue;
        if (/\d/.test(t)) continue;
        const norm = stripDiacritics(t);
        const low = norm.toLowerCase();
        if (stop.has(low)) continue;
        if (seen.has(low)) continue;
        seen.add(low);

        // Light Ukrainian-only lemmatisation for common time / geometry case forms.
        const lemmatised = lang === "uk" ? lemmatizeUk(norm) : norm;

        // Mid-sentence capitalised → likely proper noun (Київ, Дніпро, Євразія…).
        const isProper = i > 0 && /^[А-ЯІЇЄҐA-Z]/.test(t);
        const target = isProper ? proper : longest;
        target.push(lemmatised);
    }
    longest.sort((a, b) => b.length - a.length);
    return [...proper, ...longest].slice(0, 5);
}

function buildCandidates(q, lang) {
    const cands = [];
    const ans = (q.answers && typeof q.correct === "number") ? q.answers[q.correct] : null;

    // 1. From answer (cleaned)
    const a = cleanCandidate(ans);
    if (a && isViableKeyword(a, lang)) {
        cands.push({ kw: a, source: "answer" });
    }

    // 2. From question text — only when the answer was generic OR the answer is
    // in the wrong language (English/Spanish-subject questions are in Ukrainian).
    // For lang=uk we always also add question-derived candidates.
    if (lang === "uk") {
        const qCands = extractFromQuestion(q.text, lang);
        for (const k of qCands) {
            if (cands.find(c => c.kw.toLowerCase() === k.toLowerCase())) continue;
            cands.push({ kw: k, source: "question" });
        }
    }
    return cands;
}

function cacheKey(lang, keyword) {
    const safe = keyword.toLowerCase().replace(/[^a-z0-9а-яїієґñáéíóúü]/gi, "_").slice(0, 60);
    const hash = createHash("sha1").update(`${lang}|${keyword}`).digest("hex").slice(0, 8);
    return `${lang}--${safe}--${hash}.json`;
}

async function fetchWiki(lang, keyword) {
    const cacheFile = resolve(CACHE_DIR, cacheKey(lang, keyword));
    if (existsSync(cacheFile)) {
        try { return JSON.parse(readFileSync(cacheFile, "utf8")); } catch { /* re-fetch */ }
    }
    const slug = keyword.replace(/\s+/g, "_");
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURI(slug)}`;
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(url, { headers: HEADERS });
            if (res.status === 429) {
                await sleep(1500 * (attempt + 1));
                continue;
            }
            if (!res.ok) {
                result = { found: false, status: res.status };
                break;
            }
            const data = await res.json();
            if (data.type === "disambiguation") {
                result = { found: false, disambig: true, title: data.title };
            } else {
                result = {
                    found: true,
                    slug: data.titles?.canonical || slug,
                    title: data.title || keyword,
                    description: data.description || null,
                    extract: (data.extract || "").slice(0, 400),
                    url: data.content_urls?.desktop?.page
                        || `https://${lang}.wikipedia.org/wiki/${encodeURI(slug)}`,
                    thumb: data.thumbnail?.source || null,
                };
            }
            break;
        } catch (err) {
            result = { found: false, error: String(err && err.message || err) };
            break;
        }
    }
    if (!result) result = { found: false, error: "exhausted retries" };
    writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    await sleep(150);
    return result;
}

function articlePasses(wr, kw, q) {
    if (!wr || !wr.found || wr.disambig) return false;
    if (!wr.thumb) return false;

    const desc = (wr.description || "").toLowerCase();
    const ext = (wr.extract || "").toLowerCase();
    const qText = (q.text || "").toLowerCase();
    const title = wr.title || "";

    // 0. Reject articles whose title carries disambiguation in parentheses —
    // Wikipedia returns these only when no plain article exists, which usually
    // means the keyword is too generic for our context.
    // Examples we want to reject: "Таке (1944)" (a WW2 destroyer), "Кіт (фільм)".
    if (/\(\d{3,4}\)$/.test(title)) return false;
    if (/\((фільм|альбом|пісня|роман|серіал|відеогра|комікс|село|селище|місто|компанія|корабель|міноносець|есмінець)\)$/i.test(title)) return false;

    // 1. Reject media-spinoff articles unless the question mentions media.
    if (BAD_TYPE_RE.test(desc) || BAD_TYPE_RE.test(ext.slice(0, 80))) {
        if (!BAD_TYPE_RE.test(qText)) return false;
    }

    // 2. Reject village / minor-geo articles for short keywords (< 5 chars)
    // unless the question is about geography / population centres.
    if (kw.length < 6 && BAD_GEO_RE.test(desc)) {
        if (!/(місто|село|країна|континент|столиц|географ|населенн|регіон)/i.test(qText)) return false;
    }

    // 3. For very short keywords (< 5 chars), require the article title to
    // overlap with the keyword (avoids hits like "Кіт" → film "Кіт у чоботях").
    if (kw.length < 5) {
        const kwL = stripDiacritics(kw).toLowerCase();
        const titleL = stripDiacritics(wr.title || "").toLowerCase();
        if (titleL.indexOf(kwL) === -1 && kwL.indexOf(titleL) === -1) return false;
    }
    return true;
}

function imageBlock(url, src, alt) {
    const safeAlt = (alt || "").replace(/"/g, "&quot;");
    return `<a href="${url}" target="_blank" rel="noopener" title="Стаття у Вікіпедії" style="display:block;margin-bottom:10px"><img src="${src}" alt="${safeAlt}" loading="lazy" style="display:block;margin:0 auto;max-width:100%;max-height:240px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);cursor:pointer"/></a>`;
}

function stripExistingWiki(media) {
    if (!media) return media;
    return media.replace(/^<a[^>]*wikipedia[^>]*>[\s\S]*?<\/a>/, "");
}

async function processSubject(subject, opts) {
    const path = resolve(DATA_DIR, subject.file);
    if (!existsSync(path)) {
        console.error(`  ! file missing: ${path}`);
        return null;
    }
    const data = JSON.parse(readFileSync(path, "utf8"));
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const overrides = OVERRIDES[subject.file] || {};

    const stats = {
        total: questions.length,
        hits: 0, hitsAnswer: 0, hitsQuestion: 0, hitsOverride: 0,
        skipExisting: 0, skipOverride: 0, noKeyword: 0, noMatch: 0,
    };
    const samples = [];
    const newWins = []; // matches that came from question-text fallback (showcase)

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const ovr = overrides[i];

        if (ovr && ovr.skip) {
            // Strip any existing Wikipedia, leave SVG / emoji alone
            q.media = stripExistingWiki(q.media || "");
            delete q.wikiKeyword; delete q.wikiTitle; delete q.wikiUrl;
            stats.skipOverride++;
            continue;
        }

        const media0 = q.media || "";
        const hadWiki = /wikipedia\.org\/wiki\//.test(media0);
        if (hadWiki && !opts.force) {
            stats.skipExisting++;
            continue;
        }

        // Build candidate list (override pins first slot if set).
        const cleanMedia = stripExistingWiki(media0);
        let candidates = buildCandidates(q, subject.lang);
        if (ovr && ovr.keyword) {
            candidates = [{ kw: ovr.keyword, source: "override" }, ...candidates];
        }
        if (!candidates.length) {
            q.media = cleanMedia;
            delete q.wikiKeyword; delete q.wikiTitle; delete q.wikiUrl;
            stats.noKeyword++;
            continue;
        }

        let won = null;
        for (const c of candidates) {
            const wr = await fetchWiki(subject.lang, c.kw);
            if (!articlePasses(wr, c.kw, q)) continue;
            won = { wr, c };
            break;
        }

        if (!won) {
            q.media = cleanMedia;
            delete q.wikiKeyword; delete q.wikiTitle; delete q.wikiUrl;
            stats.noMatch++;
            continue;
        }

        q.media = imageBlock(won.wr.url, won.wr.thumb, won.wr.title) + cleanMedia;
        q.wikiKeyword = won.c.kw;
        q.wikiTitle = won.wr.title;
        q.wikiUrl = won.wr.url;
        stats.hits++;
        if (won.c.source === "answer") stats.hitsAnswer++;
        else if (won.c.source === "question") { stats.hitsQuestion++; newWins.push({ idx: i, kw: won.c.kw, title: won.wr.title }); }
        else if (won.c.source === "override") stats.hitsOverride++;
        if (samples.length < 5) samples.push({ idx: i, kw: won.c.kw, src: won.c.source, title: won.wr.title });
    }
    if (!opts.dryRun) {
        writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
    }
    return { stats, samples, newWins };
}

// ---------- CLI ----------
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const positional = args.filter(a => !a.startsWith("--"));
const targets = positional.length ? SUBJECTS.filter(s => positional.includes(s.id)) : SUBJECTS;

if (!targets.length) {
    console.error("No matching subject. Available:", SUBJECTS.map(s => s.id).join(", "));
    process.exit(1);
}

console.log(`Wikipedia media enrichment v2 (dryRun=${dryRun}, force=${force})`);
let grandHits = 0, grandTotal = 0;
for (const s of targets) {
    process.stdout.write(`\n=== ${s.id} (${s.lang}) ===\n`);
    const out = await processSubject(s, { dryRun, force });
    if (!out) continue;
    const { stats, samples, newWins } = out;
    grandHits += stats.hits; grandTotal += stats.total;
    console.log(
        `  total=${stats.total} hits=${stats.hits} (ans=${stats.hitsAnswer} q=${stats.hitsQuestion} ovr=${stats.hitsOverride})`
        + ` skip-existing=${stats.skipExisting} skip-override=${stats.skipOverride}`
        + ` no-keyword=${stats.noKeyword} no-match=${stats.noMatch}`
    );
    if (samples.length) {
        console.log(`  samples:`);
        for (const x of samples) console.log(`    [${x.idx}] (${x.src}) "${x.kw}" → ${x.title}`);
    }
    if (newWins.length) {
        console.log(`  question-derived wins (top 8):`);
        for (const x of newWins.slice(0, 8)) console.log(`    [${x.idx}] "${x.kw}" → ${x.title}`);
    }
}
console.log(`\nGRAND TOTAL: ${grandHits} / ${grandTotal} = ${(grandHits / Math.max(1, grandTotal) * 100).toFixed(1)} %`);
