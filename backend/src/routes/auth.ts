import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db/pool";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const { username, password } = parsed.data;

  const result = await pool.query(
    "SELECT id, username, password_hash, role, display_name FROM users WHERE username = $1",
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

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
  });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

authRouter.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role,
    displayName: req.session.displayName,
  });
});
