import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import type { Graph } from "./graph.js";

export async function createRunAndSteps(prisma: PrismaClient, orgId: string, workflowVersionId: string, graph: Graph, triggerInput: any) {
  const runId = `run_${nanoid()}`;

  await prisma.run.create({
    data: {
      id: runId,
      orgId,
      workflowVersionId,
      status: "queued",
      triggerInput
    }
  });

  // One RunStep per node
  for (const node of graph.nodes) {
    await prisma.runStep.create({
      data: {
        id: `step_${nanoid()}`,
        orgId,
        runId,
        nodeId: node.id,
        status: "PENDING",
        attempt: 0
      }
    });
  }

  return runId;
}
