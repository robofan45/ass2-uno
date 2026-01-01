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

function isRiskyMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

async function resolveHeaders(prisma: PrismaClient, orgId: string, headers: any) {
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers || {})) {
    if (typeof v === "object" && v && (v as any).secretId) {
      const sec = await prisma.secret.findFirst({ where: { id: (v as any).secretId, orgId } });
      if (!sec) throw new Error("Secret not found");
      const val = decryptJson(sec.encrypted as any);
      resolved[k] = String(val);
    } else {
      resolved[k] = String(v);
    }
  }
  return resolved;
}

export async function actionHttp({ prisma, orgId, runId, node, input }: any) {
  const method = (node.config?.method || "GET").toUpperCase();
  const url = node.config?.url;
  if (!url) throw new Error("Missing url");

  // Enforce approval for risky methods if requiresApproval
  if (node.risk?.requiresApproval || isRiskyMethod(method)) {
    const approvals = await prisma.approvalRequest.findMany({ where: { orgId, runId, status: "APPROVED" } });
    const allowed = approvals.some((a: any) => (a.scopeJson as any)?.allowedNodeIds?.includes(node.id));
    if (!allowed) throw new Error("Approval required for this action");
  }

  const headers = await resolveHeaders(prisma, orgId, node.config?.headers || {});
  const body = node.config?.bodyMapping?.jsonPath === "$" ? input : undefined;

  const controller = new AbortController();
  const timeoutMs = node.policy?.timeoutMs ?? 15000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const resp = await fetch(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal
  }).finally(() => clearTimeout(t));

  const text = await resp.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }

  return { status: resp.status, ok: resp.ok, json, text: json ? undefined : text };
}
