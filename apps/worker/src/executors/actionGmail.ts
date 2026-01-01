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
 * Gmail action executor
 * Sends emails via Gmail API (requires OAuth2 token in secrets)
 *
 * Config:
 * - mode: "draft" (returns preview) or "send" (requires approval)
 * - to: recipient email
 * - subject: email subject
 * - body: email body (plain text or HTML)
 * - accessTokenSecret: secret ID for OAuth2 access token
 */
export async function actionGmail({ prisma, orgId, runId, node, input }: any) {
  const mode = node.config?.mode || "draft";
  const to = node.config?.to || input?.to;
  const subject = node.config?.subject || input?.subject || "Message from FlowForge";
  const body = node.config?.body || input?.body || input?.text || "";
  const accessTokenSecretId = node.config?.accessTokenSecret;

  if (!to) throw new Error("Gmail: 'to' field required");

  // Draft mode: just return preview
  if (mode === "draft") {
    return {
      draft: {
        to,
        subject,
        body,
        preview: `To: ${to}\nSubject: ${subject}\n\n${body.slice(0, 200)}...`
      }
    };
  }

  // Send mode: requires approval
  if (node.risk?.requiresApproval) {
    const approvals = await prisma.approvalRequest.findMany({
      where: { orgId, runId, status: "APPROVED" }
    });
    const allowed = approvals.some((a: any) => (a.scopeJson as any)?.allowedNodeIds?.includes(node.id));
    if (!allowed) throw new Error("Approval required to send email");
  }

  // Get access token from secrets
  if (!accessTokenSecretId) {
    throw new Error("Gmail send mode requires accessTokenSecret");
  }

  const secret = await prisma.secret.findFirst({
    where: { id: accessTokenSecretId, orgId }
  });
  if (!secret) throw new Error("Access token secret not found");

  const credentials = decryptJson(secret.encrypted as any);
  const accessToken = credentials.access_token || credentials;

  // Create email message in RFC 2822 format
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body
  ];
  const rawMessage = emailLines.join("\r\n");
  const encodedMessage = Buffer.from(rawMessage).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // Send via Gmail API
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  return {
    sent: true,
    messageId: result.id,
    to,
    subject
  };
}
