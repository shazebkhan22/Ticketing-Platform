import { Router } from "express";
import { requireAdmin, validateIdParam } from "../middleware/auth";
import { listCustomers, getCustomer } from "../controllers/customers";

export const customersRouter = Router();

// Admin-only — matches the frontend's AdminRoute + NAV_ADMIN gating (see
// App.tsx / constants/navigation.tsx).
customersRouter.use(requireAdmin);
customersRouter.get("/", listCustomers);
customersRouter.get("/:id", validateIdParam, getCustomer);
