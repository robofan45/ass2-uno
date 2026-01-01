import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { encryptJson } from "../crypto/vault.js";

export async function secretsRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/secrets", async (req: any) => {
    const { orgId } = req.user;
    return prisma.secret.findMany({ where: { orgId }, select: { id: true, name: true, kind: true, createdAt: true } });
  });

  app.post("/secrets", async (req: any) => {
    const { orgId } = req.user;
    const { name, kind, value } = req.body as { name: string; kind: string; value: any };
    const id = `sec_${nanoid()}`;
    const encrypted = encryptJson(value);

    await prisma.secret.create({ data: { id, orgId, name, kind, encrypted } });
    return { ok: true, id };
  });
}
