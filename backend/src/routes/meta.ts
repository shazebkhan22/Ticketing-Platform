import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db/pool";
import { TICKET_MODES, CALL_TYPES, TICKET_STATUSES, INTERNAL_TAGS } from "../types/ticket";

export const metaRouter = Router();

metaRouter.use(requireAuth);

metaRouter.get("/options", async (_req, res) => {
  // "Assigned To" must be one of the 5 platform employees (the engineers who
  // actually resolve tickets) — the frontend uses {id, displayName} so the
  // form can submit assignedToUserId while showing a readable name.
  const employeesResult = await pool.query(
    "SELECT id, display_name FROM users ORDER BY display_name"
  );

  // "Account Manager" is free text (anybody in the office could have reported
  // the issue) — there's no fixed list, so we surface previously-used values
  // from existing tickets as filter suggestions. This grows organically and
  // needs no seed data or admin maintenance.
  const accountManagersResult = await pool.query(
    "SELECT DISTINCT account_manager FROM tickets ORDER BY account_manager"
  );

  // "Assigned By" is free text (anybody in the company), same pattern as
  // Account Manager — surface previously-used values as suggestions.
  const assignedByResult = await pool.query(
    "SELECT DISTINCT assigned_by FROM tickets WHERE assigned_by IS NOT NULL ORDER BY assigned_by"
  );

  res.json({
    modes: TICKET_MODES,
    callTypes: CALL_TYPES,
    statuses: TICKET_STATUSES,
    internalTags: INTERNAL_TAGS,
    accountManagers: accountManagersResult.rows.map((r) => r.account_manager),
    assignedBys: assignedByResult.rows.map((r) => r.assigned_by),
    assignedToOptions: employeesResult.rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
    })),
  });
});
