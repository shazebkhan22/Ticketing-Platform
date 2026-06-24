import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const profileSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const { username, password } = parsed.data;

  const result = await pool.query(
    "SELECT id, username, password_hash, role, display_name, email FROM users WHERE username = $1",
    [username]
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  req.session.displayName = user.display_name;
  req.session.email = user.email;

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
  });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const result = await pool.query(
    "SELECT id, username, role, display_name, email FROM users WHERE id = $1",
    [req.session.userId]
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
  });
});

authRouter.patch("/profile", requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { displayName, email } = parsed.data;

  const result = await pool.query(
    "UPDATE users SET display_name = $1, email = $2 WHERE id = $3 RETURNING id, username, role, display_name, email",
    [displayName, email || null, req.session.userId]
  );
  const user = result.rows[0];

  req.session.displayName = user.display_name;
  req.session.email = user.email;

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
  });
});

authRouter.patch("/password", requireAuth, async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { currentPassword, newPassword } = parsed.data;

  const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [
    req.session.userId,
  ]);
  const user = result.rows[0];

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    newHash,
    req.session.userId,
  ]);

  res.json({ success: true });
});
