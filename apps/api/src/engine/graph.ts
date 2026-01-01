export type Graph = {
  nodes: Array<{ id: string; type: string; config: any; risk?: { requiresApproval?: boolean; riskLevel?: string } }>;
  edges: Array<{ id: string; source: string; target: string }>;
};

export function inboundMap(graph: Graph) {
  const inbound = new Map<string, string[]>();
  for (const n of graph.nodes) inbound.set(n.id, []);
  for (const e of graph.edges) {
    inbound.get(e.target)?.push(e.source);
  }
  return inbound;
}

export function topoSort(graph: Graph): string[] {
  const inbound = inboundMap(graph);
  const out = new Map<string, string[]>();
  for (const n of graph.nodes) out.set(n.id, []);
  for (const e of graph.edges) out.get(e.source)!.push(e.target);

  const q: string[] = [];
  for (const [id, deps] of inbound.entries()) if (deps.length === 0) q.push(id);

  const res: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    res.push(id);
    for (const t of out.get(id) || []) {
      const deps = inbound.get(t)!;
      inbound.set(t, deps.filter(d => d !== id));
      if (inbound.get(t)!.length === 0) q.push(t);
    }
  }
  if (res.length !== graph.nodes.length) throw new Error("Graph has cycles or disconnected nodes.");
  return res;
}
