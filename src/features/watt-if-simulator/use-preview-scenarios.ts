"use client";
import { useEffect, useRef, useState } from "react";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { normalizeScenarios, scenariosStorageKey } from "./calculations";
import type { PreviewScenario } from "./types";

export function usePreviewScenarios() {
  const storageKey = usePreviewStorageKey(scenariosStorageKey);
  const [scenarios, setScenarios] = useState<PreviewScenario[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState("");
  const ready = loadedKey === storageKey;
  const stored = useRef<string | null>(null);
  useEffect(() => {
    function read() {
      try { if (previewStorageFor(scenariosStorageKey) !== storageKey) { setLoadedKey(null); return; }
      stored.current = localStorage.getItem(storageKey);
        const raw = localStorage.getItem(storageKey);
        const data = raw === null ? [] : JSON.parse(raw);
        const normalized = normalizeScenarios(data); if (!Array.isArray(data) || data.length !== normalized.length) throw new Error("Invalid saved scenarios"); setScenarios(normalized); setLoadError(false);
        setError(!Array.isArray(data) || data.length !== normalized.length ? "Some saved scenarios could not be read. Existing data is unchanged." : "");
      } catch { setScenarios([]); setLoadError(true); setError("Saved scenarios could not be opened. Existing data is unchanged. You can run a comparison without saving."); }
      setLoadedKey(storageKey);
    }
    read(); const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
    window.addEventListener("storage", sync); window.addEventListener("wattsnap-scenario-change", read);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("wattsnap-scenario-change", read); };
  }, [storageKey]);
  function write(next: PreviewScenario[]) {
    if (!ready || loadError) return false;
    try { if (previewStorageFor(scenariosStorageKey) !== storageKey || localStorage.getItem(storageKey) !== stored.current) throw new Error("Household or saved records changed; reload before saving."); localStorage.setItem(storageKey, JSON.stringify(next)); stored.current = JSON.stringify(next); setScenarios(next); setError(""); window.dispatchEvent(new Event("wattsnap-scenario-change")); return true; }
    catch { setError("Your scenario could not be saved in this browser. Your comparison is still available on this page."); return false; }
  }
  function save(scenario: PreviewScenario) {
    return write(scenarios.some(item => item.id === scenario.id) ? scenarios.map(item => item.id === scenario.id ? scenario : item) : [...scenarios, scenario]);
  }
  function remove(id: string) { return write(scenarios.filter(item => item.id !== id)); }
  return { scenarios: ready ? scenarios.filter(item => item.origin !== "sample") : [], ready, error, save, remove };
}
