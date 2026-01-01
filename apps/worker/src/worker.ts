import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { executeRun } from "./engine.js";
import { executors } from "./executors/index.js";

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

new Worker(
  "runs",
  async job => {
    const { orgId, runId } = job.data as any;
    await executeRun(prisma, orgId, runId, executors);
  },
  { connection }
);

console.log("Worker started");
