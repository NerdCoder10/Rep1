// Service worker: lets the calendar install as an app and open offline.
// Network first, so you always get the newest version when online; the
// saved copy is only used when there is no connection.

const CACHE = "calendar-v1";
const CORE = [
  "./", "index.html", "styles.css", "app.js", "school-calendar.js", "schedule.js",
  "planner.js", "closure.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Only handle this site's own files; weather, time.is etc. go straight to the network.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // version.json must always come from the network (it drives auto-updates).
  if (url.pathname.endsWith("/version.json")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          // Store without the ?v= query so the offline copy is found for any version.
          const key = new Request(url.origin + url.pathname);
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(new Request(url.origin + url.pathname))
          .then((hit) => hit || caches.match(req.mode === "navigate" ? "./" : req, { ignoreSearch: true }))
      )
  );
});
