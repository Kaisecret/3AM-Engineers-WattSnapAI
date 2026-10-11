import { createHash, timingSafeEqual } from "node:crypto";
import type { FetchedPost, PostImage, PostPage } from "../../lib/apify/facebook-posts";
import { mentionsOutage, readAdvisoryReading } from "../../lib/gemini/advisory-reading";
import { feedProvider, feedRecord } from "./provider-feed";
import { manilaDay, sampleMatchHousehold } from "./review-preview";
import type { AdvisoryDetails } from "./types";

/**
 * Collects the provider's Facebook posts and turns the advisories among them into rows the app
 * can show. A run has two stages joined by the database:
 *   fetch  ask Apify for posts not seen yet and store every one as a queued row
 *   read   take queued rows from the database and read each with Gemini
 * Everything outside this file (Apify, Gemini, the database, the clock) is passed in, so the
 * rules here are tested without any of them.
 */
export type IngestTrigger = "email" | "cron" | "manual";
/** A stretch of time whose posts have not all been fetched yet. `limit` is set only while a page of the usual size cannot get past posts that share one time. */
export interface PendingRange { from: string; until: string; limit?: number }
export interface CrawlState { ranges: PendingRange[]; lastBacklogCall: boolean }
/** `imageCount` is how many images the post has, including ones whose link cannot be used. */
export interface PostSource { caption: string; imageUrls: string[]; imageText: string; imageCount: number }
export interface QueuedPost { id: string; url: string; postedAt: string; status: "queued" | "failed" | "reading"; attempts: number; source: PostSource }
export type PostOutcome =
  | { status: "published"; details: AdvisoryDetails; originalText: string; readFromImages: boolean; model: string }
  | { status: "ignored" }
  | { status: "failed"; failure: string };
export interface RunResult { outcome: "ok" | "failed" | "skipped"; fetched: number; inserted: number; detected: number; queuedLeft: number; error: string | null }

export interface IngestStore {
  /** Runs that really started (skipped ones do not count): the latest start, and how many since `since`. */
  runStats(provider: string, since: string): Promise<{ lastStartedAt: string | null; startedSince: number }>;
  startRun(provider: string, trigger: IngestTrigger): Promise<number>;
  finishRun(runId: number, result: RunResult): Promise<void>;
  /** Takes the crawl lease. Null while another run holds it. */
  claim(provider: string, owner: string, seconds: number): Promise<CrawlState | null>;
  release(provider: string, owner: string): Promise<void>;
  /** When the latest successful fetch of new posts began, or null if there has been none. */
  lastFreshStartedAt(provider: string): Promise<string | null>;
  newestPostedAt(provider: string): Promise<string | null>;
  /** One transaction: the page's posts and the new ranges. Throws when the lease is no longer held. `freshStartedAt` is set for a page of new posts. */
  storeBatch(provider: string, owner: string, posts: FetchedPost[], ranges: PendingRange[], backlogCall: boolean, freshStartedAt: string | null): Promise<number>;
  /** Rows waiting to be read, newest first: queued, failed, or left in `reading` since before `staleBefore`; under 3 attempts. */
  readable(provider: string, staleBefore: string, limit: number): Promise<QueuedPost[]>;
  /** Counts the attempt and marks the row as being read, only if nobody else has since. */
  reserve(post: QueuedPost, staleBefore: string): Promise<boolean>;
  finishPost(id: string, outcome: PostOutcome): Promise<void>;
  /** Posts not finished yet: queued, being read, or failed with attempts left. */
  countWaiting(provider: string): Promise<number>;
  prune(provider: string): Promise<void>;
}
export interface IngestDeps {
  store: IngestStore;
  now(): Date;
  newId(): string;
  fetchPosts(query: { newerThan: string; olderThan?: string; limit: number; timeoutMs: number }): Promise<PostPage>;
  /** The images that could be downloaded; empty when none could. */
  loadImages(urls: string[]): Promise<PostImage[]>;
  askModel(post: { caption: string; postedAt: string; imageText: string }, images: PostImage[]): Promise<{ raw: unknown; model: string }>;
  /** How long one run may work, in milliseconds. */
  budgetMs: number;
}
export interface AdmittedRun { runId: number; owner: string; trigger: IngestTrigger; state: CrawlState; startedAt: number }
export type Admission =
  | { status: 202; accepted: true; run: AdmittedRun }
  /** New posts were already fetched after the signal arrived: nothing to do, and the signal is done. */
  | { status: 200; accepted: false; served: true; retry: false }
  | { status: 409; accepted: false; retry: true; reason: "busy" | "too-soon" }
  | { status: 429; accepted: false; retry: false; reason: "daily-limit" };

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
export const pageSize = 30, maxPageSize = 480, maxRanges = 5, maxAttempts = 3, maxImages = 3;
export const minGapMs = 2 * MINUTE, dailyRuns = 30, leaseSeconds = 360;
/**
 * The fresh call reaches this far behind the newest stored post, to catch posts that appeared late.
 * Known limit: if 30 or more posts lie inside this window, a post that appears late beneath them is
 * not seen, because the page fills with newer posts already stored. ANTECO posts a few times a day.
 */
const overlapMs = 6 * HOUR, firstRunMs = 7 * DAY;
/** Ranges overlap by this much instead of touching, so posts that share a boundary time are not skipped. */
const boundaryMs = 1000;
const maxCallMs = 110_000, callMarginMs = 8000, minCallMs = 15_000, staleReadingMs = 10 * MINUTE, readLimit = 100;
/**
 * Shares of the run's budget: no second Apify call after 100 s of 240 s, no new read after 200 s.
 * A read takes at most about 55 s (images 10 s, Gemini 40 s, saving), so one started at 200 s
 * ends by about 255 s, inside the function's 300 s limit.
 */
const secondCallShare = 100 / 240, readShare = 200 / 240;

/** 80% of the function's limit, leaving room for the last read to finish and the run to be recorded. */
export const ingestBudgetMs = (maxDurationSeconds: number) => maxDurationSeconds * 800;

/** 200 when the bearer matches, 401 when it does not, 503 when no usable secret is configured. */
export function ingestAuthorization(header: string | null, secret: string | undefined): 200 | 401 | 503 {
  const expected = secret?.trim();
  if (!expected || expected.length < 16) return 503;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return header !== null && timingSafeEqual(digest(header), digest(`Bearer ${expected}`)) ? 200 : 401;
}

const time = (iso: string) => Date.parse(iso);
const iso = (ms: number) => new Date(ms).toISOString();
const reason = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 200);
const newestRange = (ranges: PendingRange[]) => ranges.reduce((newest, range) => (time(range.until) > time(newest.until) ? range : newest));
const nothing = { fetched: 0, inserted: 0, detected: 0, queuedLeft: 0 };

/** Adds a range. Beyond five, the two oldest become one wider range, which can only fetch more. */
export function addRange(ranges: PendingRange[], range: PendingRange): PendingRange[] {
  if (!(time(range.from) < time(range.until))) return ranges;
  const list = [...ranges, range].sort((a, b) => time(a.until) - time(b.until));
  while (list.length > maxRanges) {
    const [a, b] = list.splice(0, 2);
    list.unshift({ from: iso(Math.min(time(a.from), time(b.from))), until: iso(Math.max(time(a.until), time(b.until))) });
  }
  return list;
}

/**
 * Decides whether a signal starts a run.
 *
 * `since` is when the signal arose (when the notification email arrived). The signal is served
 * once new posts have been fetched by a call that began after that and no fetched post is still
 * waiting to be read. Until then the caller is expected to keep sending it: an accepted run may
 * fail, may spend its time on backlog, or may run out of time before reading everything. Each
 * repeat can start another run, which reads what is left.
 *
 * The spend limits are checked while holding the crawl lease, so two signals cannot both pass them.
 */
export async function admitRun(deps: IngestDeps, trigger: IngestTrigger, since?: string | null): Promise<Admission> {
  const { store } = deps, now = deps.now();
  if (since && Number.isFinite(time(since))) {
    const fresh = await store.lastFreshStartedAt(feedProvider);
    if (fresh && time(fresh) >= time(since) && (await store.countWaiting(feedProvider)) === 0) return { status: 200, accepted: false, served: true, retry: false };
  }
  const owner = deps.newId(), state = await store.claim(feedProvider, owner, leaseSeconds);
  if (!state) {
    await store.finishRun(await store.startRun(feedProvider, trigger), { ...nothing, outcome: "skipped", error: "Another run holds the crawl lease." });
    return { status: 409, accepted: false, retry: true, reason: "busy" };
  }
  try {
    const stats = await store.runStats(feedProvider, iso(time(`${manilaDay(now)}T00:00:00+08:00`)));
    const refusal: Admission | null = stats.startedSince >= dailyRuns ? { status: 429, accepted: false, retry: false, reason: "daily-limit" }
      : stats.lastStartedAt && now.getTime() - time(stats.lastStartedAt) < minGapMs ? { status: 409, accepted: false, retry: true, reason: "too-soon" } : null;
    if (refusal) { await store.release(feedProvider, owner); return refusal; }
    return { status: 202, accepted: true, run: { runId: await store.startRun(feedProvider, trigger), owner, trigger, state, startedAt: now.getTime() } };
  } catch (error) {
    await store.release(feedProvider, owner).catch(() => undefined);
    throw error;
  }
}

/**
 * Reads one stored post. Never decides from missing evidence: a post that has images none of
 * which can be loaded, or an answer from the model that is not an answer, is a failure to be
 * retried, not "not an advisory".
 */
export async function readPost(deps: IngestDeps, post: QueuedPost): Promise<PostOutcome> {
  const { caption, imageUrls, imageText, imageCount } = post.source, hasImages = imageCount > 0 || imageUrls.length > 0;
  if (!hasImages && !mentionsOutage(caption)) return { status: "ignored" };
  try {
    const images = imageUrls.length ? await deps.loadImages(imageUrls.slice(0, maxImages)) : [];
    if (hasImages && !images.length) return { status: "failed", failure: "images-unavailable" };
    const { raw, model } = await deps.askModel({ caption, postedAt: post.postedAt, imageText }, images);
    const reading = readAdvisoryReading(raw, { url: post.url, text: caption });
    if (!reading.isAdvisory || !reading.details) return { status: "ignored" };
    // Publish only what the app itself accepts as a saved advisory.
    const row = { id: post.id, post_url: post.url, posted_at: post.postedAt, details: reading.details, original_text: reading.originalText, read_from_images: reading.readFromImages };
    if (!feedRecord(row, sampleMatchHousehold, deps.now())) return { status: "failed", failure: "not-a-saveable-record" };
    return { status: "published", details: reading.details, originalText: reading.originalText, readFromImages: reading.readFromImages, model };
  } catch (error) {
    return { status: "failed", failure: reason(error) };
  }
}

/** The fetch stage: at most two Apify calls, each stored together with the range change it caused. */
async function fetchStage(deps: IngestDeps, run: AdmittedRun, result: RunResult) {
  const { store } = deps, elapsed = () => deps.now().getTime() - run.startedAt;
  let ranges = run.state.ranges, ranBacklog = false, calls = 0;
  // A pending range goes first on every second run, so it is worked on even when only one call
  // fits in a run. A notification whose run went to the backlog stays unserved and is sent again.
  const backlogFirst = ranges.length > 0 && !run.state.lastBacklogCall;
  for (const kind of backlogFirst ? ["backlog", "fresh"] as const : ["fresh", "backlog"] as const) {
    if (kind === "backlog" && !ranges.length) continue;
    if (calls > 0 && elapsed() >= deps.budgetMs * secondCallShare) break;
    const timeoutMs = Math.min(maxCallMs, deps.budgetMs - elapsed() - callMarginMs);
    if (timeoutMs < minCallMs) break;
    let page: PostPage, next: PendingRange[], freshStartedAt: string | null = null;
    if (kind === "fresh") {
      const newest = await store.newestPostedAt(feedProvider);
      const from = newest ? iso(time(newest)) : iso(deps.now().getTime() - firstRunMs);
      freshStartedAt = deps.now().toISOString();
      page = await deps.fetchPosts({ newerThan: newest ? iso(time(newest) - overlapMs) : from, limit: pageSize, timeoutMs });
      const oldest = page.posts.at(-1);
      // Posts were cut off only if the page is full and still ends above the newest post already
      // stored. A full page that reaches known ground gives an empty range, which addRange refuses,
      // so the pending ranges are left exactly as they are.
      next = page.full && oldest ? addRange(ranges, { from, until: oldest.postedAt }) : ranges;
    } else {
      const range = newestRange(ranges), limit = range.limit ?? pageSize;
      page = await deps.fetchPosts({ newerThan: range.from, olderThan: iso(time(range.until) + boundaryMs), limit, timeoutMs });
      const oldest = page.posts.at(-1), rest = ranges.filter(item => item !== range);
      // Not full: the range is complete. Full and further down: continue below the oldest post next
      // time, at the usual page size. Full but no further down: more posts share the boundary time
      // than one page holds, so the next call asks for twice as many until it gets past them.
      next = !page.full || !oldest ? rest
        : time(oldest.postedAt) < time(range.until) ? [...rest, { from: range.from, until: oldest.postedAt }]
        : [...rest, { from: range.from, until: range.until, limit: Math.min(limit * 2, maxPageSize) }];
      ranBacklog = true;
    }
    result.inserted += await store.storeBatch(feedProvider, run.owner, page.posts, next, ranBacklog, freshStartedAt);
    result.fetched += page.posts.length;
    ranges = next; calls += 1;
  }
}

/** The read stage: works from the database, newest first, until the budget is used. A row that fails is retried by a later run. */
async function readStage(deps: IngestDeps, run: AdmittedRun, result: RunResult) {
  const { store } = deps, staleBefore = iso(deps.now().getTime() - staleReadingMs);
  for (const post of await store.readable(feedProvider, staleBefore, readLimit)) {
    if (deps.now().getTime() - run.startedAt >= deps.budgetMs * readShare) break;
    if (post.attempts >= maxAttempts || !(await store.reserve(post, staleBefore))) continue;
    const outcome = await readPost(deps, post);
    await store.finishPost(post.id, outcome);
    if (outcome.status === "published") result.detected += 1;
  }
}

/** One admitted run. Always releases the lease after fetching and always records how it went. */
export async function runIngestion(deps: IngestDeps, run: AdmittedRun): Promise<RunResult> {
  const { store } = deps, result: RunResult = { ...nothing, outcome: "ok", error: null };
  const failed = (stage: string, error: unknown) => { result.outcome = "failed"; result.error ??= `${stage}: ${reason(error)}`.slice(0, 500); };
  try { await fetchStage(deps, run, result); }
  catch (error) { failed("fetch", error); }
  // Reading is protected per post, so the lease is given back before it starts.
  try { await store.release(feedProvider, run.owner); }
  catch (error) { failed("release", error); }
  try {
    await readStage(deps, run, result);
    result.queuedLeft = await store.countWaiting(feedProvider);
    await store.prune(feedProvider);
  } catch (error) { failed("read", error); }
  await store.finishRun(run.runId, result);
  return result;
}
