"use client";
import { useEffect } from "react";
export default function OfflineSupport() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(() => navigator.serviceWorker.ready).then(() => {
        // Warm artwork that may have loaded before the worker took control.
        const resources = performance.getEntriesByType("resource").map(entry => entry.name).filter(name => {
          const url = new URL(name); return url.origin === location.origin && (url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/assets/"));
        });
        for (const url of resources) fetch(url).catch(() => {});
      }).catch(() => { /* Saved records still work in an open app. */ });
    }
  }, []);
  return null;
}
