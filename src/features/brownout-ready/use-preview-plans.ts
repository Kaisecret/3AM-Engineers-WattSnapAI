"use client";
import { useEffect, useState } from "react";
import { usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { brownoutStorageKey, normalizeBrownoutPlan } from "./calculations";
import type { BrownoutPreviewPlan } from "./types";

export function usePreviewPlans() {
  const storageKey = usePreviewStorageKey(brownoutStorageKey);
  const [plans, setPlans] = useState<BrownoutPreviewPlan[]>([]), [ready, setReady] = useState(false), [error, setError] = useState(""), [loadError, setLoadError] = useState(false);
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(storageKey), parsed: unknown = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length > 20) throw new Error("Invalid plans");
        const next = parsed.map(normalizeBrownoutPlan);
        if (next.some(plan => !plan) || new Set(next.map(plan => plan!.id)).size !== next.length) throw new Error("Invalid plan");
        setPlans(next as BrownoutPreviewPlan[]); setError(""); setLoadError(false);
      } catch { setLoadError(true); setError("Saved preparation plans could not be opened. Browser data is unchanged. Retry loading before saving changes."); }
      setReady(true);
    }
    read(); const storage = (event: StorageEvent) => { if (event.key === storageKey) read(); };
    window.addEventListener("storage", storage); window.addEventListener("wattsnap-brownout-change", read);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener("wattsnap-brownout-change", read); };
  }, [storageKey]);
  function write(next: BrownoutPreviewPlan[]) {
    if (loadError) return false;
    if (next.length > 20) { setError("This browser preview holds up to 20 plans. Remove an older plan before adding another."); return false; }
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setPlans(next); setError(""); window.dispatchEvent(new Event("wattsnap-brownout-change")); return true; }
    catch { setError("This change could not be saved. Browser storage may be full or blocked. Your earlier plan and checklist are unchanged."); return false; }
  }
  return { plans: plans.filter(plan => plan.advisory.original.kind !== "sample"), ready, error, loadError, save: (plan: BrownoutPreviewPlan) => write(plans.some(item => item.id === plan.id) ? plans.map(item => item.id === plan.id ? plan : item) : [...plans, plan]), remove: (id: string) => write(plans.filter(plan => plan.id !== id)), reload: () => window.dispatchEvent(new Event("wattsnap-brownout-change")) };
}
