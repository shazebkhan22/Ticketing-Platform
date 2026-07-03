import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getOptions } from "../controllers/meta";

export const metaRouter = Router();

metaRouter.use(requireAuth);

metaRouter.get("/options", getOptions);
