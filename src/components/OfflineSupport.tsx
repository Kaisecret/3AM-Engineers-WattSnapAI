"use client";
import { useEffect, useState } from "react";
export default function OfflineSupport() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    const navigate = (event: MouseEvent) => {
      if (navigator.onLine || !navigator.serviceWorker?.controller || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element)?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target || link.hasAttribute('download')) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.protocol !== location.protocol || (url.pathname === location.pathname && url.search === location.search && url.hash)) return;
      event.preventDefault(); event.stopPropagation(); location.assign(url.href);
    };
    sync(); window.addEventListener('online', sync); window.addEventListener('offline', sync); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); document.removeEventListener('click', navigate, true); };
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(() => navigator.serviceWorker.ready).then(async () => {
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
        // Warm artwork that may have loaded before the worker took control.
        const resources = performance.getEntriesByType("resource").map(entry => entry.name).filter(name => {
          const url = new URL(name); return url.origin === location.origin && (url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/assets/"));
        });
        for (const url of resources) fetch(url).catch(() => {});
      }).catch(() => { /* Saved records still work in an open app. */ });
    }
  }, []);
  return offline ? <div className="ws-connectivity" role="status">You’re offline. Saved records and local calculations remain available on this device.</div> : null;
}
