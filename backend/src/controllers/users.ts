import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db/pool";
import { AppError } from "../utils/AppError";

const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "employee"]),
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  team: z.enum(["FMS", "Field"]).optional(),
});

export async function listUsers(_req: Request, res: Response) {
  const result = await pool.query(
    "SELECT id, username, role, display_name, email, created_at, is_active, team FROM users ORDER BY display_name"
  );
  res.json(
    result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      displayName: row.display_name,
      email: row.email,
      createdAt: row.created_at,
      isActive: row.is_active,
      team: row.team,
    }))
  );
}

export async function createUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { username, password, role, displayName, email, team } = parsed.data;

  const existing = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, "Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (username, password_hash, role, display_name, email, team)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, username, role, display_name, email, created_at, team`,
    [username, passwordHash, role, displayName, email || null, team || null]
  );
  const user = result.rows[0];

  res.status(201).json({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
    createdAt: user.created_at,
    isActive: true,
    team: user.team,
  });
}

const setActiveSchema = z.object({
  isActive: z.boolean(),
});

export async function setUserActive(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const parsed = setActiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Deactivating yourself would lock you out with no other admin able to
  // undo it from inside the app — block it outright rather than allow a
  // self-inflicted lockout.
  if (id === req.session.userId && !parsed.data.isActive) {
    return res.status(400).json({ error: "You cannot deactivate your own account" });
  }

  const result = await pool.query(
    "UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username, role, display_name, email, created_at, is_active, team",
    [parsed.data.isActive, id]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, "User not found");
  }
  const user = result.rows[0];

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
    createdAt: user.created_at,
    isActive: user.is_active,
    team: user.team,
  });
}
