// scripts/enrich-wiki-media.mjs
//
// Goes through every question of a Перший-мільйон category, picks a keyword
// (correct answer by default), fetches a Wikipedia summary in the relevant
// language and prepends a clickable thumbnail to the question's `media` HTML.
//
// Idempotent: questions whose media already contains "wikipedia.org/wiki/"
// are skipped. All API responses are cached on disk under scripts/.wiki-cache
// so re-runs are free.
//
// Usage:
//   node scripts/enrich-wiki-media.mjs                 # all subjects
//   node scripts/enrich-wiki-media.mjs mystetstvo      # single subject
//   node scripts/enrich-wiki-media.mjs --dry-run       # don't touch JSON files
//
// Subject ids: matematyka, ukrayinska-mova, ya-doslidzhuyu-svit, anhliyska-mova,
//              ispanska-mova, informatyka, mystetstvo, steam.

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

// Common short tokens that produce poor / unrelated Wikipedia hits.
const STOP_KEYWORDS = new Set([
    "так", "ні", "всі", "усі", "жоден", "ніщо", "нічого", "ніхто", "ніхто з",
    "yes", "no", "all", "none", "si", "sí", "todos", "ningún", "ninguno",
]);

const HEADERS = {
    "User-Agent": "mini-game-build/1.0 (https://github.com/fi3ik-mme/mini-game; static site PWA)",
    "Accept": "application/json",
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function stripDiacritics(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
}

// Pick a candidate keyword for a question. Strategy:
//   1. Use the correct answer.
//   2. Strip parentheticals "Science (наука)" → "Science".
//   3. Cut at first delimiter (comma / semicolon / slash / dash w/ spaces).
//   4. Strip diacritics (combining stress marks etc).
//   5. Trim trailing punctuation.
//   6. Reject if numeric, formula, < 3 chars, or stop-word.
function extractKeyword(q) {
    let raw = (q.answers && typeof q.correct === "number" && q.answers[q.correct] != null)
        ? String(q.answers[q.correct])
        : "";
    if (!raw) return null;
    raw = raw.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    raw = raw.split(/[,;\/]| – | — /)[0].trim();
    raw = stripDiacritics(raw);
    raw = raw.replace(/^[«"'“„]+|[»"'”“.,;:!?–—-]+$/g, "").trim();
    if (!raw) return null;
    if (raw.length < 3) return null;
    if (/^[\d\s+\-*/=().,%×÷·]+$/.test(raw)) return null;
    if (STOP_KEYWORDS.has(raw.toLowerCase())) return null;
    // Drop leading articles for English/Spanish (not capitalised words like "The Beatles").
    raw = raw.replace(/^(the|a|an|el|la|los|las|un|una)\s+/i, (m) => /^[A-Z]/.test(m) ? m : "");
    return raw;
}

// Build a stable filesystem-safe cache filename.
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
                    url: data.content_urls?.desktop?.page
                        || `https://${lang}.wikipedia.org/wiki/${encodeURI(slug)}`,
                    thumb: data.thumbnail?.source || null,
                    description: data.description || null,
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
    await sleep(150); // gentle on the public API
    return result;
}

function imageBlock(url, src, alt) {
    const safeAlt = (alt || "").replace(/"/g, "&quot;");
    return `<a href="${url}" target="_blank" rel="noopener" title="Стаття у Вікіпедії" style="display:block;margin-bottom:10px"><img src="${src}" alt="${safeAlt}" loading="lazy" style="display:block;margin:0 auto;max-width:100%;max-height:240px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);cursor:pointer"/></a>`;
}

async function processSubject(subject, opts) {
    const path = resolve(DATA_DIR, subject.file);
    if (!existsSync(path)) {
        console.error(`  ! file missing: ${path}`);
        return null;
    }
    const data = JSON.parse(readFileSync(path, "utf8"));
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const stats = { total: questions.length, hits: 0, skipExisting: 0, noKeyword: 0, noWiki: 0, noImage: 0 };
    const samples = [];
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const media = q.media || "";
        if (/wikipedia\.org\/wiki\//.test(media)) {
            stats.skipExisting++;
            continue;
        }
        const kw = extractKeyword(q);
        if (!kw) { stats.noKeyword++; continue; }

        const wr = await fetchWiki(subject.lang, kw);
        if (!wr.found) { stats.noWiki++; continue; }
        if (!wr.thumb) { stats.noImage++; continue; }

        q.media = imageBlock(wr.url, wr.thumb, wr.title) + media;
        q.wikiKeyword = kw;
        q.wikiTitle = wr.title;
        q.wikiUrl = wr.url;
        stats.hits++;
        if (samples.length < 5) {
            samples.push({ idx: i, kw, title: wr.title, url: wr.url });
        }
    }
    if (!opts.dryRun) {
        writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
    }
    return { stats, samples };
}

// ---------- CLI ----------
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const positional = args.filter(a => !a.startsWith("--"));
const targets = positional.length
    ? SUBJECTS.filter(s => positional.includes(s.id))
    : SUBJECTS;

if (!targets.length) {
    console.error("No matching subject. Available:", SUBJECTS.map(s => s.id).join(", "));
    process.exit(1);
}

console.log(`Wikipedia media enrichment (dryRun=${dryRun})`);
for (const s of targets) {
    process.stdout.write(`\n=== ${s.id} (${s.lang}) ===\n`);
    const out = await processSubject(s, { dryRun });
    if (!out) continue;
    const { stats, samples } = out;
    console.log(`  total=${stats.total} hits=${stats.hits} skip-existing=${stats.skipExisting}`);
    console.log(`  no-keyword=${stats.noKeyword} no-wiki=${stats.noWiki} no-image=${stats.noImage}`);
    if (samples.length) {
        console.log(`  samples:`);
        for (const s of samples) console.log(`    [${s.idx}] "${s.kw}" → ${s.title} (${s.url})`);
    }
}
