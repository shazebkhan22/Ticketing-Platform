import { Router } from "express";
import { requireAuth, requireAssigneeOrAdmin } from "../middleware/auth";
import {
  listTickets,
  getSummary,
  getTicket,
  createTicket,
  updateTicket,
  updateTicketStatus,
  updateFeedback,
  deleteTicket,
  addRemark,
} from "../controllers/tickets";

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

// Read routes: any authenticated user (admin or employee) can see all tickets.
ticketsRouter.get("/summary", getSummary);
ticketsRouter.get("/", listTickets);
ticketsRouter.get("/:srNo", getTicket);

// Any authenticated user can create a ticket, choosing who it's assigned to.
ticketsRouter.post("/", createTicket);

// Write routes: admin can modify any ticket; otherwise only the employee the
// ticket is currently ASSIGNED TO can modify it (requireAssigneeOrAdmin checks
// tickets.assigned_to_user_id against the session) — not whoever created it.
ticketsRouter.put("/:srNo", requireAssigneeOrAdmin, updateTicket);
ticketsRouter.patch("/:srNo/status", requireAssigneeOrAdmin, updateTicketStatus);
ticketsRouter.patch("/:srNo/feedback", requireAssigneeOrAdmin, updateFeedback);
ticketsRouter.delete("/:srNo", requireAssigneeOrAdmin, deleteTicket);
ticketsRouter.post("/:srNo/remarks", requireAssigneeOrAdmin, addRemark);
