"use client";
import { useEffect, useState } from "react";
export default function OfflineReadiness() {
  const [ready,setReady]=useState<boolean|null>(null);
  useEffect(()=>{
    let active=true;
    const check=()=>{if("caches" in window) caches.match("/offline-app").then(value=>{if(active)setReady(value?.headers.get("X-WattSnap-Offline-Artwork")==="1");}).catch(()=>{if(active)setReady(false);});};
    check();window.addEventListener("wattsnap-offline-ready",check);
    return()=>{active=false;window.removeEventListener("wattsnap-offline-ready",check);};
  },[]);
  return <small role="status">{ready ? "Ready offline · saved screens, pictures and local chat are available." : ready===false ? "Saving the app and pictures for offline use. Stay online until it is ready; saved records remain on this device." : "Checking offline readiness…"}</small>;
}
