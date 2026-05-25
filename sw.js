const CACHE_NAME = "mini-games-v5";

const PRECACHE = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icon.svg",
    "./games/maze/",
    "./games/maze/index.html",
    "./games/first-million/",
    "./games/first-million/index.html",
    "./games/first-million/data/subjects.json",
    "./games/first-million/data/anhliyska-mova-4-klas.json",
    "./games/first-million/data/informatyka-4-klas.json",
    "./games/first-million/data/ispanska-mova-4-klas.json",
    "./games/first-million/data/matematyka-2-yads-4-klas.json",
    "./games/first-million/data/mystetstvo-4-klas.json",
    "./games/first-million/data/steam-4-klas.json",
    "./games/first-million/data/ukrayinska-mova-2-yads-4-klas.json",
    "./games/first-million/data/ya-doslidzhuyu-svit-4-klas.json",
    "./games/adventure-academy/",
    "./games/adventure-academy/index.html",
    "./games/adventure-academy/data/themes.json",
    "./games/adventure-academy/data/space.json",
    "./games/adventure-academy/data/human-body.json",
    "./games/adventure-academy/data/ancient-egypt.json"
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
        await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
        await self.clients.claim();
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

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
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

    report("cache-complete");
}
