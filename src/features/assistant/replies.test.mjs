import assert from "node:assert/strict";
import test from "node:test";
import { householdReply, householdSuggestions, landingReply, landingSuggestions } from "./replies.ts";

const context = {
  name: "Kris Santos",
  latest: { month: "2026-09", kwh: 109, amount: 1248.5 },
  previous: { month: "2026-08", kwh: 121, amount: 1385.45 },
  budget: 1600,
  rate: 11.45,
  topAppliance: { name: "Refrigerator", monthlyKwh: 38.4 },
  applianceCount: 5,
  location: "San Jose de Buenavista, Antique",
  advisory: { title: "Scheduled Power Interruption", when: "Sep 12, 2026 (Sat) · 9:00 AM – 3:00 PM", area: "Brgy. Payao", reason: "Line maintenance" },
};

test("bill questions compare the latest bill with the month before", () => {
  const reply = householdReply("Why did my bill change?", context);
  assert.match(reply.text, /September 2026 bill used 109 kWh, 10% less than August 2026/);
  assert.match(reply.text, /₱136\.95 lower/);
  assert.deepEqual(reply.links, [{ label: "Compare all months", href: "/bills" }]);
});

test("household answers explain missing data instead of inventing it", () => {
  assert.match(householdReply("why is my bill higher", {}).text, /don't see a bill yet/);
  assert.match(householdReply("which appliance uses the most", {}).text, /Add the appliances/);
  assert.match(householdReply("any brownout today?", { location: "Iloilo" }).text, /no interruption currently lists Iloilo/);
});

test("intents route to the matching household topic", () => {
  assert.match(householdReply("How can I save on aircon?", context).text, /24–25°C/);
  assert.match(householdReply("Any brownout today?", context).text, /Brgy\. Payao/);
  assert.match(householdReply("Which appliance uses the most?", context).text, /refrigerator uses the most/);
  assert.match(householdReply("how much of my budget did I use", context).text, /78% of your ₱1,600\.00 budget/);
  assert.equal(householdReply("scan my bill", context).links[0].href, "/bills/new");
  assert.match(householdReply("hello", context).text, /^Hi Kris!/);
  assert.deepEqual(householdReply("asdf qwerty", context).suggestions, householdSuggestions);
});

test("landing answers stay within the product description", () => {
  assert.match(landingReply("What is WattSnap?").text, /home electricity assistant/);
  assert.match(landingReply("Does it work offline?").text, /work offline/);
  assert.match(landingReply("Which areas are covered?").text, /Antique with ANTECO/);
  assert.equal(landingReply("how do I sign up").links[0].href, "/signup");
  assert.deepEqual(landingReply("zzz").suggestions, landingSuggestions);
});
