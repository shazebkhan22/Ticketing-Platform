import { Router } from "express";
import { getFeedbackByToken, submitFeedback } from "../controllers/feedback";

// Public, unauthenticated — the customer reaches this via the tokenized
// link emailed 24h after their ticket closes (see jobs/feedbackReminder.ts).
export const feedbackRouter = Router();

feedbackRouter.get("/:token", getFeedbackByToken);
feedbackRouter.post("/:token", submitFeedback);
