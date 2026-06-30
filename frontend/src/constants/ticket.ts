import type { TicketPriority, TicketStatus } from "@/types/ticket";

export const STATUS_FLOW: TicketStatus[] = ["Pending", "In Progress", "Closed"];

export const STATUS_CLASSES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Closed: "bg-emerald-100 text-emerald-800",
  Overdue: "bg-red-100 text-red-800",
};

// P1 = highest priority, P4 = lowest.
export const PRIORITY_CLASSES: Record<TicketPriority, string> = {
  P1: "bg-red-100 text-red-800",
  P2: "bg-orange-100 text-orange-800",
  P3: "bg-amber-100 text-amber-800",
  P4: "bg-slate-100 text-slate-700",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  P1: "Urgent priority",
  P2: "High priority",
  P3: "Medium priority",
  P4: "Low priority",
};
