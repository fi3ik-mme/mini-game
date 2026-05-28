const CACHE_NAME = "mini-games-v27";
const IMAGE_CACHE_NAME = "mini-games-images-v2";
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i;
const IMAGE_WARMUP_CONCURRENCY = 2;
const IMAGE_WARMUP_START_DELAY_MS = 2500;
const IMAGE_WARMUP_PAUSE_MS = 80;

let imageWarmupPromise = null;
let imageUrlsPromise = null;

const PRECACHE = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icon.svg",
    "./games/maze/",
    "./games/maze/index.html",
    "./games/first-million/",
    "./games/first-million/index.html",
    "./games/first-million/edit.html",
    "./games/first-million/data/subjects.json",
    "./games/first-million/data/anhliyska-mova-4-klas.json",
    "./games/first-million/data/informatyka-4-klas.json",
    "./games/first-million/data/ispanska-mova-4-klas.json",
    "./games/first-million/data/matematyka-4-klas.json",
    "./games/first-million/data/mystetstvo-4-klas.json",
    "./games/first-million/data/steam-4-klas.json",
    "./games/first-million/data/ukrayinska-mova-4-klas.json",
    "./games/first-million/data/ya-doslidzhuyu-svit-4-klas.json",
    "./games/first-million/data/memolohiya-100.json",
    "./games/first-million/data/cheatcodes.json",
    "./games/first-million/assets/coins/25-kopiyok.png",
    "./games/first-million/assets/coins/1-hryvnia-obverse.png",
    "./games/adventure-academy/",
    "./games/adventure-academy/index.html",
    "./games/adventure-academy/data/themes.json",
    "./games/adventure-academy/data/space.json",
    "./games/adventure-academy/data/human-body.json",
    "./games/adventure-academy/data/ancient-egypt.json",
    "./games/adventure-academy/data/steam.json",
    "./games/geo-quest/",
    "./games/geo-quest/index.html",
    "./games/geo-quest/data/world.json",
    "./games/geo-quest/data/continents/europe.json",
    "./games/geo-quest/data/rounds/ukraine-extra.json",
    "./games/geo-quest/data/continents/ocean.json",
    "./games/geo-quest/data/maps/europe-simple.json",
    "./games/geo-quest/data/maps/europe-countries.json",
    "./games/geo-quest/data/maps/ocean-regions.json",
    "./games/geo-quest/assets/earth-equirect.jpg",
    "./games/geo-quest/assets/europe-puzzle.svg"
];

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Precache best-effort: a single 404 will not abort the install.
        await Promise.all(PRECACHE.map(async (url) => {
            try {
                const res = await fetch(url, { cache: "reload" });
                if (res && res.ok) await cache.put(url, res.clone());
            } catch (_) { /* skip unreachable assets */ }
        }));
        // NOTE: no automatic skipWaiting() here. We wait for the page to
        // postMessage("skip-waiting") so the user can apply the update at a
        // safe moment (e.g. from a banner on the menu) rather than mid-game.
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter(n => n !== CACHE_NAME && n !== IMAGE_CACHE_NAME)
                .map(n => caches.delete(n))
        );
        await self.clients.claim();
        // Warm images in low-priority background mode (non-blocking).
        scheduleImageWarmup();
    })());
});

async function networkThenCache(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
    } catch (_) {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
            const fallback = await cache.match("./index.html");
            if (fallback) return fallback;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
    }
}

async function cacheThenNetwork(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
        // refresh in background
        fetch(request).then(res => {
            if (res && res.ok) cache.put(request, res.clone());
        }).catch(() => {});
        return cached;
    }
    try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
    } catch (_) {
        return new Response("Offline", { status: 503, statusText: "Offline" });
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isImageLike(value) {
    return typeof value === "string" && IMAGE_EXT_RE.test(value.trim());
}

function extractImageUrlsFromHtml(html, baseUrl, out) {
    const srcRe = /\bsrc=["']([^"']+)["']/gi;
    let m;
    while ((m = srcRe.exec(html))) {
        const src = m[1];
        if (!src || src.startsWith("data:")) continue;
        try {
            const absolute = new URL(src, baseUrl).toString();
            if (isImageLike(absolute)) out.add(absolute);
        } catch (_) {}
    }
}

function extractImageUrls(value, baseUrl, out) {
    if (!value) return;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed || trimmed.startsWith("data:")) return;
        if (trimmed.includes("<img")) {
            extractImageUrlsFromHtml(trimmed, baseUrl, out);
        }
        if (isImageLike(trimmed)) {
            try {
                out.add(new URL(trimmed, baseUrl).toString());
            } catch (_) {}
        }
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) extractImageUrls(item, baseUrl, out);
        return;
    }
    if (typeof value === "object") {
        for (const k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
                extractImageUrls(value[k], baseUrl, out);
            }
        }
    }
}

async function collectImageUrls() {
    if (imageUrlsPromise) return imageUrlsPromise;
    imageUrlsPromise = (async () => {
        const out = new Set();

        for (const url of PRECACHE) {
            if (isImageLike(url)) {
                out.add(new URL(url, self.location.origin + "/").toString());
            }
        }
        const jsonUrls = PRECACHE.filter((url) => url.endsWith(".json"));
        for (const relativeUrl of jsonUrls) {
            try {
                const absoluteUrl = new URL(relativeUrl, self.location.origin + "/").toString();
                const res = await fetch(absoluteUrl, { cache: "no-store" });
                if (!res.ok) continue;
                const json = await res.json();
                extractImageUrls(json, absoluteUrl, out);
            } catch (_) {}
        }
        return Array.from(out);
    })();
    return imageUrlsPromise;
}

async function putImageToCache(imageCache, url) {
    let request;
    try {
        const absolute = new URL(url, self.location.origin + "/");
        request = absolute.origin === self.location.origin
            ? new Request(absolute.toString(), { cache: "reload" })
            : new Request(absolute.toString(), {
                mode: "no-cors",
                credentials: "omit",
                cache: "reload"
            });
    } catch (_) {
        return false;
    }
    try {
        const cached = await imageCache.match(request, { ignoreVary: true });
        if (cached) return true;
        const response = await fetch(request);
        if (!response) return false;
        if (response.ok || response.type === "opaque") {
            await imageCache.put(request, response.clone());
            return true;
        }
    } catch (_) {}
    return false;
}

async function warmAllImages() {
    const imageCache = await caches.open(IMAGE_CACHE_NAME);
    const urls = await collectImageUrls();
    let nextIndex = 0;
    const workerCount = Math.min(IMAGE_WARMUP_CONCURRENCY, Math.max(1, urls.length));
    const workers = Array.from({ length: workerCount }, async () => {
        while (nextIndex < urls.length) {
            const i = nextIndex++;
            await putImageToCache(imageCache, urls[i]);
            await sleep(IMAGE_WARMUP_PAUSE_MS);
        }
    });
    await Promise.all(workers);
}

function scheduleImageWarmup() {
    if (imageWarmupPromise) return imageWarmupPromise;
    imageWarmupPromise = (async () => {
        await sleep(IMAGE_WARMUP_START_DELAY_MS);
        await warmAllImages().catch(() => {});
    })().finally(() => {
        imageWarmupPromise = null;
    });
    return imageWarmupPromise;
}

async function imageCacheFirst(request) {
    const imageCache = await caches.open(IMAGE_CACHE_NAME);
    const cached = await imageCache.match(request, { ignoreVary: true });
    if (cached) return cached;
    const fresh = await fetch(request);
    if (fresh && (fresh.ok || fresh.type === "opaque")) {
        imageCache.put(request, fresh.clone());
    }
    return fresh;
}

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    const isImageRequest = req.destination === "image" || isImageLike(url.pathname);
    if (isImageRequest) {
        event.respondWith(imageCacheFirst(req).catch(async () => {
            const imageCache = await caches.open(IMAGE_CACHE_NAME);
            const offline = await imageCache.match(req, { ignoreVary: true });
            if (offline) return offline;
            return new Response("", { status: 503, statusText: "Offline image" });
        }));
        return;
    }

    if (url.origin !== self.location.origin) return;

    // release.json publishes the latest native APK version. It must always be
    // fresh — never cached — so installed APKs reliably learn about updates.
    if (url.pathname.endsWith("/release.json")) {
        event.respondWith(fetch(req).catch(() => new Response("{}", {
            status: 200,
            headers: { "Content-Type": "application/json" }
        })));
        return;
    }

    // The signed APK itself is bulky and changes every release; don't cache it.
    if (url.pathname.endsWith(".apk")) {
        event.respondWith(fetch(req));
        return;
    }

    // Network-first for navigations to let updates flow through.
    if (req.mode === "navigate") {
        event.respondWith(networkThenCache(req));
        return;
    }

    // Cache-first for everything else (JSON / icons / scripts / styles).
    event.respondWith(cacheThenNetwork(req));
});

self.addEventListener("message", (event) => {
    const data = event.data;

    if (data === "skip-waiting") {
        self.skipWaiting();
        return;
    }

    // Page asks the SW to make sure every asset in PRECACHE is in the cache.
    // Useful because install runs once and can lose individual files when the
    // network is flaky; this top-up runs on every online page load and fills
    // the gaps so all subjects are guaranteed available offline.
    if (data && data.type === "ensure-cache") {
        event.waitUntil(ensureCache(event.source));
        return;
    }

    if (data && data.type === "refresh-images") {
        scheduleImageWarmup();
    }
});

async function ensureCache(client) {
    const cache = await caches.open(CACHE_NAME);
    const missing = [];
    const total = PRECACHE.length;
    let done = 0;

    const report = (type) => {
        if (!client) return;
        try {
            client.postMessage({ type, done, total, missing: missing.slice() });
        } catch (_) {}
    };

    report("cache-progress");

    for (const url of PRECACHE) {
        const hit = await cache.match(url);
        if (!hit) {
            try {
                const res = await fetch(url, { cache: "reload" });
                if (res && res.ok) {
                    await cache.put(url, res.clone());
                } else {
                    missing.push(url);
                }
            } catch (_) {
                missing.push(url);
            }
        }
        done++;
        report("cache-progress");
    }

    // Start image warmup in background without delaying any page.
    scheduleImageWarmup();
    report("cache-complete");
}
