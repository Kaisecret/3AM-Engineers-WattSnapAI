import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { highlightPlaces, householdPlaceNames } = await import("./area-highlight.ts");

const home = (municipality, barangay = "") => ({ locality: { province: "Antique", municipality, barangay } });
const area = municipality => ({ province: "Antique", municipality, barangay: "", scope: "municipality" });
const mine = parts => parts.filter(part => part.mine).map(part => part.text);

test("the household town is highlighted where the advisory writes it", () => {
  const details = { areaText: "Anini-y, Tobias Fornier, HAMTIC, San Jose and Sibalom", areas: [area("Hamtic")] };
  const parts = highlightPlaces(details.areaText, householdPlaceNames(details, home("Hamtic")));
  assert.deepEqual(mine(parts), ["HAMTIC"]);
  assert.equal(parts.map(part => part.text).join(""), details.areaText, "The wording itself is never changed");
});

test("a town name inside a longer word is not highlighted", () => {
  const details = { areaText: "Barangay Hamtican and Sibalom", areas: [area("Hamtic")] };
  assert.deepEqual(householdPlaceNames(details, home("Hamtic")), []);
});

test("a shortened town name is highlighted only when the reviewed areas list that town", () => {
  const text = "Hamtic, San Jose, Sibalom";
  assert.deepEqual(mine(highlightPlaces(text, householdPlaceNames({ areaText: text, areas: [area("San Jose de Buenavista")] }, home("San Jose de Buenavista")))), ["San Jose"]);
  assert.deepEqual(householdPlaceNames({ areaText: text, areas: [area("Hamtic")] }, home("San Jose de Buenavista")), [], "A look-alike name is not claimed for the household");
});

test("the barangay is highlighted only together with its town", () => {
  const listed = { areaText: "Hamtic (Mapatag, Budbudan)", areas: [area("Hamtic")] };
  assert.deepEqual(mine(highlightPlaces(listed.areaText, householdPlaceNames(listed, home("Hamtic", "Mapatag")))), ["Hamtic", "Mapatag"]);
  const elsewhere = { areaText: "Sibalom (Mapatag)", areas: [area("Sibalom")] };
  assert.deepEqual(householdPlaceNames(elsewhere, home("Hamtic", "Mapatag")), []);
});

test("nothing is highlighted without a saved town", () => {
  assert.deepEqual(householdPlaceNames({ areaText: "Hamtic", areas: [area("Hamtic")] }, {}), []);
  assert.deepEqual(highlightPlaces("Hamtic", []), [{ text: "Hamtic", mine: false }]);
});
