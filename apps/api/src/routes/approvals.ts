import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import IORedis from "ioredis";
import { Queue } from "bullmq";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const runQueue = new Queue("runs", { connection });

export async function approvalsRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/approvals", async (req: any) => {
    const { orgId } = req.user;
    return prisma.approvalRequest.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 50 });
  });

  app.post("/approvals/:id/decide", async (req: any) => {
    const { orgId, userId } = req.user;
    const { decision, reason } = req.body as { decision: "APPROVED" | "REJECTED"; reason?: string };

    const ar = await prisma.approvalRequest.findFirst({ where: { id: req.params.id, orgId } });
    if (!ar) throw new Error("Not found");
    if (ar.status !== "PENDING") throw new Error("Already decided");

    await prisma.approvalRequest.update({
      where: { id: ar.id },
      data: { status: decision, decidedBy: userId, reason, decidedAt: new Date() }
    });

    if (decision === "APPROVED") {
      await prisma.run.update({ where: { id: ar.runId }, data: { status: "running" } });
      await runQueue.add("execute", { orgId, runId: ar.runId }, { attempts: 3 });
    } else {
      await prisma.run.update({ where: { id: ar.runId }, data: { status: "failed", finishedAt: new Date() } });
    }

    return { ok: true };
  });
}
