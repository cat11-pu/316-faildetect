// detectrun.js：按处理预算处理并留账
// 账（ledger）里压的是还没处理的事件；每条事件花一次预算，预算用尽就连着载压账。
import { beat, suspect, promote } from "./nodes.js";

function fail(spec, key, fallback, message) {
  const error = new Error(message);
  error.code = spec[key] || fallback;
  throw error;
}

function validate(spec, events) {
  events.forEach(function (event) {
    const ok = event && typeof event === "object"
      && (event.kind === "beat" || event.kind === "suspect" || event.kind === "promote")
      && typeof event.name === "string"
      && (event.kind !== "beat" || typeof event.at === "number");
    if (!ok) fail(spec, "event_error_code", "E_BAD_EVENT", "bad event: " + JSON.stringify(event));
  });
}

function copyState(state) {
  return {
    nodes: state.nodes.map(function (row) { return row.slice(); }),
    suspected: state.suspected.slice(),
    promotions: state.promotions.map(function (pair) { return pair.slice(); }),
    ledger: state.ledger.slice(),
    applied: state.applied.slice()
  };
}

function applyEvent(spec, state, event) {
  if (event.kind === "beat") {
    const row = state.nodes.find(function (item) { return item[0] === event.name; });
    if (row && !(event.at > row[1])) {
      fail(spec, "stale_error_code", "E_STALE_BEAT", "stale beat: " + event.name);
    }
    state.nodes = beat(state.nodes, event.name, event.at);
    state.suspected = state.suspected.filter(function (name) { return name !== event.name; });
    return;
  }
  if (event.kind === "suspect") {
    const known = state.nodes.some(function (item) { return item[0] === event.name; });
    if (!known) fail(spec, "node_error_code", "E_NO_NODE", "no node: " + event.name);
    state.suspected = suspect(state.nodes, state.suspected, event.name).suspected;
    return;
  }
  if (state.suspected.indexOf(event.name) === -1) {
    fail(spec, "suspect_error_code", "E_NOT_SUSPECT", "not suspected: " + event.name);
  }
  const lifted = promote(state.nodes, state.suspected, state.promotions, event.name);
  state.nodes = lifted.nodes;
  state.suspected = lifted.suspected;
  state.promotions = lifted.promotions;
}

function markApplied(state, event) {
  if (event.id !== undefined) state.applied.push(event.id);
}

function ledgerRow(event) {
  return event.kind === "beat" ? [event.kind, event.name, event.at] : [event.kind, event.name];
}

export function step(spec) {
  const events = spec.events || [];
  validate(spec, events);
  const state = copyState(spec.state);
  const judged_bound = state.ledger.length + events.length;
  const fresh = events.filter(function (event) {
    return event.id === undefined || state.applied.indexOf(event.id) === -1;
  });
  const queue = state.ledger.concat(fresh);
  state.ledger = [];
  let budget = spec.budget || 0;
  let served = 0;
  queue.forEach(function (event) {
    if (budget > 0) {
      applyEvent(spec, state, event);
      markApplied(state, event);
      budget -= 1;
      served += 1;
    } else {
      state.ledger.push(event);
    }
  });
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(ledgerRow),
    judged: served,
    judged_bound: judged_bound
  };
}

export function close(spec) {
  const state = copyState(spec.state);
  const queue = state.ledger.slice();
  state.ledger = [];
  let catchup = 0;
  queue.forEach(function (event) {
    applyEvent(spec, state, event);
    markApplied(state, event);
    catchup += 1;
  });
  return { state: state, catchup: catchup };
}
