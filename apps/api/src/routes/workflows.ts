import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { validateApprovalGating } from "../engine/policy.js";

export async function workflowsRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/workflows", async (req: any) => {
    const { orgId } = req.user;
    return prisma.workflow.findMany({ where: { orgId } });
  });

  app.post("/workflows", async (req: any) => {
    const { orgId } = req.user;
    const { projectId, name, description } = req.body;
    const id = `wf_${nanoid()}`;
    const w = await prisma.workflow.create({ data: { id, orgId, projectId, name, description } });
    return w;
  });

  app.get("/workflows/:id/draft", async (req: any) => {
    const { orgId } = req.user;
    const wf = await prisma.workflow.findFirst({ where: { id: req.params.id, orgId } });
    if (!wf?.draftVersionId) return { workflow: wf, draft: null };
    const draft = await prisma.workflowVersion.findFirst({ where: { id: wf.draftVersionId, orgId } });
    return { workflow: wf, draft };
  });

  app.put("/workflows/:id/draft", async (req: any) => {
    const { orgId, userId } = req.user;
    const { graphJson } = req.body;

    const wf = await prisma.workflow.findFirst({ where: { id: req.params.id, orgId } });
    if (!wf) throw new Error("Not found");

    // create draft if missing
    if (!wf.draftVersionId) {
      const draftId = `wfv_${nanoid()}`;
      await prisma.workflowVersion.create({
        data: {
          id: draftId,
          workflowId: wf.id,
          orgId,
          version: 1,
          status: "draft",
          graphJson,
          checksum: "draft",
          createdBy: userId
        }
      });
      await prisma.workflow.update({ where: { id: wf.id }, data: { draftVersionId: draftId } });
      return { ok: true, draftVersionId: draftId };
    }

    await prisma.workflowVersion.update({
      where: { id: wf.draftVersionId },
      data: { graphJson }
    });

    return { ok: true };
  });

  app.post("/workflows/:id/publish", async (req: any) => {
    const { orgId, userId } = req.user;
    const wf = await prisma.workflow.findFirst({ where: { id: req.params.id, orgId } });
    if (!wf?.draftVersionId) throw new Error("No draft to publish");

    const draft = await prisma.workflowVersion.findFirst({ where: { id: wf.draftVersionId, orgId } });
    if (!draft) throw new Error("Draft not found");

    const graph = (draft.graphJson as any);
    validateApprovalGating(graph);

    // publish by copying draft into immutable published version
    const publishedId = `wfv_${nanoid()}`;
    const nextVersion = (wf.publishedVersionId ? (await prisma.workflowVersion.count({ where: { workflowId: wf.id, orgId } })) + 1 : 1);

    await prisma.workflowVersion.create({
      data: {
        id: publishedId,
        workflowId: wf.id,
        orgId,
        version: nextVersion,
        status: "published",
        graphJson: graph,
        checksum: `sha256_placeholder_${Date.now()}`,
        createdBy: userId
      }
    });

    await prisma.workflow.update({
      where: { id: wf.id },
      data: { publishedVersionId: publishedId }
    });

    return { ok: true, publishedVersionId: publishedId };
  });
}
