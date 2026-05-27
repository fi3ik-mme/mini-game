// scripts/enrich-wiki-media.mjs (v3 — topic-entity aware)
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

// Quiz surface form → Wikipedia article title (per language).
const ENTITY_ALIASES = {
    uk: {
        paint: "Microsoft Paint", пейнт: "Microsoft Paint",
        word: "Microsoft Word", excel: "Microsoft Excel",
        powerpoint: "Microsoft PowerPoint", windows: "Microsoft Windows", віндовс: "Microsoft Windows",
        chrome: "Google Chrome", firefox: "Mozilla Firefox", edge: "Microsoft Edge",
        google: "Google", youtube: "YouTube",
        wikipedia: "Вікіпедія", вікіпедія: "Вікіпедія",
        браузер: "Веб-браузер", браузері: "Веб-браузер",
        інтернет: "Інтернет", internet: "Інтернет",
        wifi: "Wi-Fi", "wi-fi": "Wi-Fi",
        pdf: "PDF", usb: "USB",
        python: "Python", java: "Java",
        photoshop: "Adobe Photoshop",
        процесор: "Мікропроцесор", мікропроцесор: "Мікропроцесор",
        powerpoint: "Microsoft PowerPoint",
    },
    en: {
        paint: "Microsoft Paint", word: "Microsoft Word", excel: "Microsoft Excel",
        windows: "Microsoft Windows", chrome: "Google Chrome", internet: "Internet",
    },
    es: {
        paint: "Microsoft Paint", word: "Microsoft Word", excel: "Microsoft Excel",
        windows: "Microsoft Windows", internet: "Internet",
    },
};

// Answers that are UI sub-features — when the question names a parent app (Paint, Word…),
// link to the parent entity, not the tool name.
const SUBFEATURE_UK = new Set([
    "олівець", "гумка", "ластик", "заливка", "палітра", "лінія", "прямокутник", "коло", "овал",
    "текст", "спрей", "пензель", "курсор", "значок", "ярлик", "вкладка", "меню", "кнопка",
    "панель", "інструмент", "фігура", "напис", "заливка", "виділення", "копіювання",
]);

// Per-subject manual overrides. Map: { questionIndex: { keyword: "...", skip: bool } }.
const OVERRIDES = {
    "steam-4-klas.json": {
        0: { skip: true },
        1: { skip: true },
    },
    "matematyka-4-klas.json": {
        59: { keyword: "Квадрат" },
    },
};

function resolveEntityKeyword(token, lang) {
    if (!token) return null;
    const map = ENTITY_ALIASES[lang] || ENTITY_ALIASES.uk;
    const key = stripDiacritics(String(token)).toLowerCase().trim();
    if (map[key]) return map[key];
    // "Microsoft Paint" already canonical
    if (/^microsoft\s+/i.test(token)) return token;
    return token;
}

function questionBlob(q) {
    const mediaText = (q.media || "").replace(/<[^>]+>/g, " ");
    return ((q.text || "") + " " + mediaText).trim();
}

/** Parent / topic entities named in the question (Paint, Word, Windows, браузер…). */
function extractTopicEntities(q, lang) {
    const combined = questionBlob(q);
    const found = new Map();

    const add = (raw, priority = 100) => {
        const cleaned = cleanCandidate(raw);
        if (!cleaned) return;
        const kw = resolveEntityKeyword(cleaned, lang);
        if (!isViableKeyword(kw, lang) && kw.length < 3) return;
        const key = kw.toLowerCase();
        const prev = found.get(key);
        if (!prev || priority > prev.priority) found.set(key, { kw, raw: cleaned, priority });
    };

    // «у Paint», «в Word», «на Windows»
    for (const m of combined.matchAll(/\b(?:у|в|на|до|зі?|із|для)\s+([A-Za-zА-ЯІЇЄҐ][A-Za-zА-ЯЇЄҐa-zа-яіїєґ0-9]+)/gi)) {
        add(m[1], 100);
    }

    // Tech proper nouns anywhere in the question
    for (const m of combined.matchAll(/\b(Microsoft\s+)?(Paint|Word|Excel|PowerPoint|Windows|Chrome|Firefox|Edge|Google|YouTube)\b/gi)) {
        add(m[0], 98);
    }

    if (/\bбраузер/i.test(combined)) add("Веб-браузер", 96);
    if (/\bwindows\b/i.test(combined) || /\bвіндовс\b/i.test(combined)) add("Microsoft Windows", 96);
    if (/\bінтернет/i.test(combined)) add("Інтернет", 94);

    // Bold answer in info-card when it is the named product (e.g. Paint)
    for (const m of (q.media || "").matchAll(/<b[^>]*>([^<]+)<\/b>/gi)) {
        const inner = m[1].trim();
        if (/^(paint|word|excel|powerpoint|windows|chrome)$/i.test(inner)) add(inner, 95);
    }

    return [...found.values()].sort((a, b) => b.priority - a.priority);
}

function isAnswerMainSubject(q, ansClean) {
    if (!ansClean) return false;
    const t = (q.text || "").toLowerCase();
    if (/^(що таке|як називається|як називають|що означає|який .* є|яка .* є)\b/.test(t)) return true;
    if (/\b(це|називається)\s*[?:]?\s*$/i.test((q.text || "").trim())) return true;
    const low = ansClean.toLowerCase();
    if (ENTITY_ALIASES.uk[low] || /^(paint|word|excel|powerpoint|windows)$/i.test(ansClean)) return true;
    return false;
}

function isSubfeatureAnswer(ansClean, lang) {
    if (!ansClean || lang !== "uk") return false;
    return SUBFEATURE_UK.has(stripDiacritics(ansClean).toLowerCase());
}

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
    const seen = new Set();
    const add = (kw, source, priority, extra = {}) => {
        const resolved = resolveEntityKeyword(kw, lang);
        if (!resolved || !isViableKeyword(resolved, lang)) return;
        const key = resolved.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        cands.push({ kw: resolved, source, priority, ...extra });
    };

    const topics = extractTopicEntities(q, lang);
    const ans = (q.answers && typeof q.correct === "number") ? q.answers[q.correct] : null;
    const ansClean = cleanCandidate(ans);
    const hasTopic = topics.length > 0;
    const subfeature = isSubfeatureAnswer(ansClean, lang);
    const mainSubject = isAnswerMainSubject(q, ansClean);

    // 1. Topic entities from the question (Paint, Word, Windows…) — highest priority
    for (const t of topics) add(t.kw, "topic", t.priority);

    // Metaphor in quotes («мозок» комп'ютера) — real entity is the answer (процесор).
    const quoted = (q.text || "").match(/«([^»]+)»/);
    if (quoted && ansClean) {
        const qInner = stripDiacritics(quoted[1]).toLowerCase();
        if (qInner !== ansClean.toLowerCase() && qInner.length >= 3) {
            add(ansClean, "answer", 92, { mainSubject: true });
        }
    }

    // 2. Answer when it IS the subject («графічний редактор — Paint»)
    if (ansClean && mainSubject) add(ansClean, "answer", 90, { mainSubject: true });

    // 3. Answer when it is NOT a sub-feature of a named parent app
    if (ansClean && !subfeature && !mainSubject) add(ansClean, "answer", 75);

    // 4. Answer as sub-feature only if no parent topic was found
    if (ansClean && subfeature && !hasTopic) add(ansClean, "answer", 50, { subfeature: true });

    // 5. Other nouns from question text (uk only) — lower priority when topic exists
    if (lang === "uk") {
        const qPriority = hasTopic ? 35 : 55;
        for (const k of extractFromQuestion(q.text, lang)) add(k, "question", qPriority);
    }

    cands.sort((a, b) => b.priority - a.priority);
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
    const blob = desc + " " + ext;
    const qText = questionBlob(q).toLowerCase();
    const title = wr.title || "";

    if (/\(\d{3,4}\)$/.test(title)) return false;
    if (/\((фільм|альбом|пісня|роман|серіал|відеогра|комікс|село|селище|місто|компанія|корабель|міноносець|есмінець)\)$/i.test(title)) return false;

    if (BAD_TYPE_RE.test(desc) || BAD_TYPE_RE.test(ext.slice(0, 80))) {
        if (!BAD_TYPE_RE.test(qText)) return false;
    }

    if (kw.length < 6 && BAD_GEO_RE.test(desc)) {
        if (!/(місто|село|країна|континент|столиц|географ|населенн|регіон)/i.test(qText)) return false;
    }

    if (kw.length < 5) {
        const kwL = stripDiacritics(kw).toLowerCase();
        const titleL = stripDiacritics(wr.title || "").toLowerCase();
        if (titleL.indexOf(kwL) === -1 && kwL.indexOf(titleL) === -1) return false;
    }

    // Context mismatches: question about software, article about unrelated physical object
    if (/\bpaint\b/i.test(qText) && /(олівець|карандаш|фарба для письма)/i.test(blob) && !/paint|редактор|графічн|microsoft/i.test(blob)) return false;
    if (/\bwindows\b/i.test(qText) && /^меню$/i.test(stripDiacritics(title)) && !/windows|операційн|microsoft|комп'ютер/i.test(blob)) return false;
    if (/\bбраузер/i.test(qText) && /^вкладка$/i.test(stripDiacritics(title)) && !/браузер|веб|internet|сторінк/i.test(blob)) return false;
    if (/\bword\b/i.test(qText) && /(слово|літера|алфавіт)/i.test(blob) && !/word|microsoft|текстовий редактор/i.test(blob)) return false;
    if (/комп['']ютер/i.test(qText) && /^мозок$/i.test(stripDiacritics(kw)) && /(храм|церкв|релігій|собор)/i.test(blob)) return false;

    return true;
}

/** Higher score = better semantic fit for this question. */
function scoreArticle(wr, kw, q, meta, lang) {
    let score = meta.priority || 50;
    const blob = ((wr.description || "") + " " + (wr.extract || "")).toLowerCase();
    const qt = questionBlob(q).toLowerCase();
    const titleL = stripDiacritics(wr.title || "").toLowerCase();

    if (meta.source === "topic") score += 20;

    for (const t of extractTopicEntities(q, lang)) {
        const tk = t.kw.toLowerCase();
        if (blob.includes(tk) || titleL.includes(tk.split(" ").pop())) score += 25;
    }

    if (meta.mainSubject) score += 15;
    if (meta.subfeature && extractTopicEntities(q, lang).length) score -= 50;

    if (/\bpaint\b/i.test(qt) && /microsoft paint|графічн|редактор/i.test(blob)) score += 20;
    if (/\bwindows\b/i.test(qt) && /операційн|microsoft windows/i.test(blob)) score += 20;
    if (/\bбраузер/i.test(qt) && /браузер|веб/i.test(blob)) score += 20;
    if (/\bword\b/i.test(qt) && /microsoft word|текстов/i.test(blob)) score += 20;

    return score;
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
        hits: 0, hitsAnswer: 0, hitsQuestion: 0, hitsTopic: 0, hitsOverride: 0,
        skipExisting: 0, skipOverride: 0, noKeyword: 0, noMatch: 0,
    };
    const samples = [];
    const newWins = [];

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
        let bestScore = -1;
        for (const c of candidates) {
            const wr = await fetchWiki(subject.lang, c.kw);
            if (!articlePasses(wr, c.kw, q)) continue;
            const sc = scoreArticle(wr, c.kw, q, c, subject.lang);
            if (sc > bestScore) {
                bestScore = sc;
                won = { wr, c, score: sc };
            }
        }
        if (won && bestScore < 35) won = null; // too weak a semantic match

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
        else if (won.c.source === "topic") stats.hitsTopic++;
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

console.log(`Wikipedia media enrichment v3 (dryRun=${dryRun}, force=${force})`);
let grandHits = 0, grandTotal = 0;
for (const s of targets) {
    process.stdout.write(`\n=== ${s.id} (${s.lang}) ===\n`);
    const out = await processSubject(s, { dryRun, force });
    if (!out) continue;
    const { stats, samples, newWins } = out;
    grandHits += stats.hits; grandTotal += stats.total;
    console.log(
        `  total=${stats.total} hits=${stats.hits} (topic=${stats.hitsTopic} ans=${stats.hitsAnswer} q=${stats.hitsQuestion} ovr=${stats.hitsOverride})`
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
