"use client";
import { useEffect, useRef } from "react";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { feedImports } from "../provider-feed";
import { usePreviewAdvisories } from "../use-preview-advisories";
import { useProviderAdvisories } from "../use-provider-advisories";

const savedLimit = 100;

/**
 * Saves the provider's advisories that list, or may list, this household's area into its saved
 * advisories, so they appear on Home and in Advisories without the person adding them. Mounted
 * once for every signed-in page. Renders nothing.
 */
export default function ProviderFeedSync() {
  const { household, ready: householdReady } = usePreviewHousehold(), saved = usePreviewAdvisories(), feed = useProviderAdvisories();
  const attempted = useRef("");
  const savedIds = saved.records.map(record => record.id).join(",");
  useEffect(() => {
    if (!householdReady || !saved.ready || saved.loadError || feed.status !== "ready" || !feed.dismissed) return;
    // Samples count toward the saved limit but are not in `records`.
    const picked = feedImports(feed.rows, saved.records, feed.dismissed, household, new Date(), savedLimit - (saved.total - saved.records.length));
    // A save that failed (storage full or blocked) is not repeated on every render, but is tried
    // again once the saved records change, for example after one is removed to make room.
    const signature = `${picked.map(record => record.id).join(",")}|${saved.total}|${savedIds}`;
    if (!picked.length || attempted.current === signature) return;
    attempted.current = signature;
    saved.saveMany(picked);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saved is a new object each render; its ids and readiness are listed.
  }, [householdReady, household, saved.ready, saved.loadError, saved.total, savedIds, feed.status, feed.rows, feed.dismissed]);
  return null;
}
