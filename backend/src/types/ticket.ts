export const TICKET_MODES = ["Whatsapp", "Call", "Mail", "Verbally"] as const;
export const CALL_TYPES = [
  "Warranty",
  "AMC",
  "OEM",
  "Office",
  "Installation",
  "POC",
  "Project",
  "Call",
  "Chargeable",
  "Non-Chargeable",
  // FMS engineers' daily system-admin checklist report (server health,
  // backups, patching, ...), logged as a ticket so it gets a ticket number
  // and shows up in the same export/activity history as everything else —
  // see createTicket's callType==="Routine Checks" branch for the different
  // required-field set this call type uses.
  "Routine Checks",
] as const;

// Fixed checklist used by the Routine Checks call type — matches the daily
// report FMS engineers already send (see controllers/tickets.ts). Each
// section/task pair is a fixed row; engineers submit a status + optional
// note for each. Not admin-configurable yet — see the "Task list source"
// decision made when this feature was added.
export const ROUTINE_CHECK_STATUSES = ["Completed", "N/A"] as const;

export interface RoutineCheckTaskDef {
  section: "Routine Checks" | "System Updates & Patch Management";
  task: string;
  // Only System Updates & Patch Management rows have a fixed second
  // descriptor (e.g. "Security Updates") alongside the task/system name.
  detail?: string;
}

export const ROUTINE_CHECK_TASKS: readonly RoutineCheckTaskDef[] = [
  { section: "Routine Checks", task: "Server Health Check" },
  { section: "Routine Checks", task: "Disk Space Monitoring" },
  { section: "Routine Checks", task: "Backup Verification" },
  { section: "Routine Checks", task: "Antivirus / Endpoint Status" },
  { section: "Routine Checks", task: "Network Device Health" },
  { section: "Routine Checks", task: "Email System Functionality" },
  { section: "Routine Checks", task: "Storage" },
  { section: "System Updates & Patch Management", task: "Windows Servers", detail: "Security Updates" },
  { section: "System Updates & Patch Management", task: "Linux Servers", detail: "Kernel Update" },
  { section: "System Updates & Patch Management", task: "Network Switches", detail: "Firmware Check" },
] as const;
export const TICKET_STATUSES = ["Pending", "In Progress", "Closed"] as const;
export const INTERNAL_TAGS = ["Internal", "External"] as const;
// P1 = highest priority, P4 = lowest.
export const TICKET_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export const REPAIR_LOCATIONS = ["In-House", "Outsourced"] as const;
export const USER_TEAMS = ["FMS", "Field"] as const;

// "Account Manager" is free text (anybody in the office who reported the
// issue), not a preset list — see controllers/tickets.ts.
// "Assigned To" must be one of the 5 platform users — see routes/meta.ts,
// which serves that list dynamically from the `users` table.

export type TicketMode = (typeof TICKET_MODES)[number];
export type CallType = (typeof CALL_TYPES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type InternalTag = (typeof INTERNAL_TAGS)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type RepairLocation = (typeof REPAIR_LOCATIONS)[number];
