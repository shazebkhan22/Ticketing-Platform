import type { Project } from "@/types/project";
import { todayLocalDate } from "@/lib/ticket-utils";

export function isProjectOverdue(project: Project): boolean {
  if (project.status === "Closed") return false;
  return project.deadlineDate.slice(0, 10) < todayLocalDate();
}

export function projectStatusLabel(project: Project): string {
  return isProjectOverdue(project) ? "Overdue" : project.status;
}
