import { Router } from "express";
import { requireAdmin, validateIdParam } from "../middleware/auth";
import { listUsers, createUser, setUserActive } from "../controllers/users";

export const usersRouter = Router();

usersRouter.use(requireAdmin);
usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.patch("/:id/active", validateIdParam, setUserActive);
