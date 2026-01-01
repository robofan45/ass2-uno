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
 * Jira action executor
 * Creates or updates Jira issues
 *
 * Config:
 * - action: "create" or "update"
 * - baseUrl: Jira instance URL (e.g., "https://yourcompany.atlassian.net")
 * - apiTokenSecret: secret ID for API token
 * - email: user email for basic auth
 * - project: project key (for create)
 * - issueType: issue type (e.g., "Task", "Bug", "Story")
 * - summary: issue summary/title
 * - description: issue description
 * - issueKey: issue key (for update)
 */
export async function actionJira({ prisma, orgId, runId, node, input }: any) {
  const action = node.config?.action || "create";
  const baseUrl = node.config?.baseUrl;
  const apiTokenSecretId = node.config?.apiTokenSecret;
  const email = node.config?.email;

  if (!baseUrl) throw new Error("Jira: baseUrl required");
  if (!apiTokenSecretId) throw new Error("Jira: apiTokenSecret required");
  if (!email) throw new Error("Jira: email required for authentication");

  // Check approval for write operations
  if (node.risk?.requiresApproval) {
    const approvals = await prisma.approvalRequest.findMany({
      where: { orgId, runId, status: "APPROVED" }
    });
    const allowed = approvals.some((a: any) => (a.scopeJson as any)?.allowedNodeIds?.includes(node.id));
    if (!allowed) throw new Error("Approval required for Jira write operation");
  }

  // Get API token from secrets
  const secret = await prisma.secret.findFirst({
    where: { id: apiTokenSecretId, orgId }
  });
  if (!secret) throw new Error("API token secret not found");

  const apiToken = decryptJson(secret.encrypted as any);
  const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

  if (action === "create") {
    const project = node.config?.project || input?.project;
    const issueType = node.config?.issueType || input?.issueType || "Task";
    const summary = node.config?.summary || input?.summary;
    const description = node.config?.description || input?.description || "";

    if (!project) throw new Error("Jira create: project key required");
    if (!summary) throw new Error("Jira create: summary required");

    const payload = {
      fields: {
        project: { key: project },
        summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: description }]
            }
          ]
        },
        issuetype: { name: issueType }
      }
    };

    const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return {
      created: true,
      issueKey: result.key,
      issueId: result.id,
      url: `${baseUrl}/browse/${result.key}`
    };
  } else if (action === "update") {
    const issueKey = node.config?.issueKey || input?.issueKey;
    const summary = node.config?.summary || input?.summary;
    const description = node.config?.description || input?.description;

    if (!issueKey) throw new Error("Jira update: issueKey required");

    const fields: any = {};
    if (summary) fields.summary = summary;
    if (description) {
      fields.description = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: description }]
          }
        ]
      };
    }

    const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
      method: "PUT",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error: ${response.status} ${error}`);
    }

    return {
      updated: true,
      issueKey,
      url: `${baseUrl}/browse/${issueKey}`
    };
  } else {
    throw new Error(`Unknown Jira action: ${action}`);
  }
}
