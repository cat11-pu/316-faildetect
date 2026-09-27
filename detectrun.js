// detectrun.js：按处理预算消费账上事件，用尽的连着载压账；收尾不限预算清账
import { beat, suspect, promote } from "./nodes.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function codes(spec) {
  return {
    event: spec.event_error_code || "E_BAD_EVENT",
    stale: spec.stale_error_code || "E_STALE_BEAT",
    node: spec.node_error_code || "E_NO_NODE",
    suspect: spec.suspect_error_code || "E_NOT_SUSPECT"
  };
}

// 结构校验：与预算无关，先整批过一遍
function checkShape(event, code) {
  if (!event || typeof event !== "object" || typeof event.kind !== "string") {
    throw fail(code, "事件结构不合法");
  }
  if (event.kind === "beat") {
    if (typeof event.name !== "string" || typeof event.at !== "number" || !Number.isFinite(event.at)) {
      throw fail(code, "心跳事件缺 name 或 at");
    }
  } else if (event.kind === "suspect" || event.kind === "promote") {
    if (typeof event.name !== "string") {
      throw fail(code, "事件缺 name");
    }
  } else {
    throw fail(code, "未知事件类型 " + event.kind);
  }
}

// 账上条目的紧凑形态：[kind, name] 或 [kind, name, at]
function compact(event) {
  return event.kind === "beat" ? ["beat", event.name, event.at] : [event.kind, event.name];
}

function sameEntry(a, b) {
  return a.length === b.length && a.every(function (part, i) { return part === b[i]; });
}

function applyEntry(state, entry, spec) {
  const c = codes(spec);
  if (entry[0] === "beat") {
    state.nodes = beat(state.nodes, entry[1], entry[2], c.stale);
    state.suspected = state.suspected.filter(function (item) { return item !== entry[1]; });
  } else if (entry[0] === "suspect") {
    const got = suspect(state.nodes, state.suspected, entry[1], c.node);
    state.suspected = got.suspected;
  } else if (entry[0] === "promote") {
    const got = promote(state.nodes, state.suspected, state.promotions, entry[1], c.suspect);
    state.nodes = got.nodes;
    state.suspected = got.suspected;
    state.promotions = got.promotions;
  } else {
    throw fail(codes(spec).event, "账上条目结构不合法");
  }
}

function cloneState(state) {
  return {
    nodes: (state.nodes || []).map(function (row) { return [row[0], row[1], row[2]]; }),
    suspected: (state.suspected || []).slice(),
    promotions: (state.promotions || []).map(function (pair) { return [pair[0], pair[1]]; }),
    ledger: (state.ledger || []).map(function (entry) { return entry.slice(); }),
    applied: (state.applied || []).map(function (entry) { return entry.slice(); })
  };
}

export function step(spec) {
  const c = codes(spec);
  const events = spec.events || [];
  events.forEach(function (event) { checkShape(event, c.event); });
  const state = cloneState(spec.state || {});
  const queue = state.ledger.slice();
  events.forEach(function (event) {
    const entry = compact(event);
    const done = state.applied.some(function (seen) { return sameEntry(seen, entry); });
    const queued = queue.some(function (pending) { return sameEntry(pending, entry); });
    if (!done && !queued) {
      queue.push(entry);
    }
  });
  const budget = Math.max(0, spec.budget || 0);
  let served = 0;
  while (served < budget && queue.length > 0) {
    const entry = queue[0];
    applyEntry(state, entry, spec);
    queue.shift();
    state.applied.push(entry.slice());
    served += 1;
  }
  state.ledger = queue;
  return {
    state: state,
    served: served,
    ledger_before: queue.length,
    ledger: queue.map(function (entry) { return entry.slice(); }),
    judged: served,
    judged_bound: events.length + (spec.state && spec.state.ledger ? spec.state.ledger.length : 0)
  };
}

export function close(spec) {
  const state = cloneState(spec.state || {});
  const queue = state.ledger.slice();
  let catchup = 0;
  while (queue.length > 0) {
    const entry = queue[0];
    applyEntry(state, entry, spec);
    queue.shift();
    state.applied.push(entry.slice());
    catchup += 1;
  }
  state.ledger = queue;
  return { state: state, catchup: catchup };
}
