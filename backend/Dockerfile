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
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
