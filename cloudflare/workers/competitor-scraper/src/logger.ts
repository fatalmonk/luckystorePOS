import type { Logger } from "./types.ts";

export function createLogger(runId?: string): Logger {
  const base = runId ? { run_id: runId } : {};
  return {
    info: (msg: Record<string, unknown>) => {
      console.log(JSON.stringify({ level: "info", ...base, ...msg }));
    },
    error: (msg: Record<string, unknown>) => {
      console.error(JSON.stringify({ level: "error", ...base, ...msg }));
    },
    warn: (msg: Record<string, unknown>) => {
      console.warn(JSON.stringify({ level: "warn", ...base, ...msg }));
    },
  };
}
