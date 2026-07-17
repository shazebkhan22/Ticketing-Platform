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
});

export async function listUsers(_req: Request, res: Response) {
  const result = await pool.query(
    "SELECT id, username, role, display_name, email, created_at FROM users ORDER BY display_name"
  );
  res.json(
    result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      displayName: row.display_name,
      email: row.email,
      createdAt: row.created_at,
    }))
  );
}

export async function createUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { username, password, role, displayName, email } = parsed.data;

  const existing = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, "Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (username, password_hash, role, display_name, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, role, display_name, email, created_at`,
    [username, passwordHash, role, displayName, email || null]
  );
  const user = result.rows[0];

  res.status(201).json({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
    createdAt: user.created_at,
  });
}
