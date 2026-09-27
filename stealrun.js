// stealrun.js：按窃取预算转手并留账，收尾不限预算清账
import { pushJob, takeJob } from "./workq.js";

const EMPTY_CODE = "E_EMPTY_QUEUE";
const SELF_CODE = "E_SELF_STEAL";
const BAD_CODE = "E_BAD_EVENT";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function ensure(state) {
  const queues = {};
  for (const key of Object.keys(state.queues || {})) queues[key] = (state.queues[key] || []).slice();
  return {
    queues,
    stolen: (state.stolen || []).slice(),
    ledger: (state.ledger || []).map(function (entry) { return [entry[0], entry[1]]; }),
    applied: (state.applied || []).slice()
  };
}

function isString(value) {
  return typeof value === "string" && value.length > 0;
}

function eventCode(spec, fallback) {
  const map = { E_EMPTY_QUEUE: "empty_error_code", E_SELF_STEAL: "self_error_code", E_BAD_EVENT: "event_error_code" };
  const key = map[fallback];
  return (spec && isString(spec[key])) ? spec[key] : fallback;
}

export function step(spec) {
  const state = ensure(spec.state || {});
  const events = spec.events || [];
  let budget = Number.isFinite(spec.budget) ? spec.budget : 0;
  let steal = 0;
  let judged = 0;

  for (const event of events) {
    if (!event || typeof event !== "object") {
      fail(eventCode(spec, BAD_CODE), "事件必须是对象");
    }
    if (event.id !== undefined && state.applied.indexOf(event.id) !== -1) continue;
    const kind = event.kind;

    if (kind === "push") {
      if (!isString(event.worker) || !("job" in event)) {
        fail(eventCode(spec, BAD_CODE), "push 事件缺 worker 或 job");
      }
      state.queues[event.worker] = pushJob(state.queues[event.worker] || [], event.job);
    } else if (kind === "pop") {
      if (!isString(event.worker)) fail(eventCode(spec, BAD_CODE), "pop 事件缺 worker");
      const queue = state.queues[event.worker] || [];
      if (!queue.length) fail(eventCode(spec, EMPTY_CODE), "工人 " + event.worker + " 的队列空，取不出活");
      const [rest] = takeJob(queue, false);
      state.queues[event.worker] = rest;
    } else if (kind === "steal") {
      if (!isString(event.from) || !isString(event.to)) {
        fail(eventCode(spec, BAD_CODE), "steal 事件缺 from 或 to");
      }
      if (event.from === event.to) fail(eventCode(spec, SELF_CODE), "不许从自己队列窃取");
      const source = state.queues[event.from] || [];
      if (!source.length) fail(eventCode(spec, EMPTY_CODE), "来源 " + event.from + " 的队列空，窃取不到活");
      if (budget <= 0) {
        state.ledger.push([event.from, event.to]);
      } else {
        const [rest, job] = takeJob(source, true);
        state.queues[event.from] = rest;
        state.stolen.push(job);
        steal += 1;
        budget -= 1;
      }
    } else {
      fail(eventCode(spec, BAD_CODE), "不认识的事件类型 " + String(kind));
    }

    judged += 1;
    if (event.id !== undefined) state.applied.push(event.id);
  }

  return {
    state,
    steal,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (entry) { return [entry[0], entry[1]]; }),
    judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = ensure(spec.state || {});
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;

  while (pending.length) {
    const [from, to] = pending.shift();
    if (from === to) fail(eventCode(spec, SELF_CODE), "不许从自己队列窃取");
    const source = state.queues[from] || [];
    if (!source.length) fail(eventCode(spec, EMPTY_CODE), "来源 " + from + " 的队列空，收尾窃取不到活");
    const [rest, job] = takeJob(source, true);
    state.queues[from] = rest;
    state.stolen.push(job);
    catchup += 1;
  }

  return { state, catchup };
}
