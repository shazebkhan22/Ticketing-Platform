import crypto from "crypto";
import { env } from "../config/env";

// Encrypts secrets we have to persist (e.g. SMTP password) so a DB leak
// (backup, read-replica access, SQL injection elsewhere) doesn't hand over
// plaintext credentials. Key is derived from SESSION_SECRET rather than a
// new required env var, so existing deployments don't need a config change
// to pick this up — scrypt with a fixed, purpose-specific salt keeps the
// derived key distinct from any other use of the same secret.
const KEY = crypto.scryptSync(env.sessionSecret, "smtp-config-secret-v1", 32);
const ALGORITHM = "aes-256-gcm";

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [version, ivB64, authTagB64, dataB64] = stored.split(":");
  if (version !== "v1" || !ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret format");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
