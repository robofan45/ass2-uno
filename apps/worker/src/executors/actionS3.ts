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
 * S3 action executor
 * Get/put objects in S3-compatible storage
 *
 * Config:
 * - action: "get" or "put"
 * - credentialsSecret: secret ID for AWS credentials
 * - region: AWS region
 * - bucket: S3 bucket name
 * - key: object key
 * - body: object content (for put)
 * - contentType: content type (for put)
 */
export async function actionS3({ prisma, orgId, runId, node, input }: any) {
  const action = node.config?.action || "get";
  const credentialsSecretId = node.config?.credentialsSecret;
  const region = node.config?.region || "us-east-1";
  const bucket = node.config?.bucket || input?.bucket;
  const key = node.config?.key || input?.key;

  if (!credentialsSecretId) throw new Error("S3: credentialsSecret required");
  if (!bucket) throw new Error("S3: bucket required");
  if (!key) throw new Error("S3: key required");

  // Check approval for write operations
  if (action === "put" && node.risk?.requiresApproval) {
    const approvals = await prisma.approvalRequest.findMany({
      where: { orgId, runId, status: "APPROVED" }
    });
    const allowed = approvals.some((a: any) => (a.scopeJson as any)?.allowedNodeIds?.includes(node.id));
    if (!allowed) throw new Error("Approval required for S3 write operation");
  }

  // Get AWS credentials from secrets
  const secret = await prisma.secret.findFirst({
    where: { id: credentialsSecretId, orgId }
  });
  if (!secret) throw new Error("Credentials secret not found");

  const credentials = decryptJson(secret.encrypted as any);
  const accessKeyId = credentials.accessKeyId || credentials.access_key_id;
  const secretAccessKey = credentials.secretAccessKey || credentials.secret_access_key;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Invalid AWS credentials format. Expected: { accessKeyId, secretAccessKey }");
  }

  // For MVP: use AWS SDK v3 via dynamic import
  // In production, you'd add '@aws-sdk/client-s3' to package.json dependencies
  let S3Client: any, GetObjectCommand: any, PutObjectCommand: any;
  try {
    const s3Module = await import("@aws-sdk/client-s3");
    S3Client = s3Module.S3Client;
    GetObjectCommand = s3Module.GetObjectCommand;
    PutObjectCommand = s3Module.PutObjectCommand;
  } catch {
    throw new Error("@aws-sdk/client-s3 not installed. Add to worker dependencies.");
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  if (action === "get") {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await client.send(command);

    // Read body stream
    const bodyContents = await streamToString(response.Body);

    return {
      bucket,
      key,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      body: bodyContents,
      metadata: response.Metadata
    };
  } else if (action === "put") {
    const body = node.config?.body || input?.body;
    const contentType = node.config?.contentType || input?.contentType || "application/octet-stream";

    if (!body) throw new Error("S3 put: body required");

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: typeof body === "string" ? body : JSON.stringify(body),
      ContentType: contentType
    });

    const response = await client.send(command);

    return {
      success: true,
      bucket,
      key,
      etag: response.ETag,
      versionId: response.VersionId
    };
  } else {
    throw new Error(`Unknown S3 action: ${action}`);
  }
}

// Helper to convert stream to string
async function streamToString(stream: any): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
