import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import { createRunAndSteps } from "../engine/materialize.js";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const runQueue = new Queue("runs", { connection });

export async function runsRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/runs", async (req: any) => {
    const { orgId } = req.user;
    return prisma.run.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 50 });
  });

  app.get("/runs/:id", async (req: any) => {
    const { orgId } = req.user;
    const run = await prisma.run.findFirst({ where: { id: req.params.id, orgId }, include: { steps: true, approvals: true } });
    if (!run) throw new Error("Not found");
    return run;
  });

  app.post("/runs/start", async (req: any) => {
    const { orgId } = req.user;
    const { workflowVersionId, triggerInput } = req.body;

    const wv = await prisma.workflowVersion.findFirst({ where: { id: workflowVersionId, orgId } });
    if (!wv) throw new Error("Workflow version not found");

    const graph = wv.graphJson as any;
    const runId = await createRunAndSteps(prisma, orgId, workflowVersionId, graph, triggerInput);

    await runQueue.add("execute", { orgId, runId }, { attempts: 3 });
    return { ok: true, runId };
  });
}
