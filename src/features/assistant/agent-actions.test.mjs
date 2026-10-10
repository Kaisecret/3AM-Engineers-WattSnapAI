import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { agentTools, applyAgentAction, applyAgentActions, describeAgentAction, parseAgentCall } = await import("./agent-actions.ts");

const home = { name: "Santos", provider: "anteco", budget: 3000, bills: [{ id: "b1", month: "2026-08", kwh: 192, amount: 3072.6, source: "manual" }], appliances: [{ id: "a1", name: "Bedroom fan", watts: 60, hours: 8, quantity: 1, source: "manual" }] };

test("every tool Gemini can call is declared with a name, description and object parameters", () => {
  const declarations = agentTools[0].functionDeclarations;
  assert.deepEqual(declarations.map(item => item.name).sort(), ["add_appliance", "add_bill", "open_page", "remove_appliance", "set_budget", "set_monthly_subsidy", "update_appliance"]);
  for (const item of declarations) { assert.ok(item.description.length > 10); assert.equal(item.parameters.type, "object"); }
});

test("AI suggestions are validated before they can be shown", () => {
  assert.deepEqual(parseAgentCall("set_budget", { amount: "2500" }), { kind: "action", action: { type: "set_budget", amount: 2500 } });
  assert.equal(parseAgentCall("set_budget", { amount: -5 }).kind, "invalid");
  assert.equal(parseAgentCall("delete_everything", {}).kind, "invalid", "unknown tools are ignored");
  assert.equal(parseAgentCall("add_appliance", { name: "Fan", watts: 60, hours: 30 }).kind, "invalid", "more than 24 hours a day is rejected");
  const fan = parseAgentCall("add_appliance", { name: "Electric fan", kind: "fan", watts: 60, hours: 8, quantity: 2 });
  assert.equal(fan.kind, "action");
  assert.deepEqual(fan.action.appliance, { name: "Electric fan", kind: "fan", watts: 60, hours: 8, quantity: 2, days: 30, source: "manual", wattageBasis: "approximate" });
  assert.deepEqual(parseAgentCall("open_page", { page: "budget" }), { kind: "link", link: { label: "Open Budget", href: "/budget" } });
  assert.equal(parseAgentCall("open_page", { page: "https://evil.example" }).kind, "invalid");
});

test("each proposed change is described in plain words for the Confirm card", () => {
  assert.equal(describeAgentAction({ type: "set_budget", amount: 2500 }, home), "Set your monthly budget to ₱2,500.00");
  assert.equal(describeAgentAction(parseAgentCall("add_appliance", { name: "Electric fan", watts: 60, hours: 8, quantity: 2 }).action, home), "Add Electric fan · 60 W · 8 hrs/day · ×2");
  assert.equal(describeAgentAction({ type: "add_bill", bill: { month: "2026-08", kwh: 200, amount: 3200, source: "manual" } }, home), "Replace your August 2026 bill: 200 kWh · ₱3,200.00");
  assert.equal(describeAgentAction({ type: "update_appliance", name: "bedroom fan", changes: { hours: 5 } }, home), "Change Bedroom fan: 5 hrs/day");
});

test("confirmed changes update only what was proposed", () => {
  assert.deepEqual(applyAgentAction(home, { type: "set_budget", amount: 2500 }), { patch: { budget: 2500 } });
  assert.deepEqual(applyAgentAction(home, { type: "set_monthly_subsidy", amount: 500 }), { patch: { monthlySubsidy: 500 } });
  const added = applyAgentAction(home, parseAgentCall("add_appliance", { name: "Rice cooker", watts: 700, hours: 1 }).action);
  assert.equal(added.patch.appliances.length, 2); assert.ok(added.patch.appliances[1].id);
  assert.deepEqual(applyAgentAction(home, { type: "update_appliance", name: "BEDROOM FAN", changes: { hours: 5 } }).patch.appliances[0].hours, 5);
  assert.equal(applyAgentAction(home, { type: "remove_appliance", name: "Bedroom fan" }).patch.appliances.length, 0);
  assert.match(applyAgentAction(home, { type: "remove_appliance", name: "Freezer" }).error, /No appliance named/);
  const bills = applyAgentAction(home, { type: "add_bill", bill: { month: "2026-08", kwh: 200, amount: 3200, source: "manual" } }).patch.bills;
  assert.equal(bills.length, 1, "same month replaces"); assert.equal(bills[0].kwh, 200);
});

test("confirming several changes at once keeps every one of them", () => {
  const fan = parseAgentCall("add_appliance", { name: "Living room fan", watts: 60, hours: 8 }).action;
  const tv = parseAgentCall("add_appliance", { name: "TV", watts: 90, hours: 4 }).action;
  const { patch, results } = applyAgentActions(home, [fan, tv, { type: "set_budget", amount: 2000 }, { type: "remove_appliance", name: "Freezer" }]);
  assert.deepEqual(patch.appliances.map(item => item.name), ["Bedroom fan", "Living room fan", "TV"]);
  assert.equal(patch.budget, 2000);
  assert.ok("error" in results[3], "a change that cannot apply is reported, the others still apply");
});

test("a change is checked again before it is saved", () => {
  assert.match(applyAgentAction(home, { type: "set_budget", amount: -1 }).error, /greater than zero/);
  assert.ok("error" in applyAgentAction(home, { type: "add_bill", bill: { month: "bad", kwh: 1, amount: 1, source: "manual" } }));
});
