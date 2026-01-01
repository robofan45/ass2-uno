import { nanoid } from "nanoid";

export async function approvalHuman({ prisma, orgId, runId, node, input }: any) {
  const message = node.config?.message || "Approve?";
  const scope = node.config?.scope || { allowedNodeIds: [] };

  await prisma.approvalRequest.create({
    data: {
      id: `apr_${nanoid()}`,
      orgId,
      runId,
      nodeId: node.id,
      status: "PENDING",
      message,
      scopeJson: scope,
      requestedBy: "system"
    }
  });

  await prisma.run.update({ where: { id: runId }, data: { status: "waiting_approval" } });

  return { __runStatus: "waiting_approval" };
}
