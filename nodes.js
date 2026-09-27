// nodes.js：节点表、疑似名单与提升记录（纯函数，不改入参）
function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function beat(nodes, name, at, staleCode) {
  const code = staleCode || "E_STALE_BEAT";
  const next = nodes.map(function (row) { return [row[0], row[1], row[2]]; });
  const index = next.findIndex(function (row) { return row[0] === name; });
  if (index < 0) {
    next.push([name, at, 0]);
    return next;
  }
  if (!(at > next[index][1])) {
    throw fail(code, "心跳时刻 " + at + " 不晚于上次 " + next[index][1]);
  }
  next[index][1] = at;
  return next;
}

export function suspect(nodes, suspected, name, nodeCode) {
  const code = nodeCode || "E_NO_NODE";
  if (!nodes.some(function (row) { return row[0] === name; })) {
    throw fail(code, "节点 " + name + " 还没登记过");
  }
  const nextSuspected = suspected.slice();
  if (nextSuspected.indexOf(name) < 0) {
    nextSuspected.push(name);
  }
  return { nodes: nodes, suspected: nextSuspected };
}

export function promote(nodes, suspected, promotions, name, suspectCode) {
  const code = suspectCode || "E_NOT_SUSPECT";
  const index = nodes.findIndex(function (row) { return row[0] === name; });
  if (suspected.indexOf(name) < 0) {
    throw fail(code, "节点 " + name + " 不在疑似名单里");
  }
  const nextNodes = nodes.map(function (row) { return [row[0], row[1], row[2]]; });
  const generation = nextNodes[index][2] + 1;
  nextNodes[index][2] = generation;
  const nextSuspected = suspected.filter(function (item) { return item !== name; });
  const nextPromotions = promotions.map(function (pair) { return [pair[0], pair[1]]; });
  nextPromotions.push([name, generation]);
  return { nodes: nextNodes, suspected: nextSuspected, promotions: nextPromotions };
}
