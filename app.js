// app.js：渲染结果
import { beat, suspect, promote } from "./nodes.js";
import { step, close } from "./detectrun.js";

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
      nodes: state.nodes, suspected: state.suspected, promotions: state.promotions,
      ledger: state.ledger, applied: state.applied.length
    });
  };
  return { nodes: closed.state.nodes.map(function (row) { return [row[0], row[1], row[2]]; }),
           suspected: closed.state.suspected.slice(),
           promotions: closed.state.promotions.map(function (pair) { return [pair[0], pair[1]]; }),
           served_first: first.served, served_wide: wide.served,
           pair_differs: first.served !== wide.served,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.served, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length,
           tail: beat([], "z", 1).length + suspect([["z", 1, 0]], [], "z").suspected.length
             + promote([["z", 1, 0]], ["z"], [], "z").promotions.length };
}
