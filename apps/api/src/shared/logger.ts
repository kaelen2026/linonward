export type LogFields = Record<string, unknown>;

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
  errors?: SerializedError[];
};

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

/** Preserves diagnostic context that JSON.stringify discards from Error objects. */
export function serializeError(error: unknown, depth = 0): SerializedError {
  if (!(error instanceof Error)) {
    return { name: "UnknownError", message: String(error) };
  }

  const serialized: SerializedError = {
    name: error.name,
    message: error.message,
    ...(error.stack ? { stack: error.stack } : {}),
  };
  if (depth >= 4) return serialized;

  if (error.cause !== undefined) serialized.cause = serializeError(error.cause, depth + 1);
  if (error instanceof AggregateError) {
    serialized.errors = error.errors.map((nested) => serializeError(nested, depth + 1));
  }
  return serialized;
}

function write(level: "info" | "error", event: string, fields: LogFields): void {
  const entry = JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...fields });
  if (level === "error") console.error(entry);
  else console.log(entry);
}
