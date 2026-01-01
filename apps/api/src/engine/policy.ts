import type { Graph } from "./graph.js";

export function validateApprovalGating(graph: Graph) {
  // MVP rule: if any node requiresApproval, graph must contain at least one approval.human
  const risky = graph.nodes.filter(n => n.risk?.requiresApproval);
  if (risky.length === 0) return;

  const hasApproval = graph.nodes.some(n => n.type === "approval.human");
  if (!hasApproval) {
    throw new Error("Policy violation: risky actions present but no Human Approval node exists.");
  }
}
