import { Router } from "express";
import { requireAuth, requireAssigneeOrAdmin, validateSrNoParam } from "../middleware/auth";
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
ticketsRouter.get("/:srNo", validateSrNoParam, getTicket);

// Any authenticated user can create a ticket, choosing who it's assigned to.
ticketsRouter.post("/", createTicket);

// Write routes: admin can modify any ticket; otherwise only the employee the
// ticket is currently ASSIGNED TO can modify it (requireAssigneeOrAdmin checks
// tickets.assigned_to_user_id against the session) — not whoever created it.
ticketsRouter.put("/:srNo", validateSrNoParam, requireAssigneeOrAdmin, updateTicket);
ticketsRouter.patch("/:srNo/status", validateSrNoParam, requireAssigneeOrAdmin, updateTicketStatus);
ticketsRouter.patch("/:srNo/feedback", validateSrNoParam, requireAssigneeOrAdmin, updateFeedback);
ticketsRouter.delete("/:srNo", validateSrNoParam, requireAssigneeOrAdmin, deleteTicket);
ticketsRouter.post("/:srNo/remarks", validateSrNoParam, requireAssigneeOrAdmin, addRemark);
