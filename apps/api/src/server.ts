import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { signJwt, verifyJwt, hashPassword, verifyPassword } from "./auth.js";
import { nanoid } from "nanoid";
import { projectsRoutes } from "./routes/projects.js";
import { workflowsRoutes } from "./routes/workflows.js";
import { runsRoutes } from "./routes/runs.js";
import { approvalsRoutes } from "./routes/approvals.js";
import { secretsRoutes } from "./routes/secrets.js";
import { webhooksRoutes } from "./routes/webhooks.js";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

app.register(cors, { origin: true });

app.decorateRequest("user", null);

// Auth middleware
app.addHook("preHandler", async (req: any) => {
  const openPaths = ["/health", "/auth/signup", "/auth/login"];
  if (openPaths.some(p => req.routeOptions.url?.startsWith(p))) return;

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
  req.user = verifyJwt(auth.slice("Bearer ".length));
});

app.get("/health", async () => ({ ok: true }));

app.post("/auth/signup", async (req: any) => {
  const { email, password, orgName } = req.body as any;
  const userId = `usr_${nanoid()}`;
  const orgId = `org_${nanoid()}`;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already exists");

  await prisma.org.create({ data: { id: orgId, name: orgName || "My Org" } });
  await prisma.user.create({ data: { id: userId, email, password: await hashPassword(password) } });
  await prisma.membership.create({ data: { id: `mem_${nanoid()}`, orgId, userId, role: "owner" } });

  const token = signJwt({ userId, orgId, role: "owner" });
  return { token, orgId };
});

app.post("/auth/login", async (req: any) => {
  const { email, password } = req.body as any;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");
  if (!(await verifyPassword(password, user.password))) throw new Error("Invalid credentials");

  const mem = await prisma.membership.findFirst({ where: { userId: user.id } });
  if (!mem) throw new Error("No org membership");

  const token = signJwt({ userId: user.id, orgId: mem.orgId, role: mem.role as any });
  return { token, orgId: mem.orgId };
});

await projectsRoutes(app, prisma);
await workflowsRoutes(app, prisma);
await runsRoutes(app, prisma);
await approvalsRoutes(app, prisma);
await secretsRoutes(app, prisma);
await webhooksRoutes(app, prisma);

app.listen({ port: 4000, host: "0.0.0.0" });
