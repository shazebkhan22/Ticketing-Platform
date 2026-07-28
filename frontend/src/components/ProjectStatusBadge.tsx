import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { projectStatusLabel } from "@/lib/project-utils";
import { STATUS_CLASSES } from "@/constants/ticket";
import type { Project } from "@/types/project";

export function ProjectStatusBadge({ project }: { project: Project }) {
  const label = projectStatusLabel(project);
  return (
    <Badge variant="secondary" className={cn("rounded-full", STATUS_CLASSES[label])}>
      {label}
    </Badge>
  );
}
