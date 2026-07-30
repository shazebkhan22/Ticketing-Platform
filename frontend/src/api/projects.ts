import { apiClient } from "./client";
import type { ImportResult, Summary } from "@/types/ticket";
import type {
  Project,
  ProjectAnalytics,
  ProjectDetail,
  ProjectFilters,
  ProjectFormInput,
  ProjectListResponse,
} from "@/types/project";

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportProjects(filters: ProjectFilters): Promise<void> {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page" && key !== "pageSize") {
      params[key] = String(value);
    }
  });
  const { data } = await apiClient.get("/projects/export", { params, responseType: "blob" });
  triggerDownload(data, `projects-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function downloadProjectImportTemplate(): Promise<void> {
  const { data } = await apiClient.get("/projects/import-template", { responseType: "blob" });
  triggerDownload(data, "project-import-template.xlsx");
}

export async function importProjects(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ImportResult>("/projects/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchProjectSummary(assigneeUserId?: number): Promise<Summary> {
  const { data } = await apiClient.get<Summary>("/projects/summary", {
    params: assigneeUserId ? { assigneeUserId } : undefined,
  });
  return data;
}

export async function fetchProjectAnalytics(): Promise<ProjectAnalytics> {
  const { data } = await apiClient.get<ProjectAnalytics>("/projects/analytics");
  return data;
}

export async function fetchProjects(filters: ProjectFilters): Promise<ProjectListResponse> {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params[key] = String(value);
    }
  });
  const { data } = await apiClient.get<ProjectListResponse>("/projects", { params });
  return data;
}

export async function fetchProject(srNo: number): Promise<ProjectDetail> {
  const { data } = await apiClient.get<ProjectDetail>(`/projects/${srNo}`);
  return data;
}

export async function createProject(input: ProjectFormInput): Promise<Project> {
  const { data } = await apiClient.post<Project>("/projects", input);
  return data;
}

export async function updateProject(
  srNo: number,
  input: Partial<ProjectFormInput>,
  rowVersion: number
): Promise<Project> {
  const { data } = await apiClient.put<Project>(`/projects/${srNo}`, { ...input, rowVersion });
  return data;
}

export async function updateProjectStatus(srNo: number, status: string): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/projects/${srNo}/status`, { status });
  return data;
}

export async function deleteProject(srNo: number): Promise<void> {
  await apiClient.delete(`/projects/${srNo}`);
}

export async function addProjectRemark(
  srNo: number,
  body: string,
  remarkDate?: string
): Promise<void> {
  await apiClient.post(`/projects/${srNo}/remarks`, { body, remarkDate });
}

export async function updateProjectRemarkHighlight(
  srNo: number,
  remarkId: number,
  highlighted: boolean
): Promise<void> {
  await apiClient.patch(`/projects/${srNo}/remarks/${remarkId}/highlight`, { highlighted });
}
