import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { facebookImageUrl } from "@/lib/apify/facebook-posts";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { maxAttempts, maxPageSize, pageSize, type CrawlState, type IngestStore, type PendingRange, type PostSource, type QueuedPost } from "./ingest";

/**
 * Provider advisory tables, reached with the secret key. Only the ingestion run uses this file;
 * the app reads published rows in the browser under row-level security.
 */

// ponytail: untyped client. The generated database types do not list these tables until they are
// regenerated after the migration is applied to wattsnap-dev (docs/13). Then use getAdminSupabase() directly.
const db = () => getAdminSupabase() as unknown as SupabaseClient;

function data<T>(result: { data: T | null; error: { message: string } | null }, action: string): T {
  if (result.error) throw new Error(`${action}: ${result.error.message}`);
  return result.data as T;
}
const realRuns = "outcome.is.null,outcome.neq.skipped";
const isoTime = (value: unknown) => (typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null);

function rangesFrom(value: unknown): PendingRange[] {
  return (Array.isArray(value) ? value : []).flatMap(item => {
    const range = item as PendingRange | null, from = isoTime(range?.from), until = isoTime(range?.until);
    const limit = Number.isInteger(range?.limit) && range!.limit! > pageSize ? Math.min(range!.limit!, maxPageSize) : undefined;
    return from && until ? [{ from, until, ...(limit ? { limit } : {}) }] : [];
  });
}
function sourceFrom(value: unknown): PostSource {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  // Checked again on the way out: only fbcdn.net links are ever downloaded.
  const imageUrls = (Array.isArray(source.imageUrls) ? source.imageUrls : []).flatMap(link => facebookImageUrl(link) ?? []);
  return {
    caption: typeof source.caption === "string" ? source.caption : "",
    imageUrls,
    imageText: typeof source.imageText === "string" ? source.imageText : "",
    imageCount: Number.isInteger(source.imageCount) && (source.imageCount as number) > 0 ? source.imageCount as number : imageUrls.length,
  };
}

export const advisoryStore: IngestStore = {
  async runStats(provider, since) {
    const runs = () => db().from("provider_advisory_runs").select("started_at", { count: "exact" }).eq("provider_id", provider).or(realRuns);
    const latest = data<{ started_at: string }[]>(await runs().order("started_at", { ascending: false }).limit(1), "read runs");
    const today = await runs().gte("started_at", since).limit(1);
    data(today, "count runs");
    return { lastStartedAt: isoTime(latest[0]?.started_at), startedSince: today.count ?? 0 };
  },
  async startRun(provider, trigger) {
    return data<{ id: number }>(await db().from("provider_advisory_runs").insert({ provider_id: provider, trigger }).select("id").single(), "start run").id;
  },
  async finishRun(runId, result) {
    data(await db().from("provider_advisory_runs").update({
      finished_at: new Date().toISOString(), outcome: result.outcome, fetched: result.fetched, detected: result.detected,
      inserted: result.inserted, queued_left: result.queuedLeft, error: result.error?.slice(0, 500) ?? null,
    }).eq("id", runId), "finish run");
  },
  async claim(provider, owner, seconds): Promise<CrawlState | null> {
    const rows = data<{ pending_ranges: unknown; last_backlog_call: boolean }[]>(await db().rpc("claim_advisory_crawl", { p_provider: provider, p_owner: owner, p_seconds: seconds }), "claim crawl lease");
    return rows.length ? { ranges: rangesFrom(rows[0].pending_ranges), lastBacklogCall: rows[0].last_backlog_call === true } : null;
  },
  async release(provider, owner) {
    data(await db().from("provider_advisory_state").update({ lease_owner: null, lease_until: null }).eq("provider_id", provider).eq("lease_owner", owner), "release crawl lease");
  },
  async lastFreshStartedAt(provider) {
    const rows = data<{ last_fresh_started_at: string | null }[]>(await db().from("provider_advisory_state").select("last_fresh_started_at").eq("provider_id", provider).limit(1), "read crawl state");
    return isoTime(rows[0]?.last_fresh_started_at);
  },
  async newestPostedAt(provider) {
    const rows = data<{ posted_at: string }[]>(await db().from("provider_advisories").select("posted_at").eq("provider_id", provider).order("posted_at", { ascending: false }).limit(1), "read newest post");
    return isoTime(rows[0]?.posted_at);
  },
  async storeBatch(provider, owner, posts, ranges, backlogCall, freshStartedAt) {
    return data<number>(await db().rpc("store_advisory_batch", {
      p_provider: provider, p_owner: owner, p_ranges: ranges, p_backlog_call: backlogCall, p_fresh_started_at: freshStartedAt,
      p_posts: posts.map(post => ({ id: post.id, url: post.url, posted_at: post.postedAt, source: { caption: post.text, imageUrls: post.imageUrls, imageText: post.imageText, imageCount: post.imageCount } })),
    }), "store fetched posts");
  },
  async readable(provider, staleBefore, limit) {
    const rows = data<{ id: string; post_url: string; posted_at: string; status: QueuedPost["status"]; attempts: number; source: unknown }[]>(
      await db().from("provider_advisories").select("id, post_url, posted_at, status, attempts, source").eq("provider_id", provider).lt("attempts", maxAttempts)
        .or(`status.in.(queued,failed),and(status.eq.reading,updated_at.lt."${staleBefore}")`).order("posted_at", { ascending: false }).limit(limit),
      "read waiting posts");
    return rows.map(row => ({ id: row.id, url: row.post_url, postedAt: isoTime(row.posted_at) ?? row.posted_at, status: row.status, attempts: row.attempts, source: sourceFrom(row.source) }));
  },
  async reserve(post, staleBefore) {
    // Compare-and-swap: the update matches only if the row is exactly as it was read.
    let update = db().from("provider_advisories").update({ attempts: post.attempts + 1, status: "reading" }).eq("id", post.id).eq("attempts", post.attempts).eq("status", post.status);
    if (post.status === "reading") update = update.lt("updated_at", staleBefore);
    return data<{ id: string }[]>(await update.select("id"), "reserve post").length === 1;
  },
  async finishPost(id, outcome) {
    const change = outcome.status === "published"
      ? { status: "published", details: outcome.details, original_text: outcome.originalText, read_from_images: outcome.readFromImages, model: outcome.model.slice(0, 80), failure: null }
      : outcome.status === "failed" ? { status: "failed", failure: outcome.failure.slice(0, 200) } : { status: "ignored", failure: null };
    data(await db().from("provider_advisories").update(change).eq("id", id), "save reading");
  },
  async countWaiting(provider) {
    const waiting = await db().from("provider_advisories").select("id", { count: "exact", head: true }).eq("provider_id", provider).or(`status.in.(queued,reading),and(status.eq.failed,attempts.lt.${maxAttempts})`);
    data(waiting, "count waiting posts");
    return waiting.count ?? 0;
  },
  async prune(provider) {
    data(await db().rpc("prune_provider_advisories", { p_provider: provider }), "prune");
  },
};
