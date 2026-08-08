import { Hourglass, Loader, CheckCircle2, type LucideIcon } from "lucide-react";
import type { RoutineCheckSection, TicketPriority, TicketStatus } from "@/types/ticket";

export const STATUS_FLOW: TicketStatus[] = ["Pending", "In Progress", "Closed"];

export const STATUS_ICONS: Record<TicketStatus, LucideIcon> = {
  Pending: Hourglass,
  "In Progress": Loader,
  Closed: CheckCircle2,
};

// Mirrors backend/src/utils/statusTransitions.ts — Pending -> In Progress ->
// Closed, with reopen only from Closed back to Pending. Kept in sync so the
// status buttons can be disabled client-side instead of only failing server-side.
const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  Pending: ["In Progress", "Closed"],
  "In Progress": ["Closed"],
  Closed: ["Pending"],
};

export function isLegalStatusTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return true;
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

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

// Fixed checklist for the Routine Checks call type — mirrors
// backend/src/types/ticket.ts ROUTINE_CHECK_TASKS. Not admin-configurable
// (see the call-type decision made when this feature was added).
export const ROUTINE_CHECK_TASKS: {
  section: RoutineCheckSection;
  task: string;
  detail?: string;
}[] = [
  { section: "Routine Checks", task: "Server Health Check" },
  { section: "Routine Checks", task: "Disk Space Monitoring" },
  { section: "Routine Checks", task: "Backup Verification" },
  { section: "Routine Checks", task: "Antivirus / Endpoint Status" },
  { section: "Routine Checks", task: "Network Device Health" },
  { section: "Routine Checks", task: "Email System Functionality" },
  { section: "Routine Checks", task: "Storage" },
  {
    section: "System Updates & Patch Management",
    task: "Windows Servers",
    detail: "Security Updates",
  },
  { section: "System Updates & Patch Management", task: "Linux Servers", detail: "Kernel Update" },
  {
    section: "System Updates & Patch Management",
    task: "Network Switches",
    detail: "Firmware Check",
  },
];
