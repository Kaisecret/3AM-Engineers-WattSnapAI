import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const src = new URL("../../", import.meta.url);
const read = path => fs.readFileSync(new URL(path, src), "utf8");
const dark = 'html[data-theme="dark"]';

// App-shell styles only. The landing page is locked to light, and sign-in/intro screens are themed through
// custom properties set in onboarding/theme.css rather than per-selector colours.
const skipped = [/^features\/landing\//, /^features\/auth\//, /^features\/onboarding\/onboarding\.css$/, /^app\/globals\.css$/];
const stylesheets = fs.readdirSync(src, { recursive: true }).map(file => String(file).replaceAll("\\", "/")).filter(file => file.endsWith(".css") && !skipped.some(rule => rule.test(file))).sort();

/** Every declaration block with its selector, whatever at-rules surround it. */
function rules(css) {
  const found = [], stack = []; let text = "";
  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (char === "{") { stack.push(text.trim()); text = ""; }
    else if (char === "}") { const selector = stack.pop(); if (selector && !selector.startsWith("@") && !stack.some(outer => outer.startsWith("@keyframes"))) found.push({ selector, body: text }); text = ""; }
    else text += char;
  }
  return found;
}
function splitTop(list) {
  const parts = []; let depth = 0, part = "";
  for (const char of list) { if (char === "(") depth++; if (char === ")") depth--; if (char === "," && depth === 0) { parts.push(part.trim()); part = ""; } else part += char; }
  return [...parts, part.trim()].filter(Boolean);
}
/** `a :is(b, c) d` becomes `a b d` and `a c d`. */
function expand(selector) {
  const start = selector.indexOf(":is(");
  if (start < 0) return [selector];
  let depth = 0, end = start + 3;
  for (; end < selector.length; end++) { if (selector[end] === "(") depth++; if (selector[end] === ")" && --depth === 0) break; }
  return splitTop(selector.slice(start + 4, end)).flatMap(choice => expand(selector.slice(0, start) + choice + selector.slice(end + 1)));
}
/** A selector split into parts. The last part naming a class is what the rule colours; the parts before it are its context. */
function subject(selector) {
  const parts = selector.replace(dark, "").replace(/::?[\w-]+(\([^()]*\))?/g, "").replace(/\[[^\]]*\]/g, "").split(/[\s>+~]+/).filter(Boolean);
  const last = parts.findLastIndex(part => part.includes("."));
  if (last < 0) return null;
  const names = part => part.match(/\.[\w-]+/g) ?? [];
  return { type: parts[last].match(/^[a-z][\w-]*/i)?.[0] ?? "", classes: names(parts[last]), tail: parts.slice(last + 1).join(" "), context: parts.slice(0, last).flatMap(names), key: parts.join(" ") };
}
// A dark rule reaches a light one only when it colours the same thing: same element type, no class the light rule lacks
// (so .wi-note strong reaches .wi-note.is-offline strong, where the theme prefix outranks the extra class), the same
// trailing elements, and no ancestor the light rule does not also require.
const reaches = (themed, light) => themed.tail === light.tail && (!themed.type || themed.type === light.type) && themed.classes.every(name => light.classes.includes(name)) && themed.context.every(name => light.context.includes(name));
function luminance(value) {
  const named = { white: "#ffffff", black: "#000000" }[value] ?? value;
  if (!/^#[0-9a-f]{3,8}$/i.test(named)) return null;
  const hex = named.length < 6 ? [...named.slice(1, 4)].map(digit => digit + digit).join("") : named.slice(1, 7);
  return [0, 2, 4].map(at => parseInt(hex.slice(at, at + 2), 16) / 255).map(part => part <= .03928 ? part / 12.92 : ((part + .055) / 1.055) ** 2.4).reduce((sum, part, at) => sum + part * [.2126, .7152, .0722][at], 0);
}
const declared = (body, property) => body.split(";").map(line => line.split(/:(.*)/s)).find(([name]) => name.trim() === property)?.[1]?.replace("!important", "").trim();

// Dark text that is safe without its own dark rule, keyed by the whole selector. Each entry says why.
const allowed = {
  // Sits on a surface that stays light in both themes.
  ".ws-advisory h2": "yellow Home advisory card", ".ws-advisory p": "yellow Home advisory card",
  ".bready-hero h2": "cream Brownout Ready hero", ".tt-hero h2": "cream Tipid Tips hero", ".aw-hero h2": "cream advisory intake hero",
  ".bg-tips h2": "yellow budget tips card", ".bg-tips li": "yellow budget tips card", ".bg-tips-link": "yellow budget tips card",
  ".bg-amount-field em": "light budget amount box", ".bg-amount-field input": "light budget amount box", ".bg-suggest b": "light budget suggestion, which sets its own text colour",
  ".scan-tips h3": "yellow scan tips card", ".scan-tips ul": "yellow scan tips card",
  ".phase-camera .scan-guide-options button": "white scan guide switch", ".scan-inline-note": "amber note on its own light chip",
  ".scan-retry p": "light retry sheet, which sets its own background",
  ".br-note strong": "amber bill note box", ".br-replacement-values strong": "amber replacement box",
  ".adv-hero.is-clear .adv-location em": "white chip inside the coloured hero",
  ".hs-suggestion strong": "pale blue suggestion box, which sets its own background",
  ".adv-dialog-content .ui-success": "mint message box, which sets its own background", ".adv-dialog-content .ui-error": "pink message box, which sets its own background",
  ".setup-celebration": "transparent dialog; its card sets its own colours in theme.css",
  // Covered by a dark rule written with other ancestors, which this check cannot follow.
  ".ws-checklist-heading h2": "theme.css .ws-home .ws-card h2", ".ws-tip p": "theme.css .ws-home .ws-tip-copy p",
  ".hs-card-heading h2": "theme.css .hs-card h2", ".ap-item-main p span": "frontend-refinements.css .ws-home .ap-item-detail",
  ".adv-ready input *": "advisories.css .adv-ready input:checked ~ :not(.adv-check)",
  ".ws-nav-scan": "theme.css .ws-nav-item, which outranks it",
  ".ws-profile-button": "theme.css .ws-home .ws-profile-button; the button only exists inside .ws-home",
  ".ap-fields label": "appliances.css .ap-dialog .ap-fields label; only rendered in the appliance dialog",
  ".ap-stepper output": "appliances.css .ap-dialog .ap-stepper output; only rendered in the appliance dialog",
  ".ap-saved-estimate span": "appliances.css .ap-saved-dialog .ap-saved-estimate span; only rendered in that dialog",
  // Styles no component renders any more.
  ".adv-dialog .adv-form-error": "unused", ".ui-form label": "unused", ".scan-text-button": "unused",
};

test("hard-coded dark text in the app shell has a dark-theme colour", () => {
  const all = stylesheets.flatMap(file => rules(read(file)).map(rule => ({ ...rule, file })));
  const themed = all.filter(rule => rule.selector.includes(dark) && declared(rule.body, "color")).flatMap(rule => splitTop(rule.selector).flatMap(expand).map(subject)).filter(Boolean);
  const missing = [];
  for (const rule of all) {
    if (rule.selector.includes("data-theme")) continue;
    const colour = luminance(declared(rule.body, "color") ?? "");
    if (colour === null || colour >= .2 || declared(rule.body, "background") || declared(rule.body, "background-color")) continue;
    for (const selector of splitTop(rule.selector).flatMap(expand)) {
      const light = subject(selector);
      if (light && !themed.some(rule => reaches(rule, light)) && !allowed[light.key]) missing.push(`${rule.file}: ${selector} (${light.key})`);
    }
  }
  assert.deepEqual(missing, [], "Add a html[data-theme=\"dark\"] colour for each selector, or list it in `allowed` with the reason");
});

test("a dark surface rule does not count as a text colour for its children", () => {
  assert.equal(subject(".aw-feed-list > li:hover").key, ".aw-feed-list li");
  assert.equal(subject('html[data-theme="dark"] .chat-side-card dd.is-higher').key, ".chat-side-card dd.is-higher");
  assert.equal(reaches(subject(".aw-feed-list li"), subject(".aw-feed-list strong")), false, "a rule for the row is not a rule for its heading");
  assert.equal(reaches(subject(".aw-feed-list"), subject(".aw-feed-list strong")), false, "a rule for the list is not a rule for its heading");
  assert.equal(reaches(subject(".wi-note strong"), subject(".wi-note.is-offline strong")), true);
  assert.equal(reaches(subject(".wi-note.is-offline strong"), subject(".wi-note strong")), false, "a rule for one state does not cover the resting state");
  assert.equal(reaches(subject(".chat-side-card span.is-higher"), subject(".chat-side-card dd.is-higher")), false, "a rule for a span does not colour a dd");
  assert.equal(reaches(subject(".adv-tabs .is-selected"), subject(".ap-presets label.is-selected")), false, "the same state class on an unrelated control does not count");
  assert.equal(reaches(subject(".ws-home .ws-card h2"), subject(".ws-checklist-heading h2")), false, "different ancestors need an allowlist entry");
  assert.deepEqual(expand('html[data-theme="dark"] .ws-home :is(.a h2, .b) p'), ['html[data-theme="dark"] .ws-home .a h2 p', 'html[data-theme="dark"] .ws-home .b p']);
});

test("Home and every other page share one header menu", () => {
  for (const file of ["features/dashboard/components/AppHeader.tsx", "features/dashboard/components/HomeScreen.tsx"]) {
    const source = read(file);
    assert.match(source, /import HeaderMenu from "\.\/HeaderMenu"/, file);
    assert.doesNotMatch(source, /href="\/settings"/, `${file} must not keep its own copy of the menu`);
  }
  assert.match(read("features/dashboard/components/HeaderMenu.tsx"), /href="\/onboarding"[^]*Household setup/);
});

test("the landing page stays light and its menu links set their own colour", () => {
  const css = read("app/globals.css");
  assert.match(css, /html\[data-theme="dark"\] \.landing-page \{[^}]*color-scheme: light/);
  assert.match(css, /\.landing-mobile-menu > a:not\(\.btn-primary\) \{[^}]*color:/);
  assert.match(read("app/page.tsx"), /className="landing-page"/);
});
