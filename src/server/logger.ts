import pino from "pino";

// Use simple stdout transport to avoid pino-pretty worker thread issues on Windows
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});
