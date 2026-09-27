// app.js：渲染结果
import { pushJob, takeJob } from "./workq.js";
import { step, close } from "./stealrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      queues: state.queues, stolen: state.stolen, ledger: state.ledger,
      applied: state.applied.length
    });
  };
  const workers = Object.keys(closed.state.queues).sort();
  return { queues: workers.map(function (name) { return [name, closed.state.queues[name]]; }),
           stolen: closed.state.stolen.slice(),
           steal_first: first.steal, steal_wide: wide.steal,
           pair_differs: first.steal !== wide.steal,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.steal, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length, tail: pushJob([], "x").length + (takeJob([], true)[1] === null ? 1 : 0) };
}
