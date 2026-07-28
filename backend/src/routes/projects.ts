import { Router } from "express";
import { requireAuth, requireAdmin, validateSrNoParam } from "../middleware/auth";
import {
  listProjects,
  getSummary,
  getProject,
  createProject,
  updateProject,
  updateProjectStatus,
  deleteProject,
  addRemark,
} from "../controllers/projects";

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

// Read routes: any authenticated user (admin or employee) can view projects.
projectsRouter.get("/summary", getSummary);
projectsRouter.get("/", listProjects);
projectsRouter.get("/:srNo", validateSrNoParam, getProject);

// Write routes: admin-only. Unlike tickets, project edit rights are not
// extended to assignees — only admins may create, edit, or delete a project.
projectsRouter.post("/", requireAdmin, createProject);
projectsRouter.put("/:srNo", validateSrNoParam, requireAdmin, updateProject);
projectsRouter.patch("/:srNo/status", validateSrNoParam, requireAdmin, updateProjectStatus);
projectsRouter.delete("/:srNo", validateSrNoParam, requireAdmin, deleteProject);
projectsRouter.post("/:srNo/remarks", validateSrNoParam, requireAdmin, addRemark);
