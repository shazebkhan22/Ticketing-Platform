import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { listActivity } from "../controllers/activity";

export const activityRouter = Router();

// Admin-only: shows who did what across all tickets (create/edit/status/
// feedback/remark/delete), not just the requester's own actions.
activityRouter.use(requireAdmin);
activityRouter.get("/", listActivity);
