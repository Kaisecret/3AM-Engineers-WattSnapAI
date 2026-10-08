"use client";
import { useEffect, useState } from "react";
import { usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { normalizeScenarios, scenariosStorageKey } from "./calculations";
import type { PreviewScenario } from "./types";

export function usePreviewScenarios() {
  const storageKey = usePreviewStorageKey(scenariosStorageKey);
  const [scenarios, setScenarios] = useState<PreviewScenario[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(storageKey);
        const data = raw === null ? [] : JSON.parse(raw);
        const normalized = normalizeScenarios(data); setScenarios(normalized);
        setError(!Array.isArray(data) || data.length !== normalized.length ? "Some saved scenario previews could not be read. You can create and save a new scenario." : "");
      } catch { setError("Saved scenarios could not be opened in this browser. You can still run a local comparison."); }
      setReady(true);
    }
    read(); const sync = (event: StorageEvent) => { if (event.key === storageKey) read(); };
    window.addEventListener("storage", sync); window.addEventListener("wattsnap-scenario-change", read);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("wattsnap-scenario-change", read); };
  }, [storageKey]);
  function write(next: PreviewScenario[]) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setScenarios(next); setError(""); window.dispatchEvent(new Event("wattsnap-scenario-change")); return true; }
    catch { setError("Your scenario could not be saved in this browser. Your comparison is still available on this page."); return false; }
  }
  function save(scenario: PreviewScenario) {
    return write(scenarios.some(item => item.id === scenario.id) ? scenarios.map(item => item.id === scenario.id ? scenario : item) : [...scenarios, scenario]);
  }
  function remove(id: string) { return write(scenarios.filter(item => item.id !== id)); }
  return { scenarios, ready, error, save, remove };
}
