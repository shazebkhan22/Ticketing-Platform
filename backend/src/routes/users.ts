import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { listUsers, createUser } from "../controllers/users";

export const usersRouter = Router();

usersRouter.use(requireAdmin);
usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
