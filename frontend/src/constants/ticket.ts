import type { TicketStatus } from "@/types/ticket";

export const STATUS_FLOW: TicketStatus[] = ["Pending", "In Progress", "Closed"];

export const STATUS_CLASSES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Closed: "bg-emerald-100 text-emerald-800",
  Overdue: "bg-red-100 text-red-800",
};
