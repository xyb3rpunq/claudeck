// STEP 10 — Logging terstruktur sederhana (console JSON).
// Bisa diganti/dilengkapi dengan Sentry di production.

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => log("error", event, data),
};

/** Log pemakaian token harian per user — untuk deteksi anomali/abuse. */
export function logTokenUsage(userId: string, inputTokens: number, outputTokens: number) {
  logger.info("token_usage", {
    userId,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    day: new Date().toISOString().slice(0, 10),
  });
}
