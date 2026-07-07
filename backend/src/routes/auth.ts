import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { login, logout, getMe, updateProfile, updatePassword } from "../controllers/auth";

export const authRouter = Router();

// Brute-force guard: 10 attempts per IP per 10 minutes. Keyed on IP rather
// than username so an attacker can't dodge the limit by cycling usernames;
// both failed and successful attempts count against it.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

authRouter.post("/login", loginLimiter, login);
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);
authRouter.patch("/profile", requireAuth, updateProfile);
authRouter.patch("/password", requireAuth, updatePassword);
