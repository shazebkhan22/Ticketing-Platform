import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { AppError } from "../utils/AppError";

const createAccountManagerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export async function listAccountManagers(_req: Request, res: Response) {
  const result = await pool.query(
    "SELECT id, name, email, user_id, created_at FROM account_managers ORDER BY name"
  );
  res.json(
    result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      userId: row.user_id,
      createdAt: row.created_at,
    }))
  );
}

export async function createAccountManager(req: Request, res: Response) {
  const parsed = createAccountManagerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, email } = parsed.data;

  const existing = await pool.query("SELECT 1 FROM account_managers WHERE name = $1", [name]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, "An account manager with this name already exists");
  }

  const result = await pool.query(
    `INSERT INTO account_managers (name, email) VALUES ($1, $2)
     RETURNING id, name, email, user_id, created_at`,
    [name, email]
  );
  const am = result.rows[0];

  res.status(201).json({
    id: am.id,
    name: am.name,
    email: am.email,
    userId: am.user_id,
    createdAt: am.created_at,
  });
}

const updateAccountManagerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export async function updateAccountManager(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const parsed = updateAccountManagerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, email } = parsed.data;

  const existing = await pool.query("SELECT 1 FROM account_managers WHERE name = $1 AND id <> $2", [
    name,
    id,
  ]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, "An account manager with this name already exists");
  }

  const result = await pool.query(
    `UPDATE account_managers SET name = $1, email = $2 WHERE id = $3
     RETURNING id, name, email, user_id, created_at`,
    [name, email, id]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, "Account manager not found");
  }
  const am = result.rows[0];

  // account_manager text column on projects is a point-in-time snapshot of
  // the name at save time (same rationale as customers/company_name — see
  // schema.sql), so it's intentionally NOT rewritten here; only newly
  // created/edited projects pick up the renamed value.
  res.json({
    id: am.id,
    name: am.name,
    email: am.email,
    userId: am.user_id,
    createdAt: am.created_at,
  });
}
