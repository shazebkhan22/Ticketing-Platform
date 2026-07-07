import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.nodeEnv === "test" ? "silent" : env.nodeEnv === "production" ? "info" : "debug",
  transport:
    env.nodeEnv === "production" || env.nodeEnv === "test"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
});
