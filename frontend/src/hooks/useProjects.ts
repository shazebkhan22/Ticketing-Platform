import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addProjectRemark,
  createProject,
  deleteProject,
  downloadProjectImportTemplate,
  exportProjects,
  fetchProject,
  fetchProjects,
  fetchProjectSummary,
  importProjects,
  updateProject,
  updateProjectStatus,
} from "@/api/projects";
import { fetchMetaOptions } from "@/api/tickets";
import type { ProjectDetail, ProjectFilters, ProjectFormInput } from "@/types/project";

export const projectKeys = {
  all: ["projects"] as const,
  summary: (assigneeUserId?: number) => [...projectKeys.all, "summary", assigneeUserId ?? null] as const,
  list: (filters: ProjectFilters) => [...projectKeys.all, "list", filters] as const,
  detail: (srNo: number) => [...projectKeys.all, "detail", srNo] as const,
  meta: () => ["meta", "options"] as const,
};

export function useProjectSummary(assigneeUserId?: number) {
  return useQuery({
    queryKey: projectKeys.summary(assigneeUserId),
    queryFn: () => fetchProjectSummary(assigneeUserId),
  });
}

export function useProjectList(filters: ProjectFilters) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => fetchProjects(filters),
  });
}

export function useProjectDetail(srNo: number) {
  return useQuery({
    queryKey: projectKeys.detail(srNo),
    queryFn: () => fetchProject(srNo),
    enabled: Number.isFinite(srNo),
  });
}

// Same /meta endpoint tickets use — it already returns everything projects
// need (accountManagers, assignedBys, customers, assignedToOptions, modes,
// priorities, statuses, projectTimeUnits).
export function useProjectMetaOptions() {
  return useQuery({ queryKey: projectKeys.meta(), queryFn: fetchMetaOptions });
}

function useInvalidateProject(srNo?: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
    if (srNo !== undefined) {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(srNo) });
    }
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectFormInput) => createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject(srNo: number) {
  const invalidate = useInvalidateProject(srNo);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProjectFormInput>) => {
      const cached = queryClient.getQueryData<ProjectDetail>(projectKeys.detail(srNo));
      const rowVersion = cached?.project.rowVersion;
      if (rowVersion === undefined) {
        throw new Error("Cannot update: current project version is unknown. Please refresh and try again.");
      }
      return updateProject(srNo, input, rowVersion);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateProjectStatus(srNo: number) {
  const invalidate = useInvalidateProject(srNo);
  return useMutation({
    mutationFn: (status: string) => updateProjectStatus(srNo, status),
    onSuccess: invalidate,
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (srNo: number) => deleteProject(srNo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useAddProjectRemark(srNo: number) {
  const invalidate = useInvalidateProject(srNo);
  return useMutation({
    mutationFn: (body: string) => addProjectRemark(srNo, body),
    onSuccess: invalidate,
  });
}

export function useExportProjects() {
  return useMutation({
    mutationFn: (filters: ProjectFilters) => exportProjects(filters),
  });
}

export function useDownloadProjectImportTemplate() {
  return useMutation({
    mutationFn: () => downloadProjectImportTemplate(),
  });
}

export function useImportProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importProjects(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
