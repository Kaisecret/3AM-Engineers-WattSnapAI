import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { addRange, admitRun, ingestAuthorization, ingestBudgetMs, runIngestion } = await import("./ingest.ts");
const { feedRecord } = await import("./provider-feed.ts");
const { sampleMatchHousehold: home } = await import("./review-preview.ts");
const { getBarangaysForMunicipality } = await import("../household-profile/philippine-locations.ts");

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
const T0 = Date.parse("2026-10-11T00:00:00Z"); // 08:00 in Manila
const iso = ms => new Date(ms).toISOString();
const advisory = (fields = {}) => ({
  isAdvisory: true, type: "scheduled", title: "Scheduled Power Interruption", date: "2026-10-14", startTime: "08:00", endDate: "", endTime: "17:00", expectedRestoration: "",
  areaText: "Brgy. Payao, San Jose de Buenavista", areas: [{ municipality: "San Jose", barangay: "Payao", coverage: "barangay" }], reason: "Line maintenance", imageText: "", ...fields,
});

/** A pretend Facebook page, Apify, Gemini and database that follow the same rules as the real ones. */
function world({ budgetMs = ingestBudgetMs(300) } = {}) {
  const clock = { ms: T0 }, page = [], calls = [], rows = new Map(), runs = [], asked = [], batches = [];
  const crawl = { ranges: [], lastBacklogCall: false, freshStartedAt: null, owner: null, until: 0 };
  const apify = { delayMs: 1000, fail: null }, model = { delayMs: 1000, answer: post => advisory(), during: null }, hooks = { beforeStore: null, duringStats: null, release: true };
  let ids = 0;
  const row = id => [...rows.values()].find(item => item.id === id);
  const store = {
    async runStats(_provider, since) { if (hooks.duringStats) await hooks.duringStats(); const real = runs.filter(run => run.outcome !== "skipped"); return { lastStartedAt: real.at(-1)?.startedAt ?? null, startedSince: real.filter(run => run.startedAt >= since).length }; },
    async startRun(_provider, trigger) { runs.push({ trigger, startedAt: iso(clock.ms), outcome: null }); return runs.length; },
    async finishRun(id, result) { Object.assign(runs[id - 1], result, { finishedAt: iso(clock.ms) }); },
    async claim(_provider, owner, seconds) { if (crawl.owner && crawl.until > clock.ms) return null; crawl.owner = owner; crawl.until = clock.ms + seconds * 1000; return { ranges: structuredClone(crawl.ranges), lastBacklogCall: crawl.lastBacklogCall }; },
    async release(_provider, owner) { if (hooks.release && crawl.owner === owner) { crawl.owner = null; crawl.until = 0; } },
    async lastFreshStartedAt() { return crawl.freshStartedAt; },
    async newestPostedAt() { return [...rows.values()].map(item => item.postedAt).sort().at(-1) ?? null; },
    async storeBatch(_provider, owner, posts, ranges, backlogCall, freshStartedAt) {
      if (hooks.beforeStore) await hooks.beforeStore();
      if (crawl.owner !== owner || crawl.until <= clock.ms) throw new Error("advisory crawl lease is not held");
      let added = 0;
      for (const post of posts) {
        const source = { caption: post.text, imageUrls: post.imageUrls, imageText: post.imageText, imageCount: post.imageCount }, known = rows.get(post.id);
        if (!known) { rows.set(post.id, { id: `row-${post.id}`, postId: post.id, url: post.url, postedAt: post.postedAt, status: "queued", attempts: 0, source, updatedAt: clock.ms }); added += 1; }
        else if (["queued", "failed"].includes(known.status)) known.source = source;
      }
      crawl.ranges = structuredClone(ranges); crawl.lastBacklogCall = backlogCall; crawl.freshStartedAt = freshStartedAt ?? crawl.freshStartedAt;
      batches.push({ ranges: structuredClone(ranges), backlogCall, added });
      return added;
    },
    async readable(_provider, staleBefore, limit) {
      return [...rows.values()].filter(item => item.attempts < 3 && (["queued", "failed"].includes(item.status) || (item.status === "reading" && iso(item.updatedAt) < staleBefore)))
        .sort((a, b) => b.postedAt.localeCompare(a.postedAt)).slice(0, limit)
        .map(item => ({ id: item.id, url: item.url, postedAt: item.postedAt, status: item.status, attempts: item.attempts, source: structuredClone(item.source) }));
    },
    async reserve(post, staleBefore) {
      const item = row(post.id);
      if (item.attempts !== post.attempts || item.status !== post.status || (item.status === "reading" && iso(item.updatedAt) >= staleBefore)) return false;
      item.attempts += 1; item.status = "reading"; item.updatedAt = clock.ms; return true;
    },
    async finishPost(id, outcome) { Object.assign(row(id), outcome, { updatedAt: clock.ms }); },
    async countWaiting() { return [...rows.values()].filter(item => ["queued", "reading"].includes(item.status) || (item.status === "failed" && item.attempts < 3)).length; },
    async prune() {},
  };
  const deps = {
    store, budgetMs, now: () => new Date(clock.ms), newId: () => `owner-${++ids}`,
    async fetchPosts(query) {
      calls.push({ ...query }); clock.ms += apify.delayMs;
      if (apify.fail) throw new Error(apify.fail);
      const hits = page.filter(post => post.postedAt > query.newerThan && (!query.olderThan || post.postedAt < query.olderThan)).sort((a, b) => b.postedAt.localeCompare(a.postedAt));
      calls.at(-1).returned = hits.slice(0, query.limit).map(post => post.id);
      return { posts: structuredClone(hits.slice(0, query.limit)), full: hits.length >= query.limit };
    },
    async loadImages(urls) { return urls.filter(url => !url.includes("expired")).map(() => ({ mimeType: "image/jpeg", data: "AAAA" })); },
    async askModel(post, images) {
      asked.push({ caption: post.caption, images: images.length, imageText: post.imageText }); clock.ms += model.delayMs;
      if (model.during) await model.during(post);
      const answer = model.answer(post);
      if (answer instanceof Error) throw answer;
      return { raw: answer, model: "test-model" };
    },
  };
  /** Adds a post to the pretend page. `agoMs` is how long before T0 it was published. */
  const post = (id, agoMs, fields = {}) => { const item = { id, url: `https://www.facebook.com/antecoPH/posts/${id}`, postedAt: iso(T0 - agoMs), text: "Pay your bill at any branch.", imageUrls: [], imageText: "", ...fields }; item.imageCount = fields.imageCount ?? item.imageUrls.length; page.push(item); return item; };
  /** A trigger arrives: admit, and run if admitted. Returns the answer and, when it ran, the result. */
  async function trigger(kind = "email", since) { const admission = await admitRun(deps, kind, since); return admission.accepted ? { admission, result: await runIngestion(deps, admission.run) } : { admission }; }
  const later = (ms = 3 * MINUTE) => { clock.ms += ms; };
  const stored = () => [...rows.keys()].sort();
  return { clock, page, calls, rows, runs, asked, batches, crawl, apify, model, hooks, store, deps, post, trigger, later, stored };
}
const backlog = (w, count, spacingMs) => { for (let n = 1; n <= count; n += 1) w.post(`p${String(n).padStart(3, "0")}`, n * spacingMs); };
const allIds = w => w.page.map(item => item.id).sort();

test("the bearer secret is required, compared whole, and a missing secret closes the route", () => {
  const secret = "s".repeat(64);
  assert.equal(ingestAuthorization(`Bearer ${secret}`, secret), 200);
  assert.equal(ingestAuthorization(`Bearer ${secret}`, `  ${secret}\n`), 200);
  for (const header of [null, "", secret, `Bearer ${secret}x`, `Bearer ${secret.slice(1)}`, `bearer ${secret}`, "Bearer undefined"]) assert.equal(ingestAuthorization(header, secret), 401, String(header));
  for (const missing of [undefined, "", "   ", "short"]) assert.equal(ingestAuthorization(`Bearer ${missing}`, missing), 503, String(missing));
});

test("a run stores every fetched post, reads only what could be an advisory, and stores nothing twice", async () => {
  const w = world();
  w.post("bill", 4 * HOUR);
  w.post("outage", 3 * HOUR, { text: "SCHEDULED POWER INTERRUPTION on October 14 in Brgy. Payao, San Jose." });
  w.post("picture", 2 * HOUR, { text: "Please be guided.", imageUrls: ["https://scontent.xx.fbcdn.net/a.jpg"], imageText: "printed advisory" });
  w.model.answer = post => (post.caption.startsWith("Please") ? advisory({ isAdvisory: false }) : advisory());
  const first = await w.trigger("email");
  assert.equal(first.admission.status, 202);
  assert.deepEqual(first.result, { outcome: "ok", fetched: 3, inserted: 3, detected: 1, queuedLeft: 0, error: null });
  assert.deepEqual(w.runs[0], { trigger: "email", startedAt: iso(T0), ...first.result, finishedAt: w.runs[0].finishedAt });
  // The post with no outage word and no image was never sent to the model.
  assert.deepEqual(w.asked.map(item => item.caption.slice(0, 9)), ["Please be", "SCHEDULED"]);
  assert.deepEqual(w.asked[0], { caption: "Please be guided.", images: 1, imageText: "printed advisory" });
  assert.deepEqual(Object.fromEntries([...w.rows].map(([id, row]) => [id, [row.status, row.attempts]])), { bill: ["ignored", 1], outage: ["published", 1], picture: ["ignored", 1] });
  const published = w.rows.get("outage");
  assert.equal(published.details.provider, "anteco");
  assert.equal(published.details.sourceUrl, "https://www.facebook.com/antecoPH/posts/outage");
  assert.equal(published.model, "test-model");
  assert.equal(w.crawl.owner, null, "the lease is given back");

  w.later();
  const second = await w.trigger("cron");
  assert.deepEqual(second.result, { outcome: "ok", fetched: 3, inserted: 0, detected: 0, queuedLeft: 0, error: null });
  assert.equal(w.asked.length, 2, "known posts are not read again");
  assert.equal(w.calls[1].newerThan, iso(T0 - 2 * HOUR - 6 * HOUR), "the next fetch starts six hours behind the newest stored post");
});

test("a signal that cannot be served now is told to retry, and one over the daily limit is not", async () => {
  const w = world();
  assert.equal((await w.trigger()).admission.status, 202);
  w.later(MINUTE);
  assert.deepEqual((await w.trigger()).admission, { status: 409, accepted: false, retry: true, reason: "too-soon" });
  assert.equal(w.runs.length, 1, "a refused signal leaves no run row");
  w.later(MINUTE);
  assert.equal((await w.trigger()).admission.status, 202, "two minutes after the last start");
  for (let n = 2; n < 30; n += 1) { w.later(); assert.equal((await w.trigger()).admission.status, 202, `run ${n + 1}`); }
  w.later();
  assert.deepEqual((await w.trigger()).admission, { status: 429, accepted: false, retry: false, reason: "daily-limit" });
  assert.equal(w.calls.length, 30);
  assert.equal(w.crawl.owner, null, "a refused signal does not keep the lease");
  assert.equal(w.runs.length, 30, "and leaves no run row");
  // The limit is per Manila day: 16:00 UTC is midnight in Manila.
  w.clock.ms = Date.parse("2026-10-11T16:00:01Z");
  assert.equal((await w.trigger()).admission.status, 202);
});

test("while one run holds the lease another makes no Apify call and changes no range", async () => {
  const w = world();
  backlog(w, 40, 30 * MINUTE);
  const a = await admitRun(w.deps, "email");
  assert.equal(a.status, 202);
  w.later();
  const b = await w.trigger("email");
  assert.deepEqual(b.admission, { status: 409, accepted: false, retry: true, reason: "busy" });
  assert.equal(w.calls.length, 0);
  assert.equal(w.runs[1].outcome, "skipped");
  // A discovers a range; B never held a copy of the ranges, so it has nothing to overwrite it with.
  await runIngestion(w.deps, a.run);
  assert.equal(w.batches[0].ranges.length, 1);
  // A skipped run does not count as a start: the next signal is not "too soon" because of it.
  w.later();
  assert.equal((await w.trigger()).admission.status, 202);
});

test("a backlog is fetched completely over consecutive runs, and a full page of known posts does not disturb it", async () => {
  const w = world();
  // 75 posts five minutes apart: the newest 30 all fall inside the six-hour overlap.
  backlog(w, 75, 5 * MINUTE);
  const first = await w.trigger();
  assert.deepEqual(w.calls.map(call => Boolean(call.olderThan)), [false, true], "a fresh call, then one backlog call");
  assert.equal(w.calls[0].newerThan, iso(T0 - 2 * DAY), "the first run looks back two days");
  assert.deepEqual(w.batches[0].ranges, [{ from: iso(T0 - 2 * DAY), until: w.page[29].postedAt }], "cut off below the 30th post");
  assert.deepEqual(w.batches[1].ranges, [{ from: iso(T0 - 2 * DAY), until: w.page[58].postedAt }], "the range moved down");
  assert.equal(first.result.inserted, 59);

  w.later();
  await w.trigger();
  // Run 2: the fresh page is full and entirely known. It adds no range and leaves the pending one as it was.
  assert.equal(w.batches[2].added, 0);
  assert.deepEqual(w.batches[2].ranges, w.batches[1].ranges);
  assert.deepEqual(w.batches[3].ranges, [], "the backlog call finished the range");
  assert.deepEqual(w.stored(), allIds(w), "all 75 posts are stored");
  const older = w.calls.filter(call => call.olderThan).map(call => call.olderThan);
  assert.deepEqual(older, [...older].sort().reverse(), "each backlog call starts below the last one");
  assert.equal(new Set(older).size, older.length, "no page is fetched twice");

  w.later();
  await w.trigger();
  assert.equal(w.calls.length, 5, "with nothing pending a run makes one fresh call");
  assert.equal(w.asked.length, 0);
});

test("a new cut-off while a range is pending adds a second range and loses nothing", async () => {
  const w = world();
  backlog(w, 100, 5 * MINUTE);
  await w.trigger();
  assert.equal(w.crawl.ranges.length, 1);
  // Forty new posts arrive before the old range is finished.
  w.later(2 * HOUR);
  for (let n = 1; n <= 40; n += 1) w.post(`n${String(n).padStart(3, "0")}`, -(2 * HOUR) + n * MINUTE);
  await w.trigger();
  assert.equal(w.batches[2].ranges.length, 2, "the new cut-off is a second range");
  assert.deepEqual(w.batches[2].ranges[0], w.batches[1].ranges[0], "the older range is untouched by the fresh call");
  for (let run = 0; run < 6 && w.crawl.ranges.length; run += 1) { w.later(); await w.trigger(); }
  assert.deepEqual(w.crawl.ranges, []);
  assert.deepEqual(w.stored(), allIds(w), "all 140 posts are stored");
});

test("more than five ranges merge into a wider one, never a narrower one", () => {
  const range = n => ({ from: iso(T0 + n * DAY), until: iso(T0 + n * DAY + HOUR) });
  let ranges = [];
  for (let n = 0; n < 5; n += 1) ranges = addRange(ranges, range(n));
  assert.equal(ranges.length, 5);
  const merged = addRange(ranges, range(5));
  assert.equal(merged.length, 5);
  assert.deepEqual(merged[0], { from: range(0).from, until: range(1).until }, "the two oldest became one covering both");
  assert.deepEqual(merged.slice(1), [range(2), range(3), range(4), range(5)]);
  assert.deepEqual(addRange(ranges, { from: iso(T0), until: iso(T0) }), ranges, "an empty range is not added");
});

test("where only one Apify call fits in a run, runs alternate and the backlog still drains", async () => {
  const w = world({ budgetMs: ingestBudgetMs(60) });
  w.apify.delayMs = 30_000;
  // 31 posts thirty minutes apart: the oldest is far outside the six-hour overlap.
  backlog(w, 31, 30 * MINUTE);
  await w.trigger("cron");
  assert.equal(w.calls.length, 1, "one call in the first run");
  assert.equal(w.calls[0].timeoutMs, 40_000);
  assert.equal(w.crawl.ranges.length, 1);
  assert.equal(w.rows.size, 30);
  w.later();
  await w.trigger("cron");
  assert.equal(w.calls.length, 2);
  assert.ok(w.calls[1].olderThan, "the second run goes to the backlog first");
  assert.deepEqual(w.stored(), allIds(w), "all 31 posts are stored after two runs");
  assert.deepEqual(w.crawl.ranges, []);
  w.later();
  await w.trigger("cron");
  assert.equal(w.calls[2].olderThan, undefined, "then back to fresh posts");
});

test("a slow Apify call leaves no time for a second one, and the next run makes the backlog call first", async () => {
  const w = world();
  backlog(w, 70, 5 * MINUTE);
  w.apify.delayMs = 105_000;
  await w.trigger();
  assert.equal(w.calls.length, 1);
  assert.equal(w.calls[0].timeoutMs, 110_000);
  assert.equal(w.crawl.lastBacklogCall, false);
  w.later();
  await w.trigger("cron");
  assert.deepEqual(w.calls.slice(1).map(call => Boolean(call.olderThan)), [true], "backlog first, and again no time for a second call");
});

test("a run that dies before a page is stored loses nothing: the next run finds the same range again", async () => {
  const w = world();
  backlog(w, 75, 5 * MINUTE);
  // The function is killed after Apify answers and before the page is stored. Its lease is never given back.
  w.hooks.beforeStore = () => { throw new Error("function stopped"); };
  w.hooks.release = false;
  const dead = await w.trigger();
  assert.equal(dead.result.outcome, "failed");
  assert.match(dead.result.error, /^fetch: function stopped/);
  assert.equal(w.rows.size, 0, "nothing was stored");
  assert.deepEqual(w.crawl.ranges, []);
  w.hooks.beforeStore = null; w.hooks.release = true;
  w.later();
  assert.deepEqual((await w.trigger()).admission.reason, "busy", "the dead run's lease is still held");
  w.later(4 * MINUTE);
  for (let run = 0; run < 4; run += 1) { assert.equal((await w.trigger()).admission.status, 202); w.later(); }
  assert.deepEqual(w.stored(), allIds(w), "all 75 posts are stored with no new post arriving");
  assert.deepEqual(w.crawl.ranges, []);
});

test("an Apify failure is recorded, releases the lease, and still lets waiting posts be read", async () => {
  const w = world();
  w.post("outage", HOUR, { text: "Emergency power interruption in Sibalom." });
  await w.trigger();
  w.rows.get("outage").status = "failed"; // as if the first read had failed
  w.apify.fail = "Apify returned status 502.";
  w.later();
  const { result } = await w.trigger();
  assert.equal(result.outcome, "failed");
  assert.equal(result.error, "fetch: Apify returned status 502.");
  assert.equal(result.detected, 1, "the waiting post was still read");
  assert.equal(w.crawl.owner, null);
});

test("a failed post is retried from the database even when newer posts have pushed it out of the fetch window", async () => {
  const w = world();
  w.post("old-outage", DAY, { text: "Scheduled power interruption in Hamtic." });
  w.model.answer = () => new Error("Gemini error (429): quota");
  await w.trigger();
  assert.deepEqual([w.rows.get("old-outage").status, w.rows.get("old-outage").failure, w.rows.get("old-outage").attempts], ["failed", "Gemini error (429): quota", 1]);
  for (let n = 1; n <= 40; n += 1) w.post(`new-${n}`, -n * MINUTE);
  w.model.answer = () => advisory();
  w.later(HOUR);
  const { result } = await w.trigger();
  assert.equal(w.calls[1].returned.length, 30);
  assert.ok(!w.calls[1].returned.includes("old-outage"), "the fresh page is full of newer posts and no longer contains it");
  assert.equal(w.rows.get("old-outage").status, "published");
  assert.equal(w.rows.get("old-outage").attempts, 2);
  assert.equal(result.detected, 1);
});

test("an attempt is counted even when reading throws, and a post is never read more than three times", async () => {
  const w = world();
  w.post("outage", HOUR, { text: "Scheduled power interruption in Hamtic." });
  w.model.answer = () => new Error("Gemini API request timed out. Please try again.");
  for (let run = 1; run <= 5; run += 1) {
    const { result } = await w.trigger();
    assert.equal(w.rows.get("outage").attempts, Math.min(run, 3));
    assert.equal(result.queuedLeft, run < 3 ? 1 : 0);
    w.later();
  }
  assert.equal(w.asked.length, 3);
  assert.equal(w.rows.get("outage").status, "failed");
});

test("two runs whose reading overlaps read a post once", async () => {
  const w = world();
  w.post("outage", HOUR, { text: "Scheduled power interruption in Hamtic." });
  let inner;
  w.model.during = async () => {
    if (inner) return;
    // While run A is still reading this post, the lease is free and a later signal starts run B.
    assert.equal(w.crawl.owner, null, "the lease is free while A reads");
    w.later();
    inner = await w.trigger();
  };
  const outer = await w.trigger();
  assert.equal(inner.admission.status, 202);
  assert.equal(inner.result.detected, 0, "B found the post already being read");
  assert.equal(outer.result.detected, 1);
  assert.equal(w.asked.length, 1);
  assert.equal(w.rows.get("outage").attempts, 1);
});

test("a read left unfinished by a dead run is taken over only after ten minutes", async () => {
  const w = world();
  w.post("outage", HOUR, { text: "Scheduled power interruption in Hamtic." });
  await w.trigger();
  Object.assign(w.rows.get("outage"), { status: "reading", attempts: 1, updatedAt: w.clock.ms });
  w.later(5 * MINUTE);
  await w.trigger();
  assert.equal(w.asked.length, 1, "not taken over after five minutes");
  w.later(6 * MINUTE);
  await w.trigger();
  assert.equal(w.asked.length, 2);
  assert.deepEqual([w.rows.get("outage").status, w.rows.get("outage").attempts], ["published", 2]);
});

test("a post that appears after a run's fresh fetch is collected by the retried signal, with no new email", async () => {
  const w = world();
  w.post("first", HOUR, { text: "Scheduled power interruption in Hamtic." });
  let answers = [];
  w.model.during = async () => {
    if (answers.length) return;
    // Run A has already asked Facebook. A new post appears and its email signal arrives now.
    w.post("second", -MINUTE, { text: "Emergency power interruption in Culasi." });
    w.later(MINUTE);
    answers.push((await w.trigger()).admission);
  };
  await w.trigger();
  assert.deepEqual(answers[0], { status: 409, accepted: false, retry: true, reason: "too-soon" }, "the signal is told to retry, so the script keeps the email");
  assert.equal(w.rows.has("second"), false);
  // The script sends the same signal again each minute.
  for (let minute = 0; minute < 3 && !w.rows.has("second"); minute += 1) { w.later(MINUTE); answers.push((await w.trigger()).admission); }
  assert.equal(answers.at(-1).status, 202);
  assert.equal(w.rows.get("second").status, "published");
  assert.ok(w.clock.ms - Date.parse(w.rows.get("second").postedAt) <= 6 * MINUTE, "collected within six minutes of being posted");
  assert.ok(w.runs.every(run => run.trigger === "email"), "no cron run was needed");
});

test("a post whose images cannot be loaded is a failure, never 'not an advisory', and the model is not asked", async () => {
  for (const imageText of ["", "May be an image of text that says 'POWER INTERRUPTION'"]) {
    const w = world();
    w.post("picture", HOUR, { text: "See attached advisory.", imageUrls: ["https://scontent.xx.fbcdn.net/expired-1.jpg", "https://scontent.xx.fbcdn.net/expired-2.jpg"], imageText });
    for (let run = 1; run <= 4; run += 1) { await w.trigger(); w.later(); }
    const row = w.rows.get("picture");
    assert.deepEqual([row.status, row.failure, row.attempts], ["failed", "images-unavailable", 3]);
    assert.equal(w.asked.length, 0);
  }
  // A later fetch that returns the post again refreshes its image links, and then it is read.
  const w = world();
  const picture = w.post("picture", HOUR, { text: "See attached advisory.", imageUrls: ["https://scontent.xx.fbcdn.net/expired.jpg"] });
  await w.trigger();
  picture.imageUrls = ["https://scontent.xx.fbcdn.net/fresh.jpg"];
  w.later();
  await w.trigger();
  assert.deepEqual([w.rows.get("picture").status, w.rows.get("picture").attempts], ["published", 2]);
  assert.equal(w.asked[0].images, 1);
});

test("reading stops at the time budget and the next run reads what is left", async () => {
  const w = world();
  for (let n = 1; n <= 8; n += 1) w.post(`outage-${n}`, n * HOUR, { text: `Scheduled power interruption ${n}.` });
  w.model.delayMs = 60_000;
  const first = await w.trigger();
  // Budget 240 s: fetch takes 1 s, each read 60 s, and no read starts after 200 s.
  assert.equal(first.result.detected, 4);
  assert.equal(first.result.queuedLeft, 4);
  assert.deepEqual(w.asked.map(item => item.caption), [1, 2, 3, 4].map(n => `Scheduled power interruption ${n}.`), "newest first");
  w.later();
  const second = await w.trigger();
  assert.equal(second.result.detected, 4);
  assert.equal(second.result.queuedLeft, 0);
});

test("an oversized notice is published in a form the app saves", async () => {
  const w = world();
  w.post("big", HOUR, { text: "SCHEDULED POWER INTERRUPTION. ".repeat(100) });
  const towns = ["Sibalom", "San Jose de Buenavista", "Hamtic"];
  const areas = towns.flatMap(town => getBarangaysForMunicipality("Antique", town).slice(0, 9).map(barangay => ({ municipality: town, barangay, coverage: "barangay" })));
  assert.equal(areas.length, 27);
  w.model.answer = () => advisory({ areas, areaText: "Affected: ".repeat(400), reason: "Maintenance. ".repeat(400), imageText: "Printed line. ".repeat(2000) });
  const { result } = await w.trigger();
  assert.equal(result.detected, 1);
  const row = w.rows.get("big");
  assert.equal(row.status, "published");
  assert.deepEqual(row.details.areas.map(area => [area.municipality, area.scope]), towns.map(town => [town, "uncertain"]), "every town kept, each more cautious");
  const record = feedRecord({ id: row.id, post_url: row.url, posted_at: row.postedAt, details: row.details, original_text: row.originalText, read_from_images: row.readFromImages }, home, new Date(w.clock.ms));
  assert.ok(record, "the published row converts to a saved advisory");
  assert.equal(record.match.status, "possibly-affected");
  assert.equal(record.original.feed.fromImages, true);
});

test("a reading the app could not save is a failure, not a published row", async () => {
  const w = world();
  w.post("empty", HOUR, { text: "", imageUrls: ["https://scontent.xx.fbcdn.net/a.jpg"] });
  // An advisory with no caption and no text read from the image has no original to keep.
  w.model.answer = () => advisory({ imageText: "" });
  await w.trigger();
  assert.deepEqual([w.rows.get("empty").status, w.rows.get("empty").failure], ["failed", "not-a-saveable-record"]);
});

test("a notification stays unserved until new posts are fetched after it arrived, whatever the accepted run did", async () => {
  const w = world();
  backlog(w, 70, 5 * MINUTE);
  await w.trigger("cron");
  assert.equal(w.crawl.ranges.length, 1, "a backlog is pending");
  // ANTECO posts; Facebook's email arrives a minute later.
  w.later(10 * MINUTE);
  w.post("new", -10 * MINUTE, { text: "Emergency power interruption in Culasi." });
  w.later(MINUTE);
  const arrived = iso(w.clock.ms);
  w.later(MINUTE);
  // The run this signal starts fails at Apify. The route had already answered "accepted".
  w.apify.fail = "Apify returned status 502.";
  const first = await w.trigger("email", arrived);
  assert.equal(first.admission.status, 202);
  assert.equal(first.result.outcome, "failed");
  assert.equal(w.rows.has("new"), false);
  w.apify.fail = null;
  // The script still holds the email and asks again each minute.
  w.later(MINUTE);
  assert.deepEqual((await w.trigger("email", arrived)).admission, { status: 409, accepted: false, retry: true, reason: "too-soon" }, "not served: the failed run fetched nothing");
  w.later(MINUTE);
  const second = await w.trigger("email", arrived);
  assert.equal(second.admission.status, 202);
  assert.equal(w.calls.at(-2).olderThan, undefined, "this run fetched new posts, then backlog");
  assert.equal(w.rows.get("new").status, "published");
  w.later(MINUTE);
  assert.deepEqual((await w.trigger("email", arrived)).admission, { status: 200, accepted: false, served: true, retry: false }, "now the script may mark the email handled");
  assert.equal(w.runs.filter(run => run.outcome !== "skipped").length, 3, "a served signal starts no run");
  // A later email is a new signal: the earlier fetch does not serve it.
  w.later(5 * MINUTE);
  assert.equal((await w.trigger("email", iso(w.clock.ms - MINUTE))).admission.status, 202);
  // No usable time: treated as an ordinary signal.
  w.later();
  assert.equal((await w.trigger("email", "not a time")).admission.status, 202);
});

test("a run that only had time for backlog does not serve a notification", async () => {
  const w = world();
  backlog(w, 100, 5 * MINUTE);
  await w.trigger("cron");
  const freshBefore = w.crawl.freshStartedAt;
  assert.ok(freshBefore && w.crawl.ranges.length === 1);
  w.later(10 * MINUTE);
  const arrived = iso(w.clock.ms);
  w.later(MINUTE);
  // The run this notification starts goes to the backlog first (it is that range's turn), and Apify
  // is so slow that no second call fits. Email runs alternate like any other, so backlog is not starved.
  w.crawl.lastBacklogCall = false;
  w.apify.delayMs = 105_000;
  const daily = await w.trigger("email", arrived);
  assert.equal(daily.admission.status, 202);
  assert.equal(daily.result.outcome, "ok");
  assert.deepEqual(w.calls.slice(2).map(call => Boolean(call.olderThan)), [true], "only a backlog call was made");
  assert.equal(w.crawl.freshStartedAt, freshBefore, "new posts were not fetched");
  w.apify.delayMs = 1000;
  w.later(MINUTE);
  assert.equal((await w.trigger("email", arrived)).admission.status, 202, "the notification is not served, so it starts a run");
  w.later(MINUTE);
  assert.equal((await w.trigger("email", arrived)).admission.status, 200, "served once new posts were fetched after it arrived");
});

test("the spend limits are checked while holding the lease, so two signals cannot both pass them", async () => {
  const w = world();
  let other;
  // While A is reading the limits it already holds the lease; B arrives at that very moment.
  w.hooks.duringStats = async () => { if (!other) { other = true; other = await admitRun(w.deps, "email"); } };
  const a = await admitRun(w.deps, "email");
  assert.equal(a.status, 202);
  assert.deepEqual(other, { status: 409, accepted: false, retry: true, reason: "busy" });
  assert.equal(w.runs.filter(run => run.outcome !== "skipped").length, 1, "one run started");
  w.hooks.duringStats = null;
  await runIngestion(w.deps, a.run);
  // If reading the limits fails, the lease is not left held.
  w.later();
  w.hooks.duringStats = () => { throw new Error("database unavailable"); };
  await assert.rejects(admitRun(w.deps, "email"), /database unavailable/);
  assert.equal(w.crawl.owner, null);
});

test("more posts sharing one time than a page holds do not stall the backlog", async () => {
  const w = world();
  // 45 posts published in the same second, with 20 older posts behind them.
  for (let n = 1; n <= 45; n += 1) w.post(`same-${String(n).padStart(2, "0")}`, HOUR);
  for (let n = 1; n <= 20; n += 1) w.post(`older-${String(n).padStart(2, "0")}`, HOUR + n * MINUTE);
  await w.trigger("cron");
  // Fresh: 30 of the 45. Backlog: the same 30 again, so no further down; the range asks for twice as many next time.
  assert.deepEqual(w.calls.map(call => call.limit), [30, 30]);
  assert.equal(w.rows.size, 30);
  assert.deepEqual(w.crawl.ranges.map(range => range.limit), [60]);
  for (let run = 0; run < 4 && w.crawl.ranges.length; run += 1) { w.later(); await w.trigger("cron"); }
  assert.deepEqual(w.crawl.ranges, []);
  assert.deepEqual(w.stored(), allIds(w), "all 65 posts are stored");
  const backlogLimits = w.calls.filter(call => call.olderThan).map(call => call.limit);
  assert.equal(backlogLimits[1], 60, "the stalled range asked for twice as many");
  assert.ok(backlogLimits.every(limit => limit <= 480));
});

test("a post with an image whose link cannot be used is a failure, not a post without images", async () => {
  const w = world();
  // The actor reported one image but no link the app may download.
  w.post("picture", HOUR, { text: "See attached advisory.", imageUrls: [], imageCount: 1 });
  await w.trigger();
  assert.deepEqual([w.rows.get("picture").status, w.rows.get("picture").failure, w.rows.get("picture").attempts], ["failed", "images-unavailable", 1]);
  assert.equal(w.asked.length, 0);
  // A later fetch that brings a usable link lets it be read.
  w.page[0].imageUrls = ["https://scontent.xx.fbcdn.net/a.jpg"];
  w.later();
  await w.trigger();
  assert.equal(w.rows.get("picture").status, "published");
});

test("an answer from the model that is not an answer is retried; only an explicit 'not an advisory' is ignored", async () => {
  for (const answer of [{}, [], { type: "scheduled" }, advisory({ isAdvisory: "yes" }), advisory({ type: "rumour" })]) {
    const w = world();
    w.post("outage", HOUR, { text: "Scheduled power interruption in Hamtic." });
    w.model.answer = () => answer;
    await w.trigger();
    const row = w.rows.get("outage");
    assert.deepEqual([row.status, row.failure, row.attempts], ["failed", "unreadable-answer", 1], JSON.stringify(answer));
    w.model.answer = () => advisory();
    w.later();
    await w.trigger();
    assert.equal(w.rows.get("outage").status, "published", "read correctly on the next run");
  }
  const w = world();
  w.post("bid", HOUR, { text: "Invitation to bid for line maintenance materials." });
  w.model.answer = () => ({ isAdvisory: false });
  await w.trigger();
  assert.deepEqual([w.rows.get("bid").status, w.rows.get("bid").attempts], ["ignored", 1]);
});

test("a notification is not served while a fetched post is still unread", async () => {
  const w = world();
  w.later(MINUTE);
  w.post("outage", -MINUTE, { text: "Emergency power interruption in Culasi." });
  w.later(MINUTE);
  const arrived = iso(w.clock.ms);
  w.later(MINUTE);
  // The post is fetched, but Gemini cannot read it yet.
  w.model.answer = () => new Error("Gemini error (429): quota");
  const first = await w.trigger("email", arrived);
  assert.equal(first.admission.status, 202);
  assert.equal(w.rows.get("outage").status, "failed");
  w.later(MINUTE);
  assert.equal((await w.trigger("email", arrived)).admission.status, 409, "fetched but unread: not served, so the script keeps the email");
  w.model.answer = () => advisory();
  w.later(MINUTE);
  const second = await w.trigger("email", arrived);
  assert.equal(second.admission.status, 202, "the repeated signal starts the run that reads it");
  assert.equal(w.rows.get("outage").status, "published");
  w.later(MINUTE);
  assert.equal((await w.trigger("email", arrived)).admission.status, 200);

  // A post that can never be read does not hold the signal for ever: after three attempts it is done.
  const stuck = world();
  stuck.post("picture", HOUR, { text: "See attached advisory.", imageUrls: ["https://scontent.xx.fbcdn.net/expired.jpg"] });
  const since = iso(stuck.clock.ms - MINUTE);
  const answers = [];
  for (let minute = 0; minute < 12; minute += 1) { answers.push((await stuck.trigger("email", since)).admission.status); stuck.later(MINUTE); }
  assert.equal(stuck.rows.get("picture").attempts, 3);
  assert.equal(answers.at(-1), 200, "served once the post has used its attempts");
  assert.equal(answers.filter(status => status === 202).length, 3, "three runs, no more");
});

test("an advisory written in ANTECO's styled letters, with no image, is read", async () => {
  const w = world();
  w.post("styled", HOUR, { text: "A𝖽𝗏𝗂𝗌𝗈𝗋𝗒 || 𝗨𝗡𝗦𝗖𝗛𝗘𝗗𝗨𝗟𝗘𝗗 𝗣𝗢𝗪𝗘𝗥 𝗜𝗡𝗧𝗘𝗥𝗥𝗨𝗣𝗧𝗜𝗢𝗡\n\nDate: October 9, 2026" });
  w.post("thanks", 2 * HOUR, { text: "𝘈𝘱𝘱𝘳𝘦𝘤𝘪𝘢𝘵𝘪𝘰𝘯 𝘗𝘰𝘴𝘵" });
  await w.trigger();
  assert.equal(w.asked.length, 1, "only the advisory was sent to the model");
  assert.equal(w.rows.get("styled").status, "published");
  assert.match(w.rows.get("styled").originalText, /𝗨𝗡𝗦𝗖𝗛𝗘𝗗𝗨𝗟𝗘𝗗/u, "the original keeps the caption as posted");
  assert.equal(w.rows.get("thanks").status, "ignored");
});
