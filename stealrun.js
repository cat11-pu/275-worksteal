// stealrun.js：按窃取预算转手并留账（state 不可变，跨轮靠 applied 去重）
import { pushJob, takeJob } from "./workq.js";

export const EMPTY_CODE = "E_EMPTY_QUEUE";
export const SELF_CODE = "E_SELF_STEAL";
export const BAD_CODE = "E_BAD_EVENT";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const source = state || {};
  const queues = {};
  const sourceQueues = source.queues || {};
  Object.keys(sourceQueues).forEach(function (name) {
    queues[name] = sourceQueues[name].slice();
  });
  return {
    queues,
    stolen: (source.stolen || []).slice(),
    ledger: (source.ledger || []).map(function (pair) { return pair.slice(); }),
    applied: (source.applied || []).slice()
  };
}

function isWorker(value) {
  return typeof value === "string" && value.length > 0;
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail(BAD_CODE, "事件必须是对象");
  }
  if (event.kind === "push") {
    if (!isWorker(event.worker) || event.job === undefined) {
      fail(BAD_CODE, "push 事件必须带 worker 与 job");
    }
  } else if (event.kind === "pop") {
    if (!isWorker(event.worker)) fail(BAD_CODE, "pop 事件必须带 worker");
  } else if (event.kind === "steal") {
    if (!isWorker(event.from) || !isWorker(event.to)) {
      fail(BAD_CODE, "steal 事件必须带 from 与 to");
    }
  } else {
    fail(BAD_CODE, "未知事件类型: " + String(event.kind));
  }
}

function eventKey(event, index) {
  return event.id !== undefined && event.id !== null ? event.id : "#" + index;
}

export function step(spec) {
  const state = cloneState(spec.state);
  const events = spec.events || [];
  let budget = Number.isFinite(spec.budget) ? spec.budget : 0;
  let steal = 0;
  let judged = 0;

  events.forEach(function (event, index) {
    validateEvent(event);
    const key = eventKey(event, index);
    if (state.applied.indexOf(key) !== -1) return;
    state.applied.push(key);
    judged += 1;

    if (event.kind === "push") {
      state.queues[event.worker] = pushJob(state.queues[event.worker] || [], event.job);
    } else if (event.kind === "pop") {
      const queue = state.queues[event.worker] || [];
      if (queue.length === 0) fail(EMPTY_CODE, "工人 " + event.worker + " 的队列为空，无活可取");
      const taken = takeJob(queue, false);
      state.queues[event.worker] = taken[0];
    } else {
      if (event.from === event.to) fail(SELF_CODE, "不许窃取自己: " + event.from);
      if (budget > 0) {
        const queue = state.queues[event.from] || [];
        if (queue.length === 0) fail(EMPTY_CODE, "被窃工人 " + event.from + " 的队列为空");
        const taken = takeJob(queue, true);
        state.queues[event.from] = taken[0];
        state.stolen.push(taken[1]);
        budget -= 1;
        steal += 1;
      } else {
        state.ledger.push([event.from, event.to]);
      }
    }
  });

  return {
    state,
    steal,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (pair) { return pair.slice(); }),
    judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  let catchup = 0;

  while (state.ledger.length > 0) {
    const pair = state.ledger[0];
    const from = pair[0];
    const to = pair[1];
    if (from === to) fail(SELF_CODE, "不许窃取自己: " + from);
    const queue = state.queues[from] || [];
    if (queue.length === 0) fail(EMPTY_CODE, "被窃工人 " + from + " 的队列为空");
    const taken = takeJob(queue, true);
    state.queues[from] = taken[0];
    state.stolen.push(taken[1]);
    state.ledger.shift();
    catchup += 1;
  }

  return { state, catchup };
}
