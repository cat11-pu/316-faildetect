// nodes.js：节点表与疑似名单
// 节点行：[名字, 最后心跳时刻, 世代]；疑似名单存名字；提升记录存 [名字, 提升后世代]。
export function beat(nodes, name, at) {
  const next = nodes.map(function (row) { return row.slice(); });
  const found = next.find(function (row) { return row[0] === name; });
  if (found) {
    if (!(at > found[1])) {
      const error = new Error("stale beat: " + name + " at " + at);
      error.code = "E_STALE_BEAT";
      throw error;
    }
    found[1] = at;
  } else {
    next.push([name, at, 0]);
  }
  return next;
}

export function suspect(nodes, suspected, name) {
  const next = suspected.slice();
  if (next.indexOf(name) === -1) next.push(name);
  return { nodes: nodes, suspected: next };
}

export function promote(nodes, suspected, promotions, name) {
  let gen = 1;
  const nextNodes = nodes.map(function (row) {
    if (row[0] !== name) return row.slice();
    gen = row[2] + 1;
    return [row[0], row[1], gen];
  });
  const nextSuspected = suspected.filter(function (item) { return item !== name; });
  const nextPromotions = promotions.concat([[name, gen]]);
  return { nodes: nextNodes, suspected: nextSuspected, promotions: nextPromotions };
}
