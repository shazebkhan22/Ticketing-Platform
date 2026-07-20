import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import {
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/auth";

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

// Tighter than login: this endpoint sends an email and (unauthenticated)
// accepts any address, so it's the more attractive target for both
// enumeration probing and mailbox-bombing a victim's inbox.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

authRouter.post("/login", loginLimiter, login);
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);
authRouter.patch("/profile", requireAuth, updateProfile);
authRouter.patch("/password", requireAuth, updatePassword);
authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
authRouter.post("/reset-password", resetPasswordLimiter, resetPassword);
