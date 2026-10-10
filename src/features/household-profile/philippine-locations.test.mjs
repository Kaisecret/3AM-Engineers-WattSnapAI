import test from "node:test";
import assert from "node:assert/strict";
import {
  PROVINCES,
  getMunicipalitiesForProvince,
  getBarangaysForMunicipality
} from "./philippine-locations.ts";

test("PROVINCES includes all four Panay provinces", () => {
  assert.deepEqual([...PROVINCES], ["Antique", "Aklan", "Capiz", "Iloilo"]);
});

test("Antique lists all 18 municipalities including Hamtic", () => {
  const munis = getMunicipalitiesForProvince("Antique");
  assert.equal(munis.length, 18);
  assert.ok(munis.includes("Hamtic"));
  assert.ok(munis.includes("San Jose de Buenavista"));
  assert.ok(munis.includes("Sibalom"));
});

test("Hamtic has all 47 barangays", () => {
  const barangays = getBarangaysForMunicipality("Antique", "Hamtic");
  assert.equal(barangays.length, 47);
  assert.ok(barangays.includes("Malandog"));
  assert.ok(barangays.includes("Carit-an"));
  assert.ok(barangays.includes("Apdo"));
  assert.ok(barangays.includes("Funda"));
  assert.ok(barangays.includes("Villavert-Jimenez"));
});

test("case insensitivity and trimming work for lookups", () => {
  const munis = getMunicipalitiesForProvince("  antique  ");
  assert.ok(munis.includes("Hamtic"));
  const brgys = getBarangaysForMunicipality("ANTIQUE", "hamtic");
  assert.equal(brgys.length, 47);
  assert.ok(brgys.includes("Malandog"));
});

test("other Panay provinces return their municipalities", () => {
  const aklan = getMunicipalitiesForProvince("Aklan");
  assert.ok(aklan.includes("Kalibo"));
  assert.ok(aklan.includes("Malay (Boracay)"));

  const capiz = getMunicipalitiesForProvince("Capiz");
  assert.ok(capiz.includes("Roxas City"));

  const iloilo = getMunicipalitiesForProvince("Iloilo");
  assert.ok(iloilo.includes("Iloilo City"));
});

test("empty or unknown input safely returns empty array", () => {
  assert.deepEqual(getMunicipalitiesForProvince(""), []);
  assert.deepEqual(getMunicipalitiesForProvince("Unknown"), []);
  assert.deepEqual(getBarangaysForMunicipality("Antique", ""), []);
  assert.deepEqual(getBarangaysForMunicipality("Unknown", "Hamtic"), []);
});
