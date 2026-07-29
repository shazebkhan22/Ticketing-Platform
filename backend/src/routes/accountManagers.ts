import { Router } from "express";
import { requireAdmin, validateIdParam } from "../middleware/auth";
import {
  listAccountManagers,
  createAccountManager,
  updateAccountManager,
} from "../controllers/accountManagers";

export const accountManagersRouter = Router();

// Admin-only, same as /users — account managers are managed from the
// Employees tab (see UsersPage.tsx) but aren't platform users themselves.
accountManagersRouter.use(requireAdmin);
accountManagersRouter.get("/", listAccountManagers);
accountManagersRouter.post("/", createAccountManager);
accountManagersRouter.patch("/:id", validateIdParam, updateAccountManager);
