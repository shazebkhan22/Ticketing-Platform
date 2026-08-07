import { TicketStatus } from "../types/ticket";

// Enforced lifecycle: Pending -> In Progress -> Closed, with reopen only
// from Closed (back to Pending, to restart the work cycle). No other jump
// is legal — this is shared by both tickets and projects since they use
// the same status enum and PATCH .../status shape.
const ALLOWED_TRANSITIONS: Record<TicketStatus, ReadonlySet<TicketStatus>> = {
  // Pending can go straight to Closed too — e.g. a ticket dispatched
  // through the inventory outward workflow (see controllers/inventory.ts)
  // gets auto-closed even if no one ever manually marked it "In Progress".
  Pending: new Set(["In Progress", "Closed"]),
  "In Progress": new Set(["Closed"]),
  Closed: new Set(["Pending"]),
};

export function isLegalStatusTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].has(to);
}

// Every status that may legally move to `to` in one step, including `to`
// itself (a same-status no-op). Used to fold the transition check into the
// UPDATE's WHERE clause, so the current-status read and the write happen
// as a single atomic statement instead of a separate check-then-update
// that a concurrent request could race.
export function allowedSourceStatuses(to: TicketStatus): TicketStatus[] {
  const sources: TicketStatus[] = [to];
  for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS) as [TicketStatus, ReadonlySet<TicketStatus>][]) {
    if (targets.has(to)) sources.push(from);
  }
  return sources;
}
