import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { getSmtpSettings, updateSmtpSettings } from "../controllers/settings";

export const settingsRouter = Router();

settingsRouter.use(requireAdmin);
settingsRouter.get("/smtp", getSmtpSettings);
settingsRouter.put("/smtp", updateSmtpSettings);
