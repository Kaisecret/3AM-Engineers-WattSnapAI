/* Private pages/API responses are never cached. The offline document has no account data. */
const CACHE = "wattsnap-static-v3";
const SHELL = "/offline-app";
const ARTWORK = "/offline-artwork.json";
const ARTWORK_HEADER = "X-WattSnap-Offline-Artwork";
function imageUrl(image) {
  const url = new URL("/_next/image", self.location.origin);
  url.searchParams.set("url", image.src); url.searchParams.set("w", String(image.width)); url.searchParams.set("q", "75");
  return url.href;
}
async function savedImage(cache, key, request) {
  const saved = await cache.match(key, { ignoreVary: true });
  if (!saved) return;
  const type = saved.headers.get("content-type")?.split(";")[0];
  const accept = request.headers?.get("accept") || "";
  // Optimized copies use Vary: Accept. Reuse only a format the browser supports.
  if ((type === "image/webp" || type === "image/avif") && accept && !accept.includes(type) && !accept.includes("*/*")) return;
  return saved;
}
const appPath = pathname => pathname === "/" || pathname === "/welcome" || pathname === SHELL || /^\/(dashboard|setup|onboarding|bills|appliances|tips|settings|assistant|budget|brownout-ready|simulator|advisories)(\/|$)/.test(pathname);
let preparing;
function prepareShell() {
  if (preparing) return preparing;
  preparing = (async () => {
    const cache = await caches.open(CACHE);
    const document = await fetch(SHELL, { cache: "no-store", credentials: "omit" });
    if (!document.ok || document.redirected || !document.headers.get("content-type")?.includes("text/html")) throw new Error("Offline shell unavailable");
    const html = await document.clone().text();
    const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"\s]+)"/g)].map(match => new URL(match[1].replace(/&amp;/g, "&"), self.location.origin)).filter(url => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")).map(url => url.href))];
    if (!assets.some(url => new URL(url).pathname.endsWith(".js")) || !assets.some(url => new URL(url).pathname.endsWith(".css"))) throw new Error("Offline assets unavailable");
    await Promise.all(assets.map(async url => {
      if (await cache.match(url)) return;
      const response = await fetch(url, { credentials: "omit" });
      if (!response.ok) throw new Error("Offline asset unavailable");
      await cache.put(url, response);
    }));
    const manifest = await fetch(ARTWORK, { cache: "no-store", credentials: "omit" });
    if (!manifest.ok || manifest.redirected) throw new Error("Offline artwork list unavailable");
    const artwork = await manifest.clone().json();
    const pictures = [...artwork.images.map(imageUrl), ...artwork.files];
    await Promise.all(pictures.map(async url => {
      if (await cache.match(url)) return;
      // Store a compact WebP copy while preserving each illustration's transparency.
      const response = await fetch(url, { credentials: "omit", headers: { Accept: "image/webp,image/*;q=0.8" } });
      if (!response.ok || response.redirected || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Offline artwork unavailable");
      await cache.put(url, response);
    }));
    await cache.put(ARTWORK, manifest);
    // Ready means the shell, scripts, styles and artwork are all available.
    await cache.put(SHELL, new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", [ARTWORK_HEADER]: "1" } }));
  })().finally(() => { preparing = undefined; });
  return preparing;
}
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add("/offline.html")).then(() => prepareShell()).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith("wattsnap-shell-") || key.startsWith("wattsnap-static-")) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  if (event.data?.type !== "PREPARE_OFFLINE") return;
  event.waitUntil(prepareShell().then(() => event.ports?.[0]?.postMessage({ ready: true })).catch(async () => event.ports?.[0]?.postMessage({ ready: (await (await caches.open(CACHE)).match(SHELL))?.headers.get(ARTWORK_HEADER) === "1" })));
});
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      const shell = appPath(url.pathname) ? await cache.match(SHELL) : undefined;
      if (shell) return new Response((await shell.text()).replace("</head>", '<script>document.documentElement.dataset.offlineShell="true"</script></head>'), {headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
      return await cache.match("/offline.html") || Response.error();
    }));
    return;
  }
  const asset = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || (url.pathname === "/_next/image" && url.searchParams.get("url")?.startsWith("/assets/"));
  if (!asset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), saved = url.pathname === "/_next/image" ? await savedImage(cache, request, request) : await cache.match(request);
    if (saved) return saved;
    const fallbackImage = async () => {
      const manifest = await cache.match(ARTWORK);
      if (manifest) {
        const artwork = await manifest.json();
        const src = url.pathname === "/_next/image" ? url.searchParams.get("url") : decodeURIComponent(url.pathname);
        const picture = artwork.images.find(image => image.src === src);
        const fallback = picture && await savedImage(cache, imageUrl(picture), request);
        if (fallback) return fallback;
      }
    };
    if (url.pathname === "/_next/image" || url.pathname.startsWith("/assets/branding/")) {
      const picture = await fallbackImage();
      if (picture) return picture;
    }
    const response = await fetch(request).catch(async error => {
      const fallback = await fallbackImage();
      if (fallback) return fallback;
      throw error;
    });
    if (!response.ok) return await fallbackImage() || response;
    if (response.ok) event.waitUntil(cache.put(request, response.clone()));
    return response;
  })());
});
