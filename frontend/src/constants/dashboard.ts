import type { Summary, TicketFilters } from "@/types/ticket";

export const SUMMARY_CARDS: { key: keyof Summary; label: string; color: string }[] = [
  { key: "total", label: "Total Tickets", color: "bg-indigo-100 text-indigo-800" },
  { key: "pending", label: "Pending",  color: "bg-amber-100 text-amber-800" },
  { key: "inProgress", label: "In Progress",  color: "bg-cygnus-50 text-cygnus-800" },
  { key: "closed", label: "Closed", color: "bg-emerald-100 text-emerald-800" },
  { key: "overdue", label: "Overdue", color: "bg-red-100 text-red-800" },
];

export const ALL_FILTER_VALUE = "__all__";

export const DEFAULT_TICKET_FILTERS: TicketFilters = { page: 1, pageSize: 7 };
