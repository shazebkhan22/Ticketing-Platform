import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  sessionMaxAgeMinutes: Number(process.env.SESSION_MAX_AGE_MINUTES ?? 30),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  dnsOrigin: process.env.DNS_ORIGIN ?? "http://cispl.ddns.net:5173",
  // Max simultaneous DB connections this instance's pool will open. pg's own
  // default is 10, which is silently, catastrophically low under real
  // concurrent load — every additional running instance of this app must
  // stay under Postgres's own max_connections (default 100), so this and
  // horizontal scaling need to be tuned together, ideally via PgBouncer once
  // there's more than a couple of instances.
  dbPoolMax: Number(process.env.DB_POOL_MAX ?? 20),
  // A single stuck/runaway query no longer holds a pool connection forever —
  // Postgres itself cancels it after this many ms.
  dbStatementTimeoutMs: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 10_000),
};
