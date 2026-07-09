import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";

const smtpSettingsSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  username: z.string().optional(),
  // Blank means "keep the existing password" on update — the GET endpoint
  // never echoes the stored password back to the client.
  password: z.string().optional(),
  fromAddress: z.string().min(1).email(),
  fromName: z.string().optional(),
  secure: z.boolean(),
});

export async function getSmtpSettings(_req: Request, res: Response) {
  const result = await pool.query(
    "SELECT host, port, username, password, from_address, from_name, secure FROM smtp_config WHERE id = 1"
  );
  const row = result.rows[0];
  res.json({
    host: row?.host ?? "",
    port: row?.port ?? 587,
    username: row?.username ?? "",
    fromAddress: row?.from_address ?? "",
    fromName: row?.from_name ?? "",
    secure: row?.secure ?? false,
    hasPassword: Boolean(row?.password),
  });
}

export async function updateSmtpSettings(req: Request, res: Response) {
  const parsed = smtpSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;

  const existing = await pool.query("SELECT password FROM smtp_config WHERE id = 1");
  const password = d.password || existing.rows[0]?.password || null;

  await pool.query(
    `INSERT INTO smtp_config (id, host, port, username, password, from_address, from_name, secure)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       host = EXCLUDED.host,
       port = EXCLUDED.port,
       username = EXCLUDED.username,
       password = EXCLUDED.password,
       from_address = EXCLUDED.from_address,
       from_name = EXCLUDED.from_name,
       secure = EXCLUDED.secure`,
    [d.host, d.port, d.username || null, password, d.fromAddress, d.fromName || null, d.secure]
  );

  res.json({ success: true });
}
