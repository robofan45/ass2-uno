import { PrismaClient } from "@prisma/client";

type Graph = { nodes: any[]; edges: any[] };

function inboundDeps(graph: Graph, nodeId: string) {
  return graph.edges.filter(e => e.target === nodeId).map(e => e.source);
}

export async function executeRun(prisma: PrismaClient, orgId: string, runId: string, executors: any) {
  const run = await prisma.run.findFirst({ where: { id: runId, orgId } });
  if (!run) return;

  if (run.status === "waiting_approval") return;
  if (run.status === "succeeded" || run.status === "failed" || run.status === "canceled") return;

  const wv = await prisma.workflowVersion.findFirst({ where: { id: run.workflowVersionId, orgId } });
  if (!wv) throw new Error("Workflow version missing");
  const graph = wv.graphJson as any as Graph;

  await prisma.run.update({ where: { id: runId }, data: { status: "running" } });

  // Simple scheduler loop: repeatedly find a ready step and execute it.
  // Durable: step state is in Postgres; crashes can resume by re-enqueueing runId.
  while (true) {
    const steps = await prisma.runStep.findMany({ where: { runId, orgId } });

    // Determine if done
    const anyFailed = steps.some(s => s.status === "FAILED");
    if (anyFailed) {
      await prisma.run.update({ where: { id: runId }, data: { status: "failed", finishedAt: new Date() } });
      return;
    }
    const allSucceeded = steps.every(s => s.status === "SUCCEEDED" || s.status === "SKIPPED");
    if (allSucceeded) {
      await prisma.run.update({ where: { id: runId }, data: { status: "succeeded", finishedAt: new Date() } });
      return;
    }

    // Find ready pending steps (all deps succeeded)
    const pending = steps.filter(s => s.status === "PENDING" && (!s.nextRunAt || s.nextRunAt <= new Date()));
    const ready = pending.find(s => {
      const deps = inboundDeps(graph, s.nodeId);
      return deps.every(d => steps.find(x => x.nodeId === d)?.status === "SUCCEEDED");
    });

    if (!ready) return; // nothing ready; exit (will be re-enqueued by timers/approvals)

    // Claim step atomically by updating if still PENDING
    const claimed = await prisma.runStep.updateMany({
      where: { id: ready.id, status: "PENDING" },
      data: { status: "RUNNING", attempt: { increment: 1 }, startedAt: new Date() }
    });
    if (claimed.count === 0) continue;

    const node = graph.nodes.find(n => n.id === ready.nodeId);
    try {
      const input = await buildNodeInput(prisma, orgId, runId, graph, node);
      await prisma.runStep.update({ where: { id: ready.id }, data: { input } });

      const exec = executors[node.type];
      if (!exec) throw new Error(`No executor for node type ${node.type}`);

      const result = await exec({ prisma, orgId, runId, node, input });

      // Approval node may set run waiting_approval
      if (result?.__runStatus === "waiting_approval") return;

      await prisma.runStep.update({
        where: { id: ready.id },
        data: { status: "SUCCEEDED", output: result, finishedAt: new Date() }
      });
    } catch (err: any) {
      const attempt = (await prisma.runStep.findFirst({ where: { id: ready.id } }))?.attempt || 1;
      const maxRetries = node?.policy?.maxRetries ?? 2;
      const backoffMs = node?.policy?.retryBackoffMs ?? 2000;

      if (attempt <= maxRetries) {
        await prisma.runStep.update({
          where: { id: ready.id },
          data: {
            status: "PENDING",
            error: { message: err.message, code: "STEP_FAILED_RETRYING" },
            nextRunAt: new Date(Date.now() + backoffMs * attempt)
          }
        });
        return; // exit; queue will retry
      }

      await prisma.runStep.update({
        where: { id: ready.id },
        data: { status: "FAILED", error: { message: err.message, code: "STEP_FAILED" }, finishedAt: new Date() }
      });
      // loop will mark run failed
    }
  }
}

async function buildNodeInput(prisma: PrismaClient, orgId: string, runId: string, graph: any, node: any) {
  // MVP: input is merged outputs of direct predecessors + triggerInput
  const run = await prisma.run.findFirst({ where: { id: runId, orgId } });
  const edgesIn = graph.edges.filter((e: any) => e.target === node.id);
  const deps = await prisma.runStep.findMany({ where: { runId, orgId, nodeId: { in: edgesIn.map((e: any) => e.source) } } });

  const merged: any = { trigger: run?.triggerInput ?? {} };
  for (const d of deps) merged[d.nodeId] = d.output ?? {};
  return merged;
}
