const CACHE_NAME = "keter-pwa-v1";
const APP_SHELL = ["./", "./index.html", "./style.css", "./mobile-controls.css", "./mobile-controls.js", "./script.js", "./manifest.webmanifest", "./pwa-icon.svg", "./menu-background.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const threeCdn = url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/three@0.128.0/");
  if (!sameOrigin && !threeCdn) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      fetch(request).then(response => {
        if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      if (request.mode === "navigate") return (await cache.match("./index.html")) || Response.error();
      return Response.error();
    }
  })());
});