import assert from "node:assert/strict";
import test from "node:test";
import { advisoryPreview, filterAdvisories, formatAdvisoryDate } from "./advisory-preview.ts";

test("Active and History show separate reference records", () => {
  const active = filterAdvisories(advisoryPreview, "active", "all");
  const history = filterAdvisories(advisoryPreview, "history", "all");
  assert.equal(active.length, 3);
  assert.equal(history.length, 4);
  assert.ok(active.every(record => record.tab === "active"));
  assert.ok(history.every(record => record.tab === "history"));
  assert.equal(new Set([...active, ...history].map(record => record.id)).size, 7);
});

test("type filter stays within the selected tab and handles empty results", () => {
  assert.equal(filterAdvisories(advisoryPreview, "active", "restored").length, 0);
  const notices = filterAdvisories(advisoryPreview, "history", "notice");
  assert.equal(notices.length, 1);
  assert.equal(notices[0].type, "notice");
  assert.equal(notices[0].tab, "history");
});

test("advisory date labels use the actual weekday consistently", () => {
  assert.equal(formatAdvisoryDate("2026-09-12"), "Sep 12, 2026 (Sat)");
  assert.equal(formatAdvisoryDate("2026-08-28"), "Aug 28, 2026 (Fri)");
});
