"use client";
import { useEffect, useState } from "react";
import { isDeviceOffline } from "@/features/offline-access/connectivity";
export default function OfflineSupport() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(isDeviceOffline());
    const navigate = (event: MouseEvent) => {
      if (!isDeviceOffline() || !navigator.serviceWorker?.controller || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
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
      let active = true, preparedWorker: ServiceWorker | null = null;
      const ports = new Set<MessagePort>();
      const prepare = (retry = false) => {
        const controller = navigator.serviceWorker.controller;
        if (!active || !controller || (!retry && preparedWorker === controller)) return;
        preparedWorker = controller;
        // Warm artwork that may have loaded before the worker took control.
        const resources = performance.getEntriesByType("resource").map(entry => entry.name).filter(name => {
          const url = new URL(name); return url.origin === location.origin && (url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/assets/"));
        });
        for (const url of resources) fetch(url).catch(() => {});
        const channel = new MessageChannel();
        ports.add(channel.port1);
        channel.port1.onmessage = event => {
          if (active && controller === navigator.serviceWorker.controller) {
            document.documentElement.dataset.offlineReady = event.data?.ready ? "true" : "false";
            window.dispatchEvent(new Event("wattsnap-offline-ready"));
          }
          channel.port1.close();
          ports.delete(channel.port1);
        };
        controller.postMessage({type:"PREPARE_OFFLINE"}, [channel.port2]);
      };
      const changed = () => prepare();
      const reconnected = () => prepare(true);
      navigator.serviceWorker.addEventListener("controllerchange", changed);
      window.addEventListener("online", reconnected);
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(() => navigator.serviceWorker.ready).then(() => prepare()).catch(() => { /* Saved records still work in an open app. */ });
      return () => {
        active = false;
        navigator.serviceWorker.removeEventListener("controllerchange", changed);
        window.removeEventListener("online", reconnected);
        ports.forEach(port => port.close());
      };
    }
  }, []);
  return offline ? <div className="ws-connectivity" role="status">You’re offline. Saved records and local calculations remain available on this device. <button type="button" onClick={() => location.reload()}>Try connection</button></div> : null;
}
