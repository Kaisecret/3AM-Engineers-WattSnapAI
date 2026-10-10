"use client";
import { useEffect, useRef, useState } from "react";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { brownoutStorageKey, normalizeBrownoutPlan } from "./calculations";
import type { BrownoutPreviewPlan } from "./types";

export function usePreviewPlans() {
  const storageKey = usePreviewStorageKey(brownoutStorageKey);
  const [plans, setPlans] = useState<BrownoutPreviewPlan[]>([]), [loadedKey, setLoadedKey] = useState<string | null>(null), [error, setError] = useState(""), [loadError, setLoadError] = useState(false);
  const ready = loadedKey === storageKey;
  const stored = useRef<string | null>(null);
  useEffect(() => {
    function read() {
      try { if (previewStorageFor(brownoutStorageKey) !== storageKey) { setLoadedKey(null); return; }
      stored.current = localStorage.getItem(storageKey);
        const raw = localStorage.getItem(storageKey), parsed: unknown = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length > 20) throw new Error("Invalid plans");
        const next = parsed.map(normalizeBrownoutPlan);
        if (next.some(plan => !plan) || new Set(next.map(plan => plan!.id)).size !== next.length) throw new Error("Invalid plan");
        setPlans(next as BrownoutPreviewPlan[]); setError(""); setLoadError(false);
      } catch { setPlans([]); setLoadError(true); setError("Saved preparation plans could not be opened. Browser data is unchanged. Retry loading before saving changes."); }
      setLoadedKey(storageKey);
    }
    read(); const storage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
    window.addEventListener("storage", storage); window.addEventListener("wattsnap-brownout-change", read);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener("wattsnap-brownout-change", read); };
  }, [storageKey]);
  function write(next: BrownoutPreviewPlan[]) {
    if (!ready || loadError) return false;
    if (next.length > 20) { setError("This browser holds up to 20 plans. Remove an older plan before adding another."); return false; }
    try { if (previewStorageFor(brownoutStorageKey) !== storageKey || localStorage.getItem(storageKey) !== stored.current) throw new Error("Household or saved records changed; reload before saving."); localStorage.setItem(storageKey, JSON.stringify(next)); stored.current = JSON.stringify(next); setPlans(next); setError(""); window.dispatchEvent(new Event("wattsnap-brownout-change")); return true; }
    catch { setError("This change could not be saved. Browser storage may be full or blocked. Your earlier plan and checklist are unchanged."); return false; }
  }
  return { plans: ready ? plans.filter(plan => plan.advisory.original.kind !== "sample") : [], ready, error, loadError, save: (plan: BrownoutPreviewPlan) => write(plans.some(item => item.id === plan.id) ? plans.map(item => item.id === plan.id ? plan : item) : [...plans, plan]), remove: (id: string) => write(plans.filter(plan => plan.id !== id)), reload: () => window.dispatchEvent(new Event("wattsnap-brownout-change")) };
}
