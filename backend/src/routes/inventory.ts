import { Router } from "express";
import { requireAdmin, validateSrNoParam } from "../middleware/auth";
import { listInventory, upsertInventory } from "../controllers/inventory";

export const inventoryRouter = Router();

// Admin-only, same as customers/activity log — matches the frontend's
// AdminRoute + NAV_ADMIN gating (see App.tsx / constants/navigation.tsx).
inventoryRouter.use(requireAdmin);
inventoryRouter.get("/", listInventory);
inventoryRouter.put("/:srNo", validateSrNoParam, upsertInventory);
