FROM node:22-alpine AS build
WORKDIR /app
# bcrypt needs to compile a native module
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# tsc only emits compiled .js — schema.sql is a runtime asset read via fs at
# migrate-time and needs to be copied alongside it manually.
RUN cp src/db/schema.sql dist/db/schema.sql

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Pull whatever's newest in Alpine's package repo at build time, rather than
# trusting however old the base image's baked-in packages are.
RUN apk update && apk upgrade --no-cache
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++
# The final image only ever runs `node`, never `npm` — deleting npm's own
# bundled CLI (and its vulnerable transitive deps like tar/sigstore/picomatch,
# unrelated to our app) shrinks the attack surface for free. node-pg-migrate
# is invoked directly via its bin script below instead, since it's a real
# (non-dev) dependency and survives `--omit=dev`.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build --chown=node:node /app/dist ./dist
# node-pg-migrate reads these .sql files directly at runtime (they're not
# compiled by tsc), same reason schema.sql is copied above.
COPY --chown=node:node migrations ./migrations
USER node
EXPOSE 4000
# Runs pending migrations before every start so schema changes ship
# automatically with a redeploy instead of requiring a manual exec step.
# Two migration systems run in sequence: dist/db/migrate.js is the legacy
# bootstrap (schema.sql on a truly fresh DB, or a no-op additive pass on an
# existing one — see db/migrate.ts's own comments), then node-pg-migrate
# applies everything since the migrations/ baseline. Both must run on every
# deploy: the first brings a fresh DB up to the baseline node-pg-migrate
# expects; the second applies anything added after that baseline.
CMD ["sh", "-c", "node dist/db/migrate.js && node node_modules/node-pg-migrate/bin/node-pg-migrate.js up && node dist/server.js"]
