import { apiClient } from "./client";
import type { Summary } from "@/types/ticket";
import type {
  Project,
  ProjectDetail,
  ProjectFilters,
  ProjectFormInput,
  ProjectListResponse,
} from "@/types/project";

export async function fetchProjectSummary(assigneeUserId?: number): Promise<Summary> {
  const { data } = await apiClient.get<Summary>("/projects/summary", {
    params: assigneeUserId ? { assigneeUserId } : undefined,
  });
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
