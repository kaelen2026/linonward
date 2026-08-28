export type LogFields = Record<string, string | number | boolean | undefined>;

export type Logger = {
  error: (event: string, fields: LogFields) => void;
  info: (event: string, fields: LogFields) => void;
};

/** JSON lines are portable: container runtimes can index them without parsing prose. */
export function createConsoleLogger(): Logger {
  return {
    info: (event, fields) => write("info", event, fields),
    error: (event, fields) => write("error", event, fields),
  };
}

function write(level: "info" | "error", event: string, fields: LogFields): void {
  const entry = JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...fields });
  if (level === "error") console.error(entry);
  else console.log(entry);
}
