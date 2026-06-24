import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { authRouter } from "./routes/auth";
import { ticketsRouter } from "./routes/tickets";
import { metaRouter } from "./routes/meta";

const app = express();

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

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`Cygnus Ticketing backend listening on port ${env.port}`);
});
