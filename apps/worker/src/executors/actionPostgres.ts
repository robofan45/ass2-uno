import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// Re-implement vault functions here for worker (or share via package)
function decryptJson(blob: any) {
  const KEY = (process.env.VAULT_MASTER_KEY || "").padEnd(32, "_").slice(0, 32);
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const data = Buffer.from(blob.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(KEY), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}

/**
 * Postgres action executor
 * Executes SQL queries against PostgreSQL databases
 *
 * Config:
 * - action: "query" (SELECT) or "execute" (INSERT/UPDATE/DELETE)
 * - connectionStringSecret: secret ID for DB connection string
 * - query: SQL query string
 * - params: query parameters (for parameterized queries)
 */
export async function actionPostgres({ prisma, orgId, runId, node, input }: any) {
  const action = node.config?.action || "query";
  const connectionStringSecretId = node.config?.connectionStringSecret;
  const query = node.config?.query || input?.query;
  const params = node.config?.params || input?.params || [];

  if (!connectionStringSecretId) throw new Error("Postgres: connectionStringSecret required");
  if (!query) throw new Error("Postgres: query required");

  // Check approval for write operations
  if (action === "execute" && node.risk?.requiresApproval) {
    const approvals = await prisma.approvalRequest.findMany({
      where: { orgId, runId, status: "APPROVED" }
    });
    const allowed = approvals.some((a: any) => (a.scopeJson as any)?.allowedNodeIds?.includes(node.id));
    if (!allowed) throw new Error("Approval required for Postgres write operation");
  }

  // Get connection string from secrets
  const secret = await prisma.secret.findFirst({
    where: { id: connectionStringSecretId, orgId }
  });
  if (!secret) throw new Error("Connection string secret not found");

  const connectionString = decryptJson(secret.encrypted as any);

  // For MVP: use node-postgres via dynamic import
  // In production, you'd add 'pg' to package.json dependencies
  let pg: any;
  try {
    pg = await import("pg");
  } catch {
    throw new Error("pg module not installed. Add 'pg' to worker dependencies.");
  }

  const client = new pg.Client({ connectionString });

  try {
    await client.connect();

    const result = await client.query(query, params);

    if (action === "query") {
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map((f: any) => ({ name: f.name, dataType: f.dataTypeID }))
      };
    } else {
      return {
        success: true,
        rowCount: result.rowCount,
        command: result.command
      };
    }
  } finally {
    await client.end();
  }
}
