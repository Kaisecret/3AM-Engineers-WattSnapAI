/* Saved household records remain in browser storage. Never cache API requests. */
const CACHE = "wattsnap-shell-v3";
const PAGES = new Set(["/", "/advisories", "/advisories/new", "/simulator", "/budget", "/brownout-ready", "/assistant", "/welcome", "/intro", "/login", "/signup", "/setup", "/dashboard", "/onboarding", "/bills", "/bills/new", "/appliances", "/appliances/new", "/tips", "/settings"]);
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
    await cache.addAll(["actions-1.png", "actions-2.png", "actions-3.png", "actions-4.png", "actions-5.png", "actions-6.png", "actions-7.png", "wattsnap-icon-192.png", "wattsnap-favicon-32.png", "Cheerful Bee Robot Thumbs-Up.png"].map(name => `/assets/branding/${encodeURIComponent(name)}`));
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
    if (page) {
      const saved = await cache.match(key, { ignoreVary: true });
      if (saved) {
        // Public shells load immediately, even while connectivity is changing.
        // Prepare fresh HTML and its immutable chunks before replacing this shell.
        if (self.navigator.onLine) event.waitUntil((async () => {
          try {
            const fresh = await fetch(request);
            if (!fresh.ok || !fresh.headers.get("content-type")?.includes("text/html")) return;
            const html = await fresh.clone().text();
            const assets = new Set([...html.matchAll(/(?:src|href)="([^"\s]+)"/g)].map(match => match[1]).filter(path => path.startsWith("/_next/static/")));
            await Promise.all([...assets].map(async path => { if (!await cache.match(path)) await cache.add(path); }));
            await cache.put(key, fresh);
          } catch { /* Keep the fully prepared shell when refresh is unavailable. */ }
        })());
        return saved;
      }
    }
    if (asset) { const saved = await cache.match(key); if (saved) return saved; }
    try {
      const response = await fetch(request);
      if (response.ok && !page) {
        event.waitUntil(cache.put(key, response.clone()));
      }
      return response;
    } catch {
      let saved = await cache.match(key, { ignoreVary: page });
      if (!saved && url.pathname === "/_next/image") { const original = url.searchParams.get("url"); if (original?.startsWith("/assets/")) saved = await cache.match(original); }
      return saved || (page ? await cache.match("/offline.html") : null) || Response.error();
    }
  })());
});
