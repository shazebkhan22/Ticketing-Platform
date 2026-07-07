import { describe, it, expect } from "vitest";
import { generateFeedbackToken } from "./feedbackToken";

describe("generateFeedbackToken", () => {
  it("returns a 48-character hex string", () => {
    const token = generateFeedbackToken();
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("returns a different value on each call", () => {
    const a = generateFeedbackToken();
    const b = generateFeedbackToken();
    expect(a).not.toBe(b);
  });
});
