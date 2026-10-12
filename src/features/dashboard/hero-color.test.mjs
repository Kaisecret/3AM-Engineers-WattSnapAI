// Blue summary cards across screens must share the Energy card colour.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = path => readFileSync(new URL(path, import.meta.url), "utf8");
/** The background of the first rule whose whole selector is `selector`. */
function background(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = source.match(new RegExp(`(?:^|[}\\n])\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return rule?.[1].match(/background:\s*([^;]+);/)?.[1];
}

test("assistant and advisory cards share the Energy card gradient", () => {
  const energy = background(css("./energy.css"), ".en-hero");
  assert.match(energy, /^linear-gradient/);
  assert.equal(background(css("../../app/(household)/dashboard/dashboard.css"), ".ws-assistant-card"), energy);
  assert.equal(background(css("../../app/(household)/advisories/advisories.css"), ".adv-hero.is-clear"), energy);
  assert.equal(background(css("./appliances.css"), ".ap-summary"), energy);
  assert.equal(background(css("./settings.css"), ".st-profile"), energy);
  assert.equal(background(css("../advisory-intelligence/advisory-workflow.css"), ".aw-list-page .adv-hero.is-clear"), undefined, "No screen overrides the shared colour");
});
