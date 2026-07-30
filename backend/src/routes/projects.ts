import { Router } from "express";
import multer from "multer";
import {
  requireAuth,
  requireAdmin,
  requireProjectAssigneeOrAdmin,
  validateSrNoParam,
} from "../middleware/auth";
import {
  listProjects,
  getSummary,
  getProjectAnalytics,
  getProject,
  createProject,
  updateProject,
  updateProjectStatus,
  deleteProject,
  addRemark,
  updateRemarkHighlight,
} from "../controllers/projects";
import {
  exportProjects,
  downloadProjectImportTemplate,
  importProjects,
} from "../controllers/projectExcel";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

// Read routes: any authenticated user can call these, but non-admins only
// ever see projects they're assigned to — enforced inside each controller
// (listProjects/getSummary/getProject/exportProjects), not here, since it's
// a data-scoping rule rather than an all-or-nothing route gate.
projectsRouter.get("/summary", getSummary);
projectsRouter.get("/analytics", getProjectAnalytics);

// Excel export/import — declared before "/:srNo" so they aren't swallowed by
// that wildcard param route, same reasoning as routes/tickets.ts. Import is
// admin-only since it bulk-creates many rows at once.
projectsRouter.get("/export", exportProjects);
projectsRouter.get("/import-template", downloadProjectImportTemplate);
projectsRouter.post("/import", requireAdmin, upload.single("file"), importProjects);

projectsRouter.get("/", listProjects);
projectsRouter.get("/:srNo", validateSrNoParam, getProject);

// Write routes: admin-only. Unlike tickets, project edit rights are not
// extended to assignees — only admins may create, edit, or delete a project.
projectsRouter.post("/", requireAdmin, createProject);
projectsRouter.put("/:srNo", validateSrNoParam, requireAdmin, updateProject);
projectsRouter.patch("/:srNo/status", validateSrNoParam, requireAdmin, updateProjectStatus);
projectsRouter.delete("/:srNo", validateSrNoParam, requireAdmin, deleteProject);
// Remarks are the exception: same as tickets, an assignee can post day-to-day
// updates on a project they're assigned to, even though they can't edit it.
projectsRouter.post("/:srNo/remarks", validateSrNoParam, requireProjectAssigneeOrAdmin, addRemark);
projectsRouter.patch(
  "/:srNo/remarks/:remarkId/highlight",
  validateSrNoParam,
  requireProjectAssigneeOrAdmin,
  updateRemarkHighlight
);
