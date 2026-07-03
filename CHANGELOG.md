# Changelog

## Multi-assignee tickets (2026-07-03)

A ticket can now be assigned to more than one person — every assignee gets
full edit rights (status changes, remarks, feedback, deletion), same as the
single assignee did before. **This release requires running the migration
step on deploy** (`docker compose ... exec backend node dist/db/migrate.js`),
unlike the purely additive validation changes below — it adds a new
`ticket_assignees` join table, backfills each ticket's existing single
assignee into it, and drops the old `tickets.assigned_to_user_id` /
`tickets.assigned_to` columns. See `backend/src/db/migrate.ts` for the exact
migration steps (idempotent, safe to re-run).

**Who can assign whom:** admins may assign a ticket to any mix of admins and
employees. Non-admin employees must include themselves in the assignee set
and may only add other employees — never an admin — as co-assignees. See
`resolveAssignees()` in `backend/src/controllers/tickets.ts`.

**API shape change:** `Ticket.assignedToUserId`/`assignedTo` (single
id/name) is replaced by `Ticket.assignees: {id, displayName}[]`. Request
bodies for create/update use `assigneeUserIds: number[]` instead of
`assignedToUserId: number`. Filter/summary/export query params rename
`assignedTo` (a display-name string) to `assigneeUserId` (a numeric id),
since matching now requires an id rather than a name. Excel import/export
represent multiple assignees as a comma-separated name list in the
"Assigned To" cell.

**Frontend:** the single-select "Assigned To" combobox on the ticket form is
replaced by a new `frontend/src/components/ui/multi-select.tsx` component
(checkboxes in a popover, mirrors the existing `combobox.tsx` styling). The
ticket detail page shows all assignees as badges; the dashboard's "Assigned
To" filter and "My Tickets" quick filter now key off user id instead of
display name.

## Validation rules (2026-07-03)

Added cross-field validation to the Inventory update form and the Ticket
form/feedback flow. All rules are enforced in two places — the browser
(instant feedback via toast/disabled inputs) and the API (so a direct
request can't bypass the UI). No database schema changes were made, so a
normal deploy (see `DEPLOY.md` → "Updating to a new version later") is
enough; no migration step is required.

### Inventory update form
`frontend/src/pages/InventoryPage.tsx`, `backend/src/controllers/inventory.ts`

- **Outward date requires an inward date first.** The outward date picker
  is disabled until an inward date is set; saving without one is rejected.
- **Inward date must be on or before the outward date.** Same-day is
  allowed; only outward-before-inward is rejected.
- **Outsourced repairs require a repair center name and an expected
  return date.** Both become mandatory as soon as "Outsourced" is
  selected as the repair location.
- **Expected return date must be on or before the outward date.**
  Same-day is allowed; only a return date after the outward date is
  rejected.

### Ticket form
`frontend/src/lib/schemas.ts`, `backend/src/controllers/tickets.ts`

- **Deadline date must be on or after the ticket date.** Checked on
  create, and on update against whichever of the two dates isn't being
  changed in that request (fetched from the existing row).

### Ticket feedback
`backend/src/controllers/tickets.ts`

- **Feedback can only be submitted once a ticket's status is "Closed."**
  The UI already hid the field otherwise; the API now enforces it too,
  so a direct `PATCH` can no longer set feedback on an open ticket.

## How to extend these rules

Each form's validation lives in two matching places — keep them in sync:

| Form | Client-side check | Server-side check |
|---|---|---|
| Inventory | `validateForm()` in `InventoryPage.tsx` | top of `upsertInventory()` in `inventory.ts` |
| Ticket dates | `.refine()` on `ticketFormSchema` in `schemas.ts` | top of `createTicket()` / `updateTicket()` in `tickets.ts` |
| Ticket feedback | field hidden unless `status === "Closed"` | status check in `updateFeedback()` in `tickets.ts` |

Client-side validation is a UX convenience only — treat the server check
as the source of truth, since the client one can always be bypassed by
calling the API directly.
