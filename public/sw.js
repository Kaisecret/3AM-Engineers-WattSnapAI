/* Saved household records remain in browser storage. Never cache API requests. */
const CACHE = "wattsnap-shell-v1";
const PAGES = new Set(["/welcome", "/intro", "/login", "/signup", "/setup", "/dashboard", "/onboarding", "/bills", "/bills/new", "/appliances", "/appliances/new", "/tips", "/settings"]);
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.add("/offline.html");
    const assets = new Set();
    // These are public, statically rendered shells. Household data is loaded locally.
    await Promise.all([...PAGES].map(async pathname => {
      const response = await fetch(pathname, { cache: "reload" });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Shell unavailable");
      const html = await response.clone().text();
      await cache.put(pathname, response);
      for (const match of html.matchAll(/(?:src|href)="([^"\s]+)"/g)) {
        if (match[1].startsWith("/_next/static/")) assets.add(match[1]);
      }
    }));
    await cache.addAll([...assets]);
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("wattsnap-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const page = request.mode === "navigate" && PAGES.has(url.pathname);
  const asset = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/");
  if (!page && !asset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = page ? url.pathname : request;
    if (asset) { const saved = await cache.match(key); if (saved) return saved; }
    try {
      const response = await fetch(request);
      if (response.ok && (!page || response.headers.get("content-type")?.includes("text/html"))) {
        event.waitUntil(cache.put(key, response.clone()));
      }
      return response;
    } catch {
      const saved = await cache.match(key, { ignoreVary: page });
      return saved || (page ? await cache.match("/offline.html") : null) || Response.error();
    }
  })());
});
