import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiErrorDetail = {
  /** Dotted path into the request body, e.g. `email`. */
  path: string;
  message: string;
};

/**
 * A failure the client is allowed to see. Anything else reaching the error
 * handler becomes an opaque 500, so throwing this is how a module opts a
 * message into the response.
 */
export class ApiError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly details: readonly ApiErrorDetail[];

  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string,
    details: readonly ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: readonly ApiErrorDetail[];
  };
};

/** One envelope for every failure, so a client parses errors in exactly one way. */
export function toErrorBody(error: ApiError, requestId: string): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      requestId,
      ...(error.details.length > 0 ? { details: error.details } : {}),
    },
  };
}
