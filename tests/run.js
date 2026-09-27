import assert from "node:assert";
import { beat, suspect, promote } from "../nodes.js";
import { step, close } from "../detectrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { nodes: [], suspected: [], promotions: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "beat", name: "a", at: 5 }],
  stale_error_code: "E_STALE_BEAT", suspect_error_code: "E_NOT_SUSPECT",
  node_error_code: "E_NO_NODE", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("beat returns nodes", () => {
  assert.ok(Array.isArray(beat([], "z", 1)));
});

check("suspect returns nodes and suspected", () => {
  const got = suspect([["z", 1, 0]], [], "z");
  assert.ok(Array.isArray(got.nodes) && Array.isArray(got.suspected));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
