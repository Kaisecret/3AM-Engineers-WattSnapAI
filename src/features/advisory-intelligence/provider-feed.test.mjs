import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { feedCanImport, feedFilter, feedImports, feedIsCurrent, feedRecord } = await import("./provider-feed.ts");
const { blankAdvisory, normalizeReviewedAdvisory, sampleMatchHousehold: home } = await import("./review-preview.ts");

const DAY = 86400000, now = new Date("2026-10-11T04:00:00Z"); // noon in Manila
const day = offset => new Date(now.getTime() + 8 * 3600000 + offset * DAY).toISOString().slice(0, 10);
const payao = { province: "Antique", municipality: "San Jose de Buenavista", barangay: "Payao", scope: "barangay" };
const details = (fields = {}) => ({ ...blankAdvisory, type: "scheduled", title: "Scheduled Power Interruption", provider: "anteco", publisher: "ANTECO Facebook page", sourceUrl: "https://www.facebook.com/antecoPH/posts/1", date: day(1), startTime: "08:00", endTime: "17:00", areaText: "Brgy. Payao, San Jose de Buenavista", areas: [payao], reason: "Line maintenance", ...fields });
const row = (id, fields = {}, postedDaysAgo = 1) => ({ id, post_url: `https://www.facebook.com/antecoPH/posts/${id}`, posted_at: new Date(now.getTime() - postedDaysAgo * DAY).toISOString(), details: details(fields), original_text: "SCHEDULED POWER INTERRUPTION", read_from_images: false });
const elsewhere = [{ province: "Antique", municipality: "Culasi", barangay: "", scope: "municipality" }];
const uncertain = [{ province: "Antique", municipality: "San Jose de Buenavista", barangay: "", scope: "uncertain" }];

test("a published row becomes a saved advisory matched against this household", () => {
  const record = feedRecord({ ...row("a"), read_from_images: true }, home, now);
  assert.ok(record);
  assert.deepEqual([record.id, record.revision, record.version], ["a", 1, "advisory-ui-v1"]);
  assert.deepEqual(record.original, { kind: "text", name: "ANTECO Facebook post", text: "SCHEDULED POWER INTERRUPTION", capturedAt: row("a").posted_at, feed: { url: "https://www.facebook.com/antecoPH/posts/a", fromImages: true } });
  assert.equal(record.match.status, "affected");
  assert.equal(feedRecord(row("b", { areas: uncertain }), home, now).match.status, "possibly-affected");
  assert.equal(feedRecord(row("c", { areas: elsewhere }), home, now).match.status, "not-listed");
  // The same row for a household in Culasi.
  assert.equal(feedRecord(row("c", { areas: elsewhere }), { ...home, locality: { province: "Antique", municipality: "Culasi", barangay: "Centro Norte" } }, now).match.status, "affected");
  assert.ok(normalizeReviewedAdvisory(JSON.parse(JSON.stringify(record))), "it survives being saved and read back");
});

test("a row the app could not save gives no record", () => {
  const bad = [
    null, {}, { ...row("x"), id: "" }, { ...row("x"), details: null }, { ...row("x"), details: "text" }, { ...row("x"), details: { ...details(), areas: "all" } },
    { ...row("x"), original_text: "" }, { ...row("x"), original_text: "x".repeat(12001) }, { ...row("x"), posted_at: "yesterday" },
    { ...row("x"), post_url: "https://example.org/antecoPH/posts/x" }, { ...row("x"), post_url: "http://www.facebook.com/antecoPH/posts/x" }, { ...row("x"), post_url: "https://facebook.com.example.org/x" },
    row("x", { type: "rumour" }), row("x", { date: "next week" }), row("x", { areaText: "" }), row("x", { areas: Array.from({ length: 21 }, () => payao) }), row("x", { reason: "r".repeat(1501) }),
    row("x", { startTime: "17:00", endTime: "08:00" }), row("x", { provider: "not-a-provider" }),
  ];
  for (const item of bad) assert.equal(feedRecord(item, home, now), null, JSON.stringify(item)?.slice(0, 90));
});

test("an advisory is current while it is upcoming or ongoing, however long ago it was announced", () => {
  const current = (fields, postedDaysAgo) => feedIsCurrent(feedRecord(row("a", fields), home, now) && feedRecord(row("a", fields, postedDaysAgo), home, now), now);
  assert.equal(current({ date: day(1) }, 16), true, "announced 16 days ago, starts tomorrow");
  assert.equal(current({ date: day(1) }, 61), true, "announced 61 days ago, starts tomorrow");
  assert.equal(current({ date: day(0), startTime: "08:00", endTime: "17:00" }, 30), true, "happening today");
  assert.equal(current({ date: day(-1), endDate: day(1) }, 30), true, "started yesterday, ends tomorrow");
  assert.equal(current({ date: day(-2) }, 5), true, "ended two days ago");
  assert.equal(current({ date: day(-4) }, 5), false, "ended four days ago");
  assert.equal(current({ date: day(-4), startTime: "", endTime: "" }, 5), false, "a day four days ago with no times");
  assert.equal(current({ date: "", startTime: "", endTime: "" }, 10), true, "undated, posted 10 days ago");
  assert.equal(current({ date: "", startTime: "", endTime: "" }, 16), false, "undated, posted 16 days ago");
});

test("only listed or possibly listed, current, unsaved and unremoved advisories are saved automatically", () => {
  // "no-place" is what a reminder or general information looks like: no town named at all.
  const noPlace = [{ province: "Antique", municipality: "", barangay: "", scope: "uncertain" }];
  const rows = [row("affected"), row("possibly", { areas: uncertain }), row("elsewhere", { areas: elsewhere }), row("no-place", { areas: noPlace, areaText: "Not provided" }), row("ended", { date: day(-4) }), row("saved"), row("removed"), null, { ...row("broken"), details: null }];
  const corrected = { ...feedRecord(row("saved"), home, now), revision: 4, details: details({ reason: "Corrected by the user" }) };
  const picked = feedImports(rows, [corrected], ["removed"], home, now);
  assert.deepEqual(picked.map(record => [record.id, record.match.status]), [["affected", "affected"], ["possibly", "possibly-affected"]]);
  assert.ok(picked.every(record => record.original.feed), "each is marked as collected");
  // It would be "possibly affected" for every household, so it is not saved for anyone; it can still be shown and saved by hand.
  assert.equal(feedRecord(row("no-place", { areas: noPlace, areaText: "Not provided" }), home, now).match.status, "possibly-affected");
  // Saving again with the first results now saved picks nothing.
  assert.deepEqual(feedImports(rows, [corrected, ...picked], ["removed"], home, now), []);
  // The same row twice in a feed is saved once.
  assert.equal(feedImports([row("twice"), row("twice")], [], [], home, now).length, 1);
});

test("nothing is saved automatically without ANTECO as provider and a structured location", () => {
  const rows = [row("a"), row("b", { areas: uncertain })];
  assert.equal(feedCanImport(home), true);
  for (const household of [{ ...home, provider: "capelco" }, { ...home, provider: undefined }, { ...home, locality: undefined }, { ...home, locality: { province: "Antique", municipality: " ", barangay: "" } }, { ...home, locality: { province: "", municipality: "Sibalom", barangay: "" } }]) {
    assert.equal(feedCanImport(household), false);
    assert.deepEqual(feedImports(rows, [], [], household, now), []);
  }
});

test("saving stops at the saved-advisory limit and reaches a match beyond the first page of the feed", () => {
  const far = [...Array.from({ length: 120 }, (_, n) => row(`other-${n}`, { areas: elsewhere })), row("match-on-page-two"), ...Array.from({ length: 29 }, (_, n) => row(`later-${n}`, { areas: elsewhere }))];
  assert.deepEqual(feedImports(far, [], [], home, now).map(record => record.id), ["match-on-page-two"]);
  const many = Array.from({ length: 10 }, (_, n) => row(`m-${n}`));
  const saved = Array.from({ length: 97 }, (_, n) => ({ id: `saved-${n}` }));
  assert.deepEqual(feedImports(many, saved, [], home, now).map(record => record.id), ["m-0", "m-1", "m-2"]);
  assert.deepEqual(feedImports(many, saved, [], home, now, 98).map(record => record.id), ["m-0"], "samples leave less room");
  assert.deepEqual(feedImports(many, [...saved, ...many.slice(0, 3).map(item => ({ id: item.id }))], [], home, now), []);
});

test("the feed is selected by schedule: not over for more than three days, or undated and recent", () => {
  assert.equal(feedFilter(now), 'schedule_end.gte.2026-10-08,and(schedule_end.is.null,posted_at.gte."2026-09-27T04:00:00.000Z")');
  // Late evening UTC is already the next day in Manila.
  assert.match(feedFilter(new Date("2026-10-11T17:00:00Z")), /^schedule_end\.gte\.2026-10-09,/);
});
