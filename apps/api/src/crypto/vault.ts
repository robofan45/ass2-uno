import crypto from "crypto";

const KEY = (process.env.VAULT_MASTER_KEY || "").padEnd(32, "_").slice(0, 32);

export function encryptJson(data: unknown) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(KEY), iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64")
  };
}

export function decryptJson(blob: any) {
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const data = Buffer.from(blob.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(KEY), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}
