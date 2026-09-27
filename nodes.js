// nodes.js：节点表与疑似名单（基线：一律原样返回）
export function beat(nodes, name, at) {
  return nodes;
}

export function suspect(nodes, suspected, name) {
  return { nodes: nodes, suspected: suspected };
}

export function promote(nodes, suspected, promotions, name) {
  return { nodes: nodes, suspected: suspected, promotions: promotions };
}
