import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Append-only operational evidence for content mutations. Actor and target are
 * deliberately not foreign keys: deleting an account or article must not erase
 * or invalidate its audit history.
 */
export const contentAuditEvents = pgTable(
  "content_audit_events",
  {
    id: text("id").primaryKey(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    targetId: text("target_id").notNull(),
    requestId: text("request_id").notNull(),
    outcome: text("outcome").notNull(),
    errorCode: text("error_code"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("content_audit_request_idx").on(table.requestId),
    index("content_audit_actor_time_idx").on(table.actorEmail, table.occurredAt),
    index("content_audit_target_time_idx").on(table.targetId, table.occurredAt),
  ],
);
