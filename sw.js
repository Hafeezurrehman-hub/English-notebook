// EnglishNotebook — Service Worker (PWA)
const CACHE_NAME = "englishnotebook-v2";

const CACHE_FILES = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./auth.html",
  "./pricing.html",
  "./welcome.html",
  "./badges.html",
  "./certificate.html",
  "./leaderboard.html",
  "./custom-quiz.html",
  "./pronunciation.html",
  "./payment.html",
  "./lesson-noun.html",
  "./lesson-pronoun.html",
  "./lesson-verbforms.html",
  "./lesson-tenses.html",
  "./lesson-conjunctions.html",
  "./lesson-tensepairs.html",
  "./lesson-paragraph.html",
  "./lesson-modals.html",
  "./lesson-300verbs.html",
  "./tense-chart.html",
  "./en-guard.js",
  "./en-ai.js",
  "./en-gamification.js",
  "./manifest.json",
];

// Install — cache all files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", event => {
  // Skip non-GET and external requests
  if(event.request.method !== "GET") return;
  // Only cache same-origin requests
  const reqUrl = new URL(event.request.url);
  if(reqUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
