# Deploying to the company server (Docker)

One Nginx container serves the frontend and reverse-proxies `/api` to the
backend — same origin, so the session cookie works without any CORS/SameSite
complications.

## One-time setup on the server

```bash
git clone https://github.com/shazebkhan22/Ticketing-Platform.git
cd Ticketing-Platform
cp .env.production.example .env
# edit .env: set real POSTGRES_PASSWORD, SESSION_SECRET, and FRONTEND_ORIGIN
# (FRONTEND_ORIGIN = the public URL this will be served from, e.g.
# https://tickets.yourcompany.com)
```

Generate strong random values instead of typing your own:

```bash
openssl rand -hex 32   # use for SESSION_SECRET
openssl rand -hex 24   # use for POSTGRES_PASSWORD
```

## Build and start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## First-time database setup (only once, on a fresh database)

```bash
docker compose -f docker-compose.prod.yml exec backend node dist/db/migrate.js
docker compose -f docker-compose.prod.yml exec backend node dist/db/seed.js
```

This creates the 6 users with the placeholder password `ChangeMe123!` —
log in once as each and change it (or update directly in the DB) before
handing out real access. See `backend/src/db/seed.ts` for the username list.

## HTTPS

The frontend container listens on port 80 only. Put it behind whatever the
company already uses for TLS termination (a load balancer, an existing
reverse proxy, or Certbot/Let's Encrypt pointed at this container). Once
HTTPS is in place and `NODE_ENV=production` (already set in the compose
file), the session cookie's `Secure` flag requires the real request to
arrive over HTTPS — logins will not persist over plain HTTP in production.

## Smoke test after deploying

```bash
curl -i https://tickets.yourcompany.com/api/health
# then log in through the browser and confirm the session persists
# across a page reload (cookie should show `Secure` in dev tools)
```

## Updating to a new version later

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

No migration step needed unless `backend/src/db/schema.sql` changed — that
file only applies once, on a database that doesn't yet have a `tickets`
table, so check the README before assuming a schema change will apply
automatically.
