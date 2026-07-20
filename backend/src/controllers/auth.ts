import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendMail } from "../utils/mailer";
import { renderEmailHtml } from "../utils/emailTemplate";
import { generatePasswordResetToken, hashPasswordResetToken } from "../utils/passwordResetToken";
import { env } from "../config/env";

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// How long a reset link stays valid after being emailed.
const RESET_TOKEN_TTL_MINUTES = 30;

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn(
      { username: typeof req.body?.username === "string" ? req.body.username : undefined },
      "Login rejected: missing or invalid username/password"
    );
    return res.status(400).json({ error: "Username and password are required" });
  }
  const { username, password } = parsed.data;

  const result = await pool.query(
    "SELECT id, username, password_hash, role, display_name, email FROM users WHERE username = $1",
    [username]
  );
  const user = result.rows[0];
  if (!user) {
    req.log.warn({ username }, "Login failed: unknown username");
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    req.log.warn({ username, userId: user.id }, "Login failed: incorrect password");
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // Rotate the session ID on login so a session ID an attacker may have
  // fixed/known before authentication can't become an authenticated one
  // (session fixation).
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  req.session.displayName = user.display_name;
  req.session.email = user.email;

  req.log.info({ username: user.username, userId: user.id, role: user.role }, "Login succeeded");

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
  });
}

export function logout(req: Request, res: Response) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
}

export async function getMe(req: Request, res: Response) {
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
}

export async function updateProfile(req: Request, res: Response) {
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
}

export async function updatePassword(req: Request, res: Response) {
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
}

// Always responds with the same generic message whether or not the email
// matches an account — revealing that distinction would let an attacker
// enumerate valid usernames/emails against the platform.
export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  const { email } = parsed.data;
  const genericResponse = {
    message: "If an account exists for that email, a reset link has been sent.",
  };

  const result = await pool.query(
    "SELECT id, username, display_name FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user) {
    req.log.warn({ email }, "Password reset requested for unknown email");
    return res.json(genericResponse);
  }

  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  await pool.query(
    `UPDATE users SET password_reset_token_hash = $1,
       password_reset_expires_at = now() + interval '${RESET_TOKEN_TTL_MINUTES} minutes'
     WHERE id = $2`,
    [tokenHash, user.id]
  );

  const link = `${env.frontendOrigin}/reset-password/${token}`;
  const text = `Hi ${user.display_name || user.username},\n\nWe received a request to reset your password. This link will expire in ${RESET_TOKEN_TTL_MINUTES} minutes and can only be used once:\n${link}\n\nIf you didn't request this, you can safely ignore this email — your password won't be changed.\n\nBest regards,\nSupport Team`;

  const sent = await sendMail({
    to: email,
    subject: "Reset your password",
    text,
    html: renderEmailHtml(text),
  });
  if (!sent) {
    req.log.error({ email, userId: user.id }, "Failed to send password reset email");
  } else {
    req.log.info({ email, userId: user.id }, "Password reset email sent");
  }

  res.json(genericResponse);
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { token, newPassword } = parsed.data;
  const tokenHash = hashPasswordResetToken(token);

  const result = await pool.query(
    `SELECT id, username FROM users
     WHERE password_reset_token_hash = $1 AND password_reset_expires_at > now()`,
    [tokenHash]
  );
  const user = result.rows[0];
  if (!user) {
    req.log.warn("Password reset attempted with invalid or expired token");
    return res.status(400).json({ error: "This reset link is invalid or has expired" });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  // Clearing the token/expiry on use makes it single-use — a second
  // attempt with the same link (or a leaked/replayed one) fails cleanly.
  await pool.query(
    `UPDATE users SET password_hash = $1, password_reset_token_hash = NULL, password_reset_expires_at = NULL
     WHERE id = $2`,
    [newHash, user.id]
  );

  req.log.info({ username: user.username, userId: user.id }, "Password reset succeeded");

  res.json({ success: true });
}
