import type { Summary, TicketFilters } from "@/types/ticket";
import type { ProjectFilters } from "@/types/project";

export const SUMMARY_CARDS: { key: keyof Summary; label: string; color: string }[] = [
  { key: "total", label: "Total Tickets", color: "bg-indigo-100 text-indigo-800" },
  { key: "pending", label: "Pending",  color: "bg-amber-100 text-amber-800" },
  { key: "inProgress", label: "In Progress",  color: "bg-cygnus-50 text-cygnus-800" },
  { key: "closed", label: "Closed", color: "bg-emerald-100 text-emerald-800" },
  { key: "overdue", label: "Overdue", color: "bg-red-100 text-red-800" },
];

export const ALL_FILTER_VALUE = "__all__";

export const DEFAULT_TICKET_FILTERS: TicketFilters = { page: 1, pageSize: 7 };

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = { page: 1, pageSize: 7 };

export const PROJECT_SUMMARY_CARDS: { key: keyof Summary; label: string; color: string }[] = [
  { key: "total", label: "Total Projects", color: "bg-indigo-100 text-indigo-800" },
  { key: "pending", label: "Pending", color: "bg-amber-100 text-amber-800" },
  { key: "inProgress", label: "In Progress", color: "bg-cygnus-50 text-cygnus-800" },
  { key: "closed", label: "Completed", color: "bg-emerald-100 text-emerald-800" },
  { key: "overdue", label: "Overdue", color: "bg-red-100 text-red-800" },
];

export type ExportRange = "30" | "90" | "all";

export const EXPORT_RANGE_OPTIONS: { value: ExportRange; label: string }[] = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All" },
];

// Returns a dateFrom (yyyy-MM-dd) cutoff for the given range, or undefined
// for "all" (no lower bound).
export function exportRangeToDateFrom(range: ExportRange): string | undefined {
  if (range === "all") return undefined;
  const days = range === "30" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString().slice(0, 10);
}
