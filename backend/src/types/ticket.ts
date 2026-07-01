export const TICKET_MODES = ["Whatsapp", "Call", "Mail", "Verbally"] as const;
export const CALL_TYPES = [
  "Warranty",
  "AMC",
  "OEM",
  "Office",
  "Installation",
  "Project",
  "Call",
  "Chargeable",
  "Non-Chargeable",
] as const;
export const TICKET_STATUSES = ["Pending", "In Progress", "Closed"] as const;
export const INTERNAL_TAGS = ["Internal", "External"] as const;
// P1 = highest priority, P4 = lowest.
export const TICKET_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export const REPAIR_LOCATIONS = ["In-House", "Outsourced"] as const;

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
