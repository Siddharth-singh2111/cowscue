import pino from "pino";

/**
 * Structured JSON logger. In development output is human-readable; in production it emits
 * one JSON object per line so it can be shipped to Loki / Datadog / CloudWatch as-is.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: process.env.SERVICE_NAME || "cowscue-web" },
  redact: {
    paths: ["*.reporterPhone", "*.driverPhone", "*.phone", "*.authorization", "req.headers.cookie"],
    censor: "[redacted]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
