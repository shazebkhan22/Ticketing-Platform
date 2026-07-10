# Cygnus Ticketing System — Frontend

React + TypeScript SPA for the Cygnus Ticketing System. Talks to the Express
backend documented in `../backend/README.md` over `/api`, using a
session cookie for auth (no JWT/localStorage tokens).

---

## Tech Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Language | TypeScript |
| Routing | `react-router-dom` v7 |
| Server state | `@tanstack/react-query` |
| Forms | `react-hook-form` + `zod` (via `@hookform/resolvers`) |
| HTTP client | `axios` (`withCredentials: true` so the session cookie is sent) |
| UI components | shadcn/ui (Radix primitives + Tailwind) — generated components live in `src/components/ui/` |
| Styling | Tailwind CSS v4 |
| Toasts | `sonner` |

## Running Locally

```bash
npm install
npm run dev       # http://localhost:5173, proxies/talks to backend at http://localhost:4000
```

Requires the backend to be running (see `../backend/README.md` §5) and its
`FRONTEND_ORIGIN` env var to match this dev server's URL for CORS/cookies to
work.

Other scripts:
- `npm run build` — type-checks (`tsc -b`) then builds to `dist/`
- `npm run preview` — serves the production build locally
- `npm run lint` — ESLint

## Project Structure

```
src/
├── App.tsx              # route table, lazy-loaded pages, QueryClient setup
├── main.tsx              # entrypoint
├── api/                  # one file per backend resource — thin axios wrappers, no business logic
│   ├── client.ts          # shared axios instance (baseURL, withCredentials)
│   ├── auth.ts, tickets.ts, customers.ts, inventory.ts, activity.ts
├── hooks/                # react-query hooks wrapping api/* (useTickets, useInventory, ...)
├── pages/                # one component per route (see App.tsx for the route table)
├── components/
│   ├── ui/                # shadcn-generated primitives — treat as vendored, avoid hand-editing where possible
│   ├── ProtectedRoute.tsx, AdminRoute.tsx   # route guards, see below
│   └── SidebarLayout.tsx, app-sidebar.tsx, nav-*.tsx
├── context/AuthContext.tsx   # current-user state, populated from GET /api/auth/me
├── lib/
│   ├── schemas.ts          # zod schemas for every form (source of truth for client-side validation)
│   └── ticket-utils.ts, utils.ts
├── constants/             # dropdown option lists, filter defaults, tooltip copy
└── types/                 # TS types mirroring backend response shapes
```

**Mental model:** `pages/*` render UI and call `hooks/*`; `hooks/*` wrap
`@tanstack/react-query` around `api/*`; `api/*` are thin axios calls with no
logic. Validation schemas live in `lib/schemas.ts`, imported by whichever
page owns that form.

## Routing & Access Control

Defined in `App.tsx`:
- `/login` — public.
- Everything else is wrapped in `<ProtectedRoute>` (redirects to `/login` if
  `GET /api/auth/me` fails) and `<SidebarLayout>`.
- `/activity`, `/customers`, `/customers/:id`, `/inventory` are additionally
  wrapped in `<AdminRoute>` — hidden from non-admins client-side. **This is a
  UX convenience only**; the backend independently enforces its own
  authorization per route (see `backend/README.md` §7), so don't assume a
  route is actually protected just because the frontend hides its nav link.

Pages are lazy-loaded (`React.lazy`) per route so the initial bundle only
includes what's needed for the first screen.

## Forms & Validation

Every form uses `react-hook-form` with a `zod` schema from `lib/schemas.ts`
via `zodResolver`, giving inline field errors before a request is even sent.
**Client-side validation is a UX convenience, not a security boundary** — the
backend re-validates everything (see `backend/README.md` §9), since a
client-side check can always be bypassed by calling the API directly.

Current cross-field rules (added 2026-07-03, see root `CHANGELOG.md` for
full detail):

| Form | File | Rule |
|---|---|---|
| Inventory update | `pages/InventoryPage.tsx` | Outward date requires an inward date to already be set; inward date must be on/before outward date; outsourced repairs require a vendor name + expected return date; expected return date must be on/before the outward date |
| Ticket create/edit | `lib/schemas.ts` (`ticketFormSchema`) | Deadline date must be on/after the ticket date |
| Ticket feedback | `pages/TicketDetailPage.tsx` | Feedback field is only shown once the ticket's status is `Closed` (mirrored server-side) |

When adding a new form, put the schema in `lib/schemas.ts` next to the
existing ones, and if it has a matching backend endpoint, mirror any
cross-field rule there too — see the table in root `CHANGELOG.md` for the
current client/server pairing.

## API Communication

`src/api/client.ts` exports a single `axios` instance configured with
`withCredentials: true` so the `connect.sid` session cookie set by the
backend is sent on every request and CORS-safe. Do not create additional
axios instances — add new endpoints as functions in the relevant `api/*.ts`
file and call them through a react-query hook in `hooks/*.ts`, rather than
calling `axios` directly from a page component.

## Known Gaps

- `pages/AnalyticsPage.tsx` exists but its route is commented out in
  `App.tsx` — not wired up yet.
- No automated frontend test suite yet; changes are verified manually
  against the running dev server.

## Security Hardening (2026-07-10 audit)

A full security audit was run against the app (see `backend/README.md` §15
for the backend-side fixes from the same pass). Frontend-side changes:

- **Content-Security-Policy meta tag** (`index.html`) — restricts
  `script-src`/`default-src` to `'self'`, disallows framing
  (`frame-ancestors 'none'`), and disallows plugins (`object-src 'none'`).
  `style-src` allows `'unsafe-inline'` because Tailwind and
  `components/ui/chart.tsx` inject `<style>` tags at runtime. `connect-src`
  covers same-origin plus the local dev API port — **if the API is ever
  served from a different origin than the frontend in production, update
  `connect-src` accordingly or requests will be blocked.** This is on top of,
  not instead of, the backend's `helmet` headers — `helmet`'s CSP is
  disabled server-side specifically because this meta tag is the one that
  actually applies to the page the browser renders.
- **`autoComplete` attributes on every credential field** — the login form
  (`components/login-form.tsx`) and the change-password/SMTP-settings pages
  now set the correct `autoComplete` value so password managers don't
  mis-fill or conflate unrelated credential fields.

**Not yet fixed** (flagged by the same audit, still open): no
`X-Frame-Options`/HSTS/`X-Content-Type-Options` response headers at the
nginx layer that serves this app's build output in production (the CSP meta
tag above only covers what a `<meta>` tag *can* express) — see
`backend/README.md` §15 for the full list of open infra items.
