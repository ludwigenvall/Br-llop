// Enkel "cache-first"-service worker: statiska filer sparas i webbläsarens
// cache första gången de laddas, så sidan laddar snabbare (och fungerar
// delvis offline) vid återbesök.
//
// Höj CACHE_NAME (t.ex. till "broellop-v2") när du gör större ändringar
// i CSS/JS, så att webbläsaren hämtar de nya filerna istället för gamla
// cachade versioner.

const CACHE_NAME = "broellop-v1";
const URLS_TO_CACHE = [
    "/",
    "/static/css/style.css",
    "/static/js/main.js",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
    );
});

self.addEventListener("activate", (event) => {
    // Rensar bort gamla cache-versioner
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});
