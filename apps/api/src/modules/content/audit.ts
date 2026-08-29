import { ApiError } from "../../shared/api-error.js";

export type ContentAuditAction = "article.create" | "article.update" | "article.delete";
export type ContentAuditEvent = {
  id: string;
  action: ContentAuditAction;
  actorEmail: string;
  targetId: string;
  requestId: string;
  outcome: "success" | "failure";
  errorCode?: string;
  occurredAt: Date;
};

type Options<T> = Omit<ContentAuditEvent, "id" | "outcome" | "errorCode"> & {
  nextId: () => string;
  /** Commits both the mutation and this success event in one transaction. */
  commit: (event: ContentAuditEvent) => Promise<T>;
  /** Runs after a failed transaction, so the failure survives its rollback. */
  recordFailure: (event: ContentAuditEvent) => Promise<void>;
};

function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : error instanceof Error ? error.name : "unknown";
}

export async function executeAuditedContentMutation<T>({
  nextId,
  commit,
  recordFailure,
  ...event
}: Options<T>): Promise<T> {
  const id = nextId();
  try {
    return await commit({ ...event, id, outcome: "success" });
  } catch (mutationError) {
    try {
      await recordFailure({
        ...event,
        id,
        outcome: "failure",
        errorCode: errorCode(mutationError),
      });
    } catch (auditError) {
      throw new AggregateError(
        [mutationError, auditError],
        "Content mutation and failure audit both failed",
      );
    }
    throw mutationError;
  }
}
