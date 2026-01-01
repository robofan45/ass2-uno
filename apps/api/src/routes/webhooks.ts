import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import { createRunAndSteps } from "../engine/materialize.js";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const runQueue = new Queue("runs", { connection });

// For MVP: webhook trigger is mapped by workflowVersionId in query param.
// Production: signed webhook URLs, per-workflow path mapping, auth, etc.
export async function webhooksRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.post("/hook/:key", async (req: any, reply) => {
    const { orgId, workflowVersionId } = req.query as any;
    if (!orgId || !workflowVersionId) return reply.code(400).send({ error: "orgId and workflowVersionId required" });

    const wv = await prisma.workflowVersion.findFirst({ where: { id: workflowVersionId, orgId } });
    if (!wv) return reply.code(404).send({ error: "Workflow version not found" });

    const graph = wv.graphJson as any;
    const runId = await createRunAndSteps(prisma, orgId, workflowVersionId, graph, { body: req.body, headers: req.headers });

    await runQueue.add("execute", { orgId, runId }, { attempts: 3 });
    return { ok: true, runId };
  });
}
