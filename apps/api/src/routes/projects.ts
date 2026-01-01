import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

export async function projectsRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/projects", async (req: any) => {
    const { orgId } = req.user;
    return prisma.project.findMany({ where: { orgId } });
  });

  app.post("/projects", async (req: any) => {
    const { orgId } = req.user;
    const { name } = req.body;
    const id = `proj_${nanoid()}`;
    const p = await prisma.project.create({ data: { id, orgId, name } });
    return p;
  });
}
