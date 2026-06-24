import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";

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
 * Allows the request through if the logged-in user is an admin, OR is the
 * employee a ticket is currently ASSIGNED TO (req.params.srNo) — the person
 * actually responsible for resolving it. Everyone else gets 403.
 * Read-only routes (GET) should NOT use this — only mutating routes
 * (PUT/PATCH/DELETE/POST remarks) are restricted to assignee-or-admin.
 * Note: this is independent of who created the ticket (tickets.owner_user_id) —
 * a ticket can be created by one employee and assigned to another, and the
 * assignee is who gets edit rights, not the creator.
 */
export async function requireAssigneeOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.role === "admin") {
    return next();
  }

  const srNo = parseInt(req.params.srNo, 10);
  const result = await pool.query("SELECT assigned_to_user_id FROM tickets WHERE sr_no = $1", [
    srNo,
  ]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  if (result.rows[0].assigned_to_user_id !== req.session.userId) {
    return res.status(403).json({ error: "You can only modify tickets assigned to you" });
  }
  next();
}
