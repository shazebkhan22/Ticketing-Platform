import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { pool } from "../db/pool";

const srNoParamSchema = z.coerce.number().int().positive();

export function validateSrNoParam(req: Request, res: Response, next: NextFunction) {
  const parsed = srNoParamSchema.safeParse(req.params.srNo);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid ticket reference" });
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Admin role required" });
  }
  next();
}

/**
 * Allows the request through if the logged-in user is an admin, OR is one of
 * the employees a ticket is currently ASSIGNED TO (req.params.srNo) — a
 * ticket can have multiple assignees, all of whom are responsible for
 * resolving it and get equal edit rights. Everyone else gets 403.
 * Read-only routes (GET) should NOT use this — only mutating routes
 * (PUT/PATCH/DELETE/POST remarks) are restricted to assignee-or-admin.
 * Note: this is independent of who created the ticket (tickets.owner_user_id) —
 * a ticket can be created by one employee and assigned to others, and the
 * assignees are who get edit rights, not the creator.
 */
export async function requireAssigneeOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.role === "admin") {
    return next();
  }

  const srNo = parseInt(req.params.srNo, 10);
  const ticketResult = await pool.query("SELECT 1 FROM tickets WHERE sr_no = $1", [srNo]);
  if (ticketResult.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const membership = await pool.query(
    "SELECT 1 FROM ticket_assignees WHERE ticket_sr_no = $1 AND user_id = $2",
    [srNo, req.session.userId]
  );
  if (membership.rows.length === 0) {
    return res.status(403).json({ error: "You can only modify tickets assigned to you" });
  }
  next();
}
