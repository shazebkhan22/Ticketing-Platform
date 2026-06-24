# Cygnus Ticketing System — Backend Documentation

This document is the single source of truth for the backend. Read it top to bottom once, then use the table of contents to jump to whatever you need later.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Running the Backend Locally](#5-running-the-backend-locally)
6. [Database](#6-database)
   - [Tables](#61-tables)
   - [Enums](#62-enums)
   - [Triggers](#63-triggers)
   - [Migration & Seed Scripts](#64-migration--seed-scripts)
7. [Authentication & Sessions](#7-authentication--sessions)
8. [API Reference](#8-api-reference)
   - [Auth Routes](#81-auth-routes-apiauth)
   - [Ticket Routes](#82-ticket-routes-apitickets)
   - [Meta Routes](#83-meta-routes-apimeta)
9. [Request Validation](#9-request-validation)
10. [Ticket Number Generation](#10-ticket-number-generation)
11. [Error Handling](#11-error-handling)
12. [How to Inspect the Database](#12-how-to-inspect-the-database)
13. [Adding New Features (Patterns to Follow)](#13-adding-new-features-patterns-to-follow)
14. [Known Gaps / Not Yet Built](#14-known-gaps--not-yet-built)

---

## 1. Overview

The backend is a REST API for the Cygnus Ticketing System — it replaces an Excel sheet used to track IT support tickets (warranty, AMC, installation, office issues, etc).

It currently provides:
- **Individual logins for 5 named accounts** (session-based, not JWT) — 1 admin + 4 employees (one of whom, Parmanand Pandey, is both the admin and an active ticket-creating/resolving employee). See [§7](#7-authentication--sessions).
- **Ownership-based permissions**: every ticket is owned by the user who created it. The owner (or an admin) can edit/update/delete it; everyone else can only read it. Enforced server-side, not just hidden in the UI — see [§7](#7-authentication--sessions) and the `requireOwnerOrAdmin` middleware.
- Full CRUD for tickets, including an auto-generated date-based ticket number.
- An append-only "remarks" timeline per ticket (never edited, only appended).
- Dashboard summary stats (total / pending / closed / in-progress / overdue).
- Filtering and search over the ticket list — all tickets are visible to all logged-in users regardless of owner (shared dashboard), only mutation is restricted.
- A `meta` endpoint that returns dropdown option lists (account managers, call types, etc.) so the frontend never hardcodes them.

Not yet built (see [Known Gaps](#14-known-gaps--not-yet-built)): email/cron alerts, Excel import/export, SMTP admin config endpoints. These are planned for later phases.

---

## 2. Tech Stack

| Concern          | Choice                                   |
|-------------------|-------------------------------------------|
| Language          | TypeScript (compiled with `tsc`, run in dev with `tsx`) |
| Web framework     | Express 4                                 |
| Database          | PostgreSQL 16 (run via Docker Compose locally) |
| DB driver         | `pg` (node-postgres), raw SQL — no ORM    |
| Auth              | `express-session` + `connect-pg-simple` (sessions stored in Postgres) + `bcrypt` for password hashing |
| Validation        | `zod` (schema validation on every write endpoint) |
| Planned, installed but unused yet | `nodemailer` (email), `node-cron` (scheduled jobs), `exceljs` (Excel import/export), `multer` (file upload) |

Why no ORM: the schema is small and stable, and raw SQL keeps the query logic (filters, joins, aggregates) fully visible in the controller files rather than hidden behind an abstraction.

---

## 3. Project Structure

```
backend/
├── .env                      # your local secrets/config (gitignored)
├── .env.example              # template for .env
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts             # app entrypoint: middleware wiring, route mounting, listen()
    ├── config/
    │   └── env.ts             # reads & validates process.env, exports typed `env` object
    ├── db/
    │   ├── pool.ts             # the shared `pg.Pool` instance — every query goes through this
    │   ├── schema.sql          # full DDL: tables, enums, indexes, triggers
    │   ├── migrate.ts          # runs schema.sql once (idempotent — skips if `tickets` table exists)
    │   └── seed.ts             # creates the 5 named user accounts (SEED_USERS array) + call-type targets
    ├── middleware/
    │   └── auth.ts             # requireAuth / requireAdmin / requireOwnerOrAdmin guards
    ├── routes/
    │   ├── auth.ts             # POST /login, POST /logout, GET /me
    │   ├── tickets.ts          # all /api/tickets/* routes, wires controllers
    │   └── meta.ts             # GET /api/meta/options — dropdown values for frontend
    ├── controllers/
    │   └── tickets.ts          # all ticket business logic + SQL queries
    ├── types/
    │   ├── ticket.ts           # enums/const arrays shared across backend (modes, call types, etc.)
    │   └── express-session.d.ts # TypeScript augmentation: adds userId/username/role/displayName to req.session
    └── utils/
        └── ticketNumber.ts     # generates the DDMMYYYYNN ticket number
```

**Mental model:** `server.ts` → `routes/*` (URL + middleware wiring only) → `controllers/*` (logic + SQL) → `db/pool.ts` (actual DB connection). Routes never contain SQL; controllers never contain route-matching logic.

---

## 4. Environment Variables

Defined in `backend/.env` (copy from `.env.example`). Loaded and validated in `src/config/env.ts`.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `4000` | Port the Express server listens on |
| `NODE_ENV` | No | `development` | Set to `production` to enable secure cookies |
| `DATABASE_URL` | **Yes** | — | Postgres connection string, e.g. `postgresql://cygnus:<password>@localhost:5432/cygnus_ticketing` (see your local `.env`) |
| `SESSION_SECRET` | **Yes** | — | Secret used to sign the session cookie. Must be long/random in production. |
| `SESSION_MAX_AGE_MINUTES` | No | `30` | Inactivity timeout — session cookie max-age, refreshed on every request (`rolling: true`) |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Used for CORS `origin` — must match exactly where the React app is served from |

If `DATABASE_URL` or `SESSION_SECRET` are missing, `env.ts` throws on startup (`required()` helper) — the server will refuse to boot rather than run misconfigured.

Note: there is no `BOOTSTRAP_USERNAME`/`BOOTSTRAP_PASSWORD` env var — the 5 named accounts are defined directly in `src/db/seed.ts` (`SEED_USERS` array), since each employee has their own distinct username/password rather than one shared login. See [§7](#7-authentication--sessions).

---

## 5. Running the Backend Locally

```bash
# 1. Start Postgres (and pgAdmin) via Docker Compose — run from the repo root
cd "Ticketing Platform"
docker compose up -d

# 2. Install dependencies (only needed once / after package.json changes)
cd backend
npm install

# 3. Apply the database schema (safe to re-run — skips if already applied)
npm run migrate

# 4. Seed the 5 named user accounts + reference data (call-type targets)
npm run seed

# 5. Start the dev server (auto-restarts on file change via tsx watch)
npm run dev
```

Server boots on `http://localhost:4000`. Sanity check:
```bash
curl http://localhost:4000/api/health   # → {"status":"ok"}
```

**Other npm scripts:**
- `npm run build` — compiles TypeScript to `dist/` (for production)
- `npm run start` — runs the compiled `dist/server.js` (production mode, no auto-reload)

---

## 6. Database

### 6.1 Tables

#### `users`
Individual employee accounts — there is **no shared login**. Seeded once via `src/db/seed.ts` (`SEED_USERS` array):

| username | display_name | role |
|---|---|---|
| `parmanand` | Parmanand Pandey | `admin` (also creates/gets assigned tickets like any employee) |
| `jitesh` | Jitesh Malhotra | `employee` |
| `pranesh` | Pranesh Kute | `employee` |
| `raghvendra` | Raghvendra Mishra | `employee` |
| `manoj` | Manoj Mohite | `employee` |

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | referenced by `tickets.owner_user_id` and `tickets.assigned_to_user_id` |
| `username` | TEXT UNIQUE NOT NULL | |
| `password_hash` | TEXT NOT NULL | bcrypt hash, 12 salt rounds |
| `role` | `user_role` enum | `admin` or `employee` — only affects whether `requireAssigneeOrAdmin` lets you bypass the assignment check |
| `display_name` | TEXT | shown in the UI and copied into `tickets.assigned_to` whenever a ticket is (re)assigned to this user |
| `email` | TEXT | optional, not currently used for login |
| `created_at` | TIMESTAMPTZ | default `now()` |

To change a password later: delete the row (`DELETE FROM users WHERE username = '...'`) and re-run `npm run seed`, or update `password_hash` directly with a fresh bcrypt hash. Editing the plaintext password in `SEED_USERS` after the user already exists has no effect — seed only inserts, it never updates existing rows.

#### `tickets`
The core entity. Maps 1:1 to the spec's 20-field ticket schema (Sr No through Internal Tag).

| Column | Type | Maps to spec field | Notes |
|---|---|---|---|
| `sr_no` | SERIAL PK | Sr No | Auto-increment, this IS the row's primary key (not a separate id) |
| `ticket_no` | TEXT UNIQUE NOT NULL | Ticket No | Format `DDMMYYYYNN`, generated server-side — see [§10](#10-ticket-number-generation) |
| `ticket_date` | DATE NOT NULL | Date | Date the ticket was *received*, not row-creation date |
| `mode` | `ticket_mode` enum | Mode | Whatsapp / Call / Mail / Verbally |
| `company_name` | TEXT NOT NULL | Company Name | |
| `contact_name` | TEXT | Contact Name | nullable |
| `contact_no` | TEXT | Contact No | nullable, stored as text (not numeric — preserves leading zeros/formatting) |
| `email_id` | TEXT | Email ID | nullable |
| `address` | TEXT | Address | nullable |
| `model` | TEXT | Model | nullable |
| `serial_number` | TEXT | Serial Number | nullable, comma-separated values supported (e.g. `"SN123,SN124"`) — stored as plain text, no separate table |
| `problem` | TEXT NOT NULL | Problem | |
| `owner_user_id` | INTEGER NOT NULL, FK → `users(id)` | — (not in original spec) | **The employee who created the ticket.** Set automatically server-side at creation from `req.session.userId` — never accepted from client input. Purely informational ("who logged this") — it does **not** grant edit rights; see [§7](#7-authentication--sessions). |
| `account_manager` | TEXT NOT NULL | Account Manager | **Free text, user-supplied at creation.** Means "the person in the office who reported/raised this issue" — can be anybody, not necessarily one of the 5 platform accounts, and is not tied to `owner_user_id`. Editable via `PUT`. |
| `call_type` | `call_type` enum | Call Type | Warranty / AMC / OEM / Office / Installation / Project / Call |
| `assigned_to_user_id` | INTEGER NOT NULL, FK → `users(id)` | — (not in original spec) | **The employee responsible for resolving the ticket.** Chosen at creation (and re-assignable via `PUT`) from the 5 platform accounts. This is the actual permission record used by `requireAssigneeOrAdmin` — see [§7](#7-authentication--sessions). |
| `assigned_to` | TEXT NOT NULL | Assigned To | **Denormalized copy of the assignee's `display_name`**, kept in sync with `assigned_to_user_id` on every create/reassign so existing filter/search queries by name continue to work without a join. (Note: the spec's "Assigned By" field was removed — superseded by `account_manager`, which already records who raised the issue.) |
| `deadline_date` | DATE | — (not in original spec) | Optional target completion date, set manually on the form. Not auto-calculated from `call_type_targets` currently — see [§14](#14-known-gaps--not-yet-built). |
| `status` | `ticket_status` enum | Status | Pending (default) / In Progress / Closed |
| `feedback` | TEXT | Feedback From User | nullable, free text (e.g. "5/5") |
| `internal_tag` | `internal_tag` enum | Internal Tag | Internal / External, default `External` |
| `created_at` | TIMESTAMPTZ | — | row insert time, default `now()` |
| `updated_at` | TIMESTAMPTZ | — | auto-updated by trigger on every `UPDATE` — see [§6.3](#63-triggers) |
| `closed_at` | TIMESTAMPTZ | — | set automatically when status transitions to `Closed` (see `updateTicketStatus` controller) |

Note: "Remarks" from the spec is **not** a column on this table — it's the separate `remarks` table below, because it's an append-only list, not a single value.

**Indexes:** `status`, `call_type`, `assigned_to`, `assigned_to_user_id`, `account_manager`, `owner_user_id`, `ticket_date`, `company_name` — these cover every filter the dashboard supports plus the assignment check on every write request.

#### `remarks`
The append-only timeline. One row per update.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `ticket_sr_no` | INTEGER FK → `tickets.sr_no` | `ON DELETE CASCADE` — deleting a ticket deletes its remarks |
| `remark_date` | DATE NOT NULL | the date shown to the user (defaults to today if not provided) |
| `body` | TEXT NOT NULL | the free-text update |
| `created_by` | TEXT | username of whoever added it, taken from the session |
| `created_at` | TIMESTAMPTZ | actual insert timestamp, default `now()` |

There is **no UPDATE endpoint for remarks** — by design, this enforces the "never editable once saved" requirement at the API layer (no route exists to edit/delete a remark).

#### `call_type_targets`
Optional SLA targets per call type, for the (not-yet-built) "approaching deadline" email alert.

| Column | Type | Notes |
|---|---|---|
| `call_type` | `call_type` enum PK | one row per call type |
| `target_resolution_days` | INTEGER | nullable — `NULL` means no target set. Seeded: Warranty=7, AMC=3, others=NULL |

#### `smtp_config`
Singleton table (always `id = 1`, enforced by a `CHECK` constraint) holding SMTP credentials for the email system, editable later from an admin settings page.

| Column | Type | Notes |
|---|---|---|
| `id` | SMALLINT PK, default 1 | locked to 1 row via `CHECK (id = 1)` |
| `host`, `port`, `username`, `password`, `from_address` | text/int | SMTP connection details |
| `secure` | BOOLEAN | TLS flag, default `false` |

Not yet wired to any route — table exists, no API reads/writes it yet (planned for the email phase).

#### `user_sessions`
Created automatically by `connect-pg-simple` (`createTableIfMissing: true` in `server.ts`) — stores active login sessions so they survive server restarts. You won't query this directly; it's managed by the session middleware.

### 6.2 Enums

Defined as native Postgres `ENUM` types (not just app-level constants) so the database itself rejects invalid values:

```sql
user_role      = 'admin' | 'employee'
ticket_mode    = 'Whatsapp' | 'Call' | 'Mail' | 'Verbally'
call_type      = 'Warranty' | 'AMC' | 'OEM' | 'Office' | 'Installation' | 'Project' | 'Call'
ticket_status  = 'Pending' | 'In Progress' | 'Closed'
internal_tag   = 'Internal' | 'External'
```

The matching TypeScript const arrays live in `src/types/ticket.ts` (`TICKET_MODES`, `CALL_TYPES`, `TICKET_STATUSES`, `INTERNAL_TAGS`) and are used both for `zod` validation and for the `/api/meta/options` response — **if you add a new enum value, you must update it in both places**: `schema.sql` (requires a migration — Postgres enums can't easily be altered without `ALTER TYPE ... ADD VALUE`) and `types/ticket.ts`.

### 6.3 Triggers

`set_updated_at()` — a `BEFORE UPDATE` trigger on `tickets` that sets `updated_at = now()` on every update, so the dashboard's "Last Updated" column is always accurate without the application code needing to remember to set it.

### 6.4 Migration & Seed Scripts

- **`migrate.ts`** runs `schema.sql` verbatim. It checks `information_schema.tables` for a `tickets` table first — if found, it skips (so re-running `npm run migrate` is safe and won't error on "type already exists"). This is a **single-file migration**, not a versioned migration chain — if you need to change the schema later, you'll either (a) write a new manual `ALTER` SQL file and run it separately, or (b) consider introducing a proper migration tool (e.g. `node-pg-migrate`) once the schema stabilizes.
- **`seed.ts`** is idempotent: it uses `ON CONFLICT DO NOTHING` for call-type targets, and checks for an existing user by username before inserting each of the 5 `SEED_USERS`. Safe to re-run anytime — it will only create accounts that don't already exist, never overwrite passwords on existing ones.

---

## 7. Authentication & Sessions

- **Individual logins, not a shared account.** Each of the 5 employees has their own username/password, seeded via `src/db/seed.ts` (`SEED_USERS` array — see [§6.1](#61-tables) for the list). There is no registration flow; accounts are provisioned by editing the seed file and re-running `npm run seed`.
- Passwords are hashed with `bcrypt` (12 salt rounds) — plaintext is never stored.
- On successful login (`POST /api/auth/login`), the server stores `userId`, `username`, `role`, `displayName` in `req.session` (see `src/types/express-session.d.ts` for the TypeScript shape). Express-session signs a cookie (`connect.sid`) and persists session data server-side in the `user_sessions` Postgres table via `connect-pg-simple`.
- **Auto logout on inactivity**: cookie `maxAge` = `SESSION_MAX_AGE_MINUTES * 60 * 1000`, and `rolling: true` means the expiry is reset on every authenticated request — so a session only expires after N minutes of *no* activity, not N minutes after login.
- Cookie flags: `httpOnly: true` (not readable by JS — XSS protection), `sameSite: 'lax'`, `secure: true` only when `NODE_ENV=production` (requires HTTPS in prod).
- **CORS**: configured with `credentials: true` and `origin: env.frontendOrigin` — the frontend must send requests with `credentials: 'include'` (fetch) or `withCredentials: true` (axios), otherwise the session cookie won't be sent/stored.

### Roles and assignment — the permission model

There are two layers to authorization, and it's important to understand both:

1. **Role** (`admin` or `employee`) — stored on `users.role`. Only one account (`parmanand`) is `admin`.
2. **Assignment** (`tickets.assigned_to_user_id`) — every ticket is currently assigned to exactly one employee, chosen at creation and re-assignable later. This is **independent of who created the ticket** (`owner_user_id`, informational only) — a ticket logged by one employee is commonly assigned to a different one to actually resolve it, and *that assignee* is who gets edit rights, not the creator.

The actual rule, enforced server-side in `src/middleware/auth.ts`:

| Action | Admin | Assignee (employee the ticket is assigned to) | Any other employee |
|---|---|---|---|
| **Read** any ticket (list, detail) | ✅ | ✅ | ✅ — the dashboard is fully shared, everyone sees every ticket |
| **Create** a ticket | ✅ | ✅ (chooses the assignee) | ✅ (chooses the assignee) |
| **Edit** core fields, change status, set feedback, add a remark, delete, reassign | ✅ on **any** ticket | ✅ on tickets **assigned to them** | ❌ 403 on tickets not assigned to them |

Three middleware functions implement this:
- `requireAuth` — any logged-in user (401 if not logged in). Used on all read routes.
- `requireAdmin` — must be logged in AND `role === 'admin'` (401 / 403). Not currently used by any ticket route (see below) but kept for any future admin-only feature (e.g. SMTP config).
- `requireAssigneeOrAdmin` — the one that actually guards ticket mutations. Logic: if `role === 'admin'`, allow immediately. Otherwise, look up `tickets.assigned_to_user_id` for the `:srNo` in the URL and compare it to `req.session.userId`; allow only on a match, else `403 { error: "You can only modify tickets assigned to you" }`. Returns `404` if the ticket doesn't exist at all.

This middleware is applied per-route in `src/routes/tickets.ts` to: `PUT /:srNo`, `PATCH /:srNo/status`, `PATCH /:srNo/feedback`, `DELETE /:srNo`, and `POST /:srNo/remarks`. It is deliberately **not** applied to `GET` routes — reads are always allowed for any authenticated user, since the dashboard is shared.

**Important:** this is enforced at the API layer, not just hidden in the UI — the frontend hides buttons a user can't use (see `TicketDetailPage.tsx`'s `canEdit` check, which compares `user.id` against `ticket.assignedToUserId`), but even if someone crafts a raw request, the backend will reject it with 403. Don't rely on the frontend alone if you're auditing this.

---

## 8. API Reference

Base URL: `http://localhost:4000/api`

All routes except `/api/health` and `/api/auth/*` require an active session (`requireAuth`), enforced via `ticketsRouter.use(requireAuth)` / `metaRouter.use(requireAuth)`.

### 8.1 Auth Routes (`/api/auth`)

#### `POST /api/auth/login`
Body:
```json
{ "username": "pranesh", "password": "<their-password>" }
```
- 200 → `{ id, username, role, displayName }` + sets session cookie
- 400 → missing username/password
- 401 → invalid credentials

#### `POST /api/auth/logout`
No body. Destroys the session and clears the cookie.
- 200 → `{ success: true }`

#### `GET /api/auth/me`
Returns the current session's identity (use this on frontend app load to check "am I logged in?" and to compute `canEdit` against a ticket's `assignedToUserId`).
- 200 → `{ id, username, role, displayName }`
- 401 → not logged in

### 8.2 Ticket Routes (`/api/tickets`)

All require auth. Routes that mutate a specific ticket additionally require `requireAssigneeOrAdmin` — see [§7](#7-authentication--sessions) for exactly which routes and what the rule is.

#### `GET /api/tickets/summary`
Dashboard summary bar.
- 200 →
```json
{ "total": 42, "pending": 10, "closed": 25, "inProgress": 5, "overdue": 3 }
```
"Overdue" = status is Pending or In Progress AND `ticket_date` is more than 30 days ago.

#### `GET /api/tickets`
List + filter + paginate. All query params optional.

| Query param | Type | Effect |
|---|---|---|
| `status` | string | exact match on status |
| `callType` | string | exact match on call type |
| `assignedTo` | string | exact match |
| `accountManager` | string | exact match |
| `dateFrom` | `YYYY-MM-DD` | `ticket_date >= dateFrom` |
| `dateTo` | `YYYY-MM-DD` | `ticket_date <= dateTo` |
| `search` | string | `ILIKE` match against company name OR ticket number |
| `overdue` | `"true"` | filters to overdue tickets only (see definition above) |
| `page` | number, default 1 | pagination |
| `pageSize` | number, default 50, max 200 | pagination |

Response:
```json
{
  "tickets": [ { "srNo": 1, "ticketNo": "2206202601", ..., "lastRemark": "Called vendor..." } ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
```
Each ticket includes `lastRemark` — the most recent remark's text only (a subquery), used for the dashboard table preview column, per the spec ("show only the latest remark as a preview").

#### `GET /api/tickets/:srNo`
Full ticket detail + entire remarks history (oldest → newest).
- 200 →
```json
{
  "ticket": { ...all ticket fields... },
  "remarks": [ { "id": 1, "remarkDate": "...", "body": "...", "createdBy": "cygnus", "createdAt": "..." } ]
}
```
- 404 → no ticket with that `srNo`

#### `POST /api/tickets`
Create a new ticket. `ticketNo` and `ownerUserId` are generated server-side from the logged-in session — do not pass them; they're not accepted in the request body at all. `accountManager` (free text, who reported the issue) and `assignedToUserId` (which employee will resolve it) **are** required in the body.

Body (required fields marked, see `createTicketSchema` in `controllers/tickets.ts` for exact zod rules):
```json
{
  "ticketDate": "2026-06-22",        // required, YYYY-MM-DD
  "mode": "Call",                    // required, one of TICKET_MODES
  "companyName": "Acme Corp",        // required
  "contactName": "John Doe",         // optional
  "contactNo": "9999999999",         // optional
  "emailId": "john@acme.com",        // optional, validated as email if present
  "address": "123 Street",           // optional
  "model": "Dell XPS",                // optional
  "serialNumber": "SN123,SN124",     // optional, comma-separated supported
  "problem": "Laptop not booting",   // required
  "accountManager": "Reception Desk - Sunita",  // required, free text — who reported the issue
  "callType": "Warranty",            // required, one of CALL_TYPES
  "assignedToUserId": 3,             // required, must be an existing user id
  "deadlineDate": "2026-06-30",      // optional, YYYY-MM-DD
  "internalTag": "External"          // optional, defaults to "External"
}
```
- 201 → the created ticket object, with `ownerUserId` = the creator's user id, and `assignedTo` = the chosen assignee's `display_name` (denormalized from `assignedToUserId`)
- 400 → validation error (`{ error: <zod flatten output> }`), including if `assignedToUserId` doesn't reference an existing user

#### `PUT /api/tickets/:srNo`
**Assignee or admin only.** Edit core ticket fields, including reassigning (`assignedToUserId`) and the `accountManager` text. Same shape as create, but every field is optional (`.partial()`) — send only the fields you want to change. **Cannot be used to change status or feedback** — those have dedicated endpoints (matches spec: "Edit button for core fields (not remarks)"). Reassigning updates both `assigned_to_user_id` and the denormalized `assigned_to` name together.
- 200 → updated ticket
- 400 → no fields provided, validation error, or `assignedToUserId` doesn't reference an existing user
- 403 → logged in, but not the assignee and not admin
- 404 → ticket not found

#### `PATCH /api/tickets/:srNo/status`
**Assignee or admin only.** Change ticket status.
```json
{ "status": "Closed" }
```
- If status is set to `"Closed"`, `closed_at` is automatically stamped with `now()`.
- 200 → updated ticket
- 403 → logged in, but not the assignee and not admin
- 404 → not found

This is also where the closure-confirmation email *will* hook in (not implemented yet — see [§14](#14-known-gaps--not-yet-built)).

#### `PATCH /api/tickets/:srNo/feedback`
**Assignee or admin only.**
```json
{ "feedback": "5/5" }
```
Free text, max 50 chars (covers both "5/5" style and star-rating-as-text). Per spec, the frontend should only show this field while status ≠ Closed for editing, but the backend doesn't currently enforce that restriction — it's a UI-layer rule.
- 200 → updated ticket
- 403 → logged in, but not the assignee and not admin
- 404 → not found

#### `DELETE /api/tickets/:srNo`
**Assignee or admin** (`requireAssigneeOrAdmin` — not admin-only; employees can delete tickets assigned to them). Cascades to delete all remarks for that ticket (`ON DELETE CASCADE`).
- 200 → `{ success: true }`
- 401 → not logged in
- 403 → logged in, but not the assignee and not admin
- 404 → not found

#### `POST /api/tickets/:srNo/remarks`
**Assignee or admin only.** Append a remark. **There is no edit/delete endpoint for remarks — this is intentional.**
```json
{ "body": "Called vendor for replacement part", "remarkDate": "2026-06-22" }
```
- `remarkDate` is optional — defaults to today (server's date) if omitted.
- `createdBy` is taken automatically from `req.session.username`, not from the request body.
- 201 → the created remark
- 403 → logged in, but not the assignee and not admin
- 404 → ticket not found

### 8.3 Meta Routes (`/api/meta`)

#### `GET /api/meta/options`
Returns every dropdown's valid values in one call — the frontend should call this once on load and use it to populate all select inputs, rather than hardcoding lists.
```json
{
  "modes": ["Whatsapp", "Call", "Mail", "Verbally"],
  "callTypes": ["Warranty", "AMC", "OEM", "Office", "Installation", "Project", "Call"],
  "statuses": ["Pending", "In Progress", "Closed"],
  "internalTags": ["Internal", "External"],
  "accountManagers": ["Reception Desk - Sunita", "..."],
  "assignedToOptions": [
    { "id": 1, "displayName": "Parmanand Pandey" },
    { "id": 2, "displayName": "Jitesh Malhotra" },
    { "id": 3, "displayName": "Pranesh Kute" },
    { "id": 4, "displayName": "Raghvendra Mishra" },
    { "id": 5, "displayName": "Manoj Mohite" }
  ]
}
```
Both lists are dynamic, but for different reasons:
- `accountManagers` is `SELECT DISTINCT account_manager FROM tickets` — since "Account Manager" is free text (anybody in the office could report an issue), there's no fixed list to seed; this just surfaces previously-used values as filter suggestions on the dashboard, and grows organically as new names get typed in.
- `assignedToOptions` is `SELECT id, display_name FROM users` — "Assigned To" must be one of the 5 real platform accounts (the employees who actually resolve tickets), so the frontend gets `{id, displayName}` pairs: the ticket form submits `assignedToUserId`, while the dashboard filter and detail page display `displayName`.

`modes`, `callTypes`, `statuses`, `internalTags` are fixed const arrays in `types/ticket.ts`.

---

## 9. Request Validation

Every write endpoint validates `req.body` with a `zod` schema before touching the database. If validation fails, the controller returns `400` with `{ error: parsed.error.flatten() }` — a structured object listing exactly which field(s) failed and why, so the frontend can show inline errors.

Validation schemas live inline at the top of `src/controllers/tickets.ts` (`createTicketSchema`, `updateTicketSchema`, `statusSchema`, `remarkSchema`, `feedbackSchema`). They reuse the const arrays from `types/ticket.ts` via `z.enum(...)` so the valid-values list only needs to be maintained in one place.

---

## 10. Ticket Number Generation

Implemented in `src/utils/ticketNumber.ts`, called from `createTicket`.

Format: `DDMMYYYYNN` (e.g. `2206202601` = 22 June 2026, ticket #1 of that day).

Algorithm:
1. Build the `DDMMYYYY` prefix from the ticket's **date** (not today's date — the date the ticket was *received*, per the spec).
2. Query for the highest existing `ticket_no` that starts with that prefix (`LIKE 'DDMMYYYY%' ORDER BY ticket_no DESC LIMIT 1`).
3. Parse the last 2 digits as the sequence number, increment by 1 (or start at `01` if none exist yet for that date).
4. Concatenate and return.

**Caveats to know about:**
- This is **not** wrapped in a transaction/lock — under concurrent simultaneous ticket creation for the same date, there's a theoretical race condition where two requests could compute the same next sequence number before either INSERT commits. Given this is a low-traffic internal tool (a handful of staff creating tickets), this hasn't been hardened with `SELECT ... FOR UPDATE` or a sequence table, but it's worth knowing if ticket volume grows.
- Sequence resets per calendar date, based on the ticket's `ticket_date`, not on `created_at`. Backdating a ticket to a past date will correctly continue that date's sequence.
- Max 99 tickets per day (`NN` is zero-padded 2 digits) — matches the original Excel format's assumption.

---

## 11. Error Handling

- Each controller method is `async` and lets exceptions propagate — uncaught errors fall through to the catch-all error middleware in `server.ts`, which logs the error and returns a generic `500 { error: "Internal server error" }` (so internal details like SQL errors never leak to the client).
- Expected/validation errors are handled explicitly per-route with specific status codes (400/401/403/404) — see each endpoint above.
- There is currently **no global try/catch wrapper** around async route handlers (no `express-async-errors` or similar) — if a controller throws synchronously, Express's default error handling will catch it, but for certain edge cases in async code without `.catch()`, an unhandled rejection could occur. Worth revisiting if you add more complex async logic (e.g. external API calls in the email phase).

---

## 12. How to Inspect the Database

Three options (already set up in `docker-compose.yml`):

1. **pgAdmin web UI** — `http://localhost:5050`, login with the `PGADMIN_DEFAULT_EMAIL`/`PGADMIN_DEFAULT_PASSWORD` from your local root `.env`, then add a server with host `postgres`, port `5432`, db `cygnus_ticketing`, user `cygnus`, password from `POSTGRES_PASSWORD` in the same `.env`.
2. **psql in the container**:
   ```bash
   docker compose exec postgres psql -U cygnus -d cygnus_ticketing
   ```
   Useful commands once inside: `\dt` (list tables), `\d tickets` (describe a table), `SELECT * FROM tickets;`.
3. **Any external GUI client** (TablePlus, Postico, DBeaver) — connect to `localhost:5432` with the same credentials, since the port is published to the host.

---

## 13. Adding New Features (Patterns to Follow)

If you (or a future session) need to extend the backend, follow the existing conventions:

- **New ticket field** → add the column to `schema.sql`, add it to `rowToTicket()` and the relevant zod schema(s) in `controllers/tickets.ts`, add it to the `fieldMap` in `updateTicket` if it should be editable.
- **New dropdown/enum value** → add to the Postgres enum in `schema.sql` (note: changing an existing enum requires `ALTER TYPE ... ADD VALUE` since this isn't versioned migrations) and to the matching const array in `types/ticket.ts`.
- **New route** → add the URL + middleware wiring in `routes/*.ts`, the actual logic in `controllers/*.ts`. Never put SQL in a routes file.
- **New protected route** → mount it under a router that already has `.use(requireAuth)`. If it mutates a specific ticket, add `requireOwnerOrAdmin` inline (see how every mutating route does this in `routes/tickets.ts`). If it should be admin-only regardless of ownership (e.g. a future SMTP settings endpoint), use `requireAdmin` instead.
- **Email/cron features** (Phase 4, not yet built) → expected to live in `src/jobs/` (folder already scaffolded but empty) using `node-cron` for scheduling and `nodemailer` for sending, reading SMTP credentials from the `smtp_config` table.
- **Excel import/export** (Phase 5, not yet built) → `exceljs` and `multer` are already installed for this; expected to be a new route (e.g. `POST /api/tickets/import`, `GET /api/tickets/export`) with its own controller.

---

## 14. Known Gaps / Not Yet Built

These exist in the original spec but have no implementation yet — don't assume they work:

- **Email alerts** (overdue daily alert, approaching-deadline alert, closure confirmation, 9 AM daily digest) — `nodemailer` and `node-cron` are installed dependencies but there is no code using them yet, and `smtp_config` table has no API to read/write it.
- **Excel import** (pre-populate from existing spreadsheet) and **Excel export** (filtered table → `.xlsx`) — `exceljs`/`multer` installed, no routes built.
- **SMTP admin settings UI/API** — table exists, no endpoint.
- **Per-call-type target resolution day editing** — `call_type_targets` table is seeded with defaults (Warranty=7, AMC=3) but there's no API to view/edit these from an admin panel yet.
- **Frontend** — none of this is wired to a UI yet; this backend has only been tested via `curl`.
