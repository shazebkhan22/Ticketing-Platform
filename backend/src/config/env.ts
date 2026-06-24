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
};
