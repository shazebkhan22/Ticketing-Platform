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
# unrelated to our app) shrinks the attack surface for free.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
