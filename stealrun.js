// stealrun.js：按窃取预算转手并留账（基线：一律给空表）
import { pushJob, takeJob } from "./workq.js";

export function step(spec) {
  return { state: spec.state, steal: 0, ledger_before: 0, ledger: [], judged: 0, judged_bound: 0 };
}

export function close(spec) {
  return { state: spec.state, catchup: 0 };
}
