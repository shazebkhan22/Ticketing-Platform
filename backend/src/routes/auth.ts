import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { login, logout, getMe, updateProfile, updatePassword } from "../controllers/auth";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);
authRouter.patch("/profile", requireAuth, updateProfile);
authRouter.patch("/password", requireAuth, updatePassword);
