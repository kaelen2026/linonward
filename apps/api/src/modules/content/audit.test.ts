import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../../shared/api-error.js";
import { executeAuditedContentMutation } from "./audit.js";

const base = {
  action: "article.create" as const,
  actorEmail: "admin@linonward.com",
  targetId: "art_1",
  requestId: "req_1",
  occurredAt: new Date("2026-08-29T12:00:00.000Z"),
  nextId: () => "audit_1",
};
const { nextId: _nextId, ...eventBase } = base;

describe("content mutation audit", () => {
  it("commits the successful event atomically with the mutation", async () => {
    const recordFailure = vi.fn();
    const commit = vi.fn(async (event) => ({ articleId: event.targetId }));

    await expect(
      executeAuditedContentMutation({ ...base, commit, recordFailure }),
    ).resolves.toEqual({ articleId: "art_1" });
    expect(commit).toHaveBeenCalledWith({ ...eventBase, id: "audit_1", outcome: "success" });
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it("records a stable error code after the transaction fails", async () => {
    const failure = new ApiError(400, "invalid_article", "Article fields are invalid");
    const recordFailure = vi.fn(async () => undefined);

    await expect(
      executeAuditedContentMutation({
        ...base,
        commit: async () => Promise.reject(failure),
        recordFailure,
      }),
    ).rejects.toBe(failure);
    expect(recordFailure).toHaveBeenCalledWith({
      ...eventBase,
      id: "audit_1",
      outcome: "failure",
      errorCode: "invalid_article",
    });
  });

  it("does not hide the original failure when failure auditing is unavailable", async () => {
    const failure = new Error("database unavailable");
    const auditFailure = new Error("audit unavailable");

    await expect(
      executeAuditedContentMutation({
        ...base,
        commit: async () => Promise.reject(failure),
        recordFailure: async () => Promise.reject(auditFailure),
      }),
    ).rejects.toEqual(
      new AggregateError([failure, auditFailure], "Content mutation and failure audit both failed"),
    );
  });
});
