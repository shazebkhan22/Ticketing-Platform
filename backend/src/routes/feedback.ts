import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getFeedbackByToken, submitFeedback } from "../controllers/feedback";

// Public, unauthenticated — the customer reaches this via the tokenized
// link emailed 24h after their ticket closes (see jobs/feedbackReminder.ts).
export const feedbackRouter = Router();

// Defense in depth: the token itself has 192 bits of entropy and isn't
// brute-forceable, but nothing else throttles this public, unauthenticated
// surface — cap it per IP the same way login is capped.
const feedbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

feedbackRouter.use(feedbackLimiter);
feedbackRouter.get("/:token", getFeedbackByToken);
feedbackRouter.post("/:token", submitFeedback);
