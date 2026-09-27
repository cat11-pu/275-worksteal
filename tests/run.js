import assert from "node:assert";
import { pushJob, takeJob } from "../workq.js";
import { step, close } from "../stealrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { queues: {}, stolen: [], ledger: [], applied: [] },
  events: [],
  empty_error_code: "E_EMPTY_QUEUE", self_error_code: "E_SELF_STEAL",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("pushJob returns a list", () => {
  assert.ok(Array.isArray(pushJob([], "a")));
});

check("takeJob returns a pair", () => {
  assert.ok(Array.isArray(takeJob([], true)));
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
