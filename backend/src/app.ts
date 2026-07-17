import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { logger } from "./utils/logger";
import { AppError } from "./utils/AppError";
import { authRouter } from "./routes/auth";
import { ticketsRouter } from "./routes/tickets";
import { metaRouter } from "./routes/meta";
import { activityRouter } from "./routes/activity";
import { customersRouter } from "./routes/customers";
import { inventoryRouter } from "./routes/inventory";
import { settingsRouter } from "./routes/settings";
import { feedbackRouter } from "./routes/feedback";
import { usersRouter } from "./routes/users";

export const app = express();

// Baseline security headers (X-Content-Type-Options, HSTS, etc.). CSP is
// disabled here because this is a pure JSON API with no served frontend —
// the React app runs on a separate origin and sets its own CSP.
app.use(helmet({ contentSecurityPolicy: false }));

// Structured request logs (method, path, status, duration, request id) —
// the request id is echoed in error responses below so a user-reported
// failure can be grep'd straight to its log line.
app.use(pinoHttp({ logger }));

// Required behind a reverse proxy (Nginx) so Express reads the
// X-Forwarded-Proto header to know the original request was HTTPS —
// otherwise the session cookie's `secure` flag would never be satisfied
// and logins would silently fail to persist in production.
if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);
app.use(express.json());

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: env.sessionMaxAgeMinutes * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: env.nodeEnv === "production",
    },
  })
);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/meta", metaRouter);
app.use("/api/activity", activityRouter);
app.use("/api/customers", customersRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/users", usersRouter);
app.use("/api/public/feedback", feedbackRouter);

app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: "Not found" });
});

// AppError is for expected, well-understood failures a controller chooses
// to throw (e.g. "not found", "invalid state transition") — logged at warn
// since they're not bugs. Anything else reaching here is unexpected and
// logged at error with the full stack for debugging.
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = (req as express.Request & { id?: string }).id;

  if (err instanceof AppError) {
    req.log.warn({ err, requestId }, err.message);
    return res.status(err.statusCode).json({ error: err.message, requestId });
  }

  req.log.error({ err, requestId }, "Unhandled error");
  res.status(500).json({ error: "Internal server error", requestId });
});
