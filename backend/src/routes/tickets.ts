import { Router } from "express";
import multer from "multer";
import { requireAuth, requireAdmin, requireAssigneeOrAdmin, validateSrNoParam } from "../middleware/auth";
import {
  listTickets,
  getSummary,
  getTicket,
  createTicket,
  updateTicket,
  updateTicketStatus,
  updateAdminFeedbackResponse,
  deleteTicket,
  addRemark,
  getAnalytics,
} from "../controllers/tickets";
import { exportTickets, downloadImportTemplate, importTickets } from "../controllers/excel";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

// Read routes: any authenticated user (admin or employee) can see all tickets.
ticketsRouter.get("/summary", getSummary);
ticketsRouter.get("/analytics", getAnalytics);

// Excel export/import — declared before "/:srNo" so they aren't swallowed by
// that wildcard param route. Export honors the same filters as the list
// endpoint; import is restricted to admins since it bulk-creates many rows
// at once on behalf of whoever uploads the file.
ticketsRouter.get("/export", exportTickets);
ticketsRouter.get("/import-template", downloadImportTemplate);
ticketsRouter.post("/import", requireAdmin, upload.single("file"), importTickets);

ticketsRouter.get("/", listTickets);
ticketsRouter.get("/:srNo", validateSrNoParam, getTicket);

// Any authenticated user can create a ticket, choosing who it's assigned to.
ticketsRouter.post("/", createTicket);

// Write routes: admin can modify any ticket; otherwise only an employee the
// ticket is currently ASSIGNED TO can modify it (requireAssigneeOrAdmin checks
// membership in ticket_assignees against the session) — not whoever created it.
ticketsRouter.put("/:srNo", validateSrNoParam, requireAssigneeOrAdmin, updateTicket);
ticketsRouter.patch("/:srNo/status", validateSrNoParam, requireAssigneeOrAdmin, updateTicketStatus);
ticketsRouter.patch(
  "/:srNo/admin-feedback-response",
  validateSrNoParam,
  requireAssigneeOrAdmin,
  updateAdminFeedbackResponse
);
ticketsRouter.delete("/:srNo", validateSrNoParam, requireAssigneeOrAdmin, deleteTicket);
ticketsRouter.post("/:srNo/remarks", validateSrNoParam, requireAssigneeOrAdmin, addRemark);
