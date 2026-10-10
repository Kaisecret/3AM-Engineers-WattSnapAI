import assert from "node:assert/strict";
import test from "node:test";
const { activeTab } = await import("./active-tab.ts");

test("each signed-in page highlights its own navigation tab while loading", () => {
  assert.equal(activeTab("/dashboard"), "Home");
  assert.equal(activeTab("/bills"), "Energy");
  assert.equal(activeTab("/bills/new"), "Snap AI", "scanning is its own tab, not Energy");
  assert.equal(activeTab("/appliances/new"), "Appliances");
  assert.equal(activeTab("/advisories/new"), "Advisories");
  assert.equal(activeTab("/assistant"), "Assistant");
  assert.equal(activeTab("/billsx"), undefined, "a prefix must end at a path boundary");
  assert.equal(activeTab("/settings"), undefined);
});
