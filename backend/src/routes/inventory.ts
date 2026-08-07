import { Router } from "express";
import {
  requireAuth,
  requireFieldTeamOrAdmin,
  requireTicketAssigneeOrAdmin,
  validateSrNoParam,
} from "../middleware/auth";
import { addToInventory, listInventory, upsertInventory } from "../controllers/inventory";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

// The whole feature is admins + Team Field only — Team FMS never sees or
// touches inventory, even for their own tickets.
inventoryRouter.use(requireFieldTeamOrAdmin);

// listInventory itself further scopes non-admin results down to the
// requester's own assigned tickets.
inventoryRouter.get("/", listInventory);

// Adding a ticket to inventory, and doing the inward/outward/repair-location
// workflow, are both allowed for the ticket's assignees (now that they're
// gated to Team Field above), not just admins.
inventoryRouter.post("/:srNo", validateSrNoParam, requireTicketAssigneeOrAdmin, addToInventory);
inventoryRouter.put("/:srNo", validateSrNoParam, requireTicketAssigneeOrAdmin, upsertInventory);
