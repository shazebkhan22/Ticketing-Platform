import crypto from "crypto";

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Only this hash is ever persisted — the raw token exists solely in the
// emailed link, so a DB leak alone can't be used to reset an account.
export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
