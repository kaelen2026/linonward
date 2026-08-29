import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.js";

export const contentRoleAssignments = pgTable(
  "content_role_assignments",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    assignedByEmail: text("assigned_by_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
    index("content_role_membership_idx").on(table.role, table.userId),
  ],
);
