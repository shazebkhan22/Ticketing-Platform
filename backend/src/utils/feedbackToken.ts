import crypto from "crypto";

export function generateFeedbackToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
